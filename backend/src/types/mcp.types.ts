export interface MCPToolResult {
  content: Array<{
    type: string;
    text?: string;
  }>;
  isError?: boolean;
}

export interface SAPObjectInfo {
  name: string;
  type: string;
  description?: string;
  objectUrl: string;
  packageName?: string;
  sourceUrl?: string;
}

export interface ActivationResult {
  success: boolean;
  messages: string[];
}
