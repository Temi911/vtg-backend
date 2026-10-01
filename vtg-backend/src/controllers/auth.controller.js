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

const LANGUAGE_LABELS = {
  en: 'English', fr: 'Français', pt: 'Português', ar: 'العربية',
  sw: 'Kiswahili', zh: '中文', ko: '한국어'
};
const LANGUAGE_COPY = {
  en:{verifySubject:'Welcome to Vintage Trade Global — Verify your email',verify:'Your email verification code is:',expires:'This code expires in 15 minutes.',welcome:'Welcome to Vintage Trade Global',welcomeText:'Your VTG account is ready. Here is a quick guide to your new trade workspace.',nav:'How to navigate VTG',features:'Your VTG features',subscribe:'Trade updates & intelligence',subscribeText:'Choose whether you want VTG to send you useful trade updates, market intelligence and platform news. You can change this preference at any time.',yes:'I want VTG trade updates',no:'You can unsubscribe at any time from the preference link below.',support:'Need help? Contact VTG support at vintageafricatrade@gmail.com.'},
  fr:{verifySubject:'Bienvenue sur Vintage Trade Global — Vérifiez votre e-mail',verify:'Votre code de vérification e-mail est :',expires:'Ce code expire dans 15 minutes.',welcome:'Bienvenue sur Vintage Trade Global',welcomeText:'Votre compte VTG est prêt. Voici un guide rapide de votre nouvel espace de commerce.',nav:'Comment naviguer sur VTG',features:'Vos fonctionnalités VTG',subscribe:'Actualités et intelligence commerciale',subscribeText:'Choisissez si vous souhaitez recevoir les actualités commerciales, l’intelligence de marché et les informations de la plateforme VTG.',yes:'Je souhaite recevoir les actualités VTG',no:'Vous pouvez vous désabonner à tout moment via le lien de préférences.',support:'Besoin d’aide ? Contactez vintageafricatrade@gmail.com.'},
  pt:{verifySubject:'Bem-vindo à Vintage Trade Global — Verifique o seu e-mail',verify:'O seu código de verificação de e-mail é:',expires:'Este código expira em 15 minutos.',welcome:'Bem-vindo à Vintage Trade Global',welcomeText:'A sua conta VTG está pronta. Aqui está um guia rápido do seu novo espaço de comércio.',nav:'Como navegar na VTG',features:'As suas funcionalidades VTG',subscribe:'Atualizações e inteligência comercial',subscribeText:'Escolha se deseja receber atualizações comerciais, inteligência de mercado e novidades da plataforma VTG.',yes:'Quero receber atualizações da VTG',no:'Pode cancelar a subscrição a qualquer momento através do link de preferências.',support:'Precisa de ajuda? Contacte vintageafricatrade@gmail.com.'},
  ar:{verifySubject:'مرحباً بك في Vintage Trade Global — تأكيد البريد الإلكتروني',verify:'رمز التحقق من بريدك الإلكتروني هو:',expires:'ينتهي هذا الرمز خلال 15 دقيقة.',welcome:'مرحباً بك في Vintage Trade Global',welcomeText:'حساب VTG الخاص بك جاهز. إليك دليلاً سريعاً لمساحة التجارة الجديدة.',nav:'كيفية التنقل في VTG',features:'ميزات VTG الخاصة بك',subscribe:'تحديثات ومعلومات التجارة',subscribeText:'اختر ما إذا كنت تريد تلقي تحديثات التجارة ومعلومات السوق وأخبار منصة VTG.',yes:'أريد تلقي تحديثات VTG',no:'يمكنك إلغاء الاشتراك في أي وقت من رابط التفضيلات.',support:'تحتاج إلى مساعدة؟ تواصل مع vintageafricatrade@gmail.com.'},
  sw:{verifySubject:'Karibu Vintage Trade Global — Thibitisha barua pepe yako',verify:'Msimbo wako wa uthibitishaji wa barua pepe ni:',expires:'Msimbo huu unaisha baada ya dakika 15.',welcome:'Karibu Vintage Trade Global',welcomeText:'Akaunti yako ya VTG iko tayari. Huu ni mwongozo mfupi wa eneo lako jipya la biashara.',nav:'Jinsi ya kutumia VTG',features:'Vipengele vya VTG',subscribe:'Taarifa za biashara na soko',subscribeText:'Chagua kama ungependa kupokea taarifa za biashara, uchanganuzi wa soko na habari za VTG.',yes:'Nataka taarifa za VTG',no:'Unaweza kujiondoa wakati wowote kupitia kiungo cha mapendeleo.',support:'Unahitaji msaada? Wasiliana na vintageafricatrade@gmail.com.'},
  zh:{verifySubject:'欢迎来到 Vintage Trade Global — 验证您的邮箱',verify:'您的邮箱验证码是：',expires:'此验证码将在15分钟后失效。',welcome:'欢迎来到 Vintage Trade Global',welcomeText:'您的 VTG 账户已准备就绪。以下是新贸易工作区的快速指南。',nav:'如何使用 VTG',features:'您的 VTG 功能',subscribe:'贸易资讯与市场情报',subscribeText:'选择是否接收贸易资讯、市场情报和 VTG 平台更新。',yes:'我希望接收 VTG 贸易资讯',no:'您可以通过下方偏好设置链接随时取消订阅。',support:'需要帮助？请联系 vintageafricatrade@gmail.com。'},
  ko:{verifySubject:'Vintage Trade Global에 오신 것을 환영합니다 — 이메일 인증',verify:'이메일 인증 코드는 다음과 같습니다:',expires:'이 코드는 15분 후 만료됩니다.',welcome:'Vintage Trade Global에 오신 것을 환영합니다',welcomeText:'VTG 계정이 준비되었습니다. 새로운 무역 워크스페이스를 빠르게 살펴보세요.',nav:'VTG 이용 방법',features:'VTG 주요 기능',subscribe:'무역 업데이트 및 시장 정보',subscribeText:'무역 소식, 시장 정보 및 VTG 플랫폼 업데이트 수신 여부를 선택하세요.',yes:'VTG 무역 업데이트를 받고 싶습니다',no:'아래 환경설정 링크에서 언제든지 구독을 취소할 수 있습니다.',support:'도움이 필요하신가요? vintageafricatrade@gmail.com으로 문의하세요.'}
};
function normalizeLanguage(value){const v=String(value||'en').toLowerCase().split('-')[0];return LANGUAGE_COPY[v]?v:'en';}
function countryPrefix(country){const map={'Nigeria':'NG','Ghana':'GH','Kenya':'KE','South Africa':'ZA','Egypt':'EG','Morocco':'MA','Tanzania':'TZ','Uganda':'UG','Rwanda':'RW','Ethiopia':'ET','Zambia':'ZM','Zimbabwe':'ZW','China':'CN','South Korea':'KR'};return map[country]||String(country||'AF').replace(/[^A-Za-z]/g,'').slice(0,2).toUpperCase()||'AF';}
function createVtgUserId(country,role){return 'VTG-'+countryPrefix(country)+'-'+String(role||'USER').slice(0,3).toUpperCase()+'-'+crypto.randomBytes(4).toString('hex').toUpperCase();}
function createUnsubscribeToken(){return crypto.randomBytes(24).toString('hex');}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

