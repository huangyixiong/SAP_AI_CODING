import MCPClientService from './MCPClientService';
import ClaudeService from './ClaudeService';
import { TS_SYSTEM_PROMPT, buildTSUserMessage } from '../prompts/ts.prompt';
import { FS_SYSTEM_PROMPT, buildFSUserMessage } from '../prompts/fs.prompt';
import { CODE_SYSTEM_PROMPT, buildCodeUserMessage } from '../prompts/code.prompt';
import { FS_FROM_MEETING_SYSTEM_PROMPT, buildFSFromMeetingUserMessage } from '../prompts/fs-from-meeting.prompt';
import { WriteBackResult } from '../types/api.types';
import logger from '../lib/logger';
import { SAPConnectionError, LLMError } from '../errors';

const MAX_SOURCE_LINES = 8000;

// Meeting Summary Prompt
const MEETING_SUMMARY_SYSTEM_PROMPT = `你是一位专业的会议纪要整理专家，擅长从会议录音转文字或会议记录中提取关键信息并生成结构化的会议纪要。

## 你的任务
根据提供的会议内容，生成一份专业、清晰、结构完整的会议纪要。

## 输出格式要求
请严格按照以下Markdown格式输出：

# 会议纪要

## 1. 基本信息
- **会议主题**：[主题]
- **会议时间**：[时间]
- **参会人员**：[人员列表]
- **记录人**：[记录人]

## 2. 会议背景
[简要说明会议召开的背景和目的]

## 3. 讨论要点
[分条列出主要讨论的内容，每条包含：
- 议题标题
- 讨论内容摘要
- 关键决策或结论]

## 4. 决策与结论
[总结会议中达成的重要决策和结论]

## 5. 待办事项（Action Items）
| 序号 | 任务描述 | 负责人 | 截止日期 | 状态 |
|------|----------|--------|----------|------|
| 1 | [任务] | [负责人] | [日期] | [状态] |

## 6. 下次会议安排
- **时间**：[时间]
- **议题**：[议题]

## 7. 附件与参考资料
[列出相关文档、链接等]

## 写作原则
1. **客观准确**：忠实于原始会议内容，不添加主观臆断
2. **重点突出**：突出关键决策、重要讨论点和行动项
3. **条理清晰**：使用清晰的层级结构和编号
4. **语言简练**：用简洁明了的语言表达
5. ** actionable**：确保待办事项具体、可执行、有明确责任人和时间节点

## 注意事项
- 如果某些信息在原文中未提及，标注为"待确认"
- 对于模糊或不确定的内容，保持原文表述或标注需要澄清
- 专业术语保持原样，必要时添加简短解释`;

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

export interface GenerateFSFromMeetingOptions {
  meetingContent: string;
  projectContext?: string;
  signal?: AbortSignal;
  customSystemPrompt?: string; // 新增：自定义系统提示词
}

export interface GenerateMeetingSummaryOptions {
  meetingText: string;
  signal?: AbortSignal;
  customSystemPrompt?: string; // 新增：自定义系统提示词
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
      const systemPrompt = customSystemPrompt?.trim() || CODE_SYSTEM_PROMPT;

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

  async *generateFSFromMeeting(options: GenerateFSFromMeetingOptions): AsyncGenerator<{
    type: string;
    [key: string]: unknown;
  }> {
    const { meetingContent, projectContext, signal, customSystemPrompt } = options;

    logger.info('[DocumentService] Starting FS generation from meeting notes', {
      usingCustomPrompt: !!customSystemPrompt?.trim()
    });
    yield { type: 'start' };

    try {
      const userMessage = buildFSFromMeetingUserMessage(meetingContent, projectContext);

      // 使用自定义提示词或默认提示词
      const systemPrompt = customSystemPrompt?.trim() || FS_FROM_MEETING_SYSTEM_PROMPT;

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

      logger.info('[DocumentService] Meeting to FS completed', { totalChars, chunks: chunkCount });
      yield { type: 'done', totalChars };
    } catch (error) {
      logger.error('[DocumentService] Meeting to FS failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  async *generateMeetingSummary(options: GenerateMeetingSummaryOptions): AsyncGenerator<{
    type: string;
    [key: string]: unknown;
  }> {
    const { meetingText, signal, customSystemPrompt } = options;

    logger.info('[DocumentService] Starting meeting summary generation', {
      usingCustomPrompt: !!customSystemPrompt?.trim()
    });
    yield { type: 'start' };

    try {
      const userMessage = `请根据以下会议内容生成结构化的会议纪要：

${meetingText}

请按照系统提示中的格式要求，提取关键信息并生成专业的会议纪要。`;

      // 使用自定义提示词或默认提示词
      const systemPrompt = customSystemPrompt?.trim() || MEETING_SUMMARY_SYSTEM_PROMPT;

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

      logger.info('[DocumentService] Meeting summary generation completed', { 
        totalChars, 
        chunks: chunkCount 
      });
      yield { type: 'done', totalChars };
    } catch (error) {
      logger.error('[DocumentService] Meeting summary generation failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  async writeCodeBackToSAP(options: WriteBackOptions): Promise<WriteBackResult> {
    const { objectUrl, objectName, source, transportNumber } = options;

    logger.info('[DocumentService] Writing code back to SAP', { 
      objectName, 
      objectUrl, 
      hasTransport: !!transportNumber 
    });

    let lockHandle: string | null = null;

    try {
      // Step 1: Lock
      logger.debug('[DocumentService] Locking object', { objectUrl });
      lockHandle = await this.mcpService.lock(objectUrl);

      // Step 2: Write source
      const sourceUrl = objectUrl.endsWith('/source/main')
        ? objectUrl
        : `${objectUrl}/source/main`;
      
      logger.debug('[DocumentService] Setting object source', { sourceUrl });
      await this.mcpService.setObjectSource(sourceUrl, source, lockHandle, transportNumber);

      // Step 3: Activate
      logger.info('[DocumentService] Activating object', { objectName });
      const activationResult = await this.mcpService.activateByName(objectName, objectUrl);

      if (activationResult.success) {
        logger.info('[DocumentService] Code written and activated successfully', { objectName });
      } else {
        logger.warn('[DocumentService] Activation completed with messages', { 
          objectName, 
          messages: activationResult.messages 
        });
      }

      return {
        success: true,
        activationResult: {
          success: activationResult.success,
          messages: activationResult.messages,
        },
      };
    } catch (err) {
      logger.error('[DocumentService] Failed to write code to SAP', { 
        error: err instanceof Error ? err.message : String(err),
        objectName 
      });
      
      return {
        success: false,
        error: (err as Error).message,
      };
    } finally {
      // Step 4: Always unlock
      if (lockHandle) {
        try {
          logger.debug('[DocumentService] Unlocking object', { objectUrl });
          await this.mcpService.unLock(objectUrl, lockHandle);
        } catch (unlockErr) {
          logger.error('[DocumentService] Failed to unlock object - THIS MAY CAUSE LOCK ISSUES', { 
            error: unlockErr instanceof Error ? unlockErr.message : String(unlockErr),
            objectUrl,
            recommendation: 'Please manually unlock the object in SAP'
          });
          // Note: We don't throw here to avoid masking the original error
        }
      }
    }
  }
}

export default DocumentService;
