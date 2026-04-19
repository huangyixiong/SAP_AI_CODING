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

  /** 可选：配置 SMTP 后「规格·邮件外发」可用 */
  mail: {
    enabled: !!(process.env.SMTP_HOST && process.env.MAIL_FROM),
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.MAIL_FROM || '',
  },

  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
};
