import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import logger from '../lib/logger';

// LLM API 速率限制 - 防止超额费用
export const llmRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 20, // 每个 IP 最多 20 次 LLM 调用
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁,请稍后再试 (15分钟内最多20次)',
    },
  },
  standardHeaders: true, // 返回 RateLimit-* headers
  legacyHeaders: false,
  keyGenerator: (req) => {
    // 使用官方推荐 helper，避免 IPv6 绕过限流
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
  },
  handler: (req, res) => {
    logger.warn('[RateLimit] LLM API rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'LLM API 请求过于频繁,请稍后再试',
      },
    });
  },
});

// SAP 查询速率限制 - 防止滥用
export const sapQueryRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 分钟
  max: 30, // 每分钟最多 30 次 SAP 查询
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'SAP 查询过于频繁,请稍后再试 (每分钟最多30次)',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('[RateLimit] SAP query rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'SAP 查询请求过于频繁,请稍后再试',
      },
    });
  },
});

// 文档写入速率限制 - 保护 SAP 系统
export const writeBackRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 分钟
  max: 10, // 5分钟内最多10次写入
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '代码写入过于频繁,请稍后再试 (5分钟内最多10次)',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('[RateLimit] Write-back rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '代码写入请求过于频繁,请稍后再试',
      },
    });
  },
});
