import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BadgeAlert,
  BadgeCheck,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Dumbbell,
  HelpCircle,
  Lock,
  LogIn,
  Mail,
  MapPin,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { api, formatDate, formatMoney, dateInputValue } from './api';

export function PortalLayout() {
  return (
    <div className="portal-root">
      <header className="portal-header">
        <div className="portal-notice-bar">
          <div className="portal-container notice-content">
            <span>🔥 Ưu đãi mở hội viên mới: Miễn phí đo InBody & Tặng buổi hướng dẫn HLV 1:1!</span>
            <div className="notice-contact">
              <span><Phone size={14} /> Hotline: <strong>1900 6868</strong></span>
              <span><Clock size={14} /> 06:00 - 22:00 hàng ngày</span>
            </div>
          </div>
        </div>
        <div className="portal-container portal-nav-bar">
          <Link to="/portal" className="brand portal-brand">
            <span className="brand-mark">G</span>
            <div>
              <span className="portal-brand-title">FITNESS CENTER</span>
              <small className="portal-brand-sub">HỆ THỐNG PHÒNG TẬP CAO CẤP</small>
            </div>
          </Link>
          <nav className="portal-nav-links">
            <NavLink to="/portal/plans" className={({ isActive }) => `portal-nav-link ${isActive ? 'active' : ''}`}>
              Gói tập & Bảng giá
            </NavLink>
            <NavLink to="/portal/register" className={({ isActive }) => `portal-nav-link ${isActive ? 'active' : ''}`}>
              Đăng ký gói tập
            </NavLink>
            <NavLink to="/portal/lookup" className={({ isActive }) => `portal-nav-link ${isActive ? 'active' : ''}`}>
              Tra cứu thẻ tập
            </NavLink>
          </nav>
          <div className="portal-header-actions">
            <Link to="/portal/register" className="button button-primary portal-cta-btn">
              <Sparkles size={16} /> Đăng ký ngay
            </Link>
            <Link to="/login" className="portal-staff-link" title="Đăng nhập tài khoản nhân viên / quản trị">
              <LogIn size={16} /> Quản trị
            </Link>
          </div>
        </div>
      </header>

      <main className="portal-main">
        <Outlet />
      </main>

      <footer className="portal-footer">
        <div className="portal-container portal-footer-grid">
          <div>
            <div className="brand portal-brand-light">
              <span className="brand-mark">G</span>
              <div>
                <strong>FITNESS CENTER</strong>
                <small>CHUYÊN NGHIỆP · TẬN TÂM · ĐẲNG CẤP</small>
              </div>
            </div>
            <p className="portal-footer-desc">
              Không gian rèn luyện thể lực tiêu chuẩn 5 sao với dàn máy móc nhập khẩu hiện đại, đội ngũ huấn luyện viên giàu kinh nghiệm đồng hành cùng bạn bứt phá thể lực.
            </p>
          </div>
          <div>
            <h4>TIỆN ÍCH HỘI VIÊN</h4>
            <ul className="portal-footer-list">
              <li><Check size={14} /> Tủ locker thông minh bảo mật cao</li>
              <li><Check size={14} /> Phòng tắm nóng lạnh & Xông hơi Sauna</li>
              <li><Check size={14} /> Đo và phân tích chỉ số cơ thể InBody</li>
              <li><Check size={14} /> Nước uống & Khăn tập miễn phí</li>
            </ul>
          </div>
          <div>
            <h4>LIÊN HỆ & ĐỊA ĐIỂM</h4>
            <ul className="portal-footer-list">
              <li><MapPin size={15} /> Tầng 2-3, Tòa nhà Fitness, Quận Cầu Giấy, Hà Nội</li>
              <li><Phone size={15} /> Tổng đài: 1900 6868 - 0988 123 456</li>
              <li><Mail size={15} /> support@fitnessclub.vn</li>
              <li><Clock size={15} /> Thứ 2 - Chủ Nhật: 06:00 - 22:00</li>
            </ul>
          </div>
        </div>
        <div className="portal-footer-bottom">
          <div className="portal-container">
            <span>© 2026 FITNESS CENTER. Vận hành bởi Gym Management System.</span>
            <div className="portal-footer-links">
              <Link to="/portal/plans">Bảng giá</Link>
              <Link to="/portal/register">Đăng ký online</Link>
              <Link to="/portal/lookup">Tra cứu</Link>
              <Link to="/login">Nhân viên</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function PortalPlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchPlans() {
      try {
        setLoading(true);
        const data = await api('/portal/plans');
        setPlans(data || []);
      } catch (err) {
        setError(err.message || 'Không thể tải danh sách gói tập.');
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  return (
    <div className="portal-plans-view">
      {/* Hero Section */}
      <section className="portal-hero">
        <div className="portal-container portal-hero-content">
          <div className="portal-badge-pill">
            <Sparkles size={15} /> ĐẦU TƯ CHO SỨC KHỎE VÀ VÓC DÁNG
          </div>
          <h1 className="portal-hero-title">
            Bứt Phá Giới Hạn Cùng <span>FITNESS CENTER</span>
          </h1>
          <p className="portal-hero-subtitle">
            Khám phá các gói tập được thiết kế linh hoạt, chi phí tối ưu và ngập tràn quyền lợi độc quyền dành cho bạn.
          </p>
          <div className="portal-hero-cta">
            <Link to="/portal/register" className="button button-primary button-large">
              Đăng ký gói tập ngay <ArrowRight size={18} />
            </Link>
            <Link to="/portal/lookup" className="button button-secondary button-large">
              <Search size={18} /> Tra cứu thẻ tập
            </Link>
          </div>

          <div className="portal-stats-row">
            <div className="portal-stat-item">
              <strong>100%</strong>
              <span>Máy tập cao cấp</span>
            </div>
            <div className="portal-stat-divider" />
            <div className="portal-stat-item">
              <strong>20+</strong>
              <span>Huấn luyện viên chuẩn quốc tế</span>
            </div>
            <div className="portal-stat-divider" />
            <div className="portal-stat-item">
              <strong>5.000+</strong>
              <span>Hội viên đang tập luyện</span>
            </div>
            <div className="portal-stat-divider" />
            <div className="portal-stat-item">
              <strong>Sauna</strong>
              <span>Xông hơi & Tắm nóng lạnh</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="portal-container portal-section" id="plans">
        <div className="portal-section-header">
          <p className="eyebrow">CHỌN GÓI PHÙ HỢP VỚI BẠN</p>
          <h2>Bảng Giá Gói Tập Hội Viên</h2>
          <p className="muted">Linh hoạt theo tháng, quý hoặc năm - Càng dài hạn, càng tiết kiệm.</p>
        </div>

        {loading && (
          <div className="portal-loading">
            <span className="spinner" />
            <p>Đang tải danh sách gói tập mới nhất…</p>
          </div>
        )}

        {error && (
          <div className="notice notice-error" role="alert">
            <BadgeAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && plans.length === 0 && (
          <div className="empty-state">
            <p>Hiện chưa có gói tập nào được mở đăng ký.</p>
          </div>
        )}

        {!loading && !error && plans.length > 0 && (
          <div className="portal-plans-grid">
            {plans.map((plan, index) => {
              const isPopular = plan.DurationDays >= 90 && plan.DurationDays <= 180;
              const isVip = plan.DurationDays >= 365;

              return (
                <div
                  key={plan.id}
                  className={`portal-plan-card ${isPopular ? 'popular' : ''} ${isVip ? 'vip' : ''}`}
                >
                  {isPopular && <div className="portal-card-badge">Được chọn nhiều nhất</div>}
                  {isVip && <div className="portal-card-badge vip-badge">Gói VIP Tiết Kiệm</div>}

                  <div className="portal-plan-header">
                    <h3 className="portal-plan-title">{plan.name}</h3>
                    <div className="portal-plan-price-wrap">
                      <span className="portal-plan-price">{formatMoney(plan.price)}</span>
                      <span className="portal-plan-duration">/ {plan.durationDays} ngày</span>
                    </div>
                    {plan.description && (
                      <p className="portal-plan-desc">{plan.description}</p>
                    )}
                  </div>

                  <div className="portal-plan-divider" />

                  <ul className="portal-plan-features">
                    {plan.highlights?.map((item, idx) => (
                      <li key={idx}>
                        <CheckCircle2 size={16} className="feature-check" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`button button-wide ${isPopular || isVip ? 'button-primary' : 'button-secondary'}`}
                    onClick={() => navigate(`/portal/register?planId=${plan.id}`)}
                  >
                    <span>Đăng ký gói này</span>
                    <ChevronRight size={17} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Why Choose Us */}
      <section className="portal-benefits-section">
        <div className="portal-container">
          <div className="portal-section-header">
            <p className="eyebrow">ĐẶC QUYỀN HỘI VIÊN</p>
            <h2>Tại Sao Nên Tập Luyện Tại FITNESS CENTER?</h2>
          </div>
          <div className="portal-benefits-grid">
            <div className="portal-benefit-card">
              <div className="benefit-icon"><Dumbbell size={28} /></div>
              <h3>Trang Thiết Bị Chuẩn Quốc Tế</h3>
              <p>Hệ thống máy tập cơ, cardio, tạ rời hiện đại đáp ứng mọi bài tập từ cơ bản đến chuyên sâu.</p>
            </div>
            <div className="portal-benefit-card">
              <div className="benefit-icon"><Users size={28} /></div>
              <h3>Huấn Luyện Viên Tận Tâm</h3>
              <p>Được tư vấn lộ trình tập luyện và dinh dưỡng cá nhân hóa ngay từ ngày đầu gia nhập.</p>
            </div>
            <div className="portal-benefit-card">
              <div className="benefit-icon"><Lock size={28} /></div>
              <h3>Tiện Nghi 5 Sao</h3>
              <p>Tủ đồ locker bảo mật, phòng xông hơi Sauna giải tỏa căng thẳng sau giờ tập mệt mỏi.</p>
            </div>
            <div className="portal-benefit-card">
              <div className="benefit-icon"><Activity size={28} /></div>
              <h3>Đo Chỉ Số InBody Miễn Phí</h3>
              <p>Theo dõi phần trăm mỡ, khối lượng cơ bắp định kỳ để đo lường tiến trình tập luyện chuẩn xác.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="portal-container portal-section">
        <div className="portal-section-header">
          <p className="eyebrow">HỎI ĐÁP</p>
          <h2>Câu Hỏi Thường Gặp</h2>
        </div>
        <div className="portal-faq-grid">
          <div className="portal-faq-item">
            <h4><HelpCircle size={18} /> Đăng ký xong tôi có thể đến tập ngay không?</h4>
            <p>Có! Ngay sau khi hoàn tất đăng ký và thanh toán, bạn có thể đến phòng tập bất cứ lúc nào trong giờ mở cửa. Nhân viên lễ tân sẽ kích hoạt và trao thẻ tập cho bạn.</p>
          </div>
          <div className="portal-faq-item">
            <h4><HelpCircle size={18} /> Tôi có thể thanh toán bằng phương thức nào?</h4>
            <p>Hệ thống hỗ trợ chuyển khoản ngân hàng qua mã VietQR tự động hoặc thanh toán tiền mặt trực tiếp tại quầy lễ tân.</p>
          </div>
          <div className="portal-faq-item">
            <h4><HelpCircle size={18} /> Tôi có được hướng dẫn trong buổi đầu tiên không?</h4>
            <p>Chắc chắn rồi. Mọi hội viên mới đều được Huấn luyện viên hỗ trợ làm quen với các thiết bị và hướng dẫn các bài tập cơ bản an toàn, hiệu quả.</p>
          </div>
          <div className="portal-faq-item">
            <h4><HelpCircle size={18} /> Làm thế nào để kiểm tra thời hạn gói tập của tôi?</h4>
            <p>Bạn có thể vào mục <strong>"Tra cứu thẻ tập"</strong> trên website, chỉ cần nhập số điện thoại hoặc email là xem được ngay ngày hết hạn và trạng thái thẻ.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function PortalRegisterPage() {
  const [searchParams] = useSearchParams();
  const preselectedPlanId = searchParams.get('planId');

  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(preselectedPlanId ? Number(preselectedPlanId) : null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [startsOn, setStartsOn] = useState(dateInputValue());
  const [paymentMethod, setPaymentMethod] = useState('BankTransfer');
  const [note, setNote] = useState('');

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoadingPlans(true);
        const data = await api('/portal/plans');
        setPlans(data || []);
        if (data && data.length > 0) {
          if (preselectedPlanId && data.some(p => p.id === Number(preselectedPlanId))) {
            setSelectedPlanId(Number(preselectedPlanId));
          } else {
            setSelectedPlanId(data[0].id);
          }
        }
      } catch (err) {
        setError('Không thể tải thông tin gói tập. Vui lòng tải lại trang.');
      } finally {
        setLoadingPlans(false);
      }
    }
    loadPlans();
  }, [preselectedPlanId]);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  // Calculate estimated end date
  const estimatedEndDate = React.useMemo(() => {
    if (!startsOn || !selectedPlan) return null;
    try {
      const d = new Date(startsOn);
      d.setDate(d.getDate() + selectedPlan.durationDays);
      return d;
    } catch {
      return null;
    }
  }, [startsOn, selectedPlan]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedPlanId) {
      setError('Vui lòng chọn một gói tập.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        birthDate: birthDate ? birthDate : null,
        membershipPlanId: selectedPlanId,
        startsOn: startsOn ? startsOn : null,
        paymentMethod: paymentMethod,
        note: note.trim() || null,
      };

      const result = await api('/portal/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessResult(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSubmitting(false);
    }
  }

  if (successResult) {
    return <PortalSuccessView data={successResult} onReset={() => setSuccessResult(null)} />;
  }

  return (
    <div className="portal-container portal-register-wrap">
      <div className="portal-register-intro">
        <p className="eyebrow">ĐĂNG KÝ TRỰC TUYẾN</p>
        <h1>Đăng Ký Gói Tập Thể Hình</h1>
        <p className="muted">
          Điền thông tin bên dưới để đăng ký gói tập nhanh chóng. Thẻ tập sẽ sẵn sàng kích hoạt ngay sau khi đăng ký.
        </p>
      </div>

      {error && (
        <div className="notice notice-error" role="alert">
          <BadgeAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="portal-register-grid">
        {/* Left column: form inputs */}
        <div className="portal-form-main">
          {/* Section 1: Choose plan */}
          <div className="portal-form-card">
            <h3 className="portal-form-card-title">
              <span className="step-num">1</span> Chọn Gói Tập
            </h3>
            {loadingPlans ? (
              <p className="muted">Đang tải danh sách gói tập…</p>
            ) : (
              <div className="portal-plan-select-grid">
                {plans.map(plan => {
                  const isSelected = plan.id === selectedPlanId;
                  return (
                    <div
                      key={plan.id}
                      className={`portal-plan-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedPlanId(plan.id)}
                    >
                      <div className="option-radio">
                        <span className={`radio-dot ${isSelected ? 'checked' : ''}`} />
                      </div>
                      <div className="option-info">
                        <strong>{plan.name}</strong>
                        <div className="option-meta">
                          <span className="option-price">{formatMoney(plan.price)}</span>
                          <span className="option-days">· {plan.durationDays} ngày</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Personal information */}
          <div className="portal-form-card">
            <h3 className="portal-form-card-title">
              <span className="step-num">2</span> Thông Tin Hội Viên
            </h3>
            <div className="form-row-2">
              <label className="field-label">
                Họ và tên đệm <span className="req">*</span>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Ví dụ: Nguyễn Văn"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </label>
              <label className="field-label">
                Tên <span className="req">*</span>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Ví dụ: An"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </label>
            </div>

            <div className="form-row-2">
              <label className="field-label">
                Số điện thoại liên hệ <span className="req">*</span>
                <input
                  type="tel"
                  required
                  maxLength={30}
                  placeholder="Ví dụ: 0988123456"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </label>
              <label className="field-label">
                Email nhận hóa đơn & mã thẻ <span className="req">*</span>
                <input
                  type="email"
                  required
                  maxLength={254}
                  placeholder="Ví dụ: your.email@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </label>
            </div>

            <div className="form-row-2">
              <label className="field-label">
                Ngày sinh
                <input
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                />
              </label>
              <label className="field-label">
                Ngày bắt đầu tập <span className="req">*</span>
                <input
                  type="date"
                  required
                  value={startsOn}
                  onChange={e => setStartsOn(e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Section 3: Payment method */}
          <div className="portal-form-card">
            <h3 className="portal-form-card-title">
              <span className="step-num">3</span> Phương Thức Thanh Toán
            </h3>
            <div className="portal-payment-methods">
              <label
                className={`portal-payment-choice ${paymentMethod === 'BankTransfer' ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="BankTransfer"
                  checked={paymentMethod === 'BankTransfer'}
                  onChange={e => setPaymentMethod(e.target.value)}
                />
                <div className="choice-icon"><QrCode size={24} /></div>
                <div className="choice-body">
                  <strong>Chuyển khoản VietQR (Khuyên dùng)</strong>
                  <p>Quét mã QR qua app ngân hàng bất kỳ, xác nhận kích hoạt nhanh chóng.</p>
                </div>
              </label>

              <label
                className={`portal-payment-choice ${paymentMethod === 'Cash' ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Cash"
                  checked={paymentMethod === 'Cash'}
                  onChange={e => setPaymentMethod(e.target.value)}
                />
                <div className="choice-icon"><CreditCard size={24} /></div>
                <div className="choice-body">
                  <strong>Tiền mặt tại quầy lễ tân</strong>
                  <p>Đến trực tiếp phòng tập, đọc số điện thoại hoặc mã đơn để hoàn tất.</p>
                </div>
              </label>
            </div>

            <label className="field-label" style={{ marginTop: '1rem' }}>
              Ghi chú thêm hoặc mục tiêu tập luyện (tùy chọn)
              <textarea
                rows={2}
                maxLength={300}
                placeholder="Ví dụ: Muốn cải thiện sức bền, cần tư vấn thêm về chế độ ăn..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Right column: Sticky Order summary */}
        <div className="portal-form-sidebar">
          <div className="portal-summary-card">
            <h3>Tóm Tắt Đăng Ký</h3>
            <div className="summary-plan-highlight">
              <p className="summary-plan-label">GÓI TẬP ĐÃ CHỌN</p>
              <h4>{selectedPlan ? selectedPlan.name : 'Chưa chọn gói'}</h4>
              <p className="summary-plan-cost">
                {selectedPlan ? formatMoney(selectedPlan.price) : '0 đ'}
              </p>
            </div>

            <div className="summary-details-list">
              <div className="summary-item">
                <span>Thời hạn sử dụng:</span>
                <strong>{selectedPlan ? `${selectedPlan.durationDays} ngày` : '—'}</strong>
              </div>
              <div className="summary-item">
                <span>Ngày bắt đầu:</span>
                <strong>{startsOn ? formatDate(startsOn) : '—'}</strong>
              </div>
              <div className="summary-item">
                <span>Dự kiến kết thúc:</span>
                <strong>{estimatedEndDate ? formatDate(estimatedEndDate) : '—'}</strong>
              </div>
              <div className="summary-item">
                <span>Hình thức:</span>
                <strong>
                  {paymentMethod === 'BankTransfer' ? 'Chuyển khoản QR' : 'Tiền mặt tại quầy'}
                </strong>
              </div>
            </div>

            <div className="summary-total-divider" />

            <div className="summary-total-row">
              <span>Tổng thanh toán:</span>
              <span className="summary-total-price">
                {selectedPlan ? formatMoney(selectedPlan.price) : '0 đ'}
              </span>
            </div>

            <div className="summary-perks">
              <p className="perk-title">ĐẶC QUYỀN ĐI KÈM:</p>
              <ul>
                <li><Check size={14} /> Tự do ra vào phòng tập không giới hạn giờ</li>
                <li><Check size={14} /> Miễn phí sử dụng tủ locker thông minh</li>
                <li><Check size={14} /> Xông hơi Sauna & Tắm nóng lạnh</li>
              </ul>
            </div>

            <button
              type="submit"
              className="button button-primary button-wide button-large"
              disabled={submitting || !selectedPlan}
            >
              {submitting ? (
                <>
                  <span className="spinner" />
                  <span>Đang xử lý đăng ký…</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Xác nhận & Đăng ký gói tập</span>
                </>
              )}
            </button>

            <p className="summary-guarantee">
              <Lock size={13} /> Thông tin được bảo mật và mã hóa an toàn.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

function PortalSuccessView({ data, onReset }) {
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const navigate = useNavigate();

  function copyText(text, setter) {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  }

  const isBankTransfer = data.paymentMethod?.includes('Chuyển khoản');

  return (
    <div className="portal-container portal-success-wrap">
      <div className="portal-success-card">
        <div className="portal-success-icon">
          <BadgeCheck size={56} />
        </div>
        <p className="eyebrow">ĐĂNG KÝ THÀNH CÔNG</p>
        <h1>Chúc mừng bạn đã gia nhập FITNESS CENTER!</h1>
        <p className="success-sub">
          Mã đăng ký của bạn là <strong>{data.invoiceNumber}</strong>. Thông tin chi tiết đã được ghi nhận trên hệ thống.
        </p>

        {/* Member & Plan Details Box */}
        <div className="success-info-grid">
          <div className="success-info-col">
            <h4>Thông tin hội viên</h4>
            <div className="info-line"><span>Mã hội viên:</span> <strong>#MEM-{String(data.memberId).padStart(4, '0')}</strong></div>
            <div className="info-line"><span>Họ và tên:</span> <strong>{data.fullName}</strong></div>
            <div className="info-line"><span>Số điện thoại:</span> <strong>{data.phone}</strong></div>
            <div className="info-line"><span>Email:</span> <strong>{data.email}</strong></div>
          </div>
          <div className="success-info-col">
            <h4>Gói tập đăng ký</h4>
            <div className="info-line"><span>Gói dịch vụ:</span> <strong>{data.planName}</strong></div>
            <div className="info-line"><span>Thời hạn:</span> <strong>{data.durationDays} ngày</strong></div>
            <div className="info-line"><span>Thời gian tập:</span> <strong>{formatDate(data.startsOn)} → {formatDate(data.endsOn)}</strong></div>
            <div className="info-line"><span>Tổng tiền:</span> <strong className="highlight-price">{formatMoney(data.price)}</strong></div>
          </div>
        </div>

        {/* Payment Details */}
        {isBankTransfer ? (
          <div className="success-payment-box">
            <div className="qr-container">
              <img
                src={data.qrCodeUrl}
                alt="VietQR Chuyển khoản"
                className="vietqr-image"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
              <p className="qr-caption">Quét mã VietQR bằng app ngân hàng bất kỳ để chuyển khoản tự động</p>
            </div>
            <div className="bank-details-box">
              <h3>Thông Tin Chuyển Khoản Ngân Hàng</h3>
              <div className="bank-detail-item">
                <span className="label">Ngân hàng:</span>
                <span className="val"><strong>{data.bankName}</strong></span>
              </div>
              <div className="bank-detail-item">
                <span className="label">Số tài khoản:</span>
                <div className="val-with-copy">
                  <code>{data.bankAccountNumber}</code>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => copyText(data.bankAccountNumber, setCopiedBank)}
                  >
                    <Copy size={13} /> {copiedBank ? 'Đã sao chép!' : 'Sao chép'}
                  </button>
                </div>
              </div>
              <div className="bank-detail-item">
                <span className="label">Chủ tài khoản:</span>
                <span className="val"><strong>{data.bankAccountName}</strong></span>
              </div>
              <div className="bank-detail-item">
                <span className="label">Số tiền:</span>
                <span className="val"><strong className="highlight-price">{formatMoney(data.price)}</strong></span>
              </div>
              <div className="bank-detail-item">
                <span className="label">Nội dung CK:</span>
                <div className="val-with-copy">
                  <code>{data.transferContent}</code>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => copyText(data.transferContent, setCopiedContent)}
                  >
                    <Copy size={13} /> {copiedContent ? 'Đã sao chép!' : 'Sao chép'}
                  </button>
                </div>
              </div>
              <div className="payment-note-box">
                <p>💡 <strong>Lưu ý:</strong> Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động nhận diện và kích hoạt thẻ tập của bạn ngay sau khi nhận được tiền.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="success-cash-box">
            <CreditCard size={32} />
            <div>
              <h3>Thanh toán tiền mặt tại quầy lễ tân</h3>
              <p>
                Vui lòng đến quầy lễ tân FITNESS CENTER tại bất kỳ chi nhánh nào, cung cấp Số điện thoại (<strong>{data.phone}</strong>) hoặc Mã đơn hàng (<strong>{data.invoiceNumber}</strong>) để nhân viên hoàn tất thanh toán và kích hoạt thẻ ngay cho bạn.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="success-actions">
          <button
            className="button button-primary button-large"
            onClick={() => navigate(`/portal/lookup?query=${encodeURIComponent(data.phone)}`)}
          >
            <Search size={18} /> Tra cứu trạng thái thẻ tập của bạn
          </button>
          <button
            className="button button-secondary button-large"
            onClick={onReset}
          >
            Đăng ký thêm gói khác
          </button>
        </div>
      </div>
    </div>
  );
}

export function PortalLookupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('query') || '';

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  async function handleSearch(searchTerm) {
    const q = (searchTerm || query).trim();
    if (!q) {
      setError('Vui lòng nhập Email hoặc Số điện thoại để tra cứu.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);
      setSearchParams({ query: q });
      const data = await api(`/portal/lookup?query=${encodeURIComponent(q)}`);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Không tìm thấy thông tin hội viên tương ứng.');
    } finally {
      setLoading(false);
    }
  }

  function renderSubscriptionStatus(status) {
    switch (status) {
      case 'Active':
        return <span className="badge badge-success">Đang hiệu lực</span>;
      case 'PendingPayment':
        return <span className="badge badge-warning">Chờ thanh toán</span>;
      case 'Expired':
        return <span className="badge badge-neutral">Đã hết hạn</span>;
      case 'Cancelled':
        return <span className="badge badge-error">Đã hủy</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  }

  function renderInvoiceStatus(status) {
    switch (status) {
      case 'Paid':
        return <span className="badge badge-success">Đã thanh toán</span>;
      case 'PendingPayment':
        return <span className="badge badge-warning">Chờ thanh toán</span>;
      case 'Voided':
        return <span className="badge badge-neutral">Đã hủy bỏ</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  }

  return (
    <div className="portal-container portal-lookup-wrap">
      <div className="portal-section-header">
        <p className="eyebrow">TRA CỨU THÔNG TIN</p>
        <h1>Tra Cứu Gói Tập & Tình Trạng Hội Viên</h1>
        <p className="muted">Nhập Số điện thoại hoặc Email bạn đã dùng khi đăng ký để kiểm tra thời hạn và trạng thái thẻ.</p>
      </div>

      <div className="lookup-search-card">
        <form
          className="lookup-search-form"
          onSubmit={e => {
            e.preventDefault();
            handleSearch(query);
          }}
        >
          <div className="search-input-wrap">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Nhập số điện thoại (ví dụ: 0988123456) hoặc email…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : <Search size={18} />}
            <span>{loading ? 'Đang tra cứu…' : 'Tra cứu ngay'}</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="notice notice-error" role="alert" style={{ marginTop: '1.5rem' }}>
          <BadgeAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="lookup-result-section">
          {/* Member Card */}
          <div className="lookup-member-card">
            <div className="member-avatar">
              <User size={32} />
            </div>
            <div className="member-main-info">
              <h2>{result.fullName}</h2>
              <div className="member-meta-row">
                <span>Mã hội viên: <strong>#MEM-{String(result.memberId).padStart(4, '0')}</strong></span>
                <span>Số điện thoại: <strong>{result.phone || '—'}</strong></span>
                <span>Email: <strong>{result.email || '—'}</strong></span>
                <span>Trạng thái: <span className="badge badge-success">Hội viên hoạt động</span></span>
              </div>
            </div>
            <div className="member-actions">
              <Link to="/portal/register" className="button button-primary button-small">
                + Đăng ký thêm gói mới
              </Link>
            </div>
          </div>

          {/* Subscriptions List */}
          <div className="lookup-block">
            <h3>Danh Sách Gói Tập Của Bạn</h3>
            {result.subscriptions?.length === 0 ? (
              <p className="muted">Bạn chưa có gói tập nào.</p>
            ) : (
              <div className="lookup-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Gói tập</th>
                      <th>Ngày bắt đầu</th>
                      <th>Ngày kết thúc</th>
                      <th>Trạng thái</th>
                      <th>Ngày đăng ký</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.subscriptions.map(sub => (
                      <tr key={sub.subscriptionId}>
                        <td><strong>{sub.planName}</strong></td>
                        <td>{formatDate(sub.startsOn)}</td>
                        <td>{formatDate(sub.endsOn)}</td>
                        <td>{renderSubscriptionStatus(sub.status)}</td>
                        <td className="muted">{formatDate(sub.createdAtUtc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Invoices List */}
          <div className="lookup-block">
            <h3>Lịch Sử Hóa Đơn & Đơn Hàng</h3>
            {result.invoices?.length === 0 ? (
              <p className="muted">Chưa có hóa đơn nào.</p>
            ) : (
              <div className="lookup-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Mã hóa đơn</th>
                      <th>Gói dịch vụ</th>
                      <th>Số tiền</th>
                      <th>Tình trạng</th>
                      <th>Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.invoices.map(inv => (
                      <tr key={inv.invoiceId}>
                        <td><code>{inv.number}</code></td>
                        <td>{inv.planNameSnapshot}</td>
                        <td><strong>{formatMoney(inv.totalAmount)}</strong></td>
                        <td>{renderInvoiceStatus(inv.status)}</td>
                        <td className="muted">{formatDate(inv.createdAtUtc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

