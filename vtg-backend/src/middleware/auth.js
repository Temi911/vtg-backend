const { verifyAccessToken } = require('../utils/jwt');
const { AppError } = require('../utils/AppError');
const { query } = require('../config/db');
const CURRENT_AGREEMENT_VERSION = '2026-09-01';

/**
 * Requires a valid `Authorization: Bearer <token>` header.
 * Attaches { id, role, email } to req.user.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Missing or invalid Authorization header', 401, 'UNAUTHENTICATED'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // { id, role, email }
    if (req.path === '/me' || req.path === '/agreements/accept') return next();
    const agreement = await query('SELECT 1 FROM user_agreements WHERE user_id=$1 AND agreement_version=$2 LIMIT 1', [payload.id, CURRENT_AGREEMENT_VERSION]);
    if (!agreement.rows[0]) {
      return next(new AppError('Please review and accept the VTG Privacy Policy and Signup Agreement before entering your workspace.', 403, 'AGREEMENT_REQUIRED'));
    }
    return next();
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401, 'UNAUTHENTICATED'));
  }
}

/**
 * Restricts a route to one or more roles. Must run after requireAuth.
 * @param  {...string} roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Unauthenticated', 401, 'UNAUTHENTICATED'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have access to this resource', 403, 'FORBIDDEN'));
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
