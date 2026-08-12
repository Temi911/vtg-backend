const crypto = require('crypto');
const multer = require('multer');
const { z } = require('zod');
const { query } = require('../config/db');
const { putObject } = require('../storage/object-storage');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const linkSchema = z.object({
  label: z.string().min(1).max(120),
  url: z.string().url(),
  linkType: z.string().max(40).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype);
    cb(ok ? null : new AppError('Please upload a JPG, PNG, WEBP or GIF image.', 400, 'INVALID_PROFILE_IMAGE'), ok);
  },
});

function publicMediaUrl(key) {
  const base = (process.env.PUBLIC_MEDIA_BASE_URL || '').replace(/\/$/, '');
  return base ? `${base}/${key}` : key;
}

async function saveProfileImage(file, folder) {
  const ext = (file.originalname.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const key = `vtg/${folder}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
  await putObject({ key, buffer: file.buffer, contentType: file.mimetype });
  return publicMediaUrl(key);
}

const getMine = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM storefronts WHERE owner_id=$1', [req.user.id]);
  if (!rows[0]) return res.json({ storefront: null, products: [], media: [], links: [] });
  const s = rows[0];
  const [products, media, links] = await Promise.all([
    query('SELECT * FROM products WHERE supplier_id=$1 ORDER BY created_at DESC', [req.user.id]),
    query('SELECT * FROM company_media WHERE storefront_id=$1 ORDER BY sort_order, created_at DESC', [s.id]),
    query('SELECT * FROM storefront_links WHERE storefront_id=$1 ORDER BY sort_order', [s.id]),
  ]);
  res.json({ storefront: s, products: products.rows, media: media.rows, links: links.rows });
});

const addLink = asyncHandler(async (req, res) => {
  const d = linkSchema.parse(req.body);
  const s = await query('SELECT id FROM storefronts WHERE id=$1 AND owner_id=$2', [req.params.storefrontId, req.user.id]);
  if (!s.rows[0]) throw new AppError('Storefront not found or not owned by you.', 404);
  const { rows } = await query('INSERT INTO storefront_links(storefront_id,label,url,link_type,sort_order) VALUES($1,$2,$3,$4,$5) RETURNING *', [req.params.storefrontId,d.label,d.url,d.linkType||'website',d.sortOrder||0]);
  res.status(201).json({ link: rows[0] });
});

const removeLink = asyncHandler(async (req, res) => {
  const { rows } = await query(`DELETE FROM storefront_links sl USING storefronts s WHERE sl.id=$1 AND sl.storefront_id=s.id AND s.owner_id=$2 RETURNING sl.id`, [req.params.linkId, req.user.id]);
  if (!rows[0]) throw new AppError('Link not found.', 404);
  res.status(204).send();
});

const updateStorefront = asyncHandler(async (req, res) => {
  const d = z.object({displayName:z.string().min(2).max(180).optional(),tagline:z.string().max(180).optional(),description:z.string().max(5000).optional(),websiteUrl:z.string().url().optional(),companyEmail:z.string().email().optional(),companyPhone:z.string().max(40).optional(),address:z.string().max(300).optional(),city:z.string().max(100).optional(),state:z.string().max(100).optional(),country:z.string().max(100).optional(),latitude:z.number().min(-90).max(90).optional(),longitude:z.number().min(-180).max(180).optional(),logoUrl:z.string().url().optional(),coverImageUrl:z.string().url().optional()}).parse(req.body);
  const { rows } = await query(`UPDATE storefronts SET display_name=COALESCE($1,display_name),tagline=COALESCE($2,tagline),description=COALESCE($3,description),website_url=COALESCE($4,website_url),company_email=COALESCE($5,company_email),company_phone=COALESCE($6,company_phone),address=COALESCE($7,address),city=COALESCE($8,city),state=COALESCE($9,state),country=COALESCE($10,country),latitude=COALESCE($11,latitude),longitude=COALESCE($12,longitude),logo_url=COALESCE($13,logo_url),cover_image_url=COALESCE($14,cover_image_url),updated_at=now() WHERE id=$15 AND owner_id=$16 RETURNING *`, [d.displayName,d.tagline,d.description,d.websiteUrl,d.companyEmail,d.companyPhone,d.address,d.city,d.state,d.country,d.latitude,d.longitude,d.logoUrl,d.coverImageUrl,req.params.storefrontId,req.user.id]);
  if (!rows[0]) throw new AppError('Storefront not found.',404);
  res.json({ storefront: rows[0] });
});

const profileMe = asyncHandler(async (req, res) => {
  const u = await query('SELECT id,email,role,full_name,profile_image_url,profile_image_alt,location_text,location_lat,location_lng,is_verified FROM users WHERE id=$1', [req.user.id]);
  if (!u.rows[0]) throw new AppError('Profile not found.', 404);
  const user = u.rows[0];
  let profile = null;
  if (user.role === 'buyer') profile = (await query('SELECT * FROM buyer_profiles WHERE user_id=$1', [user.id])).rows[0] || null;
  if (user.role === 'supplier') profile = (await query('SELECT * FROM supplier_profiles WHERE user_id=$1', [user.id])).rows[0] || null;
  if (user.role === 'bank') profile = (await query('SELECT * FROM bank_profiles WHERE user_id=$1', [user.id])).rows[0] || null;
  res.json({ user: { id:user.id,email:user.email,role:user.role,fullName:user.full_name,profileImageUrl:user.profile_image_url||null,profileImageAlt:user.profile_image_alt||null,locationText:user.location_text||null,locationLat:user.location_lat||null,locationLng:user.location_lng||null,isVerified:user.is_verified }, profile });
});

const uploadProfileImage = [imageUpload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Profile image is required.', 400, 'PROFILE_IMAGE_REQUIRED');
  const url = await saveProfileImage(req.file, `profiles/${req.user.id}`);
  const { rows } = await query('UPDATE users SET profile_image_url=$1,profile_image_alt=$2,updated_at=now() WHERE id=$3 RETURNING profile_image_url,profile_image_alt', [url, req.body.altText || 'VTG member profile image', req.user.id]);
  res.json({ profileImageUrl:rows[0].profile_image_url, profileImageAlt:rows[0].profile_image_alt });
})];

const uploadOrganisationLogo = [imageUpload.single('image'), asyncHandler(async (req, res) => {
  if (!['supplier','bank'].includes(req.user.role)) throw new AppError('Organisation logo access required.',403,'FORBIDDEN');
  if (!req.file) throw new AppError('Organisation logo is required.',400,'LOGO_REQUIRED');
  const url = await saveProfileImage(req.file, `${req.user.role}-logos/${req.user.id}`);
  if (req.user.role === 'supplier') {
    const { rows } = await query('UPDATE supplier_profiles SET company_logo_url=$1,company_logo_alt=$2 WHERE user_id=$3 RETURNING company_logo_url,company_logo_alt', [url, req.body.altText || 'Company logo', req.user.id]);
    if (!rows[0]) throw new AppError('Supplier profile not found.',404);
    return res.json({ logoUrl:rows[0].company_logo_url,logoAlt:rows[0].company_logo_alt,logoType:'company' });
  }
  const { rows } = await query('UPDATE bank_profiles SET institution_logo_url=$1,institution_logo_alt=$2 WHERE user_id=$3 RETURNING institution_logo_url,institution_logo_alt', [url, req.body.altText || 'Bank logo', req.user.id]);
  if (!rows[0]) throw new AppError('Bank profile not found.',404);
  res.json({ logoUrl:rows[0].institution_logo_url,logoAlt:rows[0].institution_logo_alt,logoType:'institution' });
})];

const publicProfile = asyncHandler(async (req, res) => {
  const u = await query('SELECT id,email,role,full_name,profile_image_url,profile_image_alt,location_text,location_lat,location_lng,is_verified FROM users WHERE id=$1', [req.params.userId]);
  if (!u.rows[0]) throw new AppError('Profile not found.',404);
  const user=u.rows[0];
  let p=null;
  if(user.role==='buyer')p=(await query('SELECT * FROM buyer_profiles WHERE user_id=$1',[user.id])).rows[0]||null;
  if(user.role==='supplier')p=(await query('SELECT * FROM supplier_profiles WHERE user_id=$1',[user.id])).rows[0]||null;
  if(user.role==='bank')p=(await query('SELECT * FROM bank_profiles WHERE user_id=$1',[user.id])).rows[0]||null;
  res.json({profile:{id:user.id,role:user.role,fullName:user.full_name,email:user.email,profileImageUrl:user.profile_image_url||null,profileImageAlt:user.profile_image_alt||null,locationText:user.location_text||null,locationLat:user.location_lat||null,locationLng:user.location_lng||null,companyName:p?.company_name||null,companyLogoUrl:p?.company_logo_url||p?.institution_logo_url||null,bankName:p?.bank_name||null,branch:p?.branch||null,country:p?.country||null,city:p?.city||null,verified:Boolean(user.is_verified||p?.verified_supplier)}});
});

module.exports = { getMine, addLink, removeLink, updateStorefront, profileMe, uploadProfileImage, uploadOrganisationLogo, publicProfile };
