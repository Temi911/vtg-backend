(() => {
  const countries = [
    ['Algeria',3.0,28.0],['Angola',-11.2,17.9],['Benin',9.3,2.3],['Botswana',-22.3,24.7],['Burkina Faso',12.4,-1.6],['Burundi',-3.4,29.9],['Cabo Verde',15.1,-23.6],['Cameroon',3.9,11.5],['Central African Republic',6.6,20.9],['Chad',15.5,18.7],['Comoros',-11.7,43.3],['Republic of the Congo',-1.0,15.8],['DR Congo',-2.9,23.7],['Côte d’Ivoire',7.5,-5.5],['Djibouti',11.8,42.6],['Egypt',26.8,30.8],['Equatorial Guinea',1.6,10.5],['Eritrea',15.2,39.8],['Eswatini',-26.5,31.5],['Ethiopia',9.1,40.5],['Gabon',-0.6,11.6],['Gambia',13.4,-15.3],['Ghana',7.9,-1.0],['Guinea',10.4,-10.9],['Guinea-Bissau',12.0,-15.0],['Kenya',0.2,37.9],['Lesotho',-29.6,28.2],['Liberia',6.4,-9.4],['Libya',27.0,17.0],['Madagascar',-18.8,46.9],['Malawi',-13.3,34.3],['Mali',17.6,-4.0],['Mauritania',20.3,-10.9],['Mauritius',-20.2,57.5],['Morocco',31.8,-7.1],['Mozambique',-18.7,35.5],['Namibia',-22.6,17.1],['Niger',17.6,8.1],['Nigeria',9.1,8.7],['Rwanda',-1.9,29.9],['São Tomé and Príncipe',0.2,6.6],['Senegal',14.5,-14.5],['Seychelles',-4.7,55.5],['Sierra Leone',8.5,-11.8],['Somalia',5.2,46.2],['South Africa',-30.6,22.9],['South Sudan',7.9,30.2],['Sudan',15.6,30.2],['Tanzania',-6.3,34.9],['Togo',8.6,1.2],['Tunisia',34.0,9.0],['Uganda',1.4,32.3],['Zambia',-13.1,27.8],['Zimbabwe',-19.0,29.2],
    ['China',35.9,104.2],['South Korea',36.4,127.9]
  ].map(([name,lat,lon]) => ({name,lat,lon}));

  const ports = [
    ['Tangier Med','Morocco',35.9,-5.5],['Algiers','Algeria',36.8,3.1],['Tunis/Rades','Tunisia',36.8,10.3],['Port Said','Egypt',31.3,32.3],['Alexandria','Egypt',31.2,29.9],['Tripoli','Libya',32.9,13.2],['Dakar','Senegal',14.7,-17.4],['Abidjan','Côte d’Ivoire',5.3,-4.0],['Tema','Ghana',5.7,0.0],['Lomé','Togo',6.1,1.3],['Cotonou','Benin',6.4,2.4],['Lagos / Apapa','Nigeria',6.45,3.37],['Tin Can Island','Nigeria',6.42,3.36],['Lekki Deep Sea Port','Nigeria',6.45,3.38],['Douala','Cameroon',4.05,9.68],['Libreville','Gabon',0.39,9.45],['Pointe-Noire','Republic of the Congo',-4.78,11.86],['Luanda','Angola',-8.84,13.23],['Walvis Bay','Namibia',-22.96,14.51],['Cape Town','South Africa',-33.92,18.43],['Durban','South Africa',-29.87,31.05],['Maputo','Mozambique',-25.97,32.58],['Beira','Mozambique',-19.84,34.84],['Dar es Salaam','Tanzania',-6.82,39.28],['Mombasa','Kenya',-4.04,39.67],['Djibouti','Djibouti',11.59,43.15],['Port Sudan','Sudan',19.62,37.22],['Mogadishu','Somalia',2.05,45.34],['Port Louis','Mauritius',-20.16,57.5],['Victoria','Seychelles',-4.62,55.45],
    ['Shanghai','China',31.23,121.47],['Ningbo-Zhoushan','China',29.87,121.55],['Shenzhen','China',22.54,114.06],['Guangzhou/Nansha','China',22.77,113.61],['Qingdao','China',36.07,120.38],['Tianjin','China',39.0,117.72],['Xiamen','China',24.48,118.09],['Hong Kong','China',22.32,114.17],['Busan','South Korea',35.1,129.04],['Incheon','South Korea',37.46,126.62],['Gwangyang','South Korea',34.93,127.7],['Ulsan','South Korea',35.54,129.31]
  ].map(([name,country,lat,lon]) => ({name,country,lat,lon}));

  const hubs = [
    ['Lagos Trade Hub','Nigeria',6.45,3.39],['Accra Trade Hub','Ghana',5.56,-0.2],['Nairobi Logistics Hub','Kenya',-1.29,36.82],['Johannesburg Logistics Hub','South Africa',-26.2,28.04],['Cairo Trade Hub','Egypt',30.04,31.24],['Casablanca Trade Hub','Morocco',33.57,-7.59],['Addis Ababa Hub','Ethiopia',9.03,38.74],['Dubai Trade Hub','UAE',25.2,55.27],['Shanghai Trade Hub','China',31.23,121.47],['Guangzhou Trade Hub','China',23.13,113.26],['Busan Trade Hub','South Korea',35.1,129.04],['Seoul Trade Hub','South Korea',37.57,126.98]
  ].map(([name,country,lat,lon]) => ({name,country,lat,lon}));

  const routes = [
    ['West Africa–China',[[-17.4,14.7],[-4.0,5.3],[3.37,6.42],[39.28,-6.82],[114.06,22.54],[121.47,31.23]]],
    ['Nigeria–China',[[3.37,6.42],[121.47,31.23]]],
    ['Nigeria–South Korea',[[3.37,6.42],[129.04,35.1]]],
    ['East Africa–China',[[39.67,-4.04],[39.28,-6.82],[121.55,29.87]]],
    ['Southern Africa–China',[[18.43,-33.92],[31.05,-29.87],[121.47,31.23]]],
    ['North Africa–China',[[-5.5,35.9],[32.3,31.3],[121.47,31.23]]],
    ['North Africa–South Korea',[[-5.5,35.9],[129.04,35.1]]],
    ['China Coastal Network',[[121.47,31.23],[121.55,29.87],[114.06,22.54],[113.61,22.77],[118.09,24.48]]],
    ['Korea Coastal Network',[[126.62,37.46],[129.04,35.1],[127.7,34.93],[129.31,35.54]]],
    ['Africa Atlantic Corridor',[[ -17.4,14.7],[-4.0,5.3],[3.37,6.42],[9.68,4.05],[13.23,-8.84],[14.51,-22.96],[18.43,-33.92]]],
    ['Africa Indian Ocean Corridor',[[39.67,-4.04],[39.28,-6.82],[34.84,-19.84],[32.58,-25.97],[57.5,-20.16]]],
    ['Suez–Red Sea Corridor',[[32.3,31.3],[37.22,19.62],[43.15,11.59],[39.67,-4.04]]]
  ].map(([name,coords]) => ({name,coords}));

  const geoPoints = (items) => ({type:'FeatureCollection',features:items.map(x=>({type:'Feature',geometry:{type:'Point',coordinates:[x.lon,x.lat]},properties:x}))});
  const geoLines = ({type:'FeatureCollection',features:routes.map(x=>({type:'Feature',geometry:{type:'LineString',coordinates:x.coords},properties:{name:x.name}}))});

  function popup(map, item, type) {
    const title = item.name;
    const extra = type === 'port' ? `${item.country}<br><small>Port & logistics gateway</small>` : type === 'hub' ? `${item.country}<br><small>Trade / logistics hub</small>` : `<small>Country / trade market</small>`;
    const p = new map.constructor.Popup({offset:12}).setLngLat([item.lon,item.lat]).setHTML(`<strong>${title}</strong><br>${extra}`);
    return p;
  }

  function install(map, doc) {
    if (!map || map.__vtgAtlasInstalled) return;
    map.__vtgAtlasInstalled = true;
    const sources = {
      countries: geoPoints(countries), ports: geoPoints(ports), hubs: geoPoints(hubs), routes: geoLines(routes)
    };
    const specs = [
      ['vtg-routes','routes','line','#d6a23a',2.8],
      ['vtg-country-points','countries','circle','#0e969f',5],
      ['vtg-port-points','ports','circle','#e56b3f',6],
      ['vtg-hub-points','hubs','circle','#7c4dff',7]
    ];
    const add = () => {
      Object.entries(sources).forEach(([id,data])=>{if(!map.getSource('vtg-'+id))map.addSource('vtg-'+id,{type:'geojson',data})});
      specs.forEach(([id,key,type,color,r])=>{if(map.getLayer(id))return;map.addLayer({id,type,source:'vtg-'+key,layout:{visibility:'none'},paint:type==='line'?{'line-color':color,'line-width':r,'line-opacity':0.8}:{'circle-radius':r,'circle-color':color,'circle-stroke-color':'#fff','circle-stroke-width':1.5,'circle-opacity':0.95}})});
      window.VTGTradeAtlas={countries,ports,hubs,routes,sources,map,setLayer:(key,on)=>{const id=key==='countries'?'vtg-country-points':key==='ports'?'vtg-port-points':key==='hubs'?'vtg-hub-points':'vtg-routes';if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}};
      const attachPopups = (layer,type,list) => map.on('click',layer,e=>{const f=e.features?.[0];if(!f)return;const item=list.find(x=>x.name===f.properties.name);if(item) popup(map,item,type).addTo(map);});
      attachPopups('vtg-country-points','country',countries); attachPopups('vtg-port-points','port',ports); attachPopups('vtg-hub-points','hub',hubs);
      map.on('mouseenter','vtg-country-points',()=>map.getCanvas().style.cursor='pointer'); map.on('mouseleave','vtg-country-points',()=>map.getCanvas().style.cursor='');
      map.on('mouseenter','vtg-port-points',()=>map.getCanvas().style.cursor='pointer'); map.on('mouseleave','vtg-port-points',()=>map.getCanvas().style.cursor='');
      map.on('mouseenter','vtg-hub-points',()=>map.getCanvas().style.cursor='pointer'); map.on('mouseleave','vtg-hub-points',()=>map.getCanvas().style.cursor='');
    };
    if(map.isStyleLoaded()) add(); else map.once('load',add);
    map.on('style.load',()=>{map.__vtgAtlasInstalled=false;delete map.__vtgAtlasInstalled;install(map,doc)});
  }
  window.VTGInstallTradeAtlas = install;
})();
