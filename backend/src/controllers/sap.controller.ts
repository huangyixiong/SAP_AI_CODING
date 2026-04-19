import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import MCPClientService from '../services/MCPClientService';
import { analyzeABAPSource } from '../services/ABAPAnalyzer';
import WritebackMemoryService from '../services/WritebackMemoryService';

const mcpService = MCPClientService.getInstance();
const memoryService = WritebackMemoryService.getInstance();

function extractObjectNameFromUrl(url: string): string {
  const normalized = url.replace(/\/source\/main\/?$/i, '').replace(/\/+$/, '');
  const parts = normalized.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').toUpperCase();
}

export async function searchObjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({
      q: z.string().min(1),
      type: z.string().optional(),
      max: z.coerce.number().int().min(1).max(100).optional(),
    });

    const { q, type, max } = schema.parse(req.query);
    const results = await mcpService.searchObject(q, type, max ?? 20);

    res.json({ success: true, data: { results, total: results.length } });
  } catch (err) {
    next(err);
  }
}

export async function getObjectSource(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({ objectUrl: z.string().min(1) });
    const { objectUrl } = schema.parse(req.query);

    const structure = await mcpService.objectStructure(objectUrl);
    const source = await mcpService.getObjectSource(structure.sourceUrl);

    res.json({
      success: true,
      data: { source, objectUrl, sourceUrl: structure.sourceUrl },
    });
  } catch (err) {
    next(err);
  }
}

