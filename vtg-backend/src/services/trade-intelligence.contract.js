'use strict';

const { z } = require('zod');

const sourceSchema = z.object({
  name: z.string().trim().min(1).max(160),
  url: z.string().url().optional(),
  authority: z.enum(['official', 'licensed_provider', 'carrier', 'user_supplied', 'internal', 'secondary']),
  publishedAt: z.string().datetime().optional(),
  retrievedAt: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

const recordSchema = z.object({
  schemaVersion: z.literal('1.0'),
  kind: z.enum(['fx_rate', 'tariff_rule', 'country_rule', 'freight_quote', 'market_signal', 'landed_cost']),
  status: z.enum(['live', 'indicative', 'demo', 'unavailable']),
  title: z.string().trim().min(1).max(240),
  summary: z.string().max(4000).optional(),
  originCountry: z.string().trim().min(2).max(100).optional(),
  destinationCountry: z.string().trim().min(2).max(100).optional(),
  hsCode: z.string().trim().max(20).optional(),
  currency: z.string().trim().length(3).transform((v) => v.toUpperCase()).optional(),
  value: z.number().finite().optional(),
  unit: z.string().trim().max(40).optional(),
  source: sourceSchema,
  assumptions: z.array(z.string().trim().min(1).max(500)).default([]),
  limitations: z.array(z.string().trim().min(1).max(500)).default([]),
  nextVerification: z.string().trim().max(500).optional(),
}).superRefine((record, ctx) => {
  if (record.status === 'live' && !record.source.retrievedAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['source', 'retrievedAt'], message: 'Live records require a retrieval timestamp.' });
  }
  if (record.kind === 'fx_rate' && (record.value === undefined || !record.currency)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'FX records require a numeric value and currency.' });
  }
});

function normalizeRecord(input) {
  const record = recordSchema.parse(input);
  const now = Date.now();
  const retrieved = record.source.retrievedAt ? Date.parse(record.source.retrievedAt) : NaN;
  const expiry = record.source.validUntil ? Date.parse(record.source.validUntil) : NaN;
  let freshness = 'unknown';
  const futureRetrieval = Number.isFinite(retrieved) && retrieved > now + 5 * 60 * 1000;
  const expiryBeforeRetrieval = Number.isFinite(expiry) && Number.isFinite(retrieved) && expiry < retrieved;
  if (futureRetrieval || expiryBeforeRetrieval) {
    freshness = 'unknown';
  } else if (Number.isFinite(expiry)) {
    freshness = expiry < now ? 'stale' : 'current';
  } else if (Number.isFinite(retrieved)) {
    const age = now - retrieved;
    freshness = age > 24 * 60 * 60 * 1000 ? 'stale' : 'recent';
  }
  return {
    ...record,
    freshness,
    isDecisionReady: record.status === 'live' && freshness === 'current' && record.source.authority === 'official',
  };
}

const landedCostInputSchema = z.object({
  currency: z.string().trim().length(3).transform((v) => v.toUpperCase()),
  goodsValue: z.number().finite().nonnegative(),
  freight: z.number().finite().nonnegative().default(0),
  insurance: z.number().finite().nonnegative().default(0),
  dutyRate: z.number().finite().min(0).max(1),
  vatRate: z.number().finite().min(0).max(1).default(0),
  vatBasis: z.enum(['cif', 'cif_plus_duty']).default('cif_plus_duty'),
  otherCharges: z.number().finite().nonnegative().default(0),
  source: sourceSchema.optional(),
  assumptions: z.array(z.string().trim().min(1).max(500)).default([]),
});

function calculateIndicativeLandedCost(input) {
  const d = landedCostInputSchema.parse(input);
  const cif = round(d.goodsValue + d.freight + d.insurance);
  const duty = round(cif * d.dutyRate);
  const vatBase = d.vatBasis === 'cif' ? cif : cif + duty;
  const vat = round(vatBase * d.vatRate);
  const total = round(cif + duty + vat + d.otherCharges);
  return {
    schemaVersion: '1.0',
    kind: 'landed_cost',
    status: 'indicative',
    currency: d.currency,
    components: { goods: round(d.goodsValue), freight: round(d.freight), insurance: round(d.insurance), cif, duty, vat, otherCharges: round(d.otherCharges) },
    rates: { dutyRate: d.dutyRate, vatRate: d.vatRate, vatBasis: d.vatBasis },
    estimatedTotal: total,
    source: d.source || null,
    assumptions: [...d.assumptions, 'Duty and VAT rates are treated as supplied inputs; this calculator does not determine legally applicable tariff rates.', 'Does not include charges not entered by the user, such as port, inspection, agency, bank, storage, demurrage or inland delivery fees.'],
    limitations: ['Indicative planning estimate only; not a customs valuation, binding tariff ruling, tax advice, freight offer or payment instruction.', 'Confirm the HS classification, customs valuation basis, exemptions, levies, VAT base and applicable rates with the relevant customs authority or licensed clearing agent.'],
  };
}

function round(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }

module.exports = { recordSchema, normalizeRecord, calculateIndicativeLandedCost };
