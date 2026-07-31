import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useSync } from '../hooks/useSync';
import ThemeModal from './ThemeModal';
import SyncPanel from './SyncPanel';
import './Sidebar.css';

interface NavItem {
  key: string;
  path: string;
  label: string;
  emoji: string;
  desc: string;
  bgColor: string;
  lightColor: string;
}

const navItems: NavItem[] = [
  {
    key: 'exam', path: '/exam', label: '考公', emoji: '📋',
    desc: '岗位追踪 & 错题管理',
    bgColor: 'var(--theme-exam-primary)', lightColor: 'var(--theme-exam-light)',
  },
  {
    key: 'resume', path: '/resume', label: '求职履历管理', emoji: '💼',
    desc: '证书 · 实习 · 项目 · 素材库',
    bgColor: 'var(--theme-resume-primary)', lightColor: 'var(--theme-resume-light)',
  },
  {
    key: 'jobs', path: '/jobs', label: '岗位信息库', emoji: '🎯',
    desc: '投递追踪 & 招聘窗口期',
    bgColor: 'var(--theme-job-primary)', lightColor: 'var(--theme-job-light)',
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { state: syncState } = useSync();
  const [showTheme, setShowTheme] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === '1'; }
    catch { return false; }
  });

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('sidebar_collapsed', next ? '1' : '0'); } catch {}
  };

  const getActiveKey = () => {
    const path = location.pathname;
    if (path.startsWith('/exam')) return 'exam';
    if (path.startsWith('/resume')) return 'resume';
    if (path.startsWith('/jobs')) return 'jobs';
    return '';
  };

  const activeKey = getActiveKey();
  const isHome = location.pathname === '/' || location.pathname === '/home' || activeKey === '';

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo区域 */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">🌸</div>
        {!collapsed && (
          <div className="sidebar-brand-text">
            <h1 className="sidebar-brand-name">L_ML的工作台</h1>
            <p className="sidebar-brand-desc">个人专属管理中心</p>
          </div>
        )}
        <button className="sidebar-collapse-btn" onClick={toggleCollapsed} title={collapsed ? '展开侧边栏' : '收起侧边栏'}>
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* 导航菜单 */}
      <nav className="sidebar-nav">
        {!collapsed && <p className="sidebar-nav-label">功能版块</p>}
        {navItems.map((item) => {
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
            >
              <span
                className="sidebar-item-icon"
                style={{ background: isActive ? item.bgColor : item.lightColor }}
              >
                {item.emoji}
              </span>
              {!collapsed && (
                <div className="sidebar-item-text">
                  <span className="sidebar-item-label">{item.label}</span>
                  <span className="sidebar-item-desc">{item.desc}</span>
                </div>
              )}
              {isActive && !collapsed && (
                <span className="sidebar-active-bar" style={{ background: item.bgColor }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* 底部功能入口 */}
      <div className="sidebar-footer">
        <div className="sidebar-bottom-menu">
          <button
            className={`sidebar-bottom-item ${isHome ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <span className="sidebar-bottom-icon">🏠</span>
            {!collapsed && <span className="sidebar-bottom-label">L_ML 工作台</span>}
          </button>
          <button
            className="sidebar-bottom-item"
            onClick={() => setShowTheme(true)}
          >
            <span className="sidebar-bottom-icon">🎨</span>
            {!collapsed && <span className="sidebar-bottom-label">主题设置</span>}
          </button>
          <button
            className={`sidebar-bottom-item ${syncState.configured ? 'active' : ''}`}
            onClick={() => setShowSync(true)}
          >
            <span className="sidebar-bottom-icon">{syncState.configured ? '☁️' : '📡'}</span>
            {!collapsed && <span className="sidebar-bottom-label">{syncState.configured ? '数据同步 ✓' : '设置同步'}</span>}
          </button>
        </div>

        {!collapsed && (
          <>
            <div className="sidebar-footer-card">
              <p className="sidebar-footer-tip">💡 所有数据均保存在本地浏览器中，安全私密</p>
            </div>
            <p className="sidebar-footer-version">v2.2 · {theme.name}</p>
          </>
        )}
      </div>

      {showTheme && <ThemeModal onClose={() => setShowTheme(false)} />}
      {showSync && <SyncPanel onClose={() => setShowSync(false)} />}
    </aside>
  );
}
