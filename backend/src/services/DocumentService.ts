import MCPClientService from './MCPClientService';
import ClaudeService from './ClaudeService';
import { TS_SYSTEM_PROMPT, buildTSUserMessage } from '../prompts/ts.prompt';
import { FS_SYSTEM_PROMPT, buildFSUserMessage } from '../prompts/fs.prompt';
import { CODE_SYSTEM_PROMPT, buildCodeUserMessage } from '../prompts/code.prompt';
import { FS_FROM_MEETING_SYSTEM_PROMPT, buildFSFromMeetingUserMessage } from '../prompts/fs-from-meeting.prompt';
import { WriteBackResult } from '../types/api.types';

const MAX_SOURCE_LINES = 8000;

export interface AdditionalObject {
  name: string;
  type: string;
  objectUrl?: string;
}

export interface GenerateFromSAPOptions {
  programName: string;
  objectType?: string;
  documentType: 'TS' | 'FS';
  signal?: AbortSignal;
  additionalObjects?: AdditionalObject[];
}

export interface GenerateCodeOptions {
  fsContent: string;
  targetProgramName?: string;
  signal?: AbortSignal;
}

export interface GenerateFSFromMeetingOptions {
  meetingContent: string;
  projectContext?: string;
  signal?: AbortSignal;
}

export interface WriteBackOptions {
  objectUrl: string;
  objectName: string;
  source: string;
  transportNumber?: string;
}

class DocumentService {
  private mcpService: MCPClientService;
  private claudeService: ClaudeService;

  constructor() {
    this.mcpService = MCPClientService.getInstance();
    this.claudeService = new ClaudeService();
  }

  // Yields SSE-style progress objects and final text chunks
  async *generateFromSAP(options: GenerateFromSAPOptions): AsyncGenerator<{
    type: string;
    [key: string]: unknown;
  }> {
    const { programName, objectType, documentType, signal, additionalObjects } = options;

    yield { type: 'start', programName, documentType };

    // Step 1: Search for the object
    const results = await this.mcpService.searchObject(programName, objectType, 5);
    if (results.length === 0) {
      yield { type: 'error', message: `未找到 SAP 对象：${programName}` };
      return;
    }

    const obj = results[0];
    yield { type: 'object_found', objectName: obj.name, objectType: obj.type };

    // Step 2: Get source URL from object structure
    let sourceUrl: string;
    try {
      const structure = await this.mcpService.objectStructure(obj.objectUrl);
      sourceUrl = structure.sourceUrl;
    } catch {
      sourceUrl = `${obj.objectUrl}/source/main`;
    }

    // Step 3: Fetch source code
    let source: string;
    try {
      source = await this.mcpService.getObjectSource(sourceUrl);
    } catch (err) {
      yield { type: 'error', message: `读取源码失败：${(err as Error).message}` };
      return;
    }

    const lineCount = source.split('\n').length;
    yield { type: 'source_fetched', sourceLength: source.length, lineCount };

    // Warn if source is very large
    if (lineCount > MAX_SOURCE_LINES) {
      yield {
        type: 'warning',
        message: `程序行数（${lineCount}）超过 ${MAX_SOURCE_LINES} 行，已截断前 ${MAX_SOURCE_LINES} 行进行分析`,
      };
      source = source.split('\n').slice(0, MAX_SOURCE_LINES).join('\n');
    }

    // Step 3.5: Fetch additional (related) objects
    let combinedSource = source;
    if (additionalObjects && additionalObjects.length > 0) {
      for (const addObj of additionalObjects) {
        try {
          yield { type: 'fetching_related', objectName: addObj.name, objectType: addObj.type };

          // Resolve objectUrl if not provided — search by name
          let resolvedUrl = addObj.objectUrl;
          if (!resolvedUrl) {
            const found = await this.mcpService.searchObject(addObj.name, addObj.type, 1);
            if (found.length === 0) {
              yield { type: 'warning', message: `未找到关联对象 ${addObj.name}，已跳过` };
              continue;
            }
            resolvedUrl = found[0].objectUrl;
          }

          const addStructure = await this.mcpService.objectStructure(resolvedUrl);
          const addSource = await this.mcpService.getObjectSource(addStructure.sourceUrl);
          combinedSource += `\n\n${'─'.repeat(60)}\n关联对象：${addObj.name}（${addObj.type}）\n${'─'.repeat(60)}\n${addSource}`;
          yield { type: 'related_fetched', objectName: addObj.name };
        } catch (err) {
          yield { type: 'warning', message: `无法读取关联对象 ${addObj.name}：${(err as Error).message}` };
        }
      }
    }

    // Step 4: Stream LLM generation
    const systemPrompt = documentType === 'TS' ? TS_SYSTEM_PROMPT : FS_SYSTEM_PROMPT;
    const userMessage =
      documentType === 'TS'
        ? buildTSUserMessage(obj.name, obj.type, combinedSource)
        : buildFSUserMessage(obj.name, obj.type, combinedSource);

    yield { type: 'generating', message: `正在生成 ${documentType} 文档...` };

    let totalChars = 0;
    for await (const chunk of this.claudeService.streamGenerate({
      systemPrompt,
      userMessage,
      signal,
    })) {
      totalChars += chunk.length;
      yield { type: 'chunk', content: chunk };
    }

    yield { type: 'done', totalChars };
  }

