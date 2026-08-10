const { z } = require('zod');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const languageSchema = z.object({
  language: z.enum(['en', 'zh', 'fr', 'es', 'ar', 'ha']),
});

const updateLanguage = asyncHandler(async (req, res) => {
  const { language } = languageSchema.parse(req.body);

  await query(
    'UPDATE users SET preferred_language = $1, updated_at = now() WHERE id = $2',
    [language, req.user.id]
  );

  res.json({ language });
});

const getPreferences = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT preferred_language, location_text, location_lat, location_lng FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  res.json({
    preferences: {
      ...rows[0],
      supportedLanguages: ['en', 'zh', 'fr', 'es', 'ar', 'ha'],
    },
  });
});

module.exports = { updateLanguage, getPreferences };
