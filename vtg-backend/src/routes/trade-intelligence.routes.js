'use strict';

const router = require('express').Router();
const { z } = require('zod');
const { requireAuth, requireRole } = require('../middleware/auth');
const { calculateIndicativeLandedCost } = require('../services/trade-intelligence.contract');

const estimateInput = z.object({
  currency: z.string().trim().length(3),
  goodsValue: z.number().finite().nonnegative(),
  freight: z.number().finite().nonnegative().optional(),
  insurance: z.number().finite().nonnegative().optional(),
  dutyRate: z.number().finite().min(0).max(1),
  vatRate: z.number().finite().min(0).max(1).optional(),
  vatBasis: z.enum(['cif', 'cif_plus_duty']).optional(),
  otherCharges: z.number().finite().nonnegative().optional(),
  assumptions: z.array(z.string().trim().min(1).max(500)).max(30).optional(),
});

router.get('/contract', requireAuth, requireRole('buyer', 'supplier', 'bank', 'admin'), (req, res) => {
  res.json({
    schemaVersion: '1.0',
    recordKinds: ['fx_rate', 'tariff_rule', 'country_rule', 'freight_quote', 'market_signal', 'landed_cost'],
    statuses: ['live', 'indicative', 'demo', 'unavailable'],
    freshness: ['current', 'recent', 'stale', 'unknown'],
    provenanceRequired: ['source name', 'authority type', 'retrieval timestamp for live records'],
    providers: { tariff: 'not connected by this endpoint', freight: 'not connected by this endpoint', fx: 'use the existing authenticated integrations endpoint and inspect provider status' },
    note: 'Contract discovery only; this response does not claim that live tariff or freight data is available.'
  });
});

router.post('/landed-cost/estimate', requireAuth, requireRole('buyer', 'supplier', 'bank', 'admin'), (req, res, next) => {
  try {
    const input = estimateInput.parse(req.body || {});
    const estimate = calculateIndicativeLandedCost(input);
    res.set('Cache-Control', 'no-store');
    return res.json({ estimate, generatedAt: new Date().toISOString() });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
