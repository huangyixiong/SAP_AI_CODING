import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  sap: {
    url: requireEnv('SAP_URL'),
    user: requireEnv('SAP_USER'),
    password: requireEnv('SAP_PASSWORD'),
    client: process.env.SAP_CLIENT || '100',
    language: process.env.SAP_LANGUAGE || 'ZH',
    rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
  },

  claude: {
    apiKey: requireEnv('LLM_API_KEY'),
    baseURL: process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: process.env.LLM_MODEL || 'qwen-max',
    maxTokens: 8192,
    temperature: 0.3,
  },

  mcp: {
    serverPath: path.resolve(
      __dirname,
      '../../',
      process.env.MCP_SERVER_PATH || '../mcp-abap-abap-adt-api/dist/index.js'
    ),
  },
};
