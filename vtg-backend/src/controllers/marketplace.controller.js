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
    [req.user.¶»§q«^