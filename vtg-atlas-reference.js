(()=>{"use strict";
const LIB="https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.js";
const CSS="https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.css";
const SAT="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
let map=null,markers=[],timer=null;
const LOCATIONS=[
{id:"tin-can",name:"Tin Can Island Port",type:"Port",country:"Nigeria",city:"Lagos",lng:3.3848,lat:6.4607,status:"Operational",photo:"https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1200&q=90",terminal:"Tin Can Island Terminal",operator:"Nigerian Ports Authority",capacity:"2.5M TEU / year",activity:"High",weather:"28Â°C â€¢ Partly cloudy"},
{id:"apapa",name:"Apapa Port",type:"Port",country:"Nigeria",city:"Lagos",lng:3.3619,lat:6.4483,status:"Operational",photo:"https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1200&q=90",terminal:"Apapa Container Terminal",operator:"Nigerian Ports Authority",capacity:"18M TEU / year",activity:"High",weather:"28Â°C â€¢ Partly cloudy"},
{id:"lekki",name:"Lekki Deep Sea Port",type:"Port",country:"Nigeria",city:"Lagos",lng:3.953,lat:6.4382,status:"Operational",photo:"https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=1200&q=90",terminal:"Lekki Deep Sea Port",operator:"Lekki Port LFTZ Enterprise",capacity:"1.2M TEU / year",activity:"Growing",weather:"28Â°C â€¢ Partly cloudy"},
{id:"nansha",name:"Nansha Port",type:"Port",country:"C¶»§q«^