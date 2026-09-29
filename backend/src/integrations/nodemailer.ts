import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env.js';

let transporter: Transporter | null = null;
let etherealCredentials: { user: string; pass: string } | null = null;

export async function getTransporter(): Promise<Transporter> {
  if (transporter) {
    return transporter;
  }

  let user = env.ETHEREAL_USER;
  let pass = env.ETHEREAL_PASSWORD;

  if (!user || !pass) {
    console.log('[SMTP] No static Ethereal credentials found in env. Auto-generating fresh test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      user = testAccount.user;
      pass = testAccount.pass;
      etherealCredentials = { user, pass };
      console.log(`[SMTP] Created Ethereal test account: ${user}`);
      console.log(`[SMTP] Web login: https://ethereal.email/login (User: ${user} / Pass: ${pass})`);
    } catch (err: any) {
      console.error('[SMTP] Failed to generate Ethereal test account:', err.message);
      throw err;
    }
  } else {
    etherealCredentials = { user, pass };
  }

  transporter = nodemailer.createTransport({
    host: env.ETHEREAL_HOST,
    port: env.ETHEREAL_PORT,
    secure: false, // Ethereal uses STARTTLS on 587
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export interface SendMailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendMailResult {
  messageId: string;
  previewUrl: string | false;
}

export async function sendEmail(params: SendMailParams): Promise<SendMailResult> {
  const mailer = await getTransporter();

  const info = await mailer.sendMail({
    from: params.from,
    to: params.to,
    subject: params.subject,
    text: params.text || params.html.replace(/<[^>]*>?/gm, ''),
    html: params.html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[SMTP Sent] Message to <${params.to}> - Preview URL: ${previewUrl}`);
  }

  return {
    messageId: info.messageId,
    previewUrl,
  };
}
