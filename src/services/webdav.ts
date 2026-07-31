/**
 * WebDAV 同步服务
 * 支持标准 WebDAV 协议（坚果云、Nextcloud、ownCloud 等）
 */

export interface WebDAVConfig {
  url: string;       // WebDAV 服务器地址，如 https://dav.jianguoyun.com/dav/
  username: string;  // 用户名
  password: string;  // 密码（坚果云需用应用密码）
}

interface SyncManifest {
  version: number;
  lastSync: string;  // ISO 时间戳
  device: string;    // 设备名
  keys: Record<string, number>;  // key -> 最后修改时间戳
}

// 需要同步的数据 keys
const SYNC_KEYS = [
  'jobs_list_v2',
  'jobs_table_col_widths',
  'exam_jobs',
  'exam_table_col_widths',
  'resume_certificates_v3',
  'resume_experiences_v3',
  'resume_projects_v2',
  'resume_snippets_v3',
  'workbench_theme',
  'fund_holdings',
  'fund_table_col_widths',
  'fund_online_mode',
];

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android手机';
  if (/iPhone|iPad/i.test(ua)) return 'iPhone';
  if (/Mac/i.test(ua)) return 'Mac电脑';
  if (/Windows/i.test(ua)) return 'Windows电脑';
  if (/Linux/i.test(ua)) return 'Linux电脑';
  return '未知设备';
}

function buildAuthHeader(config: WebDAVConfig): string {
  return 'Basic ' + btoa(`${config.username}:${config.password}`);
}

async function davRequest(
  config: WebDAVConfig,
  path: string,
  method: string = 'GET',
  body?: string | null,
): Promise<{ ok: boolean; status: number; data?: string }> {
  const url = config.url.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
  const headers: Record<string, string> = {
    'Authorization': buildAuthHeader(config),
  };
  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
  }

  try {
    const resp = await fetch(url, { method, headers, body: body ?? undefined });
    const text = await resp.text().catch(() => '');
    return { ok: resp.ok, status: resp.status, data: text };
  } catch (e: any) {
    return { ok: false, status: 0, data: e.message };
  }
}

/** 确保目录存在 */
async function ensureDir(config: WebDAVConfig, dir: string): Promise<boolean> {
  // 尝试创建目录（MKCOL），如果已存在（405）也没关系
  const r = await davRequest(config, dir, 'MKCOL');
  return r.ok || r.status === 405 || r.status === 301;
}

/** 上传数据到 WebDAV */
export async function uploadToWebDAV(
  config: WebDAVConfig,
  key: string,
  data: string,
): Promise<boolean> {
  await ensureDir(config, 'workbench-sync');
  const r = await davRequest(config, `workbench-sync/${key}.json`, 'PUT', data);
  return r.ok;
}

/** 从 WebDAV 下载数据 */
export async function downloadFromWebDAV(
  config: WebDAVConfig,
  key: string,
): Promise<string | null> {
  const r = await davRequest(config, `workbench-sync/${key}.json`, 'GET');
  if (r.ok && r.data) return r.data;
  if (r.status === 404) return null; // 文件不存在
  return null;
}

/** 上传 manifest */
async function uploadManifest(config: WebDAVConfig, manifest: SyncManifest): Promise<boolean> {
  await ensureDir(config, 'workbench-sync');
  const r = await davRequest(config, 'workbench-sync/manifest.json', 'PUT', JSON.stringify(manifest));
  return r.ok;
}

/** 下载 manifest */
async function downloadManifest(config: WebDAVConfig): Promise<SyncManifest | null> {
  const r = await davRequest(config, 'workbench-sync/manifest.json', 'GET');
  if (r.ok && r.data) {
    try { return JSON.parse(r.data); } catch { return null; }
  }
  return null;
}

/** 从 localStorage 读取所有待同步数据 */
export function exportAllData(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of SYNC_KEYS) {
    const val = localStorage.getItem(key);
    if (val !== null) {
      result[key] = val;
    }
  }
  return result;
}

/** 将数据写入 localStorage */
export function importAllData(data: Record<string, string>): void {
  for (const [key, val] of Object.entries(data)) {
    if (SYNC_KEYS.includes(key) || key.startsWith('resume_') || key.startsWith('exam_') || key.startsWith('jobs_') || key === 'workbench_theme') {
      try {
        localStorage.setItem(key, val);
      } catch {}
    }
  }
}

/** 推送本地所有数据到云端 */
export async function pushAll(config: WebDAVConfig): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const allData = exportAllData();
    let count = 0;
    for (const [key, val] of Object.entries(allData)) {
      const ok = await uploadToWebDAV(config, key, val);
      if (ok) count++;
    }
    // 上传 manifest
    const manifest: SyncManifest = {
      version: 1,
      lastSync: new Date().toISOString(),
      device: getDeviceName(),
      keys: {},
    };
    await uploadManifest(config, manifest);
    return { success: true, count };
  } catch (e: any) {
    return { success: false, count: 0, error: e.message };
  }
}

/** 从云端拉取所有数据到本地 */
export async function pullAll(config: WebDAVConfig): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let count = 0;
    for (const key of SYNC_KEYS) {
      const data = await downloadFromWebDAV(config, key);
      if (data !== null) {
        try {
          // 验证是合法 JSON
          JSON.parse(data);
          localStorage.setItem(key, data);
          count++;
        } catch {}
      }
    }
    return { success: true, count };
  } catch (e: any) {
    return { success: false, count: 0, error: e.message };
  }
}

/** 测试 WebDAV 连接 */
export async function testConnection(config: WebDAVConfig): Promise<{ ok: boolean; message: string }> {
  try {
    // 尝试列出目录
    const r = await davRequest(config, 'workbench-sync', 'PROPFIND');
    if (r.ok || r.status === 404) {
      // 404 说明目录还不存在，但连接是通的
      await ensureDir(config, 'workbench-sync');
      return { ok: true, message: '连接成功！' };
    }
    if (r.status === 401 || r.status === 403) {
      return { ok: false, message: '认证失败，请检查用户名和密码（坚果云需使用应用密码）' };
    }
    return { ok: false, message: `连接失败 (HTTP ${r.status})` };
  } catch (e: any) {
    return { ok: false, message: `网络错误: ${e.message}` };
  }
}
