import express from 'express';
import { config } from './config';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';
import MCPClientService from './services/MCPClientService';
import SAPConfigService from './services/SAPConfigService';
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
    logger.info(`[Server] CORS origin: ${config.corsOrigin}`);
  });

  // Connect to SAP in background — try active config first, then fallback to .env
  const mcpService = MCPClientService.getInstance();
  const configService = SAPConfigService.getInstance();
  
  try {
    // Try to get active config from database
    const activeConfig = configService.getActiveConfig();
    
    if (activeConfig) {
      logger.info('[Server] Using active SAP configuration', { 
        name: activeConfig.name,
        url: activeConfig.url,
        user: activeConfig.user,
        client: activeConfig.client
      });
      
      await mcpService.connect({
        url: activeConfig.url,
        user: activeConfig.user,
        password: configService.decrypt(activeConfig.encryptedPassword),
        client: activeConfig.client,
        language: activeConfig.language,
      });
      logger.info('[Server] SAP connection established using dynamic config');
    } else {
      // Fallback to .env config
      logger.info('[Server] No active config found, using .env configuration');
      await mcpService.connect();
      logger.info('[Server] SAP connection established using .env config');
    }
  } catch (err) {
    logger.error('[Server] SAP connection failed (server still running)', { 
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
    logger.error('[Server] Please check your SAP configuration in the UI or .env file');
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
