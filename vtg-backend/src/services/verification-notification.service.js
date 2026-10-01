const nodemailer = require('nodemailer');

let transporter = null;

function configured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

async function sendVerificationStatusEmail({ email, fullName, role, status, notes }) {
  if (!configured() || !email) return false;
  const roleLabel = role === 'supplier' ? 'supplier business' : role === 'bank' ? 'bank / financial institution' : 'verification';
  const copy = {
    verified: {
      subject: 'VTG verification approved',
      title: 'Your VTG verification is complete',
      text: `Your ${roleLabel} account has been verified. You can now enter your VTG workspace.`,
    },
    needs_correction: {
      subject: 'VTG verification needs correction',
      title: 'Action required on your VTG verification',
      text: `VTG reviewed your ${roleLabel} submission and one or more items need correction before verification can be completed.`,
    },
    under_review: {
      subject: 'VTG verification is under review',
      title: 'Your VTG verification is under review',
      text: `Your latest verification submission has been received and is awaiting review.`,
    },
  }[status];

  if (!copy) return false;
  const base = process.env.PUBLIC_APP_URL || 'https://vtg-staging.vercel.app';
  const next = status === 'verified' ? '/trade-os.html' : '/verification.html';
  const note = notes ? String(notes) : '';
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: copy.subject,
      text: [
        `Hello ${fullName || 'VTG member'},`,
        '',
        copy.text,
        note ? `Review note: ${note}` : '',
        '',
        `Continue here: ${base}${next}`,
        '',
        'Vintage Trade Global',
      ].filter(Boolean).join('\n'),
      html: `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f1e8;font-family:Arial,sans-serif;color:#1f2933"><div style="max-width:640px;margin:auto;background:#fff;border:1px solid #e5e0d5;border-radius:16px;padding:30px"><h1 style="margin-top:0;color:#8f1d17">${esc(copy.title)}</h1><p>Hello ${esc(fullName || 'VTG member')},</p><p>${esc(copy.text)}</p>${note ? `<div style="padding:14px;background:#f7f3eb;border-radius:10px"><strong>Review note</strong><p style="margin-bottom:0">${esc(note)}</p></div>` : ''}<p style="margin-top:24px"><a href="${base}${next}" style="display:inline-block;padding:11px 16px;background:#b52d25;color:#fff;text-decoration:none;border-radius:9px">${status === 'verified' ? 'Enter VTG workspace' : 'Open verification'}</a></p><p style="font-size:12px;color:#66717a">Vintage Trade Global</p></div></body></html>`,
    });
    return true;
  } catch (error) {
    console.warn('[VTG] Verification notification failed:', error.message);
    return false;
  }
}

module.exports = { sendVerificationStatusEmail };
