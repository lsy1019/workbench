import { useLocation, useNavigate } from 'react-router-dom';
import './TabBar.css';

const tabs = [
  { key: 'home', path: '/', label: '首页', emoji: '🏠' },
  { key: 'exam', path: '/exam', label: '考公', emoji: '📋' },
  { key: 'resume', path: '/resume', label: '履历', emoji: '💼' },
  { key: 'jobs', path: '/jobs', label: '岗位库', emoji: '🎯' },
];

export default function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveKey = () => {
    const path = location.pathname;
    if (path === '/' || path === '/home') return 'home';
    if (path.startsWith('/exam')) return 'exam';
    if (path.startsWith('/resume')) return 'resume';
    if (path.startsWith('/jobs')) return 'jobs';
    return 'home';
  };

  const activeKey = getActiveKey();

  const getIndicatorColor = (key: string) => {
    switch (key) {
      case 'home': return 'var(--macaron-rose)';
      case 'exam': return 'var(--theme-exam-primary)';
      case 'resume': return 'var(--theme-resume-primary)';
      case 'jobs': return 'var(--theme-job-primary)';
      default: return 'var(--macaron-rose)';
    }
  };

  return (
    <nav className="tabbar">
      <div className="tabbar-inner">
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key;
          return (
            <button
              key={tab.key}
              className={`tabbar-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(tab.path)}
            >
              <span className="tabbar-emoji">{tab.emoji}</span>
              <span className="tabbar-label">{tab.label}</span>
              {isActive && (
                <span
                  className="tabbar-indicator"
                  style={{ background: getIndicatorColor(tab.key) }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
