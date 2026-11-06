(function(){
  'use strict';
  function esc(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function showNotice(status,role,userId){
    const key='vtg-verification-notice-dismissed:'+userId;
    if(sessionStorage.getItem(key))return;
    const rejected=['rejected','needs_correction'].includes(String(status||'').toLowerCase());
    const title=rejected?'Action needed: update your business verification':'Complete your business verification';
    const body=rejected?'VTG has requested a correction to one or more documents. Review the notes and submit the updated information.':'Your '+role+' workspace is ready. Submit your company documents so VTG can review and verify your business.';
    const wrap=document.createElement('div');
    wrap.id='vtgBusinessVerificationNotice';
    wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-labelledby','vtgVerificationTitle');
    wrap.innerHTML='<div class="vtg-vn-backdrop"></div><section class="vtg-vn-card"><button type="button" class="vtg-vn-close" aria-label="Dismiss notification">×</button><div class="vtg-vn-kicker">VTG BUSINESS VERIFICATION</div><h2 id="vtgVerificationTitle">'+title+'</h2><p>'+body+'</p><div class="vtg-vn-actions"><a class="vtg-vn-primary" href="/verification.html?role='+encodeURIComponent(role)+'">Complete verification</a><button type="button" class="vtg-vn-later">Not now</button></div><small>Verification is reviewed by VTG. Your dashboard remains available while your application is pending.</small></section>';
    const style=document.createElement('style');
    style.textContent='#vtgBusinessVerificationNotice{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:20px;font-family:inherit}#vtgBusinessVerificationNotice .vtg-vn-backdrop{position:absolute;inset:0;background:rgba(8,14,20,.58);backdrop-filter:blur(3px)}#vtgBusinessVerificationNotice .vtg-vn-card{position:relative;width:min(470px,100%);padding:30px;background:var(--surface,#fff);color:var(--ink,#17212b);border:1px solid var(--line,#dfe4e9);border-radius:18px;box-shadow:0 24px 80px #0004}#vtgBusinessVerificationNotice .vtg-vn-close{position:absolute;right:13px;top:10px;border:0;background:transparent;color:inherit;font-size:25px;cursor:pointer}#vtgBusinessVerificationNotice .vtg-vn-kicker{font-size:9px;letter-spacing:.16em;font-weight:800;color:var(--accent,#a5232b)}#vtgBusinessVerificationNotice h2{font-size:22px;line-height:1.2;margin:12px 25px 10px 0}#vtgBusinessVerificationNotice p{font-size:12px;line-height:1.7;color:var(--muted,#687687)}#vtgBusinessVerificationNotice .vtg-vn-actions{display:flex;gap:9px;flex-wrap:wrap;margin:20px 0 14px}#vtgBusinessVerificationNotice .vtg-vn-primary,#vtgBusinessVerificationNotice .vtg-vn-later{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:10px 14px;border-radius:9px;font-size:11px;font-weight:800;text-decoration:none;cursor:pointer}#vtgBusinessVerificationNotice .vtg-vn-primary{background:var(--accent,#a5232b);color:white}#vtgBusinessVerificationNotice .vtg-vn-later{border:1px solid var(--line,#dfe4e9);background:transparent;color:inherit}#vtgBusinessVerificationNotice small{display:block;color:var(--muted,#687687);font-size:9px;line-height:1.6}';
    document.head.appendChild(style);document.body.appendChild(wrap);
    const dismiss=()=>{sessionStorage.setItem(key,'1');wrap.remove();style.remove();};
    wrap.querySelector('.vtg-vn-close').addEventListener('click',dismiss);
    wrap.querySelector('.vtg-vn-later').addEventListener('click',dismiss);
    wrap.querySelector('.vtg-vn-backdrop').addEventListener('click',dismiss);
  }
  async function init(){
    try{
      const auth=await window.VTG_AUTH_READY;
      const current=await auth.getCurrent();
      const user=current?.user;if(!user||!['supplier','bank'].includes(user.role))return;
      const role=user.role,table=role==='supplier'?'supplier_profiles':'bank_profiles';
      let status=user.businessVerificationStatus||'pending';
      const result=await auth.client.from(table).select('verification_status').eq('user_id',user.id).maybeSingle();
      if(!result.error&&result.data?.verification_status)status=result.data.verification_status;
      if(String(status).toLowerCase()!=='verified')showNotice(status,role,user.id);
    }catch(error){console.warn('VTG verification reminder unavailable:',error?.message||error);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();