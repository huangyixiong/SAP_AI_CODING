import apiClient from './client';

export interface SendSpecDocumentsRequest {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  attachmentBase64: string;
  attachmentName: string;
}

export async function sendSpecDocuments(data: SendSpecDocumentsRequest): Promise<void> {
  const response = await apiClient.post<{ success: boolean; message?: string; error?: string }>(
    '/mail/send-spec',
    data
  );
  if (!response.data.success) {
    throw new Error(response.data.error || '发送失败');
  }
}
