'use strict';
const { syncMarketNews } = require('../services/market-intelligence-news.service');

let timer = null;
let running = false;
async function runOnce() {
  if (running) return { skipped: true, reason: 'A market-news sync is already running' };
  running = true;
  try {
    const result = await syncMarketNews();
    console.log('[market-news] sync complete', JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('[market-news] sync failed:', error.message);
    return { error: error.message };
  } finally { running = false; }
}
function startMarketNewsJob() {
  if (process.env.MARKET_NEWS_AUTOSYNC === 'false') {
    console.log('[market-news] hourly sync disabled by MARKET_NEWS_AUTOSYNC=false');
    return;
  }
  if (timer) return;
  console.log('[market-news] hourly refresh enabled; using GDELT discovery' + (process.env.GNEWS_API_KEY ? ' + GNews' : ''));
  // Run once at startup, then every hour. GDELT discovery does not require a key.
  setTimeout(() => { runOnce(); }, 12000);
  timer = setInterval(() => { runOnce(); }, 60 * 60 * 1000);
  if (timer.unref) timer.unref();
}
module.exports = { startMarketNewsJob, runOnce };