  async *generateCodeFromFS(options: GenerateCodeOptions): AsyncGenerator<{
    type: string;
    [key: string]: unknown;
  }> {
    const { fsContent, targetProgramName, signal } = options;

    yield { type: 'start', targetProgramName };

    const userMessage = buildCodeUserMessage(targetProgramName || 'ZNEW_PROGRAM', fsContent);

    let totalChars = 0;
    for await (const chunk of this.claudeService.streamGenerate({
      systemPrompt: CODE_SYSTEM_PROMPT,
      userMessage,
      signal,
    })) {
      totalChars += chunk.length;
      yield { type: 'chunk', content: chunk };
    }

    yield { type: 'done', totalChars };
  }

  async *generateFSFromMeeting(options: GenerateFSFromMeetingOptions): AsyncGenerator<{
    type: string;
    [key: string]: unknown;
  }> {
    const { meetingContent, projectContext, signal } = options;

    yield { type: 'start' };

    const userMessage = buildFSFromMeetingUserMessage(meetingContent, projectContext);

    let totalChars = 0;
    for await (const chunk of this.claudeService.streamGenerate({
      systemPrompt: FS_FROM_MEETING_SYSTEM_PROMPT,
      userMessage,
      signal,
    })) {
      totalChars += chunk.length;
      yield { type: 'chunk', content: chunk };
    }

    yield { type: 'done', totalChars };
  }

  async writeCodeBackToSAP(options: WriteBackOptions): Promise<WriteBackResult> {
    const { objectUrl, objectName, source, transportNumber } = options;

    let lockHandle: string | null = null;

    try {
      // Step 1: Lock
      lockHandle = await this.mcpService.lock(objectUrl);

      // Step 2: Write source
      const sourceUrl = objectUrl.endsWith('/source/main')
        ? objectUrl
        : `${objectUrl}/source/main`;
      await this.mcpService.setObjectSource(sourceUrl, source, lockHandle, transportNumber);

      // Step 3: Activate
      const activationResult = await this.mcpService.activateByName(objectName, objectUrl);

      return {
        success: true,
        activationResult: {
          success: activationResult.success,
          messages: activationResult.messages,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    } finally {
      // Step 4: Always unlock
      if (lockHandle) {
        try {
          await this.mcpService.unLock(objectUrl, lockHandle);
        } catch (unlockErr) {
          console.error('[DocumentService] Failed to unlock object:', unlockErr);
        }
      }
    }
  }
}

export default DocumentService;
