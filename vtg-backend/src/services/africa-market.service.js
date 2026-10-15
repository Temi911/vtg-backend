const MARKETS = Object.freeze([
  {
    countryCode: 'NG',
    country: 'Nigeria',
    region: 'West Africa',
    currency: { code: 'NGN', name: 'Nigerian naira' },
    locales: ['en-NG'],
    timeZone: 'Africa/Lagos',
    marketStatus: 'foundation',
    ports: [
      { name: 'Apapa Port', city: 'Lagos', mode: 'sea' },
      { name: 'Tin Can Island Port', city: 'Lagos', mode: 'sea' },
      { name: 'Lekki Deep Sea Port', city: 'Lagos', mode: 'sea' },
      { name: 'Onne Port', city: 'Onne', mode: 'sea' },
      { name: 'Port of Calabar', city: 'Calabar', mode: 'sea' },
      { name: 'Delta Ports', city: 'Warri area', mode: 'sea' }
    ],
    representativeDirectory: { status: 'not_configured', entries: [] },
    compliance: { status: 'authority_check_required', note: 'Confirm current requirements with the relevant Nigerian authorities and licensed trade professionals.' }
  },
  {
    countryCode: 'GH',
    country: 'Ghana',
    region: 'West Africa',
    currency: { code: 'GHS', name: 'Ghanaian cedi' },
    locales: ['en-GH'],
    timeZone: 'Africa/Accra',
    marketStatus: 'planned',
    ports: [
      { name: 'Port of Tema', city: 'Tema', mode: 'sea' },
      { name: 'Port of Takoradi', city: 'Takoradi', mode: 'sea' }
    ],
    representativeDirectory: { status: 'not_configured', entries: [] },
    compliance: { status: 'authority_check_required', note: 'Country-specific import, product and customs requirements must be confirmed before a transaction.' }
  },
  {
    countryCode: 'KE',
    country: 'Kenya',
    region: 'East Africa',
    currency: { code: 'KES', name: 'Kenyan shilling' },
    locales: ['en-KE', 'sw-KE'],
    timeZone: 'Africa/Nairobi',
    marketStatus: 'planned',
    ports: [
      { name: 'Port of Mombasa', city: 'Mombasa', mode: 'sea' }
    ],
    representativeDirectory: { status: 'not_configured', entries: [] },
    compliance: { status: 'authority_check_required', note: 'Country-specific import, product and customs requirements must be confirmed before a transaction.' }
  },
  {
    countryCode: 'ZA',
    country: 'South Africa',
    region: 'Southern Africa',
    currency: { code: 'ZAR', name: 'South African rand' },
    locales: ['en-ZA'],
    timeZone: 'Africa/Johannesburg',
    marketStatus: 'planned',
    ports: [
      { name: 'Port of Durban', city: 'Durban', mode: 'sea' },
      { name: 'Port of Cape Town', city: 'Cape Town', mode: 'sea' },
      { name: 'Port of Ngqura', city: 'Gqeberha area', mode: 'sea' }
    ],
    representativeDirectory: { status: 'not_configured', entries: [] },
    compliance: { status: 'authority_check_required', note: 'Country-specific import, product and customs requirements must be confirmed before a transaction.' }
  },
  {
    countryCode: 'EG',
    country: 'Egypt',
    region: 'North Africa',
    currency: { code: 'EGP', name: 'Egyptian pound' },
    locales: ['en-EG', 'ar-EG'],
    timeZone: 'Africa/Cairo',
    marketStatus: 'planned',
    ports: [
      { name: 'Port of Alexandria', city: 'Alexandria', mode: 'sea' },
      { name: 'Port Said', city: 'Port Said', mode: 'sea' },
      { name: 'Ain Sokhna Port', city: 'Ain Sokhna', mode: 'sea' }
    ],
    representativeDirectory: { status: 'not_configured', entries: [] },
    compliance: { status: 'authority_check_required', note: 'Country-specific import, product and customs requirements must be confirmed before a transaction.' }
  },
  {
    countryCode: 'MA',
    country: 'Morocco',
    region: 'North Africa',
    currency: { code: 'MAD', name: 'Moroccan dirham' },
    locales: ['fr-MA', 'ar-MA'],
    timeZone: 'Africa/Casablanca',
    marketStatus: 'planned',
    ports: [
      { name: 'Tanger Med Port', city: 'Tangier area', mode: 'sea' },
      { name: 'Port of Casablanca', city: 'Casablanca', mode: 'sea' }
    ],
    representativeDirectory: { status: 'not_configured', entries: [] },
    compliance: { status: 'authority_check_required', note: 'Country-specific import, product and customs requirements must be confirmed before a transaction.' }
  }
]);

function listMarkets() {
  return MARKETS.map(market => ({
    ...market,
    ports: market.ports.map(port => ({ ...port })),
    locales: [...market.locales],
    representativeDirectory: { ...market.representativeDirectory, entries: [] },
    currency: { ...market.currency },
    compliance: { ...market.compliance }
  }));
}

function getMarket(countryCode) {
  if (typeof countryCode !== 'string' || !/^[A-Za-z]{2}$/.test(countryCode.trim())) return null;
  const code = countryCode.trim().toUpperCase();
  const market = MARKETS.find(item => item.countryCode === code);
  return market ? listMarkets().find(item => item.countryCode === code) : null;
}

function getMarketSummary() {
  const markets = listMarkets();
  return {
    generatedAt: new Date().toISOString(),
    status: 'planning_data',
    liveProviderData: false,
    marketCount: markets.length,
    regions: [...new Set(markets.map(market => market.region))],
    markets
  };
}

module.exports = { listMarkets, getMarket, getMarketSummary };
