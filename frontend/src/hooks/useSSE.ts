import { useState, useRef, useCallback, useEffect } from 'react';
import { createSSEStream } from '../api/client';
import { GenerationStatus } from '../types';

interface UseSSEOptions {
  url: string;
  onChunk?: (content: string) => void;
  onStatusEvent?: (event: Record<string, unknown>) => void;
}

export function useSSE({ url, onChunk, onStatusEvent }: UseSSEOptions) {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stable refs so the stream callback always has the latest handlers
  // without being recreated on every render
  const onChunkRef = useRef(onChunk);
  const onStatusEventRef = useRef(onStatusEvent);
  useEffect(() => { onChunkRef.current = onChunk; }, [onChunk]);
  useEffect(() => { onStatusEventRef.current = onStatusEvent; }, [onStatusEvent]);

  const start = useCallback(
    (body: object) => {
      // Cancel any in-progress request
      abortRef.current?.abort();
      setStatus('loading');
      setError(null);
      let hasTerminalEvent = false;
      let hasDoneEvent = false;

      abortRef.current = createSSEStream(
        url,
        body,
        (event) => {
          if (event.type === 'chunk') {
            setStatus('generating');
            onChunkRef.current?.(event.content as string);
          } else if (event.type === 'error') {
            hasTerminalEvent = true;
            setStatus('error');
            setError((event.message as string) || '生成失败');
            onStatusEventRef.current?.(event);
          } else if (event.type === 'done') {
            hasTerminalEvent = true;
            hasDoneEvent = true;
            setStatus('done');
            onStatusEventRef.current?.(event);
          } else {
            if (event.type === 'source_fetched') {
              setStatus('loading');
            }
            onStatusEventRef.current?.(event);
          }
        },
        (reason) => {
          if (reason === 'done') {
            hasTerminalEvent = true;
            hasDoneEvent = true;
            setStatus('done');
            return;
          }
          if (reason === 'error') {
            hasTerminalEvent = true;
            setStatus('error');
            setError((prev) => prev || '生成失败');
            return;
          }
          if (hasDoneEvent) {
            setStatus('done');
            return;
          }
          if (!hasTerminalEvent) {
            setStatus('error');
            setError('流式响应中断，请重试');
          }
        },
        (err) => {
          setStatus('error');
          setError(err.message);
        }
      );
    },
    [url] // url is the only real dependency now
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
  }, []);

  return { status, error, start, cancel };
}
