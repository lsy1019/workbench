import { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Breadcrumb from '../components/Breadcrumb';
import ImportExport from '../components/ImportExport';
import FileUpload, { type UploadedFile } from '../components/FileUpload';
import './ProjectPage.css';

interface Project {
  id: string;
  name: string;
  role: string;
  date: string;
  description: string;
  descriptionEn: string;
  techStack: string[];
  link: string;
  highlights: string[];
  highlightsEn: string[];
  tags: string[];
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

export default function ProjectPage() {
  const [projects, setProjects] = useLocalStorage<Project[]>('resume_projects_v2', []);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<Project | null>(null);
  const [form, setForm] = useState({
    name: '', role: '', date: '', description: '', descriptionEn: '',
    techStack: '', link: '', highlights: '', highlightsEn: '', tags: '',
  });
  const [formAttachments, setFormAttachments] = useState<UploadedFile[]>([]);

  const openModal = (proj?: Project) => {
    if (proj) {
      setEditingId(proj.id);
      setForm({
        name: proj.name, role: proj.role, date: proj.date,
        description: proj.description, descriptionEn: proj.descriptionEn,
        techStack: proj.techStack.join(', '), link: proj.link,
        highlights: proj.highlights.join('\n'), highlightsEn: proj.highlightsEn.join('\n'),
        tags: proj.tags.join(', '),
      });
      setFormAttachments(proj.attachments || []);
    } else {
      setEditingId(null);
      setForm({ name: '', role: '', date: '', description: '', descriptionEn: '', techStack: '', link: '', highlights: '', highlightsEn: '', tags: '' });
      setFormAttachments([]);
    }
    setShowModal(true);
  };

  const saveProj = () => {
    if (!form.name) return;
    const data: Project = {
      id: editingId || generateId(),
      name: form.name, role: form.role, date: form.date,
      description: form.description, descriptionEn: form.descriptionEn,
      techStack: form.techStack.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      link: form.link,
      highlights: form.highlights.split('\n').filter(Boolean),
      highlightsEn: form.highlightsEn.split('\n').filter(Boolean),
      tags: form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
      attachments: formAttachments,
    };
    if (editingId) setProjects(prev => prev.map(p => p.id === editingId ? data : p));
    else setProjects(prev => [data, ...prev]);
    setShowModal(false);
  };

  const deleteProj = (id: string) => { if (window.confirm('确认删除？')) setProjects(prev => prev.filter(p => p.id !== id)); };

  const handleExport = (format: 'json' | 'txt' | 'pdf') => {
    const dateStr = new Date().toISOString().slice(0, 10);
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `项目经验_${dateStr}.json`;
      a.click(); URL.revokeObjectURL(url);
    } else if (format === 'txt') {
      const text = projects.map(p =>
        `【${p.name}】${p.role ? ' 角色: ' + p.role : ''} | ${p.date || '--'}\n描述: ${p.description || '--'}\n技术栈: ${p.techStack.join(', ') || '--'}\n附件: ${p.attachments.map(a => a.name).join(', ') || '无'}\n亮点:\n${p.highlights.map(h => '  - ' + h).join('\n') || '  无'}\n---`
      ).join('\n\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `项目经验_${dateStr}.txt`;
      a.click(); URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const html = `<html><head><meta charset="utf-8"><title>项目经验</title><style>body{font-family:sans-serif;padding:20px;color:#333}h1{color:#9B8E9A}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #ddd;padding:8px 10px;text-align:left;font-size:14px}th{background:#F3E5F5}</style></head><body><h1>🚀 项目经验</h1><table><tr><th>项目名称</th><th>角色</th><th>日期</th><th>技术栈</th></tr>${projects.map(p => `<tr><td>${p.name}</td><td>${p.role||'--'}</td><td>${p.date||'--'}</td><td>${p.techStack.join(', ')||'--'}</td></tr>`).join('')}</table></body></html>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
    }
  };

  const handleImport = (data: any) => {
    if (Array.isArray(data)) {
      const imported: Project[] = data.map((item: any) => ({
        id: generateId(),
        name: item.name || '', role: item.role || '', date: item.date || '',
        description: item.description || '', descriptionEn: item.descriptionEn || '',
        techStack: item.techStack || [], link: item.link || '',
        highlights: item.highlights || [], highlightsEn: item.highlightsEn || [],
        tags: item.tags || [], attachments: item.attachments || [],
      }));
      setProjects(prev => [...imported, ...prev]);
    } else if (data.text) { alert('文本格式无法自动解析，请使用JSON格式'); }
  };

  return (
    <div className="page proj-page">
      <div className="page-body">
        <Breadcrumb items={[{ label: '💼 求职履历管理', path: '/resume' }, { label: '🚀 项目经验' }]} />
      </div>
      <div className="page-header" style={{ background: 'var(--theme-resume-bg)' }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">🚀 项目经验</h1>
            <p className="page-subtitle">汇总做过的项目，面试时从容应对</p>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <ImportExport filename="项目经验" onExport={handleExport} onImport={handleImport} />
            <button className="btn btn-sm" style={{ background: 'var(--theme-resume-accent)', color: '#fff' }} onClick={() => openModal()}>+ 添加项目</button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {projects.length === 0 ? (
          <div className="empty-state"><div className="icon">🚀</div><p>还没有添加项目经验</p><p>点击右上角"添加项目"开始汇总</p></div>
        ) : (
          <div className="proj-timeline">
            {projects.map((proj, idx) => {
              const cover = getCoverFile(proj.attachments);
              return (
                <div key={proj.id} className="proj-resume-item">
                  {/* 时间线 */}
                  <div className="proj-timeline-bar">
                    <div className="proj-timeline-dot" />
                    {idx < projects.length - 1 && <div className="proj-timeline-line" />}
                  </div>

                  {/* 内容区 */}
                  <div className="proj-resume-body">
                    {/* 附件缩略图：点击打开文件或详情 */}
                    {cover ? (
                      <div className="proj-resume-thumb" onClick={() => openFile(cover)} title="点击打开附件">
                        {isImage(cover) ? (
                          <img src={cover.base64} alt="" />
                        ) : (
                          <span className="proj-resume-thumb-icon">{isPDF(cover) ? '📕' : '📎'}</span>
                        )}
                      </div>
                    ) : (
                      <div className="proj-resume-thumb proj-resume-thumb-empty" onClick={() => setDetailItem(proj)} title="查看详情">
                        <span className="proj-resume-thumb-icon">🚀</span>
                      </div>
                    )}

                    <div className="proj-resume-content">
                      <div className="proj-resume-header">
                        <h3 className="proj-resume-name">{proj.name}</h3>
                        <span className="proj-resume-date">{proj.date || '--'}</span>
                      </div>
                      {proj.role && <p className="proj-resume-role">👤 {proj.role}</p>}

                      {/* 中文描述（完整展示） */}
                      {proj.description && <p className="proj-resume-desc">{proj.description}</p>}

                      {/* 英文描述 */}
                      {proj.descriptionEn && <p className="proj-resume-desc-en">{proj.descriptionEn}</p>}

                      {/* 项目亮点 */}
                      {proj.highlights.length > 0 && (
                        <ul className="proj-resume-highlights">
                          {proj.highlights.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      )}
                      {proj.highlightsEn.length > 0 && (
                        <ul className="proj-resume-highlights proj-resume-highlights-en">
                          {proj.highlightsEn.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      )}

                      {/* 项目链接 */}
                      {proj.link && (
                        <a href={proj.link} target="_blank" rel="noopener noreferrer" className="proj-resume-link" onClick={e => e.stopPropagation()}>
                          🔗 {proj.link}
                        </a>
                      )}

                      <div className="proj-resume-tech">
                        {proj.techStack.map((t, i) => <span key={i} className="proj-resume-tag">{t}</span>)}
                        {proj.tags.map((t, i) => <span key={'t'+i} className="proj-resume-tag proj-resume-tag-dim">{t}</span>)}
                      </div>

                      {/* 所有附件列表 */}
                      {proj.attachments.length > 0 && (
                        <div className="proj-resume-files">
                          {proj.attachments.map(f => (
                            <span key={f.id} className="proj-resume-file-link" onClick={(e) => { e.stopPropagation(); openFile(f); }}>
                              {isImage(f) ? '🖼️' : isPDF(f) ? '📕' : '📄'} {f.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 操作 */}
                    <div className="proj-resume-actions">
                      <button onClick={(e) => { e.stopPropagation(); openModal(proj); }}>✏️</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteProj(proj.id); }}>🗑</button>
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
            <div className="modal-handle" /><h2 className="modal-title">🚀 项目详情</h2>
            <div className="detail-content">
              <div className="detail-row"><span className="detail-label">项目名称</span><span className="detail-val">{detailItem.name}</span></div>
              {detailItem.role && <div className="detail-row"><span className="detail-label">担任角色</span><span className="detail-val">{detailItem.role}</span></div>}
              <div className="detail-row"><span className="detail-label">项目日期</span><span className="detail-val">{detailItem.date || '--'}</span></div>
              {detailItem.description && <div className="detail-block"><span className="detail-label">中文描述</span><p className="detail-val">{detailItem.description}</p></div>}
              {detailItem.descriptionEn && <div className="detail-block"><span className="detail-label">English</span><p className="detail-val">{detailItem.descriptionEn}</p></div>}
              {detailItem.techStack.length > 0 && <div className="detail-row"><span className="detail-label">技术栈</span><div className="detail-tags">{detailItem.techStack.map((t,i)=><span key={i} className="tag" style={{background:'var(--theme-resume-secondary)',color:'var(--theme-resume-accent)'}}>{t}</span>)}</div></div>}
              {detailItem.highlights.length > 0 && <div className="detail-block"><span className="detail-label">项目亮点</span><ul className="detail-list">{detailItem.highlights.map((h,i)=><li key={i}>{h}</li>)}</ul></div>}
              {detailItem.highlightsEn.length > 0 && <div className="detail-block"><span className="detail-label">Highlights (EN)</span><ul className="detail-list">{detailItem.highlightsEn.map((h,i)=><li key={i}>{h}</li>)}</ul></div>}
              {detailItem.link && <div className="detail-row"><span className="detail-label">链接</span><a href={detailItem.link} target="_blank" rel="noopener noreferrer" className="detail-link">🔗 {detailItem.link}</a></div>}
              {detailItem.attachments.length > 0 && (
                <div className="detail-block">
                  <span className="detail-label">📎 附件 ({detailItem.attachments.length})</span>
                  <div className="detail-attachments">
                    {detailItem.attachments.map(f => (
                      <span key={f.id} className="detail-attachment-link" onClick={() => openFile(f)}>📄 {f.name}</span>
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
            <div className="modal-handle" /><h2 className="modal-title">{editingId ? '编辑项目' : '添加项目'}</h2>
            <div className="form-group"><label className="form-label">项目名称 *</label><input className="input" placeholder="如：用户画像分析系统" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div className="form-row"><div className="form-group"><label className="form-label">担任角色</label><input className="input" placeholder="如：核心开发" value={form.role} onChange={e => setForm({...form, role: e.target.value})} /></div><div className="form-group"><label className="form-label">项目日期</label><input className="input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div></div>
            <div className="form-group"><label className="form-label">中文项目描述</label><textarea className="input" rows={3} placeholder="简要描述项目..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">英文项目描述</label><textarea className="input" rows={2} placeholder="Project description in English..." value={form.descriptionEn} onChange={e => setForm({...form, descriptionEn: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">技术栈（逗号分隔）</label><input className="input" placeholder="如：React, TypeScript, Node.js" value={form.techStack} onChange={e => setForm({...form, techStack: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">项目链接</label><input className="input" placeholder="GitHub 或演示链接" value={form.link} onChange={e => setForm({...form, link: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">中文项目亮点（每行一条）</label><textarea className="input" rows={3} placeholder="实现了XX功能..." value={form.highlights} onChange={e => setForm({...form, highlights: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">英文项目亮点（每行一条）</label><textarea className="input" rows={2} placeholder="Highlights in English..." value={form.highlightsEn} onChange={e => setForm({...form, highlightsEn: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">自定义标签（逗号分隔）</label><input className="input" placeholder="如：数据分析, 机器学习" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} /></div>
            <div className="form-group">
              <FileUpload files={formAttachments} onChange={setFormAttachments} />
            </div>
            <button className="btn btn-lg" style={{ width: '100%', marginTop: 8, background: 'var(--theme-resume-accent)', color: '#fff' }} onClick={saveProj}>{editingId ? '保存修改' : '添加项目'}</button>
            {editingId && <button className="btn btn-ghost btn-lg" style={{ width: '100%', marginTop: 8, color: 'var(--macaron-rose)' }} onClick={() => { deleteProj(editingId); setShowModal(false); }}>删除该项目</button>}
          </div>
        </div>
      )}
    </div>
  );
}
