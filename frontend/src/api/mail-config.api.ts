import apiClient from './client';
export const mailConfigApi = {
  getSmtp: () => apiClient.get('/mail-config/smtp'),
  updateSmtp: (data: {
    host: string; port: number; secure: boolean;
    user?: string; password?: string; fromAddr: string; fromName?: string;
  }) => apiClient.put('/mail-config/smtp', data),
  testSmtp: (to: string) => apiClient.post('/mail-config/smtp/test', { to }),
  getRecipients: (roleId?: number) =>
    apiClient.get('/mail-config/recipients', { params: roleId ? { roleId } : {} }),
  addRecipient: (data: { email: string; name?: string; roleId: number }) =>
    apiClient.post('/mail-config/recipients', data),
  updateRecipient: (id: number, data: { email?: string; name?: string }) =>
    apiClient.put(`/mail-config/recipients/${id}`, data),
  deleteRecipient: (id: number) => apiClient.delete(`/mail-config/recipients/${id}`),
  getLogs: (page = 1, limit = 20) =>
    apiClient.get('/mail-config/logs', { params: { page, limit } }),
};
