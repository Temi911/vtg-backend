const { z } = require('zod');
const crypto = require('crypto');
const { query, withTransaction } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const audit = require('../services/audit.service');
const nodemailer = require('nodemailer');

let cachedTransporter = null;
function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return cachedTransporter;
}

async function dispatchVerificationEmail(email, code) {
  if (!isEmailConfigured()) return false;
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Welcome to Vintage Trade Global — Verify your email',
      text: [
        'Welcome to Vintage Trade Global (VTG)!',
        '',
        'Thank you for creating your VTG account. We are excited to have you join our global trade community connecting buyers, suppliers, banks and trade partners.',
        '',
        `Your email verification code is: ${code}`,
        '',
        'Please enter this code on the VTG website to verify your email address and continue creating your account.',
        'This verification code expires in 15 minutes. For your security, please do not share this code with anyone.',
        '',
        'If you did not request this verification code, you can safely ignore this email.',
        '',
        'Welcome to VTG — Vintage Trade Global.',
        'Connecting Africa, China and the World through trusted trade.',
      ].join('\\n'),
      html: `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f1e8;font-family:Arial,sans-serif;color:#1f2933;">
    <div style="max-width:620px;margin:32px auto;background:#ffffff;border:1px solid #e5e0d5;border-radius:14px;overflow:hidden;">
      <div style="padding:28px 32px;background:#11161d;color:#ffffff;">
        <h1 style="margin:0;font-size:26px;">Welcome to Vintage Trade Global</h1>
        <p style="margin:8px 0 0;color:#d9e0e5;">Africa • China • World Trade</p>
      </div>
      <div style="padding:32px;">
        <p style="font-size:17px;margin-top:0;">Thank you for creating your VTG account. We're excited to welcome you to our global trade community.</p>
        <p>Please verify your email address using the code below:</p>
        <div style="margin:24px 0;padding:20px;text-align:center;background:#f7f3eb;border-radius:10px;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#66717a;">Your verification code</div>
          <div style="margin-top:8px;font-size:34px;font-weight:700;letter-spacing:8px;color:#b51f2d;">${code}</div>
        </div>
        <p><strong>Enter this code on the VTG website</strong> to verify your email address and continue creating your account.</p>
        <p>This code expires in <strong>15 minutes</strong>. For your security, please do not share it with anyone.</p>
        <p style="color:#66717a;font-size:14px;">If you did not request this verification code, you can safely ignore this email.</p>
        <p style="margin-bottom:0;">Welcome to VTG — Vintage Trade Global.<br>Connecting Africa, China and the World through trusted trade.</p>
      </div>
    </div>
  </body>
</html>`,
    });
    console.info(`[VTG] Verification email sent via SMTP for ${email}`);
    return true;
  } catch (error) {
    console.warn('[VTG] SMTP verification email failed:', error.message);
    return false;
  }
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

function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

async function issueEmailVerificationCode(email) {
  const normalizedEmail = normalizeEmail(email);
  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await query(`INSERT INTO email_verifications (email, code_hash, expires_at) VALUES ($1,$2,$3) ON CONFLICT (email) DO UPDATE SET code_hash=EXCLUDED.code_hash, expires_at=EXCLUDED.expires_at, created_at=NOW()`, [normalizedEmail, codeHash, expiresAt]);
  const sent = await dispatchVerificationEmail(normalizedEmail, code);
  if (!sent) {
    await query('DELETE FROM email_verifications WHERE email = $1', [normalizedEmail]);
    throw new AppError('We could not deliver the verification email. Please try again later.', 502, 'EMAIL_DELIVERY_FAILED');
  }
  return { sent: true };
}

async function consumeEmailVerificationCode(email, code) {
  const normalizedEmail = normalizeEmail(email);
  const codeHash = hashVerificationCode(code);
  return withTransaction(async (client) => {
    const found = await client.query('SELECT email FROM email_verifications WHERE email=$1 AND code_hash=$2 AND expires_at>NOW() FOR UPDATE', [normalizedEmail, codeHash]);
    if (!found.rows[0]) return false;
    await client.query('DELETE FROM email_verifications WHERE email=$1', [normalizedEmail]);
    return true;
  });
}

async function hasValidEmailVerificationCode(email, code) {
  const normalizedEmail = normalizeEmail(email);
  const codeHash = hashVerificationCode(code);
  const { rows } = await query('SELECT email FROM email_verifications WHERE email=$1 AND code_hash=$2 AND expires_at>NOW()', [normalizedEmail, codeHash]);
  return Boolean(rows[0]);
}

function getDemoAccount(email, password) {
  if (!DEMO_AUTH_ENABLED) return null;
  const normalized = normalizeEmail(email);
  const demoPasswords = {
    'buyer@demo.vtg': process.env.DEMO_BUYER_PASSWORD,
    'supplier@demo.vtg': process.env.DEMO_SUPPLIER_PASSWORD,
    'bank@demo.vtg': process.env.DEMO_BANK_PASSWORD,
  };
  const expected = demoPasswords[normalized];
  if (!expected || password !== expected) return null;
  return DEMO_ACCOUNTS[normalized] || null;
}

