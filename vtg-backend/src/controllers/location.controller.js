const { z } = require('zod');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const locationSchema = z.object({
  text: z.string().min(2).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const shareLocation = asyncHandler(async (req, res) => {
  const data = locationSchema.parse(req.body);

  await query(
    `UPDATE users
     SET location_text = $1,
         location_lat = $2,
         location_lng = $3,
         updated_at = now()
     WHERE id = $4`,
    [data.text || null, data.lat ?? null, data.lng ?? null, req.user.id]
  );

  res.json({ message: 'Location updated', location: data });
});

const getLocation = asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, full_name, role, location_text, location_lat, location_lng FROM users WHERE id = $1',
    [req.user.id]
  );

  if (!rows[0]) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  res.json({ location: rows[0] });
});

module.exports = { shareLocation, getLocation };
