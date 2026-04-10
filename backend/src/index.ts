import express from 'express';
import { config } from './config';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';
import MCPClientService from './services/MCPClientService';

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api', routes);

// Error handler (must be last)
app.use(errorHandler);

async function start() {
  // Always start the HTTP server first so health endpoint is reachable
  app.listen(config.port, () => {
    console.log(`[Server] Running on http://localhost:${config.port}`);
    console.log(`[Server] SAP URL: ${config.sap.url}`);
    console.log(`[Server] CORS origin: ${config.corsOrigin}`);
  });

  // Connect to SAP in background — failure does NOT kill the process
  const mcpService = MCPClientService.getInstance();
  try {
    await mcpService.connect();
    console.log('[Server] SAP connection established');
  } catch (err) {
    console.error('[Server] SAP connection failed (server still running):', err);
    console.error('[Server] Check SAP_URL / SAP_USER / SAP_PASSWORD in .env');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Server] Shutting down...');
  await MCPClientService.getInstance().disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Server] Shutting down...');
  await MCPClientService.getInstance().disconnect();
  process.exit(0);
});

start();
