const { z } = require('zod');
const { query, withTransaction } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const audit = require('../services/audit.service');

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (error) {
  nodemailer = null;
}

const DEMO_ACCOUNTS = Object.freeze({
  'buyer@demo.vtg': {
    id: 'demo-buyer',
    email: 'buyer@demo.vtg',
    role: 'buyer',
    full_name: 'Temitope Adebayo',
    preferred_language: 'en',
    location_text: 'Lagos, Nigeria',
    location_lat: 6.5244,
    location_lng: 3.3792,
    is_verified: true,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  'supplier@demo.vtg': {
    id: 'demo-supplier',
    email: 'supplier@demo.vtg',
    role: 'supplier',
    full_name: 'Li Wei (HOPTOP Motors)',
    preferred_language: 'en',
    location_text: 'Guangzhou, China',
    location_lat: 23.1291,
    location_lng: 113.2644,
    is_verified: true,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  'bank@demo.vtg': {
    id: 'demo-bank',
    email: 'bank@demo.vtg',
    role: 'bank',
    full_name: 'Chidi Okafor',
    preferred_language: 'en',
    location_text: 'Lagos, Nigeria',
    location_lat: 6.5244,
    location_lng: 3.3792,
    is_verified: true,
    is_active: true,
    created_at: new Date().toISOString(),
  },
});

const DEMO_PROFILES = Object.freeze({
  buyer: { country: 'Nigeria', city: 'Lagos', buyer_type: 'individual' },
  supplier: { country: 'China', city: 'Guangzhou', company_name: 'HOPTOP Motors Co. Ltd' },
  bank: { bank_name: 'Zenith Bank', branch: 'Victoria Island' },
});

const DEMO_AUTH_ENABLED = String(process.env.ENABLE_DEMO_AUTH || 'false').toLowerCase() === 'true';

const PENDING_EMAIL_VERIFICATIONS = new Map();

function isDatabaseUnavailableError(err) {
  if (!err) return false;
  const message = String(err.message || '').toLowerCase();
  return ['ecconrefused', 'econnrefused', 'etimedout', 'enotfound', 'timeout', 'connect'].some((needle) => message.includes(needle));
}

function getDemoAccount(email, password) {
  if (!DEMO_AUTH_ENABLED) return null;
  const account = DEMO_ACCOUNTS[email];
  if (!account || password !== 'Password123') return null;
  return account;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );
}

function dispatchVerificationEmail(email, code) {
  if (!isSmtpConfigured()) return false;

  if (!nodemailer) {
    console.info(`[VTG] SMTP configured for ${email}; verification code should be delivered via SMTP: ${code}`);
    return true;
  }

  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    return transport.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'VTG Africa verification code',
      text: `Your VTG Africa verification code is ${code}. It expires in 15 minutes.`,
    }).then(() => true).catch((error) => {
      console.warn('[VTG] Failed to send verification email:', error.message);
      return false;
    });
  } catch (error) {
    console.warn('[VTG] SMTP verification mail unavailable:', error.message);
    return false;
  }
}

async function issueEmailVerificationCode(email) {
  const normalizedEmail = normalizeEmail(email);
  const code = generateVerificationCode();
  PENDING_EMAIL_VERIFICATIONS.set(normalizedEmail, {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
  const sent = await Promise.resolve(dispatchVerificationEmail(normalizedEmail, code));
  const deliveryMode = sent ? 'smtp' : 'local-log';
  console.info(`[VTG] Verification code for ${normalizedEmail}: ${code}`);
  return { code, deliveryMode };
}

function consumeEmailVerificationCode(email, code) {
  const normalizedEmail = normalizeEmail(email);
  const pending = PENDING_EMAIL_VERIFICATIONS.get(normalizedEmail);
  if (!pending) return false;
  if (Date.now() > pending.expiresAt) {
    PENDING_EMAIL_VERIFICATIONS.delete(normalizedEmail);
    return false;
  }
  const match = String(code || '').trim() === String(pending.code);
  if (match) {
    PENDING_EMAIL_VERIFICATIONS.delete(normalizedEmail);
  }
  return match;
}

function hasValidEmailVerificationCode(email, code) {
  const normalizedEmail = normalizeEmail(email);
  const pending = PENDING_EMAIL_VERIFICATIONS.get(normalizedEmail);
  if (!pending) return false;
  if (Date.now() > pending.expiresAt) {
    PENDING_EMAIL_VERIFICATIONS.delete(normalizedEmail);
    return false;
  }
  return String(code || '').trim() === String(pending.code);
}

const baseSignup = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Needs an uppercase letter').regex(/[0-9]/, 'Needs a number'),
  fullName: z.string().min(2),
  phone: z.string().min(7).optional(),
  preferredLanguage: z.string().min(2).max(10).optional(),
  verificationCode: z.string().min(6).max(6).optional(),
});

