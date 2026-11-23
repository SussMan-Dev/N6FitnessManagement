import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  FileDown,
  FileSpreadsheet,
  Printer,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Check,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  Dumbbell,
  Eye,
  FileText,
  Image,
  FilePlus2,
  Plus,
  RefreshCw,
  Repeat2,
  Search,
  ScanLine,
  Upload,
  Users,
  UserPlus,
  ShieldCheck,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { api, dateInputValue, formatDate, formatMoney, uploadFile, uploadPaymentReceipt } from './api';
import { Pagination, buildQuery, fetchAllPages, paginate, useDebouncedValue, usePagination } from './pagination';
import { playCheckinError, playCheckinSuccess } from './sound';
import { useToast } from './toast';

/**
 * Server-side member lookup for selectors (subscriptions, check-in…). Instead of loading
 * the first 100 members and filtering in the browser, we query the API with the search term
 * so every member is reachable no matter how large the list grows.
 */
function useMemberLookup(search, limit = 50) {
  const debouncedSearch = useDebouncedValue(search, 300);
  const [state, setState] = useState({ items: [], totalCount: 0, loading: true, error: '' });
  useEffect(() => {
    let active = true;
    setState(current => ({ ...current, loading: true }));
    api(`/members${buildQuery({ page: 1, pageSize: limit, search: debouncedSearch })}`)
      .then(result => { if (active) setState({ items: result.items || [], totalCount: result.totalCount || 0, loading: false, error: '' }); })
      .catch(requestError => { if (active) setState(current => ({ ...current, loading: false, error: requestError.message })); });
    return () => { active = false; };
  }, [debouncedSearch, limit]);
  return state;
}

