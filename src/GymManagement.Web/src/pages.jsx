import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Check,
  CircleDollarSign,
  Clock3,
  FilePlus2,
  Plus,
  RefreshCw,
  Repeat2,
  Search,
  ScanLine,
  Users,
  UserPlus,
  X,
} from 'lucide-react';
import { api, dateInputValue, formatDate, formatMoney } from './api';

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
  if (loading) return <LoadingState />;
  if (!rows.length) return <EmptyState title={emptyTitle || 'Chưa có dữ liệu'} description={emptyDescription || 'Thêm bản ghi đầu tiên để bắt đầu.'} />;
  return (
    <div className="table-scroll"><table className="data-table"><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row[rowKey] ?? index}>{columns.map(column => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody>
    </table></div>
  );
}

const resourceConfig = {
  members: {
    title: 'Hội viên', eyebrow: 'MEMBERSHIP', description: 'Hồ sơ hội viên và trạng thái tham gia.', path: '/members',
    query: search => `?page=1&pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ''}`,
    fields: [
      { name: 'firstName', label: 'Họ', required: true },
      { name: 'lastName', label: 'Tên', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Điện thoại', type: 'tel' },
      { name: 'birthDate', label: 'Ngày sinh', type: 'date' },
    ],
    columns: [
      { key: 'member', label: 'Hội viên', render: item => <><strong>{item.firstName} {item.lastName}</strong><small className="table-subline">#{item.id}</small></> },
      { key: 'email', label: 'Email', render: item => item.email || '—' },
      { key: 'phone', label: 'Điện thoại', render: item => item.phone || '—' },
      { key: 'joined', label: 'Ngày tham gia', render: item => formatDate(item.joinedAtUtc) },
      { key: 'status', label: 'Trạng thái', render: item => <StatusBadge value={item.status} /> },
    ],
    isActive: item => item.status === 'Active',
    setStatus: active => ({ status: active ? 'Inactive' : 'Active' }),
  },
  plans: {
    title: 'Gói tập', eyebrow: 'MEMBERSHIP', description: 'Danh mục gói và giá bán hiện tại.', path: '/membership-plans',
    query: search => `?includeInactive=true&page=1&pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ''}`,
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
    title: 'Huấn luyện viên', eyebrow: 'PEOPLE', description: 'Hồ sơ và chuyên môn huấn luyện viên.', path: '/trainers',
    query: search => `?includeInactive=true&page=1&pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ''}`,
    fields: [
      { name: 'firstName', label: 'Họ', required: true },
      { name: 'lastName', label: 'Tên', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Điện thoại', type: 'tel' },
      { name: 'specialty', label: 'Chuyên môn' },
    ],
    columns: [
      { key: 'name', label: 'Huấn luyện viên', render: item => <><strong>{item.firstName} {item.lastName}</strong><small className="table-subline">#{item.id} · {item.email || 'Chưa có email'}</small></> },
      { key: 'specialty', label: 'Chuyên môn', render: item => item.specialty || '—' },
      { key: 'phone', label: 'Điện thoại', render: item => item.phone || '—' },
      { key: 'status', label: 'Trạng thái', render: item => <StatusBadge value={item.isActive ? 'Active' : 'Inactive'} /> },
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
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`${config.path}${config.query(search)}`)
      .then(result => { if (active) { setItems(result.items || []); setError(''); } })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [config, search, version]);

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
      <div className="table-toolbar"><div><strong>{items.length}</strong><span> bản ghi</span></div><label className="search-field"><Search size={16} /><input aria-label="Tìm kiếm" placeholder={`Tìm ${config.title.toLowerCase()}…`} value={search} onChange={event => setSearch(event.target.value)} /></label></div>
      <TableFrame columns={columns} rows={items} loading={loading} emptyTitle={`Chưa có ${config.title.toLowerCase()}`} emptyDescription="Tạo bản ghi mới để bắt đầu quản lý." />
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
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [items, setItems] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([api('/members?page=1&pageSize=100'), api('/membership-plans?includeInactive=false&page=1&pageSize=100')])
      .then(([memberResult, planResult]) => { if (active) { setMembers(memberResult.items || []); setPlans(planResult.items || []); } })
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

  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await api('/subscriptions', { method: 'POST', body: JSON.stringify({ memberId: Number(values.memberId), membershipPlanId: Number(values.membershipPlanId) }) });
      setMemberId(String(result.memberId));
      setSuccess('Đã tạo đăng ký ở trạng thái chờ thanh toán.');
      setVersion(value => value + 1);
      form.reset();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  async function createInvoice(subscription) {
    setError(''); setSuccess('');
    try {
      const invoice = await api('/invoices', { method: 'POST', body: JSON.stringify({ subscriptionId: subscription.id }) });
      setSuccess(`Đã tạo hóa đơn ${invoice.number}.`);
    } catch (requestError) { setError(requestError.message); }
  }

  async function renew(subscription) {
    setError(''); setSuccess('');
    try {
      await api(`/subscriptions/${subscription.id}/renew`, { method: 'POST' });
      setSuccess('Đã tạo đăng ký gia hạn chờ thanh toán.');
      setVersion(value => value + 1);
    } catch (requestError) { setError(requestError.message); }
  }

  const selectedName = members.find(member => String(member.id) === String(memberId));
  return <>
    <PageHeader eyebrow="MEMBERSHIP" title="Đăng ký tập" description="Tạo gói mới, xem lịch sử và gia hạn đăng ký." />
    <Notice error={error} success={success} />
    <section className="work-grid">
      <form className="work-panel form-stack" onSubmit={create}>
        <div className="panel-heading"><div><p className="eyebrow">NEW SUBSCRIPTION</p><h2>Tạo đăng ký</h2></div><Repeat2 size={20} /></div>
        <label className="field-label">Hội viên<select name="memberId" required value={memberId} onChange={event => setMemberId(event.target.value)}><option value="">Chọn hội viên</option>{members.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName} · #{member.id}</option>)}</select></label>
        <label className="field-label">Gói tập<select name="membershipPlanId" required disabled={loadingOptions || !plans.length}><option value="">Chọn gói đang bán</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} · {formatMoney(plan.price)} / {plan.durationDays} ngày</option>)}</select></label>
        <p className="form-helper">Đăng ký mới ở trạng thái chờ thanh toán, chưa kích hoạt quyền check-in.</p>
        <button className="button button-primary" type="submit" disabled={saving || loadingOptions || !members.length || !plans.length}><Plus size={17} />{saving ? 'Đang tạo…' : 'Tạo đăng ký'}</button>
      </form>
      <section className="work-panel">
        <div className="panel-heading"><div><p className="eyebrow">SUBSCRIPTION HISTORY</p><h2>{selectedName ? `${selectedName.firstName} ${selectedName.lastName}` : 'Chọn hội viên'}</h2></div><span className="panel-count">{items.length}</span></div>
        {!memberId ? <EmptyState title="Chưa chọn hội viên" description="Chọn hội viên ở biểu mẫu để xem lịch sử đăng ký." /> : <TableFrame loading={loading} rows={items} emptyTitle="Chưa có đăng ký" columns={[
          { key: 'id', label: 'Mã', render: item => `#${item.id}` },
          { key: 'plan', label: 'Gói', render: item => plans.find(plan => plan.id === item.membershipPlanId)?.name || `#${item.membershipPlanId}` },
          { key: 'period', label: 'Thời hạn', render: item => item.startsOn ? `${formatDate(item.startsOn)} – ${formatDate(item.endsOn)}` : 'Chưa kích hoạt' },
          { key: 'status', label: 'Trạng thái', render: item => <StatusBadge value={item.status} /> },
          { key: 'actions', label: 'Thao tác', render: item => <div className="table-actions">{item.status === 'PendingPayment' && <button className="button button-small button-outline" onClick={() => createInvoice(item)} type="button">Tạo hóa đơn</button>}{['Active', 'Expired'].includes(item.status) && <button className="button button-small button-quiet" onClick={() => renew(item)} type="button">Gia hạn</button>}</div> },
        ]} />}
      </section>
    </section>
  </>;
}

export function InvoicesPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionId, setSubscriptionId] = useState(params.get('subscriptionId') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    api('/invoices?page=1&pageSize=100')
      .then(result => { if (active) { setItems(result.items || []); setError(''); } })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);

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
      setSuccess(`Đã tạo hóa đơn ${result.number}.`);
      setSubscriptionId(''); setParams({}); setVersion(value => value + 1);
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  return <>
    <PageHeader eyebrow="BILLING" title="Hóa đơn" description="Hóa đơn lưu giá và thời hạn gói tại thời điểm bán." />
    <Notice error={error} success={success} />
    {subscriptions.length > 0 && <form className="inline-create" onSubmit={create}><div><p className="eyebrow">PENDING SUBSCRIPTION</p><strong>Tạo hóa đơn cho hội viên #{params.get('memberId')}</strong></div><select value={subscriptionId} onChange={event => setSubscriptionId(event.target.value)} required><option value="">Chọn đăng ký chờ thanh toán</option>{subscriptions.map(item => <option key={item.id} value={item.id}>Đăng ký #{item.id}</option>)}</select><button className="button button-primary" disabled={saving}><FilePlus2 size={16} />Tạo hóa đơn</button></form>}
    <section className="table-panel"><div className="table-toolbar"><div><strong>{items.length}</strong><span> hóa đơn</span></div><p className="table-helper">Tạo hóa đơn từ đăng ký tập đang chờ thanh toán.</p></div><TableFrame loading={loading} rows={items} emptyTitle="Chưa có hóa đơn" emptyDescription="Tạo subscription và lập hóa đơn để bắt đầu ghi nhận bán hàng." columns={[
      { key: 'number', label: 'Hóa đơn', render: item => <><strong>{item.number}</strong><small className="table-subline">{formatDate(item.createdAtUtc)}</small></> },
      { key: 'memberId', label: 'Hội viên', render: item => `#${item.memberId}` },
      { key: 'plan', label: 'Gói đã bán', render: item => <><strong>{item.planNameSnapshot}</strong><small className="table-subline">{item.planDurationDaysSnapshot} ngày</small></> },
      { key: 'amount', label: 'Tổng tiền', render: item => <strong>{formatMoney(item.totalAmount)}</strong> },
      { key: 'status', label: 'Trạng thái', render: item => <StatusBadge value={item.status} /> },
      { key: 'payment', label: 'Thanh toán', render: item => item.status === 'PendingPayment' ? <Link className="table-link" to={`/payments?invoiceId=${item.id}`}>Ghi nhận <ArrowRight size={14} /></Link> : formatDate(item.paidAtUtc) },
    ]} /></section>
  </>;
}

