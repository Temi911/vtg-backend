const express = require('express');
const router = express.Router();
const locations = require('../../../api/atlas-locations').locations;
router.get('/locations', (req,res) => {
  const region = String(req.query.region || '').toLowerCase();
  const type = String(req.query.type || '').toLowerCase();
  const q = String(req.query.q || '').toLowerCase();
  const data = locations.filter(x => (!region || x.region.toLowerCase() === region) && (!type || x.type === type) && (!q || `${x.name} ${x.city} ${x.country} ${x.code}`.toLowerCase().includes(q)));
  res.json({ok:true,count:data.length,data});
});
module.exports = router;
