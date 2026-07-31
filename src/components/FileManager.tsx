import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import './FileManager.css';

// ===== 类型定义 =====
export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  base64: string;
  createDate: string;
  folderId: string;
}

export interface FileFolder {
  id: string;
  name: string;
  icon: string;
  createDate: string;
}

interface Props {
  storageKey: string;
}

// ===== 工具函数 =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const FILE_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  'pdf':  { icon: '📕', label: 'PDF',  color: '#E74C3C', bg: '#FDEDEC' },
  'doc':  { icon: '📄', label: 'Word', color: '#2B579A', bg: '#E8F0FE' },
  'docx': { icon: '📄', label: 'Word', color: '#2B579A', bg: '#E8F0FE' },
  'xls':  { icon: '📊', label: 'Excel',color: '#217346', bg: '#E8F5E9' },
  'xlsx': { icon: '📊', label: 'Excel',color: '#217346', bg: '#E8F5E9' },
  'ppt':  { icon: '📽️', label: 'PPT',  color: '#D24726', bg: '#FDE8E4' },
  'pptx': { icon: '📽️', label: 'PPT',  color: '#D24726', bg: '#FDE8E4' },
  'png':  { icon: '🖼️', label: '图片',  color: '#8E44AD', bg: '#F3E5F5' },
  'jpg':  { icon: '🖼️', label: '图片',  color: '#8E44AD', bg: '#F3E5F5' },
  'jpeg': { icon: '🖼️', label: '图片',  color: '#8E44AD', bg: '#F3E5F5' },
  'gif':  { icon: '🖼️', label: '图片',  color: '#8E44AD', bg: '#F3E5F5' },
  'webp': { icon: '🖼️', label: '图片',  color: '#8E44AD', bg: '#F3E5F5' },
  'svg':  { icon: '🖼️', label: '图片',  color: '#8E44AD', bg: '#F3E5F5' },
  'txt':  { icon: '📝', label: '文本',  color: '#5D6D7E', bg: '#EBEDEF' },
  'json': { icon: '📦', label: 'JSON',  color: '#F39C12', bg: '#FEF5E7' },
  'zip':  { icon: '🗜️', label: '压缩包',color: '#7D3C98', bg: '#F3E5F5' },
  'rar':  { icon: '🗜️', label: '压缩包',color: '#7D3C98', bg: '#F3E5F5' },
  '7z':   { icon: '🗜️', label: '压缩包',color: '#7D3C98', bg: '#F3E5F5' },
};

function getFileConfig(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_TYPE_CONFIG[ext] || { icon: '📎', label: '文件', color: '#95A5A6', bg: '#F2F3F4' };
}

// 默认文件夹
const DEFAULT_FOLDERS: FileFolder[] = [
  { id: 'all', name: '全部文件', icon: '🗂', createDate: '' },
  { id: 'uncategorized', name: '未分类', icon: '📂', createDate: '' },
];

