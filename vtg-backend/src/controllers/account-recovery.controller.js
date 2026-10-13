const crypto = require('crypto');
const { z } = require('zod');
const { query, withTransaction } = require('../config/db');
const { hashPassword } = require('../utils/password');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const nodemailer = require('nodemailer');

let transporter;
function emailReady() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}
function mailer() {
  if (!transporter) transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
  });
  return transporter;
}
const sha = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const baseUrl = () => String(process.env.PUBLIC_APP_URL || 'https://vtg-backended.vercel.app').replace(/\/$/, '');

const forgotPassword = asyncHandler(async (req, res) => {
  const parsed = z.object({ email: z.string().trim().email().max(254), preferredLanguage: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) throw new AppError('Enter a valid email address.', 400, 'VALIDATION_ERROR');
  const email = parsed.data.email.toLowerCase();
  // Always return the same public response to avoid exposing whether an account exists.
  const { rows } = await query('SELECT id, email, full_name, role FROM users WHERE email=$1 AND is_active=TRUE LIMIT 1', [email]);
  if (rows[0] && emailReady()) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await query('UPDATE account_recovery_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [rows[0].id]);
    await query('INSERT INTO account_recovery_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)', [rows[0].id, tokenHash, expiresAt]);
    const link = baseUrl() + '/account-help.html?mode=reset&token=' + encodeURIComponent(token);
    try {
      await mailer().sendMail({
        from: process.env.SMTP_FROM, to: rows[0].email,
        subject: 'Reset your VTG account password',
        text: 'A password reset was requested for your VTG account. Use this one-time link within 30 minutes: ' + link + '\nIf you did not request this, you can ignore this message.',
        html: '<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8;padding:24px;color:#20252c"><main style="max-width:560px;margin:auto;background:#fff;border-radius:16px;padding:28px"><h1 style="color:#a52228">Reset your VTG password</h1><p>A password reset was requested for your Vintage Trade Global account.</p><p><a href="' + link + '" style="display:inline-block;background:#bd292d;color:#fff;text-decoration:none;padding:13px 18px;border-radius:9px;font-weight:bold">Reset password</a></p><p>This one-time link expires in 30 minutes. If you did not request it, ignore this email.</p></main></body></html>'
      });
    } catch (error) {
      console.warn('[VTG] Password recovery email delivery failed:', error.message);
      await query('UPDATE account_recovery_tokens SET used_at=NOW() WHERE token_hash=$1', [tokenHash]);
    }
  }
  res.json({ ok: true, message: 'If an active VTG account matches that address, password recovery instructions will be sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const parsed = z.object({
    token: z.string().min(32).max(256),
    password: z.string().min(8).max(128).regex(/[A-Z]/, 'Use at least one uppercase letter').regex(/[0-9]/, 'Use at least one number')
  }).safeParse(req.body);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || 'Check your new password and try again.', 400, 'VALIDATION_ERROR');
  const tokenHash = sha(parsed.data.token);
  const passwordHash = await hashPassword(parsed.data.password);
  const result = await withTransaction(async client => {
    const found = await client.query(
      'SELECT id, user_id FROM account_recovery_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE',
      [tokenHash]
    );
    if (!found.rows[0]) return false;
    await client.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2 AND is_active=TRUE', [passwordHash, found.rows[0].user_id]);
    await client.query('UPDATE account_recovery_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [found.rows[0].user_id]);
    return true;
  });
  if (!result) throw new AppError('This reset link is invalid or expired. Request a new password reset link.', 400, 'INVALID_OR_EXPIRED_TOKEN');
  res.json({ ok: true, message: 'Your password has been reset. You can now sign in with your new password.' });
});

module.exports = { forgotPassword, resetPassword };
