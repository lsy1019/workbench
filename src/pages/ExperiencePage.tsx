import { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Breadcrumb from '../components/Breadcrumb';
import ImportExport from '../components/ImportExport';
import FileUpload, { type UploadedFile } from '../components/FileUpload';
import './ExperiencePage.css';

interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  descriptionEn: string;
  achievements: string[];
  achievementsEn: string[];
  skills: string[];
  tags: string[];
  interviewNotes: string;
  attachments: UploadedFile[];
}

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function isImage(file: UploadedFile) { return file.type.startsWith('image/'); }
function isPDF(file: UploadedFile) { return file.name.toLowerCase().endsWith('.pdf'); }
function getCoverFile(attachments: UploadedFile[]): UploadedFile | null {
  if (attachments.length === 0) return null;
  const img = attachments.find(f => isImage(f));
  return img || attachments[0];
}
function toBlobUrl(base64: string, mime: string) {
  const byteChars = atob(base64.split(',')[1]);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
  return URL.createObjectURL(new Blob([new Uint8Array(byteNums)], { type: mime }));
}
function openFile(file: UploadedFile) {
  const mime = file.type || 'application/octet-stream';
  const url = toBlobUrl(file.base64, mime);
  if (isImage(file) || isPDF(file)) {
    window.open(url, '_blank');
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
  }
}

