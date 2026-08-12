const { z } = require('zod');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const linkSchema = z.object({
  label: z.string().min(1).max(120),
  url: z.string().url(),
  linkType: z.string().max(40).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

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

module.exports = { getMine, addLink, removeLink, updateStorefront };
