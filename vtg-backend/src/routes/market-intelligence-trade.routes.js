'use strict';

const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');

const ALLOWED_FLOWS = new Set(['M', 'X']);
const CURRENT_YEAR = new Date().getUTCFullYear();

router.get('/', requireAuth, requireRole('buyer', 'supplier', 'bank'), async (req, res, next) => {
  try {
    const reporterCode = String(req.query.reporterCode || '');
    const flowCode = String(req.query.flowCode || 'M').toUpperCase();
    const period = String(req.query.period || String(CURRENT_YEAR - 2));
    const cmdCode = String(req.query.cmdCode || '');

    if (!/^\d{2,3}$/.test(reporterCode)) {
      return res.status(400).json({ error: 'Choose a valid reporting market.' });
    }
    if (!ALLOWED_FLOWS.has(flowCode)) {
      return res.status(400).json({ error: 'Trade flow must be imports (M) or exports (X).' });
    }
    if (!/^\d{4}$/.test(period) || Number(period) < 2010 || Number(period) > CURRENT_YEAR) {
      return res.status(400).json({ error: 'Choose a valid reporting year.' });
    }
    if (!/^\d{2,6}$/.test(cmdCode)) {
      return res.status(400).json({ error: 'Enter an HS product code between 2 and 6 digits.' });
    }

    const url = new URL('https://comtradeapi.un.org/public/v1/preview/C/A/HS');
    url.searchParams.set('period', period);
    url.searchParams.set('reporterCode', reporterCode);
    url.searchParams.set('cmdCode', cmdCode);
    url.searchParams.set('flowCode', flowCode);
    url.searchParams.set('partnerCode', '0');
    url.searchParams.set('partner2Code', '0');
    url.searchParams.set('motCode', '0');
    url.searchParams.set('aggregateBy', '6');
    url.searchParams.set('breakdownMode', 'classic');
    url.searchParams.set('includeDesc', 'true');

    const upstream = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'VTG-Market-Intelligence/1.0' },
      signal: AbortSignal.timeout(18000)
    });
    if (!upstream.ok) {
      const status = upstream.status === 429 ? 503 : 502;
      return res.status(status).json({
        error: upstream.status === 429
          ? 'The trade-statistics provider is rate-limiting requests. Please try again shortly.'
          : 'The trade-statistics provider is temporarily unavailable.',
        source: 'UN Comtrade',
        providerStatus: upstream.status
      });
    }

    const payload = await upstream.json();
    const records = Array.isArray(payload.data) ? payload.data : [];
    const items = records.slice(0, 100).map((row) => {
      const value = Number(row.primaryValue);
      return {
        reporterCode: row.reporterCode,
        reporter: row.reporterDesc || null,
        partnerCode: row.partnerCode,
        partnerDesc: row.partnerDesc || 'World',
        period: row.period || period,
        flowCode: row.flowCode || flowCode,
        flowDesc: row.flowDesc || (flowCode === 'M' ? 'Imports' : 'Exports'),
        cmdCode: row.cmdCode || cmdCode,
        cmdDesc: row.cmdDesc || null,
        tradeValue: Number.isFinite(value) ? value : null,
        tradeValueFormatted: Number.isFinite(value)
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
          : 'Value unavailable',
        netWgt: row.netWgt == null ? null : Number(row.netWgt),
        qty: row.qty == null ? null : Number(row.qty),
        qtyUnitAbbr: row.qtyUnitAbbr || null
      };
    });

    res.set('Cache-Control', 'public, max-age=900, stale-while-revalidate=3600');
    return res.json({
      source: 'UN Comtrade public preview',
      reporter: items[0]?.reporter || null,
      reporterCode,
      flow: flowCode === 'M' ? 'Imports' : 'Exports',
      period,
      cmdCode,
      count: items.length,
      fetchedAt: new Date().toISOString(),
      items
    });
  } catch (error) {
    if (error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return res.status(504).json({ error: 'The trade-statistics request timed out. Please try again.' });
    }
    return next(error);
  }
});

module.exports = router;
