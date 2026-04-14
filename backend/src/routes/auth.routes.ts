import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// 登录请求验证
const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

// 登录接口
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    // TODO: 实际项目中应该查询数据库验证用户
    // 这里使用简单的演示账号
    if (username === 'admin' && password === 'admin123') {
      // 生成token（实际项目应使用JWT）
      const token = `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      res.json({
        success: true,
        data: {
          username,
          token,
          loginTime: new Date().toISOString(),
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: '用户名或密码错误',
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: '请求参数错误',
        errors: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }
});

export default router;
