import OpenAI from 'openai';
import { config } from '../config';

export interface StreamOptions {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

class ClaudeService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.claude.apiKey,
      baseURL: config.claude.baseURL,
    });
  }

  async *streamGenerate(options: StreamOptions): AsyncGenerator<string> {
    const { systemPrompt, userMessage, maxTokens, temperature, signal } = options;

    console.log('[LLM] Calling model:', config.claude.model);

    // Note: signal is NOT passed to the SDK to avoid premature AbortError
    // when the SSE socket triggers req.on('close') unexpectedly.
    // We check signal manually in the loop to stop yielding on client disconnect.
    const stream = this.client.chat.completions.stream({
      model: config.claude.model,
      max_tokens: maxTokens ?? config.claude.maxTokens,
      temperature: temperature ?? config.claude.temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    try {
      for await (const chunk of stream) {
        if (signal?.aborted) {
          stream.abort();
          break;
        }
        const text = chunk.choices[0]?.delta?.content;
        if (text) yield text;
      }
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if ((e.message ?? '').includes('aborted') || (e.message ?? '').includes('abort')) {
        // Client disconnected, stop silently
        return;
      }
      console.error('[LLM] Stream error - status:', e.status, 'message:', e.message);
      throw err;
    }
  }

  async generate(options: Omit<StreamOptions, 'signal'>): Promise<string> {
    const parts: string[] = [];
    for await (const chunk of this.streamGenerate(options)) {
      parts.push(chunk);
    }
    return parts.join('');
  }
}

export default ClaudeService;
