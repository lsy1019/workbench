import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import CalendarView, { type CalendarEvent } from '../components/CalendarView';
import './ResumePage.css';

interface Certificate { id: string; name: string; issuer: string; date: string; category: string; }
interface Experience { id: string; company: string; role: string; startDate: string; endDate: string; }
interface Project { id: string; name: string; role: string; date: string; }
interface ResumeSnippet { id: string; title: string; category: string; date: string; }

interface DetailItem { type: string; data: any; }

const entryCards = [
  { key: 'certificates', emoji: '📜', title: '证书证件', desc: '学历学位 · 职业资格 · 技能证书', gradient: 'linear-gradient(135deg, #FADADD, #F0C0C8)', path: '/resume/certificates' },
  { key: 'experiences', emoji: '🏢', title: '实习经历', desc: '记录每一段宝贵的实习经验', gradient: 'linear-gradient(135deg, #FCE4EC, #F8D0D8)', path: '/resume/experiences' },
  { key: 'projects', emoji: '🚀', title: '项目经验', desc: '汇总做过的项目，面试从容应对', gradient: 'linear-gradient(135deg, #F3E5F5, #E8D5EC)', path: '/resume/projects' },
  { key: 'snippets', emoji: '📝', title: '简历素材库', desc: '中英文简历片段，一键复制使用', gradient: 'linear-gradient(135deg, #FFF0F3, #FDE4EC)', path: '/resume/snippets' },
];

export default function ResumePage() {
  const navigate = useNavigate();
  const [certificates] = useLocalStorage<Certificate[]>('resume_certificates_v3', []);
  const [experiences] = useLocalStorage<Experience[]>('resume_experiences_v3', []);
  const [projects] = useLocalStorage<Project[]>('resume_projects_v2', []);
  const [snippets] = useLocalStorage<ResumeSnippet[]>('resume_snippets_v3', []);
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);

  const counts = { certificates: certificates.length, experiences: experiences.length, projects: projects.length, snippets: snippets.length };

  // 构建日历事件
  const allEvents: CalendarEvent[] = useMemo(() => {
    const events: CalendarEvent[] = [];
    certificates.filter(c => c.date).forEach(c => events.push({ id: c.id, title: c.name, subtitle: c.issuer || c.category, date: c.date, color: 'var(--theme-resume-accent)', type: 'certificate', data: { ...c, _type: 'certificate' } }));
    experiences.filter(e => e.startDate).forEach(e => events.push({ id: e.id, title: e.company, subtitle: e.role, date: e.startDate, color: 'var(--theme-resume-accent)', type: 'experience', data: { ...e, _type: 'experience' } }));
    projects.filter(p => p.date).forEach(p => events.push({ id: p.id, title: p.name, subtitle: p.role || '', date: p.date, color: 'var(--theme-resume-accent)', type: 'project', data: { ...p, _type: 'project' } }));
    return events;
  }, [certificates, experiences, projects]);

  const handleCalendarClick = (ev: CalendarEvent) => { setDetailItem({ type: ev.type, data: ev.data }); };

  return (
    <div className="page resume-overview-page">
      <div className="page-header" style={{ background: 'var(--theme-resume-bg)' }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">💼 求职履历管理</h1>
            <p className="page-subtitle">证书 · 实习 · 项目 · 素材库</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* 日历总览 —— 始终显示，像手机日历一样 */}
        <div className="resume-calendar-section">
          <CalendarView events={allEvents} onEventClick={handleCalendarClick} storageKey="resume_calendar_notes" />
        </div>

        {/* 4张入口卡片 */}
        <h2 className="section-title" style={{ marginTop: 8, marginBottom: 12 }}>📂 功能入口</h2>
        <div className="resume-entry-cards">
          {entryCards.map(card => (
            <div key={card.key} className="resume-entry-card card-tap" onClick={() => navigate(card.path)}>
              <div className="entry-card-header" style={{ background: card.gradient }}>
                <span className="entry-card-emoji">{card.emoji}</span>
                <div>
                  <h3 className="entry-card-title">{card.title}</h3>
                  <p className="entry-card-desc">{card.desc}</p>
                </div>
              </div>
              <div className="entry-card-footer">
                <span className="entry-card-count">{counts[card.key as keyof typeof counts]} 条记录</span>
                <span className="entry-card-arrow">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 日历事件详情弹窗 */}
      {detailItem && (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal-sheet detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 className="modal-title">
              {detailItem.type === 'certificate' && '📜 证书详情'}
              {detailItem.type === 'experience' && '🏢 实习详情'}
              {detailItem.type === 'project' && '🚀 项目详情'}
            </h2>
            <div className="detail-content">
              {detailItem.type === 'certificate' && (() => { const d = detailItem.data; return (<>
                <div className="detail-row"><span className="detail-label">名称</span><span className="detail-val">{d.name}</span></div>
                {d.issuer && <div className="detail-row"><span className="detail-label">颁发机构</span><span className="detail-val">{d.issuer}</span></div>}
                <div className="detail-row"><span className="detail-label">日期</span><span className="detail-val">{d.date || '--'}</span></div>
                <div className="detail-row"><span className="detail-label">类别</span><span className="detail-val">{d.category}</span></div>
              </>); })()}
              {detailItem.type === 'experience' && (() => { const d = detailItem.data; return (<>
                <div className="detail-row"><span className="detail-label">公司</span><span className="detail-val">{d.company}</span></div>
                <div className="detail-row"><span className="detail-label">职位</span><span className="detail-val">{d.role}</span></div>
                <div className="detail-row"><span className="detail-label">时间</span><span className="detail-val">{d.startDate || '--'} ~ {d.endDate || '至今'}</span></div>
                {d.description && <div className="detail-block"><span className="detail-label">描述</span><p className="detail-val">{d.description}</p></div>}
              </>); })()}
              {detailItem.type === 'project' && (() => { const d = detailItem.data; return (<>
                <div className="detail-row"><span className="detail-label">项目</span><span className="detail-val">{d.name}</span></div>
                {d.role && <div className="detail-row"><span className="detail-label">角色</span><span className="detail-val">{d.role}</span></div>}
                <div className="detail-row"><span className="detail-label">日期</span><span className="detail-val">{d.date || '--'}</span></div>
                {d.description && <div className="detail-block"><span className="detail-label">描述</span><p className="detail-val">{d.description}</p></div>}
              </>); })()}
            </div>
            <div className="detail-actions">
              <button className="btn" style={{ background: 'var(--theme-resume-accent)', color: '#fff' }}
                onClick={() => { setDetailItem(null); navigate(`/resume/${detailItem.type}s`); }}>
                ✏️ 查看详情
              </button>
              <button className="btn btn-ghost" onClick={() => setDetailItem(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
