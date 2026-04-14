import apiClient from './client';

export interface OptimizePromptRequest {
  currentPrompt: string;
  context?: string;
  requirements?: string[];
}

/**
 * 优化提示词（SSE流式返回）
 */
export function optimizePrompt(data: OptimizePromptRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(
      `/api/prompt/optimize?data=${encodeURIComponent(JSON.stringify(data))}`
    );

    let optimizedPrompt = '';

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        
        if (parsed.type === 'chunk') {
          optimizedPrompt += parsed.content;
        } else if (parsed.type === 'done') {
          eventSource.close();
          resolve(optimizedPrompt);
        } else if (parsed.type === 'error') {
          eventSource.close();
          reject(new Error(parsed.message));
        }
      } catch (error) {
        console.error('[optimizePrompt] Parse error:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      reject(new Error('提示词优化连接失败'));
    };
  });
}
