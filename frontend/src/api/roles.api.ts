import apiClient from './client';
export const rolesApi = {
  list: () => apiClient.get('/roles'),
  listPermissions: () => apiClient.get('/roles/permissions'),
  create: (data: { name: string; description?: string }) => apiClient.post('/roles', data),
  update: (id: number, data: { name?: string; description?: string }) =>
    apiClient.put(`/roles/${id}`, data),
  assignPermissions: (id: number, permissionIds: number[]) =>
    apiClient.put(`/roles/${id}/permissions`, { permissionIds }),
};
