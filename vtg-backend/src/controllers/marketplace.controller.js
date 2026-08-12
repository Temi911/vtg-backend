const { z } = require('zod');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const storefrontSchema = z.object({
  slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(2),
  tagline: z.string().max(180).optional(),
  description: z.string().max(5000).optional(),
  websiteUrl: z.string().url().optional(),
  companyEmail: z.string().email().optional(),
  companyPhone: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
});

const createStorefront = asyncHandler(async (req, res) => {
  if (!['supplier', 'bank'].includes(req.user.role)) throw new AppError('Only suppliers and banks can create public organisation pages.', 403, 'FORBIDDEN');
  const d = storefrontSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO storefronts (owner_id, slug, display_name, tagline, description, website_url, company_email, company_phone, address, city, state, country, latitude, longitude, logo_url, cover_image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
    [req.user.id,d.slug,d.displayName,d.tagline||null,d.description||null,d.websiteUrl||null,d.companyEmail||null,d.companyPhone||null,d.address||null,d.city||null,d.state||null,d.country||null,d.latitude??null,d.longitude??null,d.logoUrl||null,d.coverImageUrl||null]
  );
  res.status(201).json({ storefront: rows[0] });
});

const getStorefront = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT s.*, u.role, u.is_verified, sp.verified_supplier, sp.rating
       FROM storefronts s JOIN users u ON u.id=s.owner_id
       LEFT JOIN supplier_profiles sp ON sp.user_id=s.owner_id
      WHERE s.slug=$1 AND s.is_published=TRUE`, [req.params.slug]
  );
  if (!rows[0]) throw new AppError('Storefront not found', 404);
  const products = await query('SELECT * FROM products WHERE storefront_id=$1 AND is_active=TRUE ORDER BY created_at DESC', [rows[0].id]);
  const media = await query('SELECT * FROM company_media WHERE storefront_id=$1 ORDER BY sort_order, created_at DESC', [rows[0].id]);
  const links = await query('SELECT * FROM storefront_links WHERE storefront_id=$1 ORDER BY sort_order', [rows[0].id]);
  res.json({ storefront: rows[0], products: products.rows, media: media.rows, links: links.rows });
});

const publishStorefront = asyncHandler(async (req, res) => {
  const { rows } = await query('UPDATE storefronts SET is_published=TRUE, updated_at=now() WHERE owner_id=$1 RETURNING *', [req.user.id]);
  if (!rows[0]) throw new AppError('Create a storefront first', 404);
  res.json({ storefront: rows[0] });
});

const listFeed = asyncHandler(async (req, res) => {
  const country = String(req.query.country || '').trim() || null;
  const limit = Math.min(Number(req.query.limit || 30), 60);
  const params = country ? [country, limit] : [limit];
  const where = country ? 'WHERE f.is_published=TRUE AND (f.country_code=$1 OR f.country_code IS NULL)' : 'WHERE f.is_published=TRUE';
  const sql = `SELECT f.*, u.full_name, u.role, s.display_name AS storefront_name, s.slug AS storefront_slug,
      (SELECT COUNT(*) FROM feed_comments c WHERE c.post_id=f.id) AS comment_count,
      (SELECT COUNT(*) FROM feed_reactions r WHERE r.post_id=f.id) AS reaction_count
      FROM feed_posts f JOIN users u ON u.id=f.author_id
      LEFT JOIN storefronts s ON s.id=f.storefront_id
      ${where} ORDER BY f.created_at DESC LIMIT $${params.length}`;
  const { rows } = await query(sql, params);
  res.json({ posts: rows });
});

const createFeedPost = asyncHandler(async (req, res) => {
  const d = z.object({postType:z.enum(['update','product','advert','news','announcement','trade_tip','video']).default('update'),body:z.string().max(5000).optional(),externalUrl:z.string().url().optional(),countryCode:z.string().max(8).optional(),storefrontId:z.string().uuid().optional()}).parse(req.body);
  if (!d.body && !d.externalUrl) throw new AppError('A post needs text or a link.', 400);
  if (d.storefrontId) {
    const own = await query('SELECT 1 FROM storefronts WHERE id=$1 AND owner_id=$2', [d.storefrontId, req.user.id]);
    if (!own.rows[0]) throw new AppError('You cannot post for this storefront.', 403, 'FORBIDDEN');
  }
  const { rows } = await query('INSERT INTO feed_posts (author_id,storefront_id,post_type,body,external_url,country_code) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [req.user.id,d.storefrontId||null,d.postType,d.body||null,d.externalUrl||null,d.countryCode||null]);
  res.status(201).json({ post: rows[0] });
});

const reactToPost = asyncHandler(async (req, res) => {
  await query('INSERT INTO feed_reactions(post_id,user_id,reaction) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [req.params.postId,req.user.id,String(req.body.reaction||'like')]);
  res.status(201).json({ ok: true });
});

const createEnquiry = asyncHandler(async (req, res) => {
  const d = z.object({supplierId:z.string().uuid().optional(),bankId:z.string().uuid().optional(),productId:z.string().uuid().optional(),subject:z.string().min(2).max(200),message:z.string().min(2).max(5000)}).parse(req.body);
  const reference = `VTG-ENQ-${Date.now().toString(36).toUpperCase()}`;
  const { rows } = await query('INSERT INTO trade_enquiries(reference,buyer_id,supplier_id,bank_id,product_id,subject,message) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *', [reference,req.user.id,d.supplierId||null,d.bankId||null,d.productId||null,d.subject,d.message]);
  res.status(201).json({ enquiry: rows[0] });
});

const listMyEnquiries = asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT e.*, p.name AS product_name, s.display_name AS supplier_name
    FROM trade_enquiries e LEFT JOIN products p ON p.id=e.product_id LEFT JOIN storefronts s ON s.owner_id=e.supplier_id
    WHERE e.buyer_id=$1 OR e.supplier_id=$1 OR e.bank_id=$1 ORDER BY e.created_at DESC`, [req.user.id]);
  res.json({ enquiries: rows });
});

