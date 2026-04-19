import fs from 'fs';
import path from 'path';
import ClaudeService from './ClaudeService';
import logger from '../lib/logger';

export interface WritebackMemoryRule {
  id: string;
  title: string;
  rule: string;
  sourceErrorCode: string;
  sourceStage: string;
  enabled: boolean;
  createdAt: string;
  hitCount: number;
}

interface MemoryStore {
  rules: WritebackMemoryRule[];
}

const MEMORY_FILE = path.resolve(__dirname, '../data/writeback-memory-rules.json');
const MAX_RULES = 30;
const MAX_INJECT_RULES = 6;

class WritebackMemoryService {
  private static instance: WritebackMemoryService;
  private claudeService = new ClaudeService();

  static getInstance(): WritebackMemoryService {
    if (!WritebackMemoryService.instance) {
      WritebackMemoryService.instance = new WritebackMemoryService();
    }
    return WritebackMemoryService.instance;
  }

  private ensureStore(): void {
    const dir = path.dirname(MEMORY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(MEMORY_FILE)) {
      const initial: MemoryStore = { rules: [] };
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    }
  }

  private readStore(): MemoryStore {
    this.ensureStore();
    try {
      const raw = fs.readFileSync(MEMORY_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as MemoryStore;
      return parsed?.rules ? parsed : { rules: [] };
    } catch (err) {
      logger.warn('[WritebackMemory] Failed to read memory file, fallback empty', {
        error: err instanceof Error ? err.message : String(err),
      });
      return { rules: [] };
    }
  }

  private writeStore(store: MemoryStore): void {
    this.ensureStore();
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2), 'utf-8');
  }

  private fallbackRule(errorCode: string, stage: string, message: string): { title: string; rule: string } {
    const title = `避免 ${errorCode}（${stage}）`;
    const brief = message.slice(0, 180);
    return {
      title,
      rule: `当进入${stage}阶段时，必须先满足与错误码 ${errorCode} 对应的前置条件；若检测到风险，先中止并提示修复。参考错误信息：${brief}`,
    };
  }

  private async generateRuleByLLM(errorCode: string, stage: string, message: string): Promise<{ title: string; rule: string }> {
    const prompt = `你是SAP写回质量治理助手。请根据以下失败信息，提炼一条“可执行、可复用”的提示词记忆规则，减少后续同类失败。

失败信息：
- 错误码：${errorCode}
- 阶段：${stage}
- 错误信息：${message}

输出要求（严格JSON）：
{"title":"<简短标题>","rule":"<一条可执行规则，不超过80字>"}`
;
    try {
      const raw = await this.claudeService.generate({
        systemPrompt: '你擅长把错误日志提炼成稳定的提示词规则。只输出JSON。',
        userMessage: prompt,
        maxTokens: 300,
        temperature: 0.1,
      });
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object found');
      const parsed = JSON.parse(jsonMatch[0]) as { title?: string; rule?: string };
      if (!parsed.title || !parsed.rule) throw new Error('Missing title/rule');
      return { title: parsed.title.trim(), rule: parsed.rule.trim() };
    } catch (err) {
      logger.warn('[WritebackMemory] LLM rule generation failed, use fallback', {
        error: err instanceof Error ? err.message : String(err),
      });
      return this.fallbackRule(errorCode, stage, message);
    }
  }

  async captureFailure(input: {
    errorCode?: string;
    stage: string;
    message: string;
  }): Promise<void> {
    const errorCode = input.errorCode || 'UNKNOWN_ERROR';
    const normalizedMessage = (input.message || '').trim();
    if (!normalizedMessage) return;

    const store = this.readStore();
    const duplicated = store.rules.find(
      (r) => r.enabled && r.sourceErrorCode === errorCode && r.sourceStage === input.stage
    );
    if (duplicated) {
      duplicated.hitCount += 1;
      this.writeStore(store);
      return;
    }

    const ruleGenerated = await this.generateRuleByLLM(errorCode, input.stage, normalizedMessage);
    const newRule: WritebackMemoryRule = {
      id: `wr-${Date.now()}`,
      title: ruleGenerated.title,
      rule: ruleGenerated.rule,
      sourceErrorCode: errorCode,
      sourceStage: input.stage,
      enabled: true,
      createdAt: new Date().toISOString(),
      hitCount: 1,
    };
    store.rules.unshift(newRule);
    store.rules = store.rules.slice(0, MAX_RULES);
    this.writeStore(store);
    logger.info('[WritebackMemory] New memory rule captured', {
      id: newRule.id,
      errorCode,
      stage: input.stage,
    });
  }

  getPromptAddon(): string {
    const store = this.readStore();
    const active = store.rules.filter((r) => r.enabled).slice(0, MAX_INJECT_RULES);
    if (active.length === 0) return '';
    const lines = active.map((r, idx) => `${idx + 1}. ${r.rule}（来源：${r.sourceErrorCode}/${r.sourceStage}）`);
    return `\n\n## 历史失败记忆规则（自动沉淀）\n请严格遵守以下规则，避免重复历史错误：\n${lines.join('\n')}`;
  }
}

export default WritebackMemoryService;
