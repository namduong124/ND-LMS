import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';

/**
 * Supports both modern HTTPS Email APIs (Brevo / Resend on Port 443) and traditional SMTP.
 * When deployed on cloud platforms like Render Free Tier (which blocks raw SMTP ports 25, 465, 587),
 * Brevo / Resend HTTPS API bypasses all firewall port blocks completely.
 */
export const isSmtpConfigured = Boolean(env.smtpHost);
export const isEmailConfigured = Boolean(env.brevoApiKey || env.resendApiKey || env.smtpHost);

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: { user: env.smtpUser, pass: env.smtpPass },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 4000
    })
  : nodemailer.createTransport({ jsonTransport: true });

if (!isEmailConfigured && env.nodeEnv === 'production') {
  console.warn('Warning: Neither BREVO_API_KEY, RESEND_API_KEY, nor SMTP_HOST is set.');
}

let cachedBrevoSender: string | undefined;

const getBrevoSender = async (): Promise<string> => {
  if (cachedBrevoSender) return cachedBrevoSender;
  try {
    const res = await fetch('https://api.brevo.com/v3/senders', {
      headers: {
        accept: 'application/json',
        'api-key': env.brevoApiKey!
      }
    });
    if (res.ok) {
      const data = (await res.json()) as { senders?: Array<{ email: string; active: boolean }> };
      const activeSender = data.senders?.find((s) => s.active);
      if (activeSender?.email) {
        cachedBrevoSender = activeSender.email;
        return activeSender.email;
      }
    }
  } catch (err) {
    console.warn('Could not auto-fetch Brevo sender:', err);
  }
  return env.emailFrom || 'namduongn306@gmail.com';
};

const sendViaBrevo = async (to: string, subject: string, html: string) => {
  const senderEmail = await getBrevoSender();
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': env.brevoApiKey!,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'ND LMS', email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Brevo API error (${res.status}): ${errorText}`);
  }
};

const sendViaResend = async (to: string, subject: string, html: string) => {
  const sender = env.emailFrom?.includes('@') ? `ND LMS <${env.emailFrom}>` : 'ND LMS <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: sender,
      to: [to],
      subject,
      html
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errorText}`);
  }
};

const htmlToText = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Prints an email in a block that is easy to spot in the dev server output. */
export const formatDevEmail = (to: string, subject: string, html: string) =>
  [
    '',
    '================ DEV EMAIL (SMTP/API not configured) ================',
    `To:      ${to}`,
    `Subject: ${subject}`,
    '',
    htmlToText(html),
    '====================================================================',
    ''
  ].join('\n');

export const sendEmail = async (to: string, subject: string, html: string) => {
  // If running in Vitest test suite, keep using nodemailer mock to record in emailOutbox
  if (env.nodeEnv === 'test') {
    await transporter.sendMail({ from: env.emailFrom, to, subject, html });
    return;
  }

  // 1. High-priority: Brevo HTTPS REST API (Port 443 - Never blocked on Render Free)
  if (env.brevoApiKey) {
    await sendViaBrevo(to, subject, html);
    return;
  }

  // 2. High-priority: Resend HTTPS REST API (Port 443 - Never blocked on Render Free)
  if (env.resendApiKey) {
    await sendViaResend(to, subject, html);
    return;
  }

  // 3. Traditional SMTP (Port 587/465 - Works on localhost or paid cloud)
  if (isSmtpConfigured) {
    await transporter.sendMail({ from: env.emailFrom, to, subject, html });
    return;
  }

  // 4. Production guard
  if (env.nodeEnv === 'production') {
    throw new AppError(503, 'Email is not configured. Set BREVO_API_KEY, RESEND_API_KEY, or SMTP_* variables.');
  }

  // 5. Development console preview
  console.log(formatDevEmail(to, subject, html));
};

export const sendOtpEmail = async (to: string, otp: string) => {
  const expiresInMinutes = env.otpExpiresMinutes;
  await sendEmail(
    to,
    'Mã xác thực tài khoản ND LMS',
    `
      <div style="margin:0;padding:24px 0;background:#09090b;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <div style="max-width:540px;margin:0 auto;padding:0 16px;">
          <div style="background:#18181b;border:1px solid #27272a;border-radius:18px;padding:32px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
            <div style="margin-bottom:24px;">
              <span style="font-size:24px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">ND <span style="color:#f97316;">LMS</span></span>
            </div>
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#fafafa;">Mã xác thực tài khoản (OTP)</h2>
            <p style="margin:0 0 20px;font-size:14px;color:#a1a1aa;line-height:1.6;">
              Chào bạn, bạn vừa yêu cầu mã xác thực để truy cập hệ thống học tập <b>ND LMS</b>. Vui lòng sử dụng mã 6 chữ số bên dưới (mã có hiệu lực trong ${expiresInMinutes} phút):
            </p>
            <div style="margin:0 0 24px;padding:18px;border-radius:14px;background:#27272a;border:1.5px dashed #f97316;text-align:center;">
              <span style="font-size:34px;font-weight:800;letter-spacing:8px;color:#f97316;">${otp}</span>
            </div>
            <p style="margin:0 0 8px;font-size:12px;color:#71717a;line-height:1.5;">
              Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email. Tuyệt đối không chia sẻ mã OTP với bất kỳ ai để bảo vệ an toàn tài khoản.
            </p>
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #27272a;font-size:11px;color:#52525b;text-align:center;">
              © 2026 ND Learning Management System. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    `
  );
};

export const sendResetTokenEmail = async (to: string, token: string) => {
  await sendEmail(
    to,
    'Đặt lại mật khẩu ND LMS',
    `
      <div style="margin:0;padding:24px 0;background:#09090b;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <div style="max-width:540px;margin:0 auto;padding:0 16px;">
          <div style="background:#18181b;border:1px solid #27272a;border-radius:18px;padding:32px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
            <div style="margin-bottom:24px;">
              <span style="font-size:24px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">ND <span style="color:#f97316;">LMS</span></span>
            </div>
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#fafafa;">Yêu cầu đặt lại mật khẩu</h2>
            <p style="margin:0 0 20px;font-size:14px;color:#a1a1aa;line-height:1.6;">
              Mã bảo mật đặt lại mật khẩu của bạn là:
            </p>
            <div style="margin:0 0 24px;padding:16px;border-radius:14px;background:#27272a;border:1.5px dashed #f97316;text-align:center;">
              <span style="font-size:28px;font-weight:800;letter-spacing:6px;color:#f97316;">${token}</span>
            </div>
            <p style="margin:0;font-size:12px;color:#71717a;">Mã có hiệu lực trong ${env.resetTokenExpiresMinutes} phút.</p>
          </div>
        </div>
      </div>
    `
  );
};
