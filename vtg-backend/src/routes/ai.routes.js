const router = require('express').Router();
const ctrl = require('../controllers/ai.controller');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// AI calls cost real money per request — a tighter limiter than the global one.
const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many assistant requests. Please wait a few minutes.' } },
});

// Public (no-auth) endpoint is more exposed to abuse since there's no
// account behind each request — tighter still, purely by IP.
const publicAiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many assistant requests from this connection. Please wait a few minutes, or sign in for full access.' } },
});

router.post('/chat', requireAuth, aiLimiter, ctrl.chat);
router.post('/public-chat', publicAiLimiter, ctrl.publicChat);

module.exports = router;
