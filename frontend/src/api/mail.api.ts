import axios from 'axios';
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
  try {
    const response = await apiClient.post<{ success: boolean; message?: string; error?: string }>(
      '/mail/send-spec',
      data
    );
    if (!response.data.success) {
      throw new Error(response.data.error || '发送失败');
    }
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.data?.error) {
      throw new Error(e.response.data.error);
    }
    throw e;
  }
}
