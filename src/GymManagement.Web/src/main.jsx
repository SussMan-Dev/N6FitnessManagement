import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  CreditCard,
  Dumbbell,
  ExternalLink,
  FileText,
  Globe,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Repeat2,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  UserRoundCog,
  X,
} from 'lucide-react';
import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { api, clearSession, getSession, saveSession } from './api';
import { CommandPalette } from './commandPalette';
import { ToastProvider } from './toast';
import {
  AuditLogsPage,
  CheckInsPage,
  DashboardPage,
  InvoiceDetailPage,
  InvoicesPage,
  PaymentsPage,
  ReportsPage,
  ResourcePage,
  StaffPage,
  SubscriptionsPage,
} from './pages';
import {
  PortalLayout,
  PortalLookupPage,
  PortalPlansPage,
  PortalRegisterPage,
} from './portal';
import './styles.css';

const navGroups = [
  {
    caption: 'VẬN HÀNH',
    items: [
      { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true },
      { to: '/checkins', label: 'Check-in', icon: ScanLine },
      { to: '/subscriptions', label: 'Đăng ký tập', icon: Repeat2 },
    ],
  },
  {
    caption: 'TÀI CHÍNH',
    items: [
      { to: '/invoices', label: 'Hóa đơn', icon: FileText },
      { to: '/payments', label: 'Thanh toán', icon: CreditCard },
      { to: '/reports', label: 'Báo cáo', icon: BarChart3 },
    ],
  },
  {
    caption: 'DANH MỤC',
    items: [
      { to: '/members', label: 'Hội viên', icon: Users },
      { to: '/plans', label: 'Gói tập', icon: BadgeDollarSign },
      { to: '/trainers', label: 'Huấn luyện viên', icon: Dumbbell },
    ],
  },
  {
    caption: 'HỆ THỐNG',
    items: [
      { to: '/audit-logs', label: 'Lịch sử thao tác', icon: History },
      { to: '/staff', label: 'Nhân viên', icon: UserRoundCog, adminOnly: true },
    ],
  },
];

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: String(form.get('email')).trim(),
          password: form.get('password'),
        }),
      });
      saveSession(result);
      onLogin(getSession());
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-aside" aria-label="Gym Manager">
        <div className="brand brand-large"><span className="brand-mark"><Dumbbell size={26} strokeWidth={2.5} /></span><span>GYM<br />MANAGER</span></div>
        <div className="login-aside-copy">
          <p className="eyebrow">CLUB OPERATIONS</p>
          <h1>Vận hành phòng tập, rõ từng nhịp.</h1>
          <p>Hội viên, gói tập và doanh thu trong cùng một nơi làm việc.</p>
        </div>
        <div className="login-aside-foot"><Activity size={17} /> MEMBERSHIP · BILLING · FLOOR</div>
      </section>
      <section className="login-main">
        <form className="login-form" onSubmit={submit}>
          <div className="login-mobile-brand brand"><span className="brand-mark"><Dumbbell size={20} strokeWidth={2.5} /></span><span>GYM MANAGER</span></div>
          <p className="eyebrow">STAFF ACCESS</p>
          <h2>Đăng nhập</h2>
          <p className="muted">Dùng tài khoản nhân viên do quản trị viên cấp.</p>
          <label className="field-label">Email
            <input name="email" type="email" autoComplete="username" placeholder="Nhập email nhân viên, ví dụ ten@phongtap.vn" required maxLength={254} />
          </label>
          <label className="field-label">Mật khẩu
            <input name="password" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu tài khoản" required minLength={12} maxLength={128} />
          </label>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          <button className="button button-primary button-wide" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : <ShieldCheck size={17} />}
            {busy ? 'Đang xác thực thông tin…' : 'Đăng nhập vào hệ thống'}
          </button>

          <div className="login-portal-promo">
            <span>Dành cho khách hàng / hội viên:</span>
            <Link to="/portal" className="portal-promo-link">
              <Sparkles size={15} /> Xem gói tập & Đăng ký online tại đây
            </Link>
          </div>

          <p className="login-hint">Không có tài khoản nhân viên? Liên hệ quản trị viên để được cấp quyền.</p>
        </form>
      </section>
    </main>
  );
}

