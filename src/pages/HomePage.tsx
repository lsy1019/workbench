import { useNavigate } from 'react-router-dom';
import './HomePage.css';

interface QuickCard {
  key: string;
  path: string;
  emoji: string;
  title: string;
  desc: string;
  stats: { label: string; value: string }[];
  gradient: string;
}

export default function HomePage() {
  const navigate = useNavigate();

  const cards: QuickCard[] = (() => {
    const getCount = (key: string) => {
      try { const d = localStorage.getItem(key); return d ? JSON.parse(d).length : 0; }
      catch { return 0; }
    };
    const examJobs = getCount('exam_jobs');
    const examMistakes = getCount('exam_mistakes');
    const certificates = getCount('resume_certificates');
    const experiences = getCount('resume_experiences');
    const projects = getCount('resume_projects');
    const snippets = getCount('resume_snippets');

    const watching = (() => { try { const d=JSON.parse(localStorage.getItem('jobs_list')||'[]'); return d.filter((j:any)=>j.status==='观望'||j.status==='准备简历').length; } catch {return 0;} })();
    const applied = (() => { try { const d=JSON.parse(localStorage.getItem('jobs_list')||'[]'); return d.filter((j:any)=>j.status==='已投递').length; } catch {return 0;} })();
    const interviewing = (() => { try { const d=JSON.parse(localStorage.getItem('jobs_list')||'[]'); return d.filter((j:any)=>['一面','二面','三面','等待结果'].includes(j.status)).length; } catch {return 0;} })();

    return [
      { key:'exam', path:'/exam', emoji:'📋', title:'考公', desc:'岗位追踪 & 错题管理',
        stats: [{label:'收藏岗位',value:`${examJobs}个`},{label:'错题数',value:`${examMistakes}题`}],
        gradient: 'linear-gradient(135deg, var(--theme-exam-primary), #B895C0)' },
      { key:'resume', path:'/resume', emoji:'💼', title:'求职履历管理', desc:'证书 · 实习 · 项目 · 素材库',
        stats: [{label:'证书',value:`${certificates}份`},{label:'实习',value:`${experiences}段`},{label:'项目',value:`${projects}个`},{label:'素材',value:`${snippets}条`}],
        gradient: 'linear-gradient(135deg, var(--theme-resume-primary), #E8A0B0)' },
      { key:'jobs', path:'/jobs', emoji:'🎯', title:'岗位信息库', desc:'投递追踪 & 招聘窗口期',
        stats: [{label:'待投递',value:`${watching}个`},{label:'已投递',value:`${applied}个`},{label:'面试中',value:`${interviewing}个`}],
        gradient: 'linear-gradient(135deg, var(--theme-job-primary), #E0A878)' },
    ];
  })();

  return (
    <div className="page home-page">
      <div className="page-header" style={{ background: 'var(--bg-primary)' }}>
        <h1 className="page-title">🌸 我的专属工作台</h1>
        <p className="page-subtitle">一站式管理考公 · 求职</p>
      </div>

      <div className="page-body">
        {/* 欢迎卡片 */}
        <div className="welcome-card" style={{ background: 'linear-gradient(135deg, var(--macaron-pink), var(--macaron-lavender), var(--macaron-blush))' }}>
          <div className="welcome-emoji">✨</div>
          <div className="welcome-text">
            <h2>欢迎回来！</h2>
            <p>今天也是元气满满的一天，来看看你的工作进度吧～</p>
          </div>
        </div>

        {/* 快捷入口卡片 */}
        <div className="home-cards">
          {cards.map(card => (
            <div key={card.key} className="home-card card-tap" onClick={() => navigate(card.path)}>
              <div className="home-card-header" style={{ background: card.gradient }}>
                <span className="home-card-emoji">{card.emoji}</span>
                <div>
                  <h3 className="home-card-title">{card.title}</h3>
                  <p className="home-card-desc">{card.desc}</p>
                </div>
              </div>
              <div className="home-card-stats">
                {card.stats.map((s, i) => (
                  <div key={i} className="home-stat">
                    <span className="home-stat-value">{s.value}</span>
                    <span className="home-stat-label">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 快捷提示 */}
        <div className="home-tips card">
          <h3 className="home-tips-title">💡 小贴士</h3>
          <ul className="home-tips-list">
            <li>所有数据保存在本地浏览器，安全私密，不会上传云端</li>
            <li>点击左侧菜单可在各版块间快速切换</li>
            <li>底部「主题设置」可切换全局配色方案</li>
            <li>右上角「导出备份」按钮可随时备份数据</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
