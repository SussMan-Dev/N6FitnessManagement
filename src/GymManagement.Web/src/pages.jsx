import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity,
  FileDown,
  FileSpreadsheet,
  Printer,
  Sparkles,
  AlertCircle,
  ArrowLeft,
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
  KeyRound,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  Trash2,
  X,
} from 'lucide-react';
import { api, dateInputValue, formatDate, formatMoney, getSession, uploadFile, uploadPaymentReceipt } from './api';
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
      { name: 'firstName', label: 'Họ và tên đệm', required: true, placeholder: 'VD: Nguyễn Văn' },
      { name: 'lastName', label: 'Tên', required: true, placeholder: 'VD: An' },
      { name: 'phone', label: 'Số điện thoại', type: 'tel', placeholder: 'VD: 0988123456' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'VD: member@gmail.com' },
      { name: 'birthDate', label: 'Ngày sinh', type: 'date', span: true },
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
      { name: 'name', label: 'Tên gói tập', required: true, span: true, placeholder: 'VD: Gói VIP 3 Tháng' },
      { name: 'price', label: 'Giá (VND)', type: 'number', required: true, min: '1', step: '1', integerOnly: true, placeholder: 'VD: 1500000' },
      { name: 'durationDays', label: 'Thời hạn (ngày)', type: 'number', required: true, min: '1', max: '3650', step: '1', integerOnly: true, placeholder: 'VD: 90' },
      { name: 'description', label: 'Mô tả quyền lợi', type: 'textarea', placeholder: 'Mô tả ngắn về gói tập, tiện ích đi kèm…' },
    ],
    columns: [
      { key: 'name', label: 'Tên gói', render: item => <><strong>{item.name}</strong><small className="table-subline">{item.description || 'Không có mô tả'}</small></> },
      { key: 'price', label: 'Giá', render: item => <strong>{formatMoney(item.price)}</strong> },
      { key: 'durationDays', label: 'Thời hạn', render: item => `${item.durationDays} ngày` },
      { key: 'status', label: 'Trạng thái', render: item => <StatusBadge value={item.isActive ? 'Active' : 'Inactive'} /> },
    ],
    isActive: item => item.isActive,
    setStatus: active => ({ isActive: !active }),
    convert: body => {
      const priceText = String(body.price ?? '').trim();
      if (!/^\d+$/.test(priceText) || Number(priceText) < 1) {
        throw new Error('Giá gói tập phải là số nguyên dương (không nhập dấu chấm hoặc phần thập phân).');
      }
      const durationText = String(body.durationDays ?? '').trim();
      if (!/^\d+$/.test(durationText) || Number(durationText) < 1) {
        throw new Error('Thời hạn gói tập phải là số nguyên dương.');
      }
      return { ...body, price: Number(priceText), durationDays: Number(durationText) };
    },
  },
  trainers: {
    title: 'Huấn luyện viên (PT)',
    eyebrow: 'PERSONAL TRAINERS',
    description: 'Đội ngũ Huấn luyện viên thể hình chuyên nghiệp (PT 1:1). Quản lý năng lực chuyên môn, phân bổ học viên và trạng thái sẵn sàng tiếp nhận lịch tập.',
    path: '/trainers',
    query: (search, page, pageSize) => buildQuery({ includeInactive: true, page, pageSize, search }),
    fields: [
      { name: 'firstName', label: 'Họ và tên đệm', required: true, placeholder: 'VD: Trần Minh' },
      { name: 'lastName', label: 'Tên', required: true, placeholder: 'VD: Quân' },
      { name: 'phone', label: 'Số điện thoại', type: 'tel', placeholder: 'VD: 0901234567' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'VD: pt@fitnesscenter.vn' },
      { name: 'specialty', label: 'Chuyên môn đào tạo', span: true, placeholder: 'VD: Tăng cơ, Giảm mỡ, Boxing, Yoga, Phục hồi thể lực' },
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
          <label className={`field-label ${field.type === 'textarea' || field.span ? 'field-span' : ''}`} key={field.name}>
            <span className="field-label-text">
              {field.label}
              {field.required && <span className="field-req">*</span>}
            </span>
            {field.type === 'textarea' ? (
              <textarea
                name={field.name}
                rows="3"
                placeholder={field.placeholder || ''}
                defaultValue={initial?.[field.name] || ''}
                maxLength="500"
              />
            ) : (
              <input
                name={field.name}
                type={field.type || 'text'}
                inputMode={field.integerOnly ? 'numeric' : undefined}
                placeholder={field.placeholder || ''}
                defaultValue={field.integerOnly && initial?.[field.name] != null ? Math.trunc(Number(initial[field.name])) : (initial?.[field.name] ?? '')}
                required={field.required}
                min={field.min}
                max={field.max}
                step={field.step}
                maxLength={field.type === 'email' ? 254 : 120}
                onKeyDown={field.integerOnly ? event => { if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) event.preventDefault(); } : undefined}
              />
            )}
          </label>
        ))}</div>
        <Notice error={error} />
        <div className="form-actions"><button className="button button-quiet" type="button" onClick={onClose}>Hủy thao tác</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Đang lưu thông tin…' : (initial ? 'Cập nhật thông tin' : `Thêm ${config.title.toLowerCase()}`)}</button></div>
      </form>
    </Modal>
  );
}

