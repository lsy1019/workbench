import { useState } from 'react';
import { useSync } from '../hooks/useSync';
import type { WebDAVConfig } from '../services/webdav';
import './SyncPanel.css';

interface Props {
  onClose: () => void;
}

export default function SyncPanel({ onClose }: Props) {
  const { state, configure, disconnect, pushNow, pullNow } = useSync();
  const [url, setUrl] = useState(state.config?.url || '');
  const [username, setUsername] = useState(state.config?.username || '');
  const [password, setPassword] = useState('');

  const handleConnect = async () => {
    if (!url || !username || !password) return;
    const config: WebDAVConfig = { url, username, password };
    const ok = await configure(config);
    if (ok) {
      // 连接成功后清空密码字段
      setPassword('');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setUrl('');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet sync-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">☁️ 数据同步</h2>
        <p className="theme-modal-desc">
          通过 WebDAV（坚果云 / Nextcloud 等）同步所有设备数据
        </p>

        {/* 状态指示 */}
        {state.configured && (
          <div className={`sync-status ${state.status}`}>
            <div className="sync-status-row">
              <span className="sync-status-dot" />
              <span>
                {state.status === 'syncing' ? '同步中...' :
                 state.status === 'success' ? '已连接' :
                 state.status === 'error' ? '同步失败' : '就绪'}
              </span>
            </div>
            {state.lastSync && (
              <span className="sync-last-time">
                上次同步：{new Date(state.lastSync).toLocaleString('zh-CN')}
              </span>
            )}
            {state.message && <span className="sync-message">{state.message}</span>}
          </div>
        )}

        {/* 已连接：显示操作按钮 */}
        {state.configured ? (
          <div className="sync-actions">
            <div className="sync-info">
              <span className="sync-info-label">服务器</span>
              <span className="sync-info-value">{state.config?.url}</span>
            </div>
            <div className="sync-info">
              <span className="sync-info-label">账号</span>
              <span className="sync-info-value">{state.config?.username}</span>
            </div>
            <div className="sync-btn-group">
              <button className="btn sync-btn sync-push" onClick={pushNow} disabled={state.syncing}>
                📤 手动上传
              </button>
              <button className="btn sync-btn sync-pull" onClick={pullNow} disabled={state.syncing}>
                📥 手动下载
              </button>
            </div>
            <button className="btn sync-btn sync-disconnect" onClick={handleDisconnect}>
              🔌 断开连接
            </button>
          </div>
        ) : (
          /* 未连接：显示配置表单 */
          <div className="sync-form">
            <div className="form-group">
              <label className="form-label">WebDAV 地址</label>
              <input
                className="input"
                placeholder="https://dav.jianguoyun.com/dav/"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
              <span className="form-hint">坚果云默认地址如上，Nextcloud 通常为 https://你的域名/remote.php/dav/files/用户名/</span>
            </div>
            <div className="form-group">
              <label className="form-label">用户名 / 邮箱</label>
              <input
                className="input"
                placeholder="your@email.com"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                密码
                <span className="form-hint" style={{ marginLeft: 8 }}>（坚果云请用「应用密码」而非登录密码）</span>
              </label>
              <input
                className="input"
                type="password"
                placeholder="应用密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {state.status === 'error' && (
              <div className="sync-error">{state.message}</div>
            )}

            <button
              className="btn btn-lg sync-connect-btn"
              onClick={handleConnect}
              disabled={state.syncing || !url || !username || !password}
            >
              {state.syncing ? '⏳ 连接中...' : '🔗 连接并同步'}
            </button>

            <div className="sync-tips">
              <p>💡 <strong>坚果云设置步骤：</strong></p>
              <ol>
                <li>登录坚果云 → 右上角账户 → 「安全选项」</li>
                <li>「第三方应用管理」→ 添加应用密码</li>
                <li>服务器地址填：<code>https://dav.jianguoyun.com/dav/</code></li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