// ===== 组件 =====
export default function FileManager({ storageKey }: Props) {
  const [files, setFiles] = useLocalStorage<FileAttachment[]>(`${storageKey}_fm_files`, []);
  const [folders, setFolders] = useLocalStorage<FileFolder[]>(`${storageKey}_fm_folders`, []);
  const [activeFolder, setActiveFolder] = useState('all');
  const [dragOver, setDragOver] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderForm, setFolderForm] = useState({ name: '', icon: '📁' });
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<FileAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 迁移旧数据（首次加载时）
  useEffect(() => {
    try {
      const oldKey = `${storageKey}_files`;
      const oldRaw = localStorage.getItem(oldKey);
      if (oldRaw) {
        const oldData = JSON.parse(oldRaw);
        if (Array.isArray(oldData) && oldData.length > 0) {
          const migrated: FileAttachment[] = oldData.map((item: any) => ({
            id: item.id || generateId(),
            name: item.name || 'unknown',
            type: item.type || '',
            size: item.size || 0,
            base64: item.base64 || '',
            createDate: item.createDate || '',
            folderId: 'uncategorized',
          }));
          setFiles(prev => {
            const existingIds = new Set(prev.map(f => f.id));
            const newFiles = migrated.filter(f => !existingIds.has(f.id));
            return [...prev, ...newFiles];
          });
          localStorage.removeItem(oldKey);
        }
      }
    } catch { /* ignore */ }
  }, []); // 只在挂载时运行一次

  const allFolders = [...DEFAULT_FOLDERS, ...folders];

  const filteredFiles = activeFolder === 'all'
    ? files
    : files.filter(f => f.folderId === activeFolder);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    for (const file of arr) {
      try {
        const base64 = await fileToBase64(file);
        const attachment: FileAttachment = {
          id: generateId(),
          name: file.name,
          type: file.type,
          size: file.size,
          base64,
          createDate: new Date().toISOString().slice(0, 10),
          folderId: activeFolder === 'all' ? 'uncategorized' : activeFolder,
        };
        setFiles(prev => [...prev, attachment]);
      } catch { /* skip */ }
    }
  }, [activeFolder, setFiles]);

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const deleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (showPreview?.id === id) setShowPreview(null);
  };

  const downloadFile = (file: FileAttachment) => {
    const a = document.createElement('a');
    a.href = file.base64;
    a.download = file.name;
    a.click();
  };

  const moveFile = (fileId: string, targetFolderId: string) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, folderId: targetFolderId } : f));
  };

  const saveFolder = () => {
    if (!folderForm.name.trim()) return;
    if (editingFolderId) {
      setFolders(prev => prev.map(f => f.id === editingFolderId ? { ...f, name: folderForm.name.trim(), icon: folderForm.icon } : f));
    } else {
      const newFolder: FileFolder = {
        id: generateId(),
        name: folderForm.name.trim(),
        icon: folderForm.icon,
        createDate: new Date().toISOString().slice(0, 10),
      };
      setFolders(prev => [...prev, newFolder]);
    }
    setShowFolderModal(false);
    setFolderForm({ name: '', icon: '📁' });
    setEditingFolderId(null);
  };

  const deleteFolder = (folderId: string) => {
    if (!window.confirm('删除文件夹后，其中的文件将移至「未分类」。确认删除？')) return;
    setFiles(prev => prev.map(f => f.folderId === folderId ? { ...f, folderId: 'uncategorized' } : f));
    setFolders(prev => prev.filter(f => f.id !== folderId));
    if (activeFolder === folderId) setActiveFolder('all');
  };

  const openEditFolder = (folder: FileFolder) => {
    setEditingFolderId(folder.id);
    setFolderForm({ name: folder.name, icon: folder.icon });
    setShowFolderModal(true);
  };

  const openNewFolder = () => {
    setEditingFolderId(null);
    setFolderForm({ name: '', icon: '📁' });
    setShowFolderModal(true);
  };

  const folderFileCounts = (fid: string) => files.filter(f => f.folderId === fid).length;

  const FOLDER_ICONS = ['📁', '📂', '🗄', '📋', '💼', '📊', '📚', '🏷', '⭐', '🔖', '📌', '🗃'];

  // 判断文件扩展名
  const getExt = (name: string) => name.split('.').pop()?.toLowerCase() || '';

  return (
    <div className="fm-container">
      {/* ===== 文件夹侧边栏 ===== */}
      <div className="fm-sidebar">
        <div className="fm-sidebar-title">📁 文件夹</div>
        <div className="fm-folder-list">
          {allFolders.map(folder => (
            <div
              key={folder.id}
              className={`fm-folder-item ${activeFolder === folder.id ? 'active' : ''}`}
              onClick={() => setActiveFolder(folder.id)}
            >
              <span className="fm-folder-icon">{folder.icon}</span>
              <span className="fm-folder-name">{folder.name}</span>
              <span className="fm-folder-count">{folderFileCounts(folder.id)}</span>
              {folder.id !== 'all' && folder.id !== 'uncategorized' && (
                <div className="fm-folder-actions" onClick={e => e.stopPropagation()}>
                  <button className="fm-folder-btn" onClick={() => openEditFolder(folder)} title="编辑">✏️</button>
                  <button className="fm-folder-btn" onClick={() => deleteFolder(folder.id)} title="删除">🗑</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <button className="fm-new-folder-btn" onClick={openNewFolder}>+ 新建文件夹</button>
      </div>

      {/* ===== 文件网格区 ===== */}
      <div className="fm-main">
        <div
          className={`fm-dropzone ${dragOver ? 'active' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="fm-dropzone-icon">📂</span>
          <p>{dragOver ? '松手上传' : '拖拽文件到此处上传，或点击选择文件'}</p>
          <span className="fm-dropzone-hint">
            支持 PDF · Word · Excel · PPT · 图片 · 压缩包 · 文本
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.svg,.txt,.json,.zip,.rar,.7z"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {filteredFiles.length === 0 ? (
          <div className="fm-empty">
            <div className="fm-empty-icon">📭</div>
            <p>此文件夹中还没有文件</p>
            <p>拖拽文件到上方区域开始上传</p>
          </div>
        ) : (
          <div className="fm-grid">
            {filteredFiles.map(file => {
              const cfg = getFileConfig(file.name);
              const ext = getExt(file.name);
              // PDF 文件尝试生成缩略图封面（canvas截图不可靠，用彩色封面代替）
              const isImage = file.type.startsWith('image/');
              return (
                <div
                  key={file.id}
                  className="fm-card"
                  onClick={() => setShowPreview(file)}
                  title={file.name}
                >
                  <div className="fm-card-cover" style={{ background: cfg.bg }}>
                    {/* 图片显示缩略图 */}
                    {isImage ? (
                      <img className="fm-card-thumb" src={file.base64} alt={file.name} />
                    ) : (
                      <>
                        <span className="fm-card-icon">{cfg.icon}</span>
                        <span className="fm-card-type" style={{ color: cfg.color }}>{cfg.label}</span>
                      </>
                    )}
                  </div>
                  <div className="fm-card-body">
                    <span className="fm-card-name">{file.name}</span>
                    <div className="fm-card-meta">
                      <span className="fm-card-size">{formatSize(file.size)}</span>
                      <span className="fm-card-date">{file.createDate}</span>
                    </div>
                  </div>
                  <div className="fm-card-overlay">
                    <button className="fm-card-action" onClick={(e) => { e.stopPropagation(); downloadFile(file); }} title="下载">📥</button>
                    <button className="fm-card-action" onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }} title="删除">🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== 文件预览弹窗 ===== */}
      {showPreview && (() => {
        const cfg = getFileConfig(showPreview.name);
        const ext = getExt(showPreview.name);
        const isImage = showPreview.type.startsWith('image/');
        const isPDF = ext === 'pdf';
        const isText = ext === 'txt' || ext === 'json' || ext === 'md' || ext === 'csv';

        return (
          <div className="modal-overlay" onClick={() => setShowPreview(null)}>
            <div className={`modal-sheet fm-preview-modal ${isPDF ? 'fm-preview-wide' : ''}`} onClick={e => e.stopPropagation()}>
              <div className="modal-handle" />
              <div className="fm-preview-header">
                <span className="fm-preview-icon" style={{ background: cfg.bg }}>{cfg.icon}</span>
                <div className="fm-preview-info">
                  <h3 className="fm-preview-name">{showPreview.name}</h3>
                  <p className="fm-preview-meta">
                    {cfg.label} · {formatSize(showPreview.size)} · {showPreview.createDate}
                  </p>
                </div>
              </div>

              {/* PDF 内嵌预览 */}
              {isPDF && (
                <div className="fm-preview-pdf">
                  <iframe
                    src={showPreview.base64}
                    title={showPreview.name}
                    className="fm-preview-iframe"
                  />
                </div>
              )}

              {/* 图片预览 */}
              {isImage && (
                <div className="fm-preview-image">
                  <img src={showPreview.base64} alt={showPreview.name} />
                </div>
              )}

              {/* 文本预览 */}
              {isText && (
                <div className="fm-preview-text">
                  <pre>{showPreview.base64.split(',')[1] ? atob(showPreview.base64.split(',')[1]) : showPreview.base64}</pre>
                </div>
              )}

              {/* 其他文件类型提示 */}
              {!isPDF && !isImage && !isText && (
                <div className="fm-preview-unsupported">
                  <span style={{ fontSize: 48 }}>{cfg.icon}</span>
                  <p>此文件类型暂不支持在线预览</p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>可下载后在本地打开</p>
                </div>
              )}

              <div className="fm-preview-section">
                <p className="fm-section-label">📁 移动到文件夹：</p>
                <div className="fm-move-options">
                  {allFolders.filter(f => f.id !== 'all').map(folder => (
                    <button
                      key={folder.id}
                      className={`fm-move-btn ${showPreview.folderId === folder.id ? 'active' : ''}`}
                      onClick={() => moveFile(showPreview.id, folder.id)}
                    >
                      {folder.icon} {folder.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fm-preview-actions">
                <button className="btn" style={{ background: 'var(--macaron-rose)', color: '#fff' }} onClick={() => { downloadFile(showPreview); }}>
                  📥 下载文件
                </button>
                {isPDF && (
                  <button className="btn" style={{ background: '#2B579A', color: '#fff' }} onClick={() => { window.open(showPreview.base64, '_blank'); }}>
                    🔗 新窗口打开
                  </button>
                )}
                <button className="btn btn-ghost" style={{ color: '#E74C3C' }} onClick={() => deleteFile(showPreview.id)}>🗑 删除</button>
                <button className="btn btn-ghost" onClick={() => setShowPreview(null)}>关闭</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== 新建/编辑文件夹弹窗 ===== */}
      {showFolderModal && (
        <div className="modal-overlay" onClick={() => setShowFolderModal(false)}>
          <div className="modal-sheet fm-folder-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 className="modal-title">{editingFolderId ? '编辑文件夹' : '新建文件夹'}</h2>
            <div className="form-group">
              <label className="form-label">文件夹名称</label>
              <input
                className="input"
                placeholder="如：证书扫描件、简历模板..."
                value={folderForm.name}
                onChange={e => setFolderForm({ ...folderForm, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">选择图标</label>
              <div className="fm-icon-picker">
                {FOLDER_ICONS.map(icon => (
                  <button
                    key={icon}
                    className={`fm-icon-btn ${folderForm.icon === icon ? 'active' : ''}`}
                    onClick={() => setFolderForm({ ...folderForm, icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="fm-folder-actions-row">
              <button className="btn" style={{ background: 'var(--macaron-rose)', color: '#fff' }} onClick={saveFolder}>
                {editingFolderId ? '保存' : '创建'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowFolderModal(false)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
