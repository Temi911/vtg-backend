const axios = require('axios');

const NCS_HS_LIBRARY = 'https://cet.customs.gov.ng/hs-code-library';
const NCS_HOME = 'https://customs.gov.ng/';

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCountry(country) {
  return String(country || '').trim().toUpperCase();
}

async function getNigeriaRates() {
  const response = await axios.get(NCS_HOME, { timeout: 8000 });
  const html = String(response.data || '');
  const rates = {};
  const currencies = [
    ['USD', /USD[^\d]{0,100}NGN([\d,.]+)/i],
    ['CNY', /CNY[^\d]{0,100}NGN([\d,.]+)/i],
    ['EUR', /EUR[^\d]{0,100}NGN([\d,.]+)/i],
    ['GBP', /GBP[^\d]{0,100}NGN([\d,.]+)/i],
    ['JPY', /JPY[^\d]{0,100}NGN([\d,.]+)/i],
  ];
  for (const [code, pattern] of currencies) {
    const match = html.match(pattern);
    if (match) rates[code] = toNumber(match[1].replace(/,/g, ''));
  }
  return { source: NCS_HOME, rates, retrievedAt: new Date().toISOString() };
}

function calculateNigeriaImport({ unitPrice, quantity, currency = 'USD', freight = 0, insurance = 0, dutyRate = 0.2, vatRate = 0.075 }) {
  const productValue = toNumber(unitPrice) * toNumber(quantity);
  const cif = productValue + toNumber(freight) + toNumber(insurance);
  const duty = cif * toNumber(dutyRate);
  const vatBase = cif + duty;
  const vat = vatBase * toNumber(vatRate);
  return {
    currency,
    quantity: toNumber(quantity),
    productValue,
    freight: toNumber(freight),
    insurance: toNumber(insurance),
    cif,
    dutyRate: toNumber(dutyRate),
    duty,
    vatRate: toNumber(vatRate),
    vat,
    customsTaxes: duty + vat,
    landedBeforeLocalCharges: cif + duty + vat,
    methodology: 'Illustrative calculation. Final classification, customs valuation and statutory assessment remain subject to the competent customs authority.',
    source: NCS_HS_LIBRARY,
  };
}

async function tradeContext({ country, product, quantity, unitPrice, currency, origin, destination, freight, insurance, dutyRate }) {
  const normalized = normalizeCountry(country || destination);
  if (normalized === 'NG' || normalized === 'NIGERIA') {
    let rates = {};
    try { rates = await getNigeriaRates(); } catch (_) {}
    const calc = calculateNigeriaImport({ unitPrice, quantity, currency, freight, insurance, dutyRate });
    return {
      country: 'Nigeria',
      product,
      origin,
      destination,
      calculator: calc,
      officialRateSnapshot: rates,
      officialSources: [NCS_HS_LIBRARY, NCS_HOME],
    };
  }
  return {
    country: country || destination,
    product,
    origin,
    destination,
    calculator: null,
    officialSources: [],
    message: 'No country-specific statutory calculator is enabled yet. Do not invent a tariff or tax rate; request the destination country and use an authoritative customs source.'
  };
}

module.exports = { getNigeriaRates, calculateNigeriaImport, tradeContext };