export default function ExperiencePage() {
  const [experiences, setExperiences] = useLocalStorage<Experience[]>('resume_experiences_v3', []);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<Experience | null>(null);
  const [form, setForm] = useState({
    company: '', role: '', startDate: '', endDate: '',
    description: '', descriptionEn: '', achievements: '', achievementsEn: '',
    skills: '', tags: '', interviewNotes: '',
  });
  const [formAttachments, setFormAttachments] = useState<UploadedFile[]>([]);

  const handleExport = (format: 'json' | 'txt' | 'pdf') => {
    const dateStr = new Date().toISOString().slice(0, 10);
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(experiences, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `实习经历_${dateStr}.json`; a.click(); URL.revokeObjectURL(url);
    } else if (format === 'txt') {
      const text = experiences.map(e =>
        `${e.company} | ${e.role} | ${e.startDate || '--'} - ${e.endDate || '至今'}\n描述: ${e.description || '--'}\n技能: ${e.skills.join(', ') || '--'}\n附件: ${e.attachments.map(a => a.name).join(', ') || '无'}\n---`
      ).join('\n\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `实习经历_${dateStr}.txt`; a.click(); URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const html = `<html><head><meta charset="utf-8"><title>实习经历</title><style>body{font-family:sans-serif;padding:20px;color:#333}h1{color:#E8A0B0}.exp{margin-bottom:16px;padding:12px;border-left:3px solid #E8A0B0;background:#FFF5F6}h3{margin:0 0 4px}span{color:#888;font-size:13px}</style></head><body><h1>🏢 实习经历</h1>${experiences.map(e => `<div class="exp"><h3>${e.company} - ${e.role}</h3><span>${e.startDate||'--'} - ${e.endDate||'至今'}</span><p>${e.description||''}</p></div>`).join('')}</body></html>`;
      const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
    }
  };

  const handleImport = (data: any) => {
    if (Array.isArray(data)) {
      const imported: Experience[] = data.map((item: any) => ({
        id: generateId(), company: item.company || '', role: item.role || '',
        startDate: item.startDate || '', endDate: item.endDate || '',
        description: item.description || '', descriptionEn: item.descriptionEn || '',
        achievements: item.achievements || [], achievementsEn: item.achievementsEn || [],
        skills: item.skills || [], tags: item.tags || [],
        interviewNotes: item.interviewNotes || '', attachments: item.attachments || [],
      }));
      setExperiences(prev => [...imported, ...prev]);
    } else if (data.text) { alert('文本格式无法自动解析，请使用JSON格式'); }
  };

  const openModal = (exp?: Experience) => {
    if (exp) {
      setEditingId(exp.id);
      setForm({
        company: exp.company, role: exp.role, startDate: exp.startDate, endDate: exp.endDate,
        description: exp.description, descriptionEn: exp.descriptionEn,
        achievements: exp.achievements.join('\n'), achievementsEn: exp.achievementsEn.join('\n'),
        skills: exp.skills.join(', '), tags: exp.tags.join(', '), interviewNotes: exp.interviewNotes,
      });
      setFormAttachments(exp.attachments || []);
    } else {
      setEditingId(null);
      setForm({ company: '', role: '', startDate: '', endDate: '', description: '', descriptionEn: '', achievements: '', achievementsEn: '', skills: '', tags: '', interviewNotes: '' });
      setFormAttachments([]);
    }
    setShowModal(true);
  };

  const saveExp = () => {
    if (!form.company || !form.role) return;
    const data: Experience = {
      id: editingId || generateId(),
      company: form.company, role: form.role, startDate: form.startDate, endDate: form.endDate,
      description: form.description, descriptionEn: form.descriptionEn,
      achievements: form.achievements.split('\n').filter(Boolean),
      achievementsEn: form.achievementsEn.split('\n').filter(Boolean),
      skills: form.skills.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      tags: form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
      interviewNotes: form.interviewNotes, attachments: formAttachments,
    };
    if (editingId) setExperiences(prev => prev.map(e => e.id === editingId ? data : e));
    else setExperiences(prev => [data, ...prev]);
    setShowModal(false);
  };

  const deleteExp = (id: string) => { if (window.confirm('确认删除？')) setExperiences(prev => prev.filter(e => e.id !== id)); };
  const formatDate = (d: string) => d || '至今';

  return (
    <div className="page exp-page">
      <div className="page-body">
        <Breadcrumb items={[{ label: '💼 求职履历管理', path: '/resume' }, { label: '🏢 实习经历' }]} />
      </div>
      <div className="page-header" style={{ background: 'var(--theme-resume-bg)' }}>
        <div className="page-header-row">
          <div><h1 className="page-title">🏢 实习经历</h1><p className="page-subtitle">记录每一段宝贵的实习经验</p></div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <ImportExport filename="实习经历" onExport={handleExport} onImport={handleImport} />
            <button className="btn btn-sm" style={{ background: 'var(--theme-resume-accent)', color: '#fff' }} onClick={() => openModal()}>+ 添加经历</button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {experiences.length === 0 ? (
          <div className="empty-state"><div className="icon">🏢</div><p>还没有添加实习经历</p><p>点击右上角"添加经历"开始记录</p></div>
        ) : (
          <div className="exp-timeline">
            {experiences.map((exp, idx) => {
              const cover = getCoverFile(exp.attachments);
              return (
                <div key={exp.id} className="exp-resume-item">
                  {/* 时间线 */}
                  <div className="exp-timeline-bar">
                    <div className="exp-timeline-dot" />
                    {idx < experiences.length - 1 && <div className="exp-timeline-line" />}
                  </div>

                  {/* 内容区 */}
                  <div className="exp-resume-body">
                    {/* 附件缩略图：点击打开文件或详情 */}
                    {cover ? (
                      <div className="exp-resume-thumb" onClick={() => openFile(cover)} title="点击打开附件">
                        {isImage(cover) ? (
                          <img src={cover.base64} alt="" />
                        ) : (
                          <span className="exp-resume-thumb-icon">{isPDF(cover) ? '📕' : '📎'}</span>
                        )}
                      </div>
                    ) : (
                      <div className="exp-resume-thumb exp-resume-thumb-empty" onClick={() => setDetailItem(exp)} title="查看详情">
                        <span className="exp-resume-thumb-icon">🏢</span>
                      </div>
                    )}

                    <div className="exp-resume-content">
                      <div className="exp-resume-header">
                        <h3 className="exp-resume-company">{exp.company}</h3>
                        <span className="exp-resume-period">{formatDate(exp.startDate)} — {formatDate(exp.endDate)}</span>
                      </div>
                      <p className="exp-resume-role">{exp.role}</p>

                      {/* 中文描述（完整展示） */}
                      {exp.description && <p className="exp-resume-desc">{exp.description}</p>}

                      {/* 英文描述 */}
                      {exp.descriptionEn && <p className="exp-resume-desc-en">{exp.descriptionEn}</p>}

                      {/* 成就列表 */}
                      {exp.achievements.length > 0 && (
                        <ul className="exp-resume-achievements">
                          {exp.achievements.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      )}
                      {exp.achievementsEn.length > 0 && (
                        <ul className="exp-resume-achievements exp-resume-achievements-en">
                          {exp.achievementsEn.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      )}

                      {/* 面试笔记（折叠显示） */}
                      {exp.interviewNotes && (
                        <details className="exp-resume-interview">
                          <summary>💬 面试笔记</summary>
                          <p>{exp.interviewNotes}</p>
                        </details>
                      )}

                      <div className="exp-resume-skills">
                        {exp.skills.map((s, i) => <span key={i} className="exp-resume-tag">{s}</span>)}
                        {exp.tags.map((t, i) => <span key={'t'+i} className="exp-resume-tag exp-resume-tag-dim">{t}</span>)}
                      </div>

                      {/* 所有附件列表 */}
                      {exp.attachments.length > 0 && (
                        <div className="exp-resume-files">
                          {exp.attachments.map(f => (
                            <span key={f.id} className="exp-resume-file-link" onClick={(e) => { e.stopPropagation(); openFile(f); }}>
                              {isImage(f) ? '🖼️' : isPDF(f) ? '📕' : '📄'} {f.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 操作 */}
                    <div className="exp-resume-actions">
                      <button onClick={(e) => { e.stopPropagation(); openModal(exp); }}>✏️</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteExp(exp.id); }}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {detailItem && (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal-sheet detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" /><h2 className="modal-title">🏢 实习详情</h2>
            <div className="detail-content">
              <div className="detail-row"><span className="detail-label">公司</span><span className="detail-val">{detailItem.company}</span></div>
              <div className="detail-row"><span className="detail-label">职位</span><span className="detail-val">{detailItem.role}</span></div>
              <div className="detail-row"><span className="detail-label">时间</span><span className="detail-val">{formatDate(detailItem.startDate)} - {formatDate(detailItem.endDate)}</span></div>
              {detailItem.description && <div className="detail-block"><span className="detail-label">中文描述</span><p className="detail-val">{detailItem.description}</p></div>}
              {detailItem.descriptionEn && <div className="detail-block"><span className="detail-label">English</span><p className="detail-val">{detailItem.descriptionEn}</p></div>}
              {detailItem.achievements.length > 0 && <div className="detail-block"><span className="detail-label">主要成就</span><ul className="detail-list">{detailItem.achievements.map((a,i)=><li key={i}>{a}</li>)}</ul></div>}
              {detailItem.achievementsEn.length > 0 && <div className="detail-block"><span className="detail-label">Achievements (EN)</span><ul className="detail-list">{detailItem.achievementsEn.map((a,i)=><li key={i}>{a}</li>)}</ul></div>}
              {detailItem.skills.length > 0 && <div className="detail-row"><span className="detail-label">技能</span><div className="detail-tags">{detailItem.skills.map((s,i)=><span key={i} className="tag" style={{background:'var(--theme-resume-secondary)',color:'var(--theme-resume-accent)'}}>{s}</span>)}</div></div>}
              {detailItem.tags.length > 0 && <div className="detail-row"><span className="detail-label">标签</span><div className="detail-tags">{detailItem.tags.map((t,i)=><span key={i} className="tag" style={{background:'var(--border-color)',color:'var(--text-secondary)'}}>🏷 {t}</span>)}</div></div>}
              {detailItem.interviewNotes && <div className="detail-block"><span className="detail-label">面试笔记</span><p className="detail-val">{detailItem.interviewNotes}</p></div>}
              {detailItem.attachments.length > 0 && (
                <div className="detail-block">
                  <span className="detail-label">📎 附件 ({detailItem.attachments.length})</span>
                  <div className="detail-attachments">
                    {detailItem.attachments.map(f => (
                      <span key={f.id} className="detail-attachment-link" onClick={() => openFile(f)}>
                        {isImage(f) ? '🖼️' : isPDF(f) ? '📕' : '📄'} {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="detail-actions">
              <button className="btn" style={{ background: 'var(--theme-resume-accent)', color: '#fff' }} onClick={() => { openModal(detailItem); setDetailItem(null); }}>✏️ 编辑</button>
              <button className="btn btn-ghost" onClick={() => setDetailItem(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑弹窗 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" /><h2 className="modal-title">{editingId ? '编辑经历' : '添加实习经历'}</h2>
            <div className="form-group"><label className="form-label">公司/单位 *</label><input className="input" placeholder="如：字节跳动" value={form.company} onChange={e => setForm({...form, company: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">职位 *</label><input className="input" placeholder="如：产品实习生" value={form.role} onChange={e => setForm({...form, role: e.target.value})} /></div>
            <div className="form-row"><div className="form-group"><label className="form-label">开始日期</label><input className="input" type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} /></div><div className="form-group"><label className="form-label">结束日期</label><input className="input" type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} /></div></div>
            <div className="form-group"><label className="form-label">中文工作描述</label><textarea className="input" rows={3} placeholder="简要描述工作内容..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">英文工作描述</label><textarea className="input" rows={2} placeholder="English description..." value={form.descriptionEn} onChange={e => setForm({...form, descriptionEn: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">中文主要成就（每行一条）</label><textarea className="input" rows={3} placeholder="独立完成XX项目..." value={form.achievements} onChange={e => setForm({...form, achievements: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">英文主要成就（每行一条）</label><textarea className="input" rows={2} placeholder="Achievements in English..." value={form.achievementsEn} onChange={e => setForm({...form, achievementsEn: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">技能标签（逗号分隔）</label><input className="input" placeholder="如：Python, SQL" value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">自定义标签（逗号分隔）</label><input className="input" placeholder="如：金融科技, 暑期实习" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">面试问答笔记</label><textarea className="input" rows={3} placeholder="面试被问到的题目和回答..." value={form.interviewNotes} onChange={e => setForm({...form, interviewNotes: e.target.value})} /></div>
            <div className="form-group">
              <FileUpload files={formAttachments} onChange={setFormAttachments} />
            </div>
            <button className="btn btn-lg" style={{ width: '100%', marginTop: 8, background: 'var(--theme-resume-accent)', color: '#fff' }} onClick={saveExp}>{editingId ? '保存修改' : '添加经历'}</button>
            {editingId && <button className="btn btn-ghost btn-lg" style={{ width: '100%', marginTop: 8, color: 'var(--macaron-rose)' }} onClick={() => { deleteExp(editingId); setShowModal(false); }}>删除该经历</button>}
          </div>
        </div>
      )}
    </div>
  );
}
