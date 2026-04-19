import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { config } from '../config';
import { getUserWithRolesAndPerms } from '../lib/userHelpers';

const MUST_CHANGE_PASSWORD_ALLOWLIST = ['/change-password', '/logout', '/me'];

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '未登录' } });
  }

  const token = header.slice(7);
  let payload: { sub: number; type: string };

  try {
    payload = jwt.verify(token, config.jwt.secret) as unknown as typeof payload;
  } catch (err) {
    const code = err instanceof TokenExpiredError ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED';
    const message = err instanceof TokenExpiredError ? 'Token 已过期，请刷新' : '无效 token';
    return res.status(401).json({ success: false, error: { code, message } });
  }

  if (payload.type !== 'access') {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '无效 token' } });
  }

  let userData: Awaited<ReturnType<typeof getUserWithRolesAndPerms>>;
  try {
    userData = await getUserWithRolesAndPerms(payload.sub);
  } catch {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '用户不存在或已禁用' } });
  }
  if (!userData.user.isActive) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '用户不存在或已禁用' } });
  }
  const { user, roles, permissions } = userData;

  req.user = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    roles,
    permissions,
    mustChangePassword: user.mustChangePassword,
  };

  if (user.mustChangePassword) {
    const isAllowed = MUST_CHANGE_PASSWORD_ALLOWLIST.some((p) => req.originalUrl.includes(p));
    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: { code: 'MUST_CHANGE_PASSWORD', message: '请先修改初始密码' },
      });
    }
  }

  next();
}
