const { calculateNigeriaImport } = require('./trade.intelligence');

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function calculateLandedCost(input = {}) {
  const country = String(input.country || input.destination || '').trim().toUpperCase();
  if (country !== 'NG' && country !== 'NIGERIA') {
    return {
      supported: false,
      message: 'A country-specific statutory calculator is not enabled for this destination yet. Do not invent government rates; use an authoritative customs source.'
    };
  }

  const base = calculateNigeriaImport({
    unitPrice: input.unitPrice,
    quantity: input.quantity,
    currency: input.currency || 'USD',
    freight: input.freight || 0,
    insurance: input.insurance || 0,
    dutyRate: input.dutyRate == null ? 0.2 : input.dutyRate,
    vatRate: input.vatRate == null ? 0.075 : input.vatRate
  });

  const portCharges = toNumber(input.portCharges);
  const clearingFee = toNumber(input.clearingFee);
  const inlandTransport = toNumber(input.inlandTransport);
  const otherLevies = toNumber(input.otherLevies);
  const localCharges = portCharges + clearingFee + inlandTransport + otherLevies;

  return {
    supported: true,
    country: 'Nigeria',
    ...base,
    otherLevies,
    portCharges,
    clearingFee,
    inlandTransport,
    localCharges,
    estimatedTotalLandedCost: base.landedBeforeLocalCharges + localCharges,
    chargeClassification: {
      government: ['Customs duty', 'VAT', 'Other government levies when applicable'],
      privateOrService: ['Clearing fee', 'Inland transport', 'Port/service charges where applicable'],
      estimateOnly: true
    }
  };
}

module.exports = { calculateLandedCost };