export function Notice({ error, success }) {
  if (!error && !success) return null;
  return (
    <div className={`notice ${error ? 'notice-error' : 'notice-success'}`} role={error ? 'alert' : 'status'}>
      {error ? <AlertCircle size={17} /> : <Check size={17} />}
      <span>{error || success}</span>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

function Modal({ title, description, onClose, children, wide = false }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header"><div><p className="eyebrow">WORKSPACE</p><h2 id="modal-title">{title}</h2>{description && <p className="muted">{description}</p>}</div><button className="icon-button" type="button" onClick={onClose} aria-label="Đóng"><X size={19} /></button></header>
        {children}
      </section>
    </div>
  );
}

function LoadingState({ label = 'Đang tải dữ liệu…' }) {
  return <div className="loading-state"><span className="spinner spinner-dark" />{label}</div>;
}

function SkeletonTable({ columnsCount = 5, rowsCount = 6 }) {
  return (
    <div className="table-scroll">
      <table className="data-table skeleton-table">
        <thead>
          <tr>
            {Array.from({ length: columnsCount }).map((_, i) => (
              <th key={i}><div className="skeleton-bar skeleton-th" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowsCount }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columnsCount }).map((_, c) => (
                <td key={c}>
                  <div
                    className="skeleton-bar"
                    style={{
                      width: c === 0 ? '70%' : c === 1 ? '45%' : c === columnsCount - 1 ? '55%' : '80%',
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ title, description }) {
  return <div className="empty-state"><span className="empty-mark"><FilePlus2 size={20} /></span><strong>{title}</strong><p>{description}</p></div>;
}

function StatusBadge({ value }) {
  const status = String(value || '—');
  const kind = ['Active', 'Paid', 'Confirmed'].includes(status) ? 'positive' :
    ['PendingPayment', 'PendingConfirmation'].includes(status) ? 'pending' : 'muted';
  const labels = {
    Active: 'Đang hoạt động', Inactive: 'Tạm ngừng', Suspended: 'Đang khóa',
    PendingPayment: 'Chờ thanh toán', PendingConfirmation: 'Chờ xác nhận',
    Paid: 'Đã thanh toán', Confirmed: 'Đã xác nhận', Rejected: 'Từ chối',
    Expired: 'Hết hạn', Cancelled: 'Đã hủy', Voided: 'Đã hủy',
  };
  return <span className={`status-badge status-${kind}`}><span />{labels[status] || status}</span>;
}

function TableFrame({ columns, rows, loading, emptyTitle, emptyDescription, rowKey = 'id' }) {
  if (loading) return <SkeletonTable columnsCount={columns.length} rowsCount={6} />;
  if (!rows.length) return <EmptyState title={emptyTitle || 'Chưa có dữ liệu'} description={emptyDescription || 'Thêm bản ghi đầu tiên để bắt đầu.'} />;
  return (
    <div className="table-scroll"><table className="data-table"><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row[rowKey] ?? index}>{columns.map(column => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody>
    </table></div>
  );
}

const resourceConfig = {
  members: {
    title: 'Hội viên', eyebrow: 'MEMBERSHIP', description: 'Hồ sơ hội viên, gói tập đăng ký và thời hạn sử dụng.', path: '/members',
    query: (search, page, pageSize) => buildQuery({ page, pageSize, search }),
    fields: [
      { name: 'firstName', label: 'Họ', required: true },
      { name: 'lastName', label: 'Tên', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Điện thoại', type: 'tel' },
      { name: 'birthDate', label: 'Ngày sinh', type: 'date' },
    ],
    columns: [
      {
        key: 'member',
        label: 'Hội viên',
        render: item => (
          <div className="member-cell">
            <span className="member-avatar-chip">{(item.firstName || 'M').slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{item.firstName} {item.lastName}</strong>
              <small className="table-subline">ID #{item.id} · Tham gia: {formatDate(item.joinedAtUtc)}</small>
            </div>
          </div>
        ),
      },
      {
        key: 'contact',
        label: 'Liên hệ',
        render: item => (
          <div>
            <div>{item.phone ? <strong>{item.phone}</strong> : <span className="muted">Chưa có SĐT</span>}</div>
            <small className="table-subline">{item.email || '—'}</small>
          </div>
        ),
      },
      {
        key: 'plan',
        label: 'Gói tập đang đăng ký',
        render: item => item.currentPlanName ? (
          <div className="member-plan-chip">
            <Dumbbell size={13} className="plan-chip-icon" />
            <strong>{item.currentPlanName}</strong>
          </div>
        ) : (
          <span className="muted">Chưa đăng ký gói</span>
        ),
      },
      {
        key: 'expiry',
        label: 'Hạn dùng & Ngày còn lại',
        render: item => {
          if (!item.currentPlanName) {
            return <span className="muted">—</span>;
          }
          if (item.currentSubscriptionStatus === 'PendingPayment') {
            return <span className="days-badge days-badge-pending">Chờ thanh toán</span>;
          }
          if (item.daysRemaining !== null && item.daysRemaining !== undefined) {
            if (item.daysRemaining > 7) {
              return (
                <div className="expiry-cell">
                  <span className="days-badge days-badge-active">
                    Còn {item.daysRemaining} ngày
                  </span>
                  <small className="table-subline">Hết hạn: {formatDate(item.currentSubscriptionEnd)}</small>
                </div>
              );
            }
            if (item.daysRemaining >= 0) {
              return (
                <div className="expiry-cell">
                  <span className="days-badge days-badge-warn">
                    {item.daysRemaining === 0 ? 'Hôm nay hết hạn!' : `Sắp hết hạn: ${item.daysRemaining} ngày`}
                  </span>
                  <small className="table-subline">Hết hạn: {formatDate(item.currentSubscriptionEnd)}</small>
                </div>
              );
            }
            return (
              <div className="expiry-cell">
                <span className="days-badge days-badge-danger">
                  Đã hết hạn {Math.abs(item.daysRemaining)} ngày
                </span>
                <small className="table-subline">Hết từ: {formatDate(item.currentSubscriptionEnd)}</small>
              </div>
            );
          }
          return <span className="muted">—</span>;
        },
      },
      { key: 'status', label: 'Trạng thái hồ sơ', render: item => <StatusBadge value={item.status} /> },
    ],
    isActive: item => item.status === 'Active',
    setStatus: active => ({ status: active ? 'Inactive' : 'Active' }),
  },
  plans: {
    title: 'Gói tập', eyebrow: 'MEMBERSHIP', description: 'Danh mục gói và giá bán hiện tại.', path: '/membership-plans',
    query: (search, page, pageSize) => buildQuery({ includeInactive: true, page, pageSize, search }),
    fields: [
      { name: 'name', label: 'Tên gói', required: true },
      { name: 'description', label: 'Mô tả', type: 'textarea' },
      { name: 'price', label: 'Giá (VND)', type: 'number', required: true, min: '0.01', step: '1000' },
      { name: 'durationDays', label: 'Thời hạn (ngày)', type: 'number', required: true, min: '1', max: '3650' },
    ],
    columns: [
      { key: 'name', label: 'Tên gói', render: item => <><strong>{item.name}</strong><small className="table-subline">{item.description || 'Không có mô tả'}</small></> },
      { key: 'price', label: 'Giá', render: item => <strong>{formatMoney(item.price)}</strong> },
      { key: 'durationDays', label: 'Thời hạn', render: item => `${item.durationDays} ngày` },
      { key: 'status', label: 'Trạng thái', render: item => <StatusBadge value={item.isActive ? 'Active' : 'Inactive'} /> },
    ],
    isActive: item => item.isActive,
    setStatus: active => ({ isActive: !active }),
    convert: body => ({ ...body, price: Number(body.price), durationDays: Number(body.durationDays) }),
  },
  trainers: {
    title: 'Huấn luyện viên (PT)',
    eyebrow: 'PERSONAL TRAINERS',
    description: 'Đội ngũ Huấn luyện viên thể hình chuyên nghiệp (PT 1:1). Quản lý năng lực chuyên môn, phân bổ học viên và trạng thái sẵn sàng tiếp nhận lịch tập.',
    path: '/trainers',
    query: (search, page, pageSize) => buildQuery({ includeInactive: true, page, pageSize, search }),
    fields: [
      { name: 'firstName', label: 'Họ', required: true },
      { name: 'lastName', label: 'Tên', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Điện thoại', type: 'tel' },
      { name: 'specialty', label: 'Chuyên môn đào tạo (VD: Tăng cơ, Giảm mỡ, Boxing, Yoga, Phục hồi thể lực)' },
    ],
    columns: [
      {
        key: 'name',
        label: 'Huấn luyện viên',
        render: item => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="trainer-avatar-circle">
              {item.firstName?.[0] || 'P'}{item.lastName?.[0] || 'T'}
            </div>
            <div>
              <strong>{item.firstName} {item.lastName}</strong>
              <small className="table-subline">#{item.id} · {item.email || 'Chưa có email'}</small>
            </div>
          </div>
        ),
      },
      {
        key: 'specialty',
        label: 'Chuyên môn huấn luyện',
        render: item => item.specialty ? (
          <span className="trainer-specialty-badge">
            <Dumbbell size={12} style={{ display: 'inline', marginRight: '4px' }} />
            {item.specialty}
          </span>
        ) : (
          <span className="muted">HLV Thể hình cơ bản</span>
        ),
      },
      { key: 'phone', label: 'Số điện thoại', render: item => item.phone || '—' },
      {
        key: 'status',
        label: 'Trạng thái tiếp nhận',
        render: item => (
          <StatusBadge value={item.isActive ? 'Active' : 'Inactive'} />
        ),
      },
    ],
    isActive: item => item.isActive,
    setStatus: active => ({ isActive: !active }),
  },
};

function ResourceDialog({ config, initial, onClose, onSave, saving, error }) {
  return (
    <Modal title={initial ? `Sửa ${config.title.toLowerCase()}` : `Thêm ${config.title.toLowerCase()}`} description="Thông tin được lưu trực tiếp vào hệ thống." onClose={onClose}>
      <form className="form-stack" onSubmit={onSave}>
        <div className="form-grid">{config.fields.map(field => (
          <label className={`field-label ${field.type === 'textarea' ? 'field-span' : ''}`} key={field.name}>{field.label}
            {field.type === 'textarea' ? <textarea name={field.name} rows="3" defaultValue={initial?.[field.name] || ''} maxLength="500" /> :
              <input name={field.name} type={field.type || 'text'} defaultValue={initial?.[field.name] ?? ''} required={field.required} min={field.min} max={field.max} step={field.step} maxLength={field.type === 'email' ? 254 : 120} />}
          </label>
        ))}</div>
        <Notice error={error} />
        <div className="form-actions"><button className="button button-quiet" type="button" onClick={onClose}>Hủy</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div>
      </form>
    </Modal>
  );
}

export function ResourcePage({ type }) {
  const config = resourceConfig[type];
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [version, setVersion] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { page, pageSize, setPage, setPageSize } = usePagination(20, [type, debouncedSearch]);

  // Same component instance is reused when switching between members/plans/trainers routes.
  useEffect(() => { setSearch(''); setSuccess(''); }, [type]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`${config.path}${config.query(debouncedSearch, page, pageSize)}`)
      .then(result => { if (active) { setItems(result.items || []); setTotalCount(result.totalCount || 0); setError(''); } })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [config, debouncedSearch, page, pageSize, version]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    const body = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value.trim() || null]));
    const payload = config.convert ? config.convert(body) : body;
    try {
      await api(modal.item ? `${config.path}/${modal.item.id}` : config.path, {
        method: modal.item ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setModal(null);
      setSuccess(modal.item ? 'Đã cập nhật thông tin.' : 'Đã thêm bản ghi mới.');
      setVersion(value => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item) {
    setError('');
    setSuccess('');
    try {
      const active = config.isActive(item);
      await api(`${config.path}/${item.id}/status`, { method: 'PATCH', body: JSON.stringify(config.setStatus(active)) });
      setSuccess(active ? 'Đã tạm ngừng.' : 'Đã kích hoạt.');
      setVersion(value => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const columns = [
    ...config.columns,
    { key: 'actions', label: 'Thao tác', render: item => <div className="table-actions"><button className="button button-small button-quiet" onClick={() => { setError(''); setModal({ item }); }} type="button">Sửa</button><button className="button button-small button-outline" onClick={() => toggleStatus(item)} type="button">{config.isActive(item) ? 'Tạm ngừng' : 'Kích hoạt'}</button></div> },
  ];

  return <>
    <PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} action={<button className="button button-primary" onClick={() => { setError(''); setModal({ item: null }); }}><Plus size={17} />Thêm mới</button>} />
    <Notice error={error} success={success} />
    <section className="table-panel">
      <div className="table-toolbar"><div><strong>{totalCount}</strong><span> bản ghi</span></div><label className="search-field"><Search size={16} /><input aria-label="Tìm kiếm" placeholder={`Tìm ${config.title.toLowerCase()}…`} value={search} onChange={event => setSearch(event.target.value)} /></label></div>
      <TableFrame columns={columns} rows={items} loading={loading} emptyTitle={debouncedSearch ? 'Không tìm thấy kết quả phù hợp' : `Chưa có ${config.title.toLowerCase()}`} emptyDescription={debouncedSearch ? 'Thử từ khóa khác.' : 'Tạo bản ghi mới để bắt đầu quản lý.'} />
      <Pagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} onPageSizeChange={setPageSize} disabled={loading} />
    </section>
    {modal && <ResourceDialog config={config} initial={modal.item} onClose={() => setModal(null)} onSave={save} saving={saving} error={error} />}
  </>;
}

export function DashboardPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api('/reports/dashboard')
      .then(result => { if (active) { setReport(result); setError(''); } })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);

  const stats = report ? [
    { label: 'Hội viên đang hoạt động', value: report.activeMembers, accent: 'lime' },
    { label: 'Gói tập hiệu lực', value: report.activeSubscriptions, accent: 'blue' },
    { label: 'Sắp hết hạn · 7 ngày', value: report.subscriptionsExpiringInSevenDays, accent: 'orange' },
    { label: 'Doanh thu trong kỳ', value: formatMoney(report.revenueInRange), accent: 'mint' },
    { label: 'Lượt check-in', value: report.checkInsInRange, accent: 'coral' },
  ] : [];

  return <>
    <PageHeader eyebrow="OVERVIEW · HÔM NAY" title="Tổng quan vận hành" description="Tình hình hội viên và hoạt động phòng tập." action={<button className="button button-quiet" onClick={() => setVersion(value => value + 1)}><RefreshCw size={16} />Làm mới</button>} />
    <Notice error={error} />
    {loading ? <LoadingState /> : report ? <>
      <section className="metric-grid">{stats.map((stat, index) => <article className={`metric metric-${stat.accent}`} key={stat.label}><div className="metric-top"><span>{stat.label}</span><span className="metric-index">0{index + 1}</span></div><strong>{stat.value}</strong><small>THEO DỮ LIỆU HỆ THỐNG</small></article>)}</section>
      <section className="dashboard-lower">
        <div className="welcome-panel"><div><p className="eyebrow">DAILY OPERATIONS</p><h2>Giữ nhịp phòng tập.</h2><p>Kiểm tra gia hạn, ghi nhận thanh toán và check-in từ một workspace.</p></div><div className="welcome-mark"><Activity size={34} /></div></div>
        <div className="quick-actions"><h2>Thao tác nhanh</h2><Link to="/members"><Users size={18} />Thêm hội viên<ArrowRight size={16} /></Link><Link to="/subscriptions"><Repeat2 size={18} />Tạo đăng ký tập<ArrowRight size={16} /></Link><Link to="/checkins"><ScanLine size={18} />Ghi nhận check-in<ArrowRight size={16} /></Link></div>
      </section>
    </> : <EmptyState title="Chưa có dữ liệu tổng quan" description="Kiểm tra kết nối API và database rồi thử làm mới." />}
  </>;
}

export function SubscriptionsPage() {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [version, setVersion] = useState(0);
  const memberLookup = useMemberLookup(memberSearch);

  // Filter toolbar state
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { page, pageSize, setPage, setPageSize } = usePagination(10, [memberId, statusFilter, searchQuery]);

  useEffect(() => {
    let active = true;
    api('/membership-plans?includeInactive=false&page=1&pageSize=100')
      .then(planResult => { if (active) setPlans(planResult.items || []); })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoadingOptions(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!memberId) { setItems([]); return undefined; }
    let active = true;
    setLoading(true);
    api(`/members/${memberId}/subscriptions?page=1&pageSize=100`)
      .then(result => { if (active) { setItems(result.items || []); setError(''); } })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [memberId, version]);

  // Keep the chosen member visible in the <select> even when the search results change.
  const filteredMembersForCreate = selectedMember && !memberLookup.items.some(member => member.id === selectedMember.id)
    ? [selectedMember, ...memberLookup.items]
    : memberLookup.items;

  function selectMember(id) {
    setMemberId(id);
    setSelectedMember(filteredMembersForCreate.find(member => String(member.id) === String(id)) || null);
  }

  const filteredSubscriptions = items.filter(sub => {
    if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const planName = plans.find(p => p.id === sub.membershipPlanId)?.name || '';
    return (
      planName.toLowerCase().includes(q) ||
      String(sub.id).includes(q)
    );
  });

  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (!values.memberId || !values.membershipPlanId) {
      setError('Vui lòng chọn đầy đủ hội viên và gói tập.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await api('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          memberId: Number(values.memberId),
          membershipPlanId: Number(values.membershipPlanId),
        }),
      });
      setMemberId(String(result.memberId));
      toast.success('Đã tạo đăng ký gói tập thành công (Trạng thái: Chờ thanh toán).', 'Tạo đăng ký');
      setSuccess('Đã tạo đăng ký gói tập ở trạng thái chờ thanh toán.');
      setVersion(value => value + 1);
      form.reset();
    } catch (requestError) {
      toast.error(requestError.message, 'Lỗi tạo đăng ký');
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function createInvoice(subscription) {
    setError(''); setSuccess('');
    try {
      const invoice = await api('/invoices', { method: 'POST', body: JSON.stringify({ subscriptionId: subscription.id }) });
      toast.success(`Đã tạo hóa đơn ${invoice.number} thành công.`, 'Lập hóa đơn');
      setSuccess(`Đã tạo hóa đơn ${invoice.number}.`);
      setVersion(v => v + 1);
    } catch (requestError) {
      toast.error(requestError.message, 'Lỗi tạo hóa đơn');
      setError(requestError.message);
    }
  }

  async function renew(subscription) {
    setError(''); setSuccess('');
    try {
      await api(`/subscriptions/${subscription.id}/renew`, { method: 'POST' });
      toast.success('Đã tạo đăng ký gia hạn chờ thanh toán thành công.', 'Gia hạn gói tập');
      setSuccess('Đã tạo đăng ký gia hạn chờ thanh toán.');
      setVersion(value => value + 1);
    } catch (requestError) {
      toast.error(requestError.message, 'Lỗi gia hạn');
      setError(requestError.message);
    }
  }

  return <>
    <PageHeader
      eyebrow="MEMBERSHIP OPERATIONS"
      title="Đăng Ký Gói Tập"
      description="Quản lý vòng đời đăng ký: tạo gói tập mới, theo dõi ngày hiệu lực và gia hạn thẻ hội viên."
    />
    <Notice error={error} success={success} />

    <section className="work-grid">
      {/* Left: Create Subscription Form */}
      <form className="work-panel form-stack subscription-create-panel" onSubmit={create}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">NEW REGISTRATION</p>
            <h2>Tạo đăng ký tập</h2>
          </div>
          <Repeat2 size={20} className="panel-icon-accent" />
        </div>

        {/* Member selector with search filter */}
        <div className="field-group">
          <label className="field-label">
            1. Tìm & Chọn hội viên
            <div className="search-input-wrap">
              <Search size={15} className="input-search-icon" />
              <input
                type="text"
                placeholder="Gõ tên, SĐT hoặc ID hội viên để lọc…"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="sub-member-search-input"
              />
            </div>
            <select
              name="memberId"
              required
              value={memberId}
              onChange={event => selectMember(event.target.value)}
              style={{ marginTop: '8px' }}
            >
              <option value="">
                {memberLookup.loading
                  ? '-- Đang tìm hội viên… --'
                  : `-- Chọn hội viên (${memberLookup.items.length}${memberLookup.totalCount > memberLookup.items.length ? ` / ${memberLookup.totalCount}, gõ thêm để thu hẹp` : ''}) --`}
              </option>
              {filteredMembersForCreate.map(m => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} · SĐT: {m.phone || '—'} · #{m.id}
                </option>
              ))}
            </select>
          </label>

          {selectedMember && (
            <div className="sub-member-preview-pill">
              <span className="avatar-chip">{(selectedMember.firstName || 'M').slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{selectedMember.firstName} {selectedMember.lastName}</strong>
                <small>SĐT: {selectedMember.phone || '—'} · <StatusBadge value={selectedMember.status} /></small>
              </div>
            </div>
          )}
        </div>

        {/* Plan selector */}
        <label className="field-label">
          2. Chọn gói tập đang bán
          <select name="membershipPlanId" required disabled={loadingOptions || !plans.length}>
            <option value="">-- Chọn gói dịch vụ thể thao --</option>
            {plans.map(plan => (
              <option key={plan.id} value={plan.id}>
                {plan.name} · {formatMoney(plan.price)} ({plan.durationDays} ngày)
              </option>
            ))}
          </select>
        </label>

        <div className="sub-info-notice">
          <p>ℹ️ Đăng ký mới sẽ ở trạng thái <strong>Chờ thanh toán</strong>. Sau khi thu phí và lập hóa đơn, hệ thống sẽ tự động kích hoạt quyền check-in vào phòng tập.</p>
        </div>

        <button
          className="button button-primary button-wide"
          type="submit"
          disabled={saving || loadingOptions || !memberId || !plans.length}
        >
          <Plus size={17} />
          {saving ? 'Đang tạo đăng ký…' : 'Xác nhận tạo đăng ký'}
        </button>
      </form>

      {/* Right: Subscription History & Status */}
      <section className="work-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SUBSCRIPTION HISTORY</p>
            <h2>{selectedMember ? `Lịch sử: ${selectedMember.firstName} ${selectedMember.lastName}` : 'Danh sách đăng ký của hội viên'}</h2>
          </div>
          <span className="panel-count">{filteredSubscriptions.length} bản ghi</span>
        </div>

        {memberId ? (
          <>
            {/* Filter toolbar */}
            <div className="sub-table-toolbar">
              <div className="sub-status-tabs">
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'Active', label: 'Đang hoạt động' },
                  { key: 'PendingPayment', label: 'Chờ thanh toán' },
                  { key: 'Expired', label: 'Đã hết hạn' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`sub-tab-btn ${statusFilter === tab.key ? 'active' : ''}`}
                    onClick={() => setStatusFilter(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <TableFrame
              loading={loading}
              rows={paginate(filteredSubscriptions, page, pageSize)}
              emptyTitle="Không có đăng ký phù hợp"
              emptyDescription="Hội viên này chưa có gói tập nào theo bộ lọc đang chọn."
              columns={[
                { key: 'id', label: 'Mã', render: item => <strong>#SUB-{String(item.id).padStart(4, '0')}</strong> },
                {
                  key: 'plan',
                  label: 'Gói tập',
                  render: item => {
                    const plan = plans.find(p => p.id === item.membershipPlanId);
                    return (
                      <div>
                        <strong>{plan?.name || `Gói #${item.membershipPlanId}`}</strong>
                        <small className="table-subline">{plan ? formatMoney(plan.price) : ''}</small>
                      </div>
                    );
                  },
                },
                {
                  key: 'period',
                  label: 'Thời hạn hiệu lực',
                  render: item => item.startsOn ? (
                    <div>
                      <span>{formatDate(item.startsOn)} → {formatDate(item.endsOn)}</span>
                      {item.status === 'Active' && (
                        <small className="table-subline text-success">
                          Đang trong hạn tập
                        </small>
                      )}
                    </div>
                  ) : <span className="muted">Chưa kích hoạt</span>,
                },
                { key: 'status', label: 'Trạng thái', render: item => <StatusBadge value={item.status} /> },
                {
                  key: 'actions',
                  label: 'Thao tác',
                  render: item => (
                    <div className="table-actions">
                      {item.status === 'PendingPayment' && (
                        <button className="button button-small button-outline" onClick={() => createInvoice(item)} type="button">
                          Lập hóa đơn
                        </button>
                      )}
                      {['Active', 'Expired'].includes(item.status) && (
                        <button className="button button-small button-quiet" onClick={() => renew(item)} type="button">
                          Gia hạn gói
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={filteredSubscriptions.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              unit="đăng ký"
            />
          </>
        ) : (
          <EmptyState
            title="Chưa chọn hội viên"
            description="Tìm và chọn một hội viên ở biểu mẫu bên trái để tra cứu toàn bộ lịch sử gói tập và tiến hành gia hạn."
          />
        )}
      </section>
    </section>
  </>;
}

export function InvoicesPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionId, setSubscriptionId] = useState(params.get('subscriptionId') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);

  // Search & Filter (applied server-side)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { page, pageSize, setPage, setPageSize } = usePagination(20, [debouncedSearch, statusFilter]);

  // Preview & Export Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [autoInvoicing, setAutoInvoicing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/invoices${buildQuery({ page, pageSize, search: debouncedSearch, status: statusFilter })}`)
      .then(invoiceRes => {
        if (active) {
          setItems(invoiceRes.items || []);
          setTotalCount(invoiceRes.totalCount || 0);
          setError('');
        }
      })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, pageSize, debouncedSearch, statusFilter, version]);

  useEffect(() => {
    if (!params.get('memberId')) { setSubscriptions([]); return undefined; }
    let active = true;
    api(`/members/${params.get('memberId')}/subscriptions?page=1&pageSize=100`)
      .then(result => { if (active) setSubscriptions((result.items || []).filter(item => item.status === 'PendingPayment')); })
      .catch(requestError => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [params]);

  async function create(event) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const result = await api('/invoices', { method: 'POST', body: JSON.stringify({ subscriptionId: Number(subscriptionId) }) });
      toast.success(`Đã tạo hóa đơn ${result.number} thành công!`, 'Lập hóa đơn');
      setSuccess(`Đã tạo hóa đơn ${result.number}.`);
      setSubscriptionId(''); setParams({}); setVersion(value => value + 1);
    } catch (requestError) {
      toast.error(requestError.message, 'Lỗi lập hóa đơn');
      setError(requestError.message);
    }
    finally { setSaving(false); }
  }

  // Tự động quét và xuất hóa đơn cho tất cả đăng ký chưa có hóa đơn
  async function handleAutoInvoicing() {
    setAutoInvoicing(true);
    setError('');
    try {
      let createdCount = 0;
      // Load complete lists explicitly for this bulk action (the table itself only holds one page).
      const [allMembers, pendingInvoices] = await Promise.all([
        fetchAllPages('/members'),
        fetchAllPages('/invoices', { status: 'PendingPayment' }),
      ]);
      const existingSubIds = new Set(pendingInvoices.map(inv => inv.subscriptionId));

      for (const member of allMembers) {
        try {
          const subRes = await api(`/members/${member.id}/subscriptions?page=1&pageSize=20`);
          const pendingSubs = (subRes.items || []).filter(s => s.status === 'PendingPayment' && !existingSubIds.has(s.id));
          for (const sub of pendingSubs) {
            await api('/invoices', { method: 'POST', body: JSON.stringify({ subscriptionId: sub.id }) });
            createdCount++;
            existingSubIds.add(sub.id);
          }
        } catch {
          // ignore single sub errors
        }
      }

      if (createdCount > 0) {
        toast.success(`Đã tự động xuất thành công ${createdCount} hóa đơn mới!`, 'Tự động xuất hóa đơn');
        setSuccess(`Đã tự động xuất ${createdCount} hóa đơn cho các gói đăng ký chờ.`);
        setVersion(v => v + 1);
      } else {
        toast.info('Tất cả các gói tập hiện tại đều đã được xuất hóa đơn đầy đủ.', 'Tự động kiểm tra');
      }
    } catch (err) {
      toast.error(err.message, 'Lỗi xuất hóa đơn tự động');
      setError(err.message);
    } finally {
      setAutoInvoicing(false);
    }
  }

  // Xuất file Excel / CSV (hỗ trợ UTF-8 mở trong Microsoft Excel) — xuất toàn bộ kết quả theo bộ lọc, không chỉ trang hiện tại
  async function exportCsv() {
    if (!totalCount) {
      toast.warning('Chưa có hóa đơn nào để xuất file.', 'Thông báo');
      return;
    }
    setExporting(true);
    let allInvoices;
    try {
      allInvoices = await fetchAllPages('/invoices', { search: debouncedSearch, status: statusFilter });
    } catch (err) {
      toast.error(err.message, 'Lỗi xuất file');
      setExporting(false);
      return;
    }
    setExporting(false);
    const headers = ['Số hóa đơn', 'Mã hội viên', 'Tên hội viên', 'SĐT', 'Gói tập', 'Thời hạn (ngày)', 'Tổng tiền (VND)', 'Trạng thái', 'Ngày lập', 'Ngày thanh toán'];
    const rows = allInvoices.map(inv => {
      return [
        inv.number,
        `#${inv.memberId}`,
        inv.memberName || '',
        inv.memberPhone || '',
        inv.planNameSnapshot,
        inv.planDurationDaysSnapshot,
        inv.totalAmount,
        inv.status === 'Paid' ? 'Đã thanh toán' : inv.status === 'PendingPayment' ? 'Chờ thanh toán' : inv.status,
        inv.createdAtUtc,
        inv.paidAtUtc || '',
      ];
    });

    const csvContent = '\uFEFF' + [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Danh_sach_hoa_don_${dateInputValue()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Đã xuất file báo cáo danh sách hóa đơn (Excel CSV) thành công!', 'Xuất file');
  }

  function handlePrintInvoice() {
    window.print();
  }

  const memberOfSelected = selectedInvoice?.memberName
    ? { fullName: selectedInvoice.memberName, phone: selectedInvoice.memberPhone, email: selectedInvoice.memberEmail }
    : null;

  return <>
    <PageHeader
      eyebrow="BILLING & INVOICING"
      title="Quản Lý & Xuất Hóa Đơn"
      description="Lưu trữ hóa đơn gói tập, tự động xuất hóa đơn đăng ký và in phiếu thu tiền cho hội viên."
      action={
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="button button-quiet"
            type="button"
            onClick={exportCsv}
            disabled={exporting}
            title="Xuất bảng kê danh sách hóa đơn (theo bộ lọc hiện tại) ra file Excel CSV"
          >
            <FileSpreadsheet size={16} /> {exporting ? 'Đang xuất…' : 'Xuất file Excel'}
          </button>
          <button
            className="button button-primary"
            type="button"
            disabled={autoInvoicing}
            onClick={handleAutoInvoicing}
            title="Tự động quét và xuất hóa đơn cho các đăng ký mới"
          >
            <Sparkles size={16} />
            {autoInvoicing ? 'Đang tự động xuất…' : 'Tự động xuất hóa đơn'}
          </button>
        </div>
      }
    />
    <Notice error={error} success={success} />

    {/* Form tạo hóa đơn nếu có tham số memberId */}
    {subscriptions.length > 0 && (
      <form className="inline-create" onSubmit={create}>
        <div>
          <p className="eyebrow">PENDING SUBSCRIPTION</p>
          <strong>Tạo hóa đơn cho hội viên #{params.get('memberId')}</strong>
        </div>
        <select value={subscriptionId} onChange={event => setSubscriptionId(event.target.value)} required>
          <option value="">Chọn đăng ký chờ thanh toán</option>
          {subscriptions.map(item => (
            <option key={item.id} value={item.id}>
              Đăng ký #{item.id}
            </option>
          ))}
        </select>
        <button className="button button-primary" disabled={saving}>
          <FilePlus2 size={16} /> Tạo hóa đơn
        </button>
      </form>
    )}

    {/* Invoices List Panel */}
    <section className="table-panel">
      <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <strong>{totalCount}</strong>
          <span> hóa đơn{debouncedSearch || statusFilter !== 'all' ? ' phù hợp' : ''}</span>
        </div>

        {/* Search & Status Filters */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
          <div className="search-input-wrap" style={{ margin: 0 }}>
            <Search size={14} className="input-search-icon" />
            <input
              type="text"
              placeholder="Tìm theo số HĐ, Tên hoặc SĐT hội viên…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="sub-member-search-input"
              style={{ width: '280px', padding: '6px 10px 6px 32px', fontSize: '13px' }}
            />
          </div>

          <div className="sub-status-tabs">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'PendingPayment', label: 'Chờ thanh toán' },
              { key: 'Paid', label: 'Đã thanh toán' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                className={`sub-tab-btn ${statusFilter === tab.key ? 'active' : ''}`}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <TableFrame
        loading={loading}
        rows={items}
        emptyTitle="Chưa có hóa đơn phù hợp"
        emptyDescription="Bấm nút 'Tự động xuất hóa đơn' ở trên để tạo hóa đơn cho các đăng ký tập đang chờ."
        columns={[
          {
            key: 'number',
            label: 'Số hóa đơn',
            render: item => (
              <div>
                <strong>{item.number}</strong>
                <small className="table-subline">{formatDate(item.createdAtUtc)}</small>
              </div>
            ),
          },
          {
            key: 'member',
            label: 'Hội viên',
            render: item => item.memberName ? (
              <div>
                <strong>{item.memberName}</strong>
                <small className="table-subline">SĐT: {item.memberPhone || '—'} · #{item.memberId}</small>
              </div>
            ) : (
              <strong>#{item.memberId}</strong>
            ),
          },
          {
            key: 'plan',
            label: 'Gói dịch vụ',
            render: item => (
              <div>
                <strong>{item.planNameSnapshot}</strong>
                <small className="table-subline">{item.planDurationDaysSnapshot} ngày tập</small>
              </div>
            ),
          },
          {
            key: 'amount',
            label: 'Tổng tiền',
            render: item => <strong style={{ color: 'var(--lime)' }}>{formatMoney(item.totalAmount)}</strong>,
          },
          {
            key: 'status',
            label: 'Trạng thái',
            render: item => <StatusBadge value={item.status} />,
          },
          {
            key: 'actions',
            label: 'Thao tác xuất / in',
            render: item => (
              <div className="table-actions">
                <button
                  className="button button-small button-quiet"
                  type="button"
                  onClick={() => setSelectedInvoice(item)}
                  title="Xem và in phiếu thu / hóa đơn chi tiết"
                >
                  <Printer size={14} /> In / Xuất hóa đơn
                </button>
                {item.status === 'PendingPayment' ? (
                  <Link className="button button-small button-primary" to={`/payments?invoiceId=${item.id}`}>
                    Thu tiền <ArrowRight size={13} />
                  </Link>
                ) : (
                  <small className="table-subline" style={{ color: 'var(--lime)' }}>
                    Đã thu tiền ({formatDate(item.paidAtUtc)})
                  </small>
                )}
              </div>
            ),
          },
        ]}
      />
      <Pagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} onPageSizeChange={setPageSize} disabled={loading} unit="hóa đơn" />
    </section>

    {/* Printable Invoice Receipt Modal */}
    {selectedInvoice && (
      <Modal title={`Hóa Đơn ${selectedInvoice.number}`} onClose={() => setSelectedInvoice(null)} wide>
        <div className="invoice-print-wrapper">
          <div className="invoice-receipt-print-area">
            {/* Header with Dumbbell Club Logo */}
            <div className="receipt-header">
              <div className="receipt-brand">
                <span className="brand-mark">
                  <Dumbbell size={24} strokeWidth={2.5} />
                </span>
                <div>
                  <strong className="receipt-club-name">FITNESS MANAGEMENT CENTER</strong>
                  <small className="receipt-club-sub">HỆ THỐNG PHÒNG TẬP THỂ DỤC THỂ HÌNH CAO CẤP</small>
                  <p className="receipt-club-addr">Tầng 2-3 Tòa nhà Fitness, Q. Cầu Giấy, Hà Nội · Hotline: 1900 6868</p>
                </div>
              </div>
              <div className="receipt-meta-right">
                <h2>HÓA ĐƠN DỊCH VỤ</h2>
                <p className="receipt-number">Số hóa đơn: <strong>{selectedInvoice.number}</strong></p>
                <p className="receipt-date">Ngày lập: {formatDate(selectedInvoice.createdAtUtc)}</p>
                <p className="receipt-status-line">
                  Trạng thái: <strong>{selectedInvoice.status === 'Paid' ? 'ĐÃ THANH TOÁN' : 'CHỜ THANH TOÁN'}</strong>
                </p>
              </div>
            </div>

            <div className="receipt-divider" />

            {/* Customer Information */}
            <div className="receipt-info-grid">
              <div className="receipt-customer-col">
                <p className="receipt-caption">THÔNG TIN KHÁCH HÀNG / HỘI VIÊN:</p>
                <p className="receipt-strong">
                  {memberOfSelected ? memberOfSelected.fullName : `Hội viên #${selectedInvoice.memberId}`}
                </p>
                <p>Số điện thoại: <strong>{memberOfSelected?.phone || '—'}</strong></p>
                <p>Email: {memberOfSelected?.email || '—'}</p>
                <p>Mã thẻ hội viên: #{selectedInvoice.memberId}</p>
              </div>
              <div className="receipt-payment-col">
                <p className="receipt-caption">CHI TIẾT THANH TOÁN:</p>
                <p>Mã đơn hàng: #{selectedInvoice.id}</p>
                <p>Phương thức: Chuyển khoản QR / Tiền mặt</p>
                {selectedInvoice.paidAtUtc ? (
                  <p className="receipt-paid-notice">✅ Ngày thanh toán: {formatDate(selectedInvoice.paidAtUtc)}</p>
                ) : (
                  <p className="receipt-pending-notice">⏳ Chưa thanh toán tại quầy</p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <table className="receipt-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>STT</th>
                  <th>Gói dịch vụ thể hình</th>
                  <th style={{ width: '120px' }}>Thời hạn</th>
                  <th style={{ width: '140px', textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ width: '150px', textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>
                    <strong>{selectedInvoice.planNameSnapshot}</strong>
                    <div style={{ fontSize: '11px', color: '#666' }}>Quyền vào phòng tập toàn thời gian, tủ locker & xông hơi</div>
                  </td>
                  <td>{selectedInvoice.planDurationDaysSnapshot} ngày</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(selectedInvoice.totalAmount)}</td>
                  <td style={{ textAlign: 'right' }}><strong>{formatMoney(selectedInvoice.totalAmount)}</strong></td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right' }}>Thuế giá trị gia tăng (VAT 0%):</td>
                  <td style={{ textAlign: 'right' }}>0 đ</td>
                </tr>
                <tr className="receipt-total-row">
                  <td colSpan={4} style={{ textAlign: 'right' }}><strong>TỔNG TIỀN PHẢI THANH TOÁN:</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <strong className="receipt-total-price">{formatMoney(selectedInvoice.totalAmount)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Signatures & Stamp */}
            <div className="receipt-signatures">
              <div className="sig-col">
                <p className="sig-title">Người mua hàng / Hội viên</p>
                <small className="sig-hint">(Ký và ghi rõ họ tên)</small>
                <div style={{ height: '55px' }} />
                <p className="sig-name">{memberOfSelected ? memberOfSelected.fullName : ''}</p>
              </div>
              <div className="sig-col">
                <p className="sig-title">Người lập phiếu / Thu ngân</p>
                <small className="sig-hint">(Ký, đóng dấu hoặc xác thực điện tử)</small>
                <div className="digital-stamp">
                  <span>FITNESS CENTER</span>
                  <strong>{selectedInvoice.status === 'Paid' ? 'ĐÃ THU TIỀN' : 'ĐÃ XÁC NHẬN'}</strong>
                  <small>{formatDate(selectedInvoice.createdAtUtc)}</small>
                </div>
              </div>
            </div>

            <div className="receipt-footer-note">
              <p>Cảm ơn quý khách đã tin tưởng và đồng hành cùng FITNESS CENTER. Chúc quý khách những buổi tập bùng nổ năng lượng!</p>
            </div>
          </div>

          {/* Action buttons (Hidden during printing) */}
          <div className="modal-actions no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <button className="button button-quiet" type="button" onClick={() => setSelectedInvoice(null)}>
              Đóng
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="button button-primary" type="button" onClick={handlePrintInvoice}>
                <Printer size={16} /> In hóa đơn (Print / Lưu PDF)
              </button>
            </div>
          </div>
        </div>
      </Modal>
    )}
  </>;
}

function ReceiptThumbnailItem({ receipt, index, isSelected, onSelect }) {
  const [loadError, setLoadError] = useState(false);
  return (
    <div
      className={`receipt-thumb-card ${isSelected ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div className="thumb-preview">
        {!loadError ? (
          <img
            src={receipt.url}
            alt={`Biên lai đợt ${index + 1}`}
            onError={() => setLoadError(true)}
          />
        ) : (
          <div className="thumb-fallback">
            <FileText size={18} />
          </div>
        )}
      </div>
      <div className="thumb-meta">
        <strong>Đợt {index + 1}</strong>
        <small>{formatDate(receipt.uploadedAt)}</small>
      </div>
    </div>
  );
}

function ReceiptCanvasViewer({ receipt, index }) {
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [receipt?.id, receipt?.url]);

  if (!receipt) return null;

  return (
    <div className="receipt-main-canvas">
      <div className="canvas-image-wrap">
        {!loadError ? (
          <img
            src={receipt.url}
            alt={`Biên lai đợt ${index + 1}`}
            className="canvas-image"
            onError={() => setLoadError(true)}
          />
        ) : (
          <div className="canvas-fallback" style={{ padding: '36px', textAlign: 'center' }}>
            <FileText size={48} style={{ color: 'var(--lime)', marginBottom: '12px' }} />
            <p style={{ fontWeight: 600 }}>Tệp chứng từ không phải định dạng ảnh trực tiếp (PDF hoặc tài liệu).</p>
            <a
              className="button button-primary"
              href={receipt.url}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}
            >
              <Eye size={15} /> Mở tệp chứng từ trong tab mới
            </a>
          </div>
        )}
      </div>

      {/* Viewer Metadata & Actions */}
      <div className="canvas-meta-toolbar">
        <div className="canvas-file-info">
          <strong>Biên lai đợt {index + 1}: {receipt.fileName || 'ChungTuThanhToan.jpg'}</strong>
          <small>Tải lên lúc: {formatDate(receipt.uploadedAt)}</small>
        </div>
        <div className="canvas-actions">
          <a
            className="button button-quiet button-small"
            href={receipt.url}
            target="_blank"
            rel="noreferrer"
          >
            <Eye size={14} /> Mở ảnh gốc
          </a>
          <a
            className="button button-primary button-small"
            href={receipt.downloadUrl || receipt.url}
            target="_blank"
            rel="noreferrer"
          >
            <Download size={14} /> Tải file về
          </a>
        </div>
      </div>
    </div>
  );
}

export function PaymentsPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [invoiceId, setInvoiceId] = useState(params.get('invoiceId') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mode, setMode] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [version, setVersion] = useState(0);
  const { page, pageSize, setPage, setPageSize } = usePagination(20, [invoiceId, statusFilter]);

  // Multi-Bill Gallery State
  const [galleryPayment, setGalleryPayment] = useState(null);
  const [receiptsList, setReceiptsList] = useState([]);
  const [activeReceiptIndex, setActiveReceiptIndex] = useState(0);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [uploadingMore, setUploadingMore] = useState(false);

  // Paged payment list (server-side)
  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/payments${buildQuery({ page, pageSize, invoiceId, status: statusFilter })}`)
      .then(paymentResult => {
        if (active) {
          setItems(paymentResult.items || []);
          setTotalCount(paymentResult.totalCount || 0);
          setError('');
        }
      })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [invoiceId, statusFilter, page, pageSize, version]);

  // Invoice options for the filter dropdown (latest 100) and the "record payment" form (pending only)
  useEffect(() => {
    let active = true;
    Promise.all([
      api('/invoices?page=1&pageSize=100'),
      api('/invoices?status=PendingPayment&page=1&pageSize=100'),
    ])
      .then(([recentResult, pendingResult]) => {
        if (active) {
          setInvoices(recentResult.items || []);
          setPendingInvoices(pendingResult.items || []);
        }
      })
      .catch(requestError => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [version]);

  async function openReceiptGallery(payment) {
    setGalleryPayment(payment);
    setLoadingReceipts(true);
    setActiveReceiptIndex(0);
    try {
      const data = await api(`/payments/${payment.id}/receipts`);
      if (data && data.length > 0) {
        setReceiptsList(data);
      } else if (payment.receiptFileId) {
        setReceiptsList([{
          id: payment.receiptFileId,
          fileName: `Biên lai PAY-${String(payment.id).padStart(5, '0')}.jpg`,
          url: `/api/files/${payment.receiptFileId}`,
          downloadUrl: `/api/files/${payment.receiptFileId}/download`,
          uploadedAt: payment.createdAtUtc,
        }]);
      } else {
        setReceiptsList([]);
      }
    } catch {
      if (payment.receiptFileId) {
        setReceiptsList([{
          id: payment.receiptFileId,
          fileName: `Biên lai PAY-${String(payment.id).padStart(5, '0')}.jpg`,
          url: `/api/files/${payment.receiptFileId}`,
          downloadUrl: `/api/files/${payment.receiptFileId}/download`,
          uploadedAt: payment.createdAtUtc,
        }]);
      } else {
        setReceiptsList([]);
      }
    } finally {
      setLoadingReceipts(false);
    }
  }

  async function handleUploadAdditionalBill(event) {
    event.preventDefault();
    const file = event.target.elements.additionalReceipt?.files?.[0];
    if (!file || !galleryPayment) return;
    setUploadingMore(true);
    try {
      await uploadPaymentReceipt(galleryPayment.id, file);
      toast.success('Đã tải lên biên lai đợt mới thành công! (Ảnh cũ được bảo lưu vĩnh viễn)', 'Thêm biên lai');
      const data = await api(`/payments/${galleryPayment.id}/receipts`);
      setReceiptsList(data || []);
      setActiveReceiptIndex((data?.length || 1) - 1);
      setVersion(v => v + 1);
      event.target.reset();
    } catch (err) {
      toast.error(err.message, 'Lỗi tải biên lai');
    } finally {
      setUploadingMore(false);
    }
  }

  async function save(event) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      if (mode === 'create') {
        let receiptFileId = null;
        const fileInput = form.elements.receiptFile?.files?.[0];
        if (fileInput) {
          const uploadRes = await uploadFile(fileInput);
          receiptFileId = uploadRes.id;
        }
        await api(`/invoices/${values.invoiceId}/payments`, { method: 'POST', body: JSON.stringify({ amount: Number(values.amount), method: values.method, receiptFileId }) });
        toast.success('Đã ghi nhận khoản thanh toán thành công!', 'Thanh toán');
        setSuccess('Đã ghi nhận khoản thanh toán chờ xác nhận.');
      } else if (mode === 'confirm') {
        const fileInput = form.elements.receiptFile?.files?.[0];
        if (fileInput) {
          await uploadPaymentReceipt(selected.id, fileInput);
        }
        await api(`/payments/${selected.id}/confirm`, { method: 'POST', body: JSON.stringify({ reference: values.reference || null }) });
        toast.success('Đã xác nhận thu tiền và kích hoạt gói tập!', 'Xác nhận thu tiền');
        setSuccess('Đã xác nhận thu tiền và kích hoạt đăng ký.');
      } else if (mode === 'uploadReceipt') {
        const fileInput = form.elements.receiptFile?.files?.[0];
        if (!fileInput) {
          setError('Vui lòng chọn một tệp ảnh biên lai hoặc PDF.');
          setSaving(false);
          return;
        }
        await uploadPaymentReceipt(selected.id, fileInput);
        toast.success('Đã tải lên biên lai đối chiếu thành công!', 'Tải biên lai');
        setSuccess('Đã tải lên và gắn biên lai cho giao dịch thành công.');
      } else {
        await api(`/payments/${selected.id}/reject`, { method: 'POST', body: JSON.stringify({ reason: values.reason }) });
        toast.warning('Đã từ chối khoản thanh toán.', 'Từ chối');
        setSuccess('Đã từ chối khoản thanh toán.');
      }
      setMode(''); setSelected(null); setVersion(value => value + 1);
    } catch (requestError) {
      toast.error(requestError.message, 'Lỗi giao dịch');
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  const invoiceFilterMissing = invoiceId && !invoices.some(invoice => String(invoice.id) === String(invoiceId));

  return <>
    <PageHeader
      eyebrow="BILLING & SETTLEMENTS"
      title="Thanh Toán & Đối Soát Biên Lai"
      description="Ghi nhận tiền mặt hoặc chuyển khoản, hỗ trợ tải nhiều biên lai theo từng đợt thanh toán của khách."
      action={
        <button className="button button-primary" onClick={() => { setError(''); setMode('create'); }}>
          <Plus size={17} /> Ghi nhận thanh toán
        </button>
      }
    />
    <Notice error={error} success={success} />

    <section className="table-panel">
      <div className="table-toolbar" style={{ flexWrap: 'wrap' }}>
        <div>
          <strong>{totalCount}</strong>
          <span> giao dịch</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
          <div className="sub-status-tabs">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'PendingConfirmation', label: 'Chờ xác nhận' },
              { key: 'Confirmed', label: 'Đã xác nhận' },
              { key: 'Rejected', label: 'Từ chối' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                className={`sub-tab-btn ${statusFilter === tab.key ? 'active' : ''}`}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <select
            className="filter-select"
            aria-label="Lọc hóa đơn"
            value={invoiceId}
            onChange={event => {
              setInvoiceId(event.target.value);
              setParams(event.target.value ? { invoiceId: event.target.value } : {});
            }}
          >
            <option value="">Tất cả hóa đơn</option>
            {invoiceFilterMissing && <option value={invoiceId}>Hóa đơn #{invoiceId}</option>}
            {invoices.map(invoice => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.number}
              </option>
            ))}
          </select>
        </div>
      </div>

      <TableFrame
        loading={loading}
        rows={items}
        emptyTitle={statusFilter !== 'all' || invoiceId ? 'Không có giao dịch phù hợp' : 'Chưa có giao dịch thanh toán'}
        emptyDescription="Ghi nhận thanh toán từ một hóa đơn đang chờ."
        columns={[
          {
            key: 'id',
            label: 'Mã GD',
            render: item => (
              <div>
                <strong>PAY-{String(item.id).padStart(5, '0')}</strong>
                <small className="table-subline">{formatDate(item.createdAtUtc)}</small>
              </div>
            ),
          },
          {
            key: 'invoiceId',
            label: 'Hóa đơn',
            render: item => item.invoiceNumber || invoices.find(invoice => invoice.id === item.invoiceId)?.number || `#${item.invoiceId}`,
          },
          {
            key: 'amount',
            label: 'Số tiền',
            render: item => <strong style={{ color: 'var(--lime)' }}>{formatMoney(item.amount)}</strong>,
          },
          {
            key: 'method',
            label: 'Phương thức',
            render: item => item.method === 'BankTransfer' ? 'Chuyển khoản' : 'Tiền mặt',
          },
          {
            key: 'status',
            label: 'Trạng thái',
            render: item => <StatusBadge value={item.status} />,
          },
          {
            key: 'receipt',
            label: 'Biên lai đối chiếu',
            render: item => {
              const count = item.receiptFileIds?.length || (item.receiptFileId ? 1 : 0);
              return count > 0 ? (
                <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    className="button button-small button-quiet"
                    type="button"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => openReceiptGallery(item)}
                    title="Xem toàn bộ các biên lai đã nộp"
                  >
                    <Image size={14} /> Xem bill ({count} ảnh)
                  </button>
                  <button
                    className="button button-small button-outline"
                    type="button"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Khách nộp thêm tiền đợt mới: Tải thêm biên lai bổ sung"
                    onClick={() => { setError(''); setSelected(item); setMode('uploadReceipt'); }}
                  >
                    <Plus size={13} /> Thêm bill
                  </button>
                </div>
              ) : (
                <button
                  className="button button-small button-quiet"
                  type="button"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => { setError(''); setSelected(item); setMode('uploadReceipt'); }}
                >
                  <Upload size={14} /> Tải bill
                </button>
              );
            },
          },
          {
            key: 'actions',
            label: 'Xử lý',
            render: item => item.status === 'PendingConfirmation' ? (
              <div className="table-actions">
                <button
                  className="button button-small button-primary"
                  onClick={() => { setSelected(item); setMode('confirm'); }}
                  type="button"
                >
                  Xác nhận
                </button>
                <button
                  className="button button-small button-danger-quiet"
                  onClick={() => { setSelected(item); setMode('reject'); }}
                  type="button"
                >
                  Từ chối
                </button>
              </div>
            ) : (
              <span className="muted">{item.reviewedByUserId ? `NV #${item.reviewedByUserId}` : '—'}</span>
            ),
          },
        ]}
      />
    </section>

    {/* Create / Confirm / Reject / Upload Modal */}
    {mode && (
      <Modal
        title={
          mode === 'create'
            ? 'Ghi nhận thanh toán'
            : mode === 'confirm'
            ? 'Xác nhận đã thu tiền'
            : mode === 'uploadReceipt'
            ? 'Tải lên thêm biên lai chuyển khoản'
            : 'Từ chối thanh toán'
        }
        description={
          mode === 'confirm'
            ? 'Chỉ xác nhận sau khi đã kiểm tra tiền thực nhận và đối chiếu tất cả biên lai.'
            : mode === 'uploadReceipt'
            ? 'Biên lai mới sẽ được bổ sung vào bộ sưu tập chứng từ của giao dịch này (ảnh cũ được bảo lưu vĩnh viễn).'
            : undefined
        }
        onClose={() => { setMode(''); setSelected(null); }}
      >
        <form className="form-stack" onSubmit={save}>
          {mode === 'create' && <>
            <label className="field-label">
              Hóa đơn
              <select name="invoiceId" required defaultValue={invoiceId}>
                <option value="">Chọn hóa đơn chờ thanh toán</option>
                {pendingInvoices.map(invoice => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.number} · {formatMoney(invoice.totalAmount)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Số tiền (VND)
              <input
                name="amount"
                type="number"
                min="0.01"
                step="1"
                required
                defaultValue={pendingInvoices.find(invoice => String(invoice.id) === String(invoiceId))?.totalAmount || ''}
              />
            </label>
            <label className="field-label">
              Phương thức
              <select name="method" defaultValue="BankTransfer">
                <option value="BankTransfer">Chuyển khoản</option>
                <option value="Cash">Tiền mặt</option>
              </select>
            </label>
            <label className="field-label">
              Ảnh biên lai chuyển khoản đợt 1 (tùy chọn)
              <input name="receiptFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
            </label>
          </>}

          {mode === 'confirm' && <>
            <p className="confirmation-amount">
              {formatMoney(selected?.amount)} <span>· {selected?.method === 'BankTransfer' ? 'Chuyển khoản' : 'Tiền mặt'}</span>
            </p>
            <label className="field-label">
              Tải thêm ảnh biên lai chuyển khoản nếu có (tùy chọn)
              <input name="receiptFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
            </label>
            <label className="field-label">
              Mã giao dịch ngân hàng
              <input
                name="reference"
                maxLength="100"
                required={selected?.method === 'BankTransfer'}
                placeholder={selected?.method === 'BankTransfer' ? 'Bắt buộc với chuyển khoản' : 'Không bắt buộc'}
              />
            </label>
          </>}

          {mode === 'uploadReceipt' && <>
            <p className="confirmation-amount">
              {formatMoney(selected?.amount)} <span>· PAY-{String(selected?.id).padStart(5, '0')}</span>
            </p>
            <label className="field-label">
              Chọn tệp biên lai (JPG, PNG, WEBP, PDF - tối đa 5MB)
              <input name="receiptFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required />
            </label>
            <div className="sub-info-notice" style={{ margin: '8px 0' }}>
              <p>🔒 <strong>Quy định đối soát:</strong> Biên lai đã tải lên được lưu trữ cố định vào nhật ký kế toán và không thể bị xóa để đảm bảo minh bạch tài chính.</p>
            </div>
          </>}

          {mode === 'reject' && (
            <label className="field-label">
              Lý do từ chối
              <textarea name="reason" rows={4} required minLength={3} maxLength={500} />
            </label>
          )}

          {mode === 'confirm' && (
            <p className="form-helper">Xác nhận sẽ cập nhật hóa đơn và kích hoạt subscription trong cùng transaction.</p>
          )}

          <Notice error={error} />
          <div className="form-actions">
            <button className="button button-quiet" type="button" onClick={() => setMode('')}>
              Hủy
            </button>
            <button
              className={`button ${mode === 'reject' ? 'button-danger' : 'button-primary'}`}
              disabled={saving}
            >
              {saving
                ? 'Đang xử lý…'
                : mode === 'confirm'
                ? 'Xác nhận đã thu'
                : mode === 'reject'
                ? 'Từ chối giao dịch'
                : mode === 'uploadReceipt'
                ? 'Tải lên thêm biên lai'
                : 'Ghi nhận chờ xác nhận'}
            </button>
          </div>
        </form>
      </Modal>
    )}

    {/* Multi-Bill Gallery Modal */}
    {galleryPayment && (
      <Modal
        title={`Bộ Sưu Tập Biên Lai: PAY-${String(galleryPayment.id).padStart(5, '0')}`}
        onClose={() => setGalleryPayment(null)}
        wide
      >
        <div className="receipt-gallery-modal">
          {/* Payment Summary Bar */}
          <div className="receipt-gallery-summary-bar">
            <div>
              <strong>Số tiền: <span style={{ color: 'var(--lime)' }}>{formatMoney(galleryPayment.amount)}</span></strong>
              <span className="summary-bar-sep">·</span>
              <span>Hình thức: {galleryPayment.method === 'BankTransfer' ? 'Chuyển khoản' : 'Tiền mặt'}</span>
              <span className="summary-bar-sep">·</span>
              <span>Trạng thái: <StatusBadge value={galleryPayment.status} /></span>
            </div>
            <div className="gallery-count-pill">
              {receiptsList.length} biên lai đối chiếu
            </div>
          </div>

          {loadingReceipts ? (
            <div className="loading-state" style={{ padding: '40px 0' }}>
              <span className="spinner spinner-dark" />
              Đang tải toàn bộ biên lai…
            </div>
          ) : receiptsList.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <FilePlus2 size={24} />
              <p>Chưa có biên lai nào được tải lên cho giao dịch này.</p>
            </div>
          ) : (
            <div className="receipt-gallery-body">
              {/* Thumbnail Strip (Multi-Bill Tabs) */}
              <div className="receipt-thumbnail-strip">
                {receiptsList.map((rec, idx) => (
                  <ReceiptThumbnailItem
                    key={rec.id || idx}
                    receipt={rec}
                    index={idx}
                    isSelected={idx === activeReceiptIndex}
                    onSelect={() => setActiveReceiptIndex(idx)}
                  />
                ))}
              </div>

              {/* Main Active Receipt Viewer */}
              {receiptsList[activeReceiptIndex] && (
                <ReceiptCanvasViewer
                  receipt={receiptsList[activeReceiptIndex]}
                  index={activeReceiptIndex}
                />
              )}
            </div>
          )}

          {/* Upload Additional Installment Bill Section */}
          <div className="receipt-upload-additional-box">
            <form onSubmit={handleUploadAdditionalBill} className="additional-upload-form">
              <div>
                <p className="additional-title">➕ Tải thêm biên lai (Khách thanh toán đợt mới)</p>
                <p className="additional-hint">Tải lên các ảnh chuyển khoản từng đợt để đối soát tổng số tiền. <strong>Không thể xóa ảnh cũ.</strong></p>
              </div>
              <div className="additional-inputs">
                <input
                  name="additionalReceipt"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  required
                  className="additional-file-input"
                />
                <button className="button button-primary" type="submit" disabled={uploadingMore}>
                  <Upload size={15} />
                  {uploadingMore ? 'Đang tải lên…' : 'Tải lên đợt mới'}
                </button>
              </div>
            </form>
          </div>

          <div className="form-actions" style={{ marginTop: '20px' }}>
            <button className="button button-primary" type="button" onClick={() => setGalleryPayment(null)}>
              Đóng bộ sưu tập
            </button>
          </div>
        </div>
      </Modal>
    )}
  </>;
}
export function CheckInsPage() {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [items, setItems] = useState([]);
  const [memberSubscriptions, setMemberSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      api('/members?page=1&pageSize=100'),
      api('/membership-plans?includeInactive=true&page=1&pageSize=100'),
    ]).then(([membersRes, plansRes]) => {
      if (active) {
        setMembers(membersRes.items || []);
        setPlans(plansRes.items || []);
      }
    }).catch(requestError => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // Fetch check-in history and active subscriptions when memberId changes
  useEffect(() => {
    if (!memberId) {
      setItems([]);
      setMemberSubscriptions([]);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setLoadingSubs(true);

    Promise.all([
      api(`/members/${memberId}/check-ins?page=1&pageSize=50`),
      api(`/members/${memberId}/subscriptions?page=1&pageSize=20`),
    ]).then(([checkInsRes, subsRes]) => {
      if (active) {
        setItems(checkInsRes.items || []);
        setMemberSubscriptions(subsRes.items || []);
        setError('');
      }
    }).catch(requestError => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) {
        setLoading(false);
        setLoadingSubs(false);
      }
    });

    return () => { active = false; };
  }, [memberId, version]);

  const selectedMember = members.find(member => String(member.id) === String(memberId));

  // Determine eligibility status for gym floor entry
  const eligibility = React.useMemo(() => {
    if (!selectedMember) return null;

    if (selectedMember.status !== 'Active') {
      return {
        status: 'BLOCKED',
        label: 'TÀI KHOẢN TẠM KHÓA / TẠM DỪNG',
        reason: 'Hồ sơ hội viên đang ở trạng thái không hoạt động. Vui lòng kiểm tra lại tài khoản trước khi cho vào tập.',
        canCheckIn: false,
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const activeSub = memberSubscriptions.find(sub => {
      if (sub.status !== 'Active') return false;
      return sub.startsOn <= todayStr && sub.endsOn >= todayStr;
    });

    if (activeSub) {
      const plan = plans.find(p => p.id === activeSub.membershipPlanId);
      const endsDate = new Date(activeSub.endsOn);
      const remainingDays = Math.max(0, Math.ceil((endsDate - new Date()) / (1000 * 60 * 60 * 24)));
      return {
        status: 'VALID',
        label: 'ĐỦ ĐIỀU KIỆN VÀO TẬP',
        planName: plan?.name || `Gói #${activeSub.membershipPlanId}`,
        period: `${formatDate(activeSub.startsOn)} → ${formatDate(activeSub.endsOn)}`,
        remainingDays,
        canCheckIn: true,
      };
    }

    // Check if expired
    const expiredSub = memberSubscriptions.find(sub => sub.status === 'Active' || sub.status === 'Expired');
    if (expiredSub) {
      const plan = plans.find(p => p.id === expiredSub.membershipPlanId);
      return {
        status: 'EXPIRED',
        label: 'GÓI TẬP ĐÃ HẾT HẠN',
        planName: plan?.name || `Gói #${expiredSub.membershipPlanId}`,
        expiredDate: formatDate(expiredSub.endsOn),
        reason: `Gói tập gần nhất "${plan?.name || ''}" đã hết hạn từ ngày ${formatDate(expiredSub.endsOn)}. Hội viên cần gia hạn để tiếp tục vào sàn tập.`,
        canCheckIn: false,
        expiredSubId: expiredSub.id,
      };
    }

    // Check if pending payment
    const pendingSub = memberSubscriptions.find(sub => sub.status === 'PendingPayment');
    if (pendingSub) {
      const plan = plans.find(p => p.id === pendingSub.membershipPlanId);
      return {
        status: 'PENDING_PAYMENT',
        label: 'ĐĂNG KÝ ĐANG CHỜ THANH TOÁN',
        reason: `Hội viên có gói "${plan?.name || ''}" đang chờ thanh toán. Cần thu phí và xác nhận trước khi vào tập.`,
        canCheckIn: false,
      };
    }

    return {
      status: 'NO_PLAN',
      label: 'CHƯA ĐĂNG KÝ GÓI TẬP NÀO',
      reason: 'Hội viên chưa có bất kỳ gói tập nào trong hệ thống. Vui lòng đăng ký gói tập mới.',
      canCheckIn: false,
    };
  }, [selectedMember, memberSubscriptions, plans]);

  const filteredMembers = members.filter(member => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase().trim();
    return (
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(q) ||
      (member.phone && member.phone.includes(q)) ||
      String(member.id).includes(q)
    );
  });

  async function checkIn() {
    if (!memberId || !eligibility?.canCheckIn) return;
    setError(''); setSuccess(''); setSaving(true);
    const memberName = selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : `#${memberId}`;
    try {
      await api('/check-ins', { method: 'POST', body: JSON.stringify({ memberId: Number(memberId) }) });
      playCheckinSuccess();
      toast.success(`Hội viên ${memberName} đã check-in thành công. Chúc buổi tập bùng nổ năng lượng!`, 'Vào sàn thành công');
      setSuccess(`Đã ghi nhận lượt vào cho ${memberName}.`);
      setVersion(value => value + 1);
    } catch (requestError) {
      playCheckinError();
      const msg = requestError.message === 'NoValidSubscription'
        ? 'Hội viên không có gói tập đang hiệu lực.'
        : requestError.message === 'MemberNotActive'
        ? 'Tài khoản hội viên đang bị khóa hoặc tạm ngừng.'
        : requestError.message;
      toast.error(msg, 'Từ chối vào sàn');
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickRenew(subId) {
    if (!subId) return;
    try {
      await api(`/subscriptions/${subId}/renew`, { method: 'POST' });
      toast.success('Đã tạo đăng ký gia hạn chờ thanh toán thành công!', 'Gia hạn gói');
      setVersion(v => v + 1);
    } catch (err) {
      toast.error(err.message, 'Lỗi gia hạn');
    }
  }

  return <>
    <PageHeader
      eyebrow="FLOOR OPERATIONS"
      title="Quầy Kiểm Soát Vào Cửa (Check-in)"
      description="Nghiệp vụ quầy lễ tân: Tra cứu thông tin, đối soát gói tập đang hiệu lực và cấp quyền vào sàn tập thể hình."
    />
    <Notice error={error} success={success} />

    {/* Front Desk Check-in Console */}
    <section className="checkin-console">
      <div className="checkin-console-copy">
        <p className="eyebrow">FAST CHECK-IN CONSOLE</p>
        <h2>Xác thực quyền vào sàn</h2>
        <p>Tìm nhanh hội viên bằng Số điện thoại, Mã hội viên hoặc Họ tên để kiểm tra tình trạng thẻ tập.</p>
      </div>

      <div className="checkin-quick-search-box">
        {/* Search & Select Row */}
        <div className="checkin-search-row">
          <label className="field-label" style={{ flex: 1.2 }}>
            Nhập SĐT hoặc Tên hội viên
            <div className="search-input-wrap">
              <Search size={15} className="input-search-icon" />
              <input
                type="text"
                className="checkin-filter-input"
                placeholder="Ví dụ: 0988123456 hoặc Nguyễn Văn…"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                autoFocus
              />
            </div>
          </label>
          <label className="field-label" style={{ flex: 1.8 }}>
            Hội viên được tìm thấy ({filteredMembers.length})
            <select
              value={memberId}
              onChange={event => setMemberId(event.target.value)}
              className="checkin-member-select"
            >
              <option value="">-- Chọn hội viên xuất trình thẻ --</option>
              {filteredMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName} · SĐT: {member.phone || 'Chưa có'} · ID #{member.id}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Member Profile & Real Gym Business Eligibility Card */}
        {selectedMember && (
          <div className="checkin-verification-block">
            {/* Member Identity Header */}
            <div className="checkin-member-card">
              <div className="checkin-member-avatar">
                {(selectedMember.firstName || 'M').slice(0, 1).toUpperCase()}
              </div>
              <div className="checkin-member-meta">
                <div className="member-name-row">
                  <strong>{selectedMember.firstName} {selectedMember.lastName}</strong>
                  <span className="member-code-badge">ID #{selectedMember.id}</span>
                </div>
                <div className="checkin-member-sub">
                  <span>📞 SĐT: <strong>{selectedMember.phone || '—'}</strong></span>
                  <span>✉️ Email: {selectedMember.email || '—'}</span>
                  <span>Trạng thái: <StatusBadge value={selectedMember.status} /></span>
                </div>
              </div>
            </div>

            {/* Eligibility Result Banner */}
            {loadingSubs ? (
              <div className="eligibility-loading">Đang kiểm tra gói tập hội viên…</div>
            ) : eligibility && (
              <div className={`checkin-eligibility-card eligibility-${eligibility.status.toLowerCase()}`}>
                <div className="eligibility-header">
                  <div className="eligibility-status-tag">
                    {eligibility.status === 'VALID' ? '✅ ' : '⛔ '}
                    {eligibility.label}
                  </div>
                  {eligibility.status === 'VALID' && (
                    <span className="eligibility-countdown-badge">
                      🔥 Còn <strong>{eligibility.remainingDays} ngày</strong> tập
                    </span>
                  )}
                </div>

                {eligibility.status === 'VALID' ? (
                  <div className="eligibility-details">
                    <p>
                      Gói tập đang dùng: <strong>{eligibility.planName}</strong>
                    </p>
                    <p className="eligibility-date">
                      Thời hạn: {eligibility.period}
                    </p>
                  </div>
                ) : (
                  <div className="eligibility-details">
                    <p className="eligibility-reason">{eligibility.reason}</p>
                    {/* Action buttons to resolve right at the front desk */}
                    <div className="eligibility-actions">
                      {eligibility.status === 'EXPIRED' && eligibility.expiredSubId && (
                        <button
                          type="button"
                          className="button button-primary button-small"
                          onClick={() => handleQuickRenew(eligibility.expiredSubId)}
                        >
                          <Repeat2 size={15} /> Gia hạn gói tập ngay
                        </button>
                      )}
                      <Link to="/subscriptions" className="button button-quiet button-small">
                        <Plus size={15} /> Mở trang Đăng ký gói tập
                      </Link>
                      <Link to="/payments" className="button button-quiet button-small">
                        <CreditCard size={15} /> Kiểm tra thanh toán
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Check-in Trigger Action */}
            <div className="checkin-action-row">
              <button
                className="button button-primary button-checkin button-large"
                disabled={!memberId || saving || !eligibility?.canCheckIn}
                onClick={checkIn}
                type="button"
                title={eligibility?.canCheckIn ? 'Bấm để ghi nhận lượt vào' : 'Không đủ điều kiện vào tập'}
              >
                <ScanLine size={20} />
                {saving
                  ? 'Đang ghi nhận…'
                  : eligibility?.canCheckIn
                  ? 'XÁC NHẬN CHO VÀO SÀN TẬP'
                  : 'TỪ CHỐI CHO VÀO TẬP'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>

    {/* Check-in History Table */}
    <section className="table-panel">
      <div className="table-toolbar">
        <div>
          <p className="eyebrow">FLOOR ACCESS LOGS</p>
          <h2>{selectedMember ? `Nhật ký vào sàn: ${selectedMember.firstName} ${selectedMember.lastName}` : 'Lịch sử lượt vào phòng tập'}</h2>
        </div>
        <span className="panel-count">{items.length} lượt</span>
      </div>
      <TableFrame
        loading={loading}
        rows={items}
        emptyTitle={memberId ? 'Hội viên chưa có lượt check-in nào' : 'Chọn hội viên ở trên để xem nhật ký vào sàn'}
        emptyDescription="Dữ liệu được cập nhật tự động theo thời gian thực."
        columns={[
          {
            key: 'checkedInAtUtc',
            label: 'Thời gian vào',
            render: item => (
              <div>
                <strong>{new Intl.DateTimeFormat('vi-VN', { timeStyle: 'short' }).format(new Date(item.checkedInAtUtc))}</strong>
                <small className="table-subline">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(item.checkedInAtUtc))}</small>
              </div>
            ),
          },
          { key: 'method', label: 'Hình thức', render: item => item.method === 'Staff' ? 'Quầy lễ tân xác nhận' : item.method },
          { key: 'recordedByUserId', label: 'Nhân viên trực', render: item => `Nhân viên #${item.recordedByUserId}` },
        ]}
      />
    </section>
  </>;
}

export function ReportsPage() {
  const today = dateInputValue();
  const monthAgo = dateInputValue(new Date(Date.now() - 29 * 86_400_000));
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!from || !to || from > to) return;
    let active = true;
    const query = `?from=${from}&to=${to}`;
    setLoading(true);
    Promise.all([
      api(`/reports/dashboard${query}`),
      api(`/reports/revenue${query}`),
      api('/reports/members'),
      api(`/reports/check-ins${query}`),
    ]).then(([dashboard, revenue, members, checkIns]) => {
      if (active) { setData({ dashboard, revenue, members, checkIns }); setError(''); }
    }).catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to, version]);

  return <>
    <PageHeader eyebrow="REPORTING" title="Báo cáo" description="Tổng hợp hội viên, doanh thu và lượt check-in theo khoảng ngày." action={<button className="button button-quiet" onClick={() => setVersion(value => value + 1)}><RefreshCw size={16} />Làm mới</button>} />
    <form className="report-filter" onSubmit={event => { event.preventDefault(); setVersion(value => value + 1); }}><label className="field-label">Từ ngày<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label className="field-label">Đến ngày<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label><button className="button button-primary" disabled={from > to || loading}>Áp dụng kỳ báo cáo</button>{from > to && <span className="inline-error">Ngày bắt đầu phải trước ngày kết thúc.</span>}</form>
    <Notice error={error} />
    {loading ? <LoadingState /> : data && <>
      <section className="metric-grid report-metrics">
        <Metric label="Doanh thu đã thu" value={formatMoney(data.revenue.totalRevenue)} accent="lime" detail={`${data.revenue.paidInvoiceCount} hóa đơn đã thanh toán`} />
        <Metric label="Hội viên đang hoạt động" value={data.members.activeMembers} accent="blue" detail={`${data.members.nonActiveMembers} hội viên không hoạt động`} />
        <Metric label="Lượt check-in" value={data.checkIns.checkInCount} accent="orange" detail={`${data.checkIns.uniqueMembers} hội viên riêng biệt`} />
        <Metric label="Gói sắp hết hạn" value={data.dashboard.subscriptionsExpiringInSevenDays} accent="coral" detail="Trong 7 ngày tới" />
      </section>
      <section className="report-detail"><div><p className="eyebrow">PERIOD</p><h2>{formatDate(data.revenue.from)} — {formatDate(data.revenue.to)}</h2><p className="muted">Khoảng thời gian được tính theo UTC.</p></div><div className="report-total"><span>Tổng doanh thu</span><strong>{formatMoney(data.revenue.totalRevenue)}</strong><small>{data.revenue.paidInvoiceCount} giao dịch hóa đơn</small></div></section>
    </>}
  </>;
}

function Metric({ label, value, accent, detail }) {
  return <article className={`metric metric-${accent}`}><div className="metric-top"><span>{label}</span><CircleDollarSign size={16} /></div><strong>{value}</strong><small>{detail}</small></article>;
}

export function StaffPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api('/users')
      .then(data => {
        if (active) {
          setItems(Array.isArray(data) ? data : []);
          setError('');
        }
      })
      .catch(err => {
        if (active) {
          setError(err.message);
          toast.error(err.message, 'Lỗi tải danh sách nhân viên');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [version]);

  async function handleCreateStaff(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));

    try {
      const result = await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: values.email.trim(),
          displayName: values.displayName.trim(),
          password: values.password,
        }),
      });
      toast.success(`Đã tạo tài khoản cho ${result.displayName}`, 'Thành công');
      setSuccess(`Đã cấp tài khoản thành công: ${result.displayName} (${result.email})`);
      setShowCreateModal(false);
      setVersion(v => v + 1);
    } catch (err) {
      setError(err.message);
      toast.error(err.message, 'Lỗi tạo nhân viên');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(user) {
    const isLocking = user.isActive;
    const confirmMessage = isLocking
      ? `Khóa tài khoản "${user.displayName}"?\n\nMọi phiên đăng nhập của nhân viên này sẽ bị thu hồi ngay lập tức qua Security Stamp.`
      : `Mở khóa tài khoản cho "${user.displayName}"?`;

    if (!window.confirm(confirmMessage)) return;

    setTogglingId(user.id);
    setError('');
    setSuccess('');
    try {
      const updated = await api(`/users/${user.id}/toggle-status`, { method: 'PUT' });
      if (updated.isActive) {
        toast.success(`Đã mở khóa: ${updated.displayName}`);
        setSuccess(`Đã kích hoạt lại tài khoản ${updated.displayName}.`);
      } else {
        toast.info(`Đã khóa: ${updated.displayName}`);
        setSuccess(`Đã khóa tài khoản ${updated.displayName} và thu hồi phiên đăng nhập.`);
      }
      setVersion(v => v + 1);
    } catch (err) {
      setError(err.message);
      toast.error(err.message, 'Thao tác thất bại');
    } finally {
      setTogglingId(null);
    }
  }

  const filtered = items.filter(u => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      u.displayName?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  });

  const activeCount = items.filter(u => u.isActive).length;
  const adminCount = items.filter(u => u.roles?.includes('Admin')).length;

  return (
    <>
      <PageHeader
        eyebrow="ACCESS CONTROL"
        title="Quản Lý Nhân Viên"
        description="Danh sách tài khoản vận hành, phân quyền quầy và thu hồi phiên truy cập tức thì."
        action={
          <button
            className="button button-primary"
            onClick={() => { setError(''); setSuccess(''); setShowCreateModal(true); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={16} /> Thêm nhân viên
          </button>
        }
      />

      <Notice error={error} success={success} />

      <section className="table-panel">
        <div className="table-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <strong>{filtered.length}</strong>
            <span>nhân sự</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: '12.5px', color: '#4ade80' }}>● {activeCount} hoạt động</span>
            {items.length - activeCount > 0 && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span style={{ fontSize: '12.5px', color: '#f87171' }}>● {items.length - activeCount} đã khóa</span>
              </>
            )}
          </div>
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Tìm kiếm nhân viên"
              placeholder="Tìm theo tên, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
        </div>

        <TableFrame
          loading={loading}
          rows={filtered}
          emptyTitle="Không tìm thấy nhân viên"
          emptyDescription={search ? "Không có nhân sự khớp với từ khóa tìm kiếm." : "Chưa có nhân viên nào trong danh sách."}
          columns={[
            {
              key: 'id',
              label: 'Mã NV',
              render: item => (
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  #NV-{String(item.id).padStart(3, '0')}
                </span>
              ),
            },
            {
              key: 'displayName',
              label: 'Nhân viên',
              render: item => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="staff-avatar-badge">
                    {item.displayName?.[0] || 'U'}
                  </div>
                  <div>
                    <strong>{item.displayName}</strong>
                    <small className="table-subline">{item.email}</small>
                  </div>
                </div>
              ),
            },
            {
              key: 'roles',
              label: 'Vai trò',
              render: item => (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {item.roles?.map(role => (
                    <span
                      key={role}
                      className={role === 'Admin' ? 'role-badge-admin' : 'role-badge-staff'}
                    >
                      {role === 'Admin' ? 'Admin' : 'Staff'}
                    </span>
                  ))}
                </div>
              ),
            },
            {
              key: 'status',
              label: 'Trạng thái',
              render: item => (
                <span className={item.isActive ? 'staff-status-active' : 'staff-status-locked'}>
                  <span className="dot" />
                  {item.isActive ? 'Hoạt động' : 'Đã khóa'}
                </span>
              ),
            },
            {
              key: 'actions',
              label: 'Thao tác',
              render: item => {
                const isToggling = togglingId === item.id;
                const isOnlyAdmin = item.roles?.includes('Admin') && adminCount <= 1;
                return (
                  <div className="table-actions">
                    {item.isActive ? (
                      <button
                        className="button button-small button-danger-quiet"
                        type="button"
                        disabled={isToggling || isOnlyAdmin}
                        title={isOnlyAdmin ? 'Không thể khóa Admin duy nhất' : 'Khóa tài khoản và thu hồi token tức thì'}
                        onClick={() => handleToggleStatus(item)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Lock size={12} />
                        {isToggling ? 'Đang khóa…' : 'Khóa'}
                      </button>
                    ) : (
                      <button
                        className="button button-small button-outline"
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggleStatus(item)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Unlock size={12} />
                        {isToggling ? 'Đang mở…' : 'Mở khóa'}
                      </button>
                    )}
                  </div>
                );
              },
            },
          ]}
        />
      </section>

      {/* Modal Cấp Tài Khoản Mới */}
      {showCreateModal && (
        <Modal
          title="Thêm tài khoản nhân viên"
          description="Cấp quyền truy cập hệ thống vận hành và tiếp đón hội viên."
          onClose={() => setShowCreateModal(false)}
        >
          <form className="form-stack" onSubmit={handleCreateStaff}>
            <label className="field-label">
              Tên nhân viên
              <input name="displayName" required maxLength="120" placeholder="VD: Nguyễn Văn A (Lễ tân)" />
            </label>
            <label className="field-label">
              Email đăng nhập
              <input name="email" type="email" required maxLength="254" placeholder="nhanvien@phongtap.vn" />
            </label>
            <label className="field-label">
              Mật khẩu tạm thời
              <input
                name="password"
                type="password"
                required
                minLength="12"
                maxLength="128"
                autoComplete="new-password"
                placeholder="Tối thiểu 12 ký tự (hoa, thường, số & ký tự đặc biệt)"
              />
            </label>
            <Notice error={error} />
            <div className="form-actions">
              <button className="button button-quiet" type="button" onClick={() => setShowCreateModal(false)}>
                Hủy
              </button>
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? 'Đang tạo…' : 'Tạo tài khoản'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}