import { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Breadcrumb from '../components/Breadcrumb';
import ImportExport from '../components/ImportExport';
import FileUpload, { type UploadedFile } from '../components/FileUpload';
import './CertificatePage.css';

interface Certificate {
  id: string;
  name: string;
  issuer: string;
  date: string;
  category: string;
  notes: string;
  tags: string[];
  attachments: UploadedFile[];
}

const CERT_CATEGORIES = ['学历学位', '语言能力', '职业资格', '技能证书', '获奖荣誉', '其他'];

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function getCoverFile(attachments: UploadedFile[]): UploadedFile | null {
  if (attachments.length === 0) return null;
  // 优先图片，其次 PDF
  const img = attachments.find(f => f.type.startsWith('image/'));
  return img || attachments[0];
}

function isImage(file: UploadedFile) { return file.type.startsWith('image/'); }
function isPDF(file: UploadedFile) { return file.name.toLowerCase().endsWith('.pdf'); }

export default function CertificatePage() {
  const [certificates, setCertificates] = useLocalStorage<Certificate[]>('resume_certificates_v3', []);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<Certificate | null>(null);
  const [form, setForm] = useState({ name: '', issuer: '', date: '', category: '职业资格', notes: '', tags: '' });
  const [formAttachments, setFormAttachments] = useState<UploadedFile[]>([]);

  const handleExport = (format: 'json' | 'txt' | 'pdf') => {
    const dateStr = new Date().toISOString().slice(0, 10);
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(certificates, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `证书证件_${dateStr}.json`; a.click(); URL.revokeObjectURL(url);
    } else if (format === 'txt') {
      const text = certificates.map(c =>
        `【${c.category}】${c.name}\n颁发: ${c.issuer || '--'} | 日期: ${c.date || '--'}\n标签: ${c.tags.join(', ') || '--'}\n附件: ${c.attachments.map(a => a.name).join(', ') || '无'}\n备注: ${c.notes || '--'}\n---`
      ).join('\n\n');
      const blob = new Blob([text], { type: 'text/plain' }); const a = document.createElement('a');
      a.href = url; a.download = `证书证件_${dateStr}.txt`; a.click(); URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const html = `<html><head><meta charset="utf-8"><title>证书证件</title><style>body{font-family:sans-serif;padding:20px;color:#333}h1{color:#E8A0B0}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #ddd;padding:8px 10px;text-align:left;font-size:14px}th{background:#FCE4EC}</style></head><body><h1>📜 证书证件</h1><table><tr><th>名称</th><th>类别</th><th>颁发机构</th><th>日期</th></tr>${certificates.map(c => `<tr><td>${c.name}</td><td>${c.category}</td><td>${c.issuer||'--'}</td><td>${c.date||'--'}</td></tr>`).join('')}</table></body></html>`;
      const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
    }
  };

  const handleImport = (data: any) => {
    if (Array.isArray(data)) {
      const imported: Certificate[] = data.map((item: any) => ({
        id: generateId(), name: item.name || '', issuer: item.issuer || '', date: item.date || '',
        category: item.category || '其他', notes: item.notes || '',
        tags: item.tags || [], attachments: item.attachments || [],
      }));
      setCertificates(prev => [...imported, ...prev]);
    } else if (data.text) { alert('文本格式无法自动解析，请使用JSON格式'); }
  };

  const openModal = (cert?: Certificate) => {
    if (cert) {
      setEditingId(cert.id);
      setForm({ name: cert.name, issuer: cert.issuer, date: cert.date, category: cert.category, notes: cert.notes, tags: cert.tags.join(', ') });
      setFormAttachments(cert.attachments || []);
    } else {
      setEditingId(null);
      setForm({ name: '', issuer: '', date: '', category: '职业资格', notes: '', tags: '' });
      setFormAttachments([]);
    }
    setShowModal(true);
  };

  const saveCert = () => {
    if (!form.name) return;
    const data: Certificate = {
      id: editingId || generateId(),
      ...form,
      tags: form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
      attachments: formAttachments,
    };
    if (editingId) setCertificates(prev => prev.map(c => c.id === editingId ? data : c));
    else setCertificates(prev => [data, ...prev]);
    setShowModal(false);
  };

  const deleteCert = (id: string) => { if (window.confirm('确认删除？')) setCertificates(prev => prev.filter(c => c.id !== id)); };

  // base64 → Blob URL
  const toBlobUrl = (base64: string, mime: string) => {
    const byteChars = atob(base64.split(',')[1]);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
    const byteArr = new Uint8Array(byteNums);
    return URL.createObjectURL(new Blob([byteArr], { type: mime }));
  };

  // 打开文件
  const openFile = (file: UploadedFile) => {
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
  };

  return (
    <div className="page cert-page">
      <div className="page-body">
        <Breadcrumb items={[{ label: '💼 求职履历管理', path: '/resume' }, { label: '📜 证书证件' }]} />
      </div>
      <div className="page-header" style={{ background: 'var(--theme-resume-bg)' }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">📜 证书证件</h1>
            <p className="page-subtitle">学历学位 · 职业资格 · 技能证书</p>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <ImportExport filename="证书证件" onExport={handleExport} onImport={handleImport} />
            <button className="btn btn-sm" style={{ background: 'var(--theme-resume-accent)', color: '#fff' }} onClick={() => openModal()}>+ 添加证书</button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {certificates.length === 0 ? (
          <div className="empty-state"><div className="icon">📜</div><p>还没有添加证书证件</p><p>点击右上角"添加证书"开始整理</p></div>
        ) : (
          <div className="cert-list">
            {CERT_CATEGORIES.map(cat => {
              const items = certificates.filter(c => c.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="cert-group">
                  <h3 className="cert-group-title">{cat}</h3>
                  <div className="cert-grid">
                    {items.map(cert => {
                      const cover = getCoverFile(cert.attachments);
                      return (
                        <div key={cert.id} className="cert-card-new">
                          {/* 封面区 */}
                          {cover ? (
                            <div className="cert-cover" onClick={() => openFile(cover)}>
                              {isImage(cover) ? (
                                <img className="cert-cover-img" src={cover.base64} alt={cert.name} />
                              ) : (
                                <div className="cert-cover-file">
                                  <span className="cert-cover-icon">{isPDF(cover) ? '📕' : '📎'}</span>
                                  <span className="cert-cover-type">{isPDF(cover) ? 'PDF' : cover.name.split('.').pop()?.toUpperCase()}</span>
                                </div>
                              )}
                              <div className="cert-cover-tag">点击查看</div>
                            </div>
                          ) : (
                            <div className="cert-cover cert-cover-empty" onClick={() => setDetailItem(cert)}>
                              <span className="cert-cover-icon-big">📜</span>
                              <div className="cert-cover-tag">点击详情</div>
                            </div>
                          )}

                          {/* 信息区 */}
                          <div className="cert-info" onClick={() => setDetailItem(cert)}>
                            <h4 className="cert-info-name">{cert.name}</h4>
                            {cert.issuer && <p className="cert-info-issuer">{cert.issuer}</p>}
                            <div className="cert-info-meta">
                              <span className="cert-info-date">{cert.date || '--'}</span>
                              {cert.tags.slice(0, 2).map((t, i) => (
                                <span key={i} className="cert-info-tag">{t}</span>
                              ))}
                            </div>
                          </div>

                          {/* 操作按钮 */}
                          <div className="cert-actions">
                            <button className="cert-action-btn" onClick={(e) => { e.stopPropagation(); openModal(cert); }} title="编辑">✏️</button>
                            <button className="cert-action-btn" onClick={(e) => { e.stopPropagation(); deleteCert(cert.id); }} title="删除">🗑</button>
                          </div>
                        </div>
                      );
                    })}
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
            <div className="modal-handle" />
            <h2 className="modal-title">📜 证书详情</h2>
            <div className="detail-content">
              <div className="detail-row"><span className="detail-label">名称</span><span className="detail-val">{detailItem.name}</span></div>
              <div className="detail-row"><span className="detail-label">颁发机构</span><span className="detail-val">{detailItem.issuer || '--'}</span></div>
              <div className="detail-row"><span className="detail-label">获得日期</span><span className="detail-val">{detailItem.date || '--'}</span></div>
              <div className="detail-row"><span className="detail-label">类别</span><span className="detail-val">{detailItem.category}</span></div>
              {detailItem.tags.length > 0 && <div className="detail-row"><span className="detail-label">标签</span><div className="detail-tags">{detailItem.tags.map((t, i) => <span key={i} className="tag" style={{ background: 'var(--theme-resume-secondary)', color: 'var(--theme-resume-accent)' }}>{t}</span>)}</div></div>}
              {detailItem.notes && <div className="detail-row"><span className="detail-label">备注</span><span className="detail-val">{detailItem.notes}</span></div>}
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
            <div className="modal-handle" /><h2 className="modal-title">{editingId ? '编辑证书' : '添加证书'}</h2>
            <div className="form-group"><label className="form-label">证书名称 *</label><input className="input" placeholder="如：CET-6 英语六级" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-row"><div className="form-group"><label className="form-label">颁发机构</label><input className="input" placeholder="如：教育部" value={form.issuer} onChange={e => setForm({ ...form, issuer: e.target.value })} /></div><div className="form-group"><label className="form-label">获得日期</label><input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div></div>
            <div className="form-group"><label className="form-label">类别</label><select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CERT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="form-group"><label className="form-label">自定义标签</label><input className="input" placeholder="如：金融, 英语" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">备注</label><textarea className="input" rows={2} placeholder="备注信息..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="form-group">
              <FileUpload files={formAttachments} onChange={setFormAttachments} />
            </div>
            <button className="btn btn-lg" style={{ width: '100%', marginTop: 8, background: 'var(--theme-resume-accent)', color: '#fff' }} onClick={saveCert}>{editingId ? '保存修改' : '添加证书'}</button>
            {editingId && <button className="btn btn-ghost btn-lg" style={{ width: '100%', marginTop: 8, color: 'var(--macaron-rose)' }} onClick={() => { deleteCert(editingId); setShowModal(false); }}>删除该证书</button>}
          </div>
        </div>
      )}
    </div>
  );
}
