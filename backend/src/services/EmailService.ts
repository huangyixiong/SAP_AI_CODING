import nodemailer from 'nodemailer';
import logger from '../lib/logger';
import prisma from '../lib/prisma';

export interface SendSpecDocumentsParams {
  to: string[];
  cc?: string[];
  subject: string;
  fsContent: string;
  referencePrompt?: string;
  userId?: number;
}

class EmailService {
  private async getSmtpConfig() {
    const cfg = await prisma.smtpConfig.findFirst({ orderBy: { id: 'asc' } });
    if (!cfg) throw new Error('SMTP 未配置，请在系统设置中配置邮件服务器');
    return cfg;
  }

  async sendSpecDocuments(params: SendSpecDocumentsParams): Promise<void> {
    const cfg = await this.getSmtpConfig();
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user && cfg.password ? { user: cfg.user, pass: cfg.password } : undefined,
    });

    const text = [
      '======== FS（功能规格） ========', '',
      params.fsContent.trim(), '',
      '======== 代码参考提示词 ========', '',
      params.referencePrompt?.trim() || '（未生成或为空）',
    ].join('\n');

    const info = await transporter.sendMail({
      from: cfg.fromName ? `"${cfg.fromName}" <${cfg.fromAddr}>` : cfg.fromAddr,
      to: params.to.join(', '),
      cc: params.cc?.length ? params.cc.join(', ') : undefined,
      subject: params.subject,
      text,
    });

    await prisma.emailLog.create({
      data: {
        toAddrs: JSON.stringify(params.to),
        subject: params.subject,
        status: 'sent',
        sentAt: new Date(),
        createdById: params.userId ?? null,
      },
    });

    logger.info('[EmailService] Mail sent', { messageId: info.messageId, to: params.to });
  }

  async getRecipientsByRole(roleName: string): Promise<{ email: string; name?: string }[]> {
    const recipients = await prisma.emailRecipient.findMany({
      where: { isActive: true, role: { name: roleName } },
    });
    return recipients.map((r) => ({ email: r.email, name: r.name ?? undefined }));
  }
}

export default EmailService;
