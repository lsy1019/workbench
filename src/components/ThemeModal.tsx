import { useState } from 'react';
import { useTheme, themes } from '../hooks/useTheme';
import './ThemeModal.css';

interface Props {
  onClose: () => void;
}

export default function ThemeModal({ onClose }: Props) {
  const { theme: current, setThemeId } = useTheme();
  const [previewId, setPreviewId] = useState(current.id);

  const handleConfirm = () => {
    setThemeId(previewId);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet theme-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">🎨 主题设置</h2>
        <p className="theme-modal-desc">选择一套全局配色方案，所有页面同步生效</p>

        <div className="theme-grid">
          {themes.map(t => {
            const isActive = t.id === previewId;
            return (
              <button
                key={t.id}
                className={`theme-option ${isActive ? 'active' : ''}`}
                onClick={() => setPreviewId(t.id)}
              >
                <div className="theme-preview" style={{ background: t.bgPrimary }}>
                  <div className="theme-preview-bar" style={{ background: t.themePrimary }} />
                  <div className="theme-preview-content">
                    <div className="theme-preview-card" style={{ background: t.bgCard, borderColor: t.borderColor }}>
                      <div className="theme-preview-line" style={{ background: t.textPrimary }} />
                      <div className="theme-preview-line short" style={{ background: t.textSecondary }} />
                    </div>
                    <div className="theme-preview-dots">
                      <span style={{ background: t.accentPink }} />
                      <span style={{ background: t.accentRose }} />
                      <span style={{ background: t.accentMint }} />
                      <span style={{ background: t.accentLavender }} />
                    </div>
                  </div>
                </div>
                <span className="theme-name">
                  {t.emoji} {t.name}
                </span>
                {isActive && <span className="theme-check">✅</span>}
              </button>
            );
          })}
        </div>

        {/* 完成按钮 */}
        <button
          className="btn btn-lg theme-confirm-btn"
          onClick={handleConfirm}
        >
          ✅ 完成 — 应用「{themes.find(t => t.id === previewId)?.name}」
        </button>
      </div>
    </div>
  );
}
