const crypto = require('crypto');
const multer = require('multer');
const { putObject } = require('../storage/object-storage');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime)|application\/pdf)$/i.test(file.mimetype);
    cb(allowed ? null : new AppError('Unsupported media type.', 400, 'INVALID_MEDIA_TYPE'), allowed);
  },
});

function mediaUrl(key) {
  const base = (process.env.PUBLIC_MEDIA_BASE_URL || '').replace(/\/$/, '');
  return base ? `${base}/${key}` : key;
}

async function store(file, folder) {
  const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = `vtg/${folder}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
  await putObject({ key, buffer: file.buffer, contentType: file.mimetype });
  return { key, url: mediaUrl(key) };
}

const uploadProductMedia = [upload.single('file'), asyncHandler(async (req, res) => {
  if (req.user.role !== 'supplier') throw new AppError('Supplier access required.', 403, 'FORBIDDEN');
  const product = await query('SELECT id FROM products WHERE id=$1 AND supplier_id=$2', [req.params.productId, req.user.id]);
  if (!product.rows[0]) throw new AppError('Product not found or not owned by you.', 404);
  if (!req.file) throw new AppError('Media file is required.', 400);
  const stored = await store(req.file, `products/${req.params.productId}`);
  const { rows } = await query(`INSERT INTO product_media(product_id,media_type,url,alt_text,sort_order) VALUES($1,$2,$3,$4,COALESCE((SELECT MAX(sort_order)+1 FROM product_media WHERE product_id=$1),0)) RETURNING *`, [req.params.productId, req.file.mimetype.startsWith('video/')?'video':req.file.mimetype==='application/pdf'?'document':'image', stored.url, req.body.altText||null]);
  res.status(201).json({ media: rows[0] });
})];

const uploadCompanyMedia = [upload.single('file'), asyncHandler(async (req, res) => {
  if (!['supplier','bank'].includes(req.user.role)) throw new AppError('Organisation access required.', 403, 'FORBIDDEN');
  const company = await query('SELECT id FROM storefronts WHERE id=$1 AND owner_id=$2', [req.params.storefrontId, req.user.id]);
  if (!company.rows[0]) throw new AppError('Storefront not found or not owned by you.', 404);
  if (!req.file) throw new AppError('Media file is required.', 400);
  const stored = await store(req.file, `storefronts/${req.params.storefrontId}`);
  const type = req.body.mediaType || (req.file.mimetype.startsWith('video/')?'video':req.file.mimetype==='application/pdf'?'document':'image');
  const { rows } = await query(`INSERT INTO company_media(storefront_id,media_type,url,title,description,sort_order) VALUES($1,$2,$3,$4,$5,COALESCE((SELECT MAX(sort_order)+1 FROM company_media WHERE storefront_id=$1),0)) RETURNING *`, [req.params.storefrontId,type,stored.url,req.body.title||null,req.body.description||null]);
  res.status(201).json({ media: rows[0] });
})];

const uploadFeedMedia = [upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Media file is required.', 400);
  const post = await query('SELECT id FROM feed_posts WHERE id=$1 AND author_id=$2', [req.params.postId, req.user.id]);
  if (!post.rows[0]) throw new AppError('Post not found or not owned by you.', 404);
  const stored = await store(req.file, `feed/${req.params.postId}`);
  const { rows } = await query(`INSERT INTO feed_post_media(post_id,media_type,url,thumbnail_url,sort_order) VALUES($1,$2,$3,NULL,COALESCE((SELECT MAX(sort_order)+1 FROM feed_post_media WHERE post_id=$1),0)) RETURNING *`, [req.params.postId, req.file.mimetype.startsWith('video/')?'video':'image',stored.url]);
  res.status(201).json({ media: rows[0] });
})];

module.exports = { uploadProductMedia, uploadCompanyMedia, uploadFeedMedia };
