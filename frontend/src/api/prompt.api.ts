import { createSSEStream } from './client';

export interface OptimizePromptRequest {
  currentPrompt: string;
  context?: string;
  requirements?: string[];
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