const createSupportTicket = asyncHandler(async (req, res) => {
  const d = z.object({category:z.enum(['general_enquiry','complaint','technical','payment','shipping','customs','verification','supplier','bank','other']),subject:z.string().min(2).max(200),description:z.string().min(2).max(10000),priority:z.enum(['low','normal','high','urgent']).default('normal')}).parse(req.body);
  const reference = `VTG-SUP-${Date.now().toString(36).toUpperCase()}`;
  const { rows } = await query('INSERT INTO support_tickets(reference,opened_by,category,subject,description,priority) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [reference,req.user.id,d.category,d.subject,d.description,d.priority]);
  res.status(201).json({ ticket: rows[0] });
});

const listMyTickets = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM support_tickets WHERE opened_by=$1 ORDER BY created_at DESC', [req.user.id]);
  res.json({ tickets: rows });
});

const createVideoCall = asyncHandler(async (req, res) => {
  const d = z.object({conversationId:z.string().uuid().optional(),enquiryId:z.string().uuid().optional(),scheduledFor:z.string().datetime().optional()}).parse(req.body);
  if (!d.conversationId && !d.enquiryId) throw new AppError('A video call must be linked to a conversation or enquiry.', 400);
  const { rows } = await query('INSERT INTO video_call_sessions(conversation_id,enquiry_id,created_by,scheduled_for) VALUES($1,$2,$3,$4) RETURNING id,status,provider,scheduled_for,created_at', [d.conversationId||null,d.enquiryId||null,req.user.id,d.scheduledFor||null]);
  await query('INSERT INTO video_call_participants(call_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [rows[0].id,req.user.id]);
  res.status(201).json({ call: rows[0] });
});

module.exports = {createStorefront,getStorefront,publishStorefront,listFeed,createFeedPost,reactToPost,createEnquiry,listMyEnquiries,createSupportTicket,listMyTickets,createVideoCall};
