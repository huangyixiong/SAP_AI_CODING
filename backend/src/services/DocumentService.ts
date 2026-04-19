import MCPClientService from './MCPClientService';
import ClaudeService from './ClaudeService';
import WritebackMemoryService from './WritebackMemoryService';
import { TS_SYSTEM_PROMPT, buildTSUserMessage } from '../prompts/ts.prompt';
import { FS_SYSTEM_PROMPT, buildFSUserMessage } from '../prompts/fs.prompt';
import { CODE_SYSTEM_PROMPT, buildCodeUserMessage } from '../prompts/code.prompt';
import { ActivationMode, WriteBackResult } from '../types/api.types';
import logger from '../lib/logger';
import { SAPConnectionError, LLMError } from '../errors';

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
  templateContent?: string;
  customSystemPrompt?: string; // 新增：自定义系统提示词
}

export interface GenerateCodeOptions {
  fsContent: string;
  targetProgramName?: string;
  signal?: AbortSignal;
  customSystemPrompt?: string; // 新增：自定义系统提示词
}

export interface WriteBackOptions {
  objectUrl: string;
  objectName: string;
  source: string;
  transportNumber?: string;
  activationMode?: ActivationMode;
  requestId?: string;
}

class DocumentService {
  private mcpService: MCPClientService;
  private claudeService: ClaudeService;
  private memoryService: WritebackMemoryService;

  constructor() {
    this.mcpService = MCPClientService.getInstance();
    this.claudeService = new ClaudeService();
    this.memoryService = WritebackMemoryService.getInstance();
  }

