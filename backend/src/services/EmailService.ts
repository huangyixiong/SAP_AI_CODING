import nodemailer from 'nodemailer';
import logger from '../lib/logger';
import prisma from '../lib/prisma';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export interface SendSpecDocumentsParams {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  attachmentBase64: string;
  attachmentName: string;
  userId?: number;
}

class EmailService {
  private async getSmtpConfig() {
    const cfg = await prisma.smtpConfig.findFirst({ orderBy: { id: 'asc' } });
    if (!cfg) throw new Error('SMTP 未配置，请在系统设置中配置邮件服务器');
    return cfg;
  }

  private createTransport(cfg: Awaited<ReturnType<typeof this.getSmtpConfig>>) {
    return nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user && cfg.password ? { user: cfg.user, pass: cfg.password } : undefined,
    });
  }

  async sendTestEmail(to: string): Promise<void> {
    const cfg = await this.getSmtpConfig();
    const transporter = this.createTransport(cfg);
    await transporter.sendMail({
      from: cfg.fromName ? `"${cfg.fromName}" <${cfg.fromAddr}>` : cfg.fromAddr,
      to,
      subject: 'SMTP 测试邮件',
      text: '这是一封测试邮件，验证 SMTP 配置是否正确。',
    });
    logger.info('[EmailService] Test email sent', { to });
  }

  async sendSpecDocuments(params: SendSpecDocumentsParams): Promise<void> {
    const attachmentBuffer = Buffer.from(params.attachmentBase64, 'base64');
    if (attachmentBuffer.length > MAX_ATTACHMENT_BYTES) {
      throw new Error(`附件超过 5MB 限制（当前 ${(attachmentBuffer.length / 1024 / 1024).toFixed(1)} MB）`);
    }

    const cfg = await this.getSmtpConfig();
    const transporter = this.createTransport(cfg);

    let info: Awaited<ReturnType<typeof transporter.sendMail>>;
    try {
      info = await transporter.sendMail({
        from: cfg.fromName ? `"${cfg.fromName}" <${cfg.fromAddr}>` : cfg.fromAddr,
        to: params.to.join(', '),
        cc: params.cc?.length ? params.cc.join(', ') : undefined,
        subject: params.subject,
        text: params.body,
        attachments: [
          {
            filename: params.attachmentName,
            content: attachmentBuffer,
            contentType:
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        ],
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await prisma.emailLog.create({
        data: {
          toAddrs: JSON.stringify(params.to),
          subject: params.subject,
          status: 'failed',
          errorMsg,
          createdById: params.userId ?? null,
        },
      });
      throw err;
    }

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
