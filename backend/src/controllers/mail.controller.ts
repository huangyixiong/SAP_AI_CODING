import { Request, Response } from 'express';
import { z } from 'zod';
import EmailService from '../services/EmailService';

const sendSchema = z.object({
  to: z.array(z.string().email()).min(1, '至少填写一个收件邮箱'),
  cc: z.array(z.string().email()).optional(),
  subject: z.string().trim().min(1, '邮件主题不能为空').max(200),
  body: z.string(),
  attachmentBase64: z.string().min(1, '附件不能为空'),
  attachmentName: z.string().min(1),
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

  const { attachmentBase64 } = parseResult.data;
  const attachmentBuffer = Buffer.from(attachmentBase64, 'base64');
  if (attachmentBuffer.length > 5 * 1024 * 1024) {
    res.status(400).json({ success: false, error: '附件超过 5MB 限制' });
    return;
  }

  try {
    const emailService = new EmailService();
    const userId = (req as Request & { user?: { id: number } }).user?.id;
    await emailService.sendSpecDocuments({ ...parseResult.data, userId });
    res.json({ success: true, message: '邮件已发送' });
  } catch (err) {
    console.error('[mail] SMTP error:', err instanceof Error ? err.message : err);
    res.status(503).json({
      success: false,
      error: err instanceof Error ? err.message : '发送失败',
    });
  }
}