function AppShell({ session, onLogout }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const isAdmin = session.roles?.includes('Admin');
  const todayLabel = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCmdOpen(prev => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand sidebar-brand"><span className="brand-mark"><Dumbbell size={20} strokeWidth={2.5} /></span><span>GYM MANAGER<small>CLUB OPERATIONS</small></span></div>
        <div className="sidebar-nav-scroll">
          {navGroups.map(group => {
            const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin);
            if (!visibleItems.length) return null;
            return (
              <div key={group.caption} className="nav-group">
                <p className="nav-caption">{group.caption}</p>
                <nav className="primary-nav" aria-label={group.caption}>
                  {visibleItems.map(({ to, label, icon: Icon, end }) => (
                    <NavLink key={to} to={to} end={end} onClick={() => setMobileNavOpen(false)}>
                      <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>
            );
          })}
        </div>
        <div className="sidebar-bottom">
          <Link to="/portal" target="_blank" rel="noreferrer" className="sidebar-portal-link">
            <Globe size={16} /> Cổng khách hàng
          </Link>
          <div className="sidebar-status"><span className="status-dot" /> HỆ THỐNG NỘI BỘ</div>
          <button className="logout-button" onClick={onLogout} title="Thoát khỏi tài khoản nhân viên"><LogOut size={17} />Thoát đăng nhập</button>
        </div>
      </aside>
      {mobileNavOpen && <button className="nav-backdrop" aria-label="Đóng menu" onClick={() => setMobileNavOpen(false)} />}
      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Mở menu" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="topbar-context"><span className="topbar-kicker">FITNESS MANAGEMENT</span><span>{todayLabel}</span></div>
          <button
            type="button"
            className="topbar-search-trigger"
            onClick={() => setCmdOpen(true)}
            title="Mở thanh tìm kiếm & điều hướng nhanh (Ctrl + K)"
          >
            <Search size={15} />
            <span className="search-trigger-placeholder">Tìm kiếm trang hoặc tác vụ…</span>
            <kbd className="cmd-pill">Ctrl K</kbd>
          </button>
          <div className="topbar-right-actions">
            <Link to="/portal" target="_blank" rel="noreferrer" className="topbar-portal-btn" title="Mở cổng khách hàng & đăng ký gói tập">
              <Globe size={15} /> <span>Cổng khách hàng</span> <ExternalLink size={12} />
            </Link>
            <div className="account-chip"><span className="avatar">{(session.email || 'S').slice(0, 1).toUpperCase()}</span><span className="account-copy"><strong>{session.email}</strong><small>{isAdmin ? 'Quản trị viên' : 'Nhân viên'}</small></span></div>
            <button className="icon-button topbar-logout" onClick={onLogout} aria-label="Thoát đăng nhập" title="Thoát đăng nhập khỏi hệ thống"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
        <footer className="app-footer"><span>GYM MANAGER</span><span>Vận hành nội bộ · v1.0</span></footer>
      </div>

      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onLogout={onLogout}
        isAdmin={isAdmin}
      />
    </div>
  );
}

function RequireSession({ session }) {
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

class AppErrorBoundary extends React.Component {
  state = { failed: false, message: '' };

  static getDerivedStateFromError(error) {
    return { failed: true, message: error?.message || '' };
  }

  componentDidCatch(error) {
    console.error('Gym Manager render error:', error);
  }

  render() {
    if (this.state.failed) {
      return <main className="render-fallback"><div><p className="eyebrow">LỖI GIAO DIỆN</p><h1>Trang đang tạm thời không thể hiển thị.</h1><p>Vui lòng tải lại trang. Nếu lỗi còn tiếp diễn, hãy kiểm tra kết nối API hoặc liên hệ quản trị viên.</p>{import.meta.env.DEV && this.state.message && <pre className="render-error-detail">{this.state.message}</pre>}<button className="button button-primary" onClick={() => window.location.reload()}>Tải lại trang ngay</button></div></main>;
    }
    return this.props.children;
  }
}

function App() {
  const [session, setSession] = useState(getSession);
  const navigate = useNavigate();

  useEffect(() => {
    function onExpired() {
      setSession(null);
      navigate('/login', { replace: true });
    }
    window.addEventListener('gym:session-expired', onExpired);
    return () => window.removeEventListener('gym:session-expired', onExpired);
  }, [navigate]);

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Proceed to clear local state even if offline
    } finally {
      clearSession();
      setSession(null);
      navigate('/login', { replace: true });
    }
  }

  return (
    <Routes>
      {/* Public User Portal for membership plans & registration */}
      <Route path="/portal" element={<PortalLayout />}>
        <Route index element={<PortalPlansPage />} />
        <Route path="plans" element={<PortalPlansPage />} />
        <Route path="register" element={<PortalRegisterPage />} />
        <Route path="lookup" element={<PortalLookupPage />} />
      </Route>

      {/* Staff Login */}
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage onLogin={setSession} />} />

      {/* Internal Management App */}
      <Route element={<RequireSession session={session} />}>
        <Route element={<AppShell session={session} onLogout={logout} />}>
          <Route index element={<DashboardPage />} />
          <Route path="members" element={<ResourcePage type="members" />} />
          <Route path="plans" element={<ResourcePage type="plans" />} />
          <Route path="trainers" element={<ResourcePage type="trainers" />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="checkins" element={<CheckInsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="staff" element={session?.roles?.includes('Admin') ? <StaffPage /> : <Navigate to="/" replace />} />
        </Route>
      </Route>

      {/* Default fallback: If logged in go to dashboard, otherwise visit portal */}
      <Route path="*" element={<Navigate to={session ? '/' : '/portal'} replace />} />
    </Routes>
  );
}

const root = import.meta.hot?.data.root ?? createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <AppErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AppErrorBoundary>
  </BrowserRouter>
);
if (import.meta.hot) import.meta.hot.dispose(data => { data.root = root; });
