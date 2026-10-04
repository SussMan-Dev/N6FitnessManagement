const API_ROOT = '/api';

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getSession() {
  const token = sessionStorage.getItem('token');
  if (!token) return null;

  return {
    token,
    email: sessionStorage.getItem('user') || '',
    roles: JSON.parse(sessionStorage.getItem('roles') || '[]'),
  };
}

export function saveSession(session) {
  sessionStorage.setItem('token', session.accessToken);
  sessionStorage.setItem('user', session.email);
  sessionStorage.setItem('roles', JSON.stringify(session.roles || []));
}

export function clearSession() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('roles');
}

function readError(payload, status) {
  if (payload?.errors && typeof payload.errors === 'object') {
    const firstError = Object.values(payload.errors).flat()[0];
    if (firstError) return firstError;
  }

  if (Array.isArray(payload?.Errors) && payload.Errors.length) {
    return payload.Errors.join(' ');
  }

  if (payload?.title || payload?.detail) {
    return [payload.title, payload.detail].filter(Boolean).join(' ');
  }

  if (status === 401) return 'Email hoặc mật khẩu không đúng, hoặc tài khoản đang bị khóa.';
  if (status === 403) return 'Tài khoản không có quyền thực hiện thao tác này.';
  if (status === 404) return 'Không tìm thấy dữ liệu được yêu cầu.';
  if (status === 409) return 'Dữ liệu không thể cập nhật ở trạng thái hiện tại.';
  return 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
}

export async function api(path, options = {}) {
  const token = sessionStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Không kết nối được API. Kiểm tra backend và proxy Vite đang chạy.');
  }

  if (response.status === 401 && path !== '/auth/login') {
    clearSession();
    window.dispatchEvent(new Event('gym:session-expired'));
    throw new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);
  if (response.status === 401 && path === '/auth/login') {
    throw new ApiError('Email hoặc mật khẩu không đúng, hoặc tài khoản đang bị khóa.', 401);
  }
  if (!response.ok) throw new ApiError(readError(payload, response.status), response.status);
  return payload;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value));
}

export function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function dateInputValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}