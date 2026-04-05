export interface AuthUser {
  id: number;
  name: string;
  role: 'admin' | 'assistant';
  token: string;
}

export function saveAuth(user: AuthUser): void {
  localStorage.setItem('auth', JSON.stringify(user));
}

export function getAuth(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('auth');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem('auth');
}

export function isAdmin(): boolean {
  const auth = getAuth();
  return auth?.role === 'admin';
}
