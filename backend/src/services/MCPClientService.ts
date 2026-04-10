import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import PQueue from 'p-queue';
import { config } from '../config';
import { SAPObjectInfo, ActivationResult, MCPToolResult } from '../types/mcp.types';

const MAX_RECONNECT_ATTEMPTS = 3;
const HEARTBEAT_INTERVAL_MS = 60_000;
const TOOL_TIMEOUT_MS = 30_000;

class MCPClientService {
  private static instance: MCPClientService;

  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeatOk = false;
  private lastHeartbeatTime: Date | null = null;

  // Serialize all MCP calls to prevent SAP session conflicts
  private queue = new PQueue({ concurrency: 1 });

  static getInstance(): MCPClientService {
    if (!MCPClientService.instance) {
      MCPClientService.instance = new MCPClientService();
    }
    return MCPClientService.instance;
  }

  async connect(): Promise<void> {
    console.log('[MCP] Connecting to MCP server:', config.mcp.serverPath);

    const env: Record<string, string> = {
      SAP_URL: config.sap.url,
      SAP_USER: config.sap.user,
      SAP_PASSWORD: config.sap.password,
      SAP_CLIENT: config.sap.client,
      SAP_LANGUAGE: config.sap.language,
      NODE_TLS_REJECT_UNAUTHORIZED: config.sap.rejectUnauthorized ? '1' : '0',
    };

    // Merge with current process env (strings only)
    const mergedEnv: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) mergedEnv[k] = v;
    }
    Object.assign(mergedEnv, env);

    this.transport = new StdioClientTransport({
      command: 'node',
      args: [config.mcp.serverPath],
      env: mergedEnv,
    });

    this.client = new Client(
      { name: 'sap-ai-backend', version: '1.0.0' },
      { capabilities: {} }
    );

    this.transport.onclose = () => {
      console.warn('[MCP] Transport closed unexpectedly');
      this.isConnected = false;
      this.scheduleReconnect();
    };

    await this.client.connect(this.transport);
    this.isConnected = true;
    this.reconnectAttempts = 0;
    console.log('[MCP] Connected to MCP server');

    // Establish SAP session
    await this.callToolDirect('login', {});
    console.log('[MCP] SAP login successful');

    this.startHeartbeat();
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    if (this.isConnected && this.client) {
      try {
        await this.callToolDirect('logout', {});
      } catch {
        // Ignore logout errors during shutdown
      }
      await this.client.close();
    }
    this.isConnected = false;
    console.log('[MCP] Disconnected');
  }

  private async scheduleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[MCP] Max reconnect attempts reached');
      return;
    }
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    this.reconnectAttempts++;
    console.log(`[MCP] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    await new Promise((r) => setTimeout(r, delay));
    try {
      await this.connect();
    } catch (err) {
      console.error('[MCP] Reconnect failed:', err);
    }
  }

  private startHeartbeat(): void {
    // Run an immediate check on connect
    this.runHeartbeat();
    this.heartbeatTimer = setInterval(() => this.runHeartbeat(), HEARTBEAT_INTERVAL_MS);
  }

  private async runHeartbeat(): Promise<void> {
    try {
      await this.callToolDirect('healthcheck', {});
      this.lastHeartbeatOk = true;
      this.lastHeartbeatTime = new Date();
    } catch (err) {
      console.warn('[MCP] Heartbeat failed:', err);
      this.lastHeartbeatOk = false;
      this.lastHeartbeatTime = new Date();
    }
  }

  // Active SAP ping — used by health endpoint
  async liveCheck(): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;
    try {
      await this.callToolDirect('healthcheck', {});
      this.lastHeartbeatOk = true;
      this.lastHeartbeatTime = new Date();
      return true;
    } catch {
      this.lastHeartbeatOk = false;
      this.lastHeartbeatTime = new Date();
      return false;
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Direct call without queue (used internally for login/logout/heartbeat)
  private async callToolDirect(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    if (!this.client) throw new Error('MCP client not initialized');

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`MCP tool '${toolName}' timed out`)), TOOL_TIMEOUT_MS)
    );

    const callPromise = this.client.callTool({ name: toolName, arguments: args });
    const result = await Promise.race([callPromise, timeoutPromise]);
    return result as MCPToolResult;
  }

  // Public queued call
  async callTool(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    return this.queue.add(async () => {
      if (!this.isConnected) {
        throw new Error('MCP client is not connected');
      }
      return this.callToolDirect(toolName, args);
    }) as Promise<MCPToolResult>;
  }

  private extractText(result: MCPToolResult): string {
    if (result.isError) {
      const errText = result.content.map((c) => c.text || '').join('');
      throw new Error(`MCP tool error: ${errText}`);
    }
    const text = result.content.map((c) => c.text || '').join('');

    // MCP SDK may double-wrap: the text itself is {"content":[{"type":"text","text":"...actual..."}]}
    // Unwrap one level if that's the case
    try {
      const outer = JSON.parse(text);
      if (outer && Array.isArray(outer.content)) {
        return outer.content.map((c: { text?: string }) => c.text || '').join('');
      }
    } catch {
      // Not double-wrapped, return as-is
    }
    return text;
  }

  // ── Convenience wrappers ──────────────────────────────────────────────

  async searchObject(query: string, objType?: string, max = 20): Promise<SAPObjectInfo[]> {
    const args: Record<string, unknown> = { query, max };
    if (objType) args.objType = objType;

    const result = await this.callTool('searchObject', args);
    const text = this.extractText(result);

    console.log('[MCP] searchObject raw response:', text.substring(0, 1000));

    try {
      const parsed = JSON.parse(text);
      // Normalize result shape from mcp-abap-abap-adt-api
      // abap-adt-api returns SearchResult[] with adtcore: prefixed keys wrapped as { status, results }
      const objects: SAPObjectInfo[] = [];
      const items: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.results)
          ? parsed.results
          : (parsed.objects || []);

      console.log('[MCP] searchObject items count:', items.length);
      if (items.length > 0) console.log('[MCP] searchObject first item keys:', Object.keys(items[0] as object));

      for (const item of items) {
        const i = item as Record<string, string>;
        objects.push({
          name: i['adtcore:name'] || i.name || '',
          type: i['adtcore:type'] || i.type || '',
          description: i['adtcore:description'] || i.description || '',
          objectUrl: i['adtcore:uri'] || i.objectUrl || i.url || '',
          packageName: i['adtcore:packageName'] || i.packageName || '',
        });
      }
      return objects.filter(o => o.name);
    } catch (err) {
      console.error('[MCP] searchObject parse error:', err, 'raw text:', text.substring(0, 500));
      return [];
    }
  }

  async objectStructure(objectUrl: string): Promise<{ sourceUrl: string; raw: unknown }> {
    const result = await this.callTool('objectStructure', { objectUrl });
    const text = this.extractText(result);
    try {
      const parsed = JSON.parse(text);
      // Extract source URI from ADT structure
      const sourceUrl =
        parsed['adtcore:sourceUri'] ||
        parsed.sourceUri ||
        (objectUrl.endsWith('/source/main') ? objectUrl : `${objectUrl}/source/main`);
      return { sourceUrl, raw: parsed };
    } catch {
      return { sourceUrl: `${objectUrl}/source/main`, raw: {} };
    }
  }

  async getObjectSource(sourceUrl: string): Promise<string> {
    const result = await this.callTool('getObjectSource', { objectSourceUrl: sourceUrl });
    const text = this.extractText(result);
    // Handler wraps source in {"status":"success","source":"..."}
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed.source === 'string') return parsed.source;
    } catch {
      // text is already raw source
    }
    return text;
  }

  async lock(objectUrl: string, accessMode = 'MODIFY'): Promise<string> {
    const result = await this.callTool('lock', { objectUrl, accessMode });
    const text = this.extractText(result);
    try {
      const parsed = JSON.parse(text);
      return parsed.lockHandle || parsed['adtcore:lockHandle'] || text.trim();
    } catch {
      return text.trim();
    }
  }

  async setObjectSource(
    sourceUrl: string,
    source: string,
    lockHandle: string,
    transport?: string
  ): Promise<void> {
    const args: Record<string, unknown> = { objectSourceUrl: sourceUrl, source, lockHandle };
    if (transport) args.transport = transport;
    await this.callTool('setObjectSource', args);
  }

  async unLock(objectUrl: string, lockHandle: string): Promise<void> {
    await this.callTool('unLock', { objectUrl, lockHandle });
  }

  async activateByName(objectName: string, objectUrl: string): Promise<ActivationResult> {
    const result = await this.callTool('activateByName', { objectName, objectUrl });
    const text = this.extractText(result);
    try {
      const parsed = JSON.parse(text);
      return {
        success: parsed.success !== false,
        messages: parsed.messages || [],
      };
    } catch {
      return { success: true, messages: [] };
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getLastHeartbeat(): { ok: boolean; time: Date | null } {
    return { ok: this.lastHeartbeatOk, time: this.lastHeartbeatTime };
  }

  getSAPUrl(): string {
    return config.sap.url;
  }
}

export default MCPClientService;
