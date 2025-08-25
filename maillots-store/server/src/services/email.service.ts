import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

let transporter: any = null;
if (config.SMTP_USER && config.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST || '',
    port: Number(config.SMTP_PORT) || 587,
    secure: Boolean(config.SMTP_SECURE),
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  });
  transporter.verify().then(() => console.info('[email] transporter ready')).catch((e: any) => console.warn('[email] transporter verify failed', e && e.message ? e.message : e));
} else {
  console.warn('[email] SMTP not configured — emails will be logged only');
}

export async function sendOrderConfirmation(to: string, subject: string, html: string) {
  const from = config.SMTP_FROM || config.SMTP_USER || 'no-reply@futbolero.shop';
  const msg = { from, to, subject, html } as any;
  if (!transporter) {
    // Silent fallback: log the email that would be sent
    console.info('[email] SKIPPED (no SMTP) ->', { to, subject, from });
    return Promise.resolve({ skipped: true });
  }
  return transporter.sendMail(msg);
}

export function renderTemplate(name: string, vars: Record<string, any>) {
  const file = path.join(__dirname, '..', 'templates', name);
  if (!fs.existsSync(file)) return '';
  let tpl = fs.readFileSync(file, 'utf8');
  Object.keys(vars).forEach(k => {
    tpl = tpl.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(vars[k] || ''));
  });
  return tpl;
}
