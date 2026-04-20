import apiClient from './client';
export const usersApi = {
  list: (page = 1, limit = 20) => apiClient.get('/users', { params: { page, limit } }),
  create: (data: { username: string; fullName: string; email: string; password: string }) =>
    apiClient.post('/users', data),
  update: (id: number, data: Partial<{ fullName: string; email: string; isActive: boolean }>) =>
    apiClient.put(`/users/${id}`, data),
  deactivate: (id: number) => apiClient.delete(`/users/${id}`),
  assignRoles: (id: number, roleIds: number[]) =>
    apiClient.put(`/users/${id}/roles`, { roleIds }),
};
