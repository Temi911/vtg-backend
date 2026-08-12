const express = require('express');
const { z } = require('zod');
const { tradeContext } = require('../services/trade.intelligence');
const { calculateLandedCost } = require('../services/landed-cost.service');

const router = express.Router();

const schema = z.object({
  country: z.string().optional(),
  product: z.string().optional(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  currency: z.string().default('USD'),
  origin: z.string().optional(),
  destination: z.string().optional(),
  freight: z.coerce.number().nonnegative().default(0),
  insurance: z.coerce.number().nonnegative().default(0),
  dutyRate: z.coerce.number().min(0).max(1).default(0.2),
  vatRate: z.coerce.number().min(0).max(1).default(0.075),
  otherLevies: z.coerce.number().nonnegative().default(0),
  portCharges: z.coerce.number().nonnegative().default(0),
  clearingFee: z.coerce.number().nonnegative().default(0),
  inlandTransport: z.coerce.number().nonnegative().default(0),
});

router.post('/calculate', async (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const result = await tradeContext(input);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/landed-cost', async (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const result = calculateLandedCost(input);
    res.json({ ...result, generatedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

router.get('/sources/nigeria', async (req, res, next) => {
  try {
    const result = await tradeContext({ country: 'Nigeria', quantity: 1, unitPrice: 0 });
    res.json({ country: 'Nigeria', sources: result.officialSources, exchange: result.officialRateSnapshot });
  } catch (error) {
    next(error);
  }
});

module.exports = router;