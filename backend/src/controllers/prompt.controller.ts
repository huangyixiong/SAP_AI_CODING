import { Request, Response } from 'express';
import ClaudeService from '../services/ClaudeService';
import { TS_SYSTEM_PROMPT } from '../prompts/ts.prompt';
import { FS_SYSTEM_PROMPT } from '../prompts/fs.prompt';
import { CODE_SYSTEM_PROMPT } from '../prompts/code.prompt';

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

/**
 * GET /api/prompt/defaults
 * 获取所有默认提示词
 */
export function getDefaultPrompts(req: Request, res: Response): void {
  try {
    res.json({
      success: true,
      data: {
        ts: {
          name: '技术规格书(TS)',
          description: '从SAP ABAP源码生成技术规格书的默认提示词',
          content: TS_SYSTEM_PROMPT,
        },
        fs: {
          name: '功能规格书(FS)',
          description: '从SAP ABAP源码生成功能规格书的默认提示词',
          content: FS_SYSTEM_PROMPT,
        },
        code: {
          name: 'ABAP代码生成',
          description: '从功能规格书生成ABAP代码的默认提示词',
          content: CODE_SYSTEM_PROMPT,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取失败',
    });
  }
}

/**
 * POST /api/prompt/optimize
 * 优化用户输入的自定义提示词
 */
export async function optimizePrompt(req: Request, res: Response): Promise<void> {
  initSSE(res);

  try {
    const { currentPrompt, context, requirements } = req.body;

    if (!currentPrompt || !currentPrompt.trim()) {
      sendSSE(res, { type: 'error', message: '提示词内容不能为空' });
      res.end();
      return;
    }

    // 构建优化请求
    const optimizationPrompt = `你是一位专业的Prompt工程师，擅长优化AI系统提示词以提升输出质量。

## 任务
请优化以下系统提示词，使其更加清晰、结构化、具体化。

## 当前提示词
${currentPrompt}

## 应用场景
${context || '通用场景'}

## 优化要求
${requirements?.map((r: string) => `- ${r}`).join('\n') || '- 提高清晰度和可理解性\n- 增强结构化程度\n- 补充可能遗漏的关键要素\n- 保持原有意图不变'}

## 输出要求
1. 返回完整的优化后提示词（不要只返回修改部分）
2. 保持原有的Markdown格式和结构
3. 如有重大改进，在末尾用"---优化说明---"标注改进点
4. 不要添加额外的解释或评论，直接返回优化后的提示词内容`;

    const claudeService = new ClaudeService();
    
    for await (const chunk of claudeService.streamGenerate({
      systemPrompt: '你是专业的Prompt优化助手，擅长改进AI指令的清晰度、结构化和效果。',
      userMessage: optimizationPrompt,
      maxTokens: 4096,
      temperature: 0.7,
    })) {
      sendSSE(res, { type: 'chunk', content: chunk });
    }

    sendSSE(res, { type: 'done' });
  } catch (error) {
    sendSSE(res, { 
      type: 'error', 
      message: error instanceof Error ? error.message : '优化失败' 
    });
  } finally {
    res.end();
  }
}