async function dispatchVerificationEmail(email, code, language='en') {
  if (!isEmailConfigured()) return false;
  const lang=normalizeLanguage(language), t=LANGUAGE_COPY[lang];
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM, to: email, subject: t.verifySubject,
      text:[t.welcome+'!','',t.verify+' '+code,t.expires,'','VTG — Vintage Trade Global.','Connecting African businesses with international trade opportunities.'].join('\\n'),
      html:`<!doctype html><html><body style="margin:0;padding:0;background:#f5f1e8;font-family:Arial,sans-serif;color:#1f2933"><div style="max-width:620px;margin:28px auto;background:#fff;border:1px solid #e5e0d5;border-radius:16px;overflow:hidden"><div style="padding:24px 30px;background:#11161d;text-align:center"><img src="https://vtg-backended.vercel.app/assets/vtg-logo.svg" alt="Vintage Trade Global" style="max-width:250px;height:auto"><p style="color:#d9e0e5;margin:10px 0 0">Africa • China • World Trade</p></div><div style="padding:30px"><h1 style="font-size:24px;margin-top:0">${escapeHtml(t.welcome)}</h1><p>${escapeHtml(t.verify)}</p><div style="margin:22px 0;padding:18px;text-align:center;background:#f7f3eb;border-radius:10px;font-size:32px;font-weight:700;letter-spacing:7px;color:#b51f2d">${escapeHtml(code)}</div><p>${escapeHtml(t.expires)}</p><p style="color:#66717a">${escapeHtml(t.support)}</p></div></div></body></html>`
    }); return true;
  } catch(error){console.warn('[VTG] SMTP verification email failed:',error.message);return false;}
}

