// Backup of maillots-store/server/src/services/email.service.ts
// Moved to backup on 2025-08-22

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST || '',
  port: Number(config.SMTP_PORT) || 587,
  auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
});

export async function sendOrderConfirmation(to: string, subject: string, html: string) {
  if (!transporter) {
    console.warn('No mail transporter configured');
    return;
  }
  const msg = {
    from: config.SMTP_USER || 'no-reply@futbolero.shop',
    to,
    subject,
    html,
  } as any;
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
