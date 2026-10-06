const {asyncHandler}=require('../utils/asyncHandler');
const {fxRates,news,status}=require('../services/external-integration.service');
const {getLiveVesselPosition}=require('../services/vessel-tracking.service');
const integrationStatus=asyncHandler(async(req,res)=>res.json(await status()));
const rates=asyncHandler(async(req,res)=>res.json(await fxRates(req.query.base||'USD',String(req.query.symbols||'NGN,CNY,KRW').split(','))));
const newsFeed=asyncHandler(async(req,res)=>res.json(await news()));
const vessel=asyncHandler(async(req,res)=>res.json(await getLiveVesselPosition({imo:req.query.imo,mmsi:req.query.mmsi,vesselName:req.query.vesselName})));
module.exports={integrationStatus,rates,newsFeed,vessel};
