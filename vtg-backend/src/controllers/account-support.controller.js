const { z } = require('zod');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../utils/AppError');
const nodemailer = require('nodemailer');

let transporter;
function emailReady() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}
function mailer() {
  if (!transporter) transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
  });
  return transporter;
}
const submitAccountSupport = asyncHandler(async (req, res) => {
  const schema = z.object({
    role: z.enum(['buyer','supplier','bank','admin']),
    email: z.string().trim().email().max(254),
    issue: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(2000)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message || 'Check the support form and try again.', 400, 'VALIDATION_ERROR');
  if (!emailReady()) throw new AppError('VTG support email delivery is temporarily unavailable. Please email vintageafricatrade@gmail.com directly.', 503, 'SUPPORT_EMAIL_UNAVAILABLE');
  const { role, email, issue, description } = parsed.data;
  if (/password|verification code|one.time code|otp\s*[:=]/i.test(description)) {
    throw new AppError('For your security, do not include passwords or verification codes. Remove them and submit the request again.', 400, 'SENSITIVE_CONTENT');
  }
  await mailer().sendMail({
    from: process.env.SMTP_FROM,
    to: 'vintageafricatrade@gmail.com',
    replyTo: email,
    subject: '[VTG Account Support] ' + role.toUpperCase() + ' — ' + issue,
    text: [
      'VTG Account Support Request', '',
      'Account type: ' + role,
      'Contact email: ' + email,
      'Issue: ' + issue, '',
      'Description:', description, '',
      'Submitted through VTG Account Help.'
    ].join('\n')
  });
  res.status(201).json({ ok: true, message: 'Your support request was sent to VTG. Keep an eye on your inbox for a response.' });
});
module.exports = { submitAccountSupport };
