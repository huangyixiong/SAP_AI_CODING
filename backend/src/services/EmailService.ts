import nodemailer from 'nodemailer';
import { config } from '../config';
import logger from '../lib/logger';

export interface SendSpecDocumentsParams {
  to: string[];
  cc?: string[];
  subject: string;
  fsContent: string;
  referencePrompt: string;
}

class EmailService {
  async sendSpecDocuments(params: SendSpecDocumentsParams): Promise<void> {
    const { mail } = config;
    if (!mail.enabled) {
      throw new Error(
        '邮件服务未配置：请在环境变量中设置 SMTP_HOST、MAIL_FROM，以及 SMTP_USER/SMTP_PASSWORD（若需要）'
      );
    }

    const transporter = nodemailer.createTransport({
      host: mail.host,
      port: mail.port,
      secure: mail.secure,
      auth:
        mail.user && mail.password
          ? {
              user: mail.user,
              pass: mail.password,
            }
          : undefined,
    });

    const text = [
      '======== FS（功能规格） ========',
      '',
      params.fsContent.trim(),
      '',
      '======== 代码参考提示词 ========',
      '',
      params.referencePrompt.trim() || '（未生成或为空）',
      '',
    ].join('\n');

    const info = await transporter.sendMail({
      from: mail.from,
      to: params.to.join(', '),
      cc: params.cc?.length ? params.cc.join(', ') : undefined,
      subject: params.subject,
      text,
    });

    logger.info('[EmailService] Mail sent', { messageId: info.messageId, to: params.to });
  }
}

export default EmailService;
