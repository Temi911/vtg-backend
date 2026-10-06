const {asyncHandler}=require('../utils/asyncHandler');
const {fxRates,news,status}=require('../services/external-integration.service');
const {getLiveVesselPosition}=require('../services/vessel-tracking.service');
const freshness=asyncHandler(async(req,res)=>{const s=await status();res.json({generatedAt:s.generatedAt,providers:s.providers,staleAfterMs:Number(process.env.VTG_DATA_STALE_AFTER_MS||300000)});});
const integrationStatus=asyncHandler(async(req,res)=>res.json(await status()));
const rates=asyncHandler(async(req,res)=>res.json(await fxRates(req.query.base||'USD',String(req.query.symbols||'NGN,CNY,KRW').split(','))));
const newsFeed=asyncHandler(async(req,res)=>res.json(await news()));
const vessel=asyncHandler(async(req,res)=>res.json(await getLiveVesselPosition({imo:req.query.imo,mmsi:req.query.mmsi,vesselName:req.query.vesselName})));
module.exports={integrationStatus,rates,newsFeed,vessel,freshness};