export async function analyzeObject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({ objectUrl: z.string().min(1) });
    const { objectUrl } = schema.parse(req.query);

    console.log('[SAP] analyzeObject called for:', objectUrl);

    const structure = await mcpService.objectStructure(objectUrl);
    const source = await mcpService.getObjectSource(structure.sourceUrl);
    const rawRelated = analyzeABAPSource(source);

    // Construct SAP ADT objectUrl based on known type patterns
    const ADT_URL_MAP: Record<string, string> = {
      'PROG/I': '/sap/bc/adt/programs/includes',
      'PROG/P': '/sap/bc/adt/programs/programs',
      'FUNC':   '/sap/bc/adt/functions/modules',
      'FUGR':   '/sap/bc/adt/function-groups',
      'CLAS':   '/sap/bc/adt/oo/classes',
      'INTF':   '/sap/bc/adt/oo/interfaces',
      'TABL':   '/sap/bc/adt/ddic/tables',
      'TABL/DT':'/sap/bc/adt/ddic/tables',
      'DTEL':   '/sap/bc/adt/ddic/dataelements',
      'DOMA':   '/sap/bc/adt/ddic/domains',
    };

    const relatedObjects = rawRelated.map((obj) => {
      const basePath = ADT_URL_MAP[obj.type];
      const resolvedUrl = basePath ? `${basePath}/${obj.name.toLowerCase()}` : undefined;
      return { ...obj, objectUrl: resolvedUrl, description: '' };
    });

    console.log('[SAP] analyzeObject found', relatedObjects.length, 'related objects');

    res.json({
      success: true,
      data: {
        source,
        lineCount: source.split('\n').length,
        relatedObjects,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function writeBack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({
      objectUrl: z.string().trim().min(1).refine((value) => value.startsWith('/sap/bc/adt/'), {
        message: 'objectUrl 必须是 ADT 路径（以 /sap/bc/adt/ 开头）',
      }),
      objectName: z.string().trim().min(1),
      source: z.string().trim().min(1),
      transportNumber: z.string().optional(),
      activationMode: z.enum(['auto', 'manual']).optional(),
    });

    const { objectUrl, objectName, source, transportNumber, activationMode } = schema.parse(req.body);
    const requestId = req.header('x-request-id') || randomUUID();
    res.setHeader('x-request-id', requestId);
    const urlObjectName = extractObjectNameFromUrl(objectUrl);
    if (urlObjectName && urlObjectName !== objectName.trim().toUpperCase()) {
      void memoryService.captureFailure({
        errorCode: 'OBJECT_NAME_MISMATCH',
        stage: 'write',
        message: `URL名称(${urlObjectName})与对象名(${objectName})不一致`,
      });
      res.status(400).json({
        requestId,
        requestSuccess: false,
        writeSuccess: false,
        activationSuccess: null,
        activationMode: activationMode || 'auto',
        stage: 'precheck',
        errorCode: 'OBJECT_NAME_MISMATCH',
        error: `对象 URL 名称(${urlObjectName})与 objectName(${objectName})不一致`,
        messages: [],
        timings: { total_ms: 0 },
      });
      return;
    }

    const { default: DocumentService } = await import('../services/DocumentService');
    const docService = new DocumentService();
    const result = await docService.writeCodeBackToSAP({
      objectUrl,
      objectName,
      source,
      transportNumber,
      activationMode,
      requestId,
    });

    if (!result.requestSuccess) {
      void memoryService.captureFailure({
        errorCode: result.errorCode,
        stage: result.stage,
        message: result.error || result.messages.join('；') || '写回失败',
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function activateAfterWrite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({
      objectUrl: z.string().trim().min(1).refine((value) => value.startsWith('/sap/bc/adt/'), {
        message: 'objectUrl 必须是 ADT 路径（以 /sap/bc/adt/ 开头）',
      }),
      objectName: z.string().trim().min(1),
    });
    const { objectUrl, objectName } = schema.parse(req.body);
    const requestId = req.header('x-request-id') || randomUUID();
    res.setHeader('x-request-id', requestId);
    const urlObjectName = extractObjectNameFromUrl(objectUrl);
    if (urlObjectName && urlObjectName !== objectName.trim().toUpperCase()) {
      void memoryService.captureFailure({
        errorCode: 'OBJECT_NAME_MISMATCH',
        stage: 'activate',
        message: `URL名称(${urlObjectName})与对象名(${objectName})不一致`,
      });
      res.status(400).json({
        requestId,
        requestSuccess: false,
        writeSuccess: true,
        activationSuccess: false,
        activationMode: 'manual',
        stage: 'precheck',
        errorCode: 'OBJECT_NAME_MISMATCH',
        error: `对象 URL 名称(${urlObjectName})与 objectName(${objectName})不一致`,
        messages: [],
        timings: { total_ms: 0 },
      });
      return;
    }

    const { default: DocumentService } = await import('../services/DocumentService');
    const docService = new DocumentService();
    const result = await docService.activateCodeInSAP({ objectUrl, objectName, requestId });
    if (!result.requestSuccess) {
      void memoryService.captureFailure({
        errorCode: result.errorCode,
        stage: result.stage,
        message: result.error || result.messages.join('；') || '激活失败',
      });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function precheckWriteBack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const requestId = req.header('x-request-id') || randomUUID();
    res.setHeader('x-request-id', requestId);
    const startedAt = Date.now();
    const schema = z.object({
      objectUrl: z.string().trim().min(1).refine((value) => value.startsWith('/sap/bc/adt/'), {
        message: 'objectUrl 必须是 ADT 路径（以 /sap/bc/adt/ 开头）',
      }),
      objectName: z.string().trim().min(1),
      source: z.string().trim().min(1).optional(),
    });
    const { objectUrl, objectName, source } = schema.parse(req.body);
    const urlObjectName = extractObjectNameFromUrl(objectUrl);
    const normalizedObjectName = objectName.trim().toUpperCase();
    if (urlObjectName && urlObjectName !== normalizedObjectName) {
      void memoryService.captureFailure({
        errorCode: 'OBJECT_NAME_MISMATCH',
        stage: 'precheck',
        message: `URL名称(${urlObjectName})与对象名(${objectName})不一致`,
      });
      res.status(400).json({
        requestId,
        requestSuccess: false,
        writeSuccess: false,
        activationSuccess: null,
        activationMode: 'auto',
        stage: 'precheck',
        errorCode: 'OBJECT_NAME_MISMATCH',
        error: `对象 URL 名称(${urlObjectName})与 objectName(${objectName})不一致`,
        messages: [],
        timings: { total_ms: Date.now() - startedAt },
      });
      return;
    }

    const messages: string[] = [];
    const structure = await mcpService.objectStructure(objectUrl);
    const sourceUrl = structure.sourceUrl;

    // lockability probe
    const lockStart = Date.now();
    let lockHandle: string | null = null;
    try {
      lockHandle = await mcpService.lock(objectUrl);
      messages.push('锁探测通过');
    } finally {
      if (lockHandle) {
        await mcpService.unLock(objectUrl, lockHandle);
      }
    }
    const precheckMs = Date.now() - lockStart;

    // transport probe
    let transportRequired = false;
    try {
      const info = await mcpService.transportInfo(sourceUrl);
      const infoText = JSON.stringify(info).toLowerCase();
      transportRequired = infoText.includes('transport') && !infoText.includes('not required');
      messages.push('transportInfo 检查完成');
    } catch {
      messages.push('transportInfo 检查失败，建议手动确认传输请求');
    }

    // syntax probe (if source is provided)
    let syntaxOk: boolean | null = null;
    if (source) {
      try {
        await mcpService.syntaxCheckCode(sourceUrl, source);
        syntaxOk = true;
        messages.push('语法预检查通过');
      } catch (err) {
        void memoryService.captureFailure({
          errorCode: 'SYNTAX_CHECK_FAILED',
          stage: 'precheck',
          message: (err as Error).message,
        });
        res.status(400).json({
          requestId,
          requestSuccess: false,
          writeSuccess: false,
          activationSuccess: null,
          activationMode: 'auto',
          stage: 'precheck',
          errorCode: 'SYNTAX_CHECK_FAILED',
          error: (err as Error).message,
          messages,
          timings: { precheck_ms: precheckMs, total_ms: Date.now() - startedAt },
        });
        return;
      }
    }

    res.json({
      requestId,
      requestSuccess: true,
      writeSuccess: false,
      activationSuccess: null,
      activationMode: 'auto',
      stage: 'precheck',
      messages,
      timings: { precheck_ms: precheckMs, total_ms: Date.now() - startedAt },
      data: { objectName: normalizedObjectName, objectUrl, sourceUrl, reachable: true, transportRequired, syntaxOk },
    });
  } catch (err) {
    next(err);
  }
}
