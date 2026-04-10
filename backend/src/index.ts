import express from 'express';
import { config } from './config';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';
import MCPClientService from './services/MCPClientService';
import logger, { httpLogger } from './lib/logger';

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(httpLogger); // 添加 HTTP 请求日志

// API routes
app.use('/api', routes);

// Error handler (must be last)
app.use(errorHandler);

async function start() {
  // Always start the HTTP server first so health endpoint is reachable
  app.listen(config.port, () => {
    logger.info(`[Server] Running on http://localhost:${config.port}`);
    logger.info(`[Server] SAP URL: ${config.sap.url}`);
    logger.info(`[Server] CORS origin: ${config.corsOrigin}`);
  });

  // Connect to SAP in background — failure does NOT kill the process
  const mcpService = MCPClientService.getInstance();
  try {
    await mcpService.connect();
    logger.info('[Server] SAP connection established');
  } catch (err) {
    logger.error('[Server] SAP connection failed (server still running)', { 
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
    logger.error('[Server] Check SAP_URL / SAP_USER / SAP_PASSWORD in .env');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('[Server] Shutting down...');
  await MCPClientService.getInstance().disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('[Server] Shutting down...');
  await MCPClientService.getInstance().disconnect();
  process.exit(0);
});

start();
