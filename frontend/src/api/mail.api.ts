import apiClient from './client';

export interface SendSpecDocumentsRequest {
  to: string[];
  cc?: string[];
  subject: string;
  fsContent: string;
  referencePrompt: string;
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
