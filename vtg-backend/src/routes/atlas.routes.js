const express = require('express');
const router = express.Router();
const { locations } = require('../../../api/atlas-locations');

const corridors = [
  {id:'NGTIN-CNSHA',name:'Tin Can Island → Shanghai',mode:'sea',from:'Tin Can Island Port',to:'Port of Shanghai',fromLng:3.3371,fromLat:6.4479,toLng:122.0647,toLat:30.6265},
  {id:'NGAPP-CNGZ',name:'Apapa → Guangzhou',mode:'sea',from:'Apapa Port',to:'Port of Guangzhou',fromLng:3.3598,fromLat:6.4508,toLng:113.4431,toLat:23.0936},
  {id:'NGLEK-CNNGB',name:'Lekki → Ningbo-Zhoushan',mode:'sea',from:'Lekki Deep Sea Port',to:'Port of Ningbo-Zhoushan',fromLng:4.0058,fromLat:6.4275,toLng:121.544,toLat:29.8683},
  {id:'NGLAG-KRPUS',name:'Lagos → Busan',mode:'sea',from:'Port of Lagos',to:'Port of Busan',fromLng:3.36,fromLat:6.45,toLng:129.0403,toLat:35.1028},
  {id:'NGLOS-CAN',name:'Lagos → Guangzhou Air Cargo',mode:'air',from:'Murtala Muhammed International Airport',to:'Guangzhou Baiyun International Airport',fromLng:3.3211,fromLat:6.5774,toLng:113.2988,toLat:23.3924},
  {id:'NGLOS-PVG',name:'Lagos → Shanghai Air Cargo',mode:'air',from:'Murtala Muhammed International Airport',to:'Shanghai Pudong International Airport',fromLng:3.3211,fromLat:6.5774,toLng:121.8083,toLat:31.1443},
  {id:'NGLOS-ICN',name:'Lagos → Incheon Air Cargo',mode:'air',from:'Murtala Muhammed International Airport',to:'Incheon International Airport',fromLng:3.3211,fromLat:6.5774,toLng:126.4407,toLat:37.4602},
  {id:'NGABV-CAN',name:'Abuja → Guangzhou���q�^