import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import MCPClientService from '../services/MCPClientService';
import { analyzeABAPSource } from '../services/ABAPAnalyzer';

const mcpService = MCPClientService.getInstance();

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
      objectUrl: z.string().min(1),
      objectName: z.string().min(1),
      source: z.string().min(1),
      transportNumber: z.string().optional(),
    });

    const { objectUrl, objectName, source, transportNumber } = schema.parse(req.body);

    const { default: DocumentService } = await import('../services/DocumentService');
    const docService = new DocumentService();
    const result = await docService.writeCodeBackToSAP({
      objectUrl,
      objectName,
      source,
      transportNumber,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
