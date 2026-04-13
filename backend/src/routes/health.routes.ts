import { Router, Request, Response } from 'express';
import MCPClientService from '../services/MCPClientService';
import SAPConfigService from '../services/SAPConfigService';
import { config } from '../config';

const router = Router();

// Parse host from SAP URL (e.g. "http://192.168.20.41:8000" → "192.168.20.41:8000")
function parseSAPHost(url: string): string {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    return url;
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const mcpService = MCPClientService.getInstance();
  const configService = SAPConfigService.getInstance();
  const alive = await mcpService.liveCheck();
  const { time } = mcpService.getLastHeartbeat();

  // Try to get active config first
  const activeConfig = configService.getActiveConfig();
  
  const sapUrl = activeConfig?.url || config.sap.url;
  const sapUser = activeConfig?.user || config.sap.user;
  const sapClient = activeConfig?.client || config.sap.client;
  const sapLanguage = activeConfig?.language || config.sap.language;

  res.status(200).json({
    status: 'ok',
    sap: {
      connected: alive,
      url: sapUrl,
      host: parseSAPHost(sapUrl),
      user: sapUser,
      client: sapClient,
      language: sapLanguage,
      lastCheck: time?.toISOString() ?? null,
      message: alive
        ? undefined
        : '无法连接 SAP，请检查 SAP 配置',
    },
    claude: { available: true },
    timestamp: new Date().toISOString(),
  });
});

export default router;
