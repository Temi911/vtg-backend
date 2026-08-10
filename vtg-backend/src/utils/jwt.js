const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (process.env.NODE_ENV === 'production') {
  if (!ACCESS_SECRET || ACCESS_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be set to a random value of at least 32 characters in production.');
  }
  if (!REFRESH_SECRET || REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be set to a random value of at least 32 characters in production.');
  }
}

const EFFECTIVE_ACCESS_SECRET = ACCESS_SECRET || 'dev-only-insecure-secret-change-me';
const EFFECTIVE_REFRESH_SECRET = REFRESH_SECRET || 'dev-only-insecure-refresh-secret-change-me';
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '30d';

function signAccessToken(payload) {
  return jwt.sign(payload, EFFECTIVE_ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, EFFECTIVE_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

function verifyAccessToken(token) {
  return jwt.verify(token, EFFECTIVE_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, EFFECTIVE_REFRESH_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
