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
  LayoutDashboard,
  LogOut,
  Menu,
  Repeat2,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Users,
  UserRoundCog,
  X,
} from 'lucide-react';
import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { api, clearSession, getSession, saveSession } from './api';
import {
  CheckInsPage,
  DashboardPage,
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

const navigation = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/members', label: 'Hội viên', icon: Users },
  { to: '/plans', label: 'Gói tập', icon: BadgeDollarSign },
  { to: '/subscriptions', label: 'Đăng ký tập', icon: Repeat2 },
  { to: '/invoices', label: 'Hóa đơn', icon: FileText },
  { to: '/payments', label: 'Thanh toán', icon: CreditCard },
  { to: '/checkins', label: 'Check-in', icon: ScanLine },
  { to: '/trainers', label: 'Huấn luyện viên', icon: Dumbbell },
  { to: '/reports', label: 'Báo cáo', icon: BarChart3 },
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
        <div className="brand brand-large"><span className="brand-mark">G</span><span>GYM<br />MANAGER</span></div>
        <div className="login-aside-copy">
          <p className="eyebrow">CLUB OPERATIONS</p>
          <h1>Vận hành phòng tập, rõ từng nhịp.</h1>
          <p>Hội viên, gói tập và doanh thu trong cùng một nơi làm việc.</p>
        </div>
        <div className="login-aside-foot"><Activity size={17} /> MEMBERSHIP · BILLING · FLOOR</div>
      </section>
      <section className="login-main">
        <form className="login-form" onSubmit={submit}>
          <div className="login-mobile-brand brand"><span className="brand-mark">G</span><span>GYM MANAGER</span></div>
          <p className="eyebrow">STAFF ACCESS</p>
          <h2>Đăng nhập</h2>
          <p className="muted">Dùng tài khoản nhân viên do quản trị viên cấp.</p>
          <label className="field-label">Email
            <input name="email" type="email" autoComplete="username" placeholder="ten@phongtap.vn" required maxLength={254} />
          </label>
          <label className="field-label">Mật khẩu
            <input name="password" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu" required minLength={12} maxLength={128} />
          </label>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          <button className="button button-primary button-wide" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : <ShieldCheck size={17} />}
            {busy ? 'Đang xác thực…' : 'Vào hệ thống'}
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
  const isAdmin = session.roles?.includes('Admin');

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand sidebar-brand"><span className="brand-mark">G</span><span>GYM MANAGER<small>CLUB OPERATIONS</small></span></div>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Điều hướng chính">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMobileNavOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
          {isAdmin && <NavLink to="/staff" onClick={() => setMobileNavOpen(false)}><UserRoundCog size={18} strokeWidth={1.8} /><span>Nhân viên</span></NavLink>}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/portal" target="_blank" rel="noreferrer" className="sidebar-portal-link">
            <Globe size={16} /> Cổng khách hàng
          </Link>
          <div className="sidebar-status"><span className="status-dot" /> HỆ THỐNG NỘI BỘ</div>
          <button className="logout-button" onClick={onLogout}><LogOut size={17} />Đăng xuất</button>
        </div>
      </aside>
      {mobileNavOpen && <button className="nav-backdrop" aria-label="Đóng menu" onClick={() => setMobileNavOpen(false)} />}
      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Mở menu" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="topbar-context"><span className="topbar-kicker">FITNESS MANAGEMENT</span><span>Vận hành câu lạc bộ</span></div>
          <div className="topbar-right-actions">
            <Link to="/portal" target="_blank" rel="noreferrer" className="topbar-portal-btn" title="Mở cổng khách hàng & đăng ký gói tập">
              <Globe size={15} /> <span>Cổng khách hàng</span> <ExternalLink size={12} />
            </Link>
            <div className="account-chip"><span className="avatar">{(session.email || 'S').slice(0, 1).toUpperCase()}</span><span className="account-copy"><strong>{session.email}</strong><small>{isAdmin ? 'Quản trị viên' : 'Nhân viên'}</small></span></div>
            <button className="icon-button topbar-logout" onClick={onLogout} aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
        <footer className="app-footer"><span>GYM MANAGER</span><span>Vận hành nội bộ · v1.0</span></footer>
      </div>
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
      return <main className="render-fallback"><div><p className="eyebrow">WORKSPACE ERROR</p><h1>Không thể hiển thị trang.</h1><p>Đã ghi nhận lỗi giao diện. Tải lại trang để thử lại.</p>{import.meta.env.DEV && this.state.message && <pre className="render-error-detail">{this.state.message}</pre>}<button className="button button-primary" onClick={() => window.location.reload()}>Tải lại trang</button></div></main>;
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

  function logout() {
    clearSession();
    setSession(null);
    navigate('/login', { replace: true });
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
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="checkins" element={<CheckInsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="staff" element={session?.roles?.includes('Admin') ? <StaffPage /> : <Navigate to="/" replace />} />
        </Route>
      </Route>

      {/* Default fallback: If logged in go to dashboard, otherwise visit portal */}
      <Route path="*" element={<Navigate to={session ? '/' : '/portal'} replace />} />
    </Routes>
  );
}

const root = import.meta.hot?.data.root ?? createRoot(document.getElementById('root'));
root.render(<BrowserRouter><AppErrorBoundary><App /></AppErrorBoundary></BrowserRouter>);
if (import.meta.hot) import.meta.hot.dispose(data => { data.root = root; });
