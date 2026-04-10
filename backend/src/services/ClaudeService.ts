import OpenAI from 'openai';
import { config } from '../config';
import logger from '../lib/logger';
import { LLMError } from '../errors';

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

    logger.info('[LLM] Starting stream generation', { 
      model: config.claude.model,
      maxTokens: maxTokens ?? config.claude.maxTokens,
      temperature: temperature ?? config.claude.temperature 
    });

    // Note: signal is NOT passed to the SDK to avoid premature AbortError
    // when the SSE socket triggers req.on('close') unexpectedly.
    // We check signal manually in the loop to stop yielding on client disconnect.
    let stream: any;
    try {
      stream = this.client.chat.completions.stream({
        model: config.claude.model,
        max_tokens: maxTokens ?? config.claude.maxTokens,
        temperature: temperature ?? config.claude.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      });
    } catch (error) {
      logger.error('[LLM] Failed to create stream', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw new LLMError('Failed to initialize LLM stream', { 
        model: config.claude.model 
      });
    }

    let chunkCount = 0;
    let totalChars = 0;

    try {
      for await (const chunk of stream) {
        if (signal?.aborted) {
          logger.info('[LLM] Stream aborted by client');
          stream.abort();
          break;
        }
        const text = chunk.choices[0]?.delta?.content;
        if (text) {
          chunkCount++;
          totalChars += text.length;
          yield text;
        }
      }
      
      logger.info('[LLM] Stream generation completed', { 
        chunks: chunkCount, 
        totalChars 
      });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if ((e.message ?? '').includes('aborted') || (e.message ?? '').includes('abort')) {
        // Client disconnected, stop silently
        logger.debug('[LLM] Stream aborted (client disconnected)');
        return;
      }
      logger.error('[LLM] Stream error', { 
        status: e.status, 
        message: e.message,
        stack: err instanceof Error ? err.stack : undefined 
      });
      throw new LLMError(`LLM stream failed: ${e.message}`, { 
        status: e.status,
        model: config.claude.model 
      });
    }
  }

  async generate(options: Omit<StreamOptions, 'signal'>): Promise<string> {
    logger.info('[LLM] Starting non-stream generation');
    
    const parts: string[] = [];
    for await (const chunk of this.streamGenerate(options)) {
      parts.push(chunk);
    }
    
    const result = parts.join('');
    logger.info('[LLM] Non-stream generation completed', { length: result.length });
    return result;
  }
}

export default ClaudeService;
