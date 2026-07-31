import { useRef } from 'react';
import './FileUpload.css';

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  base64: string;
}

interface Props {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept?: string;
  maxFiles?: number;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    'pdf': '📕', 'doc': '📄', 'docx': '📄', 'xls': '📊', 'xlsx': '📊',
    'ppt': '📽️', 'pptx': '📽️', 'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️',
    'gif': '🖼️', 'webp': '🖼️', 'svg': '🖼️', 'txt': '📝', 'zip': '🗜️', 'rar': '🗜️',
  };
  return map[ext] || '📎';
}

export default function FileUpload({ files, onChange, accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.svg,.txt,.zip,.rar', maxFiles = 10 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(fileList)) {
      if (files.length + newFiles.length >= maxFiles) break;
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      newFiles.push({
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
        base64,
      });
    }
    onChange([...files, ...newFiles]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    onChange(files.filter(f => f.id !== id));
  };

  const downloadFile = (file: UploadedFile) => {
    const a = document.createElement('a');
    a.href = file.base64;
    a.download = file.name;
    a.click();
  };

  return (
    <div className="fu-container">
      <label className="form-label">📎 附件</label>

      {/* 已上传文件列表 */}
      {files.length > 0 && (
        <div className="fu-list">
          {files.map(f => (
            <div key={f.id} className="fu-item">
              <span className="fu-item-icon">{getFileIcon(f.name)}</span>
              <span className="fu-item-name" onClick={() => downloadFile(f)} title="点击下载">
                {f.name}
              </span>
              <span className="fu-item-size">{formatSize(f.size)}</span>
              <button className="fu-item-remove" onClick={() => removeFile(f.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* 上传按钮 */}
      {files.length < maxFiles && (
        <div className="fu-add-area" onClick={() => inputRef.current?.click()}>
          <span className="fu-add-icon">+</span>
          <span className="fu-add-text">上传文件或拖拽到此处</span>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            onChange={handleAdd}
            style={{ display: 'none' }}
          />
        </div>
      )}
    </div>
  );
}
