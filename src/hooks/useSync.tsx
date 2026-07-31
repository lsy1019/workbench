import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { WebDAVConfig } from '../services/webdav';
import { pushAll, pullAll, testConnection } from '../services/webdav';

interface SyncState {
  configured: boolean;
  config: WebDAVConfig | null;
  lastSync: string | null;
  syncing: boolean;
  status: 'idle' | 'syncing' | 'error' | 'success';
  message: string;
}

interface SyncContextType {
  state: SyncState;
  configure: (config: WebDAVConfig) => Promise<boolean>;
  disconnect: () => void;
  pushNow: () => Promise<void>;
  pullNow: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  state: { configured: false, config: null, lastSync: null, syncing: false, status: 'idle', message: '' },
  configure: async () => false,
  disconnect: () => {},
  pushNow: async () => {},
  pullNow: async () => {},
  syncNow: async () => {},
});

function loadConfig(): WebDAVConfig | null {
  try {
    const raw = localStorage.getItem('sync_webdav_config');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveConfig(config: WebDAVConfig | null) {
  if (config) {
    localStorage.setItem('sync_webdav_config', JSON.stringify(config));
  } else {
    localStorage.removeItem('sync_webdav_config');
  }
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SyncState>(() => {
    const config = loadConfig();
    return {
      configured: !!config,
      config,
      lastSync: localStorage.getItem('sync_last_time'),
      syncing: false,
      status: 'idle',
      message: '',
    };
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef(state.config);

  useEffect(() => {
    configRef.current = state.config;
  }, [state.config]);

  // 自动推送（数据变更后延迟 3 秒）
  const schedulePush = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const cfg = configRef.current;
      if (!cfg) return;
      try {
        await pushAll(cfg);
        const now = new Date().toISOString();
        localStorage.setItem('sync_last_time', now);
        setState(prev => ({ ...prev, lastSync: now, status: 'success', message: '已自动同步' }));
      } catch {}
    }, 3000);
  }, []);

  // 监听 localStorage 变更
  useEffect(() => {
    if (!state.configured) return;

    const handler = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('sync_')) return; // 忽略同步配置自身的变更
      schedulePush();
    };

    // 拦截 setItem 来实现自动推送
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key: string, value: string) {
      originalSetItem.call(this, key, value);
      if (!key.startsWith('sync_') && !key.startsWith('sidebar_')) {
        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('datachange', { detail: { key } }));
      }
    };

    const changeHandler = () => schedulePush();
    window.addEventListener('datachange' as any, changeHandler);

    return () => {
      Storage.prototype.setItem = originalSetItem;
      window.removeEventListener('datachange' as any, changeHandler);
    };
  }, [state.configured, schedulePush]);

  const configure = useCallback(async (config: WebDAVConfig): Promise<boolean> => {
    setState(prev => ({ ...prev, syncing: true, status: 'syncing', message: '测试连接...' }));
    const test = await testConnection(config);
    if (!test.ok) {
      setState(prev => ({ ...prev, syncing: false, status: 'error', message: test.message }));
      return false;
    }
    saveConfig(config);
    configRef.current = config;
    setState(prev => ({
      ...prev,
      configured: true,
      config,
      syncing: false,
      status: 'success',
      message: '连接成功，正在同步...',
    }));
    // 首次连接：先拉取云端数据
    await pullAll(config);
    const now = new Date().toISOString();
    localStorage.setItem('sync_last_time', now);
    setState(prev => ({ ...prev, lastSync: now, message: '同步完成 ✓' }));
    return true;
  }, []);

  const disconnect = useCallback(() => {
    saveConfig(null);
    configRef.current = null;
    setState({
      configured: false,
      config: null,
      lastSync: null,
      syncing: false,
      status: 'idle',
      message: '已断开同步',
    });
  }, []);

  const pushNow = useCallback(async () => {
    const cfg = configRef.current;
    if (!cfg) return;
    setState(prev => ({ ...prev, syncing: true, status: 'syncing', message: '上传中...' }));
    const result = await pushAll(cfg);
    const now = new Date().toISOString();
    localStorage.setItem('sync_last_time', now);
    if (result.success) {
      setState(prev => ({ ...prev, syncing: false, lastSync: now, status: 'success', message: `已上传 ${result.count} 项数据` }));
    } else {
      setState(prev => ({ ...prev, syncing: false, status: 'error', message: result.error || '上传失败' }));
    }
  }, []);

  const pullNow = useCallback(async () => {
    const cfg = configRef.current;
    if (!cfg) return;
    setState(prev => ({ ...prev, syncing: true, status: 'syncing', message: '下载中...' }));
    const result = await pullAll(cfg);
    const now = new Date().toISOString();
    localStorage.setItem('sync_last_time', now);
    if (result.success) {
      setState(prev => ({ ...prev, syncing: false, lastSync: now, status: 'success', message: `已下载 ${result.count} 项数据，请刷新页面` }));
      // 强制刷新页面以加载新数据
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setState(prev => ({ ...prev, syncing: false, status: 'error', message: result.error || '下载失败' }));
    }
  }, []);

  const syncNow = useCallback(async () => {
    await pushNow();
  }, [pushNow]);

  return (
    <SyncContext.Provider value={{ state, configure, disconnect, pushNow, pullNow, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
