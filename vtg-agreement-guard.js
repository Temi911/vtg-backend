/* VTG public workspace agreement gate.
   Runs before dashboard content is revealed; preview links remain available. */
(function(){
  'use strict';
  var params=new URLSearchParams(location.search);
  if(params.get('preview')==='1') return;
  var path=location.pathname;
  var expected=path==='/buyer-dashboard.html'?'buyer':
    path==='/supplier-dashboard.html'?'supplier':
    path==='/bank-trade-os.html'?'bank':
    path==='/verification.html'?(params.get('role')||''):'';
  if(!expected) return;

  var root=document.documentElement;
  root.classList.add('vtg-agreement-checking');
  var style=document.createElement('style');
  style.textContent='html.vtg-agreement-checking body{visibility:hidden!important}html.vtg-agreement-checking:after{content:"Securing your VTG workspace…";visibility:visible;position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#17191b;color:#f3efe6;font:600 14px Manrope,Arial,sans-serif;letter-spacing:.02em}';
  document.head.appendChild(style);

  function signin(){
    var next=path+location.search+location.hash;
    location.replace('/signin.html?role='+encodeURIComponent(['buyer','supplier','bank'].includes(expected)?expected:'buyer')+'&next='+encodeURIComponent(next));
  }
  function fail(message){
    root.classList.remove('vtg-agreement-checking');
    var panel=document.createElement('div');
    panel.setAttribute('role','alert');
    panel.style.cssText='position:fixed;z-index:2147483647;inset:0;display:grid;place-items:center;padding:24px;background:#17191b;color:#f3efe6;font:14px/1.7 Manrope,Arial,sans-serif;text-align:center';
    panel.innerHTML='<div style="max-width:440px"><strong>VTG access check unavailable</strong><p></p><a href="/signin.html" style="color:#d8bd8b">Return to sign in</a></div>';
    panel.querySelector('p').textContent=message||'Please sign in again to continue.';
    document.body.appendChild(panel);
  }
  var script=document.createElement('script');
  script.src='/vtg-supabase-auth.js?v=20261105-agreement-1';
  script.onload=async function(){
    try{
      var auth=await window.VTG_AUTH_READY;
      var current=await auth.getCurrent();
      if(!current){signin();return;}
      var user=current.user||{};
      if(user.accountEnvironment==='staff'){location.replace('/workforce-access.html');return;}
      var effective=user.role==='buyer'&&user.requestedRole?user.requestedRole:user.role;
      if(!['buyer','supplier','bank'].includes(effective)){signin();return;}
      if(expected&&expected!==effective&&path!=='/verification.html'){signin();return;}
      if(path==='/verification.html'&&expected&&expected!==effective){signin();return;}
      if(user.agreementRequired){location.replace('/signup-agreement.html?next='+encodeURIComponent(path+location.search+location.hash));return;}
      root.classList.remove('vtg-agreement-checking');
    }catch(error){fail(error&&error.message);}
  };
  script.onerror=function(){fail('The secure VTG sign-in service could not be loaded. Refresh the page or sign in again.');};
  document.head.appendChild(script);
})();