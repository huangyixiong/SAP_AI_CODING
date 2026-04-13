import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import SAPConfigService from '../services/SAPConfigService';
import MCPClientService from '../services/MCPClientService';
import logger from '../lib/logger';

const configService = SAPConfigService.getInstance();
const mcpService = MCPClientService.getInstance();

// Validation schemas
const createConfigSchema = z.object({
  name: z.string().min(1, '配置名称不能为空'),
  url: z.string().url('URL格式不正确').regex(/^.+:\/\d+$/, 'URL必须包含端口号'),
  user: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
  client: z.string().min(1, 'Client不能为空'),
  language: z.string().min(1, '语言不能为空'),
});

const updateConfigSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().regex(/^.+:\/\d+$/).optional(),
  user: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  client: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
});

export async function getConfigs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const configs = configService.getAllConfigs();
    res.json({ success: true, data: configs });
  } catch (err) {
    next(err);
  }
}

export async function createConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createConfigSchema.parse(req.body);
    const config = configService.createConfig(validated);
    res.status(201).json({ success: true, data: config });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0].message });
    } else {
      next(err);
    }
  }
}

export async function updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const validated = updateConfigSchema.parse(req.body);
    
    const config = configService.updateConfig(id, validated);
    if (!config) {
      res.status(404).json({ success: false, error: '配置不存在' });
      return;
    }
    
    res.json({ success: true, data: config });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0].message });
    } else {
      next(err);
    }
  }
}

export async function deleteConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const success = configService.deleteConfig(id);
    
    if (!success) {
      res.status(404).json({ success: false, error: '配置不存在' });
      return;
    }
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function activateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const config = configService.setActiveConfig(id);
    
    if (!config) {
      res.status(404).json({ success: false, error: '配置不存在' });
      return;
    }
    
    // Reload MCP connection with new config
    try {
      await mcpService.disconnect();
      await mcpService.connect();
      logger.info('[SAP Config] Switched to new configuration and reconnected MCP', { configId: id });
    } catch (connectErr) {
      logger.error('[SAP Config] Failed to reconnect after config switch', { error: connectErr });
      // Don't fail the request, just log the error
    }
    
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

export async function testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const config = configService.getConfigById(id);
    
    if (!config) {
      res.status(404).json({ success: false, error: '配置不存在' });
      return;
    }

    // Create a temporary MCP client for testing
    const TestMCPClientService = (await import('../services/MCPClientService')).default;
    const testClient = new TestMCPClientService();
    
    try {
      // Temporarily override config for testing
      const originalUrl = process.env.SAP_URL;
      const originalUser = process.env.SAP_USER;
      const originalPassword = process.env.SAP_PASSWORD;
      const originalClient = process.env.SAP_CLIENT;
      const originalLanguage = process.env.SAP_LANGUAGE;

      process.env.SAP_URL = config.url;
      process.env.SAP_USER = config.user;
      process.env.SAP_PASSWORD = configService.decrypt(config.encryptedPassword);
      process.env.SAP_CLIENT = config.client;
      process.env.SAP_LANGUAGE = config.language;

      // Try to connect
      await testClient.connect();
      
      // Restore original env
      process.env.SAP_URL = originalUrl;
      process.env.SAP_USER = originalUser;
      process.env.SAP_PASSWORD = originalPassword;
      process.env.SAP_CLIENT = originalClient;
      process.env.SAP_LANGUAGE = originalLanguage;

      await testClient.disconnect();
      
      res.json({ success: true, message: '连接成功' });
    } catch (error) {
      // Restore original env on error
      process.env.SAP_URL = undefined;
      process.env.SAP_USER = undefined;
      process.env.SAP_PASSWORD = undefined;
      process.env.SAP_CLIENT = undefined;
      process.env.SAP_LANGUAGE = undefined;
      
      await testClient.disconnect().catch(() => {});
      
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : '连接失败' 
      });
    }
  } catch (err) {
    next(err);
  }
}
