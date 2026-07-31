import { useState, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import './ExamPage.css';

// ===== 类型定义 =====
type ExamStatus = '待关注' | '待报名' | '报名完成' | '笔试结束' | '面试结束' | '放弃';
type ExamType = '国考' | '陕西省考' | '选调生' | '事业单位联考' | '陕西单招';

interface ExamJob {
  id: string;
  department: string;
  examType: ExamType;
  recruitDate: string;
  headcount: number;
  ratio: string;
  title: string;
  requirements: string;
  status: ExamStatus;
  scoreRef: string;
  link: string;
  remark: string;
  highlighted: boolean;
  createDate: string;
}

const EXAM_STATUSES: ExamStatus[] = ['待关注', '待报名', '报名完成', '笔试结束', '面试结束', '放弃'];
const EXAM_TYPES: ExamType[] = ['国考', '陕西省考', '选调生', '事业单位联考', '陕西单招'];

// 默认列宽
const DEFAULT_COL_WIDTHS: Record<string, number> = {
  seq: 48, department: 140, examType: 100, recruitDate: 110, headcount: 68,
  ratio: 72, title: 150, requirements: 220, status: 90, scoreRef: 100,
  link: 100, remark: 130, highlight: 48, actions: 66,
};

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// 旧数据迁移
function migrateJob(old: any): ExamJob {
  return {
    id: old.id || generateId(),
    department: old.department || '',
    examType: (EXAM_TYPES.includes(old.examType) ? old.examType : '国考') as ExamType,
    recruitDate: old.recruitDate || '',
    headcount: typeof old.headcount === 'number' ? old.headcount : (old.quota || 0),
    ratio: old.ratio || '',
    title: old.title || '',
    requirements: old.requirements || '',
    status: (EXAM_STATUSES.includes(old.status) ? old.status : mapOldExamStatus(old.status)) as ExamStatus,
    scoreRef: old.scoreRef || '',
    link: old.link || '',
    remark: old.remark || old.notes || '',
    highlighted: !!old.highlighted,
    createDate: old.createDate || old.updateDate || new Date().toISOString().slice(0, 10),
  };
}

function mapOldExamStatus(old: string): ExamStatus {
  const m: Record<string, ExamStatus> = {
    '关注': '待关注', '已报名': '报名完成', '已考试': '笔试结束', '已上岸': '面试结束',
  };
  return m[old] || '待关注';
}

export default function ExamPage() {
  // === 岗位管理 ===
  const [rawJobs, setRawJobs] = useLocalStorage<any[]>('exam_jobs', []);
  const jobs: ExamJob[] = useMemo(() => rawJobs.map(migrateJob), [rawJobs]);
  const setJobs = (updater: ExamJob[] | ((prev: ExamJob[]) => ExamJob[])) => {
    if (typeof updater === 'function') {
      setRawJobs((prev: any[]) => updater(prev.map(migrateJob)) as any);
    } else {
      setRawJobs(updater as any);
    }
  };

  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<ExamJob | null>(null);

  // 筛选
  const [filterTypes, setFilterTypes] = useState<ExamType[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<ExamStatus[]>([]);
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterHighlighted, setFilterHighlighted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // 列宽
  const [colWidths, setColWidths] = useLocalStorage<Record<string, number>>('exam_table_col_widths', DEFAULT_COL_WIDTHS);

  // 表单
  const emptyForm = {
    department: '', examType: '国考' as ExamType, recruitDate: '', headcount: 0,
    ratio: '', title: '', requirements: '', status: '待关注' as ExamStatus,
    scoreRef: '', link: '', remark: '',
  };
  const [form, setForm] = useState(emptyForm);

  // 统计
  const stats = useMemo(() => ({
    watching: jobs.filter(j => j.status === '待关注').length,
    registered: jobs.filter(j => ['待报名', '报名完成'].includes(j.status)).length,
    finished: jobs.filter(j => ['笔试结束', '面试结束'].includes(j.status)).length,
    abandoned: jobs.filter(j => j.status === '放弃').length,
  }), [jobs]);

  // 筛选
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (filterTypes.length > 0 && !filterTypes.includes(j.examType)) return false;
      if (filterStatuses.length > 0 && !filterStatuses.includes(j.status)) return false;
      if (filterHighlighted && !j.highlighted) return false;
      if (filterYear && j.recruitDate) {
        if (!j.recruitDate.startsWith(filterYear)) return false;
        if (filterMonth) {
          const m = j.recruitDate.slice(5, 7);
          if (m !== filterMonth.padStart(2, '0')) return false;
        }
      }
      if (filterKeyword) {
        const kw = filterKeyword.toLowerCase();
        const haystack = `${j.department} ${j.title} ${j.requirements} ${j.remark}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [jobs, filterTypes, filterStatuses, filterYear, filterMonth, filterKeyword, filterHighlighted]);

  const openModal = (job?: ExamJob) => {
    if (job) {
      setEditingJob(job);
      setForm({ department: job.department, examType: job.examType, recruitDate: job.recruitDate, headcount: job.headcount, ratio: job.ratio, title: job.title, requirements: job.requirements, status: job.status, scoreRef: job.scoreRef, link: job.link, remark: job.remark });
    } else {
      setEditingJob(null);
      setForm({ ...emptyForm });
    }
    setShowModal(true);
  };

  const saveJob = () => {
    if (!form.department || !form.title) return;
    const data: ExamJob = {
      id: editingJob?.id || generateId(),
      ...form,
      highlighted: editingJob?.highlighted || false,
      createDate: editingJob?.createDate || new Date().toISOString().slice(0, 10),
    };
    if (editingJob) setJobs((prev: ExamJob[]) => prev.map(j => j.id === editingJob.id ? data : j));
    else setJobs((prev: ExamJob[]) => [data, ...prev]);
    setShowModal(false);
  };

  const deleteJob = (id: string) => { if (window.confirm('确认删除？')) setJobs((prev: ExamJob[]) => prev.filter(j => j.id !== id)); };
  const cloneJob = (job: ExamJob) => {
    setJobs((prev: ExamJob[]) => [{ ...job, id: generateId(), title: job.title + ' (副本)', status: '待关注' as ExamStatus, highlighted: false, createDate: new Date().toISOString().slice(0, 10) }, ...prev]);
  };
  const toggleHighlight = (id: string) => {
    setJobs((prev: ExamJob[]) => prev.map(j => j.id === id ? { ...j, highlighted: !j.highlighted } : j));
  };

  const getStatusColor = (s: ExamStatus) => {
    const map: Record<ExamStatus, string> = { '待关注': '#E8E0F0', '待报名': '#D4E8F0', '报名完成': '#C5EAD9', '笔试结束': '#FFF5E1', '面试结束': '#FADADD', '放弃': '#F0E6F6' };
    return map[s] || '#eee';
  };

  const resizeCol = (col: string, delta: number) => {
    setColWidths((prev: Record<string, number>) => ({ ...prev, [col]: Math.max(50, (prev[col] || 80) + delta) }));
  };

  // Excel 导出
  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const headers = ['序号', '招录单位', '招考类型', '往年公告时间', '招录人数', '报录比', '岗位名称', '招录条件', '报名状态', '进面分数参考', '公告链接', '备注', '是否高亮'];
    const rows = filteredJobs.map((j, i) => [
      i + 1, j.department, j.examType, j.recruitDate, j.headcount || '', j.ratio,
      j.title, j.requirements, j.status, j.scoreRef, j.link, j.remark,
      j.highlighted ? '是' : '否',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((_, i) => ({ wch: [5, 18, 12, 14, 8, 8, 20, 40, 10, 14, 30, 20, 8][i] }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '考公岗位');
    XLSX.writeFile(wb, `考公岗位_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        if (data.length < 2) { alert('文件为空或格式不正确'); return; }
        const imported: ExamJob[] = [];
        for (let r = 1; r < data.length; r++) {
          const row = data[r];
          if (!row || !row[1]) continue;
          imported.push({
            id: generateId(),
            department: String(row[1] || ''),
            examType: (EXAM_TYPES.includes(row[2]) ? row[2] : '国考') as ExamType,
            recruitDate: String(row[3] || ''),
            headcount: parseInt(row[4]) || 0,
            ratio: String(row[5] || ''),
            title: String(row[6] || ''),
            requirements: String(row[7] || ''),
            status: (EXAM_STATUSES.includes(row[8]) ? row[8] : '待关注') as ExamStatus,
            scoreRef: String(row[9] || ''),
            link: String(row[10] || ''),
            remark: String(row[11] || ''),
            highlighted: row[12] === '是' || row[12] === true,
            createDate: new Date().toISOString().slice(0, 10),
          });
        }
        if (imported.length > 0) { setJobs((prev: ExamJob[]) => [...imported, ...prev]); alert(`成功导入 ${imported.length} 个岗位`); }
      } catch { alert('文件解析失败，请检查格式'); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const headers = ['序号', '招录单位', '招考类型', '往年公告时间', '招录人数', '报录比', '岗位名称', '招录条件', '报名状态', '进面分数参考', '公告链接', '备注', '是否高亮'];
    const example = [1, '国家税务总局', '国考', '2025-10-15', 3, '1:200', '一级行政执法员', '本科及以上\n专业不限\n党员优先', '待关注', '125', 'https://example.com', '重点目标', '否'];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map((_, i) => ({ wch: [5, 18, 12, 14, 8, 8, 20, 40, 10, 14, 30, 20, 8][i] }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '考公岗位');
    XLSX.writeFile(wb, '考公岗位_导入模板.xlsx');
  };

  const columns = [
    { key: 'seq', label: '#', width: colWidths.seq, frozen: true },
    { key: 'department', label: '招录单位', width: colWidths.department, frozen: true },
    { key: 'examType', label: '招考类型', width: colWidths.examType },
    { key: 'recruitDate', label: '往年公告时间', width: colWidths.recruitDate },
    { key: 'headcount', label: '招录人数', width: colWidths.headcount },
    { key: 'ratio', label: '报录比', width: colWidths.ratio },
    { key: 'title', label: '岗位名称', width: colWidths.title },
    { key: 'requirements', label: '招录条件', width: colWidths.requirements },
    { key: 'status', label: '报名状态', width: colWidths.status },
    { key: 'scoreRef', label: '进面分数', width: colWidths.scoreRef },
    { key: 'link', label: '公告链接', width: colWidths.link },
    { key: 'remark', label: '备注', width: colWidths.remark },
    { key: 'highlight', label: '⭐', width: colWidths.highlight },
    { key: 'actions', label: '操作', width: colWidths.actions },
  ];

  return (
    <div className="page exam-page">
      <div className="page-header" style={{ background: 'var(--theme-exam-bg)' }}>
        <h1 className="page-title">📋 考公备考</h1>
        <p className="page-subtitle">岗位追踪 · 秋招备战</p>
      </div>

      <div className="page-body">
        {/* 统计卡片 */}
        <div className="exam-stats">
          <div className="exam-stat-card" style={{ background: 'linear-gradient(135deg, #C3AED6, #A085C0)' }}>
            <span className="exam-stat-num">{stats.watching + stats.registered + stats.finished}</span>
            <span className="exam-stat-label">追踪岗位</span>
          </div>
          <div className="exam-stat-card" style={{ background: 'linear-gradient(135deg, #D4C1EC, #B8A0D0)' }}>
            <span className="exam-stat-num">{stats.registered}</span>
            <span className="exam-stat-label">报名中</span>
          </div>
          <div className="exam-stat-card" style={{ background: 'linear-gradient(135deg, #E8D5E0, #D4C1EC)' }}>
            <span className="exam-stat-num">{stats.finished}</span>
            <span className="exam-stat-label">已完成</span>
          </div>
        </div>

        {/* 操作栏 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')}>📋 卡片</button>
            <button className={`view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>📊 表格</button>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={exportExcel}>📥 导出</button>
          <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer' }}>
            📤 导入
            <input type="file" accept=".xlsx,.xls" onChange={importExcel} style={{ display: 'none' }} />
          </label>
              <button className="btn btn-sm btn-ghost" onClick={downloadTemplate}>📋 模板</button>
              <button className="btn btn-sm" style={{ background: 'var(--theme-exam-primary)', color: '#fff' }} onClick={() => openModal()}>+ 新增岗位</button>
            </div>

            {/* 投递概览 */}
            <div className="exam-quick-stats">
              <div className="exam-quick-stat" onClick={() => { setFilterStatuses(filterStatuses.includes('待关注') ? filterStatuses.filter(s => s !== '待关注') : [...filterStatuses, '待关注']); }}>
                <span className="eqs-num">{stats.watching}</span><span className="eqs-label">待关注</span>
              </div>
              <div className="exam-quick-stat" onClick={() => {
                const reg: ExamStatus[] = ['待报名', '报名完成'];
                const hasAll = reg.every(s => filterStatuses.includes(s));
                if (hasAll) setFilterStatuses(filterStatuses.filter(s => !reg.includes(s)));
                else setFilterStatuses([...filterStatuses.filter(s => !reg.includes(s)), ...reg]);
              }}>
                <span className="eqs-num">{stats.registered}</span><span className="eqs-label">报名中</span>
              </div>
              <div className="exam-quick-stat" onClick={() => {
                const fin: ExamStatus[] = ['笔试结束', '面试结束'];
                const hasAll = fin.every(s => filterStatuses.includes(s));
                if (hasAll) setFilterStatuses(filterStatuses.filter(s => !fin.includes(s)));
                else setFilterStatuses([...filterStatuses.filter(s => !fin.includes(s)), ...fin]);
              }}>
                <span className="eqs-num">{stats.finished}</span><span className="eqs-label">已完成</span>
              </div>
              <div className="exam-quick-stat" onClick={() => { setFilterStatuses(filterStatuses.includes('放弃') ? filterStatuses.filter(s => s !== '放弃') : [...filterStatuses, '放弃']); }}>
                <span className="eqs-num">{stats.abandoned}</span><span className="eqs-label">放弃</span>
              </div>
            </div>

            {/* 筛选栏 */}
            <div className="jobs-filters card">
              <div className="filter-top-row">
                <div className="filter-search">
                  <input className="input" placeholder="🔍 搜索单位、岗位、招录条件..." value={filterKeyword} onChange={e => setFilterKeyword(e.target.value)} />
                </div>
                <button className="btn btn-sm btn-ghost" onClick={() => setShowFilters(!showFilters)}>{showFilters ? '收起筛选 ▲' : '展开筛选 ▼'}</button>
                <label className="filter-check"><input type="checkbox" checked={filterHighlighted} onChange={e => setFilterHighlighted(e.target.checked)} /><span>仅显示高亮</span></label>
              </div>
              {showFilters && (
                <div className="filter-advanced">
                  <div className="filter-group">
                    <span className="filter-label">招考类型</span>
                    <div className="filter-chips">
                      {EXAM_TYPES.map(t => (
                        <button key={t} className={`chip ${filterTypes.includes(t) ? 'active' : ''}`}
                          onClick={() => setFilterTypes(filterTypes.includes(t) ? filterTypes.filter(x => x !== t) : [...filterTypes, t])}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="filter-group">
                    <span className="filter-label">报名状态</span>
                    <div className="filter-chips">
                      {EXAM_STATUSES.map(s => (
                        <button key={s} className={`chip ${filterStatuses.includes(s) ? 'active' : ''}`}
                          style={filterStatuses.includes(s) ? { background: getStatusColor(s), borderColor: 'transparent' } : {}}
                          onClick={() => setFilterStatuses(filterStatuses.includes(s) ? filterStatuses.filter(x => x !== s) : [...filterStatuses, s])}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="filter-group">
                    <span className="filter-label">往年公告时间</span>
                    <div className="filter-date-row">
                      <select className="input" value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ width: 100 }}>
                        <option value="">全部年份</option>
                        {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={String(y)}>{y}年</option>)}
                      </select>
                      <select className="input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: 80 }} disabled={!filterYear}>
                        <option value="">全部月份</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={String(m)}>{m}月</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="filter-bar-bottom">
                    <span className="filter-count">{filteredJobs.length} 个岗位</span>
                    {(filterTypes.length > 0 || filterStatuses.length > 0 || filterYear || filterKeyword || filterHighlighted) && (
                      <button className="btn btn-sm btn-ghost" onClick={() => { setFilterTypes([]); setFilterStatuses([]); setFilterYear(''); setFilterMonth(''); setFilterKeyword(''); setFilterHighlighted(false); }}>清除全部筛选</button>
                    )}
                  </div>
                </div>
              )}
              {!showFilters && (
                <div className="filter-bar-bottom">
                  <span className="filter-count">{filteredJobs.length} 个岗位</span>
                  {(filterTypes.length > 0 || filterStatuses.length > 0 || filterYear || filterKeyword || filterHighlighted) && (
                    <button className="btn btn-sm btn-ghost" onClick={() => { setFilterTypes([]); setFilterStatuses([]); setFilterYear(''); setFilterMonth(''); setFilterKeyword(''); setFilterHighlighted(false); }}>清除全部筛选</button>
                  )}
                </div>
              )}
            </div>

            {/* 内容区 */}
            {filteredJobs.length === 0 ? (
              <div className="empty-state"><div className="icon">🏛️</div><p>{jobs.length === 0 ? '还没有添加岗位' : '没有匹配的岗位'}</p><p>{jobs.length === 0 ? '点击"新增岗位"开始追踪' : '试试调整筛选条件'}</p></div>
            ) : viewMode === 'table' ? (
              <div className="jobs-table-wrapper">
                <table className="jobs-table">
                  <thead>
                    <tr>
                      {columns.map(col => (
                        <th key={col.key} className={`jobs-th ${col.frozen ? 'frozen' : ''}`}
                          style={{ width: col.width, minWidth: col.width, ...(col.frozen && col.key === 'department' ? { left: colWidths.seq } : {}), ...(col.frozen && col.key === 'seq' ? { left: 0 } : {}) }}>
                          {col.label}
                          <div className="col-resizer" onMouseDown={(e) => {
                            e.preventDefault(); const startX = e.clientX;
                            const onMove = (ev: MouseEvent) => resizeCol(col.key, ev.clientX - startX);
                            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
                          }} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job, idx) => (
                      <tr key={job.id} className={`jobs-tr ${job.highlighted ? 'highlighted' : ''}`}>
                        <td className="jobs-td frozen frozen-seq" style={{ left: 0 }}>{idx + 1}</td>
                        <td className="jobs-td frozen frozen-company" style={{ left: colWidths.seq, fontWeight: 600 }}>{job.department}</td>
                        <td className="jobs-td"><span className="tag tag-nature">{job.examType}</span></td>
                        <td className="jobs-td">{job.recruitDate || '--'}</td>
                        <td className="jobs-td" style={{ textAlign: 'center' }}>{job.headcount || '--'}</td>
                        <td className="jobs-td" style={{ textAlign: 'center' }}>{job.ratio || '--'}</td>
                        <td className="jobs-td">{job.title}</td>
                        <td className="jobs-td jobs-td-long" title={job.requirements}>{job.requirements || '--'}</td>
                        <td className="jobs-td"><span className="tag" style={{ background: getStatusColor(job.status), fontWeight: 600, fontSize: 11 }}>{job.status}</span></td>
                        <td className="jobs-td">{job.scoreRef || '--'}</td>
                        <td className="jobs-td jobs-td-long">{job.link ? <a href={job.link} target="_blank" rel="noopener noreferrer" className="jobs-link" onClick={e => e.stopPropagation()}>🔗</a> : '--'}</td>
                        <td className="jobs-td jobs-td-long" title={job.remark}>{job.remark || '--'}</td>
                        <td className="jobs-td" style={{ textAlign: 'center', cursor: 'pointer', fontSize: 16 }} onClick={() => toggleHighlight(job.id)}>{job.highlighted ? '⭐' : '☆'}</td>
                        <td className="jobs-td jobs-td-actions">
                          <button className="btn-action" onClick={() => openModal(job)} title="编辑">✏️</button>
                          <button className="btn-action" onClick={() => cloneJob(job)} title="克隆">📋</button>
                          <button className="btn-action btn-action-del" onClick={() => deleteJob(job.id)} title="删除">🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="jobs-list">
                {filteredJobs.map(job => (
                  <div key={job.id} className={`job-card card ${job.highlighted ? 'highlighted' : ''}`}>
                    <div className="job-card-main">
                      <div className="job-card-left">
                        <div className="job-card-header">
                          <h3 className="job-card-company">{job.highlighted && '⭐ '}{job.department}</h3>
                          <span className="tag" style={{ background: getStatusColor(job.status), fontWeight: 600 }}>{job.status}</span>
                        </div>
                        <p className="job-card-title">{job.title}</p>
                        <div className="job-card-meta">
                          <span className="tag tag-nature">{job.examType}</span>
                          {job.recruitDate && <span className="tag" style={{ background: '#E8E4EC', color: '#9B8E9A' }}>🗓 {job.recruitDate}</span>}
                          {job.headcount > 0 && <span className="tag" style={{ background: '#E8E4EC', color: '#9B8E9A' }}>👥 {job.headcount}人</span>}
                          {job.ratio && <span className="tag" style={{ background: '#E8E4EC', color: '#9B8E9A' }}>📊 {job.ratio}</span>}
                          {job.scoreRef && <span className="tag" style={{ background: '#E8E4EC', color: '#9B8E9A' }}>🎯 {job.scoreRef}分</span>}
                          {job.requirements && <span className="tag" style={{ background: '#F5EEF0', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.requirements}>📝 {job.requirements.slice(0, 40)}...</span>}
                        </div>
                      </div>
                      <div className="job-card-right">
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 6px' }} onClick={(e) => { e.stopPropagation(); openModal(job); }}>✏️ 编辑</button>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 6px' }} onClick={(e) => { e.stopPropagation(); cloneJob(job); }}>📋 克隆</button>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 6px' }} onClick={(e) => { e.stopPropagation(); toggleHighlight(job.id); }}>{job.highlighted ? '⭐ 取消' : '☆ 标记'}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>

      {/* ===== 岗位弹窗 ===== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 className="modal-title">{editingJob ? '编辑岗位' : '新增岗位'}</h2>
            <div className="form-group"><label className="form-label">招录单位 *</label><input className="input" placeholder="如：国家税务总局" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">岗位名称 *</label><input className="input" placeholder="如：一级行政执法员" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">招考类型</label>
                <select className="input" value={form.examType} onChange={e => setForm({ ...form, examType: e.target.value as ExamType })}>
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">招录人数</label>
                <input className="input" type="number" min="0" placeholder="0" value={form.headcount || ''} onChange={e => setForm({ ...form, headcount: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">往年公告时间</label>
                <input className="input" type="date" value={form.recruitDate} onChange={e => setForm({ ...form, recruitDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">报录比</label>
                <input className="input" placeholder="如：1:200" value={form.ratio} onChange={e => setForm({ ...form, ratio: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">报名状态</label>
                <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ExamStatus })}>
                  {EXAM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">进面分数参考</label>
                <input className="input" placeholder="如：125" value={form.scoreRef} onChange={e => setForm({ ...form, scoreRef: e.target.value })} />
              </div>
            </div>
            <div className="form-group"><label className="form-label">招录条件</label><textarea className="input" rows={4} placeholder="粘贴或手动输入招录条件，支持多行自由文本..." value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">公告链接</label><input className="input" placeholder="https://..." value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">备注</label><input className="input" placeholder="自定义备注..." value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} /></div>
            <button className="btn btn-lg" style={{ width: '100%', marginTop: 8, background: 'var(--theme-exam-primary)', color: '#fff' }} onClick={saveJob}>{editingJob ? '保存修改' : '添加岗位'}</button>
            {editingJob && <button className="btn btn-ghost btn-lg" style={{ width: '100%', marginTop: 8, color: 'var(--macaron-rose)' }} onClick={() => { deleteJob(editingJob.id); setShowModal(false); }}>删除该岗位</button>}
          </div>
        </div>
      )}
    </div>
  );
}
