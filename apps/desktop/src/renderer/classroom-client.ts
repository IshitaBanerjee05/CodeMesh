import type { ClassroomApi } from './contracts';

export const classroomApi: ClassroomApi = {
  async request<T>(url: string, options: RequestInit = {}, token: string | null = null) {
    const headers = new Headers(options.headers);
    if (!headers.has('content-type') && options.body) {
      headers.set('content-type', 'application/json');
    }
    if (token) headers.set('authorization', `Bearer ${token}`);

    const response = await fetch(url, { ...options, headers });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
          ? data.error
          : `Request failed (${response.status})`;
      throw new Error(message);
    }
    return data as T;
  }
};

window.codeMeshApi = classroomApi;