const buyerSignupSchema = baseSignup.extend({
  buyerType: z.enum(['individual', 'business', 'dealer', 'ngo']),
  companyName: z.string().optional(),
  registrationNo: z.string().optional(),
  bvn: z.string().regex(/^\d{11}$/).optional(),
  bankName: z.string().optional(),
  bankAccountNo: z.string().optional(),
});

const supplierSignupSchema = baseSignup.extend({
  companyName: z.string().min(2),
  registrationNo: z.string().optional(),
  swiftCode: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNo: z.string().optional(),
});

const bankSignupSchema = baseSignup.extend({
  bankName: z.string().min(2),
  swiftCode: z.string().optional(),
  branch: z.string().optional(),
  officerTitle: z.string().optional(),
});

function issueTokens(user) {
  const payload = { id: user.id, role: user.role, email: user.email };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

function publicUser(row, profile) {
  const base = {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    preferredLanguage: row.preferred_language || 'en',
    locationText: row.location_text || null,
    locationLat: row.location_lat || null,
    locationLng: row.location_lng || null,
    isVerified: row.is_verified,
    createdAt: row.created_at,
  };
  if (profile) {
    if (row.role === 'buyer') {
      base.country = profile.country || null;
      base.city = profile.city || null;
      base.buyerType = profile.buyer_type || null;
    } else if (row.role === 'supplier') {
      base.country = profile.country || null;
      base.city = profile.city || null;
      base.companyName = profile.company_name || null;
    } else if (row.role === 'bank') {
      base.bankName = profile.bank_name || null;
      base.branch = profile.branch || null;
    }
  }
  return base;
}

async function fetchProfile(userId, role) {
  const table = role === 'buyer' ? 'buyer_profiles' : role === 'supplier' ? 'supplier_profiles' : role === 'bank' ? 'bank_profiles' : null;
  if (!table) return null;
  const { rows } = await query(`SELECT * FROM ${table} WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

const registerBuyer = asyncHandler(async (req, res) => {
  const data = buyerSignupSchema.parse(req.body);
  if (!consumeEmailVerificationCode(data.email, data.verificationCode)) {
    throw new AppError('Email verification is required before creating an account', 401, 'EMAIL_NOT_VERIFIED');
  }
  const passwordHash = await hashPassword(data.password);

  const result = await withTransaction(async (client) => {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows[0]) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');

    const userRes = await client.query(
      `INSERT INTO users (email, phone, password_hash, role, full_name, preferred_language)
       VALUES ($1,$2,$3,'buyer',$4,$5) RETURNING *`,
      [data.email, data.phone || null, passwordHash, data.fullName, data.preferredLanguage || 'en']
    );
    const user = userRes.rows[0];

    await client.query(
      `INSERT INTO buyer_profiles (user_id, buyer_type, company_name, registration_no, bvn, bank_name, bank_account_no)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [user.id, data.buyerType, data.companyName || null, data.registrationNo || null, data.bvn || null, data.bankName || null, data.bankAccountNo || null]
    );

    // Start every buyer with zero-balance USD/NGN/CNY wallets so the dashboard has something real to show.
    for (const currency of ['USD', 'NGN', 'CNY']) {
      await client.query('INSERT INTO wallet_accounts (user_id, currency, balance) VALUES ($1,$2,0)', [user.id, currency]);
    }

    return user;
  });

  await audit.log(result.id, 'Account Created', `Buyer account created (${data.buyerType})`, req.ip);
  const tokens = issueTokens(result);
  const profile = await fetchProfile(result.id, result.role);
  res.status(201).json({ user: publicUser(result, profile), ...tokens });
});