async function dispatchWelcomeEmail(user, language, country, role, marketingSubscribed, unsubscribeToken){
  if(!isEmailConfigured()) return false;
  const lang=normalizeLanguage(language),t=LANGUAGE_COPY[lang];
  const base=process.env.PUBLIC_APP_URL||'https://vtg-backended.vercel.app';
  const pref=`${base}/api/auth/email-preferences/${encodeURIComponent(unsubscribeToken)}`;
  const dashboard=role==='supplier'||role==='bank'?'/verification.html':role==='agent'?'/agent-dashboard.html':'/trade-os.html';
  const roleText={buyer:'Buyer / Importer',supplier:'Supplier / Trading Company',bank:'Bank / Financial Institution',agent:'VTG Inspection Agent'}[role]||role;
  const id=user.vtg_user_id;
  const html=`<!doctype html><html><body style="margin:0;padding:0;background:#f5f1e8;font-family:Arial,sans-serif;color:#1f2933"><div style="max-width:680px;margin:25px auto;background:#fff;border:1px solid #e5e0d5;border-radius:16px;overflow:hidden"><div style="padding:25px 30px;background:#11161d;text-align:center"><img src="https://vtg-backended.vercel.app/assets/vtg-logo.svg" alt="Vintage Trade Global" style="max-width:250px"><p style="color:#d9e0e5">Africa • China • World Trade</p></div><div style="padding:30px"><h1 style="margin-top:0">${escapeHtml(t.welcome)}, ${escapeHtml(user.full_name||'')}!</h1><p>${escapeHtml(t.welcomeText)}</p><div style="background:#f7f3eb;border-radius:12px;padding:16px;margin:20px 0"><b>VTG User ID:</b> ${escapeHtml(id)}<br><b>Role:</b> ${escapeHtml(roleText)}<br><b>Country:</b> ${escapeHtml(country)}<br><b>Language:</b> ${escapeHtml(LANGUAGE_LABELS[lang])}</div><h2>${escapeHtml(t.nav)}</h2><ul><li>Enter VTG to open your role-based workspace.</li><li>Use Marketplace to discover products and trade opportunities.</li><li>Use verification and inspection tools where available for your role.</li><li>Use Market Intelligence and VTG AI for trade information and planning.</li><li>Keep your profile, documents and account information up to date.</li></ul><h2>${escapeHtml(t.features)}</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div style="padding:12px;background:#faf7f1;border-radius:9px">Marketplace & sourcing</div><div style="padding:12px;background:#faf7f1;border-radius:9px">Business verification</div><div style="padding:12px;background:#faf7f1;border-radius:9px">Product inspection</div><div style="padding:12px;background:#faf7f1;border-radius:9px">Trade intelligence & AI</div><div style="padding:12px;background:#faf7f1;border-radius:9px">Trade documents</div><div style="padding:12px;background:#faf7f1;border-radius:9px">Logistics & trade network</div></div><h2>${escapeHtml(t.subscribe)}</h2><p>${escapeHtml(t.subscribeText)}</p><p><b>${marketingSubscribed?escapeHtml(t.yes):escapeHtml(t.no)}</b></p><p style="font-size:12px;color:#66717a">Manage preferences or unsubscribe: <a href="${pref}">${pref}</a></p><p style="margin-top:28px">${escapeHtml(t.support)}</p><p style="font-size:11px;color:#7b8790">This is a service welcome email. You will receive essential account, security and transaction messages regardless of marketing preference.</p></div></div></body></html>`;
  try{await getTransporter().sendMail({from:process.env.SMTP_FROM,to:user.email,subject:t.welcome+' — Vintage Trade Global',html,text:[t.welcome+' '+user.full_name,'VTG User ID: '+id,'Role: '+roleText,'Country: '+country,'',t.welcomeText,'',t.nav,'Marketplace, verification, inspection, trade intelligence, AI, documents and logistics tools are available according to your role.','',t.subscribeText,'Preferences: '+pref].join('\\n')});return true}catch(error){console.warn('[VTG] Welcome email failed:',error.message);return false;}
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

async function issueEmailVerificationCode(email, language='en') {
  const normalizedEmail = normalizeEmail(email);
  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await query(`INSERT INTO email_verifications (email, code_hash, expires_at) VALUES ($1,$2,$3) ON CONFLICT (email) DO UPDATE SET code_hash=EXCLUDED.code_hash, expires_at=EXCLUDED.expires_at, created_at=NOW()`, [normalizedEmail, codeHash, expiresAt]);
  const sent = await dispatchVerificationEmail(normalizedEmail, code, language);
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

const VTG_AGREEMENT_VERSION = '2026-09-01';
const VTG_PRIVACY_VERSION = '2026-09-01';
const VTG_TERMS_VERSION = '2026-09-01';

async function hasCurrentAgreement(userId) {
  const { rows } = await query(
    'SELECT 1 FROM user_agreements WHERE user_id=$1 AND agreement_version=$2 LIMIT 1',
    [userId, VTG_AGREEMENT_VERSION]
  );
  return Boolean(rows[0]);
}

const acceptAgreement = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  await query(
    `INSERT INTO user_agreements (user_id, agreement_version, privacy_version, terms_version, ip_address)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id, agreement_version) DO NOTHING`,
    [userId, VTG_AGREEMENT_VERSION, VTG_PRIVACY_VERSION, VTG_TERMS_VERSION, req.ip || null]
  );
  await audit.log(userId, 'Account Agreement Accepted', `Privacy Policy ${VTG_PRIVACY_VERSION} and Signup Agreement ${VTG_TERMS_VERSION}`, req.ip);
  res.json({ ok: true, agreementRequired: false, agreementVersion: VTG_AGREEMENT_VERSION });
});

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
  preferredLanguage: z.enum(['en','fr','pt','ar','sw','zh','ko']).default('en'),
  marketingSubscribed: z.coerce.boolean().default(false),
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
  businessModel: z.string().min(2).max(100),
  productCategory: z.string().min(2).max(160),
  exportMarkets: z.string().min(2).max(500),
  tradeYears: z.coerce.number().int().min(0).max(100),
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
  vtgServices: z.string().min(2).max(160),
  regulatoryStatus: z.string().min(2).max(120),
  marketsServed: z.string().min(2).max(500),
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
    userId: row.vtg_user_id || row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    preferredLanguage: normalizeLanguage(row.preferred_language),
    locationText: row.location_text || null,
    locationLat: row.location_lat || null,
    locationLng: row.location_lng || null,
    isVerified: row.is_verified,
    businessVerificationStatus: row.business_verification_status || 'not_required',
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
      base.country = profile.country || null;
      base.city = profile.branch || null;
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

