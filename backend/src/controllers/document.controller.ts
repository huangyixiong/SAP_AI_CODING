import { Request, Response } from 'express';
import { z } from 'zod';
import DocumentService from '../services/DocumentService';
import ClaudeService from '../services/ClaudeService';
import { PSEUDOCODE_SYSTEM_PROMPT, buildPseudocodeUserMessage } from '../prompts/pseudocode.prompt';

// SSE helper
function sendSSE(res: Response, data: object): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function initSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

function makeAbortController(req: Request, res: Response): AbortController {
  const abortController = new AbortController();
  req.on('close', () => {
    // Only abort if the response hasn't finished yet (client disconnected mid-stream)
    if (!res.writableEnded) {
      console.log('[SSE] Client disconnected, aborting LLM request');
      abortController.abort();
    }
  });
  return abortController;
}

const additionalObjectSchema = z.object({
  name: z.string(),
  type: z.string(),
  objectUrl: z.string(),
});

export async function generateTS(req: Request, res: Response): Promise<void> {
  initSSE(res);

  const schema = z.object({
    programName: z.string().min(1),
    objectType: z.string().optional(),
    additionalObjects: z.array(additionalObjectSchema).optional(),
    templateContent: z.string().optional(),
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    sendSSE(res, { type: 'error', message: '参数错误：' + parseResult.error.message });
    res.end();
    return;
  }

  const { programName, objectType, additionalObjects, templateContent } = parseResult.data;
  const abortController = makeAbortController(req, res);

  try {
    const docService = new DocumentService();
    for await (const event of docService.generateFromSAP({
      programName,
      objectType,
      documentType: 'TS',
      signal: abortController.signal,
      additionalObjects,
      templateContent,
    })) {
      if (res.writableEnded) break;
      sendSSE(res, event);
    }
  } catch (err) {
    if (!res.writableEnded) {
      sendSSE(res, { type: 'error', message: (err as Error).message });
    }
  } finally {
    if (!res.writableEnded) res.end();
  }
}

export async function generateFS(req: Request, res: Response): Promise<void> {
  initSSE(res);

  const schema = z.object({
    programName: z.string().min(1),
    objectType: z.string().optional(),
    additionalObjects: z.array(additionalObjectSchema).optional(),
    templateContent: z.string().optional(),
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    sendSSE(res, { type: 'error', message: '参数错误：' + parseResult.error.message });
    res.end();
    return;
  }

  const { programName, objectType, additionalObjects, templateContent } = parseResult.data;
  const abortController = makeAbortController(req, res);

  try {
    const docService = new DocumentService();
    for await (const event of docService.generateFromSAP({
      programName,
      objectType,
      documentType: 'FS',
      signal: abortController.signal,
      additionalObjects,
      templateContent,
    })) {
      if (res.writableEnded) break;
      sendSSE(res, event);
    }
  } catch (err) {
    if (!res.writableEnded) {
      sendSSE(res, { type: 'error', message: (err as Error).message });
    }
  } finally {
    if (!res.writableEnded) res.end();
  }
}

export async function generateCode(req: Request, res: Response): Promise<void> {
  initSSE(res);

  const schema = z.object({
    fsContent: z.string().min(1),
    targetProgramName: z.string().optional(),
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    sendSSE(res, { type: 'error', message: '参数错误：' + parseResult.error.message });
    res.end();
    return;
  }

  const { fsContent, targetProgramName } = parseResult.data;
  const abortController = makeAbortController(req, res);

  try {
    const docService = new DocumentService();
    for await (const event of docService.generateCodeFromFS({
      fsContent,
      targetProgramName,
      signal: abortController.signal,
    })) {
      if (res.writableEnded) break;
      sendSSE(res, event);
    }
  } catch (err) {
    if (!res.writableEnded) {
      sendSSE(res, { type: 'error', message: (err as Error).message });
    }
  } finally {
    if (!res.writableEnded) res.end();
  }
}

export async function generatePseudocode(req: Request, res: Response): Promise<void> {
  initSSE(res);

  const schema = z.object({
    programName: z.string().min(1),
    source: z.string().min(1),
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    sendSSE(res, { type: 'error', message: '参数错误：' + parseResult.error.message });
    res.end();
    return;
  }

  const { programName, source } = parseResult.data;
  const abortController = makeAbortController(req, res);

  try {
    const claudeService = new ClaudeService();
    for await (const chunk of claudeService.streamGenerate({
      systemPrompt: PSEUDOCODE_SYSTEM_PROMPT,
      userMessage: buildPseudocodeUserMessage(programName, source),
      maxTokens: 1024,
      temperature: 0.2,
      signal: abortController.signal,
    })) {
      if (res.writableEnded) break;
      sendSSE(res, { type: 'chunk', content: chunk });
    }
    if (!res.writableEnded) sendSSE(res, { type: 'done' });
  } catch (err) {
    if (!res.writableEnded) {
      sendSSE(res, { type: 'error', message: (err as Error).message });
    }
  } finally {
    if (!res.writableEnded) res.end();
  }
}

export async function generateFSFromMeeting(req: Request, res: Response): Promise<void> {
  initSSE(res);

  const schema = z.object({
    meetingContent: z.string().min(1),
    projectContext: z.string().optional(),
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    sendSSE(res, { type: 'error', message: '参数错误：' + parseResult.error.message });
    res.end();
    return;
  }

  const { meetingContent, projectContext } = parseResult.data;
  const abortController = makeAbortController(req, res);

  try {
    const docService = new DocumentService();
    for await (const event of docService.generateFSFromMeeting({
      meetingContent,
      projectContext,
      signal: abortController.signal,
    })) {
      if (res.writableEnded) break;
      sendSSE(res, event);
    }
  } catch (err) {
    if (!res.writableEnded) {
      sendSSE(res, { type: 'error', message: (err as Error).message });
    }
  } finally {
    if (!res.writableEnded) res.end();
  }
}