export function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invoiceId, setInvoiceId] = useState(params.get('invoiceId') || '');
  const [mode, setMode] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const paymentQuery = invoiceId ? `&invoiceId=${encodeURIComponent(invoiceId)}` : '';
    Promise.all([api(`/payments?page=1&pageSize=100${paymentQuery}`), api('/invoices?page=1&pageSize=100')])
      .then(([paymentResult, invoiceResult]) => { if (active) { setItems(paymentResult.items || []); setInvoices(invoiceResult.items || []); setError(''); } })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [invoiceId, version]);

  async function save(event) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === 'create') {
        await api(`/invoices/${values.invoiceId}/payments`, { method: 'POST', body: JSON.stringify({ amount: Number(values.amount), method: values.method }) });
        setSuccess('Đã ghi nhận khoản thanh toán chờ xác nhận.');
      } else if (mode === 'confirm') {
        await api(`/payments/${selected.id}/confirm`, { method: 'POST', body: JSON.stringify({ reference: values.reference || null }) });
        setSuccess('Đã xác nhận thu tiền và kích hoạt đăng ký.');
      } else {
        await api(`/payments/${selected.id}/reject`, { method: 'POST', body: JSON.stringify({ reason: values.reason }) });
        setSuccess('Đã từ chối khoản thanh toán.');
      }
      setMode(''); setSelected(null); setVersion(value => value + 1);
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  const pendingInvoices = invoices.filter(invoice => invoice.status === 'PendingPayment');
  return <>
    <PageHeader eyebrow="BILLING" title="Thanh toán nội bộ" description="Nhân viên kiểm tra và xác nhận tiền mặt hoặc chuyển khoản." action={<button className="button button-primary" onClick={() => { setError(''); setMode('create'); }}><Plus size={17} />Ghi nhận thanh toán</button>} />
    <Notice error={error} success={success} />
    <section className="table-panel"><div className="table-toolbar"><div><strong>{items.length}</strong><span> giao dịch</span></div><select className="filter-select" aria-label="Lọc hóa đơn" value={invoiceId} onChange={event => { setInvoiceId(event.target.value); setParams(event.target.value ? { invoiceId: event.target.value } : {}); }}><option value="">Tất cả hóa đơn</option>{invoices.map(invoice => <option key={invoice.id} value={invoice.id}>{invoice.number}</option>)}</select></div><TableFrame loading={loading} rows={items} emptyTitle="Chưa có giao dịch" emptyDescription="Ghi nhận thanh toán từ một hóa đơn đang chờ." columns={[
      { key: 'id', label: 'Giao dịch', render: item => <><strong>PAY-{String(item.id).padStart(5, '0')}</strong><small className="table-subline">{formatDate(item.createdAtUtc)}</small></> },
      { key: 'invoiceId', label: 'Hóa đơn', render: item => invoices.find(invoice => invoice.id === item.invoiceId)?.number || `#${item.invoiceId}` },
      { key: 'amount', label: 'Số tiền', render: item => <strong>{formatMoney(item.amount)}</strong> },
      { key: 'method', label: 'Phương thức', render: item => item.method === 'BankTransfer' ? 'Chuyển khoản' : 'Tiền mặt' },
      { key: 'status', label: 'Trạng thái', render: item => <StatusBadge value={item.status} /> },
      { key: 'reference', label: 'Mã tham chiếu', render: item => item.reference || item.adjustmentReason || '—' },
      { key: 'actions', label: 'Xử lý', render: item => item.status === 'PendingConfirmation' ? <div className="table-actions"><button className="button button-small button-primary" onClick={() => { setSelected(item); setMode('confirm'); }} type="button">Xác nhận</button><button className="button button-small button-danger-quiet" onClick={() => { setSelected(item); setMode('reject'); }} type="button">Từ chối</button></div> : <span className="muted">{item.reviewedByUserId ? `NV #${item.reviewedByUserId}` : '—'}</span> },
    ]} /></section>
    {mode && <Modal title={mode === 'create' ? 'Ghi nhận thanh toán' : mode === 'confirm' ? 'Xác nhận đã thu tiền' : 'Từ chối thanh toán'} description={mode === 'confirm' ? 'Chỉ xác nhận sau khi đã kiểm tra tiền thực nhận.' : undefined} onClose={() => { setMode(''); setSelected(null); }}>
      <form className="form-stack" onSubmit={save}>
        {mode === 'create' && <>
          <label className="field-label">Hóa đơn<select name="invoiceId" required defaultValue={invoiceId}><option value="">Chọn hóa đơn chờ thanh toán</option>{pendingInvoices.map(invoice => <option key={invoice.id} value={invoice.id}>{invoice.number} · {formatMoney(invoice.totalAmount)}</option>)}</select></label>
          <label className="field-label">Số tiền (VND)<input name="amount" type="number" min="0.01" step="1" required defaultValue={pendingInvoices.find(invoice => String(invoice.id) === String(invoiceId))?.totalAmount || ''} /></label>
          <label className="field-label">Phương thức<select name="method" defaultValue="Cash"><option value="Cash">Tiền mặt</option><option value="BankTransfer">Chuyển khoản</option></select></label>
        </>}
        {mode === 'confirm' && <><p className="confirmation-amount">{formatMoney(selected?.amount)} <span>· {selected?.method === 'BankTransfer' ? 'Chuyển khoản' : 'Tiền mặt'}</span></p><label className="field-label">Mã giao dịch ngân hàng<input name="reference" maxLength="100" required={selected?.method === 'BankTransfer'} placeholder={selected?.method === 'BankTransfer' ? 'Bắt buộc với chuyển khoản' : 'Không bắt buộc'} /></label></>}
        {mode === 'reject' && <label className="field-label">Lý do từ chối<textarea name="reason" rows="4" required minLength="3" maxLength="500" /></label>}
        {mode === 'confirm' && <p className="form-helper">Xác nhận sẽ cập nhật hóa đơn và kích hoạt subscription trong cùng transaction.</p>}
        <Notice error={error} />
        <div className="form-actions"><button className="button button-quiet" type="button" onClick={() => setMode('')}>Hủy</button><button className={`button ${mode === 'reject' ? 'button-danger' : 'button-primary'}`} disabled={saving}>{saving ? 'Đang xử lý…' : mode === 'confirm' ? 'Xác nhận đã thu' : mode === 'reject' ? 'Từ chối giao dịch' : 'Ghi nhận chờ xác nhận'}</button></div>
      </form>
    </Modal>}
  </>;
}

