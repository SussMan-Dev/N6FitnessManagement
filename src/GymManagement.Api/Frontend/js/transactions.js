const transactionApi = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('token')}`, ...options.headers } });
  if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.title || 'Không thể thực hiện yêu cầu.'); }
  return response.status === 204 ? null : response.json();
};
const showTransactionError = message => { document.getElementById('appError').textContent = message || ''; };
const transactionMetric = (label, value) => `<article class="metric"><span class="muted">${label}</span><strong>${value}</strong></article>`;

async function loadInvoices() {
  try {
    const memberId = document.getElementById('invoiceMemberId').value;
    const data = await transactionApi(`/invoices?pageSize=30${memberId ? `&memberId=${memberId}` : ''}`);
    const rows = data.items.map(item => `<tr><td>${item.number}</td><td>${item.planNameSnapshot}</td><td>${Number(item.totalAmount).toLocaleString('vi-VN')} đ</td><td><span class="status">${item.status}</span></td></tr>`).join('');
    document.getElementById('invoicesTable').innerHTML = `<table><thead><tr><th>Số hóa đơn</th><th>Gói tập</th><th>Thành tiền</th><th>Trạng thái</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Chưa có hóa đơn.</td></tr>'}</tbody></table>`;
  } catch (error) { showTransactionError(error.message); }
}
async function loadReports() {
  try {
    const [dashboard, members, revenue, checkins] = await Promise.all([transactionApi('/reports/dashboard'), transactionApi('/reports/members'), transactionApi('/reports/revenue'), transactionApi('/reports/check-ins')]);
    document.getElementById('reportMetrics').innerHTML = transactionMetric('Tổng hội viên', members.totalMembers) + transactionMetric('Hội viên hoạt động', members.activeMembers) + transactionMetric('Doanh thu kỳ này', Number(revenue.totalRevenue).toLocaleString('vi-VN') + ' đ') + transactionMetric('Hóa đơn đã thanh toán', revenue.paidInvoiceCount) + transactionMetric('Lượt check-in', checkins.checkInCount) + transactionMetric('Khách check-in', checkins.uniqueMembers) + transactionMetric('Gói sắp hết hạn', dashboard.subscriptionsExpiringInSevenDays);
  } catch (error) { showTransactionError(error.message); }
}
document.querySelectorAll('.nav').forEach(button => button.addEventListener('click', () => { if (button.dataset.view === 'transactions') loadInvoices(); if (button.dataset.view === 'reports') loadReports(); }));
document.getElementById('invoiceMemberId').addEventListener('input', loadInvoices);
document.getElementById('refreshReports').addEventListener('click', loadReports);
document.getElementById('subscriptionForm').addEventListener('submit', async event => { event.preventDefault(); const form = new FormData(event.target); try { const result = await transactionApi('/subscriptions', { method: 'POST', body: JSON.stringify({ memberId: Number(form.get('memberId')), membershipPlanId: Number(form.get('membershipPlanId')) }) }); event.target.reset(); alert(`Đã tạo đăng ký mã ${result.id}. Dùng mã này để tạo hóa đơn.`); } catch (error) { showTransactionError(error.message); } });
document.getElementById('invoiceForm').addEventListener('submit', async event => { event.preventDefault(); const id = Number(new FormData(event.target).get('subscriptionId')); try { const result = await transactionApi('/invoices', { method: 'POST', body: JSON.stringify({ subscriptionId: id }) }); event.target.reset(); await loadInvoices(); alert(`Đã tạo hóa đơn ${result.number}.`); } catch (error) { showTransactionError(error.message); } });
document.getElementById('paymentForm').addEventListener('submit', async event => { event.preventDefault(); const form = new FormData(event.target); const invoiceId = Number(form.get('invoiceId')); try { const result = await transactionApi(`/invoices/${invoiceId}/payments`, { method: 'POST', body: JSON.stringify({ amount: Number(form.get('amount')), method: form.get('method') }) }); event.target.reset(); await loadInvoices(); alert(`Đã tạo thanh toán mã ${result.id}.`); } catch (error) { showTransactionError(error.message); } });

// Handle login in the capture phase so a successful login always reloads into the dashboard.
document.getElementById('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  const loginError = document.getElementById('loginError');
  loginError.textContent = '';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.accessToken) {
      throw new Error(result?.title || 'Email hoặc mật khẩu không đúng.');
    }

    sessionStorage.setItem('token', result.accessToken);
    sessionStorage.setItem('user', result.email);
    window.location.replace('/');
  } catch (error) {
    loginError.textContent = error.message;
  }
}, true);