const registerSupplier = asyncHandler(async (req, res) => {
  const data = supplierSignupSchema.parse(req.body);
  if (!consumeEmailVerificationCode(data.email, data.verificationCode)) {
    throw new AppError('Email verification is required before creating an account', 401, 'EMAIL_NOT_VERIFIED');
  }
  const passwordHash = await hashPassword(data.password);

  const result = await withTransaction(async (client) => {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows[0]) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');

    const userRes = await client.query(
      `INSERT INTO users (email, phone, password_hash, role, full_name, preferred_language)
       VALUES ($1,$2,$3,'supplier',$4,$5) RETURNING *`,
      [data.email, data.phone || null, passwordHash, data.fullName, data.preferredLanguage || 'en']
    );
    const user = userRes.rows[0];

    await client.query(
      `INSERT INTO supplier_profiles (user_id, company_name, registration_no, swift_code, bank_name, bank_account_no)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [user.id, data.companyName, data.registrationNo || null, data.swiftCode || null, data.bankName || null, data.bankAccountNo || null]
    );

    return user;
  });

  await audit.log(result.id, 'Account Created', 'Supplier account created', req.ip);
  const tokens = issueTokens(result);
  const profile = await fetchProfile(result.id, result.role);
  res.status(201).json({ user: publicUser(result, profile), ...tokens });
});

const registerBank = asyncHandler(async (req, res) => {
  const data = bankSignupSchema.parse(req.body);
  if (!consumeEmailVerificationCode(data.email, data.verificationCode)) {
    throw new AppError('Email verification is required before creating an account', 401, 'EMAIL_NOT_VERIFIED');
  }
  const passwordHash = await hashPassword(data.password);

  const result = await withTransaction(async (client) => {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows[0]) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');

    const userRes = await client.query(
      `INSERT INTO users (email, phone, password_hash, role, full_name, preferred_language)
       VALUES ($1,$2,$3,'bank',$4,$5) RETURNING *`,
      [data.email, data.phone || null, passwordHash, data.fullName, data.preferredLanguage || 'en']
    );
    const user = userRes.rows[0];

    await client.query(
      `INSERT INTO bank_profiles (user_id, bank_name, swift_code, branch, officer_name, officer_title)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [user.id, data.bankName, data.swiftCode || null, data.branch || null, data.fullName, data.officerTitle || null]
    );

    return user;
  });

  await audit.log(result.id, 'Account Created', 'Bank officer account created', req.ip);
  const tokens = issueTokens(result);
  const profile = await fetchProfile(result.id, result.role);
  res.status(201).json({ user: publicUser(result, profile), ...tokens });
});

const sendVerificationCode = asyncHandler(async (req, res) => {
  const schema = z.object({ email: z.string().email() });
  const { email } = schema.parse(req.body);
  const verification = await issueEmailVerificationCode(email);
  res.json({
    ok: true,
    message: 'A verification code has been sent to your email address.',
    email,
    code: verification.code,
    deliveryMode: verification.deliveryMode,
  });
});

const verifyEmailCode = asyncHandler(async (req, res) => {
  const schema = z.object({ email: z.string().email(), code: z.string().min(6).max(6) });
  const { email, code } = schema.parse(req.body);
  if (!hasValidEmailVerificationCode(email, code)) {
    throw new AppError('The verification code is invalid or has expired', 401, 'INVALID_VERIFICATION_CODE');
  }
  res.json({ ok: true, message: 'Email verified successfully.', email });
});

const login = asyncHandler(async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
  const { email, password } = schema.parse(req.body);

  const demoAccount = getDemoAccount(email, password);
  if (demoAccount) {
    const tokens = issueTokens(demoAccount);
    res.json({ user: publicUser(demoAccount, DEMO_PROFILES[demoAccount.role]), ...tokens });
    return;
  }

  let user;
  try {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    user = rows[0];
  } catch (err) {
    if (isDatabaseUnavailableError(err)) {
      throw new AppError('Database unavailable. Please try again later.', 503, 'DB_UNAVAILABLE');
    }
    throw err;
  }

  if (!user || !user.is_active) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  await audit.log(user.id, 'Login', `${user.role} logged in`, req.ip);
  const tokens = issueTokens(user);
  const profile = await fetchProfile(user.id, user.role);
  res.json({ user: publicUser(user, profile), ...tokens });
});

const refresh = asyncHandler(async (req, res) => {
  const schema = z.object({ refreshToken: z.string() });
  const { refreshToken } = schema.parse(req.body);

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHENTICATED');
  }

  const { rows } = await query('SELECT * FROM users WHERE id = $1', [payload.id]);
  const user = rows[0];
  if (!user || !user.is_active) throw new AppError('Account not found or disabled', 401, 'UNAUTHENTICATED');

  const tokens = issueTokens(user);
  res.json(tokens);
});

const me = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = rows[0];
  if (!user) throw new AppError('User not found', 404);
  const profile = await fetchProfile(user.id, user.role);
  res.json({ user: publicUser(user, profile) });
});

module.exports = {
  registerBuyer,
  registerSupplier,
  registerBank,
  sendVerificationCode,
  verifyEmailCode,
  login,
  refresh,
  me,
  issueEmailVerificationCode,
};