const emailPreference = asyncHandler(async (req,res)=>{
  const token=String(req.params.token||'');
  const {rows}=await query('SELECT id,email,marketing_subscribed FROM users WHERE marketing_unsubscribe_token=$1',[token]);
  if(!rows[0]) throw new AppError('This preference link is invalid or expired',404,'INVALID_PREFERENCE_LINK');
  await query('UPDATE users SET marketing_subscribed=false WHERE id=$1',[rows[0].id]);
  res.type('html').send('<html><body style="font-family:Arial;padding:40px"><h1>VTG email preference updated</h1><p>You have been unsubscribed from VTG trade and marketing updates. Essential account and security emails may still be sent.</p></body></html>');
});

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
      `INSERT INTO users (email, phone, password_hash, role, full_name, preferred_language, is_verified, vtg_user_id, marketing_subscribed, marketing_unsubscribe_token)
       VALUES ($1,$2,$3,'buyer',$4,$5,TRUE,$6,$7,$8) RETURNING *`,
      [data.email, data.phone || null, passwordHash, data.fullName, data.preferredLanguage, createVtgUserId(data.country,'buyer'), Boolean(data.marketingSubscribed), createUnsubscribeToken()]
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
  await dispatchWelcomeEmail(result, data.preferredLanguage, data.country, 'buyer', Boolean(data.marketingSubscribed), result.marketing_unsubscribe_token);
  const tokens = issueTokens(result);
  const profile = await fetchProfile(result.id, result.role);
  res.status(201).json({ user: publicUser(result, profile), ...tokens, agreementRequired: true });
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
      `INSERT INTO users (email, phone, password_hash, role, full_name, preferred_language, is_verified, business_verification_status, vtg_user_id, marketing_subscribed, marketing_unsubscribe_token)
       VALUES ($1,$2,$3,'supplier',$4,$5,TRUE,'pending',$6,$7,$8) RETURNING *`,
      [data.email, data.phone || null, passwordHash, data.fullName, data.preferredLanguage, createVtgUserId(data.country,'supplier'), Boolean(data.marketingSubscribed), createUnsubscribeToken()]
    );
    const user = userRes.rows[0];

    await client.query(
      `INSERT INTO supplier_profiles (user_id, company_name, registration_no, license_number, regulator, swift_code, bank_name, bank_account_no, city, country, business_model, product_category, export_markets, trade_years)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [user.id, data.companyName, data.registrationNo, data.licenseNumber, data.regulator, data.swiftCode || null, data.bankName || null, data.bankAccountNo || null, data.city || null, data.country || 'China', data.businessModel, data.productCategory, data.exportMarkets, data.tradeYears]
    );

    return user;
  });

  await audit.log(result.id, 'Account Created', 'Supplier account created', req.ip);
  await dispatchWelcomeEmail(result, data.preferredLanguage, data.country, 'supplier', Boolean(data.marketingSubscribed), result.marketing_unsubscribe_token);
  const tokens = issueTokens(result);
  const profile = await fetchProfile(result.id, result.role);
  res.status(201).json({ user: publicUser(result, profile), ...tokens, agreementRequired: true });
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
    const userRes=await client.query(`INSERT INTO users(email,phone,password_hash,role,full_name,preferred_language,is_verified) VALUES($1,$2,$3,'agent',$4,$5,TRUE,$6,$7,$8) RETURNING *`,[data.email,data.phone||null,passwordHash,data.fullName,data.preferredLanguage,createVtgUserId(data.country,'agent'),Boolean(data.marketingSubscribed),createUnsubscribeToken()]);
    const user=userRes.rows[0];
    await client.query(`INSERT INTO agent_profiles(user_id,country,city,regions_served,experience_years,categories,languages,bio,payout_method) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[user.id,data.country,data.city,data.regionsServed,data.experienceYears,data.categories,data.languages,data.bio||null,data.payoutMethod||null]);
    return user;
  });
  await audit.log(result.id,'Agent Application Submitted',`${data.city}, ${data.country}`,req.ip);
  await dispatchWelcomeEmail(result, data.preferredLanguage, data.country, 'agent', Boolean(data.marketingSubscribed), result.marketing_unsubscribe_token);
  const tokens=issueTokens(result);
  const profile=await fetchProfile(result.id,result.role);
  res.status(201).json({user:publicUser(result,profile),...tokens,agreementRequired:true});
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
      `INSERT INTO users (email, phone, password_hash, role, full_name, preferred_language, is_verified, business_verification_status, vtg_user_id, marketing_subscribed, marketing_unsubscribe_token)
       VALUES ($1,$2,$3,'bank',$4,$5,TRUE,'pending',$6,$7,$8) RETURNING *`,
      [data.email, data.phone || null, passwordHash, data.fullName, data.preferredLanguage, createVtgUserId(data.country,'bank'), Boolean(data.marketingSubscribed), createUnsubscribeToken()]
    );
    const user = userRes.rows[0];

    await client.query(
      `INSERT INTO bank_profiles (user_id, bank_name, swift_code, branch, officer_name, officer_title, country, institution_type, regulator, license_number, work_email, vtg_services, regulatory_status, markets_served)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [user.id, data.bankName, data.swiftCode || null, data.branch || null, data.fullName, data.officerTitle || null, data.country || 'Nigeria', data.institutionType || null, data.regulator || null, data.licenseNumber || null, data.workEmail || data.email, data.vtgServices, data.regulatoryStatus, data.marketsServed]
    );

    return user;
  });

  await audit.log(result.id, 'Account Created', 'Bank officer account created', req.ip);
  await dispatchWelcomeEmail(result, data.preferredLanguage, data.country, 'bank', Boolean(data.marketingSubscribed), result.marketing_unsubscribe_token);
  const tokens = issueTokens(result);
  const profile = await fetchProfile(result.id, result.role);
  res.status(201).json({ user: publicUser(result, profile), ...tokens, agreementRequired: true });
});

const sendVerificationCode = asyncHandler(async (req, res) => {
  const schema = z.object({ email: z.string().email(), preferredLanguage: z.string().optional() });
  const { email, preferredLanguage } = schema.parse(req.body);
  const verification = await issueEmailVerificationCode(email, preferredLanguage);
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
  const agreementAccepted = await hasCurrentAgreement(user.id);
  res.json({ user: publicUser(user, profile), ...tokens, agreementRequired: !agreementAccepted });
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
  const agreementAccepted = await hasCurrentAgreement(user.id);
  res.json({ user: publicUser(user, profile), agreementRequired: !agreementAccepted });
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
  acceptAgreement,
  emailPreference,
  issueEmailVerificationCode,
};
