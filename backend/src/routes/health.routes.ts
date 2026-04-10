import { Router, Request, Response } from 'express';
import MCPClientService from '../services/MCPClientService';
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
  const alive = await mcpService.liveCheck();
  const { time } = mcpService.getLastHeartbeat();

  res.status(200).json({
    status: 'ok',
    sap: {
      connected: alive,
      url: config.sap.url,
      host: parseSAPHost(config.sap.url),
      user: config.sap.user,
      client: config.sap.client,
      language: config.sap.language,
      lastCheck: time?.toISOString() ?? null,
      message: alive
        ? undefined
        : '无法连接 SAP，请检查 SAP_URL / SAP_USER / SAP_PASSWORD 配置',
    },
    claude: { available: true },
    timestamp: new Date().toISOString(),
  });
});

export default router;
