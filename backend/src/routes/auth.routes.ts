import { Router } from 'express';
import { z } from 'zod';
import { loginRateLimiter } from '../middleware/rateLimiter';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import * as AuthService from '../services/AuthService';

const router = Router();

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
const changePwSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8, '新密码至少8位'),
});

router.post('/login', loginRateLimiter, asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const result = await AuthService.login(body.username, body.password);
  res.json(result);
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'refreshToken required' } });
  const tokens = await AuthService.refreshTokens(refreshToken);
  res.json(tokens);
}));

router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  await AuthService.logout(req.user!.id);
  res.json({ success: true });
}));

router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = await AuthService.getMe(req.user!.id);
  res.json(user);
}));

router.put('/change-password', authMiddleware, asyncHandler(async (req, res) => {
  const body = changePwSchema.parse(req.body);
  await AuthService.changePassword(req.user!.id, body.oldPassword, body.newPassword);
  res.json({ success: true });
}));

export default router;
