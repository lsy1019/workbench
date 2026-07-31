import { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Breadcrumb from '../components/Breadcrumb';
import ImportExport from '../components/ImportExport';
import FileUpload, { type UploadedFile } from '../components/FileUpload';
import './SnippetPage.css';

interface ResumeSnippet {
  id: string;
  title: string;
  category: string;
  contentCn: string;
  contentEn: string;
  tags: string[];
  date: string;
  attachments: UploadedFile[];
}

const SNIPPET_CATEGORIES = ['个人总结', '项目描述', '实习描述', '技能描述', '自我介绍', '其他'];

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

export default function SnippetPage() {
  const [snippets, setSnippets] = useLocalStorage<ResumeSnippet[]>('resume_snippets_v3', []);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<ResumeSnippet | null>(null);
  const [form, setForm] = useState({ title: '', category: '个人总结', contentCn: '', contentEn: '', tags: '' });
  const [formAttachments, setFormAttachments] = useState<UploadedFile[]>([]);

  const openModal = (s?: ResumeSnippet) => {
    if (s) {
      setEditingId(s.id);
      setForm({ title: s.title, category: s.category, contentCn: s.contentCn, contentEn: s.contentEn, tags: s.tags.join(', ') });
      setFormAttachments(s.attachments || []);
    } else {
      setEditingId(null);
      setForm({ title: '', category: '个人总结', contentCn: '', contentEn: '', tags: '' });
      setFormAttachments([]);
    }
    setShowModal(true);
  };

  const saveSnippet = () => {
    if (!form.title) return;
    const data: ResumeSnippet = {
      id: editingId || generateId(),
      title: form.title, category: form.category,
      contentCn: form.contentCn, contentEn: form.contentEn,
      tags: form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
      date: editingId ? (snippets.find(s => s.id === editingId)?.date || new Date().toISOString().slice(0,10)) : new Date().toISOString().slice(0, 10),
      attachments: formAttachments,
    };
    if (editingId) setSnippets(prev => prev.map(s => s.id === editingId ? data : s));
    else setSnippets(prev => [data, ...prev]);
    setShowModal(false);
  };

  const deleteSnippet = (id: string) => { if (window.confirm('确认删除？')) setSnippets(prev => prev.filter(s => s.id !== id)); };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => alert('已复制到剪贴板 ✨'));
  };

  const handleExport = (format: 'json' | 'txt' | 'pdf') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(snippets, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `简历素材库_${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
    } else if (format === 'txt') {
      const text = snippets.map(s => `【${s.title}】${s.category}\n中文：${s.contentCn}\n英文：${s.contentEn || '无'}\n标签：${s.tags.join(', ')}\n附件: ${s.attachments.map(a => a.name).join(', ') || '无'}\n---`).join('\n\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `简历素材库_${new Date().toISOString().slice(0, 10)}.txt`;
      a.click(); URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const html = `<html><head><meta charset="utf-8"><title>简历素材库</title><style>body{font-family:sans-serif;padding:20px;}h2{color:#E8A0B0;}.item{margin-bottom:16px;border-bottom:1px solid #eee;padding-bottom:12px;}.title{font-weight:bold;}.tags{color:#888;}</style></head><body><h1>📝 简历素材库</h1>` + snippets.map(s => `<div class="item"><div class="title">${s.title} (${s.category})</div><p>中文：${s.contentCn}</p><p>英文：${s.contentEn || '无'}</p><div class="tags">${s.tags.join(', ')}</div></div>`).join('') + '</body></html>';
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
    }
  };

  const handleImport = (data: any, _fileName: string) => {
    if (Array.isArray(data)) {
      const imported: ResumeSnippet[] = data.map((item: any) => ({
        id: generateId(), title: item.title || '', category: item.category || '其他',
        contentCn: item.contentCn || '', contentEn: item.contentEn || '',
        tags: item.tags || [], date: item.date || new Date().toISOString().slice(0, 10),
        attachments: item.attachments || [],
      }));
      setSnippets(prev => [...imported, ...prev]);
    } else if (data.text) { alert('文本格式无法自动解析，请使用JSON格式'); }
  };

  return (
    <div className="page snip-page">
      <div className="page-body">
        <Breadcrumb items={[{ label: '💼 求职履历管理', path: '/resume' }, { label: '📝 简历素材库' }]} />
      </div>
      <div className="page-header" style={{ background: 'var(--theme-resume-bg)' }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">📝 简历素材库</h1>
            <p className="page-subtitle">多版中英文简历片段，直接复制使用</p>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <ImportExport filename="简历素材库" onExport={handleExport} onImport={handleImport} />
            <button className="btn btn-sm" style={{ background: 'var(--theme-resume-accent)', color: '#fff' }} onClick={() => openModal()}>+ 添加素材</button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {snippets.length === 0 ? (
          <div className="empty-state"><div className="icon">📝</div><p>简历素材库还是空的</p><p>存放多版中英文简历片段，投递时直接复制使用</p></div>
        ) : (
          <div className="snip-grid">
            {snippets.map(s => {
              const cover = getCoverFile(s.attachments);
              return (
                <div key={s.id} className="snip-card-new">
                  {cover ? (
                    <div className="snip-cover" onClick={() => openFile(cover)}>
                      {isImage(cover) ? (
                        <img className="snip-cover-img" src={cover.base64} alt={s.title} />
                      ) : (
                        <div className="snip-cover-file">
                          <span className="snip-cover-icon">{isPDF(cover) ? '📕' : '📎'}</span>
                          <span className="snip-cover-type">{isPDF(cover) ? 'PDF' : cover.name.split('.').pop()?.toUpperCase()}</span>
                        </div>
                      )}
                      <div className="snip-cover-tag">点击查看</div>
                    </div>
                  ) : (
                    <div className="snip-cover snip-cover-empty" onClick={() => setDetailItem(s)}>
                      <span className="snip-cover-icon-big">📝</span>
                      <div className="snip-cover-tag">点击详情</div>
                    </div>
                  )}
                  <div className="snip-info" onClick={() => setDetailItem(s)}>
                    <h4 className="snip-info-name">{s.title}</h4>
                    <div className="snip-info-meta">
                      <span className="snip-info-cat">{s.category}</span>
                      {s.tags.slice(0, 2).map((t, i) => (
                        <span key={i} className="snip-info-tag">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="snip-card-actions">
                    <button className="snip-card-btn" onClick={(e) => { e.stopPropagation(); copyText(s.contentCn); }} title="复制中文">📋</button>
                    <button className="snip-card-btn" onClick={(e) => { e.stopPropagation(); openModal(s); }} title="编辑">✏️</button>
                    <button className="snip-card-btn" onClick={(e) => { e.stopPropagation(); deleteSnippet(s.id); }} title="删除">🗑</button>
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
            <div className="modal-handle" /><h2 className="modal-title">📝 素材详情</h2>
            <div className="detail-content">
              <div className="detail-row"><span className="detail-label">标题</span><span className="detail-val">{detailItem.title}</span></div>
              <div className="detail-row"><span className="detail-label">类别</span><span className="detail-val">{detailItem.category}</span></div>
              <div className="detail-block"><span className="detail-label">中文内容</span><pre className="detail-pre">{detailItem.contentCn}</pre></div>
              {detailItem.contentEn && <div className="detail-block"><span className="detail-label">英文内容</span><pre className="detail-pre">{detailItem.contentEn}</pre></div>}
              {detailItem.tags.length > 0 && <div className="detail-row"><span className="detail-label">标签</span><div className="detail-tags">{detailItem.tags.map((t,i)=><span key={i} className="tag" style={{background:'var(--border-color)',color:'var(--text-secondary)'}}>{t}</span>)}</div></div>}
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
              <button className="btn btn-ghost" onClick={() => copyText(detailItem.contentCn)}>📋 复制中文</button>
              {detailItem.contentEn && <button className="btn btn-ghost" onClick={() => copyText(detailItem.contentEn)}>📋 复制英文</button>}
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
            <div className="modal-handle" /><h2 className="modal-title">{editingId ? '编辑素材' : '添加简历素材'}</h2>
            <div className="form-group"><label className="form-label">标题 *</label><input className="input" placeholder="如：个人总结-金融方向" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">类别</label><select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{SNIPPET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="form-group"><label className="form-label">中文内容</label><textarea className="input" rows={4} placeholder="中文简历描述片段..." value={form.contentCn} onChange={e => setForm({...form, contentCn: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">英文内容</label><textarea className="input" rows={4} placeholder="English resume snippet..." value={form.contentEn} onChange={e => setForm({...form, contentEn: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">标签（逗号分隔）</label><input className="input" placeholder="如：金融, 风控" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} /></div>
            <div className="form-group">
              <FileUpload files={formAttachments} onChange={setFormAttachments} />
            </div>
            <button className="btn btn-lg" style={{ width: '100%', marginTop: 8, background: 'var(--theme-resume-accent)', color: '#fff' }} onClick={saveSnippet}>{editingId ? '保存修改' : '添加素材'}</button>
            {editingId && <button className="btn btn-ghost btn-lg" style={{ width: '100%', marginTop: 8, color: 'var(--macaron-rose)' }} onClick={() => { deleteSnippet(editingId); setShowModal(false); }}>删除该素材</button>}
          </div>
        </div>
      )}
    </div>
  );
}
