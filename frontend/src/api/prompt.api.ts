import { createSSEStream } from './client';
import apiClient from './client';

export interface OptimizePromptRequest {
  currentPrompt: string;
  context?: string;
  requirements?: string[];
}

export interface DefaultPrompt {
  name: string;
  description: string;
  content: string;
}

export interface DefaultPromptsResponse {
  ts: DefaultPrompt;
  fs: DefaultPrompt;
  code: DefaultPrompt;
}

/**
 * 获取所有默认提示词
 */
export async function getDefaultPrompts(): Promise<DefaultPromptsResponse> {
  const response = await apiClient.get('/prompt/defaults');
  return response.data.data;
}

/**
 * 优化提示词（SSE流式返回）
 * @returns Promise<string> 优化后的提示词
 */
export function optimizePrompt(data: OptimizePromptRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let optimizedPrompt = '';

    createSSEStream(
      '/api/prompt/optimize',
      data,
      (event) => {
        if (event.type === 'chunk') {
          optimizedPrompt += event.content as string;
        } else if (event.type === 'error') {
          reject(new Error(event.message as string));
        }
      },
      () => {
        // Done - resolve with the accumulated prompt
        resolve(optimizedPrompt);
      },
      (err) => {
        reject(err);
      }
    );
  });
}
