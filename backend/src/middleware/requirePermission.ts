import { Request, Response, NextFunction } from 'express';

export function requirePermission(code: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '未登录' } });
    }
    if (!req.user.permissions.includes(code)) {
      return res.status(403).json({
        success: false,
        error: { code: 'PERMISSION_DENIED', message: `缺少权限: ${code}` },
      });
    }
    next();
  };
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '未登录' } });
    }
    if (!req.user.roles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'PERMISSION_DENIED', message: `需要角色: ${role}` },
      });
    }
    next();
  };
}
