import { Request, Response } from 'express';
import { z } from 'zod';
import EmailService from '../services/EmailService';

const sendSchema = z.object({
  to: z.array(z.string().email()).min(1, '至少填写一个收件邮箱'),
  cc: z.array(z.string().email()).optional(),
  subject: z.string().trim().min(1, '邮件主题不能为空').max(200),
  fsContent: z.string(),
  referencePrompt: z.string(),
});

export async function sendSpecDocuments(req: Request, res: Response): Promise<void> {
  const parseResult = sendSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: parseResult.error.issues[0]?.message || '参数错误',
    });
    return;
  }

  try {
    const emailService = new EmailService();
    await emailService.sendSpecDocuments(parseResult.data);
    res.json({ success: true, message: '邮件已发送' });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: err instanceof Error ? err.message : '发送失败',
    });
  }
}
