import { API_BASE, SERVICES, type ServiceName } from './constants';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private async request<T>(
    service: ServiceName,
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const { port } = SERVICES[service];
    const url = `${API_BASE}:${port}${path}`;

    const token = typeof window !== 'undefined' ? localStorage.getItem('concierge_token') : null;

    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, body?.message ?? res.statusText, body);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  get<T>(service: ServiceName, path: string) {
    return this.request<T>(service, path);
  }

  post<T>(service: ServiceName, path: string, body?: unknown) {
    return this.request<T>(service, path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(service: ServiceName, path: string, body?: unknown) {
    return this.request<T>(service, path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(service: ServiceName, path: string) {
    return this.request<T>(service, path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
