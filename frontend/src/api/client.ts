import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401: try refresh, else redirect to login
let refreshing: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const raw = localStorage.getItem('refreshToken');
    if (!raw) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (!refreshing) {
      refreshing = apiClient
        .post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken: raw })
        .then((res) => {
          const { accessToken, refreshToken } = res.data;
          const { user } = useAuthStore.getState();
          if (!user) {
            useAuthStore.getState().clearAuth();
            window.location.href = '/login';
            return Promise.reject(new Error('Session expired'));
          }
          useAuthStore.getState().setAuth(accessToken, user);
          localStorage.setItem('refreshToken', refreshToken);
          return accessToken;
        })
        .catch(() => {
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
          return Promise.reject(new Error('Session expired'));
        })
        .finally(() => { refreshing = null; });
    }

    original._retry = true;
    const newToken = await refreshing;
    original.headers.Authorization = `Bearer ${newToken}`;
    return apiClient(original);
  }
);

export default apiClient;

// SSE streaming helper
export function createSSEStream(
  url: string,
  body: object,
  onEvent: (event: Record<string, unknown>) => void,
  onDone: (reason: 'done' | 'error' | 'eof') => void,
  onError: (err: Error) => void
): AbortController {
  const controller = new AbortController();

  // Use a probe request through apiClient so the axios interceptor can
  // refresh the token before the SSE fetch, which bypasses interceptors.
  const startStream = (token: string | null) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          onError(new Error('未登录或登录已过期，请刷新页面'));
          return;
        }
        if (!response.ok || !response.body) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let receivedSseEvent = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // If the first chunk is raw JSON (not SSE), the proxy returned an error
          if (!receivedSseEvent && !buffer.includes('data: ')) {
            try {
              const json = JSON.parse(buffer.trim());
              const msg = json?.error?.message || json?.message || `服务器错误`;
              onError(new Error(msg));
              return;
            } catch {
              // Not JSON either — continue as normal SSE
            }
          }

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              receivedSseEvent = true;
              const data = line.slice(6).trim();
              if (data) {
                try {
                  const parsed = JSON.parse(data);
                  onEvent(parsed);
                  if (parsed.type === 'done' || parsed.type === 'error') {
                    onDone(parsed.type === 'done' ? 'done' : 'error');
                    return;
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        }
        onDone('eof');
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          onError(err);
        }
      });
  };

  // Trigger a lightweight axios call to ensure the token is refreshed first
  const token = useAuthStore.getState().accessToken;
  if (!token) {
    // No token in store: try refresh via axios (interceptor handles it)
    apiClient.get('/auth/me')
      .then(() => startStream(useAuthStore.getState().accessToken))
      .catch(() => onError(new Error('未登录或登录已过期，请重新登录')));
  } else {
    startStream(token);
  }

  return controller;
}

