import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/requirePermission';
import { asyncHandler } from '../lib/asyncHandler';
import prisma from '../lib/prisma';
import EmailService from '../services/EmailService';
import logger from '../lib/logger';
import multer from 'multer';
import * as XLSX from 'xlsx';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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
  await emailService.sendTestEmail(to);
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

// ── Bulk Import ───────────────────────────────────────────────────────────────

router.post(
  '/recipients/bulk-import',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: '请上传文件' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

    if (rows.length === 0) {
      res.json({ imported: 0, skipped: 0, errors: [] });
      return;
    }

    const firstRow = rows[0];
    if (!('邮箱' in firstRow) || !('角色' in firstRow)) {
      res.status(400).json({ error: '缺少必要列：邮箱/角色' });
      return;
    }

    const [allRoles, existingRecipients] = await Promise.all([
      prisma.role.findMany(),
      prisma.emailRecipient.findMany({ select: { email: true } }),
    ]);
    const roleMap = new Map(allRoles.map((r) => [r.name, r.id]));
    const existingEmails = new Set(existingRecipients.map((r) => r.email.toLowerCase()));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const email = String(row['邮箱'] ?? '').trim();
      const name = String(row['姓名'] ?? '').trim() || undefined;
      const roleName = String(row['角色'] ?? '').trim();

      if (!email) {
        errors.push(`第${rowNum}行：邮箱不能为空`);
        continue;
      }

      if (existingEmails.has(email.toLowerCase())) {
        skipped++;
        continue;
      }

      const roleId = roleMap.get(roleName);
      if (!roleId) {
        errors.push(`第${rowNum}行：角色"${roleName}"不存在`);
        continue;
      }

      await prisma.emailRecipient.create({ data: { email, name, roleId } });
      existingEmails.add(email.toLowerCase());
      imported++;
    }

    res.json({ imported, skipped, errors });
  }),
);

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
