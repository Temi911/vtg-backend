const crypto = require('crypto');
const multer = require('multer');
const { query } = require('../config/db');
const { putObject } = require('../storage/object-storage');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype);
    cb(allowed ? null : new AppError('Please upload a JPG, PNG, WEBP or GIF image.', 400, 'INVALID_PROFILE_IMAGE'), allowed);
  },
});

function mediaUrl(key) {
  const base = (process.env.PUBLIC_MEDIA_BASE_URL || '').replace(/\/$/, '');
  return base ? `${base}/${key}` : key;
}

async function saveImage(file, folder) {
  const ext = (file.originalname.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const key = `vtg/${folder}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  await putObject({ key, buffer: file.buffer, contentType: file.mimetype });
  return mediaUrl(key);
}

async function getProfile(userId) {
  const userResult = await query(`SELECT id,email,role,full_name,profile_image_url,profile_image_alt,location_text,location_lat,location_lng FROM users WHERE id=$1`, [userId]);
  if (!userResult.rows[0]) throw new AppError('Profile not found.', 404, 'PROFILE_NOT_FOUND');
  const user = userResult.rows[0];
  let profile = null;
  if (user.role === 'supplier') {
    const r = await query('SELECT * FROM supplier_profiles WHERE user_id=$1', [userId]);
    profile = r.rows[0] || null;
  } else if (user.role === 'bank') {
    const r = await query('SELECT * FROM bank_profiles WHERE user_id=$1', [userId]);
    profile = r.rows[0] || null;
  } else if (user.role === 'buyer') {
    const r = await query('SELECT * FROM buyer_profiles WHERE user_id=$1', [userId]);
    profile = r.rows[0] || null;
  }
  return { user, profile };
}

const me = asyncHandler(async (req, res) => {
  const { user, profile } = await getProfile(req.user.id);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      profileImageUrl: user.profile_image_url || null,
      profileImageAlt: user.profile_image_alt || null,
      locationText: user.location_text || null,
      locationLat: user.location_lat || null,
      locationLng: user.location_lng || null,
    },
    profile: profile ? {
      ...profile,
      companyLogoUrl: profile.company_logo_url || null,
      institutionLogoUrl: profile.institution_logo_url || null,
    } : null,
  });
});

const updateImage = [upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Profile image is required.', 400, 'PROFILE_IMAGE_REQUIRED');
  const url = await saveImage(req.file, `profiles/${req.user.id}`);
  const { rows } = await query('UPDATE users SET profile_image_url=$1, profile_image_alt=$2, updated_at=now() WHERE id=$3 RETURNING id,profile_image_url,profile_image_alt', [url, req.body.altText || 'VTG profile image', req.user.id]);
  res.json({ profileImageUrl: rows[0].profile_image_url, profileImageAlt: rows[0].profile_image_alt });
})];

const updateOrganisationLogo = [upload.single('image'), asyncHandler(async (req, res) => {
  if (!['supplier', 'bank'].includes(req.user.role)) throw new AppError('Organisation logo access required.', 403, 'FORBIDDEN');
  if (!req.file) throw new AppError('Organisation logo is required.', 400, 'LOGO_REQUIRED');
  const url = await saveImage(req.file, `${req.user.role}-logos/${req.user.id}`);
  if (req.user.role === 'supplier') {
    const { rows } = await query('UPDATE supplier_profiles SET company_logo_url=$1, company_logo_alt=$2 WHERE user_id=$3 RETURNING company_logo_url,company_logo_alt', [url, req.body.altText || 'Company logo', req.user.id]);
    if (!rows[0]) throw new AppError('Supplier profile not found.', 404);
    return res.json({ logoUrl: rows[0].company_logo_url, logoAlt: rows[0].company_logo_alt, logoType: 'company' });
  }
  const { rows } = await query('UPDATE bank_profiles SET institution_logo_url=$1, institution_logo_alt=$2 WHERE user_id=$3 RETURNING institution_logo_url,institution_logo_alt', [url, req.body.altText || 'Bank logo', req.user.id]);
  if (!rows[0]) throw new AppError('Bank profile not found.', 404);
  res.json({ logoUrl: rows[0].institution_logo_url, logoAlt: rows[0].institution_logo_alt, logoType: 'institution' });
})];

const publicProfile = asyncHandler(async (req, res) => {
  const { user, profile } = await getProfile(req.params.userId);
  res.json({
    profile: {
      id: user.id,
      role: user.role,
      fullName: user.full_name,
      email: user.email,
      profileImageUrl: user.profile_image_url || null,
      profileImageAlt: user.profile_image_alt || null,
      locationText: user.location_text || null,
      locationLat: user.location_lat || null,
      locationLng: user.location_lng || null,
      companyName: profile?.company_name || null,
      companyLogoUrl: profile?.company_logo_url || profile?.institution_logo_url || null,
      bankName: profile?.bank_name || null,
      branch: profile?.branch || null,
      country: profile?.country || null,
      city: profile?.city || null,
      verified: Boolean(user.is_verified || profile?.verified_supplier),
    },
  });
});

module.exports = { me, updateImage, updateOrganisationLogo, publicProfile };
