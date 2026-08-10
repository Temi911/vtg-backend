require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const productsRoutes = require('./routes/products.routes');
const ordersRoutes = require('./routes/orders.routes');
const lcRoutes = require('./routes/lc.routes');
const walletRoutes = require('./routes/wallet.routes');
const paymentsRoutes = require('./routes/payments.routes');
const documentsRoutes = require('./routes/documents.routes');
const shipmentsRoutes = require('./routes/shipments.routes');
const messagesRoutes = require('./routes/messages.routes');
const complianceRoutes = require('./routes/compliance.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const preferencesRoutes = require('./routes/preferences.routes');
const locationRoutes = require('./routes/location.routes');
const communicationsRoutes = require('./routes/communications.routes');
const aiRoutes = require('./routes/ai.routes');
const i18nRoutes = require('./routes/i18n.routes');

const app = express();
const workspaceRoot = path.resolve(__dirname, '..', '..');
const frontendEntry = path.join(workspaceRoot, 'vtg-live-19-DEMO_1.html');

// ── security & parsing ──────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  })
);
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGIN is required in production.');
}

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser/server-to-server requests without an Origin header.
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes('*') && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      return callback(null, allowedOrigins.includes(origin));
    },
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Generous global limiter; auth routes get a stricter one below.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } },
});

// ── health check ─────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── routes ───────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/lc', lcRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/shipments', shipmentsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/communications', communicationsRoutes);
app.use('/api/i18n', i18nRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
  res.sendFile(frontendEntry);
});
app.use(express.static(workspaceRoot, { index: 'vtg-live-19-DEMO_1.html' }));

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`VTG Africa API listening on port ${PORT}`);
  });
}

module.exports = app;