export function CheckInsPage() {
  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    api('/members?page=1&pageSize=100').then(result => { if (active) setMembers(result.items || []); }).catch(requestError => { if (active) setError(requestError.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!memberId) { setItems([]); return undefined; }
    let active = true;
    setLoading(true);
    api(`/members/${memberId}/check-ins?page=1&pageSize=100`).then(result => { if (active) { setItems(result.items || []); setError(''); } }).catch(requestError => { if (active) setError(requestError.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [memberId, version]);

  async function checkIn() {
    if (!memberId) return;
    setError(''); setSuccess(''); setSaving(true);
    try {
      await api('/check-ins', { method: 'POST', body: JSON.stringify({ memberId: Number(memberId) }) });
      setSuccess('Đã ghi nhận check-in.'); setVersion(value => value + 1);
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  const selectedMember = members.find(member => String(member.id) === String(memberId));
  return <>
    <PageHeader eyebrow="FLOOR OPERATIONS" title="Check-in" description="Chỉ hội viên có gói đang hiệu lực mới được ghi nhận lượt vào." />
    <Notice error={error} success={success} />
    <section className="checkin-console">
      <div className="checkin-console-copy"><p className="eyebrow">MEMBER ENTRY</p><h2>Ghi nhận lượt vào.</h2><p>Hệ thống xác minh trạng thái hội viên và ngày hiệu lực subscription trước khi lưu.</p></div>
      <div className="checkin-controls"><label className="field-label">Tìm hội viên<select value={memberId} onChange={event => setMemberId(event.target.value)}><option value="">Chọn hội viên</option>{members.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName} · #{member.id}</option>)}</select></label><button className="button button-primary button-checkin" disabled={!memberId || saving} onClick={checkIn}><ScanLine size={18} />{saving ? 'Đang ghi nhận…' : 'Ghi check-in'}</button>{selectedMember && <span className="form-helper">Đang chọn: {selectedMember.firstName} {selectedMember.lastName}</span>}</div>
    </section>
    <section className="table-panel"><div className="table-toolbar"><div><p className="eyebrow">MEMBER HISTORY</p><h2>{selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : 'Lịch sử check-in'}</h2></div><span className="panel-count">{items.length}</span></div><TableFrame loading={loading} rows={items} emptyTitle={memberId ? 'Chưa có lượt check-in' : 'Chọn hội viên để xem lịch sử'} emptyDescription="Lịch sử được sắp theo thời gian mới nhất." columns={[
      { key: 'checkedInAtUtc', label: 'Thời gian', render: item => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.checkedInAtUtc)) },
      { key: 'method', label: 'Phương thức', render: item => item.method },
      { key: 'recordedByUserId', label: 'Nhân viên ghi nhận', render: item => `#${item.recordedByUserId}` },
    ]} /></section>
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
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function create(event) {
    event.preventDefault(); setError(''); setSuccess(''); setSaving(true);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      const result = await api('/users', { method: 'POST', body: JSON.stringify({ email: values.email.trim(), displayName: values.displayName.trim(), password: values.password }) });
      setStaff(result); setSuccess('Đã tạo tài khoản Staff. Hãy gửi thông tin đăng nhập qua kênh bảo mật.'); form.reset();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  return <>
    <PageHeader eyebrow="ACCESS CONTROL" title="Tài khoản nhân viên" description="Tạo tài khoản Staff. Chỉ Admin được phép truy cập màn hình này." />
    <Notice error={error} success={success} />
    <section className="work-grid staff-grid"><form className="work-panel form-stack" onSubmit={create}><div className="panel-heading"><div><p className="eyebrow">NEW STAFF</p><h2>Cấp quyền truy cập</h2></div><UserPlus size={20} /></div>
      <label className="field-label">Tên hiển thị<input name="displayName" required maxLength="120" /></label>
      <label className="field-label">Email<input name="email" type="email" required maxLength="254" /></label>
      <label className="field-label">Mật khẩu tạm thời<input name="password" type="password" required minLength="12" maxLength="128" autoComplete="new-password" /></label>
      <p className="form-helper">Ít nhất 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt. Chuyển thông tin qua kênh bảo mật.</p>
      <button className="button button-primary" disabled={saving}>{saving ? 'Đang tạo…' : 'Tạo tài khoản Staff'}</button>
    </form>
    <section className="work-panel staff-result"><p className="eyebrow">ACCESS POLICY</p><h2>Quyền được cấp</h2><div className="role-line"><span className="role-symbol">A</span><div><strong>Admin</strong><small>Tạo tài khoản Staff và quản lý workspace.</small></div></div><div className="role-line"><span className="role-symbol role-staff">S</span><div><strong>Staff</strong><small>Hội viên, gói tập, thanh toán, check-in và báo cáo.</small></div></div>{staff && <div className="created-user"><span>Đã tạo</span><strong>{staff.displayName}</strong><small>{staff.email} · #{staff.id}</small></div>}</section></section>
  </>;
}