const express = require('express');
const router = express.Router();
const { locations } = require('../../api/atlas-locations');

const corridors = [
  {id:'NGTIN-CNSHA',name:'Tin Can Island → Shanghai',mode:'sea',from:'Tin Can Island Port',to:'Port of Shanghai',fromLng:3.3371,fromLat:6.4479,toLng:121.4737,toLat:31.2304},
  {id:'NGAPP-CNGZ',name:'Apapa → Guangzhou',mode:'sea',from:'Apapa Port',to:'Port of Guangzhou',fromLng:3.3598,fromLat:6.4508,toLng:113.2644,toLat:23.1291},
  {id:'NGLEK-CNNGB',name:'Lekki → Ningbo-Zhoushan',mode:'sea',from:'Lekki Deep Sea Port',to:'Port of Ningbo-Zhoushan',fromLng:3.3654,fromLat:6.4552,toLng:121.544,toLat:29.8683},
  {id:'NGLAG-KRPUS',name:'Lagos → Busan',mode:'sea',from:'Port of Lagos',to:'Port of Busan',fromLng:3.36,fromLat:6.45,toLng:129.0403,toLat:35.1028},
  {id:'NGLOS-CAN',name:'Lagos → Guangzhou Air Cargo',mode:'air',from:'Murtala Muhammed International Airport',to:'Guangzhou Baiyun International Airport',fromLng:3.3211,fromLat:6.5774,toLng:113.2988,toLat:23.3924},
  {id:'NGLOS-PVG',name:'Lagos → Shanghai Air Cargo',mode:'air',from:'Murtala Muhammed International Airport',to:'Shanghai Pudong International Airport',fromLng:3.3211,fromLat:6.5774,toLng:121.8083,toLat:31.1443},
  {id:'NGLOS-ICN',name:'Lagos → Incheon Air Cargo',mode:'air',from:'Murtala Muhammed International Airport',to:'Incheon International Airport',fromLng:3.3211,fromLat:6.5774,toLng:126.4407,toLat:37.4602},
  {id:'NGABV-CAN',name:'Abuja → Guangzhou Air Cargo',mode:'air',from:'Nnamdi Azikiwe International',to:'Guangzhou Baiyun International Airport',fromLng:9.01,fromLat:7.27,toLng:113.2988,toLat:23.3924}
];

router.get('/locations', (req,res) => {
  const region = String(req.query.region || '').toLowerCase();
  const type = String(req.query.type || '').toLowerCase();
  const q = String(req.query.q || '').toLowerCase();
  const data = locations.filter(x => (!region || x.region.toLowerCase() === region) && (!type || x.type === type) && (!q || `${x.name} ${x.city} ${x.country} ${x.code}`.toLowerCase().includes(q)));
  res.json({ok:true,count:data.length,data});
});

router.get('/corridors', (req,res) => {
  const mode = String(req.query.mode || '').toLowerCase();
  const q = String(req.query.q || '').toLowerCase();
  const data = corridors.filter(x => (!mode || x.mode === mode) && (!q || `${x.name} ${x.from} ${x.to}`.toLowerCase().includes(q)));
  res.json({ok:true,count:data.length,data});
});

router.get('/summary', (req,res) => {
  res.json({ok:true,regions:['Africa','China','Korea'],counts:{seaports:locations.filter(x=>x.type==='seaport').length,airports:locations.filter(x=>x.type==='airport').length,corridors:corridors.length},focus:{country:'Nigeria',city:'Lagos',port:'Tin Can Island Port'}});
});

router.get('/locations/:code', (req,res) => {
  const item = locations.find(x => x.code.toLowerCase() === String(req.params.code).toLowerCase());
  if (!item) return res.status(404).json({ok:false,error:'Location not found'});
  res.json({ok:true,data:item});
});

module.exports = router;
