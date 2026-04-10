/**
 * 应用基础错误类
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    
    // 确保错误堆栈正确指向
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

/**
 * SAP 连接错误
 */
export class SAPConnectionError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('SAP_CONNECTION_ERROR', message, 503, context);
    this.name = 'SAPConnectionError';
  }
}

/**
 * LLM API 错误
 */
export class LLMError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('LLM_API_ERROR', message, 502, context);
    this.name = 'LLMError';
  }
}

/**
 * MCP 协议错误
 */
export class MCPError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('MCP_PROTOCOL_ERROR', message, 500, context);
    this.name = 'MCPError';
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, context);
    this.name = 'ValidationError';
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, unknown>) {
    super('NOT_FOUND', `${resource} not found`, 404, context);
    this.name = 'NotFoundError';
  }
}

/**
 * 权限错误
 */
export class PermissionError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, unknown>) {
    super('PERMISSION_DENIED', message, 403, context);
    this.name = 'PermissionError';
  }
}
