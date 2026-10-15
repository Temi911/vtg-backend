const router = require('express').Router();
const markets = require('../services/africa-market.service');

router.get('/markets', (req, res) => {
  const countryCode = req.query.country;
  if (countryCode !== undefined) {
    const market = markets.getMarket(String(countryCode));
    if (!market) {
      return res.status(404).json({
        error: { code: 'MARKET_NOT_FOUND', message: 'No VTG market configuration exists for that country code.' }
      });
    }
    return res.json({ status: 'planning_data', liveProviderData: false, market });
  }
  return res.json(markets.getMarketSummary());
});

module.exports = router;
