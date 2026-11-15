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
  /* White screen with the VTG "V"; a thin ring draws a full circle around it, then its tail joins up. */
  var PATH='M7 10H31L51 76L72 10H96L65 101H39Z';
  var style=document.createElement('style');
  style.textContent='html.vtg-agreement-checking body{visibility:hidden!important}'
    +'#vtg-guard-loader{display:none;position:fixed;inset:0;z-index:2147483647;background:#fff;align-items:center;justify-content:center;flex-direction:column;gap:16px;font:600 14px Manrope,Arial,sans-serif;color:#5b6472}'
    +'html.vtg-agreement-checking #vtg-guard-loader{display:flex}'
    +'#vtg-guard-loader svg{width:128px;height:128px;overflow:visible}'
    +'#vtg-guard-loader .g{fill:#f6e7e6;stroke:#ecd0cf;stroke-width:1}'
    +'#vtg-guard-loader .o{fill:none;stroke:#b51a18;stroke-width:2.2;stroke-linejoin:round;stroke-dasharray:420;stroke-dashoffset:420;animation:vtgGDraw 1.9s ease-in-out infinite}'
    +'#vtg-guard-loader .f{fill:#a20d12;animation:vtgGRise 1.9s ease-in-out infinite}'
    +'#vtg-guard-loader .t{fill:none;stroke:#f1e3e2;stroke-width:1}'
    +'#vtg-guard-loader .r{fill:none;stroke:#b51a18;stroke-width:1.8;stroke-linecap:round;stroke-dasharray:0 100;animation:vtgGRing 1.9s cubic-bezier(.45,.05,.4,.95) infinite}'
    +'@keyframes vtgGDraw{0%{stroke-dashoffset:420}55%,100%{stroke-dashoffset:0}}'
    +'@keyframes vtgGRise{0%{transform:translateY(104px)}65%,100%{transform:translateY(0)}}'
    +'@keyframes vtgGRing{0%{stroke-dasharray:0 100;stroke-dashoffset:0}55%,68%{stroke-dasharray:100 100;stroke-dashoffset:0}100%{stroke-dasharray:0 100;stroke-dashoffset:-100}}'
    +'@media (prefers-reduced-motion:reduce){#vtg-guard-loader .o,#vtg-guard-loader .r{animation:none;stroke-dashoffset:0;stroke-dasharray:100 100}#vtg-guard-loader .o{stroke-dasharray:none}#vtg-guard-loader .f{animation:none}}';
  document.head.appendChild(style);
  var loader=document.createElement('div');
  loader.id='vtg-guard-loader';loader.setAttribute('role','status');loader.setAttribute('aria-label','Loading');
  loader.innerHTML='<svg viewBox="-20 -16 143 143" aria-hidden="true"><defs><clipPath id="vtgGc"><path d="'+PATH+'"/></clipPath></defs>'
    +'<path class="g" d="'+PATH+'"/><g clip-path="url(#vtgGc)"><rect class="f" x="0" y="0" width="105" height="110"/></g>'
    +'<path class="o" d="'+PATH+'"/><circle class="t" cx="51.5" cy="55.5" r="66"/>'
    +'<circle class="r" cx="51.5" cy="55.5" r="66" pathLength="100" transform="rotate(-90 51.5 55.5)"/></svg>';
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
      // An approved supplier must complete document verification before opening
      // operational tools. Keep the embedded Company & verification page available.
      if(effective==='supplier'&&!user.pendingBusinessVerification&&user.businessVerificationStatus!=='verified'){
        if(path!=='/supplier-dashboard.html'||location.hash!=='#page-profile'){
          location.replace('/supplier-dashboard.html#page-profile');
          return;
        }
      }
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