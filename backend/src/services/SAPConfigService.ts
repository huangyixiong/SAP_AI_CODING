import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import logger from '../lib/logger';

const CONFIG_FILE = path.resolve(__dirname, '../config/sap-configs.json');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
const IV_LENGTH = 16;

export interface SAPConfig {
  id: string;
  name: string;
  url: string;
  user: string;
  encryptedPassword: string;
  client: string;
  language: string;
  isActive: boolean;
  createdAt: string;
}

class SAPConfigService {
  private static instance: SAPConfigService;

  static getInstance(): SAPConfigService {
    if (!SAPConfigService.instance) {
      SAPConfigService.instance = new SAPConfigService();
    }
    return SAPConfigService.instance;
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
      iv
    );
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encrypted = parts.join(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
      iv
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  loadConfigs(): SAPConfig[] {
    try {
      if (!fs.existsSync(CONFIG_FILE)) {
        return [];
      }
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('[SAP Config] Failed to load configs', { error });
      return [];
    }
  }

  saveConfigs(configs: SAPConfig[]): void {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2), 'utf-8');
      logger.info('[SAP Config] Configs saved successfully');
    } catch (error) {
      logger.error('[SAP Config] Failed to save configs', { error });
      throw new Error('保存配置失败');
    }
  }

  getAllConfigs(): SAPConfig[] {
    const configs = this.loadConfigs();
    // Don't return encrypted passwords
    return configs.map(({ encryptedPassword, ...rest }) => ({
      ...rest,
      hasPassword: !!encryptedPassword,
    })) as any;
  }

  getConfigById(id: string): SAPConfig | null {
    const configs = this.loadConfigs();
    return configs.find(c => c.id === id) || null;
  }

  createConfig(data: Omit<SAPConfig, 'id' | 'createdAt' | 'isActive' | 'encryptedPassword'> & { password: string }): SAPConfig {
    const configs = this.loadConfigs();
    
    // If this is the first config, make it active
    const isActive = configs.length === 0;
    
    // Deactivate all other configs if this one is set to active
    const updatedConfigs = configs.map(c => ({
      ...c,
      isActive: false,
    }));

    const newConfig: SAPConfig = {
      id: Date.now().toString(),
      name: data.name,
      url: data.url,
      user: data.user,
      encryptedPassword: this.encrypt(data.password),
      client: data.client,
      language: data.language,
      isActive,
      createdAt: new Date().toISOString(),
    };

    updatedConfigs.push(newConfig);
    this.saveConfigs(updatedConfigs);
    return newConfig;
  }

  updateConfig(id: string, data: Partial<SAPConfig> & { password?: string }): SAPConfig | null {
    const configs = this.loadConfigs();
    const index = configs.findIndex(c => c.id === id);
    
    if (index === -1) {
      return null;
    }

    const existingConfig = configs[index];
    const updatedConfig: SAPConfig = {
      ...existingConfig,
      name: data.name ?? existingConfig.name,
      url: data.url ?? existingConfig.url,
      user: data.user ?? existingConfig.user,
      client: data.client ?? existingConfig.client,
      language: data.language ?? existingConfig.language,
      encryptedPassword: data.password ? this.encrypt(data.password) : existingConfig.encryptedPassword,
    };

    configs[index] = updatedConfig;
    this.saveConfigs(configs);
    return updatedConfig;
  }

  deleteConfig(id: string): boolean {
    const configs = this.loadConfigs();
    const index = configs.findIndex(c => c.id === id);
    
    if (index === -1) {
      return false;
    }

    const wasActive = configs[index].isActive;
    configs.splice(index, 1);

    // If deleted config was active, activate the first remaining config
    if (wasActive && configs.length > 0) {
      configs[0].isActive = true;
    }

    this.saveConfigs(configs);
    return true;
  }

  setActiveConfig(id: string): SAPConfig | null {
    const configs = this.loadConfigs();
    const targetConfig = configs.find(c => c.id === id);
    
    if (!targetConfig) {
      return null;
    }

    // Deactivate all configs
    configs.forEach(c => c.isActive = false);
    
    // Activate target config
    targetConfig.isActive = true;
    
    this.saveConfigs(configs);
    return targetConfig;
  }

  getActiveConfig(): SAPConfig | null {
    const configs = this.loadConfigs();
    return configs.find(c => c.isActive) || null;
  }
}

export default SAPConfigService;
