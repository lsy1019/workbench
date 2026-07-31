import { useState, useMemo, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getLunarDate } from '../hooks/useLunar';
import './CalendarView.css';

export interface CalendarEvent {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  color: string;
  type: string;
  data?: any;
}

interface CalendarNote {
  id: string;
  date: string;
  content: string;
  color: string;
  createDate: string;
}

interface Props {
  events?: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  /** 使用独立存储key区分不同页面的备注 */
  storageKey?: string;
}

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const NOTE_COLORS = ['#FADADD', '#C5EAD9', '#D6EAF8', '#FFF5E1', '#E0D4F0', '#FDE4CF', '#FFD4B8', '#D4C1EC'];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function CalendarView({ events = [], onEventClick, storageKey = 'calendar_notes' }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  // 用户备注（持久化存储）
  const [notes, setNotes] = useLocalStorage<CalendarNote[]>(storageKey, []);

  // 弹窗状态
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 构建日历网格
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const lastDay = new Date(viewYear, viewMonth, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: { day: number; date: string; isToday: boolean; isWeekend: boolean; lunarDay: string; festival: string; dayEvents: CalendarEvent[]; dayNotes: CalendarNote[] }[] = [];

    // 填充上月空白
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: 0, date: '', isToday: false, isWeekend: false, lunarDay: '', festival: '', dayEvents: [], dayNotes: [] });
    }

    // 本月日期
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(viewYear, viewMonth - 1, d);
      const dow = dateObj.getDay();
      const isWeekend = dow === 0 || dow === 6;

      const lunar = getLunarDate(dateObj);
      const lunarDisplay = lunar.dayStr === '初一' ? lunar.monthStr : lunar.dayStr;
      const festival = lunar.festival || lunar.term || '';

      const dayEvents = events.filter(e => e.date === dateStr);
      const dayNotes = notes.filter(n => n.date === dateStr);

      days.push({
        day: d, date: dateStr,
        isToday: dateStr === todayStr,
        isWeekend,
        lunarDay: lunarDisplay,
        festival,
        dayEvents,
        dayNotes,
      });
    }

    return days;
  }, [viewYear, viewMonth, events, notes, todayStr]);

  // 点击日期 → 打开备注弹窗
  const handleDayClick = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    setNoteInput('');
    setNoteColor(NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]);
  }, []);

  // 添加备注
  const addNote = () => {
    if (!selectedDate || !noteInput.trim()) return;
    const newNote: CalendarNote = {
      id: generateId(),
      date: selectedDate,
      content: noteInput.trim(),
      color: noteColor,
      createDate: new Date().toISOString().slice(0, 10),
    };
    setNotes(prev => [...prev, newNote]);
    setNoteInput('');
  };

  // 删除备注
  const deleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  // 格式化日期显示
  const formatDisplayDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${y}年${parseInt(m)}月${parseInt(d)}日`;
  };

  const selectedDayData = selectedDate
    ? calendarDays.find(d => d.date === selectedDate)
    : null;

  return (
    <div className="calendar-view">
      {/* 月份导航 */}
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={prevMonth}>◀</button>
        <h3 className="calendar-month-title">{viewYear}年 {MONTHS[viewMonth - 1]}</h3>
        <button className="calendar-nav-btn" onClick={nextMonth}>▶</button>
        <button className="calendar-today-btn" onClick={goToday}>今天</button>
      </div>

      {/* 星期头 */}
      <div className="calendar-weekdays">
        {WEEKDAYS.map(w => (
          <div key={w} className={`calendar-weekday ${(w === '日' || w === '六') ? 'weekend' : ''}`}>{w}</div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="calendar-grid">
        {calendarDays.map((d, i) => (
          <div
            key={i}
            className={`calendar-day ${d.day === 0 ? 'empty' : ''} ${d.isToday ? 'today' : ''} ${d.isWeekend ? 'weekend' : ''}`}
            onClick={() => d.day > 0 && handleDayClick(d.date)}
          >
            {d.day > 0 && (
              <>
                <span className="calendar-day-num">{d.day}</span>
                {/* 农历/节日/节气 */}
                <span className={`calendar-day-lunar ${d.festival ? 'festival' : ''}`}>
                  {d.festival || d.lunarDay}
                </span>
                <div className="calendar-day-dots">
                  {/* 系统事件（圆点标注） */}
                  {d.dayEvents.slice(0, 4).map(ev => (
                    <span
                      key={ev.id}
                      className="calendar-dot"
                      style={{ background: ev.color }}
                      title={ev.title}
                      onClick={(e) => { e.stopPropagation(); onEventClick?.(ev); }}
                    />
                  ))}
                  {/* 用户备注（圆点标注） */}
                  {d.dayNotes.slice(0, 3).map(n => (
                    <span
                      key={n.id}
                      className="calendar-dot note-dot"
                      style={{ background: n.color }}
                      title={n.content}
                    />
                  ))}
                  {(d.dayEvents.length + d.dayNotes.length) > 7 && (
                    <span className="calendar-more-dot">+</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 日期详情弹窗 */}
      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
          <div className="modal-sheet calendar-note-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 className="modal-title">📅 {formatDisplayDate(selectedDate)}</h2>

            {/* 当天系统事件 */}
            {selectedDayData && selectedDayData.dayEvents.length > 0 && (
              <div className="note-section">
                <p className="note-section-title">📌 日程事件</p>
                {selectedDayData.dayEvents.map(ev => (
                  <div
                    key={ev.id}
                    className="note-event-item"
                    style={{ borderLeftColor: ev.color }}
                    onClick={() => { setSelectedDate(null); onEventClick?.(ev); }}
                  >
                    <span className="note-event-title">{ev.title}</span>
                    {ev.subtitle && <span className="note-event-sub">{ev.subtitle}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* 当天用户备注 */}
            {selectedDayData && selectedDayData.dayNotes.length > 0 && (
              <div className="note-section">
                <p className="note-section-title">📝 我的备注</p>
                {selectedDayData.dayNotes.map(n => (
                  <div key={n.id} className="note-item" style={{ borderLeftColor: n.color }}>
                    <span className="note-content">{n.content}</span>
                    <button className="note-delete" onClick={() => deleteNote(n.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* 添加新备注 */}
            <div className="note-add-section">
              <p className="note-section-title">➕ 添加备注</p>
              <textarea
                className="input"
                rows={3}
                placeholder="写点什么...比如：面试、投递截止、实习报到"
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
              />
              <div className="note-add-row">
                <div className="note-colors">
                  {NOTE_COLORS.map(c => (
                    <button
                      key={c}
                      className={`note-color-btn ${noteColor === c ? 'active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setNoteColor(c)}
                    />
                  ))}
                </div>
                <button className="btn btn-sm" style={{ background: 'var(--macaron-rose)', color: '#fff' }} onClick={addNote}>
                  添加备注
                </button>
              </div>
            </div>

            <button className="btn btn-ghost btn-lg" style={{ width: '100%', marginTop: 8 }} onClick={() => setSelectedDate(null)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