function isDatabaseUnavailableError(error) {
  return Boolean(error && ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', '57P01', '57P02', '57P03'].includes(error.code));
}

function normalizeEmail(email) { return String(email || '').trim().toLowerCase(); }
function generateVerificationCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

const VTG_AFRICA_COUNTRIES = [
  'Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cabo Verde','Cameroon','Central African Republic','Chad',
  'Comoros','DR Congo','Republic of the Congo','Côte d’Ivoire','Djibouti','Egypt','Equatorial Guinea','Eritrea','Eswatini',
  'Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi',
  'Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda','São Tomé and Príncipe',
  'Senegal','Seychelles','Sierra Leone','Somalia','South Africa','South Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda',
  'Zambia','Zimbabwe'
];
const VTG_SUPPLIER_COUNTRIES = ['China','South Korea'];
const VTG_BANK_COUNTRIES = [...VTG_AFRICA_COUNTRIES, ...VTG_SUPPLIER_COUNTRIES];
const allowedCountry = (list, label) => z.string().min(2).max(80).refine(value => list.includes(value), label);

const baseSignup = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Needs an uppercase letter').regex(/[0-9]/, 'Needs a number'),
  fullName: z.string().min(2),
  phone: z.string().min(7).optional(),
  phoneCountry: z.string().min(2).max(80).optional(),
  preferredLanguage: z.string().min(2).max(10).optional(),
  verificationCode: z.string().min(6).max(6).optional(),
});

const buyerSignupSchema = baseSignup.extend({
  buyerType: z.enum(['individual', 'business', 'dealer', 'ngo', 'organisation']),
  phoneCountry: allowedCountry(VTG_AFRICA_COUNTRIES, 'Buyer contact country must be an African country'),
  companyName: z.string().optional(),
  registrationNo: z.string().optional(),
  country: allowedCountry(VTG_AFRICA_COUNTRIES, 'Buyer country must be an African country').default('Nigeria'),
  city: z.string().min(2).max(100).optional(),
  bankName: z.string().optional(),
  bankAccountNo: z.string().optional(),
});

const supplierSignupSchema = baseSignup.extend({
  phoneCountry: allowedCountry(VTG_SUPPLIER_COUNTRIES, 'Supplier contact country must be China or South Korea'),
  companyName: z.string().min(2),
  registrationNo: z.string().min(2),
  licenseNumber: z.string().min(2),
  regulator: z.string().min(2),
  country: allowedCountry(VTG_SUPPLIER_COUNTRIES, 'Supplier country must be China or South Korea').default('China'),
  city: z.string().min(2).max(100).optional(),
  swiftCode: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNo: z.string().optional(),
});

const agentSignupSchema = baseSignup.extend({
  verificationCode: z.string().min(6).max(6),
  country: z.enum(['China','South Korea']),
  city: z.string().min(2).max(100),
  experienceYears: z.coerce.number().int().min(0).max(60).default(0),
  regionsServed: z.string().min(2).max(1000),
  categories: z.array(z.string()).max(30).default([]),
  languages: z.array(z.string()).max(20).default([]),
  bio: z.string().max(2000).optional(),
  payoutMethod: z.string().max(80).optional(),
});

const bankSignupSchema = baseSignup.extend({
  bankName: z.string().min(2),
  country: allowedCountry(VTG_BANK_COUNTRIES, 'Bank country must be in Africa, China, or South Korea').default('Nigeria'),
  institutionType: z.string().min(2).max(80),
  regulator: z.string().min(2).max(160),
  licenseNumber: z.string().min(2).max(120),
  swiftCode: z.string().optional(),
  branch: z.string().optional(),
  officerTitle: z.string().min(2),
  workEmail: z.string().email(),
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
    } else if (row.role === 'agent') {
      base.country = profile.country || null;
      base.city = profile.city || null;
      base.agentStatus = profile.status || 'pending';
    }
  }
  return base;
}

