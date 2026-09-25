(() => {
  // Representative trade-network data: all 54 African countries plus major African/Asian ports and hubs.
  // Landlocked countries are represented by their national trade/logistics hub rather than an invented seaport.
  window.VTGTradeNetwork = {
    countries: [
      ['Algeria','Algiers',3.0588,36.7538],['Angola','Luanda',13.2343,-8.8383],['Benin','Cotonou',2.3912,6.3703],['Botswana','Gaborone',25.9231,-24.6282],['Burkina Faso','Ouagadougou',-1.5197,12.3714],['Burundi','Bujumbura',29.3639,-3.3614],['Cabo Verde','Praia',-23.5133,14.933],['Cameroon','Douala',9.7043,4.0511],['Central African Republic','Bangui',18.5550,4.3947],['Chad','N’Djamena',12.1348,12.1348],['Comoros','Moroni',43.2551,-11.7172],['Congo','Pointe-Noire',11.8635,-4.7692],['DR Congo','Kinshasa',15.2663,-4.4419],['Côte d’Ivoire','Abidjan',-4.0083,5.3599],['Djibouti','Djibouti City',43.1456,11.5721],['Egypt','Alexandria',29.9187,31.2001],['Equatorial Guinea','Malabo',8.7832,3.7504],['Eritrea','Massawa',39.4513,15.6081],['Eswatini','Mbabane',31.1367,-26.3054],['Ethiopia','Addis Ababa',38.7578,8.9806],['Gabon','Libreville',9.4536,0.4162],['Gambia','Banjul',-16.5790,13.4549],['Ghana','Tema',-0.0166,5.6698],['Guinea','Conakry',-13.5784,9.6412],['Guinea-Bissau','Bissau',-15.5982,11.8817],['Kenya','Mombasa',39.6682,-4.0435],['Lesotho','Maseru',27.4782,-29.3151],['Liberia','Monrovia',-10.7605,6.3005],['Libya','Tripoli',13.1913,32.8872],['Madagascar','Toamasina',49.4025,-18.1492],['Malawi','Lilongwe',33.7741,-13.9626],['Mali','Bamako',-8.0029,12.6392],['Mauritania','Nouakchott',-15.9785,18.0735],['Mauritius','Port Louis',57.5012,-20.1609],['Morocco','Tangier',-5.8125,35.7595],['Mozambique','Maputo',32.5732,-25.9692],['Namibia','Walvis Bay',14.5053,-22.9576],['Niger','Niamey',2.1098,13.5116],['Nigeria','Lagos',3.3792,6.5244],['Rwanda','Kigali',30.0588,-1.9441],['São Tomé and Príncipe','São Tomé',6.7273,0.3365],['Senegal','Dakar',-17.4677,14.7167],['Seychelles','Victoria',55.4500,-4.6191],['Sierra Leone','Freetown',-13.2317,8.4657],['Somalia','Mogadishu',45.3182,2.0469],['South Africa','Durban',31.0218,-29.8587],['South Sudan','Juba',31.5825,4.8594],['Sudan','Port Sudan',37.2164,19.6158],['Tanzania','Dar es Salaam',39.2083,-6.7924],['Togo','Lomé',1.2223,6.1256],['Tunisia','Tunis',10.1815,36.8065],['Uganda','Kampala',32.5825,0.3476],['Zambia','Lusaka',28.3228,-15.3875],['Zimbabwe','Harare',31.0530,-17.8252]
    ].map(([country,city,lon,lat]) => ({country,city,lon,lat,type:'country'})),
    ports: [
      ['Tangier Med','Morocco',-5.4930,35.8888],['Algiers Port','Algeria',3.0588,36.7538],['Port of Tunis','Tunisia',10.3050,36.8050],['Port of Tripoli','Libya',13.1870,32.8960],['Port Said','Egypt',32.3019,31.2653],['Alexandria Port','Egypt',29.8850,31.2001],['Port Sudan','Sudan',37.2164,19.6158],['Djibouti Port','Djibouti',43.1456,11.5721],['Berbera Port','Somalia',45.0260,10.4396],['Mombasa Port','Kenya',39.6682,-4.0435],['Dar es Salaam Port','Tanzania',39.2803,-6.8208],['Beira Port','Mozambique',34.8389,-19.8436],['Maputo Port','Mozambique',32.5732,-25.9692],['Durban Port','South Africa',31.0492,-29.8833],['Cape Town Port','South Africa',18.4241,-33.9180],['Walvis Bay Port','Namibia',14.5053,-22.9576],['Lobito Port','Angola',13.5437,-12.3498],['Luanda Port','Angola',13.2343,-8.8383],['Pointe-Noire Port','Congo',11.8635,-4.7692],['Port-Gentil','Gabon',8.7815,0.7193],['Douala Port','Cameroon',9.7043,4.0511],['Lagos Apapa Port','Nigeria',3.3590,6.4488],['Tin Can Island Port','Nigeria',3.3352,6.4502],['Lekki Deep Sea Port','Nigeria',3.3940,6.4698],['Tema Port','Ghana',0.0166,5.6698],['Lomé Port','Togo',1.2868,6.1319],['Cotonou Port','Benin',2.4380,6.3455],['Abidjan Port','Côte d’Ivoire',-4.0060,5.3000],['Conakry Port','Guinea',-13.7130,9.5092],['Freetown Port','Sierra Leone',-13.2150,8.4900],['Monrovia Port','Liberia',-10.7800,6.3100],['Dakar Port','Senegal',-17.4450,14.6930],['Nouakchott Port','Mauritania',-16.0300,18.0500],['Banjul Port','Gambia',-16.5750,13.4550],['Praia Port','Cabo Verde',-23.5100,14.9180],['Moroni Port','Comoros',43.2500,-11.7100],['Port Louis','Mauritius',57.5000,-20.1600],['Toamasina Port','Madagascar',49.4000,-18.1500],['Victoria Port','Seychelles',55.4500,-4.6200],['São Tomé Port','São Tomé and Príncipe',6.7300,0.3300]
    ].map(([name,country,lon,lat])=>({name,country,lon,lat,type:'port'})),
    asiaPorts: [
      ['Shanghai Port','China',121.4737,31.2304],['Ningbo-Zhoushan Port','China',121.9,29.9],['Shenzhen Port','China',114.3,22.6],['Guangzhou/Nansha Port','China',113.52,22.77],['Qingdao Port','China',120.32,36.07],['Tianjin Port','China',117.75,38.99],['Xiamen Port','China',118.07,24.48],['Hong Kong Port','China',114.17,22.30],['Busan Port','South Korea',129.04,35.10],['Incheon Port','South Korea',126.61,37.46],['Gwangyang Port','South Korea',127.69,34.92],['Ulsan Port','South Korea',129.37,35.52]
    ].map(([name,country,lon,lat])=>({name,country,lon,lat,type:'asiaPort'})),
    asiaHubs: [
      {name:'Guangzhou Trade Hub',country:'China',lon:113.2644,lat:23.1291,type:'asiaHub'},
      {name:'Shanghai Trade Hub',country:'China',lon:121.4737,lat:31.2304,type:'asiaHub'},
      {name:'Shenzhen Trade Hub',country:'China',lon:114.0579,lat:22.5431,type:'asiaHub'},
      {name:'Seoul Trade Hub',country:'South Korea',lon:126.9780,lat:37.5665,type:'asiaHub'},
      {name:'Busan Trade Hub',country:'South Korea',lon:129.0756,lat:35.1796,type:'asiaHub'}
    ],
    corridors: [
      ['West Africa Mainline',[3.3352,6.4502],[-0.0166,5.6698],[-4.0083,5.3599],[-13.2317,8.4657],[-17.4677,14.7167]],
      ['East Africa Mainline',[39.6682,-4.0435],[39.2083,-6.7924],[32.5732,-25.9692],[31.0218,-29.8587]],
      ['North Africa Mediterranean',[3.0588,36.7538],[10.1815,36.8065],[13.1913,32.8872],[29.9187,31.2001]],
      ['Central Africa Corridor',[9.7043,4.0511],[11.8635,-4.7692],[13.2343,-8.8383],[14.5053,-22.9576]],
      ['Southern Africa Corridor',[14.5053,-22.9576],[32.5732,-25.9692],[31.0218,-29.8587]],
      ['Africa–China Mainline',[3.3352,6.4502],[39.6682,-4.0435],[43.1456,11.5721],[55.06,24.99],[113.52,22.77],[121.4737,31.2304]],
      ['Africa–Korea Mainline',[3.3352,6.4502],[43.1456,11.5721],[121.4737,31.2304],[129.04,35.10]],
      ['China Coastal Network',[113.52,22.77],[114.3,22.6],[118.07,24.48],[121.9,29.9],[121.4737,31.2304],[117.75,38.99]],
      ['Korea Coastal Network',[126.61,37.46],[127.69,34.92],[129.04,35.10],[129.37,35.52]]
    ].map(([name,coords])=>({name,coords}))
  };
})();
