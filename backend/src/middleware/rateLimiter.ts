import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';
import logger from '../lib/logger';

// Key by authenticated user ID; fall back to IP for unauthenticated routes
const userKeyGenerator = (req: Request) => {
  if (req.user?.id) return `user:${req.user.id}`;
  return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
};

// LLM API 速率限制 - 防止超额费用
export const llmRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 20, // 每个用户最多 20 次 LLM 调用
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁,请稍后再试 (15分钟内最多20次)',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  handler: (req, res) => {
    logger.warn('[RateLimit] LLM API rate limit exceeded', {
      userId: req.user?.id,
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
  max: 30, // 每用户每分钟最多 30 次 SAP 查询
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'SAP 查询过于频繁,请稍后再试 (每分钟最多30次)',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  handler: (req, res) => {
    logger.warn('[RateLimit] SAP query rate limit exceeded', {
      userId: req.user?.id,
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
  max: 10, // 每用户 5 分钟内最多 10 次写入
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '代码写入过于频繁,请稍后再试 (5分钟内最多10次)',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  handler: (req, res) => {
    logger.warn('[RateLimit] Write-back rate limit exceeded', {
      userId: req.user?.id,
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

// 登录暴力破解防护
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('[RateLimit] Login brute-force attempt', { ip: req.ip });
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: '登录尝试过于频繁，请15分钟后重试' },
    });
  },
});

// Token 刷新速率限制
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => {
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown');
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: '请求过于频繁，请稍后重试' },
    });
  },
});
