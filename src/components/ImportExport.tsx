import { useState } from 'react';
import './ImportExport.css';

interface Props {
  onExport: (format: 'json' | 'txt' | 'pdf') => void;
  onImport: (data: any, fileName: string) => void;
  filename: string;
}

export default function ImportExport({ onExport, onImport, filename }: Props) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importFileName, setImportFileName] = useState('');

  // 处理文件读取（仅 JSON / TXT）
  const processFile = (file: File) => {
    setImportError('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'json' || ext === 'txt') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImportText(e.target?.result as string);
        setImportFileName(file.name);
      };
      reader.readAsText(file);
    } else {
      setImportError(`「${file.name}」不是 JSON/TXT 格式，请用下方的文件管理器上传其他格式文件。`);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const doImport = () => {
    if (!importText.trim()) return;
    try {
      const data = JSON.parse(importText);
      onImport(data, importFileName || filename);
      setShowImportModal(false);
      setImportText('');
      setImportFileName('');
      setImportError('');
      alert('导入成功 ✨');
    } catch {
      onImport({ text: importText }, importFileName || filename);
      setShowImportModal(false);
      setImportText('');
      setImportFileName('');
      setImportError('');
      alert('已作为文本导入 ✨');
    }
  };

  return (
    <>
      <div className="ie-wrapper">
        <button
          className="btn btn-sm ie-btn"
          style={{ background: 'var(--macaron-rose)', color: '#fff' }}
          onClick={() => setShowExportMenu(!showExportMenu)}
        >
          📥 导出
        </button>
        {showExportMenu && (
          <>
            <div className="ie-overlay" onClick={() => setShowExportMenu(false)} />
            <div className="ie-dropdown">
              <button onClick={() => { onExport('json'); setShowExportMenu(false); }}>📦 导出 JSON</button>
              <button onClick={() => { onExport('txt'); setShowExportMenu(false); }}>📄 导出 TXT</button>
              <button onClick={() => { onExport('pdf'); setShowExportMenu(false); }}>📕 导出 PDF</button>
            </div>
          </>
        )}

        <button
          className="btn btn-sm ie-btn"
          style={{ background: 'var(--macaron-lavender)', color: 'var(--text-primary)' }}
          onClick={() => { setImportText(''); setImportFileName(''); setImportError(''); setShowImportModal(true); }}
        >
          📤 导入
        </button>
      </div>

      {showImportModal && (
        <div className="modal-overlay ie-modal-wrapper" onClick={() => setShowImportModal(false)}>
          <div className="modal-sheet ie-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 className="modal-title">📤 导入数据</h2>
            <p className="ie-modal-desc">导入 JSON/TXT 格式的结构化数据</p>

            <div
              className={`ie-dropzone ${dragOver ? 'active' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('ie-file-input')?.click()}
            >
              <span className="ie-dropzone-icon">📂</span>
              <p>{dragOver ? '松手上传' : '拖拽 JSON/TXT 文件到此处'}</p>
              <span className="ie-dropzone-hint">仅限 .json / .txt</span>
              <input
                id="ie-file-input"
                type="file"
                accept=".json,.txt"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {importError && <p className="ie-error">{importError}</p>}

            <div className="ie-textarea-section">
              <p className="ie-section-label">或直接粘贴内容：</p>
              <textarea
                className="input"
                rows={6}
                placeholder="粘贴 JSON 或文本内容..."
                value={importText}
                onChange={e => setImportText(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
              />
            </div>

            <div className="ie-modal-actions">
              <button className="btn btn-sm" style={{ background: 'var(--macaron-rose)', color: '#fff' }} onClick={doImport}>
                确认导入
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowImportModal(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
