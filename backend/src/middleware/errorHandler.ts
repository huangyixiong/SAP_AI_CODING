import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';
import { AppError } from '../errors';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 判断是否为应用自定义错误
  if (err instanceof AppError) {
    logger.warn(`[AppError] ${err.code}: ${err.message}`, {
      code: err.code,
      statusCode: err.statusCode,
      context: err.context,
      stack: err.stack,
    });

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      },
    });
    return;
  }

  // 处理 Zod 验证错误
  if (err.name === 'ZodError') {
    const zodError = err as any;
    logger.warn('[ValidationError] Invalid request data', {
      errors: zodError.errors,
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数验证失败',
        details: zodError.errors,
      },
    });
    return;
  }

  // 处理其他未知错误
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;

  logger.error(`[UnhandledError] ${statusCode} - ${message}`, {
    error: err.message,
    stack: err.stack,
    name: err.name,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
