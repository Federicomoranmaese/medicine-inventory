import { getAuth } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function request(path: string, options: RequestInit = {}) {
  const auth = getAuth();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (auth?.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new Error(error.detail || `Error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (data: { pin?: string; password?: string }) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  // Products
  getProducts: () => request('/api/products'),
  extractProductFromPhoto: (formData: FormData) =>
    request('/api/products/extract-from-photo', { method: 'POST', body: formData }),
  createProduct: (data: object) =>
    request('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: number, data: object) =>
    request(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: number) =>
    request(`/api/products/${id}`, { method: 'DELETE' }),

  // Scans
  createScan: (formData: FormData) =>
    request('/api/scans', { method: 'POST', body: formData }),
  getScans: (skip = 0, limit = 20) =>
    request(`/api/scans?skip=${skip}&limit=${limit}`),
  getScan: (id: number) => request(`/api/scans/${id}`),
  updateScanDetail: (scanId: number, detailId: number, finalCount: number) =>
    request(`/api/scans/${scanId}/details/${detailId}`, {
      method: 'PUT',
      body: JSON.stringify({ final_count: finalCount }),
    }),
  confirmScan: (id: number, notes?: string) =>
    request(`/api/scans/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),

  // Movements
  createMovement: (data: object) =>
    request('/api/movements', { method: 'POST', body: JSON.stringify(data) }),
  getMovements: (skip = 0, limit = 50, productId?: number) =>
    request(
      `/api/movements?skip=${skip}&limit=${limit}${productId ? `&product_id=${productId}` : ''}`
    ),
  approveMovement: (id: number) =>
    request(`/api/movements/${id}/approve`, { method: 'PUT' }),

  // Dashboard
  getDashboard: () => request('/api/dashboard'),
};
