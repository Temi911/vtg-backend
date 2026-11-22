// Visitor "taste" tools for the public VTG AI. Pure, deterministic, anonymous: no database, no accounts, no model call.
const money = (n) => Math.round(n * 100) / 100;
const num = (v) => { const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(/,/g, '')) : NaN; return Number.isFinite(n) ? n : null; };

function landedCost(a) {
  const goods = num(a.goods_subtotal), ship = a.shipping === '' || a.shipping == null ? 0 : num(a.shipping), ins = a.insurance === '' || a.insurance == null ? 0 : num(a.insurance), pct = a.duty_percent === '' || a.duty_percent == null ? 0 : num(a.duty_percent);
  if (goods === null || goods <= 0 || goods > 1e10) return { error: 'Enter the goods value in USD as a number greater than zero.' };
  if ([ship, ins, pct].some((v) => v === null || v < 0) || pct > 100) return { error: 'Shipping, insurance and duty must be zero or more, and duty at most 100%.' };
  const duty = goods * pct / 100;
  return { title: 'Landed-cost estimate (USD)', lines: [['Goods', money(goods)], ['Freight', money(ship)], ['Insurance', money(ins)], ['Import duty (' + pct + '% of goods)', money(duty)], ['Estimated total', money(goods + ship + ins + duty)]], note: 'An estimate from the figures you typed. Duty, VAT, port and clearing charges vary by product and country, so confirm them with a licensed customs agent.' };
}

const INCOTERMS = {
  EXW: ['Ex Works', 'Seller makes the goods available at its own premises.', 'Buyer arranges loading, export clearance, freight, insurance and import clearance, and carries risk from the seller\'s premises.', 'Lowest price on paper, most work and risk for the buyer.'],
  FCA: ['Free Carrier', 'Seller hands the goods, cleared for export, to the buyer\'s carrier at the agreed place.', 'Buyer pays main freight and insurance; risk passes at the handover.', 'A flexible choice for containers and any mode of transport.'],
  FOB: ['Free On Board (sea only)', 'Seller clears the goods for export and loads them on the vessel at the port of shipment.', 'Buyer pays sea freight and insurance and handles import clearance; risk passes once the goods are on board.', 'Common for sea freight from China and South Korea when the buyer controls shipping.'],
  CFR: ['Cost and Freight (sea only)', 'Seller pays freight to the destination port.', 'Risk still passes to the buyer once the goods are on board at origin; insurance is the buyer\'s job.', 'Buyers often forget to insure because the seller paid the freight.'],
  CIF: ['Cost, Insurance and Freight (sea only)', 'Seller pays freight and buys minimum insurance cover to the destination port.', 'Risk passes to the buyer once the goods are on board at origin; buyer handles import clearance.', 'The minimum cover is basic; many buyers add their own.'],
  CIP: ['Carriage and Insurance Paid', 'Seller pays carriage and insurance to the named destination.', 'Risk passes when the goods are handed to the first carrier; buyer handles import clearance.', 'Like CIF but for any mode of transport.'],
  DAP: ['Delivered at Place', 'Seller delivers the goods, ready for unloading, at the named destination.', 'Seller bears risk until then; buyer handles import clearance and pays duties.', 'Gives the buyer a delivered price while keeping duty with the buyer.'],
  DDP: ['Delivered Duty Paid', 'Seller delivers the goods cleared for import and pays duties and taxes.', 'Buyer only receives the goods.', 'Maximum seller obligation; check who is the legal importer so that clearance works.'],
};
function incoterm(a) {
  const code = String(a.code || '').toUpperCase().trim();
  const row = INCOTERMS[code];
  if (!row) return { error: 'Choose one of: ' + Object.keys(INCOTERMS).join(', ') + '.' };
  return { title: code + ' · ' + row[0], lines: [['Seller', row[1]], ['Buyer and risk', row[2]], ['Good to know', row[3]]], note: 'Based on Incoterms 2020 in plain language. Always state the rule and named place in the contract.' };
}

const BASE_DOCS = ['Commercial invoice', 'Packing list', 'Bill of lading or air waybill', 'Certificate of origin when the buyer or customs requires it', 'Insurance certificate when insurance is arranged by the seller'];
const COUNTRY_DOCS = {
  Nigeria: ['Form M registered through an authorised dealer bank before shipment', 'Pre-Arrival Assessment Report (PAAR) for customs clearance', 'Conformity or inspection certificates and permits for regulated goods'],
  Ghana: ['Import declaration lodged on the customs platform by a licensed clearing agent', 'Permits or standards approvals for regulated goods'],
  Kenya: ['Import Declaration Form (IDF) through the national trade single window', 'Pre-export verification of conformity for listed goods', 'Permits for regulated goods'],
  'South Africa': ['Customs declaration lodged with SARS by the importer or agent', 'Import permits for controlled goods'],
};
function importChecklist(a) {
  const country = Object.keys(COUNTRY_DOCS).find((c) => c.toLowerCase() === String(a.country || '').toLowerCase().trim());
  if (!country) return { error: 'Choose one of: ' + Object.keys(COUNTRY_DOCS).join(', ') + '.' };
  return { title: 'Typical import documents: ' + country, lines: BASE_DOCS.map((d) => ['Core', d]).concat(COUNTRY_DOCS[country].map((d) => [country, d])), note: 'A general starting list, not legal advice. Requirements change by product and over time, so confirm with a licensed customs agent or the official authority.' };
}

const TOOLS = { landed_cost: landedCost, incoterm, import_checklist: importChecklist };
module.exports = { TOOLS, landedCost, incoterm, importChecklist, INCOTERMS, COUNTRY_DOCS };
