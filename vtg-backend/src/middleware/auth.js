const { verifyAccessToken } = require('../utils/jwt');
const { AppError } = require('../utils/AppError');

/**
 * Requires a valid `Authorization: Bearer <token>` header.
 * Attaches { id, role, email } to req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Missing or invalid Authorization header', 401, 'UNAUTHENTICATED'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // { id, role, email }
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
