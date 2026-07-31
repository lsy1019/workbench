import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import FileUpload, { type UploadedFile } from '../components/FileUpload';
import './JobsPage.css';

// ===== 类型定义 =====
type JobStatus = '待投递' | '已投递' | '笔试阶段' | '面试阶段' | 'Offer' | '放弃';
type JobNature = '央企' | '省属国企' | '市属国企' | '事业单位' | '公务员' | '外资' | '民营';

interface JobRecord {
  id: string;
  company: string;
  nature: JobNature;
  recruitDate: string;
  headcount: number;
  title: string;
  requirements: string;
  status: JobStatus;
  link: string;
  remark: string;
  highlighted: boolean;
  // 保留旧字段兼容
  attachments: UploadedFile[];
  createDate: string;
  applyDate: string;
}

const JOB_STATUSES: JobStatus[] = ['待投递', '已投递', '笔试阶段', '面试阶段', 'Offer', '放弃'];
const JOB_NATURES: JobNature[] = ['央企', '省属国企', '市属国企', '事业单位', '公务员', '外资', '民营'];

// 默认列宽
const DEFAULT_COL_WIDTHS: Record<string, number> = {
  seq: 52,
  company: 140,
  nature: 90,
  recruitDate: 110,
  headcount: 72,
  title: 150,
  requirements: 220,
  status: 90,
  link: 130,
  remark: 140,
  highlight: 52,
  actions: 70,
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// 旧数据迁移
function migrateJob(old: any): JobRecord {
  return {
    id: old.id || generateId(),
    company: old.company || '',
    nature: (JOB_NATURES.includes(old.nature) ? old.nature : '民营') as JobNature,
    recruitDate: old.recruitDate || old.recruitWindow || '',
    headcount: typeof old.headcount === 'number' ? old.headcount : 0,
    title: old.title || '',
    requirements: old.requirements || old.jd || '',
    status: (JOB_STATUSES.includes(old.status) ? old.status : mapOldStatus(old.status)) as JobStatus,
    link: old.link || '',
    remark: old.remark || '',
    highlighted: !!old.highlighted,
    attachments: old.attachments || [],
    createDate: old.createDate || new Date().toISOString().slice(0, 10),
    applyDate: old.applyDate || '',
  };
}

function mapOldStatus(old: string): JobStatus {
  const m: Record<string, JobStatus> = {
    '观望': '待投递', '准备简历': '待投递', '已投递': '已投递',
    '一面': '面试阶段', '二面': '面试阶段', '三面': '面试阶段',
    '等待结果': '面试阶段', '已获offer': 'Offer', '已拒绝': '放弃',
  };
  return m[old] || '待投递';
}

export default function JobsPage() {
  const [rawJobs, setRawJobs] = useLocalStorage<any[]>('jobs_list_v2', []);
  // 数据迁移
  const jobs: JobRecord[] = useMemo(() => rawJobs.map(migrateJob), [rawJobs]);
  const setJobs = (updater: JobRecord[] | ((prev: JobRecord[]) => JobRecord[])) => {
    if (typeof updater === 'function') {
      setRawJobs((prev: any[]) => updater(prev.map(migrateJob)) as any);
    } else {
      setRawJobs(updater as any);
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobRecord | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [detailItem, setDetailItem] = useState<JobRecord | null>(null);

  // 筛选状态
  const [filterNatures, setFilterNatures] = useState<JobNature[]>([]);
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatuses, setFilterStatuses] = useState<JobStatus[]>([]);
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterHighlighted, setFilterHighlighted] = useState(false);

  // 列宽
  const [colWidths, setColWidths] = useLocalStorage<Record<string, number>>('jobs_table_col_widths', DEFAULT_COL_WIDTHS);

  // 表单
  const emptyForm = {
    company: '', nature: '民营' as JobNature, recruitDate: '', headcount: 0,
    title: '', requirements: '', status: '待投递' as JobStatus,
    link: '', remark: '', applyDate: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [formAttachments, setFormAttachments] = useState<UploadedFile[]>([]);

  // 统计
  const stats = useMemo(() => ({
    watching: jobs.filter(j => j.status === '待投递').length,
    applied: jobs.filter(j => j.status === '已投递').length,
    interviewing: jobs.filter(j => ['笔试阶段', '面试阶段'].includes(j.status)).length,
    offer: jobs.filter(j => j.status === 'Offer').length,
  }), [jobs]);

  // 筛选
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (filterNatures.length > 0 && !filterNatures.includes(j.nature)) return false;
      if (filterStatuses.length > 0 && !filterStatuses.includes(j.status)) return false;
      if (filterHighlighted && !j.highlighted) return false;
      // 年月筛选
      if (filterYear && j.recruitDate) {
        if (!j.recruitDate.startsWith(filterYear)) return false;
        if (filterMonth) {
          const m = j.recruitDate.slice(5, 7);
          if (m !== filterMonth.padStart(2, '0')) return false;
        }
      }
      // 关键词
      if (filterKeyword) {
        const kw = filterKeyword.toLowerCase();
        const haystack = `${j.company} ${j.title} ${j.requirements} ${j.remark}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [jobs, filterNatures, filterYear, filterMonth, filterStatuses, filterKeyword, filterHighlighted]);

  // 筛选面板展开/收起
  const [showFilters, setShowFilters] = useState(false);

  const openModal = (job?: JobRecord) => {
    if (job) {
      setEditingJob(job);
      setForm({
        company: job.company, nature: job.nature, recruitDate: job.recruitDate,
        headcount: job.headcount, title: job.title, requirements: job.requirements,
        status: job.status, link: job.link, remark: job.remark, applyDate: job.applyDate,
      });
      setFormAttachments(job.attachments || []);
    } else {
      setEditingJob(null);
      setForm({ ...emptyForm });
      setFormAttachments([]);
    }
    setShowModal(true);
  };

  const saveJob = () => {
    if (!form.company || !form.title) return;
    const data: JobRecord = {
      id: editingJob?.id || generateId(),
      ...form,
      attachments: formAttachments,
      highlighted: editingJob?.highlighted || false,
      createDate: editingJob?.createDate || new Date().toISOString().slice(0, 10),
    };
    if (editingJob) setJobs((prev: JobRecord[]) => prev.map(j => j.id === editingJob.id ? data : j));
    else setJobs((prev: JobRecord[]) => [data, ...prev]);
    setShowModal(false);
  };

  const deleteJob = (id: string) => {
    if (window.confirm('确认删除该岗位？')) setJobs((prev: JobRecord[]) => prev.filter(j => j.id !== id));
  };

  const cloneJob = (job: JobRecord) => {
    const cloned: JobRecord = {
      ...job, id: generateId(), title: job.title + ' (副本)',
      status: '待投递' as JobStatus, highlighted: false,
      applyDate: '', createDate: new Date().toISOString().slice(0, 10),
    };
    setJobs((prev: JobRecord[]) => [cloned, ...prev]);
  };

  const toggleHighlight = (id: string) => {
    setJobs((prev: JobRecord[]) => prev.map(j => j.id === id ? { ...j, highlighted: !j.highlighted } : j));
  };

  const getStatusColor = (s: JobStatus) => {
    const map: Record<JobStatus, string> = {
      '待投递': '#D6EAF8', '已投递': '#C5EAD9', '笔试阶段': '#FFF5E1',
      '面试阶段': '#FDE4CF', 'Offer': '#FADADD', '放弃': '#F0E6F6',
    };
    return map[s] || '#eee';
  };

  // ===== Excel 导出 =====
  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const headers = ['序号', '公司名称', '单位性质', '往年公告时间', '招聘人数', '岗位名称', '报考条件', '投递状态', '公告链接', '备注', '是否高亮'];
    const rows = filteredJobs.map((j, i) => [
      i + 1, j.company, j.nature, j.recruitDate, j.headcount || '',
      j.title, j.requirements, j.status, j.link, j.remark,
      j.highlighted ? '是' : '否',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // 列宽
    ws['!cols'] = headers.map((_, i) => ({ wch: [5, 18, 10, 14, 8, 20, 40, 10, 30, 20, 8][i] }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '岗位信息');
    XLSX.writeFile(wb, `岗位信息库_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ===== Excel 导入 =====
  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        if (data.length < 2) { alert('文件为空或格式不正确'); return; }
        const imported: JobRecord[] = [];
        for (let r = 1; r < data.length; r++) {
          const row = data[r];
          if (!row || !row[1]) continue; // 公司名称为空跳过
          imported.push({
            id: generateId(),
            company: String(row[1] || ''),
            nature: (JOB_NATURES.includes(row[2]) ? row[2] : '民营') as JobNature,
            recruitDate: String(row[3] || ''),
            headcount: parseInt(row[4]) || 0,
            title: String(row[5] || ''),
            requirements: String(row[6] || ''),
            status: (JOB_STATUSES.includes(row[7]) ? row[7] : '待投递') as JobStatus,
            link: String(row[8] || ''),
            remark: String(row[9] || ''),
            highlighted: row[10] === '是' || row[10] === true,
            attachments: [],
            createDate: new Date().toISOString().slice(0, 10),
            applyDate: '',
          });
        }
        if (imported.length > 0) {
          setJobs((prev: JobRecord[]) => [...imported, ...prev]);
          alert(`成功导入 ${imported.length} 个岗位`);
        }
      } catch (err) {
        alert('文件解析失败，请检查格式');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // 下载模板
  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const headers = ['序号', '公司名称', '单位性质', '往年公告时间', '招聘人数', '岗位名称', '报考条件', '投递状态', '公告链接', '备注', '是否高亮'];
    const example = [1, '示例公司', '央企', '2025-09-15', 50, '管培生', '硕士及以上\n专业不限\n党员优先', '待投递', 'https://example.com', '重点目标', '否'];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map((_, i) => ({ wch: [5, 18, 10, 14, 8, 20, 40, 10, 30, 20, 8][i] }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '岗位信息');
    XLSX.writeFile(wb, '岗位信息库_导入模板.xlsx');
  };

  // ===== 列宽拖拽 =====
  const resizeCol = useCallback((col: string, delta: number) => {
    setColWidths((prev: Record<string, number>) => ({
      ...prev,
      [col]: Math.max(50, (prev[col] || 80) + delta),
    }));
  }, [setColWidths]);

  // ===== 表格列定义 =====
  const columns = [
    { key: 'seq', label: '#', width: colWidths.seq, frozen: true },
    { key: 'company', label: '公司名称', width: colWidths.company, frozen: true },
    { key: 'nature', label: '单位性质', width: colWidths.nature },
    { key: 'recruitDate', label: '往年公告时间', width: colWidths.recruitDate },
    { key: 'headcount', label: '招聘人数', width: colWidths.headcount },
    { key: 'title', label: '岗位名称', width: colWidths.title },
    { key: 'requirements', label: '报考条件', width: colWidths.requirements },
    { key: 'status', label: '投递状态', width: colWidths.status },
    { key: 'link', label: '公告链接', width: colWidths.link },
    { key: 'remark', label: '备注', width: colWidths.remark },
    { key: 'highlight', label: '⭐', width: colWidths.highlight },
    { key: 'actions', label: '操作', width: colWidths.actions },
  ];

  return (
    <div className="page jobs-page">
      <div className="page-header" style={{ background: 'var(--theme-job-bg)' }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">🎯 岗位信息库</h1>
            <p className="page-subtitle">投递追踪 · 秋招备战</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="view-toggle">
              <button className={`view-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')}>📋 卡片</button>
              <button className={`view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>📊 表格</button>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={exportExcel} title="导出当前筛选结果为 Excel">📥 导出</button>
            <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer' }}>
              📤 导入
              <input type="file" accept=".xlsx,.xls" onChange={importExcel} style={{ display: 'none' }} />
            </label>
            <button className="btn btn-sm btn-ghost" onClick={downloadTemplate}>📋 模板</button>
            <button className="btn btn-sm" style={{ background: 'var(--theme-job-primary)', color: 'var(--text-primary)' }} onClick={() => openModal()}>+ 新增岗位</button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* 统计卡片 */}
        <h2 className="section-title">📊 投递概览</h2>
        <div className="jobs-stats">
          <div className="jobs-stat-card clickable" style={{ background: 'linear-gradient(135deg, #D6EAF8, #C5DFF0)' }}
            onClick={() => { setFilterStatuses(filterStatuses.includes('待投递') ? filterStatuses.filter(s => s !== '待投递') : [...filterStatuses, '待投递']); setViewMode(viewMode); }}>
            <span className="jobs-stat-num">{stats.watching}</span><span className="jobs-stat-label">待投递</span>
          </div>
          <div className="jobs-stat-card clickable" style={{ background: 'linear-gradient(135deg, #C5EAD9, #B0DDC8)' }}
            onClick={() => { setFilterStatuses(filterStatuses.includes('已投递') ? filterStatuses.filter(s => s !== '已投递') : [...filterStatuses, '已投递']); }}>
            <span className="jobs-stat-num">{stats.applied}</span><span className="jobs-stat-label">已投递</span>
          </div>
          <div className="jobs-stat-card clickable" style={{ background: 'linear-gradient(135deg, #FFF5E1, #FDE4CF)' }}
            onClick={() => {
              const interviewing: JobStatus[] = ['笔试阶段', '面试阶段'];
              const hasAll = interviewing.every(s => filterStatuses.includes(s));
              if (hasAll) setFilterStatuses(filterStatuses.filter(s => !interviewing.includes(s)));
              else setFilterStatuses([...filterStatuses.filter(s => !interviewing.includes(s)), ...interviewing]);
            }}>
            <span className="jobs-stat-num">{stats.interviewing}</span><span className="jobs-stat-label">笔面试中</span>
          </div>
          <div className="jobs-stat-card clickable" style={{ background: 'linear-gradient(135deg, #FADADD, #F5C0C8)' }}
            onClick={() => { setFilterStatuses(filterStatuses.includes('Offer') ? filterStatuses.filter(s => s !== 'Offer') : [...filterStatuses, 'Offer']); }}>
            <span className="jobs-stat-num">{stats.offer}</span><span className="jobs-stat-label">Offer</span>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="jobs-filters card">
          <div className="filter-top-row">
            <div className="filter-search">
              <input className="input" placeholder="🔍 搜索公司、岗位、报考条件..." value={filterKeyword} onChange={e => setFilterKeyword(e.target.value)} />
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowFilters(!showFilters)}>
              {showFilters ? '收起筛选 ▲' : '展开筛选 ▼'}
            </button>
            <label className="filter-check">
              <input type="checkbox" checked={filterHighlighted} onChange={e => setFilterHighlighted(e.target.checked)} />
              <span>仅显示高亮</span>
            </label>
          </div>

          {showFilters && (
            <div className="filter-advanced">
              {/* 单位性质多选 */}
              <div className="filter-group">
                <span className="filter-label">单位性质</span>
                <div className="filter-chips">
                  {JOB_NATURES.map(n => (
                    <button key={n} className={`chip ${filterNatures.includes(n) ? 'active' : ''}`}
                      onClick={() => setFilterNatures(filterNatures.includes(n) ? filterNatures.filter(x => x !== n) : [...filterNatures, n])}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* 投递状态多选 */}
              <div className="filter-group">
                <span className="filter-label">投递状态</span>
                <div className="filter-chips">
                  {JOB_STATUSES.map(s => (
                    <button key={s} className={`chip ${filterStatuses.includes(s) ? 'active' : ''}`}
                      style={filterStatuses.includes(s) ? { background: getStatusColor(s), borderColor: 'transparent' } : {}}
                      onClick={() => setFilterStatuses(filterStatuses.includes(s) ? filterStatuses.filter(x => x !== s) : [...filterStatuses, s])}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* 往年公告时间筛选 */}
              <div className="filter-group">
                <span className="filter-label">往年公告时间</span>
                <div className="filter-date-row">
                  <select className="input" value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ width: 100 }}>
                    <option value="">全部年份</option>
                    {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={y} value={String(y)}>{y}年</option>
                    ))}
                  </select>
                  <select className="input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: 80 }} disabled={!filterYear}>
                    <option value="">全部月份</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={String(m)}>{m}月</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="filter-bar-bottom">
                <span className="filter-count">{filteredJobs.length} 个岗位</span>
                {(filterNatures.length > 0 || filterYear || filterStatuses.length > 0 || filterKeyword || filterHighlighted) && (
                  <button className="btn btn-sm btn-ghost" onClick={() => {
                    setFilterNatures([]); setFilterYear(''); setFilterMonth('');
                    setFilterStatuses([]); setFilterKeyword(''); setFilterHighlighted(false);
                  }}>清除全部筛选</button>
                )}
              </div>
            </div>
          )}

          {!showFilters && (
            <div className="filter-bar-bottom">
              <span className="filter-count">{filteredJobs.length} 个岗位</span>
              {(filterNatures.length > 0 || filterYear || filterStatuses.length > 0 || filterKeyword || filterHighlighted) && (
                <button className="btn btn-sm btn-ghost" onClick={() => {
                  setFilterNatures([]); setFilterYear(''); setFilterMonth('');
                  setFilterStatuses([]); setFilterKeyword(''); setFilterHighlighted(false);
                }}>清除全部筛选</button>
              )}
            </div>
          )}
        </div>

        {/* 内容区 */}
        {filteredJobs.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🎯</div>
            <p>{jobs.length === 0 ? '还没有添加任何岗位' : '没有匹配的岗位'}</p>
            <p>{jobs.length === 0 ? '点击右上角"新增岗位"开始记录投递进度' : '试试调整筛选条件'}</p>
          </div>
        ) : viewMode === 'table' ? (
          /* ===== 表格视图 ===== */
          <div className="jobs-table-wrapper">
            <table className="jobs-table">
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col.key}
                      className={`jobs-th ${col.frozen ? 'frozen' : ''}`}
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        ...(col.frozen && col.key === 'company' ? { left: colWidths.seq } : {}),
                        ...(col.frozen && col.key === 'seq' ? { left: 0 } : {}),
                      }}>
                      {col.label}
                      <div className="col-resizer"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startW = col.width;
                          const onMove = (ev: MouseEvent) => resizeCol(col.key, ev.clientX - startX);
                          const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                          document.addEventListener('mousemove', onMove);
                          document.addEventListener('mouseup', onUp);
                        }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job, idx) => (
                  <tr key={job.id} className={`jobs-tr ${job.highlighted ? 'highlighted' : ''}`}>
                    <td className="jobs-td frozen frozen-seq" style={{ left: 0 }}>{idx + 1}</td>
                    <td className="jobs-td frozen frozen-company" style={{ left: colWidths.seq, fontWeight: 600 }}>{job.company}</td>
                    <td className="jobs-td"><span className="tag tag-nature">{job.nature}</span></td>
                    <td className="jobs-td">{job.recruitDate || '--'}</td>
                    <td className="jobs-td" style={{ textAlign: 'center' }}>{job.headcount || '--'}</td>
                    <td className="jobs-td">{job.title}</td>
                    <td className="jobs-td jobs-td-long" title={job.requirements}>{job.requirements || '--'}</td>
                    <td className="jobs-td">
                      <span className="tag" style={{ background: getStatusColor(job.status), fontWeight: 600, fontSize: 11 }}>
                        {job.status}
                      </span>
                    </td>
                    <td className="jobs-td jobs-td-long">
                      {job.link ? <a href={job.link} target="_blank" rel="noopener noreferrer" className="jobs-link" onClick={e => e.stopPropagation()}>🔗</a> : '--'}
                    </td>
                    <td className="jobs-td jobs-td-long" title={job.remark}>{job.remark || '--'}</td>
                    <td className="jobs-td" style={{ textAlign: 'center', cursor: 'pointer', fontSize: 16 }}
                      onClick={(e) => { e.stopPropagation(); toggleHighlight(job.id); }}>
                      {job.highlighted ? '⭐' : '☆'}
                    </td>
                    <td className="jobs-td jobs-td-actions">
                      <button className="btn-action" onClick={(e) => { e.stopPropagation(); openModal(job); }} title="编辑">✏️</button>
                      <button className="btn-action" onClick={(e) => { e.stopPropagation(); cloneJob(job); }} title="克隆">📋</button>
                      <button className="btn-action btn-action-del" onClick={(e) => { e.stopPropagation(); deleteJob(job.id); }} title="删除">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ===== 卡片视图 ===== */
          <div className="jobs-list">
            {filteredJobs.map(job => (
              <div key={job.id} className={`job-card card ${job.highlighted ? 'highlighted' : ''}`}>
                <div className="job-card-main">
                  <div className="job-card-left">
                    <div className="job-card-header">
                      <h3 className="job-card-company">
                        {job.highlighted && '⭐ '}{job.company}
                      </h3>
                      <span className="tag" style={{ background: getStatusColor(job.status), fontWeight: 600 }}>
                        {job.status}
                      </span>
                    </div>
                    <p className="job-card-title">{job.title}</p>
                    <div className="job-card-meta">
                      <span className="tag tag-nature">{job.nature}</span>
                      {job.recruitDate && <span className="tag" style={{ background: '#E8E4EC', color: '#9B8E9A' }}>🗓 {job.recruitDate}</span>}
                      {job.headcount > 0 && <span className="tag" style={{ background: '#E8E4EC', color: '#9B8E9A' }}>👥 {job.headcount}人</span>}
                      {job.requirements && <span className="tag" style={{ background: '#F5EEF0', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.requirements}>📝 {job.requirements.slice(0, 40)}...</span>}
                    </div>
                  </div>
                  <div className="job-card-right">
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 6px' }}
                      onClick={(e) => { e.stopPropagation(); openModal(job); }}>✏️ 编辑</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 6px' }}
                      onClick={(e) => { e.stopPropagation(); cloneJob(job); }}>📋 克隆</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 6px' }}
                      onClick={(e) => { e.stopPropagation(); toggleHighlight(job.id); }}>
                      {job.highlighted ? '⭐ 取消' : '☆ 标记'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== 详情弹窗 ===== */}
      {detailItem && (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal-sheet detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>{detailItem.highlighted && '⭐ '}{detailItem.company}</h2>
              <span className="tag" style={{ background: getStatusColor(detailItem.status), fontWeight: 600 }}>
                {detailItem.status}
              </span>
            </div>
            <p className="detail-subtitle">{detailItem.title}</p>

            <div className="detail-section">
              <div className="detail-row"><span className="detail-label">单位性质</span><span className="detail-val">{detailItem.nature}</span></div>
              <div className="detail-row"><span className="detail-label">往年公告时间</span><span className="detail-val">{detailItem.recruitDate || '--'}</span></div>
              <div className="detail-row"><span className="detail-label">招聘人数</span><span className="detail-val">{detailItem.headcount || '--'}</span></div>
              <div className="detail-row"><span className="detail-label">投递状态</span><span className="detail-val">{detailItem.status}</span></div>
              {detailItem.link && <div className="detail-row"><span className="detail-label">公告链接</span><a href={detailItem.link} target="_blank" rel="noopener noreferrer" className="detail-link">🔗 打开</a></div>}
              {detailItem.remark && <div className="detail-row"><span className="detail-label">备注</span><span className="detail-val">{detailItem.remark}</span></div>}
            </div>

            {detailItem.requirements && (
              <div className="detail-section">
                <h4 className="detail-section-title">📝 报考条件</h4>
                <p className="detail-block">{detailItem.requirements}</p>
              </div>
            )}

            {detailItem.attachments && detailItem.attachments.length > 0 && (
              <div className="detail-section">
                <h4 className="detail-section-title">📎 附件 ({detailItem.attachments.length})</h4>
                <div className="detail-attachments">
                  {detailItem.attachments.map(f => (
                    <span key={f.id} className="detail-attachment-link" onClick={() => {
                      const mime = f.type || 'application/octet-stream';
                      const byteChars = atob(f.base64.split(',')[1]);
                      const byteNums = new Array(byteChars.length);
                      for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
                      const url = URL.createObjectURL(new Blob([new Uint8Array(byteNums)], { type: mime }));
                      if (f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.pdf')) {
                        window.open(url, '_blank');
                      } else {
                        const a = document.createElement('a'); a.href = url; a.download = f.name; a.click();
                      }
                    }}>📄 {f.name}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="detail-actions">
              <button className="btn" style={{ background: 'var(--theme-job-accent)', color: '#fff', flex: 1 }} onClick={() => { openModal(detailItem); setDetailItem(null); }}>✏️ 编辑</button>
              <button className="btn" style={{ background: 'var(--macaron-lavender)', color: '#5D4E5C', flex: 1 }} onClick={() => { cloneJob(detailItem); setDetailItem(null); }}>📋 克隆</button>
              <button className="btn btn-ghost" onClick={() => setDetailItem(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 新增/编辑弹窗 ===== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 className="modal-title">{editingJob ? '编辑岗位' : '新增岗位'}</h2>

            <div className="form-group"><label className="form-label">公司名称 *</label><input className="input" placeholder="如：国家电网" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">岗位名称 *</label><input className="input" placeholder="如：风险管理岗" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">单位性质</label>
                <select className="input" value={form.nature} onChange={e => setForm({ ...form, nature: e.target.value as JobNature })}>
                  {JOB_NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">招聘人数</label>
                <input className="input" type="number" min="0" placeholder="0" value={form.headcount || ''} onChange={e => setForm({ ...form, headcount: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">往年公告时间</label>
                <input className="input" type="date" value={form.recruitDate} onChange={e => setForm({ ...form, recruitDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">投递状态</label>
                <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as JobStatus })}>
                  {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">报考条件</label>
              <textarea className="input" rows={4} placeholder="粘贴或手动输入报考条件，支持多行自由文本..." value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} />
            </div>
            <div className="form-group"><label className="form-label">公告链接</label><input className="input" placeholder="https://..." value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">备注</label><input className="input" placeholder="自定义备注..." value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} /></div>
            <div className="form-group">
              <FileUpload files={formAttachments} onChange={setFormAttachments} />
            </div>

            <button className="btn btn-lg" style={{ width: '100%', marginTop: 8, background: 'var(--theme-job-accent)', color: '#fff' }} onClick={saveJob}>
              {editingJob ? '保存修改' : '添加岗位'}
            </button>
            {editingJob && (
              <button className="btn btn-ghost btn-lg" style={{ width: '100%', marginTop: 8, color: 'var(--macaron-rose)' }} onClick={() => { deleteJob(editingJob.id); setShowModal(false); }}>
                删除该岗位
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
