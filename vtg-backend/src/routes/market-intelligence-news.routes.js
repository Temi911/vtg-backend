'use strict';
const router = require('express').Router();
const { query } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { syncMarketNews } = require('../services/market-intelligence-news.service');

router.get('/news', async (req, res, next) => {
  try {
    const limit = Math.min(40, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
    const topic = String(req.query.topic || '').trim().slice(0, 80);
    const params = [limit];
    let where = "status = 'published'";
    if (topic) { params.push(topic); where += ' AND topic = $2'; }
    const result = await query(
      `SELECT id, title, source_name AS source, source_domain AS domain, source_url AS url,
              published_at AS published, discovered_at AS discovered, topic, relevance_score AS relevance,
              editorial_summary AS summary
       FROM market_intelligence_news WHERE ${where}
       ORDER BY COALESCE(published_at, discovered_at) DESC LIMIT $1`, params);
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ items: result.rows, count: result.rowCount, generatedAt: new Date().toISOString() });
  } catch (err) { next(err); }
});

router.get('/admin/news', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const status = ['pending','published','rejected'].includes(req.query.status) ? req.query.status : 'pending';
    const result = await query(
      `SELECT id,title,source_name AS source,source_domain AS domain,source_url AS url,
              published_at AS published,discovered_at AS discovered,topic,relevance_score AS relevance,
              editorial_summary AS summary,status
       FROM market_intelligence_news WHERE status=$1
       ORDER BY discovered_at DESC LIMIT 100`, [status]);
    res.json({ items: result.rows, count: result.rowCount });
  } catch (err) { next(err); }
});

router.post('/admin/news/:id/moderate', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const status = String(req.body.status || '');
    if (!['published','rejected','pending'].includes(status)) return res.status(400).json({ error: 'status must be published, rejected or pending' });
    const result = await query(
      'UPDATE market_intelligence_news SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING id,status,title',
      [status, req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'News item not found' });
    res.json({ item: result.rows[0] });
  } catch (err) { next(err); }
});

router.post('/admin/news/sync', requireAuth, requireRole('admin'), async (req, res, next) => {
  try { res.json({ ok: true, result: await syncMarketNews() }); }
  catch (err) { next(err); }
});

module.exports = router;
