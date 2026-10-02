// Minimal email sender for transactional messages (currently: password
// reset). Uses SMTP if configured via env vars; otherwise falls back to
// logging the message to the server console so local development and
// review environments don't need real SMTP creds to exercise the flow.
//
// Requires 'nodemailer' — add it to package.json dependencies:
//   npm install nodemailer

let transporter = null;

// Render's servers have no IPv6 internet route, but smtp.gmail.com resolves to an
// IPv6 address first → "ENETUNREACH 2607:f8b0:...". So we look up the IPv4
// address ourselves and connect to that, while still checking Gmail's TLS
// certificate against the real hostname.
async function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null; // not configured — caller falls back to console logging
  }

  let host = SMTP_HOST;
  try {
    const ips = await require('dns').promises.resolve4(SMTP_HOST);
    if (ips && ips.length) host = ips[0];
  } catch (e) {
    console.warn('[Email] IPv4 lookup failed, using hostname:', e.message);
  }

  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { servername: SMTP_HOST }, // certificate is checked for smtp.gmail.com
    pool: true,            // keep the Gmail connection open and reuse it — much faster after the first email
    maxConnections: 2,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
  return transporter;
}

// Brevo sends over HTTPS, which Render's free plan allows (it blocks SMTP ports).
// Used whenever BREVO_API_KEY is set; otherwise falls back to SMTP below.
function parseFrom(from) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from || '');
  return m ? { name: m[1] || 'MedClarivo', email: m[2] } : { name: 'MedClarivo', email: from };
}

async function sendViaBrevo({ to, subject, text, html }) {
  const sender = parseFrom(process.env.EMAIL_FROM || process.env.SMTP_FROM || 'MedClarivo <official@medclarivo.com>');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: text, htmlContent: html || undefined }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo ${res.status}: ${body.slice(0, 300)}`);
  }
  return { delivered: true, loggedOnly: false };
}

async function sendMail({ to, subject, text, html }) {
  if (process.env.BREVO_API_KEY) return sendViaBrevo({ to, subject, text, html });

  const t = await getTransporter();

  if (!t) {
    // Local-dev / unconfigured fallback — never silently drop the
    // message, make it visible in logs so the flow is still testable.
    console.log('─────────────────────────────────────────────');
    console.log('📧  SMTP not configured — email logged instead of sent');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('─────────────────────────────────────────────');
    return { delivered: false, loggedOnly: true };
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || 'MedClarivo <no-reply@medclarivo.com>',
    to,
    subject,
    text,
    html,
  });
  return { delivered: true, loggedOnly: false };
}

async function sendPasswordResetEmail(user, resetUrl) {
  return sendMail({
    to: user.email,
    subject: 'Reset your MedClarivo password',
    text:
      `Hi ${user.name || 'there'},\n\n` +
      `We received a request to reset your MedClarivo password. This link expires in 30 minutes:\n\n` +
      `${resetUrl}\n\n` +
      `If you didn't request this, you can safely ignore this email — your password won't change.`,
    html:
      `<p>Hi ${user.name || 'there'},</p>` +
      `<p>We received a request to reset your MedClarivo password. This link expires in 30 minutes:</p>` +
      `<p><a href="${resetUrl}">${resetUrl}</a></p>` +
      `<p>If you didn't request this, you can safely ignore this email — your password won't change.</p>`,
  });
}

const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sendVerificationCodeEmail(user, code) {
  const name = user.name || 'there';
  return sendMail({
    to: user.email,
    subject: `${code} is your MedClarivo verification code`,
    text:
      `Hi ${name},\n\n` +
      `Your MedClarivo verification code is: ${code}\n\n` +
      `It expires in 10 minutes. Enter it in the app to finish creating your account.\n\n` +
      `If you didn't sign up for MedClarivo, you can ignore this email.`,
    html:
      `<p>Hi ${escapeHtml(name)},</p>` +
      `<p>Your MedClarivo verification code is:</p>` +
      `<p style="font-size:28px;font-weight:700;letter-spacing:6px;font-family:monospace;">${code}</p>` +
      `<p>It expires in 10 minutes. Enter it in the app to finish creating your account.</p>` +
      `<p style="color:#666;">If you didn't sign up for MedClarivo, you can ignore this email.</p>`,
  });
}

module.exports = { sendMail, sendPasswordResetEmail, sendVerificationCodeEmail };
