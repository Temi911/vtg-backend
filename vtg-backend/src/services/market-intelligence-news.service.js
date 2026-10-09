'use strict';

const { query } = require('../config/db');

const TOPIC_TERMS = [
  ['Nigeria customs', ['nigeria customs','nigerian customs','nigeria import','customs duty nigeria','nigeria tariff','nigeria port']],
  ['Africa–China trade', ['africa china trade','china africa trade','china nigeria trade','china nigeria imports','african imports china']],
  ['Shipping & ports', ['shipping','freight','container','port congestion','port authority','vessel','maritime','cargo','logistics']],
  ['FX & landed cost', ['naira','yuan','renminbi','foreign exchange','exchange rate','currency','freight cost','import cost']],
  ['South Korea trade', ['south korea trade','korea africa trade','korean exports','korean imports','korea nigeria']],
  ['Products & sourcing', ['manufacturing','commodity','supply chain','supplier','sourcing','export ban','trade agreement','tariff','trade policy']]
];

const TRUSTED_DOMAINS = [
  'reuters.com','apnews.com','bbc.com','bbc.co.uk','ft.com','bloomberg.com','aljazeera.com',
  'unctad.org','wto.org','trade.gov','intracen.org','customs.gov.ng','nigerianports.gov.ng',
  'imo.org','worldbank.org','imf.org','afdb.org','ec.europa.eu','gov.uk','gov.cn','gov.kr',
  'punchng.com','premiumtimesng.com','businessday.ng','thecable.ng','nairametrics.com'
];

function clean(value, max = 1200) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function classify(title, domain) {
  const hay = (title + ' ' + domain).toLowerCase();
  let topic = 'Trade & logistics';
  let score = 0;
  for (const [label, terms] of TOPIC_TERMS) {
    const hits = terms.filter(term => hay.includes(term)).length;
    if (hits > score) { score = hits; topic = label; }
  }
  const relevance = Math.min(10, score * 2 + (/(nigeria|africa|china|korea|shipping|port|customs|trade|freight|import|export|tariff)/i.test(hay) ? 2 : 0));
  const trusted = TRUSTED_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));
  return { topic, relevance, trusted };
}
function originalSummary(title, topic) {
  // Keep the publisher's headline and article as the source of truth; this is a short
  // editorial context label, not a reproduction of the article body.
  const context = {
    'Nigeria customs': 'VTG watch: check the original notice and confirm any effective date, tariff code and implementation guidance before acting.',
    'Africa–China trade': 'VTG watch: consider implications for supplier availability, payment terms, documentation and landed cost across the Africa–Asia corridor.',
    'Shipping & ports': 'VTG watch: verify carrier or port details directly before changing a shipment plan, delivery estimate or freight budget.',
    'FX & landed cost': 'VTG watch: confirm the applicable rate and bank charges with your provider before using this information in a landed-cost estimate.',
    'South Korea trade': 'VTG watch: check the original announcement for affected products, origin rules and documentation requirements.',
    'Products & sourcing': 'VTG watch: validate product specifications, supplier credentials and destination-market requirements before placing an order.',
    'Trade & logistics': 'VTG watch: open the original source and verify the facts, date and trade-route relevance before making a commercial decision.'
  };
  return context[topic] || context['Trade & logistics'];
}
function parseGdeltDate(value) {
  if (!value) return null;
  const s = String(value);
  if (/^\d{14}$/.test(s)) return new Date(s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8)+'T'+s.slice(8,10)+':'+s.slice(10,12)+':'+s.slice(12,14)+'Z');
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function fetchGdelt() {
  const terms = '("Africa China trade" OR "Nigeria customs" OR "Nigeria imports" OR "shipping ports" OR "freight logistics" OR "South Korea trade" OR "trade tariffs" OR "supply chain")';
  const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=' + encodeURIComponent(terms) + '&mode=ArtList&format=json&maxrecords=50&sort=HybridRel&timespan=24h';
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'VTG-Market-Intelligence/1.0' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('GDELT returned HTTP ' + response.status);
  const payload = await response.json();
  return (payload.articles || []).map(a => ({
    title: clean(a.title, 500),
    url: clean(a.url, 1800),
    domain: clean(a.domain || '', 255).toLowerCase(),
    source: clean(a.domain || a.sourcecountry || 'External source', 255),
    published: parseGdeltDate(a.seendate),
    provider: 'GDELT'
  })).filter(a => a.title && /^https?:\/\//i.test(a.url));
}

async function fetchGnews() {
  const key = process.env.GNEWS_API_KEY;
  if (!key) return [];
  const q = '(Africa China trade OR Nigeria customs OR shipping ports OR freight logistics OR South Korea trade OR import tariff)';
  const url = 'https://gnews.io/api/v4/search?q=' + encodeURIComponent(q) + '&lang=en&max=10&sortby=publishedAt&apikey=' + encodeURIComponent(key);
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('GNews returned HTTP ' + response.status);
  const payload = await response.json();
  return (payload.articles || []).map(a => ({
    title: clean(a.title, 500),
    url: clean(a.url, 1800),
    domain: clean((a.source && a.source.url || '').replace(/^https?:\/\//, '').split('/')[0], 255).toLowerCase(),
    source: clean(a.source && a.source.name || 'GNews source', 255),
    published: parseGdeltDate(a.publishedAt),
    provider: 'GNews'
  })).filter(a => a.title && /^https?:\/\//i.test(a.url));
}

async function syncMarketNews() {
  const sources = [];
  const errors = [];
  try { sources.push(...await fetchGdelt()); } catch (e) { errors.push('GDELT: ' + clean(e.message, 180)); }
  if (process.env.GNEWS_API_KEY) {
    try { sources.push(...await fetchGnews()); } catch (e) { errors.push('GNews: ' + clean(e.message, 180)); }
  }
  const seen = new Set();
  let inserted = 0, updated = 0, published = 0, pending = 0;
  for (const article of sources) {
    const url = article.url.split('#')[0];
    if (seen.has(url)) continue;
    seen.add(url);
    const { topic, relevance, trusted } = classify(article.title, article.domain);
    if (relevance < 2) continue;
    const status = trusted && relevance >= 5 ? 'published' : 'pending';
    const summary = originalSummary(article.title, topic);
    const result = await query(
      `INSERT INTO market_intelligence_news
       (title, source_name, source_domain, source_url, published_at, topic, relevance_score, editorial_summary, status, provider, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
       ON CONFLICT (source_url) DO UPDATE SET
         title=EXCLUDED.title, source_name=EXCLUDED.source_name, source_domain=EXCLUDED.source_domain,
         published_at=COALESCE(EXCLUDED.published_at, market_intelligence_news.published_at),
         topic=EXCLUDED.topic, relevance_score=EXCLUDED.relevance_score,
         editorial_summary=EXCLUDED.editorial_summary, provider=EXCLUDED.provider, updated_at=NOW()
       RETURNING (xmax = 0) AS was_inserted, status`,
      [article.title, article.source, article.domain, url, article.published, topic, relevance, summary, status, article.provider]
    );
    const row = result.rows[0];
    if (row && row.was_inserted) inserted++; else updated++;
    if (row && row.status === 'published') published++; else pending++;
  }
  await query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('market_news_last_sync', $1::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
    [JSON.stringify({ at: new Date().toISOString(), fetched: sources.length, inserted, updated, published, pending, errors })]
  ).catch(() => {});
  return { fetched: sources.length, inserted, updated, published, pending, errors, ranAt: new Date().toISOString() };
}

module.exports = { syncMarketNews };
