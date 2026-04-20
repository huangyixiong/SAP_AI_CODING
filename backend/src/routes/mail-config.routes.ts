import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/requirePermission';
import { asyncHandler } from '../lib/asyncHandler';
import prisma from '../lib/prisma';
import EmailService from '../services/EmailService';
import logger from '../lib/logger';

const router = Router();
router.use(requireRole('admin'));

// ── SMTP Config ──────────────────────────────────────────────────────────────

router.get('/smtp', asyncHandler(async (_req, res) => {
  const cfg = await prisma.smtpConfig.findFirst({ orderBy: { id: 'asc' } });
  if (!cfg) return res.json(null);
  res.json({ ...cfg, password: cfg.password ? '***' : null });
}));

router.put('/smtp', asyncHandler(async (req, res) => {
  const schema = z.object({
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean(),
    user: z.string().optional(),
    password: z.string().optional(),
    fromAddr: z.string().email(),
    fromName: z.string().optional(),
  });
  const data = schema.parse(req.body);
  const existing = await prisma.smtpConfig.findFirst({ orderBy: { id: 'asc' } });
  const keepPassword =
    !data.password || data.password === '***' ? existing?.password ?? null : data.password;

  const cfg = await prisma.smtpConfig.upsert({
    where: { id: existing?.id ?? 0 },
    update: { ...data, password: keepPassword },
    create: { ...data, password: keepPassword },
  });
  res.json({ ...cfg, password: cfg.password ? '***' : null });
}));

router.post('/smtp/test', asyncHandler(async (req, res) => {
  const { to } = z.object({ to: z.string().email() }).parse(req.body);
  const emailService = new EmailService();
  await emailService.sendSpecDocuments({
    to: [to],
    subject: 'SMTP 测试邮件',
    fsContent: '这是一封测试邮件，验证 SMTP 配置是否正确。',
    referencePrompt: '',
  });
  logger.info('[MailConfig] SMTP test email sent', { to });
  res.json({ success: true });
}));

// ── Recipients ────────────────────────────────────────────────────────────────

router.get('/recipients', asyncHandler(async (req, res) => {
  const { roleId } = z.object({
    roleId: z.coerce.number().int().positive().optional(),
  }).parse(req.query);
  const recipients = await prisma.emailRecipient.findMany({
    where: roleId ? { roleId } : {},
    include: { role: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(recipients);
}));

router.post('/recipients', asyncHandler(async (req, res) => {
  const data = z.object({
    email: z.string().email(),
    name: z.string().optional(),
    roleId: z.number().int(),
  }).parse(req.body);
  const recipient = await prisma.emailRecipient.create({ data, include: { role: true } });
  res.status(201).json(recipient);
}));

router.put('/recipients/:id', asyncHandler(async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const data = z.object({
    email: z.string().email().optional(),
    name: z.string().optional(),
  }).parse(req.body);
  const recipient = await prisma.emailRecipient.update({
    where: { id }, data, include: { role: true },
  });
  res.json(recipient);
}));

router.delete('/recipients/:id', asyncHandler(async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  await prisma.emailRecipient.delete({ where: { id } });
  res.json({ success: true });
}));

// ── Email Logs ────────────────────────────────────────────────────────────────

router.get('/logs', asyncHandler(async (req, res) => {
  const query = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }).parse(req.query);
  const skip = (query.page - 1) * query.limit;
  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      skip, take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { username: true, fullName: true } } },
    }),
    prisma.emailLog.count(),
  ]);
  res.json({ logs, total, page: query.page, limit: query.limit });
}));

export default router;