async function fetchProfile(userId, role) {
  const table = role === 'buyer' ? 'buyer_profiles' : role === 'supplier' ? 'supplier_profiles' : role === 'bank' ? 'bank_profiles' : role === 'agent' ? 'agent_profiles' : null;
  if (!table) return null;
  const { rows } = await query(`SELECT * FROM ${table} WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

const registerBuyer = asyncHandler(async (req, res) => {
  const data = buyerSignupSchema.parse(req.body);
  if (!(await consumeEmailVerificationCode(data.email, data.verificationCode))) {
    throw new AppError('Email verification is required before creating an account', 401, 'EMAIL_NOT_VERIFIED');
  }
  const passwordHash = await hashPassword(data.password);

  const result = await withTransaction(async (client) => {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows[0]) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');

    const userRes = await client.query(
      `INSERT INTO users (email, phone, password_hash, role, full_name, preferred_language, is_verified)
       VALUES ($1,$2,$3,'buyer',$4,$5,TRUE) RETURNING *`,
      [data.email, data.phone || null, passwordHash, data.fullName, data.preferredLanguage || 'en']
    );
    const user = userRes.rows[0];

    await client.query(
      `INSERT INTO buyer_profiles (user_id, buyer_type, company_name, registration_no, bank_name, bank_account_no, city, country)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [user.id, data.buyerType === 'organisation' ? 'ngo' : data.buyerType, data.companyName || null, data.registrationNo || null, data.bankName || null, data.bankAccountNo || null, data.city || null, data.country || 'Nigeria']
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
  if (!(await consumeEmailVerificationCode(data.email, data.verificationCode))) {
    throw new AppError('Email verification is required before creating an account', 401, 'EMAIL_NOT_VERIFIED');
  }
  const passwordHash = await hashPassword(data.password);

  const result = await withTransaction(async (client) => {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows[0]) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');

    const userRes = await client.query(
      `INSERT INTO users (email, phone, password_hash, role, full_name, preferred_language, is_verified)
       VALUES ($1,$2,$3,'supplier',$4,$5,TRUE) RETURNING *`,
      [data.email, data.phone || null, passwordHash, data.fullName, data.preferredLanguage || 'en']
    );
    const user = userRes.rows[0];

    await client.query(
      `INSERT INTO supplier_profiles (user_id, company_name, registration_no, license_number, regulator, swift_code, bank_name, bank_account_no, city, country)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [user.id, data.companyName, data.registrationNo, data.licenseNumber, data.regulator, data.swiftCode || null, data.bankName || null, data.bankAccountNo || null, data.city || null, data.country || 'China']
    );

    return user;
  });

  await audit.log(result.id, 'Account Created', 'Supplier account created', req.ip);
  const tokens = issueTokens(result);
  const profile = await fetchProfile(result.id, result.role);
  res.status(201).json({ user: publicUser(result, profile), ...tokens });
});

const registerAgent = asyncHandler(async (req,res) => {
  const data=agentSignupSchema.parse(req.body);
  if (!(await consumeEmailVerificationCode(data.email, data.verificationCode))) {
    throw new AppError('Email verification is required before creating an agent account', 401, 'EMAIL_NOT_VERIFIED');
  }
  const passwordHash=await hashPassword(data.password);
  const result=await withTransaction(async(client)=>{
    const existing=await client.query('SELECT id FROM users WHERE email=$1',[data.email]);
    if(existing.rows[0]) throw new AppError('An account with this email already exists',409,'EMAIL_TAKEN');
    const userRes=await client.query(`INSERT INTO users(email,phone,password_hash,role,full_name,preferred_language,is_verified) VALUES($1,$2,$3,'agent',$4,'en',TRUE) RETURNING *`,[data.email,data.phone||null,passwordHash,data.fullName]);
    const user=userRes.rows[0];
    await client.query(`INSERT INTO agent_profiles(user_id,country,city,regions_served,experience_years,categories,languages,bio,payout_method) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[user.id,data.country,data.city,data.regionsServed,data.experienceYears,data.categories,data.languages,data.bio||null,data.payoutMethod||null]);
    return user;
  });
  await audit.log(result.id,'Agent Application Submitted',`${data.city}, ${data.country}`,req.ip);
  const tokens=issueTokens(result);
  const profile=await fetchProfile(result.id,result.role);
  res.status(201).json({user:publicUser(result,profile),...tokens});
});

const registerBank = asyncHandler(async (req, res) => {
  const data = bankSignupSchema.parse(req.body);
  if (!(await consumeEmailVerificationCode(data.email, data.verificationCode))) {
    throw new AppError('Email verification is required before creating an account', 401, 'EMAIL_NOT_VERIFIED');
  }
  const passwordHash = await hashPassword(data.password);

  const result = await withTransaction(async (client) => {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows[0]) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');

    const userRes = await client.query(
      `INSERT INTO users (email, phone, password_hash, role, full_name, preferred_language, is_verified)
       VALUES ($1,$2,$3,'bank',$4,$5,TRUE) RETURNING *`,
      [data.email, data.phone || null, passwordHash, data.fullName, data.preferredLanguage || 'en']
    );
    const user = userRes.rows[0];

    await client.query(
      `INSERT INTO bank_profiles (user_id, bank_name, swift_code, branch, officer_name, officer_title, country, institution_type, regulator, license_number, work_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [user.id, data.bankName, data.swiftCode || null, data.branch || null, data.fullName, data.officerTitle || null, data.country || 'Nigeria', data.institutionType || null, data.regulator || null, data.licenseNumber || null, data.workEmail || data.email]
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
  });
});

const verifyEmailCode = asyncHandler(async (req, res) => {
  const schema = z.object({ email: z.string().email(), code: z.string().min(6).max(6) });
  const { email, code } = schema.parse(req.body);
  if (!(await hasValidEmailVerificationCode(email, code))) {
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
  if (!user.is_verified) throw new AppError('Please verify your email before signing in', 403, 'EMAIL_NOT_VERIFIED');

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
  registerAgent,
  sendVerificationCode,
  verifyEmailCode,
  login,
  refresh,
  me,
  issueEmailVerificationCode,
};
