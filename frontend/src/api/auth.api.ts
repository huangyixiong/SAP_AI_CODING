import apiClient from './client';
import type { AuthUser } from '../store/useAuthStore';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', { username, password }),

  refresh: (refreshToken: string) =>
    apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get<AuthUser>('/auth/me'),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient.put('/auth/change-password', { oldPassword, newPassword }),
};
