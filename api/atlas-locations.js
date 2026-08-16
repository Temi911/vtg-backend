const locations = [
  {name:'Tin Can Island Port',country:'Nigeria',region:'Africa',type:'seaport',lat:6.4479,lng:3.3371,code:'NGTIN',city:'Lagos'},
  {name:'Apapa Port',country:'Nigeria',region:'Africa',type:'seaport',lat:6.4508,lng:3.3598,code:'NGAPP',city:'Lagos'},
  {name:'Lekki Deep Sea Port',country:'Nigeria',region:'Africa',type:'seaport',lat:6.4552,lng:3.3654,code:'NGLEK',city:'Lagos'},
  {name:'Murtala Muhammed International Airport',country:'Nigeria',region:'Africa',type:'airport',lat:6.5774,lng:3.3211,code:'LOS',city:'Lagos'},
  {name:'Port of Durban',country:'South Africa',region:'Africa',type:'seaport',lat:-29.8719,lng:31.0462,code:'ZADUR',city:'Durban'},
  {name:'OR Tambo International Airport',country:'South Africa',region:'Africa',type:'airport',lat:-26.1367,lng:28.2411,code:'JNB',city:'Johannesburg'},
  {name:'Port of Mombasa',country:'Kenya',region:'Africa',type:'seaport',lat:-4.0435,lng:39.6682,code:'KEMBA',city:'Mombasa'},
  {name:'Jomo Kenyatta International Airport',country:'Kenya',region:'Africa',type:'airport',lat:-1.3192,lng:36.9278,code:'NBO',city:'Nairobi'},
  {name:'Port of Tema',country:'Ghana',region:'Africa',type:'seaport',lat:5.6698,lng:-0.0166,code:'GHTEM',city:'Tema'},
  {name:'Kotoka International Airport',country:'Ghana',region:'Africa',type:'airport',lat:5.6052,lng:-0.1668,code:'ACC',city:'Accra'},
  {name:'Port of Abidjan',country:"Côte d'Ivoire",region:'Africa',type:'seaport',lat:5.3056,lng:-4.0127,code:'CIABJ',city:'Abidjan'},
  {name:'Cairo International Airport',country:'Egypt',region:'Africa',type:'airport',lat:30.1219,lng:31.4056,code:'CAI',city:'Cairo'},
  {name:'Port Said',country:'Egypt',region:'Africa',type:'seaport',lat:31.2565,lng:32.3023,code:'EGPSD',city:'Port Said'},
  {name:'Port of Alexandria',country:'Egypt',region:'Africa',type:'seaport',lat:31.2001,lng:29.9187,code:'EGALY',city:'Alexandria'},
  {name:'Port of Djibouti',country:'Djibouti',region:'Africa',type:'seaport',lat:11.589,lng:43.145,code:'DJJIB',city:'Djibouti'},
  {name:'Bole International Airport',country:'Ethiopia',region:'Africa',type:'airport',lat:8.9779,lng:38.7993,code:'ADD',city:'Addis Ababa'},
  {name:'Port of Lagos',country:'Nigeria',region:'Africa',type:'seaport',lat:6.45,lng:3.36,code:'NGLAG',city:'Lagos'},
  {name:'Port of Shanghai',country:'China',region:'China',type:'seaport',lat:31.2304,lng:121.4737,code:'CNSHA',city:'Shanghai'},
  {name:'Port of Ningbo-Zhoushan',country:'China',region:'China',type:'seaport',lat:29.8683,lng:121.544,code:'CNNGB',city:'Ningbo'},
  {name:'Port of Shenzhen',country:'China',region:'China',type:'seaport',lat:22.5431,lng:114.0579,code:'CNSZX',city:'Shenzhen'},
  {name:'Port of Guangzhou',country:'China',region:'China',type:'seaport',lat:23.1291,lng:113.2644,code:'CNGZ',city:'Guangzhou'},
  {name:'Port of Qingdao',country:'China',region:'China',type:'seaport',lat:36.0671,lng:120.3826,code:'CNTAO',city:'Qingdao'},
  {name:'Port of Tianjin',country:'China',region:'China',type:'seaport',lat:38.9897,lng:117.3505,code:'CNTSN',city:'Tianjin'},
  {name:'Shanghai Pudong International Airport',country:'China',region:'China',type:'airport',lat:31.1443,lng:121.8083,code:'PVG',city:'Shanghai'},
  {name:'Shenzhen Bao’an International Airport',country:'China',region:'China',type:'airport',lat:22.6393,lng:113.8107,code:'SZX',city:'Shenzhen'},
  {name:'Guangzhou Baiyun International Airport',country:'China',region:'China',type:'airport',lat:23.3924,lng:113.2988,code:'CAN',city:'Guangzhou'},
  {name:'Beijing Capital International Airport',country:'China',region:'China',type:'airport',lat:40.0799,lng:116.6031,code:'PEK',city:'Beijing'},
  {name:'Hong Kong International Airport',country:'China',region:'China',type:'airport',lat:22.308,lng:113.9185,code:'HKG',city:'Hong Kong'},
  {name:'Port of Busan',country:'South Korea',region:'Korea',type:'seaport',lat:35.1028,lng:129.0403,code:'KRPUS',city:'Busan'},
  {name:'Port of Incheon',country:'South Korea',region:'Korea',type:'seaport',lat:37.4563,lng:126.7052,code:'KRINC',city:'Incheon'},
  {name:'Incheon International Airport',country:'South Korea',region:'Korea',type:'airport',lat:37.4602,lng:126.4407,code:'ICN',city:'Incheon'},
  {name:'Gimpo International Airport',country:'South Korea',region:'Korea',type:'airport',lat:37.5583,lng:126.7906,code:'GMP',city:'Seoul'},
  {name:'Port of Gwangyang',country:'South Korea',region:'Korea',type:'seaport',lat:34.9164,lng:127.7012,code:'KRYOS',city:'Gwangyang'}
];

module.exports = async (req,res) => {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin','*');
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const region = (url.searchParams.get('region') || '').toLowerCase();
  const type = (url.searchParams.get('type') || '').toLowerCase();
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const result = locations.filter(x => (!region || x.region.toLowerCase()===region) && (!type || x.type===type) && (!q || `${x.name} ${x.city} ${x.country} ${x.code}`.toLowerCase().includes(q)));
  res.end(JSON.stringify({ok:true,count:result.length,data:result}));
};
module.exports.locations = locations;
