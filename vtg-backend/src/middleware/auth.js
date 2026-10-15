const { verifyAccessToken } = require('../utils/jwt');
const { AppError } = require('../utils/AppError');
const { query } = require('../config/db');
const CURRENT_AGREEMENT_VERSION = '2026-09-01';

const DEMO_ACCOUNT_CLAIMS = Object.freeze({
  'demo-buyer': { email: 'buyer@demo.vtg', role: 'buyer' },
  'demo-supplier': { email: 'supplier@demo.vtg', role: 'supplier' },
  'demo-bank': { email: 'bank@demo.vtg', role: 'bank' },
});

function isEnabledDemoPayload(payload) {
  if (String(process.env.ENABLE_DEMO_AUTH || 'false').toLowerCase() !== 'true') return false;
  const expected = DEMO_ACCOUNT_CLAIMS[payload.id];
  return Boolean(expected && expected.email === payload.email && expected.role === payload.role);
}

/**
 * Requires a valid Authorization bearer token tied to an active persisted session.
 * Role and account status are loaded from the database on each request so changes
 * take effect without waiting for the access-token expiry.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Missing or invalid Authorization header', 401, 'UNAUTHENTICATED'));
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401, 'UNAUTHENTICATED'));
  }

  try {
    if (payload.sid && payload.id) {
      const { rows } = await query(
        `SELECT u.id, u.role, u.email, s.id AS session_id
         FROM users u
         JOIN auth_sessions s ON s.user_id=u.id
         WHERE u.id=$1 AND s.id=$2 AND u.is_active=TRUE
           AND s.revoked_at IS NULL AND s.expires_at>NOW()
         LIMIT 1`,
        [payload.id, payload.sid]
      );
      if (!rows[0]) return next(new AppError('Invalid or expired session', 401, 'UNAUTHENTICATED'));
      req.user = { id: rows[0].id, role: rows[0].role, email: rows[0].email, sid: rows[0].session_id };
    } else if (isEnabledDemoPayload(payload)) {
      req.user = { id: payload.id, role: payload.role, email: payload.email, isDemo: true };
    } else {
      return next(new AppError('Invalid or expired session', 401, 'UNAUTHENTICATED'));
    }

    // Demo accounts have no database identity or agreement record.
    if (req.user.isDemo || req.path === '/me' || req.path === '/agreements/accept') return next();

    const agreement = await query(
      'SELECT 1 FROM user_agreements WHERE user_id=$1 AND agreement_version=$2 LIMIT 1',
      [req.user.id, CURRENT_AGREEMENT_VERSION]
    );
    if (!agreement.rows[0]) {
      return next(new AppError('Please review and accept the VTG Privacy Policy and Signup Agreement before entering your workspace.', 403, 'AGREEMENT_REQUIRED'));
    }
    return next();
  } catch (err) {
    return next(err);
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