export function ResourcePage({ type }) {
  const toast = useToast();
  const config = resourceConfig[type];
  const isAdmin = Boolean(getSession()?.roles?.includes('Admin'));
  const canManage = type !== 'plans' || isAdmin;
  const canDelete = isAdmin && (type === 'members' || type === 'trainers' || type === 'plans');
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
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
    try {
      const payload = config.convert ? config.convert(body) : body;
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

  async function removeItem(item) {
    const displayName = item.firstName || item.lastName
      ? `${item.firstName || ''} ${item.lastName || ''}`.trim()
      : item.name || `#${item.id}`;
    if (!window.confirm(`Xóa vĩnh viễn ${config.title.toLowerCase()} "${displayName}"?\n\nHành động này không thể hoàn tác.`)) {
      return;
    }

    setDeletingId(item.id);
    setError('');
    setSuccess('');
    try {
      await api(`${config.path}/${item.id}`, { method: 'DELETE' });
      toast.success(`Đã xóa ${displayName}.`, 'Xóa thành công');
      setSuccess(`Đã xóa ${config.title.toLowerCase()} ${displayName}.`);
      setVersion(value => value + 1);
    } catch (requestError) {
      toast.error(requestError.message, 'Không thể xóa');
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  }

  const columns = canManage
    ? [
        ...config.columns,
        {
          key: 'actions',
          label: 'Thao tác',
          render: item => (
            <div className="table-actions">
              <button className="button button-small button-quiet" onClick={() => { setError(''); setModal({ item }); }} type="button" title={`Chỉnh sửa ${config.title.toLowerCase()} này`}>Chỉnh sửa</button>
              <button className="button button-small button-outline" onClick={() => toggleStatus(item)} type="button" title={config.isActive(item) ? `Tạm ngừng ${config.title.toLowerCase()} này` : `Kích hoạt ${config.title.toLowerCase()} này`}>{config.isActive(item) ? 'Tạm ngừng' : 'Kích hoạt lại'}</button>
              {canDelete && (
                <button
                  className="button button-small button-danger-quiet"
                  onClick={() => removeItem(item)}
                  disabled={deletingId === item.id}
                  type="button"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={12} />
                  {deletingId === item.id ? 'Đang xóa…' : 'Xóa'}
                </button>
              )}
            </div>
          ),
        },
      ]
    : config.columns;

  return <>
    <PageHeader
      eyebrow={config.eyebrow}
      title={config.title}
      description={config.description}
      action={canManage ? <button className="button button-primary" onClick={() => { setError(''); setModal({ item: null }); }}><Plus size={17} />{type === 'members' ? 'Thêm hội viên' : type === 'plans' ? 'Thêm gói tập' : 'Thêm huấn luyện viên'}</button> : null}
    />
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
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [renewingId, setRenewingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api('/reports/dashboard'),
      api('/reports/expiring-subscriptions?days=7'),
    ])
      .then(([dash, expList]) => {
        if (active) {
          setReport(dash);
          setExpiring(Array.isArray(expList) ? expList : []);
          setError('');
        }
      })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);

  async function quickRenew(item) {
    setRenewingId(item.subscriptionId);
    try {
      await api(`/subscriptions/${item.subscriptionId}/renew`, { method: 'POST' });
      toast.success(`Đã tạo đơn gia hạn cho ${item.memberName}.`, 'Gia hạn nhanh');
      setVersion(v => v + 1);
    } catch (err) {
      toast.error(err.message, 'Không thể gia hạn');
    } finally {
      setRenewingId(null);
    }
  }

  const stats = report ? [
    { label: 'Hội viên đang hoạt động', value: report.activeMembers, accent: 'lime' },
    { label: 'Gói tập hiệu lực', value: report.activeSubscriptions, accent: 'blue' },
    {
      label: 'Sắp hết hạn · 7 ngày',
      value: report.subscriptionsExpiringInSevenDays,
      accent: 'orange',
      onClick: () => document.getElementById('expiring-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    },
    { label: 'Doanh thu trong kỳ', value: formatMoney(report.revenueInRange), accent: 'mint' },
    { label: 'Lượt check-in', value: report.checkInsInRange, accent: 'coral' },
  ] : [];

  return <>
    <PageHeader eyebrow="OVERVIEW · HÔM NAY (UTC+7)" title="Tổng quan vận hành" description="Theo dõi nhanh hội viên, gói tập, doanh thu và lượt check-in." action={<button className="button button-quiet" onClick={() => setVersion(value => value + 1)} title="Tải lại số liệu mới nhất"><RefreshCw size={16} />Cập nhật số liệu</button>} />
    <Notice error={error} />
    {loading ? <LoadingState /> : report ? <>
      <section className="metric-grid">
        {stats.map((stat, index) => (
          <article
            className={`metric metric-${stat.accent} ${stat.onClick ? 'metric-clickable' : ''}`}
            key={stat.label}
            onClick={stat.onClick}
            title={stat.onClick ? 'Bấm để xem danh sách hội viên sắp hết hạn' : undefined}
          >
            <div className="metric-top"><span>{stat.label}</span><span className="metric-index">0{index + 1}</span></div>
            <strong>{stat.value}</strong>
            <small>{stat.onClick ? 'BẤM ĐỂ XEM DANH SÁCH ↓' : 'THEO GIỜ VIỆT NAM'}</small>
          </article>
        ))}
      </section>

      <section id="expiring-panel" className="table-panel" style={{ marginBottom: '18px' }}>
        <div className="table-toolbar">
          <div>
            <strong>{expiring.length}</strong>
            <span> hội viên sắp hết hạn trong 7 ngày tới</span>
          </div>
          <Link to="/subscriptions" className="button button-small button-quiet">
            Mở quản lý gói tập <ArrowRight size={13} />
          </Link>
        </div>
        <TableFrame
          loading={false}
          rows={expiring}
          rowKey="subscriptionId"
          emptyTitle="Không có hội viên nào sắp hết hạn trong 7 ngày tới"
          emptyDescription="Tất cả các gói tập hiện tại đều còn hạn dài."
          columns={[
            {
              key: 'memberName',
              label: 'Hội viên',
              render: item => (
                <div>
                  <strong>{item.memberName}</strong>
                  <small className="table-subline">#{item.memberId} · SĐT: {item.memberPhone || 'Chưa có'}</small>
                </div>
              ),
            },
            { key: 'planName', label: 'Gói đang tập', render: item => <strong>{item.planName}</strong> },
            {
              key: 'endsOn',
              label: 'Ngày hết hạn',
              render: item => (
                <div className="expiry-cell">
                  <span className="days-badge days-badge-warn">
                    {item.daysRemaining === 0 ? 'Hết hạn hôm nay!' : `Còn ${item.daysRemaining} ngày`}
                  </span>
                  <small className="table-subline">{formatDate(item.endsOn)}</small>
                </div>
              ),
            },
            {
              key: 'actions',
              label: 'Nhắc & Gia hạn',
              render: item => (
                <div className="table-actions">
                  <button
                    type="button"
                    className="button button-small button-primary"
                    disabled={renewingId === item.subscriptionId}
                    onClick={() => quickRenew(item)}
                  >
                    <Repeat2 size={13} /> {renewingId === item.subscriptionId ? 'Đang tạo…' : 'Gia hạn ngay'}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>

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
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [autoCreateInvoice, setAutoCreateInvoice] = useState(true);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberPicker, setShowMemberPicker] = useState(true);
  const [items, setItems] = useState([]);
  const [memberInvoices, setMemberInvoices] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busySubId, setBusySubId] = useState(null);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [version, setVersion] = useState(0);
  const memberLookup = useMemberLookup(memberSearch, 12);

  // Filter toolbar state (applied server-side)
  const [statusFilter, setStatusFilter] = useState('all');
  const { page, pageSize, setPage, setPageSize } = usePagination(10, [memberId, statusFilter]);

  useEffect(() => {
    let active = true;
    // Load all plans (including inactive) so historical subscriptions still show plan names,
    // while filtering activePlans for the create form below.
    api('/membership-plans?includeInactive=true&page=1&pageSize=100')
      .then(planResult => { if (active) setPlans(planResult.items || []); })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoadingOptions(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!memberId) { setItems([]); setTotalCount(0); return undefined; }
    let active = true;
    setLoading(true);
    api(`/members/${memberId}/subscriptions${buildQuery({ page, pageSize, status: statusFilter })}`)
      .then(result => {
        if (active) {
          setItems(result.items || []);
          setTotalCount(result.totalCount || 0);
          setError('');
        }
      })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [memberId, statusFilter, page, pageSize, version]);

  useEffect(() => {
    if (!memberId) { setMemberInvoices([]); return undefined; }
    let active = true;
    api(`/invoices${buildQuery({ memberId, page: 1, pageSize: 100 })}`)
      .then(result => { if (active) setMemberInvoices(result.items || []); })
      .catch(() => {});
    return () => { active = false; };
  }, [memberId, version]);

  const invoiceBySubId = React.useMemo(() => {
    const map = new Map();
    for (const inv of memberInvoices) {
      if (inv.status !== 'Voided' && !map.has(inv.subscriptionId)) {
        map.set(inv.subscriptionId, inv);
      }
    }
    return map;
  }, [memberInvoices]);

  const activePlans = plans.filter(plan => plan.isActive);
  const selectedPlan = activePlans.find(plan => String(plan.id) === String(selectedPlanId)) || null;
  const isMemberInactive = Boolean(selectedMember && selectedMember.status !== 'Active');

  function pickMember(member) {
    setMemberId(String(member.id));
    setSelectedMember(member);
    setShowMemberPicker(false);
    setLastInvoice(null);
    setError('');
  }

  function clearMember() {
    setMemberId('');
    setSelectedMember(null);
    setShowMemberPicker(true);
    setLastInvoice(null);
  }

  async function create(event) {
    event.preventDefault();
    if (!memberId || !selectedPlanId) {
      setError('Vui lòng chọn đầy đủ hội viên và gói tập.');
      return;
    }
    if (isMemberInactive) {
      setError('Hội viên này đang tạm ngừng hoạt động, không thể đăng ký gói mới.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    setLastInvoice(null);
    try {
      const result = await api('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          memberId: Number(memberId),
          membershipPlanId: Number(selectedPlanId),
        }),
      });
      setMemberId(String(result.memberId));
      if (autoCreateInvoice) {
        try {
          const invoice = await api('/invoices', { method: 'POST', body: JSON.stringify({ subscriptionId: result.id }) });
          setLastInvoice(invoice);
          toast.success(`Đã đăng ký gói và lập hóa đơn ${invoice.number}.`, 'Đăng ký thành công');
          setSuccess(`Đã tạo đăng ký #SUB-${String(result.id).padStart(4, '0')} và hóa đơn ${invoice.number}.`);
        } catch (invError) {
          toast.warning(`Đã tạo đăng ký nhưng chưa lập được hóa đơn: ${invError.message}`, 'Cần lập hóa đơn');
          setSuccess('Đã tạo đăng ký gói tập ở trạng thái chờ thanh toán.');
        }
      } else {
        toast.success('Đã tạo đăng ký gói tập thành công (Trạng thái: Chờ thanh toán).', 'Tạo đăng ký');
        setSuccess('Đã tạo đăng ký gói tập ở trạng thái chờ thanh toán.');
      }
      setSelectedPlanId('');
      setPage(1);
      setVersion(value => value + 1);
    } catch (requestError) {
      toast.error(requestError.message, 'Lỗi tạo đăng ký');
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function createInvoice(subscription) {
    setBusySubId(subscription.id);
    setError(''); setSuccess('');
    try {
      const invoice = await api('/invoices', { method: 'POST', body: JSON.stringify({ subscriptionId: subscription.id }) });
      setLastInvoice(invoice);
      toast.success(`Đã tạo hóa đơn ${invoice.number} thành công.`, 'Lập hóa đơn');
      setSuccess(`Đã tạo hóa đơn ${invoice.number}.`);
      setVersion(v => v + 1);
    } catch (requestError) {
      const msg = requestError.message?.includes('InvoiceAlreadyExists')
        ? 'Đăng ký này đã được lập hóa đơn trước đó. Bạn có thể chuyển sang bước Thu tiền.'
        : requestError.message;
      toast.error(msg, 'Lỗi tạo hóa đơn');
      setError(msg);
      setVersion(v => v + 1);
    } finally {
      setBusySubId(null);
    }
  }

  async function renew(subscription) {
    setBusySubId(subscription.id);
    setError(''); setSuccess('');
    try {
      await api(`/subscriptions/${subscription.id}/renew`, { method: 'POST' });
      toast.success('Đã tạo đăng ký gia hạn chờ thanh toán thành công.', 'Gia hạn gói tập');
      setSuccess('Đã tạo đăng ký gia hạn chờ thanh toán.');
      setVersion(value => value + 1);
    } catch (requestError) {
      toast.error(requestError.message, 'Lỗi gia hạn');
      setError(requestError.message);
    } finally {
      setBusySubId(null);
    }
  }

  async function cancelSubscription(subscription) {
    if (!window.confirm(`Hủy đăng ký #SUB-${String(subscription.id).padStart(4, '0')}?\n\nNếu có hóa đơn chờ thanh toán chưa thu tiền gắn kèm, hóa đơn đó cũng sẽ được hủy.`)) {
      return;
    }
    setBusySubId(subscription.id);
    setError(''); setSuccess('');
    try {
      await api(`/subscriptions/${subscription.id}/cancel`, { method: 'POST' });
      toast.info('Đã hủy đăng ký gói tập.', 'Hủy đăng ký');
      setSuccess(`Đã hủy đăng ký #SUB-${String(subscription.id).padStart(4, '0')}.`);
      setLastInvoice(null);
      setVersion(value => value + 1);
    } catch (requestError) {
      toast.error(requestError.message, 'Không thể hủy đăng ký');
      setError(requestError.message);
    } finally {
      setBusySubId(null);
    }
  }

  async function freezeSubscription(subscription) {
    const raw = window.prompt('Nhập số ngày bảo lưu / cộng thêm vào hạn gói (1 – 90 ngày):', '7');
    if (raw === null) return;
    const days = Number(raw.trim());
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      toast.error('Vui lòng nhập số ngày nguyên từ 1 đến 90.', 'Số ngày không hợp lệ');
      return;
    }
    setBusySubId(subscription.id);
    setError(''); setSuccess('');
    try {
      const updated = await api(`/subscriptions/${subscription.id}/freeze`, {
        method: 'POST',
        body: JSON.stringify({ days }),
      });
      toast.success(`Đã cộng thêm ${days} ngày bảo lưu (hạn mới: ${formatDate(updated.endsOn)}).`, 'Bảo lưu gói tập');
      setSuccess(`Đã bảo lưu thêm ${days} ngày — hạn mới: ${formatDate(updated.endsOn)}.`);
      setVersion(value => value + 1);
    } catch (requestError) {
      toast.error(requestError.message, 'Không thể bảo lưu');
      setError(requestError.message);
    } finally {
      setBusySubId(null);
    }
  }

  return <>
    <PageHeader
      eyebrow="MEMBERSHIP OPERATIONS"
      title="Đăng Ký Gói Tập"
      description="Chọn nhanh hội viên, chọn gói tập và lập hóa đơn thu tiền ngay trong một màn hình."
    />
    <Notice error={error || memberLookup.error} success={success} />

    {lastInvoice && (
      <div className="sub-quick-pay-banner">
        <div>
          <strong>Hóa đơn {lastInvoice.number} đã sẵn sàng thu tiền</strong>
          <span>{lastInvoice.planNameSnapshot} · {formatMoney(lastInvoice.totalAmount)}</span>
        </div>
        <div className="sub-quick-pay-actions">
          <Link className="button button-primary button-small" to={`/invoices/${lastInvoice.id}`}>
            Thu tiền ngay <ArrowRight size={14} />
          </Link>
          <button className="button button-quiet button-small" type="button" onClick={() => setLastInvoice(null)}>
            Đóng
          </button>
        </div>
      </div>
    )}

    <section className="work-grid sub-work-grid">
      {/* Left: Create Subscription Form */}
      <form className="work-panel form-stack subscription-create-panel" onSubmit={create}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">NEW REGISTRATION</p>
            <h2>Tạo đăng ký tập</h2>
          </div>
          <Repeat2 size={20} className="panel-icon-accent" />
        </div>

        {/* Step 1: Member Picker */}
        <div className="sub-step-block">
          <div className="sub-step-head">
            <span className="sub-step-badge">1</span>
            <strong>Chọn hội viên</strong>
            {selectedMember && (
              <button
                type="button"
                className="sub-change-link"
                onClick={() => setShowMemberPicker(value => !value)}
              >
                {showMemberPicker ? 'Thu gọn' : 'Đổi hội viên'}
              </button>
            )}
          </div>

          {selectedMember && (
            <div className="sub-member-preview-pill">
              <span className="avatar-chip">{(selectedMember.firstName || 'M').slice(0, 1).toUpperCase()}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{selectedMember.firstName} {selectedMember.lastName}</strong>
                <small>
                  #{selectedMember.id} · {selectedMember.phone || 'Chưa có SĐT'} · <StatusBadge value={selectedMember.status} />
                </small>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={clearMember}
                aria-label="Bỏ chọn hội viên"
                title="Bỏ chọn hội viên"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {isMemberInactive && (
            <div className="sub-warn-box">
              Hội viên đang tạm ngừng hoạt động. Kích hoạt lại ở trang <Link to="/members">Hội viên</Link> trước khi đăng ký gói.
            </div>
          )}

          {showMemberPicker && (
            <div className="sub-picker-box">
              <div className="search-input-wrap" style={{ marginTop: 0 }}>
                <Search size={15} className="input-search-icon" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, SĐT hoặc #ID…"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="sub-member-search-input"
                />
              </div>

              <div className="sub-member-list" role="listbox" aria-label="Danh sách hội viên">
                {memberLookup.loading ? (
                  <div className="sub-picker-empty">Đang tìm hội viên…</div>
                ) : memberLookup.items.length === 0 ? (
                  <div className="sub-picker-empty">Không tìm thấy hội viên phù hợp.</div>
                ) : (
                  memberLookup.items.map(member => {
                    const active = String(member.id) === String(memberId);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`sub-member-option ${active ? 'active' : ''}`}
                        onClick={() => pickMember(member)}
                      >
                        <span className="avatar-chip">{(member.firstName || 'M').slice(0, 1).toUpperCase()}</span>
                        <div className="sub-member-option-info">
                          <strong>{member.firstName} {member.lastName}</strong>
                          <small>
                            {member.phone || 'Chưa có SĐT'} · #{member.id}
                            {member.currentPlanName ? ` · ${member.currentPlanName}` : ''}
                          </small>
                        </div>
                        {active && <Check size={15} className="sub-option-check" />}
                      </button>
                    );
                  })
                )}
              </div>

              {memberLookup.totalCount > memberLookup.items.length && (
                <small className="sub-picker-hint">
                  Đang hiện {memberLookup.items.length}/{memberLookup.totalCount} hội viên — gõ tên hoặc SĐT để thu hẹp.
                </small>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Visual Plan Picker */}
        <div className="sub-step-block">
          <div className="sub-step-head">
            <span className="sub-step-badge">2</span>
            <strong>Chọn gói tập đang bán</strong>
            <span className="sub-step-count">{activePlans.length} gói</span>
          </div>

          {loadingOptions ? (
            <div className="sub-picker-empty">Đang tải danh sách gói tập…</div>
          ) : activePlans.length === 0 ? (
            <div className="sub-picker-empty">Chưa có gói tập nào đang mở bán.</div>
          ) : (
            <div className="sub-plan-cards" role="radiogroup" aria-label="Gói tập đang bán">
              {activePlans.map(plan => {
                const chosen = String(plan.id) === String(selectedPlanId);
                return (
                  <button
                    key={plan.id}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    className={`sub-plan-card ${chosen ? 'selected' : ''}`}
                    onClick={() => setSelectedPlanId(String(plan.id))}
                  >
                    <div className="sub-plan-card-top">
                      <strong>{plan.name}</strong>
                      {chosen && <Check size={15} className="sub-option-check" />}
                    </div>
                    <div className="sub-plan-card-price">{formatMoney(plan.price)}</div>
                    <small>{plan.durationDays} ngày tập</small>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 3: Auto-invoice option + Summary */}
        <label className="sub-auto-invoice-toggle">
          <input
            type="checkbox"
            checked={autoCreateInvoice}
            onChange={event => setAutoCreateInvoice(event.target.checked)}
          />
          <span>
            <strong>Tự động lập hóa đơn ngay</strong>
            <small>Bỏ qua bước bấm lập hóa đơn thủ công, chuyển thẳng sang thu tiền.</small>
          </span>
        </label>

        {selectedMember && selectedPlan && (
          <div className="sub-confirm-summary">
            <div>
              <span>Hội viên</span>
              <strong>{selectedMember.firstName} {selectedMember.lastName}</strong>
            </div>
            <div>
              <span>Gói tập</span>
              <strong>{selectedPlan.name} ({selectedPlan.durationDays} ngày)</strong>
            </div>
            <div className="sub-confirm-total">
              <span>Tổng cộng</span>
              <strong>{formatMoney(selectedPlan.price)}</strong>
            </div>
          </div>
        )}

        <button
          className="button button-primary button-wide"
          type="submit"
          disabled={saving || loadingOptions || !memberId || !selectedPlanId || isMemberInactive}
        >
          <Plus size={17} />
          {saving
            ? 'Đang tạo đăng ký…'
            : autoCreateInvoice
            ? 'Đăng ký & Lập hóa đơn'
            : 'Xác nhận tạo đăng ký'}
        </button>
      </form>

      {/* Right: Subscription History & Status */}
      <section className="work-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SUBSCRIPTION HISTORY</p>
            <h2>{selectedMember ? `Lịch sử: ${selectedMember.firstName} ${selectedMember.lastName}` : 'Danh sách đăng ký của hội viên'}</h2>
          </div>
          <span className="panel-count">{totalCount} bản ghi</span>
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
              rows={items}
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
                  render: item => {
                    const existingInvoice = invoiceBySubId.get(item.id);
                    return (
                      <div className="table-actions">
                        {item.status === 'PendingPayment' && (
                          <>
                            {existingInvoice ? (
                              <Link
                                className="button button-small button-primary"
                                to={`/invoices/${existingInvoice.id}`}
                                title={`Đã lập hóa đơn ${existingInvoice.number} — bấm để thu tiền`}
                              >
                                Thu tiền <ArrowRight size={13} />
                              </Link>
                            ) : (
                              <button
                                className="button button-small button-outline"
                                onClick={() => createInvoice(item)}
                                disabled={busySubId === item.id}
                                type="button"
                              >
                                {busySubId === item.id ? 'Đang lập…' : 'Lập hóa đơn'}
                              </button>
                            )}
                            <button
                              className="button button-small button-danger-quiet"
                              onClick={() => cancelSubscription(item)}
                              disabled={busySubId === item.id}
                              type="button"
                              title="Hủy đăng ký chọn nhầm / chưa đóng tiền"
                            >
                              Hủy đơn
                            </button>
                          </>
                        )}
                        {item.status === 'Active' && (
                          <button
                            className="button button-small button-outline"
                            onClick={() => freezeSubscription(item)}
                            disabled={busySubId === item.id}
                            type="button"
                            title="Bảo lưu / cộng thêm ngày sử dụng cho hội viên"
                          >
                            Bảo lưu
                          </button>
                        )}
                        {['Active', 'Expired'].includes(item.status) && (
                          <button
                            className="button button-small button-quiet"
                            onClick={() => renew(item)}
                            disabled={busySubId === item.id}
                            type="button"
                          >
                            {busySubId === item.id ? 'Đang xử lý…' : 'Gia hạn gói'}
                          </button>
                        )}
                      </div>
                    );
                  },
                },
              ]}
            />
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              disabled={loading}
              unit="đăng ký"
            />
          </>
        ) : (
          <EmptyState
            title="Chưa chọn hội viên"
            description="Bấm chọn một hội viên ở danh sách bên trái để xem lịch sử gói tập, lập hóa đơn hoặc gia hạn."
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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { page, pageSize, setPage, setPageSize } = usePagination(20, [debouncedSearch, statusFilter, fromDate, toDate]);

  // Preview & Export Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [summary, setSummary] = useState(null);
  const [voidingId, setVoidingId] = useState(null);
  const [autoInvoicing, setAutoInvoicing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api(`/invoices${buildQuery({ page, pageSize, search: debouncedSearch, status: statusFilter, from: fromDate, to: toDate })}`),
      api('/invoices/summary'),
    ])
      .then(([invoiceRes, summaryRes]) => {
        if (active) {
          setItems(invoiceRes.items || []);
          setTotalCount(invoiceRes.totalCount || 0);
          setSummary(summaryRes);
          setError('');
        }
      })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, pageSize, debouncedSearch, statusFilter, fromDate, toDate, version]);

  async function handleVoidInvoice(inv) {
    if (!window.confirm(`Hủy hóa đơn ${inv.number}?\n\nChỉ hủy được hóa đơn chưa có khoản thanh toán nào được xác nhận.`)) {
      return;
    }
    setVoidingId(inv.id);
    setError(''); setSuccess('');
    try {
      await api(`/invoices/${inv.id}/void`, { method: 'POST' });
      toast.info(`Đã hủy hóa đơn ${inv.number}.`, 'Hủy hóa đơn');
      setSuccess(`Đã hủy hóa đơn ${inv.number}.`);
      setVersion(v => v + 1);
    } catch (err) {
      toast.error(err.message, 'Không thể hủy hóa đơn');
      setError(err.message);
    } finally {
      setVoidingId(null);
    }
  }

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
      allInvoices = await fetchAllPages('/invoices', { search: debouncedSearch, status: statusFilter, from: fromDate, to: toDate });
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

    {summary && (
      <section className="inv-kpi-grid" style={{ marginBottom: '16px' }}>
        <div className={`inv-kpi-card ${Number(summary.totalOutstandingDebt) > 0 ? 'inv-kpi-debt' : 'inv-kpi-done'}`}>
          <span>Tổng công nợ đang thiếu</span>
          <strong>{formatMoney(summary.totalOutstandingDebt)}</strong>
          <small>{summary.pendingCount} hóa đơn chờ thu đủ</small>
        </div>
        <div className="inv-kpi-card inv-kpi-paid">
          <span>Tổng doanh thu đã thu</span>
          <strong>{formatMoney(summary.totalCollected)}</strong>
          <small>{summary.paidCount} hóa đơn đã hoàn tất</small>
        </div>
        <div className="inv-kpi-card">
          <span>Hóa đơn theo bộ lọc hiện tại</span>
          <strong>{totalCount}</strong>
          <small>Lọc theo khách hàng & giờ Việt Nam (UTC+7)</small>
        </div>
      </section>
    )}

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
      <div className="table-toolbar inv-toolbar">
        <div>
          <strong>{totalCount}</strong>
          <span> hóa đơn{debouncedSearch || statusFilter !== 'all' || fromDate || toDate ? ' phù hợp' : ''}</span>
        </div>

        {/* Search, Date Range & Status Filters */}
        <div className="inv-filters-row">
          <div className="search-input-wrap" style={{ margin: 0 }}>
            <Search size={14} className="input-search-icon" />
            <input
              type="text"
              placeholder="Tìm khách hàng, SĐT, số HĐ…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="sub-member-search-input inv-search-input"
            />
          </div>

          <div className="inv-date-range">
            <input
              type="date"
              aria-label="Từ ngày"
              title="Từ ngày"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="inv-date-input"
            />
            <span className="muted">→</span>
            <input
              type="date"
              aria-label="Đến ngày"
              title="Đến ngày"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="inv-date-input"
            />
            {(fromDate || toDate) && (
              <button
                type="button"
                className="button button-small button-quiet"
                onClick={() => { setFromDate(''); setToDate(''); }}
                title="Xóa lọc ngày"
              >
                <X size={13} />
              </button>
            )}
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
        emptyDescription="Thử thay đổi bộ lọc ngày/khách hàng hoặc bấm 'Tự động xuất hóa đơn' ở trên."
        columns={[
          {
            key: 'number',
            label: 'Số hóa đơn',
            render: item => (
              <div>
                <Link to={`/invoices/${item.id}`} className="inv-number-link">
                  <strong>{item.number}</strong>
                </Link>
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
            label: 'Tổng tiền & Công nợ',
            render: item => {
              const total = Math.trunc(Number(item.totalAmount || 0));
              const paid = item.status === 'Paid' ? total : Math.trunc(Number(item.paidAmount || 0));
              const remaining = Math.max(0, total - paid);
              return (
                <div>
                  <strong style={{ color: 'var(--lime)' }}>{formatMoney(total)}</strong>
                  {item.status === 'PendingPayment' && remaining > 0 ? (
                    <small className="table-subline inv-debt-line">
                      {paid > 0 && <>Đã thu: {formatMoney(paid)} · </>}
                      <span className="inv-remaining-tag">Còn thiếu: {formatMoney(remaining)}</span>
                    </small>
                  ) : (
                    <small className="table-subline text-success">Đã thu đủ 100%</small>
                  )}
                </div>
              );
            },
          },
          {
            key: 'status',
            label: 'Trạng thái',
            render: item => <StatusBadge value={item.status} />,
          },
          {
            key: 'actions',
            label: 'Thao tác',
            render: item => {
              const total = Math.trunc(Number(item.totalAmount || 0));
              const paid = item.status === 'Paid' ? total : Math.trunc(Number(item.paidAmount || 0));
              const remaining = Math.max(0, total - paid);
              return (
                <div className="table-actions">
                  <Link
                    className="button button-small button-outline"
                    to={`/invoices/${item.id}`}
                    title="Xem chi tiết hóa đơn & lịch sử các đợt thanh toán"
                  >
                    <Eye size={14} /> Chi tiết
                  </Link>
                  <button
                    className="button button-small button-quiet"
                    type="button"
                    onClick={() => setSelectedInvoice(item)}
                    title="Xem và in phiếu thu / hóa đơn"
                  >
                    <Printer size={14} /> In
                  </button>
                  {item.status === 'PendingPayment' && remaining > 0 && (
                    <Link className="button button-small button-primary" to={`/invoices/${item.id}`}>
                      Thu tiền <ArrowRight size={13} />
                    </Link>
                  )}
                  {item.status === 'PendingPayment' && paid === 0 && (
                    <button
                      className="button button-small button-danger-quiet"
                      type="button"
                      disabled={voidingId === item.id}
                      onClick={() => handleVoidInvoice(item)}
                      title="Hủy hóa đơn lập nhầm (chưa thu tiền)"
                    >
                      {voidingId === item.id ? 'Đang hủy…' : 'Hủy HĐ'}
                    </button>
                  )}
                </div>
              );
            },
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

export function InvoiceDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [previewBill, setPreviewBill] = useState(null);
  const [billImgError, setBillImgError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [version, setVersion] = useState(0);

  // Direct payment collection / review modal state right on /invoices/:id
  const [payMode, setPayMode] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState('BankTransfer');
  const [confirmImmediately, setConfirmImmediately] = useState(true);
  const [activateOnPartial, setActivateOnPartial] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api(`/invoices/${id}`),
      api(`/payments${buildQuery({ invoiceId: id, page: 1, pageSize: 100 })}`),
    ])
      .then(([invRes, payRes]) => {
        if (active) {
          setInvoice(invRes);
          setPayments(payRes.items || []);
          setError('');
        }
      })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, version]);

  const totalAmount = Number(invoice?.totalAmount || 0);
  const confirmedPayments = payments.filter(p => p.status === 'Confirmed');
  const pendingPayments = payments.filter(p => p.status === 'PendingConfirmation');
  const paidAmount = invoice?.status === 'Paid'
    ? totalAmount
    : Math.max(Number(invoice?.paidAmount || 0), confirmedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0));
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const progressPercent = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;

  const enteredAmount = Number(formAmount || 0);
  const isPartialPayment = Boolean(invoice && enteredAmount > 0 && enteredAmount < remainingAmount);
  const isOverPayment = Boolean(invoice && enteredAmount > remainingAmount);

  function openCreatePaymentModal() {
    setError('');
    setSuccess('');
    setSelectedPayment(null);
    setFormAmount(String(Math.trunc(remainingAmount)));
    setFormMethod('BankTransfer');
    setConfirmImmediately(true);
    setActivateOnPartial(true);
    setPayMode('create');
  }

  function openConfirmPaymentModal(payment) {
    setError('');
    setSuccess('');
    setSelectedPayment(payment);
    setActivateOnPartial(true);
    setPayMode('confirm');
  }

  function openRejectPaymentModal(payment) {
    setError('');
    setSuccess('');
    setSelectedPayment(payment);
    setPayMode('reject');
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault();
    if (!invoice) return;
    setSaving(true);
    setError('');
    setSuccess('');
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      if (payMode === 'create') {
        let receiptFileId = null;
        const fileInput = form.elements.receiptFile?.files?.[0];
        if (fileInput) {
          const uploadRes = await uploadFile(fileInput);
          receiptFileId = uploadRes.id;
        }
        const created = await api(`/invoices/${invoice.id}/payments`, {
          method: 'POST',
          body: JSON.stringify({ amount: Number(formAmount), method: formMethod, receiptFileId }),
        });
        if (confirmImmediately && created?.id) {
          await api(`/payments/${created.id}/confirm`, {
            method: 'POST',
            body: JSON.stringify({
              reference: (values.reference || '').trim() || null,
              activateSubscriptionNow: isPartialPayment ? activateOnPartial : false,
            }),
          });
          if (isPartialPayment) {
            const leftAfter = Math.max(0, remainingAmount - enteredAmount);
            const actNote = activateOnPartial ? ' và đã kích hoạt gói tập' : '';
            toast.success(`Đã thu đợt ${formatMoney(enteredAmount)}${actNote}. Còn nợ ${formatMoney(leftAfter)}.`, 'Thu một phần');
            setSuccess(`Đã thu ${formatMoney(enteredAmount)}${actNote}. Hóa đơn còn nợ ${formatMoney(leftAfter)}.`);
          } else {
            toast.success('Đã thu đủ tiền, xác nhận hóa đơn và kích hoạt gói tập!', 'Hoàn tất thanh toán');
            setSuccess('Đã thu đủ tiền và kích hoạt gói tập thành công.');
          }
        } else {
          toast.success('Đã ghi nhận khoản thanh toán (Chờ xác nhận).', 'Thanh toán');
          setSuccess('Đã ghi nhận khoản thanh toán ở trạng thái chờ xác nhận.');
        }
      } else if (payMode === 'confirm' && selectedPayment) {
        const fileInput = form.elements.receiptFile?.files?.[0];
        if (fileInput) {
          await uploadPaymentReceipt(selectedPayment.id, fileInput);
        }
        await api(`/payments/${selectedPayment.id}/confirm`, {
          method: 'POST',
          body: JSON.stringify({
            reference: (values.reference || '').trim() || null,
            activateSubscriptionNow: activateOnPartial,
          }),
        });
        toast.success('Đã xác nhận thu tiền thành công!', 'Xác nhận thu tiền');
        setSuccess('Đã xác nhận thu tiền.');
      } else if (payMode === 'reject' && selectedPayment) {
        await api(`/payments/${selectedPayment.id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: values.reason }),
        });
        toast.warning('Đã từ chối khoản thanh toán.', 'Từ chối');
        setSuccess('Đã từ chối khoản thanh toán.');
      }
      setPayMode('');
      setSelectedPayment(null);
      setVersion(v => v + 1);
    } catch (requestError) {
      toast.error(requestError.message, 'Lỗi giao dịch');
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <div className="inv-detail-back">
      <Link to="/invoices" className="button button-quiet button-small">
        <ArrowLeft size={15} /> Quay lại danh sách hóa đơn
      </Link>
    </div>

    <PageHeader
      eyebrow="INVOICE DETAIL"
      title={invoice ? `Chi Tiết Hóa Đơn ${invoice.number}` : `Chi Tiết Hóa Đơn #${id}`}
      description="Theo dõi tiến độ thanh toán, số tiền còn thiếu và toàn bộ lịch sử giao dịch của hóa đơn."
      action={
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="button button-quiet" type="button" onClick={() => setVersion(v => v + 1)}>
            <RefreshCw size={15} /> Làm mới
          </button>
          {invoice && remainingAmount > 0 && invoice.status === 'PendingPayment' && (
            <button className="button button-primary" type="button" onClick={openCreatePaymentModal}>
              <CreditCard size={16} /> Thu tiền ({formatMoney(remainingAmount)})
            </button>
          )}
        </div>
      }
    />
    <Notice error={error} success={success} />

    {loading ? <LoadingState label="Đang tải chi tiết hóa đơn…" /> : !invoice ? (
      <EmptyState title="Không tìm thấy hóa đơn" description="Hóa đơn không tồn tại hoặc đã bị gỡ bỏ." />
    ) : (
      <div className="inv-detail-stack">
        {/* Financial Summary & Progress */}
        <section className="work-panel inv-progress-panel">
          <div className="inv-progress-head">
            <div>
              <p className="eyebrow">PAYMENT PROGRESS</p>
              <h2>Tiến độ hoàn thành hóa đơn · {progressPercent}%</h2>
            </div>
            <StatusBadge value={invoice.status} />
          </div>

          <div className="inv-progress-track" aria-label={`Đã hoàn thành ${progressPercent}%`}>
            <div className="inv-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="inv-kpi-grid">
            <div className="inv-kpi-card">
              <span>Tổng giá trị hóa đơn</span>
              <strong>{formatMoney(totalAmount)}</strong>
              <small>{invoice.planNameSnapshot} · {invoice.planDurationDaysSnapshot} ngày</small>
            </div>
            <div className="inv-kpi-card inv-kpi-paid">
              <span>Đã thu (đã xác nhận)</span>
              <strong>{formatMoney(paidAmount)}</strong>
              <small>{confirmedPayments.length} đợt thanh toán thành công</small>
            </div>
            <div className={`inv-kpi-card ${remainingAmount > 0 ? 'inv-kpi-debt' : 'inv-kpi-done'}`}>
              <span>Còn thiếu</span>
              <strong>{formatMoney(remainingAmount)}</strong>
              <small>
                {remainingAmount > 0
                  ? (pendingAmount > 0 ? `Có ${formatMoney(pendingAmount)} đang chờ xác nhận` : 'Cần thu đủ để kích hoạt gói tập')
                  : `Đã hoàn tất ${formatDate(invoice.paidAtUtc)}`}
              </small>
            </div>
          </div>
        </section>

        {/* Member & Invoice Metadata */}
        <section className="inv-meta-grid">
          <div className="work-panel inv-meta-card">
            <p className="eyebrow">CUSTOMER</p>
            <h3>Thông tin khách hàng</h3>
            <div className="inv-meta-list">
              <div><span>Hội viên</span><strong>{invoice.memberName || `#${invoice.memberId}`}</strong></div>
              <div><span>Mã hội viên</span><strong>#{invoice.memberId}</strong></div>
              <div><span>Số điện thoại</span><strong>{invoice.memberPhone || '—'}</strong></div>
              <div><span>Email</span><strong>{invoice.memberEmail || '—'}</strong></div>
            </div>
          </div>
          <div className="work-panel inv-meta-card">
            <p className="eyebrow">INVOICE INFO</p>
            <h3>Thông tin hóa đơn</h3>
            <div className="inv-meta-list">
              <div><span>Số hóa đơn</span><strong>{invoice.number}</strong></div>
              <div><span>Mã đăng ký</span><strong>#SUB-{String(invoice.subscriptionId).padStart(4, '0')}</strong></div>
              <div><span>Ngày lập</span><strong>{formatDate(invoice.createdAtUtc)}</strong></div>
              <div><span>Ngày hoàn tất</span><strong>{invoice.paidAtUtc ? formatDate(invoice.paidAtUtc) : 'Chưa hoàn tất'}</strong></div>
            </div>
          </div>
        </section>

        {/* Payment Transactions History */}
        <section className="table-panel">
          <div className="table-toolbar">
            <div>
              <strong>{payments.length}</strong>
              <span> giao dịch thanh toán đã thực thi</span>
            </div>
            {remainingAmount > 0 && invoice.status === 'PendingPayment' && (
              <button className="button button-small button-primary" type="button" onClick={openCreatePaymentModal}>
                <Plus size={14} /> Ghi nhận đợt thu mới
              </button>
            )}
          </div>
          <TableFrame
            loading={false}
            rows={payments}
            emptyTitle="Chưa có giao dịch thanh toán nào"
            emptyDescription="Bấm 'Thu tiền' ở trên để ghi nhận đợt thanh toán đầu tiên cho hóa đơn này."
            columns={[
              {
                key: 'id',
                label: 'Mã GD',
                render: item => (
                  <div>
                    <strong>PAY-{String(item.id).padStart(5, '0')}</strong>
                    <small className="table-subline">
                      {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAtUtc))}
                    </small>
                  </div>
                ),
              },
              {
                key: 'amount',
                label: 'Số tiền đợt này',
                render: item => <strong style={{ color: 'var(--lime)' }}>{formatMoney(item.amount)}</strong>,
              },
              {
                key: 'method',
                label: 'Phương thức',
                render: item => (
                  <div>
                    <span>{item.method === 'BankTransfer' ? 'Chuyển khoản' : 'Tiền mặt'}</span>
                    {item.reference && <small className="table-subline">Mã GD: {item.reference}</small>}
                  </div>
                ),
              },
              {
                key: 'status',
                label: 'Trạng thái',
                render: item => (
                  <div>
                    <StatusBadge value={item.status} />
                    {item.status === 'Rejected' && item.adjustmentReason && (
                      <small className="table-subline" style={{ color: '#fda4af' }}>
                        {item.adjustmentReason.replace(/\[RECEIPTS:[0-9,]+\]/g, '').trim()}
                      </small>
                    )}
                  </div>
                ),
              },
              {
                key: 'receipt',
                label: 'Biên lai',
                render: item => {
                  const ids = item.receiptFileIds?.length ? item.receiptFileIds : (item.receiptFileId ? [item.receiptFileId] : []);
                  if (!ids.length) return <span className="muted">Không có</span>;
                  return (
                    <div className="table-actions">
                      {ids.map((fileId, idx) => (
                        <button
                          key={fileId}
                          type="button"
                          className="button button-small button-quiet"
                          onClick={() => {
                            setBillImgError(false);
                            setPreviewBill({
                              fileId,
                              paymentId: item.id,
                              index: idx,
                              amount: item.amount,
                              createdAtUtc: item.createdAtUtc,
                            });
                          }}
                        >
                          <Eye size={13} /> Bill {ids.length > 1 ? `#${idx + 1}` : ''}
                        </button>
                      ))}
                    </div>
                  );
                },
              },
              {
                key: 'reviewed',
                label: 'Xác nhận',
                render: item => item.status === 'PendingConfirmation' ? (
                  <div className="table-actions">
                    <button
                      type="button"
                      className="button button-small button-primary"
                      onClick={() => openConfirmPaymentModal(item)}
                    >
                      Xác nhận
                    </button>
                    <button
                      type="button"
                      className="button button-small button-danger-quiet"
                      onClick={() => openRejectPaymentModal(item)}
                    >
                      Từ chối
                    </button>
                  </div>
                ) : item.reviewedAtUtc ? (
                  <div>
                    <span>{item.reviewedByName || `NV #${item.reviewedByUserId}`}</span>
                    <small className="table-subline">{formatDate(item.reviewedAtUtc)}</small>
                  </div>
                ) : <span className="muted">Chờ duyệt</span>,
              },
            ]}
          />
        </section>
      </div>
    )}

    {payMode && invoice && (
      <Modal
        title={
          payMode === 'create'
            ? `Thu tiền hóa đơn ${invoice.number}`
            : payMode === 'confirm'
            ? 'Xác nhận đã thu tiền'
            : 'Từ chối thanh toán'
        }
        description={
          payMode === 'confirm'
            ? 'Chỉ xác nhận sau khi đã kiểm tra tiền thực nhận và đối chiếu biên lai.'
            : undefined
        }
        onClose={() => { setPayMode(''); setSelectedPayment(null); }}
      >
        <form className="form-stack" onSubmit={handlePaymentSubmit}>
          {payMode === 'create' && <>
            <div className="sub-member-preview-pill" style={{ marginTop: 0 }}>
              <span className="avatar-chip">{(invoice.memberName || 'M').slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{invoice.memberName || `Hội viên #${invoice.memberId}`}</strong>
                <small>
                  SĐT: {invoice.memberPhone || 'Chưa có'} · {invoice.planNameSnapshot} · Còn thiếu: {formatMoney(remainingAmount)}
                </small>
              </div>
            </div>
            <div className="form-grid">
              <label className="field-label">
                <span className="field-label-text">Số tiền đợt này (VND) <span className="field-req">*</span></span>
                <input
                  name="amount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={remainingAmount || undefined}
                  step="1"
                  required
                  value={formAmount}
                  onChange={event => setFormAmount(event.target.value)}
                  placeholder="Nhập số tiền khách đóng đợt này"
                />
              </label>
              <label className="field-label">
                <span className="field-label-text">Phương thức <span className="field-req">*</span></span>
                <select name="method" value={formMethod} onChange={event => setFormMethod(event.target.value)}>
                  <option value="BankTransfer">Chuyển khoản</option>
                  <option value="Cash">Tiền mặt</option>
                </select>
              </label>
            </div>
            {isPartialPayment && (
              <>
                <div className="sub-info-notice">
                  <p>💡 <strong>Thanh toán một phần:</strong> Sau đợt này hóa đơn còn nợ <strong>{formatMoney(remainingAmount - enteredAmount)}</strong> (hóa đơn vẫn giữ <em>Chờ thanh toán</em> cho đến khi thu đủ 100%).</p>
                </div>
                {confirmImmediately && (
                  <label className="sub-auto-invoice-toggle">
                    <input
                      type="checkbox"
                      checked={activateOnPartial}
                      onChange={event => setActivateOnPartial(event.target.checked)}
                    />
                    <span>
                      <strong>Kích hoạt gói tập ngay (cho phép vào tập khi còn nợ)</strong>
                      <small>Hội viên được check-in ngay; quầy lễ tân sẽ nhận cảnh báo số tiền còn nợ mỗi khi hội viên vào sàn.</small>
                    </span>
                  </label>
                )}
              </>
            )}
            {isOverPayment && (
              <div className="sub-warn-box">
                Số tiền nhập ({formatMoney(enteredAmount)}) vượt quá số tiền còn phải thu ({formatMoney(remainingAmount)}).
              </div>
            )}
            <label className="sub-auto-invoice-toggle">
              <input
                type="checkbox"
                checked={confirmImmediately}
                onChange={event => setConfirmImmediately(event.target.checked)}
              />
              <span>
                <strong>Xác nhận đã thu & kích hoạt gói tập ngay</strong>
                <small>Hoàn tất trong 1 bước — không cần bấm xác nhận lại lần 2.</small>
              </span>
            </label>
            {confirmImmediately && formMethod === 'BankTransfer' && (
              <label className="field-label">
                <span className="field-label-text">Mã giao dịch ngân hàng <span className="field-req">*</span></span>
                <input
                  name="reference"
                  maxLength="100"
                  required
                  placeholder="Nhập mã giao dịch / mã tham chiếu ngân hàng"
                />
              </label>
            )}
            <label className="field-label">
              Ảnh biên lai đối chiếu (tùy chọn)
              <input name="receiptFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
            </label>
          </>}

          {payMode === 'confirm' && selectedPayment && <>
            <p className="confirmation-amount">
              {formatMoney(selectedPayment.amount)} <span>· {selectedPayment.method === 'BankTransfer' ? 'Chuyển khoản' : 'Tiền mặt'}</span>
            </p>
            {(selectedPayment.receiptFileIds?.length || (selectedPayment.receiptFileId ? 1 : 0)) > 0 ? (
              <div className="sub-info-notice">
                <p>✅ Giao dịch này đã có <strong>{selectedPayment.receiptFileIds?.length || 1} biên lai</strong> đính kèm — không cần tải lại ảnh.</p>
              </div>
            ) : (
              <label className="field-label">
                Ảnh biên lai chuyển khoản (tùy chọn)
                <input name="receiptFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
              </label>
            )}
            <label className="field-label">
              <span className="field-label-text">
                Mã giao dịch ngân hàng
                {selectedPayment.method === 'BankTransfer' && <span className="field-req">*</span>}
              </span>
              <input
                name="reference"
                maxLength="100"
                required={selectedPayment.method === 'BankTransfer'}
                placeholder={selectedPayment.method === 'BankTransfer' ? 'Bắt buộc với chuyển khoản' : 'Không bắt buộc với tiền mặt'}
              />
            </label>
            <label className="sub-auto-invoice-toggle">
              <input
                type="checkbox"
                checked={activateOnPartial}
                onChange={event => setActivateOnPartial(event.target.checked)}
              />
              <span>
                <strong>Kích hoạt gói tập ngay (kể cả khi hóa đơn mới đóng một phần)</strong>
                <small>Hóa đơn vẫn giữ trạng thái còn nợ cho đến khi thu đủ 100%; nếu gói đã kích hoạt trước đó, ngày tập không bị thay đổi.</small>
              </span>
            </label>
            <p className="form-helper">Xác nhận sẽ cập nhật hóa đơn và kích hoạt subscription trong cùng transaction.</p>
          </>}

          {payMode === 'reject' && (
            <label className="field-label">
              Lý do từ chối
              <textarea name="reason" rows={4} required minLength={3} maxLength={500} />
            </label>
          )}

          <Notice error={error} />
          <div className="form-actions">
            <button className="button button-quiet" type="button" onClick={() => { setPayMode(''); setSelectedPayment(null); }}>
              Hủy
            </button>
            <button
              className={`button ${payMode === 'reject' ? 'button-danger' : 'button-primary'}`}
              disabled={saving || (payMode === 'create' && isOverPayment)}
            >
              {saving
                ? 'Đang xử lý…'
                : payMode === 'confirm'
                ? 'Xác nhận đã thu'
                : payMode === 'reject'
                ? 'Từ chối giao dịch'
                : confirmImmediately
                ? 'Thu tiền & Kích hoạt gói'
                : 'Ghi nhận chờ xác nhận'}
            </button>
          </div>
        </form>
      </Modal>
    )}

    {previewBill && (
      <Modal
        title={`Biên lai PAY-${String(previewBill.paymentId).padStart(5, '0')}${previewBill.index > 0 ? ` · Đợt ${previewBill.index + 1}` : ''}`}
        description={`Số tiền: ${formatMoney(previewBill.amount)} · Ngày tạo: ${formatDate(previewBill.createdAtUtc)}`}
        onClose={() => setPreviewBill(null)}
      >
        <div className="bill-preview-box">
          {!billImgError ? (
            <img
              src={`/api/files/${previewBill.fileId}`}
              alt={`Biên lai PAY-${String(previewBill.paymentId).padStart(5, '0')}`}
              className="bill-preview-img"
              onError={() => setBillImgError(true)}
            />
          ) : (
            <div className="bill-preview-fallback">
              <FileText size={40} style={{ color: 'var(--lime)' }} />
              <p>Tệp biên lai không phải định dạng ảnh trực tiếp (PDF hoặc tài liệu).</p>
            </div>
          )}
        </div>
        <div className="form-actions">
          <a
            className="button button-outline"
            href={`/api/files/${previewBill.fileId}/download`}
            download
          >
            <Download size={15} /> Tải về
          </a>
          <button className="button button-primary" type="button" onClick={() => setPreviewBill(null)}>
            Đóng
          </button>
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
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [mode, setMode] = useState('');
  const [selected, setSelected] = useState(null);
  // Controlled create-payment form state so changing invoice auto-fills amount & 1-step confirm works smoothly
  const [formInvoiceId, setFormInvoiceId] = useState(params.get('invoiceId') || '');
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState('BankTransfer');
  const [confirmImmediately, setConfirmImmediately] = useState(true);
  const [activateOnPartial, setActivateOnPartial] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [version, setVersion] = useState(0);
  const { page, pageSize, setPage, setPageSize } = usePagination(20, [invoiceId, statusFilter, debouncedSearch, fromDate, toDate]);

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
    api(`/payments${buildQuery({ page, pageSize, invoiceId, status: statusFilter, search: debouncedSearch, from: fromDate, to: toDate })}`)
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
  }, [invoiceId, statusFilter, debouncedSearch, fromDate, toDate, page, pageSize, version]);

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

  function getRemainingAmount(inv) {
    if (!inv) return 0;
    return Math.max(0, Math.trunc(Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0)));
  }

  function openCreateModal(presetInvoiceId = invoiceId) {
    const targetId = presetInvoiceId ? String(presetInvoiceId) : '';
    const matched = pendingInvoices.find(inv => String(inv.id) === targetId);
    setError('');
    setFormInvoiceId(matched ? String(matched.id) : '');
    setFormAmount(matched ? String(getRemainingAmount(matched)) : '');
    setFormMethod('BankTransfer');
    setConfirmImmediately(true);
    setActivateOnPartial(true);
    setMode('create');
  }

  function handleCreateInvoiceChange(nextId) {
    setFormInvoiceId(nextId);
    const matched = pendingInvoices.find(inv => String(inv.id) === String(nextId));
    setFormAmount(matched ? String(getRemainingAmount(matched)) : '');
  }

  const selectedPendingInvoice = pendingInvoices.find(inv => String(inv.id) === String(formInvoiceId)) || null;
  const selectedRemaining = getRemainingAmount(selectedPendingInvoice);
  const enteredAmount = Number(formAmount || 0);
  const isPartialPayment = Boolean(selectedPendingInvoice && enteredAmount > 0 && enteredAmount < selectedRemaining);
  const isOverPayment = Boolean(selectedPendingInvoice && enteredAmount > selectedRemaining);

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
        const created = await api(`/invoices/${formInvoiceId}/payments`, {
          method: 'POST',
          body: JSON.stringify({ amount: Number(formAmount), method: formMethod, receiptFileId }),
        });
        if (confirmImmediately && created?.id) {
          await api(`/payments/${created.id}/confirm`, {
            method: 'POST',
            body: JSON.stringify({
              reference: (values.reference || '').trim() || null,
              activateSubscriptionNow: isPartialPayment ? activateOnPartial : false,
            }),
          });
          if (isPartialPayment) {
            const leftAfter = Math.max(0, selectedRemaining - enteredAmount);
            const actNote = activateOnPartial ? ' và đã kích hoạt gói tập' : '';
            toast.success(`Đã thu đợt ${formatMoney(enteredAmount)}${actNote}. Còn nợ ${formatMoney(leftAfter)}.`, 'Thu một phần');
            setSuccess(`Đã thu ${formatMoney(enteredAmount)}${actNote}. Hóa đơn còn nợ ${formatMoney(leftAfter)}.`);
          } else {
            toast.success('Đã thu đủ tiền, xác nhận hóa đơn và kích hoạt gói tập!', 'Hoàn tất thanh toán');
            setSuccess('Đã thu đủ tiền và kích hoạt gói tập thành công.');
          }
        } else {
          toast.success('Đã ghi nhận khoản thanh toán (Chờ xác nhận).', 'Thanh toán');
          setSuccess('Đã ghi nhận khoản thanh toán ở trạng thái chờ xác nhận.');
        }
      } else if (mode === 'confirm') {
        const fileInput = form.elements.receiptFile?.files?.[0];
        if (fileInput) {
          await uploadPaymentReceipt(selected.id, fileInput);
        }
        await api(`/payments/${selected.id}/confirm`, {
          method: 'POST',
          body: JSON.stringify({
            reference: (values.reference || '').trim() || null,
            activateSubscriptionNow: activateOnPartial,
          }),
        });
        toast.success('Đã xác nhận thu tiền thành công!', 'Xác nhận thu tiền');
        setSuccess('Đã xác nhận thu tiền.');
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
        <button className="button button-primary" onClick={() => openCreateModal()}>
          <Plus size={17} /> Ghi nhận thanh toán
        </button>
      }
    />
    <Notice error={error} success={success} />

    <section className="table-panel">
      <div className="table-toolbar inv-toolbar">
        <div>
          <strong>{totalCount}</strong>
          <span> giao dịch{debouncedSearch || statusFilter !== 'all' || invoiceId || fromDate || toDate ? ' phù hợp' : ''}</span>
        </div>
        <div className="inv-filters-row">
          <div className="search-input-wrap" style={{ margin: 0 }}>
            <Search size={14} className="input-search-icon" />
            <input
              type="text"
              placeholder="Tìm khách hàng, SĐT, số HĐ, mã GD…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="sub-member-search-input inv-search-input"
            />
          </div>

          <div className="inv-date-range">
            <input
              type="date"
              aria-label="Từ ngày"
              title="Từ ngày"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="inv-date-input"
            />
            <span className="muted">→</span>
            <input
              type="date"
              aria-label="Đến ngày"
              title="Đến ngày"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="inv-date-input"
            />
            {(fromDate || toDate) && (
              <button
                type="button"
                className="button button-small button-quiet"
                onClick={() => { setFromDate(''); setToDate(''); }}
                title="Xóa lọc ngày"
              >
                <X size={13} />
              </button>
            )}
          </div>

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
        emptyTitle={statusFilter !== 'all' || invoiceId || debouncedSearch || fromDate || toDate ? 'Không có giao dịch phù hợp' : 'Chưa có giao dịch thanh toán'}
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
            key: 'member',
            label: 'Hội viên',
            render: item => {
              const inv = invoices.find(invoice => invoice.id === item.invoiceId);
              const name = item.memberName || inv?.memberName;
              const phone = item.memberPhone || inv?.memberPhone;
              return name ? (
                <div>
                  <strong>{name}</strong>
                  <small className="table-subline">SĐT: {phone || 'Chưa có'}</small>
                </div>
              ) : (
                <span className="muted">—</span>
              );
            },
          },
          {
            key: 'invoiceId',
            label: 'Hóa đơn',
            render: item => (
              <Link to={`/invoices/${item.invoiceId}`} className="inv-number-link">
                <strong>{item.invoiceNumber || invoices.find(invoice => invoice.id === item.invoiceId)?.number || `#${item.invoiceId}`}</strong>
              </Link>
            ),
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
              <span className="muted">{item.reviewedByName || (item.reviewedByUserId ? `NV #${item.reviewedByUserId}` : '—')}</span>
            ),
          },
        ]}
      />
      <Pagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} onPageSizeChange={setPageSize} disabled={loading} unit="giao dịch" />
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
              <span className="field-label-text">Hóa đơn <span className="field-req">*</span></span>
              <select
                name="invoiceId"
                required
                value={formInvoiceId}
                onChange={event => handleCreateInvoiceChange(event.target.value)}
              >
                <option value="">Chọn hóa đơn chờ thanh toán</option>
                {pendingInvoices.map(invoice => {
                  const paid = Number(invoice.paidAmount || 0);
                  const remaining = getRemainingAmount(invoice);
                  return (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.number}{invoice.memberName ? ` · ${invoice.memberName}` : ''}{invoice.memberPhone ? ` (${invoice.memberPhone})` : ''} · {paid > 0 ? `Còn thiếu ${formatMoney(remaining)}` : formatMoney(invoice.totalAmount)}
                    </option>
                  );
                })}
              </select>
            </label>
            {selectedPendingInvoice && (
              <div className="sub-member-preview-pill" style={{ marginTop: 0 }}>
                <span className="avatar-chip">{(selectedPendingInvoice.memberName || 'M').slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{selectedPendingInvoice.memberName || `Hội viên #${selectedPendingInvoice.memberId}`}</strong>
                  <small>
                    SĐT: {selectedPendingInvoice.memberPhone || 'Chưa có'} · {selectedPendingInvoice.planNameSnapshot} · Còn thiếu: {formatMoney(selectedRemaining)}
                  </small>
                </div>
              </div>
            )}
            <div className="form-grid">
              <label className="field-label">
                <span className="field-label-text">Số tiền đợt này (VND) <span className="field-req">*</span></span>
                <input
                  name="amount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={selectedRemaining || undefined}
                  step="1"
                  required
                  value={formAmount}
                  onChange={event => setFormAmount(event.target.value)}
                  placeholder="Nhập số tiền khách đóng đợt này"
                />
              </label>
              <label className="field-label">
                <span className="field-label-text">Phương thức <span className="field-req">*</span></span>
                <select name="method" value={formMethod} onChange={event => setFormMethod(event.target.value)}>
                  <option value="BankTransfer">Chuyển khoản</option>
                  <option value="Cash">Tiền mặt</option>
                </select>
              </label>
            </div>
            {isPartialPayment && (
              <>
                <div className="sub-info-notice">
                  <p>💡 <strong>Thanh toán một phần:</strong> Sau đợt này hóa đơn còn nợ <strong>{formatMoney(selectedRemaining - enteredAmount)}</strong> (hóa đơn vẫn giữ <em>Chờ thanh toán</em> cho đến khi thu đủ 100%).</p>
                </div>
                {confirmImmediately && (
                  <label className="sub-auto-invoice-toggle">
                    <input
                      type="checkbox"
                      checked={activateOnPartial}
                      onChange={event => setActivateOnPartial(event.target.checked)}
                    />
                    <span>
                      <strong>Kích hoạt gói tập ngay (cho phép vào tập khi còn nợ)</strong>
                      <small>Hội viên được check-in ngay; quầy lễ tân sẽ nhận cảnh báo số tiền còn nợ mỗi khi hội viên vào sàn.</small>
                    </span>
                  </label>
                )}
              </>
            )}
            {isOverPayment && (
              <div className="sub-warn-box">
                Số tiền nhập ({formatMoney(enteredAmount)}) vượt quá số tiền còn phải thu ({formatMoney(selectedRemaining)}).
              </div>
            )}
            <label className="sub-auto-invoice-toggle">
              <input
                type="checkbox"
                checked={confirmImmediately}
                onChange={event => setConfirmImmediately(event.target.checked)}
              />
              <span>
                <strong>Xác nhận đã thu & kích hoạt gói tập ngay</strong>
                <small>Hoàn tất trong 1 bước — không cần bấm xác nhận lại lần 2.</small>
              </span>
            </label>
            {confirmImmediately && formMethod === 'BankTransfer' && (
              <label className="field-label">
                <span className="field-label-text">Mã giao dịch ngân hàng <span className="field-req">*</span></span>
                <input
                  name="reference"
                  maxLength="100"
                  required
                  placeholder="Nhập mã giao dịch / mã tham chiếu ngân hàng"
                />
              </label>
            )}
            <label className="field-label">
              Ảnh biên lai đối chiếu (tùy chọn)
              <input name="receiptFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
            </label>
          </>}

          {mode === 'confirm' && <>
            <p className="confirmation-amount">
              {formatMoney(selected?.amount)} <span>· {selected?.method === 'BankTransfer' ? 'Chuyển khoản' : 'Tiền mặt'}</span>
            </p>
            {selected?.memberName && (
              <div className="sub-member-preview-pill" style={{ marginTop: 0 }}>
                <span className="avatar-chip">{selected.memberName.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{selected.memberName}</strong>
                  <small>SĐT: {selected.memberPhone || 'Chưa có'} · HĐ: {selected.invoiceNumber || `#${selected.invoiceId}`}</small>
                </div>
              </div>
            )}
            {(selected?.receiptFileIds?.length || (selected?.receiptFileId ? 1 : 0)) > 0 ? (
              <div className="sub-info-notice">
                <p>✅ Giao dịch này đã có <strong>{selected?.receiptFileIds?.length || 1} biên lai</strong> đính kèm — không cần tải lại ảnh.</p>
              </div>
            ) : (
              <label className="field-label">
                Ảnh biên lai chuyển khoản (tùy chọn)
                <input name="receiptFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
              </label>
            )}
            <label className="field-label">
              <span className="field-label-text">
                Mã giao dịch ngân hàng
                {selected?.method === 'BankTransfer' && <span className="field-req">*</span>}
              </span>
              <input
                name="reference"
                maxLength="100"
                required={selected?.method === 'BankTransfer'}
                placeholder={selected?.method === 'BankTransfer' ? 'Bắt buộc với chuyển khoản' : 'Không bắt buộc với tiền mặt'}
              />
            </label>
            <label className="sub-auto-invoice-toggle">
              <input
                type="checkbox"
                checked={activateOnPartial}
                onChange={event => setActivateOnPartial(event.target.checked)}
              />
              <span>
                <strong>Kích hoạt gói tập ngay (kể cả khi hóa đơn mới đóng một phần)</strong>
                <small>Hóa đơn vẫn giữ trạng thái còn nợ cho đến khi thu đủ 100%; nếu gói đã kích hoạt trước đó, ngày tập không bị thay đổi.</small>
              </span>
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
                : confirmImmediately
                ? 'Thu tiền & Kích hoạt gói'
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
              {galleryPayment.memberName && (
                <>
                  <strong>{galleryPayment.memberName}</strong>
                  {galleryPayment.memberPhone && <span> ({galleryPayment.memberPhone})</span>}
                  <span className="summary-bar-sep">·</span>
                </>
              )}
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
  const [plans, setPlans] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [logMode, setLogMode] = useState('today'); // 'today' | 'member'
  const [logDate, setLogDate] = useState(dateInputValue());
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [memberSubscriptions, setMemberSubscriptions] = useState([]);
  const [memberPendingInvoices, setMemberPendingInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  // Normalize scanned QR card codes like "#MEM-0005" or "MEM-0005" to "#5"
  const normalizedMemberSearch = memberSearch.replace(/^#?mem-0*/i, '#');
  const memberLookup = useMemberLookup(normalizedMemberSearch);
  const { page, pageSize, setPage, setPageSize } = usePagination(20, [logMode, logDate, memberId]);

  useEffect(() => {
    let active = true;
    api('/membership-plans?includeInactive=true&page=1&pageSize=100')
      .then(plansRes => { if (active) setPlans(plansRes.items || []); })
      .catch(requestError => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  // Fetch member subscriptions & pending debt when memberId or version changes
  useEffect(() => {
    if (!memberId) {
      setMemberSubscriptions([]);
      setMemberPendingInvoices([]);
      return undefined;
    }
    let active = true;
    setLoadingSubs(true);
    Promise.all([
      api(`/members/${memberId}/subscriptions?page=1&pageSize=20`),
      api(`/invoices${buildQuery({ memberId, status: 'PendingPayment', page: 1, pageSize: 20 })}`),
    ])
      .then(([subsRes, invRes]) => {
        if (active) {
          setMemberSubscriptions(subsRes.items || []);
          setMemberPendingInvoices(invRes.items || []);
        }
      })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoadingSubs(false); });
    return () => { active = false; };
  }, [memberId, version]);

  const memberDebtSummary = React.useMemo(() => {
    const unpaid = memberPendingInvoices
      .map(inv => ({
        ...inv,
        remaining: Math.max(0, Math.trunc(Number(inv.totalAmount || 0)) - Math.trunc(Number(inv.paidAmount || 0))),
      }))
      .filter(inv => inv.remaining > 0);
    return {
      invoices: unpaid,
      totalDebt: unpaid.reduce((sum, inv) => sum + inv.remaining, 0),
    };
  }, [memberPendingInvoices]);

  // Fetch paged check-in history (server-side): either all gym check-ins for selected date or chosen member's history
  useEffect(() => {
    if (logMode === 'member' && !memberId) {
      setItems([]);
      setTotalCount(0);
      return undefined;
    }
    let active = true;
    setLoading(true);
    const endpoint = logMode === 'today'
      ? `/check-ins${buildQuery({ date: logDate, page, pageSize })}`
      : `/members/${memberId}/check-ins${buildQuery({ page, pageSize })}`;
    api(endpoint)
      .then(checkInsRes => {
        if (active) {
          setItems(checkInsRes.items || []);
          setTotalCount(checkInsRes.totalCount || 0);
          setError('');
        }
      })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [logMode, logDate, memberId, page, pageSize, version]);

  const filteredMembers = selectedMember && !memberLookup.items.some(member => member.id === selectedMember.id)
    ? [selectedMember, ...memberLookup.items]
    : memberLookup.items;

  function selectMember(id) {
    setMemberId(id);
    setSelectedMember(filteredMembers.find(member => String(member.id) === String(id)) || null);
  }

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
    <Notice error={error || memberLookup.error} success={success} />

    {/* Front Desk Check-in Console (2-column fast lookup + verification) */}
    <section className="work-grid checkin-work-grid">
      {/* Left: Fast 1-click Member Lookup */}
      <div className="work-panel checkin-lookup-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">FAST LOOKUP</p>
            <h2>Tìm hội viên check-in</h2>
          </div>
          <span className="panel-count">
            {memberLookup.loading ? '…' : `${memberLookup.items.length}${memberLookup.totalCount > memberLookup.items.length ? `/${memberLookup.totalCount}` : ''}`}
          </span>
        </div>

        <div className="search-input-wrap" style={{ marginTop: 0 }}>
          <Search size={15} className="input-search-icon" />
          <input
            type="text"
            className="sub-member-search-input"
            placeholder="Quét mã #MEM-0001, nhập SĐT hoặc Họ tên…"
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && filteredMembers.length === 1) {
                e.preventDefault();
                selectMember(String(filteredMembers[0].id));
              }
            }}
            autoFocus
          />
        </div>

        <div className="checkin-member-list" role="listbox" aria-label="Danh sách hội viên check-in">
          {memberLookup.loading ? (
            <div className="sub-picker-empty">Đang tìm hội viên…</div>
          ) : filteredMembers.length === 0 ? (
            <div className="sub-picker-empty">Không tìm thấy hội viên phù hợp.</div>
          ) : (
            filteredMembers.map(member => {
              const active = String(member.id) === String(memberId);
              return (
                <button
                  key={member.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`sub-member-option ${active ? 'active' : ''}`}
                  onClick={() => selectMember(String(member.id))}
                >
                  <span className="avatar-chip">{(member.firstName || 'M').slice(0, 1).toUpperCase()}</span>
                  <div className="sub-member-option-info">
                    <strong>{member.firstName} {member.lastName}</strong>
                    <small>
                      {member.phone || 'Chưa có SĐT'} · #{member.id}
                      {member.currentPlanName ? ` · ${member.currentPlanName}` : ''}
                    </small>
                  </div>
                  {active && <Check size={15} className="sub-option-check" />}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Verification & Check-in Trigger */}
      <div className="work-panel checkin-verify-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">ACCESS VERIFICATION</p>
            <h2>Xác thực quyền vào sàn</h2>
          </div>
          <ScanLine size={20} className="panel-icon-accent" />
        </div>

        {selectedMember ? (
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
                  <span>SĐT: <strong>{selectedMember.phone || '—'}</strong></span>
                  <span>Email: {selectedMember.email || '—'}</span>
                  <StatusBadge value={selectedMember.status} />
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
                      Còn <strong>{eligibility.remainingDays} ngày</strong> tập
                    </span>
                  )}
                </div>

                {eligibility.status === 'VALID' ? (
                  <div className="eligibility-details">
                    <p>Gói tập đang dùng: <strong>{eligibility.planName}</strong></p>
                    <p className="eligibility-date">Thời hạn: {eligibility.period}</p>
                  </div>
                ) : (
                  <div className="eligibility-details">
                    <p className="eligibility-reason">{eligibility.reason}</p>
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
                        <Plus size={15} /> Đăng ký gói tập
                      </Link>
                      <Link to="/payments" className="button button-quiet button-small">
                        <CreditCard size={15} /> Kiểm tra thanh toán
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Debt warning banner when member has unpaid balance */}
            {memberDebtSummary.totalDebt > 0 && (
              <div className="sub-quick-pay-banner" style={{ marginBottom: 0 }}>
                <div>
                  <strong>⚠️ Hội viên còn nợ {formatMoney(memberDebtSummary.totalDebt)}</strong>
                  <span>
                    {memberDebtSummary.invoices.length} hóa đơn chưa đóng đủ ({memberDebtSummary.invoices[0]?.number}) — nhắc khách thanh toán nốt.
                  </span>
                </div>
                <Link
                  className="button button-primary button-small"
                  to={`/invoices/${memberDebtSummary.invoices[0].id}`}
                >
                  Thu nợ ngay <ArrowRight size={13} />
                </Link>
              </div>
            )}

            {/* Check-in Trigger Action */}
            <div className="checkin-action-row">
              <button
                className="button button-primary button-checkin button-large button-wide"
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
                  : 'KHÔNG ĐỦ ĐIỀU KIỆN VÀO TẬP'}
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Chưa chọn hội viên"
            description="Tìm và bấm chọn một hội viên ở danh sách bên trái để kiểm tra thẻ tập và xác nhận check-in."
          />
        )}
      </div>
    </section>

    {/* Check-in History Table */}
    <section className="table-panel">
      <div className="table-toolbar inv-toolbar">
        <div>
          <p className="eyebrow">FLOOR ACCESS LOGS · UTC+7</p>
          <h2>
            {logMode === 'today'
              ? `Nhật ký vào sàn toàn phòng tập (${formatDate(logDate)})`
              : (selectedMember ? `Nhật ký của: ${selectedMember.firstName} ${selectedMember.lastName}` : 'Lịch sử theo hội viên')}
          </h2>
        </div>
        <div className="inv-filters-row">
          <div className="sub-status-tabs">
            <button
              type="button"
              className={`sub-tab-btn ${logMode === 'today' ? 'active' : ''}`}
              onClick={() => setLogMode('today')}
            >
              Toàn phòng tập theo ngày
            </button>
            <button
              type="button"
              className={`sub-tab-btn ${logMode === 'member' ? 'active' : ''}`}
              onClick={() => setLogMode('member')}
            >
              Hội viên đang chọn
            </button>
          </div>
          {logMode === 'today' && (
            <input
              type="date"
              aria-label="Chọn ngày xem nhật ký"
              value={logDate}
              onChange={e => setLogDate(e.target.value)}
              className="inv-date-input"
            />
          )}
          <span className="panel-count">{totalCount} lượt</span>
        </div>
      </div>
      <TableFrame
        loading={loading}
        rows={items}
        emptyTitle={logMode === 'today' ? 'Chưa có lượt check-in nào trong ngày này' : (memberId ? 'Hội viên chưa có lượt check-in nào' : 'Chọn hội viên ở trên để xem lịch sử cá nhân')}
        emptyDescription="Dữ liệu được cập nhật tự động theo giờ Việt Nam (UTC+7)."
        columns={[
          ...(logMode === 'today' ? [{
            key: 'member',
            label: 'Hội viên',
            render: item => (
              <div>
                <strong>{item.memberName || `Hội viên #${item.memberId}`}</strong>
                <small className="table-subline">#{item.memberId}{item.memberPhone ? ` · ${item.memberPhone}` : ''}</small>
              </div>
            ),
          }] : []),
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
          { key: 'recordedByUserId', label: 'Nhân viên trực', render: item => item.recordedByName || `Nhân viên #${item.recordedByUserId}` },
        ]}
      />
      <Pagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} onPageSizeChange={setPageSize} disabled={loading} unit="lượt" />
    </section>
  </>;
}

export function ReportsPage() {
  const toast = useToast();
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
      api(`/reports/analytics${query}`),
    ]).then(([dashboard, revenue, members, checkIns, analytics]) => {
      if (active) { setData({ dashboard, revenue, members, checkIns, analytics }); setError(''); }
    }).catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to, version]);

  function exportReportCsv() {
    if (!data?.analytics?.dailySeries?.length) {
      toast.warning('Chưa có dữ liệu báo cáo để xuất.', 'Thông báo');
      return;
    }
    const headers = ['Ngày (VN)', 'Doanh thu (VND)', 'Số hóa đơn đã thu', 'Lượt check-in'];
    const rows = data.analytics.dailySeries.map(d => [d.date, d.revenue, d.paidInvoiceCount, d.checkInCount]);
    const csvContent = '\uFEFF' + [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_cao_phong_tap_${from}_den_${to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Đã xuất báo cáo doanh thu & check-in ra Excel CSV!', 'Xuất báo cáo');
  }

  const dailySeries = data?.analytics?.dailySeries || [];
  const topPlans = data?.analytics?.topPlans || [];
  const maxRevenue = Math.max(1, ...dailySeries.map(d => Number(d.revenue || 0)));
  const maxCheckIns = Math.max(1, ...dailySeries.map(d => Number(d.checkInCount || 0)));

  return <>
    <PageHeader
      eyebrow="REPORTING · UTC+7"
      title="Báo cáo & Phân tích"
      description="Tổng hợp doanh thu, lượt check-in theo ngày và top gói tập bán chạy theo giờ Việt Nam."
      action={
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="button button-quiet" type="button" onClick={exportReportCsv} disabled={!data}>
            <FileSpreadsheet size={16} /> Xuất Excel
          </button>
          <button className="button button-quiet" type="button" onClick={() => setVersion(value => value + 1)}>
            <RefreshCw size={16} /> Làm mới
          </button>
        </div>
      }
    />
    <form className="report-filter" onSubmit={event => { event.preventDefault(); setVersion(value => value + 1); }}><label className="field-label">Từ ngày<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label className="field-label">Đến ngày<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label><button className="button button-primary" disabled={from > to || loading}>Áp dụng kỳ báo cáo</button>{from > to && <span className="inline-error">Ngày bắt đầu phải trước ngày kết thúc.</span>}</form>
    <Notice error={error} />
    {loading ? <LoadingState /> : data && <>
      <section className="metric-grid report-metrics">
        <Metric label="Doanh thu đã thu" value={formatMoney(data.revenue.totalRevenue)} accent="lime" detail={`${data.revenue.paidInvoiceCount} hóa đơn đã thanh toán`} />
        <Metric label="Hội viên đang hoạt động" value={data.members.activeMembers} accent="blue" detail={`${data.members.nonActiveMembers} hội viên không hoạt động`} />
        <Metric label="Lượt check-in" value={data.checkIns.checkInCount} accent="orange" detail={`${data.checkIns.uniqueMembers} hội viên riêng biệt`} />
        <Metric label="Gói sắp hết hạn" value={data.dashboard.subscriptionsExpiringInSevenDays} accent="coral" detail="Trong 7 ngày tới" />
      </section>

      {/* Daily Charts */}
      <section className="report-charts-grid">
        <div className="work-panel report-chart-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">DAILY REVENUE</p>
              <h3>Biểu đồ doanh thu theo ngày</h3>
            </div>
            <span className="panel-count">{formatMoney(data.revenue.totalRevenue)}</span>
          </div>
          <div className="report-bar-chart" role="img" aria-label="Biểu đồ doanh thu theo ngày">
            {dailySeries.map(point => {
              const pct = Math.round((Number(point.revenue || 0) / maxRevenue) * 100);
              return (
                <div
                  key={point.date}
                  className="report-bar-col"
                  title={`${point.date}: ${formatMoney(point.revenue)} (${point.paidInvoiceCount} HĐ)`}
                >
                  <div className="report-bar-track">
                    <div className="report-bar-fill report-bar-lime" style={{ height: `${Math.max(pct, point.revenue > 0 ? 6 : 0)}%` }} />
                  </div>
                  <span className="report-bar-label">{point.date.slice(8, 10)}/{point.date.slice(5, 7)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="work-panel report-chart-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">DAILY CHECK-INS</p>
              <h3>Biểu đồ lượt check-in theo ngày</h3>
            </div>
            <span className="panel-count">{data.checkIns.checkInCount} lượt</span>
          </div>
          <div className="report-bar-chart" role="img" aria-label="Biểu đồ lượt check-in theo ngày">
            {dailySeries.map(point => {
              const pct = Math.round((Number(point.checkInCount || 0) / maxCheckIns) * 100);
              return (
                <div
                  key={point.date}
                  className="report-bar-col"
                  title={`${point.date}: ${point.checkInCount} lượt check-in`}
                >
                  <div className="report-bar-track">
                    <div className="report-bar-fill report-bar-orange" style={{ height: `${Math.max(pct, point.checkInCount > 0 ? 6 : 0)}%` }} />
                  </div>
                  <span className="report-bar-label">{point.date.slice(8, 10)}/{point.date.slice(5, 7)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Top Selling Plans */}
      <section className="table-panel" style={{ marginBottom: '18px' }}>
        <div className="table-toolbar">
          <div>
            <strong>Top gói tập bán chạy</strong>
            <span> trong kỳ {formatDate(data.revenue.from)} — {formatDate(data.revenue.to)}</span>
          </div>
        </div>
        <TableFrame
          loading={false}
          rows={topPlans}
          rowKey="planName"
          emptyTitle="Chưa có giao dịch hoàn tất trong kỳ này"
          emptyDescription="Chọn khoảng ngày khác để xem gói tập bán chạy."
          columns={[
            { key: 'planName', label: 'Tên gói tập', render: item => <strong>{item.planName}</strong> },
            { key: 'soldCount', label: 'Số lượng bán', render: item => `${item.soldCount} hóa đơn` },
            { key: 'totalRevenue', label: 'Tổng doanh thu', render: item => <strong style={{ color: 'var(--lime)' }}>{formatMoney(item.totalRevenue)}</strong> },
          ]}
        />
      </section>

      <section className="report-detail"><div><p className="eyebrow">PERIOD</p><h2>{formatDate(data.revenue.from)} — {formatDate(data.revenue.to)}</h2><p className="muted">Khoảng thời gian được tính theo giờ Việt Nam (UTC+7).</p></div><div className="report-total"><span>Tổng doanh thu</span><strong>{formatMoney(data.revenue.totalRevenue)}</strong><small>{data.revenue.paidInvoiceCount} giao dịch hóa đơn</small></div></section>
    </>}
  </>;
}

function Metric({ label, value, accent, detail }) {
  return <article className={`metric metric-${accent}`}><div className="metric-top"><span>{label}</span><CircleDollarSign size={16} /></div><strong>{value}</strong><small>{detail}</small></article>;
}

export function StaffPage() {
  const toast = useToast();
  const currentEmail = getSession()?.email?.toLowerCase() || '';
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [passwordStaff, setPasswordStaff] = useState(null);
  const [modalError, setModalError] = useState('');
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

  async function handleDeleteStaff(user) {
    if (!window.confirm(`Xóa vĩnh viễn tài khoản nhân viên "${user.displayName}" (${user.email})?\n\nHành động này không thể hoàn tác.`)) {
      return;
    }

    setDeletingId(user.id);
    setError('');
    setSuccess('');
    try {
      await api(`/users/${user.id}`, { method: 'DELETE' });
      toast.success(`Đã xóa tài khoản ${user.displayName}.`, 'Xóa nhân viên');
      setSuccess(`Đã xóa tài khoản nhân viên ${user.displayName}.`);
      setVersion(v => v + 1);
    } catch (err) {
      setError(err.message);
      toast.error(err.message, 'Không thể xóa nhân viên');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleUpdateStaff(event) {
    event.preventDefault();
    if (!editingStaff) return;
    setModalError('');
    setSaving(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const updated = await api(`/users/${editingStaff.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          displayName: values.displayName.trim(),
          email: values.email.trim(),
        }),
      });
      toast.success(`Đã cập nhật thông tin cho ${updated.displayName}.`, 'Cập nhật nhân viên');
      setSuccess(`Đã cập nhật thông tin nhân viên ${updated.displayName}.`);
      setEditingStaff(null);
      setVersion(v => v + 1);
    } catch (err) {
      setModalError(err.message);
      toast.error(err.message, 'Lỗi cập nhật nhân viên');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    if (!passwordStaff) return;
    setModalError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.newPassword !== values.confirmPassword) {
      setModalError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setSaving(true);
    try {
      await api(`/users/${passwordStaff.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword: values.newPassword }),
      });
      toast.success(`Đã đổi mật khẩu cho ${passwordStaff.displayName}.`, 'Đổi mật khẩu');
      setSuccess(`Đã đổi mật khẩu cho ${passwordStaff.displayName} và thu hồi phiên đăng nhập cũ.`);
      setPasswordStaff(null);
    } catch (err) {
      setModalError(err.message);
      toast.error(err.message, 'Lỗi đổi mật khẩu');
    } finally {
      setSaving(false);
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

  const { page, pageSize, setPage, setPageSize } = usePagination(20, [search]);
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
          rows={paginate(filtered, page, pageSize)}
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
                const isDeleting = deletingId === item.id;
                const isOnlyAdmin = item.roles?.includes('Admin') && adminCount <= 1;
                const isSelf = currentEmail && item.email?.toLowerCase() === currentEmail;
                return (
                  <div className="table-actions">
                    <button
                      className="button button-small button-quiet"
                      type="button"
                      disabled={isToggling || isDeleting}
                      onClick={() => { setModalError(''); setEditingStaff(item); }}
                    >
                      Sửa
                    </button>
                    <button
                      className="button button-small button-outline"
                      type="button"
                      disabled={isToggling || isDeleting}
                      onClick={() => { setModalError(''); setPasswordStaff(item); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <KeyRound size={12} /> Đổi MK
                    </button>
                    {item.isActive ? (
                      <button
                        className="button button-small button-danger-quiet"
                        type="button"
                        disabled={isToggling || isDeleting || isOnlyAdmin}
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
                        disabled={isToggling || isDeleting}
                        onClick={() => handleToggleStatus(item)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Unlock size={12} />
                        {isToggling ? 'Đang mở…' : 'Mở khóa'}
                      </button>
                    )}
                    <button
                      className="button button-small button-danger-quiet"
                      type="button"
                      disabled={isToggling || isDeleting || isOnlyAdmin || isSelf}
                      title={
                        isSelf
                          ? 'Không thể tự xóa tài khoản đang đăng nhập'
                          : isOnlyAdmin
                          ? 'Không thể xóa Admin duy nhất'
                          : 'Xóa vĩnh viễn tài khoản nhân viên'
                      }
                      onClick={() => handleDeleteStaff(item)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={12} />
                      {isDeleting ? 'Đang xóa…' : 'Xóa'}
                    </button>
                  </div>
                );
              },
            },
          ]}
        />
        <Pagination page={page} pageSize={pageSize} totalCount={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} unit="nhân sự" />
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

      {/* Modal Sửa Thông Tin Nhân Viên */}
      {editingStaff && (
        <Modal
          title={`Sửa nhân viên: ${editingStaff.displayName}`}
          description="Cập nhật tên hiển thị hoặc email đăng nhập của tài khoản nhân sự."
          onClose={() => setEditingStaff(null)}
        >
          <form className="form-stack" onSubmit={handleUpdateStaff}>
            <label className="field-label">
              <span className="field-label-text">Tên nhân viên <span className="field-req">*</span></span>
              <input name="displayName" required maxLength="120" defaultValue={editingStaff.displayName} />
            </label>
            <label className="field-label">
              <span className="field-label-text">Email đăng nhập <span className="field-req">*</span></span>
              <input name="email" type="email" required maxLength="254" defaultValue={editingStaff.email} />
            </label>
            <Notice error={modalError} />
            <div className="form-actions">
              <button className="button button-quiet" type="button" onClick={() => setEditingStaff(null)}>Hủy</button>
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Đổi Mật Khẩu Nhân Viên */}
      {passwordStaff && (
        <Modal
          title={`Đổi mật khẩu: ${passwordStaff.displayName}`}
          description="Mọi phiên đăng nhập cũ của nhân viên sẽ tự động hết hiệu lực sau khi đổi mật khẩu."
          onClose={() => setPasswordStaff(null)}
        >
          <form className="form-stack" onSubmit={handleResetPassword}>
            <label className="field-label">
              <span className="field-label-text">Mật khẩu mới <span className="field-req">*</span></span>
              <input
                name="newPassword"
                type="password"
                required
                minLength="12"
                maxLength="128"
                autoComplete="new-password"
                placeholder="Tối thiểu 12 ký tự (chữ hoa, thường, số & ký tự đặc biệt)"
              />
            </label>
            <label className="field-label">
              <span className="field-label-text">Nhập lại mật khẩu mới <span className="field-req">*</span></span>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength="12"
                maxLength="128"
                autoComplete="new-password"
                placeholder="Nhập lại đúng mật khẩu mới"
              />
            </label>
            <Notice error={modalError} />
            <div className="form-actions">
              <button className="button button-quiet" type="button" onClick={() => setPasswordStaff(null)}>Hủy</button>
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}