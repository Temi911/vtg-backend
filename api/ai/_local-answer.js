// Offline answerer for the public VTG AI: used only when no AI provider can be reached.
// It answers questions about VTG itself from the generated site knowledge. It has no account access and no tools.
const { SITE_KNOWLEDGE } = require('./_site-knowledge.js');
const STOP = new Set('a an the and or of to in on for with is are was were be been it this that what how who why when where do does can could should would i you we my our your me about vtg vintage trade global please tell explain which from at by as if any'.split(' '));
const pages = String(SITE_KNOWLEDGE).split(/\n+/).map((line) => {
  const m = /^(.*?) \((\/[^)]*)\): (.*)$/s.exec(line);
  return m ? { title: m[1].trim(), href: m[2], text: m[3].trim() } : null;
}).filter(Boolean);
function words(s) { return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)); }
function sentences(text) { return String(text).replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter((s) => s.length > 25); }
const VTG_TERMS = /\b(vtg|vintage|marketplace|supplier|suppliers|buyer|buyers|bank|banks|finance|financing|escrow|inspection|inspections|shipment|shipments|shipping|tracking|logistics|letter of credit|lc|sourcing|import|importing|export|china|korea|verification|verified|quote|quotation|rfq|order|orders|wallet|account|sign\s?up|register|category|categories|payment|payments|customs|freight|incoterms?|fees?|pricing|contact|support|partner|partners|agent|agents)\b/i;
const ABOUT = /\b(what is|what's|who is|who are|tell me about|explain|about)\b.{0,25}\b(vtg|vintage|you|this (site|platform|website))\b|\bwhat (do|does) (vtg|vintage|you)\b|\bwho are you\b/i;
function answer(question) {
  if (ABOUT.test(question) || /^\s*(vtg|vintage trade global)\??\s*$/i.test(question)) {
    const home = pages.find((x) => x.href.includes('frontend-v3')) || pages[0], about = pages.find((x) => x.href.includes('about-vintage'));
    const first = (x) => (x ? sentences(x.text).slice(0, 2).join(' ') : '');
    return { reply: 'VTG (Vintage Trade Global) is ' + 'a connected marketplace and trade platform for buyers, suppliers, banks and cross-border trade. ' + first(about) + ' ' + first(home) + '\n\nMore on the About page (/about-vintage.html) and the Home page (/frontend-v3.html).', links: [] };
  }
  if (!VTG_TERMS.test(question)) return null;
  const q = words(question);
  const greet = /^\s*(hi|hello|hey|good (morning|afternoon|evening)|salam|howdy)\b/i.test(question) && q.length < 3;
  if (greet) return { reply: 'Hello! I am VTG AI. Ask me about VTG, how buying, selling, trade finance, inspection or shipment tracking work, or anything about importing from China and South Korea.', links: [] };
  if (!q.length) return null;
  const scored = pages.map((p) => {
    const hay = words(p.title + ' ' + p.text), set = new Set(hay);
    let score = 0; q.forEach((w) => { if (set.has(w)) score += 1 + (p.title.toLowerCase().includes(w) ? 2 : 0); });
    return { p, score };
  }).filter((x) => x.score >= 2).sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const top = scored.slice(0, 2), picked = [];
  const qset = new Set(q);
  top.forEach(({ p }) => sentences(p.text).map((s) => ({ s, k: words(s).filter((w) => qset.has(w)).length })).sort((a, b) => b.k - a.k).slice(0, 2).forEach((x) => { if (x.k > 0 && !picked.includes(x.s)) picked.push(x.s); }));
  if (!picked.length) top.forEach(({ p }) => { const s = sentences(p.text)[0]; if (s) picked.push(s); });
  if (!picked.length) return null;
  const links = top.map(({ p }) => ({ href: p.href, label: p.title.replace(/\s*[—-].*$/, '') }));
  return { reply: picked.join(' ') + '\n\nMore on the ' + links.map((l) => l.label + ' page (' + l.href + ')').join(' and ') + '.', links };
}
module.exports = { answer, pages };
