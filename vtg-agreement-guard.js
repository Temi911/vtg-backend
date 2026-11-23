/* VTG public workspace agreement gate. Runs before protected dashboards are revealed. */
(function(){
  'use strict';
  var path=location.pathname;
  var params=new URLSearchParams(location.search);
  var expected=path==='/buyer-dashboard.html'?'buyer':
    path==='/supplier-dashboard.html'?'supplier':
    path==='/bank-trade-os.html'?'bank':
    path==='/verification.html'?(params.get('role')||''):'';
  if(!['/buyer-dashboard.html','/supplier-dashboard.html','/bank-trade-os.html','/verification.html'].includes(path)) return;

  var root=document.documentElement;
  root.classList.add('vtg-agreement-checking');
  /* White screen with the complete VTG logo; a thin red line circles it until the check finishes. */
  var PATH='M7 10H31L51 76L72 10H96L65 101H39Z';
  var PAT='<pattern id="ID" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#a20d12"/><path d="M11 2L19 11L11 20L3 11Z" fill="none" stroke="#ef9a88" stroke-width="1.7"/><path d="M11 6L15 11L11 16L7 11Z" fill="none" stroke="#f5c0a9" stroke-width="1.1"/><circle cx="11" cy="11" r="1.5" fill="#f3b49f"/><path d="M1 1L5 5M17 17L21 21M21 1L17 5M5 17L1 21" stroke="#d95545" stroke-width="1"/></pattern>';
  var style=document.createElement('style');
  style.textContent='html.vtg-agreement-checking body{visibility:hidden!important}'
    +'#vtg-guard-loader{display:none;position:fixed;inset:0;z-index:2147483647;background:#fff;direction:ltr;unicode-bidi:isolate;align-items:center;justify-content:center}'
    +'html.vtg-agreement-checking #vtg-guard-loader{display:flex}'
    +'#vtg-guard-loader>svg{width:min(300px,72vw);height:auto;aspect-ratio:1;overflow:visible}'
    +'#vtg-guard-loader .t{fill:none;stroke:#f3e6e5;stroke-width:1}'
    +'#vtg-guard-loader .r{fill:none;stroke:#b51a18;stroke-width:2;stroke-linecap:round;stroke-dasharray:26 74;transform-box:fill-box;transform-origin:center;animation:vtgGSpin 1.15s linear infinite}'
    +'@keyframes vtgGSpin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);
  var loader=document.createElement('div');
  loader.id='vtg-guard-loader';loader.setAttribute('role','status');loader.setAttribute('aria-label','Loading');
  loader.innerHTML='<svg translate="no" class="notranslate" viewBox="0 0 320 320" aria-hidden="true"><circle class="t" cx="160" cy="160" r="150"/><circle class="r" cx="160" cy="160" r="150" pathLength="100"/>'
    +'<svg x="50" y="129.7" width="220" height="60.5" viewBox="0 0 400 110" overflow="visible"><defs>'+PAT.replace('ID','gp')+'<clipPath id="gc"><path d="'+PATH+'"/></clipPath></defs>'
    +'<g clip-path="url(#gc)"><rect width="105" height="110" fill="url(#gp)"/></g><path d="'+PATH+'" fill="none" stroke="#b51a18" stroke-width="1"/>'
    +'<g fill="#b51a18" font-family="Georgia,serif" font-weight="700"><text x="108" y="42" font-size="27" letter-spacing="8">INTAGE</text><text x="104" y="76" font-size="27" letter-spacing="1.8">TRADE GLOBAL</text></g>'
    +'<text x="109" y="98" fill="#b51a18" font-family="Arial,sans-serif" font-size="8.3" letter-spacing="4.7">AFRICA TRADE PLATFORM</text></svg></svg>';
  root.appendChild(loader);

  function signin(){
    var next=path+location.search+location.hash;
    location.replace('/signin.html?role='+encodeURIComponent(['buyer','supplier','bank'].includes(expected)?expected:'buyer')+'&next='+encodeURIComponent(next));
  }
  function fail(message){
    root.classList.remove('vtg-agreement-checking');
    var panel=document.createElement('div');
    panel.setAttribute('role','alert');
    panel.style.cssText='position:fixed;z-index:2147483647;inset:0;display:grid;place-items:center;padding:24px;background:#fff;color:#2b2f36;font:14px/1.7 Manrope,Arial,sans-serif;text-align:center';
    panel.innerHTML='<div style="max-width:440px"><strong>VTG access check unavailable</strong><p></p><a href="/signin.html" style="color:#b51a18;font-weight:700">Return to sign in</a></div>';
    panel.querySelector('p').textContent=message||'Please sign in again to continue.';
    function attach(){document.body.appendChild(panel);}
    if(document.body)attach();else document.addEventListener('DOMContentLoaded',attach,{once:true});
  }
  async function validateSession(){
    try{
      var auth=await window.VTG_AUTH_READY;
      var current=await auth.getCurrent();
      if(!current){signin();return;}
      var user=current.user||{};
      if(path==='/verification.html'&&user.role==='admin'&&user.accountEnvironment==='staff'){
        root.classList.remove('vtg-agreement-checking');
        return;
      }
      if(user.accountEnvironment==='staff'){location.replace('/workforce-access.html');return;}
      var effective=user.role==='buyer'&&user.requestedRole?user.requestedRole:user.role;
      if(!['buyer','supplier','bank'].includes(effective)){signin();return;}

      // Business applicants use the dashboard's embedded account-status centre.
      // The legacy standalone verification page is retained for administrators only.
      if(path==='/verification.html'&&['supplier','bank'].includes(effective)){
        location.replace((effective==='supplier'?'/supplier-dashboard.html':'/bank-trade-os.html')+'#'+(effective==='supplier'?'page-profile':'settings'));
        return;
      }
      if(user.pendingBusinessVerification){
        var applicantPath=effective==='supplier'?'/supplier-dashboard.html':'/bank-trade-os.html';
        var applicantHash=effective==='supplier'?'#page-profile':'#settings';
        if(path!==applicantPath){location.replace(applicantPath+applicantHash);return;}
        root.setAttribute('data-vtg-pending-application','true');
        if(location.hash!==applicantHash)location.hash=applicantHash;
      }
      // Business Applications approval grants supplier workspace access.
      // Company document verification remains a separate status shown inside the
      // workspace; it must not redirect an approved supplier away from the dashboard.
      if(expected&&expected!==effective){signin();return;}
      if(typeof user.agreementRequired!=='boolean')throw new Error('VTG could not confirm your current agreement status.');
      if(user.agreementRequired){location.replace('/signup-agreement.html?next='+encodeURIComponent(path+location.search+location.hash));return;}
      root.classList.remove('vtg-agreement-checking');
    }catch(error){fail(error&&error.message);}
  }
  if(window.VTG_AUTH_READY){validateSession();}
  else{
    var script=document.createElement('script');
    script.src='/vtg-supabase-auth.js?v=20261105-agreement-3';
    script.onload=validateSession;
    script.onerror=function(){fail('The secure VTG sign-in service could not be loaded. Refresh the page or sign in again.');};
    document.head.appendChild(script);
  }
})();