  // Yields SSE-style progress objects and final text chunks
  async *generateFromSAP(options: GenerateFromSAPOptions): AsyncGenerator<{
    type: string;
    [key: string]: unknown;
  }> {
    const { programName, objectType, documentType, signal, additionalObjects, templateContent } = options;

    logger.info('[DocumentService] Starting document generation', { 
      programName, 
      objectType, 
      documentType,
      additionalObjectsCount: additionalObjects?.length || 0 
    });

    yield { type: 'start', programName, documentType };

    try {
      // Step 1: Search for the object
      const results = await this.mcpService.searchObject(programName, objectType, 5);
      if (results.length === 0) {
        logger.warn('[DocumentService] Object not found', { programName, objectType });
        yield { type: 'error', message: `未找到 SAP 对象：${programName}` };
        return;
      }

      const obj = results[0];
      logger.info('[DocumentService] Object found', { name: obj.name, type: obj.type });
      yield { type: 'object_found', objectName: obj.name, objectType: obj.type };

      // Step 2: Get source URL from object structure
      let sourceUrl: string;
      try {
        const structure = await this.mcpService.objectStructure(obj.objectUrl);
        sourceUrl = structure.sourceUrl;
        logger.debug('[DocumentService] Got source URL', { sourceUrl });
      } catch (err) {
        logger.warn('[DocumentService] Failed to get object structure, using default URL', { 
          error: err instanceof Error ? err.message : String(err) 
        });
        sourceUrl = `${obj.objectUrl}/source/main`;
      }

      // Step 3: Fetch source code
      let source: string;
      try {
        source = await this.mcpService.getObjectSource(sourceUrl);
      } catch (err) {
        logger.error('[DocumentService] Failed to fetch source code', { 
          error: err instanceof Error ? err.message : String(err),
          sourceUrl 
        });
        yield { type: 'error', message: `读取源码失败：${(err as Error).message}` };
        return;
      }

      const lineCount = source.split('\n').length;
      logger.info('[DocumentService] Source code fetched', { lineCount, length: source.length });
      yield { type: 'source_fetched', sourceLength: source.length, lineCount };

      // Warn if source is very large
      if (lineCount > MAX_SOURCE_LINES) {
        logger.warn('[DocumentService] Source code too large, truncating', { 
          lineCount, 
          maxLines: MAX_SOURCE_LINES 
        });
        yield {
          type: 'warning',
          message: `程序行数（${lineCount}）超过 ${MAX_SOURCE_LINES} 行，已截断前 ${MAX_SOURCE_LINES} 行进行分析`,
        };
        source = source.split('\n').slice(0, MAX_SOURCE_LINES).join('\n');
      }

      // Step 3.5: Fetch additional (related) objects
      let combinedSource = source;
      if (additionalObjects && additionalObjects.length > 0) {
        logger.info('[DocumentService] Fetching additional objects', { count: additionalObjects.length });
        
        for (const addObj of additionalObjects) {
          try {
            yield { type: 'fetching_related', objectName: addObj.name, objectType: addObj.type };

            // Resolve objectUrl if not provided — search by name
            let resolvedUrl = addObj.objectUrl;
            if (!resolvedUrl) {
              const found = await this.mcpService.searchObject(addObj.name, addObj.type, 1);
              if (found.length === 0) {
                logger.warn('[DocumentService] Additional object not found', { name: addObj.name });
                yield { type: 'warning', message: `未找到关联对象 ${addObj.name}，已跳过` };
                continue;
              }
              resolvedUrl = found[0].objectUrl;
            }

            const addStructure = await this.mcpService.objectStructure(resolvedUrl);
            const addSource = await this.mcpService.getObjectSource(addStructure.sourceUrl);
            combinedSource += `\n\n${'─'.repeat(60)}\n关联对象：${addObj.name}（${addObj.type}）\n${'─'.repeat(60)}\n${addSource}`;
            logger.debug('[DocumentService] Additional object fetched', { name: addObj.name });
            yield { type: 'related_fetched', objectName: addObj.name };
          } catch (err) {
            logger.warn('[DocumentService] Failed to fetch additional object', { 
              name: addObj.name, 
              error: err instanceof Error ? err.message : String(err) 
            });
            yield { type: 'warning', message: `无法读取关联对象 ${addObj.name}：${(err as Error).message}` };
          }
        }
      }

      // Step 4: Stream LLM generation
      // 使用自定义提示词或默认提示词
      let systemPrompt = options.customSystemPrompt?.trim() 
        ? options.customSystemPrompt 
        : (documentType === 'TS' ? TS_SYSTEM_PROMPT : FS_SYSTEM_PROMPT);
      
      if (templateContent) {
        systemPrompt += `\n\n## 模板格式要求（严格遵守）\n以下是用户提供的 Word 模板内容，请严格按照此模板的章节结构、标题层级、表格格式生成文档，不要增减章节：\n\n${templateContent.slice(0, 6000)}`;
      }
      
      const userMessage =
        documentType === 'TS'
          ? buildTSUserMessage(obj.name, obj.type, combinedSource)
          : buildFSUserMessage(obj.name, obj.type, combinedSource);

      logger.info('[DocumentService] Starting LLM generation', { 
        documentType, 
        usingCustomPrompt: !!options.customSystemPrompt?.trim() 
      });
      yield { type: 'generating', message: `正在生成 ${documentType} 文档...` };

      let totalChars = 0;
      let chunkCount = 0;
      
      for await (const chunk of this.claudeService.streamGenerate({
        systemPrompt,
        userMessage,
        signal,
      })) {
        totalChars += chunk.length;
        chunkCount++;
        yield { type: 'chunk', content: chunk };
      }

      logger.info('[DocumentService] Document generation completed', { 
        documentType, 
        totalChars, 
        chunks: chunkCount 
      });
      yield { type: 'done', totalChars };

    } catch (error) {
      logger.error('[DocumentService] Generation failed', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined 
      });
      
      if (error instanceof SAPConnectionError) {
        yield { type: 'error', message: 'SAP 连接失败,请检查配置' };
      } else if (error instanceof LLMError) {
        yield { type: 'error', message: `AI 服务调用失败：${(error as Error).message}` };
      } else {
        yield { type: 'error', message: `生成失败：${(error as Error).message}` };
      }
    }
  }

  async *generateCodeFromFS(options: GenerateCodeOptions): AsyncGenerator<{
    type: string;
    [key: string]: unknown;
  }> {
    const { fsContent, targetProgramName, signal, customSystemPrompt } = options;

    logger.info('[DocumentService] Starting code generation from FS', { 
      targetProgramName,
      usingCustomPrompt: !!customSystemPrompt?.trim()
    });
    yield { type: 'start', targetProgramName };

    try {
      const userMessage = buildCodeUserMessage(targetProgramName || 'ZNEW_PROGRAM', fsContent);

      // 使用自定义提示词或默认提示词
      let systemPrompt = customSystemPrompt?.trim() || CODE_SYSTEM_PROMPT;
      const memoryAddon = this.memoryService.getPromptAddon();
      if (memoryAddon) {
        systemPrompt += memoryAddon;
      }

      let totalChars = 0;
      let chunkCount = 0;
      
      for await (const chunk of this.claudeService.streamGenerate({
        systemPrompt,
        userMessage,
        signal,
      })) {
        totalChars += chunk.length;
        chunkCount++;
        yield { type: 'chunk', content: chunk };
      }

      logger.info('[DocumentService] Code generation completed', { totalChars, chunks: chunkCount });
      yield { type: 'done', totalChars };
    } catch (error) {
      logger.error('[DocumentService] Code generation failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  async writeCodeBackToSAP(options: WriteBackOptions): Promise<WriteBackResult> {
    const { objectUrl, objectName, source, transportNumber } = options;
    const activationMode = options.activationMode || 'auto';
    const requestId = options.requestId || `wb-${Date.now()}`;
    const messages: string[] = [];
    const startedAt = Date.now();

    logger.info('[DocumentService] Writing code back to SAP', { 
      requestId,
      objectName, 
      objectUrl, 
      hasTransport: !!transportNumber,
      activationMode,
    });

    let lockHandle: string | null = null;
    let writeSuccess = false;
    let activationSuccess: boolean | null = null;
    let stage: WriteBackResult['stage'] = 'lock';
    let errorCode: WriteBackResult['errorCode'] | undefined;
    const timings: WriteBackResult['timings'] = { total_ms: 0 };
    const lockStart = Date.now();

    try {
      // Step 1: Lock
      logger.debug('[DocumentService] Locking object', { objectUrl });
      lockHandle = await this.mcpService.lock(objectUrl);
      timings.precheck_ms = Date.now() - lockStart;

      // Step 2: Write source
      stage = 'write';
      const writeStart = Date.now();
      const sourceUrl = objectUrl.endsWith('/source/main')
        ? objectUrl
        : `${objectUrl}/source/main`;
      
      logger.debug('[DocumentService] Setting object source', { sourceUrl });
      await this.mcpService.setObjectSource(sourceUrl, source, lockHandle, transportNumber);
      writeSuccess = true;
      timings.write_ms = Date.now() - writeStart;

      // Step 3: Activate (optional for manual mode)
      if (activationMode === 'auto') {
        stage = 'activate';
        const activateStart = Date.now();
        logger.info('[DocumentService] Activating object', { requestId, objectName });
        const activationResult = await this.mcpService.activateByName(objectName, objectUrl);
        activationSuccess = activationResult.success;
        messages.push(...activationResult.messages);
        timings.activate_ms = Date.now() - activateStart;
        if (activationResult.success) {
          logger.info('[DocumentService] Code written and activated successfully', { requestId, objectName });
        } else {
          logger.warn('[DocumentService] Activation completed with messages', {
            requestId,
            objectName,
            messages: activationResult.messages,
          });
          errorCode = 'ACTIVATION_FAILED';
        }
      } else {
        activationSuccess = null;
        messages.push('手动激活模式：已写回，待后续激活。');
      }

      return {
        requestId,
        requestSuccess: true,
        writeSuccess,
        activationSuccess,
        activationMode,
        stage: 'done',
        errorCode,
        messages,
        timings: { ...timings, total_ms: Date.now() - startedAt },
      };
    } catch (err) {
      logger.error('[DocumentService] Failed to write code to SAP', { 
        requestId,
        error: err instanceof Error ? err.message : String(err),
        objectName 
      });

      if (stage === 'lock') errorCode = 'LOCK_CONFLICT';
      if (stage === 'write') errorCode = 'WRITE_SOURCE_FAILED';
      if (stage === 'activate') errorCode = errorCode || 'ACTIVATION_FAILED';

      return {
        requestId,
        requestSuccess: false,
        writeSuccess,
        activationSuccess,
        activationMode,
        stage,
        errorCode: errorCode || 'UNKNOWN_ERROR',
        error: (err as Error).message,
        messages,
        timings: { ...timings, total_ms: Date.now() - startedAt },
      };
    } finally {
      // Step 4: Always unlock
      if (lockHandle) {
        stage = 'unlock';
        const unlockStart = Date.now();
        try {
          logger.debug('[DocumentService] Unlocking object', { requestId, objectUrl });
          await this.mcpService.unLock(objectUrl, lockHandle);
          timings.unlock_ms = Date.now() - unlockStart;
        } catch (unlockErr) {
          logger.error('[DocumentService] Failed to unlock object - THIS MAY CAUSE LOCK ISSUES', { 
            requestId,
            error: unlockErr instanceof Error ? unlockErr.message : String(unlockErr),
            objectUrl,
            recommendation: 'Please manually unlock the object in SAP'
          });
          // Note: We don't throw here to avoid masking the original error
        }
      }
    }
  }

  async activateCodeInSAP(options: {
    objectUrl: string;
    objectName: string;
    requestId?: string;
  }): Promise<WriteBackResult> {
    const requestId = options.requestId || `act-${Date.now()}`;
    const startedAt = Date.now();
    const timings: WriteBackResult['timings'] = { total_ms: 0 };
    try {
      const activateStart = Date.now();
      const activationResult = await this.mcpService.activateByName(options.objectName, options.objectUrl);
      timings.activate_ms = Date.now() - activateStart;
      return {
        requestId,
        requestSuccess: activationResult.success,
        writeSuccess: true,
        activationSuccess: activationResult.success,
        activationMode: 'manual',
        stage: 'done',
        errorCode: activationResult.success ? undefined : 'ACTIVATION_FAILED',
        messages: activationResult.messages || [],
        timings: { ...timings, total_ms: Date.now() - startedAt },
      };
    } catch (err) {
      return {
        requestId,
        requestSuccess: false,
        writeSuccess: true,
        activationSuccess: false,
        activationMode: 'manual',
        stage: 'activate',
        errorCode: 'ACTIVATION_FAILED',
        error: (err as Error).message,
        messages: [],
        timings: { ...timings, total_ms: Date.now() - startedAt },
      };
    }
  }
}

export default DocumentService;
