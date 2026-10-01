/* VTG Country & Language Intelligence Layer
 * Shared client-side context for country-aware and language-aware UI.
 */
(function(){
  'use strict';
  const COUNTRIES = {
    Algeria:{code:'DZ',currency:'DZD',defaultLanguage:'ar',ports:['Algiers','Oran']},
    Angola:{code:'AO',currency:'AOA',defaultLanguage:'pt',ports:['Luanda','Lobito']},
    Benin:{code:'BJ',currency:'XOF',defaultLanguage:'fr',ports:['Cotonou']},
    Botswana:{code:'BW',currency:'BWP',defaultLanguage:'en',ports:['Gaborone']},
    Burkina_Faso:{name:'Burkina Faso',code:'BF',currency:'XOF',defaultLanguage:'fr',ports:[]},
    Burundi:{code:'BI',currency:'BIF',defaultLanguage:'fr',ports:[]},
    Cabo_Verde:{name:'Cabo Verde',code:'CV',currency:'CVE',defaultLanguage:'pt',ports:['Praia']},
    Cameroon:{code:'CM',currency:'XAF',defaultLanguage:'fr',ports:['Douala','Kribi']},
    Central_African_Republic:{name:'Central African Republic',code:'CF',currency:'XAF',defaultLanguage:'fr',ports:[]},
    Chad:{code:'TD',currency:'XAF',defaultLanguage:'fr',ports:[]},
    Comoros:{code:'KM',currency:'KMF',defaultLanguage:'fr',ports:['Moroni']},
    Congo:{name:'Republic of the Congo',code:'CG',currency:'XAF',defaultLanguage:'fr',ports:['Pointe-Noire']},
    DR_Congo:{name:'Democratic Republic of the Congo',code:'CD',currency:'CDF',defaultLanguage:'fr',ports:['Matadi']},
    Cote_d_Ivoire:{name:"Côte d’Ivoire",code:'CI',currency:'XOF',defaultLanguage:'fr',ports:['Abidjan','San-Pédro']},
    Djibouti:{code:'DJ',currency:'DJF',defaultLanguage:'fr',ports:['Djibouti']},
    Egypt:{code:'EG',currency:'EGP',defaultLanguage:'ar',ports:['Alexandria','Port Said','Damietta']},
    Equatorial_Guinea:{name:'Equatorial Guinea',code:'GQ',currency:'XAF',defaultLanguage:'es',ports:['Malabo','Bata']},
    Eritrea:{code:'ER',currency:'ERN',defaultLanguage:'ar',ports:['Massawa','Assab']},
    Eswatini:{code:'SZ',currency:'SZL',defaultLanguage:'en',ports:[]},
    Ethiopia:{code:'ET',currency:'ETB',defaultLanguage:'en',ports:['Addis Ababa']},
    Gabon:{code:'GA',currency:'XAF',defaultLanguage:'fr',ports:['Libreville','Owendo']},
    Gambia:{name:'The Gambia',code:'GM',currency:'GMD',defaultLanguage:'en',ports:['Banjul']},
    Ghana:{code:'GH',currency:'GHS',defaultLanguage:'en',ports:['Tema','Takoradi']},
    Guinea:{code:'GN',currency:'GNF',defaultLanguage:'fr',ports:['Conakry']},
    Guinea_Bissau:{name:'Guinea-Bissau',code:'GW',currency:'XOF',defaultLanguage:'pt',ports:['Bissau']},
    Kenya:{code:'KE',currency:'KES',defaultLanguage:'en',ports:['Mombasa']},
    Lesotho:{code:'LS',currency:'LSL',defaultLanguage:'en',ports:[]},
    Liberia:{code:'LR',currency:'LRD',defaultLanguage:'en',ports:['Monrovia']},
    Libya:{code:'LY',currency:'LYD',defaultLanguage:'ar',ports:['Tripoli','Misrata']},
    Madagascar:{code:'MG',currency:'MGA',defaultLanguage:'fr',ports:['Toamasina']},
    Malawi:{code:'MW',currency:'MWK',defaultLanguage:'en',ports:[]},
    Mali:{code:'ML',currency:'XOF',defaultLanguage:'fr',ports:[]},
    Mauritania:{code:'MR',currency:'MRU',defaultLanguage:'ar',ports:['Nouadhibou']},
    Mauritius:{code:'MU',currency:'MUR',defaultLanguage:'en',ports:['Port Louis']},
    Morocco:{code:'MA',currency:'MAD',defaultLanguage:'ar',ports:['Tangier Med','Casablanca']},
    Mozambique:{code:'MZ',currency:'MZN',defaultLanguage:'pt',ports:['Maputo','Beira','Nacala']},
    Namibia:{code:'NA',currency:'NAD',defaultLanguage:'en',ports:['Walvis Bay']},
    Niger:{code:'NE',currency:'XOF',defaultLanguage:'fr',ports:[]},
    Nigeria:{code:'NG',currency:'NGN',defaultLanguage:'en',ports:['Lagos','Tin Can Island','Apapa','Onne','Lekki']},
    Rwanda:{code:'RW',currency:'RWF',defaultLanguage:'en',ports:[]},
    Sao_Tome_and_Principe:{name:'São Tomé and Príncipe',code:'ST',currency:'STN',defaultLanguage:'pt',ports:['São Tomé']},
    Senegal:{code:'SN',currency:'XOF',defaultLanguage:'fr',ports:['Dakar']},
    Seychelles:{code:'SC',currency:'SCR',defaultLanguage:'en',ports:['Victoria']},
    Sierra_Leone:{code:'SL',currency:'SLE',defaultLanguage:'en',ports:['Freetown']},
    Somalia:{code:'SO',currency:'SOS',defaultLanguage:'so',ports:['Mogadishu','Berbera']},
    South_Africa:{name:'South Africa',code:'ZA',currency:'ZAR',defaultLanguage:'en',ports:['Durban','Cape Town','Gqeberha']},
    South_Sudan:{name:'South Sudan',code:'SS',currency:'SSP',defaultLanguage:'en',ports:[]},
    Sudan:{code:'SD',currency:'SDG',defaultLanguage:'ar',ports:['Port Sudan']},
    Tanzania:{code:'TZ',currency:'TZS',defaultLanguage:'sw',ports:['Dar es Salaam','Tanga']},
    Togo:{code:'TG',currency:'XOF',defaultLanguage:'fr',ports:['Lomé']},
    Tunisia:{code:'TN',currency:'TND',defaultLanguage:'ar',ports:['Rades','Sfax']},
    Uganda:{code:'UG',currency:'UGX',defaultLanguage:'en',ports:[]},
    Zambia:{code:'ZM',currency:'ZMW',defaultLanguage:'en',ports:[]},
    Zimbabwe:{code:'ZW',currency:'ZWG',defaultLanguage:'en',ports:['Beira corridor']}
  };
  const LANG = {
    en:{name:'English',short:'EN'},fr:{name:'Français',short:'FR'},pt:{name:'Português',short:'PT'},
    ar:{name:'العربية',short:'AR'},sw:{name:'Kiswahili',short:'SW'},zh:{name:'中文',short:'ZH'},ko:{name:'한국어',short:'KO'}
  };
  function clean(v){return String(v||'').trim();}
  function countryKey(name){return clean(name).replace(/[’']/g,'_').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'');}
  function getCountry(name){
    const n=clean(name)||'Nigeria';
    if(COUNTRIES[n]) return COUNTRIES[n];
    const key=countryKey(n);
    return COUNTRIES[key]||{name:n,code:'',currency:'USD',defaultLanguage:'en',ports:[]};
  }
  function getUser(){
    try{
      const raw=localStorage.getItem('vtg-auth');
      const auth=raw?JSON.parse(raw):null;
      return auth&&auth.user?auth.user:null;
    }catch{return null;}
  }
  function getContext(){
    const u=getUser();
    const country=clean(u?.country||localStorage.getItem('vtg-country')||'Nigeria');
    const language=clean(u?.preferredLanguage||localStorage.getItem('vtg-language')||'en');
    const c=getCountry(country);
    return {user:u,country,countryData:c,language:LANG[language]?language:'en',languageData:LANG[language]||LANG.en,currency:c.currency,role:u?.role||'visitor'};
  }
  function flag(code){
    if(!code||code.length!==2)return '🌍';
    return String.fromCodePoint(...code.toUpperCase().split('').map(x=>127397+x.charCodeAt(0)));
  }
  function formatMoney(value){
    const n=Number(value);
    if(!Number.isFinite(n)) return value;
    try{return new Intl.NumberFormat(undefined,{style:'currency',currency:getContext().currency,maximumFractionDigits:0}).format(n);}
    catch{return value;}
  }
  function apply(){
    const ctx=getContext();
    document.documentElement.lang=ctx.language;
    document.documentElement.dir=ctx.language==='ar'?'rtl':'ltr';
    document.documentElement.dataset.country=ctx.countryData.code||'';
    document.documentElement.dataset.language=ctx.language;
    document.documentElement.dataset.currency=ctx.currency;
    document.querySelectorAll('[data-vtg-country-name]').forEach(el=>el.textContent=ctx.country);
    document.querySelectorAll('[data-vtg-country-flag]').forEach(el=>el.textContent=flag(ctx.countryData.code));
    document.querySelectorAll('[data-vtg-currency]').forEach(el=>el.textContent=ctx.currency);
    document.querySelectorAll('[data-vtg-role]').forEach(el=>el.textContent=ctx.role==='visitor'?'Visitor':ctx.role.charAt(0).toUpperCase()+ctx.role.slice(1));
    const aiContext=document.getElementById('aiContext');
    if(aiContext) aiContext.textContent='Context: '+ctx.country+' '+flag(ctx.countryData.code)+' • '+(ctx.role==='visitor'?'Public visitor':ctx.role)+' • '+ctx.currency+' • Trade, sourcing & logistics';
    const title=document.getElementById('pageTitle');
    if(title && ctx.role!=='visitor'){
      const roleName=ctx.role==='buyer'?'Buyer':ctx.role==='supplier'?'Supplier':ctx.role==='bank'?'Bank / Finance':'Agent';
      title.textContent=roleName+' Trade OS — '+ctx.country;
    }
    const countryBadge=document.getElementById('vtgCountryContext');
    if(countryBadge) countryBadge.innerHTML=flag(ctx.countryData.code)+' <strong>'+ctx.country+'</strong><span>'+ctx.currency+' • '+(ctx.languageData.name)+'</span>';
    window.VTG_CONTEXT=ctx;
    window.VTG_FORMAT_MONEY=formatMoney;
    window.dispatchEvent(new CustomEvent('vtg:context',{detail:ctx}));
  }
  window.VTG_COUNTRIES=COUNTRIES;
  window.VTG_LANGUAGES=LANG;
  window.VTG_GET_CONTEXT=getContext;
  window.VTG_FORMAT_MONEY=formatMoney;
  window.addEventListener('storage',apply);
  document.addEventListener('DOMContentLoaded',function(){apply();});
  setTimeout(apply,400);
})();