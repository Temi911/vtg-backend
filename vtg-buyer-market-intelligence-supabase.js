(function(){
'use strict';
const $=id=>document.getElementById(id);
let client=null,busy=false;
const esc=value=>typeof window.esc==='function'?window.esc(value):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function set(id,value){const node=$(id);if(node)node.textContent=value??'';}
async function session(){
 const ready=await window.VTG_AUTH_READY;if(!ready?.client)throw new Error('Secure VTG sign-in is not ready.');
 client=ready.client;const {data,error}=await client.auth.getSession();if(error)throw error;
 if(!data.session)throw new Error('Sign in as a buyer to access market intelligence.');
 const {data:profile,error:pe}=await client.from('profiles').select('role,is_active').eq('id',data.session.user.id).single();
 if(pe)throw pe;if(profile.role!=='buyer'||!profile.is_active)throw new Error('An active buyer account is required.');
}
async function invoke(action){
 if(!client)await session();
 const {data,error}=await client.functions.invoke('vtg-market-intelligence',{body:{action}});
 if(error)throw error;if(!data)throw new Error('Market intelligence returned an empty response.');
 return data;
}
async function status(){
 const node=$('vtgIntelStatus');if(!node)return;
 set('vtgIntelStatus','Checking the VTG market-intelligence service…');
 try{
  const data=await invoke('status'),providers=data.providers||{};
  set('vtgIntelFx',providers.fx?.message||'FX provider not connected.');
  set('vtgIntelTariff',providers.tariffs?.message||'Tariff-data provider not connected.');
  set('vtgIntelFreight',providers.freight?.message||'Freight-data provider not connected.');
  set('vtgIntelStatus',(data.api?.connected?'VTG service connected':'VTG service unavailable')+' · '+(data.api?.checkedAt?new Date(data.api.checkedAt).toLocaleString():'check time unavailable')+'. '+(data.note||''));
 }catch(error){
  set('vtgIntelStatus','Market-intelligence service unavailable. Treat market inputs as unverified.');
  set('vtgIntelFx','Unverified — service check failed.');
  set('vtgIntelTariff','Unverified — service check failed.');
  set('vtgIntelFreight','Unverified — service check failed.');
  if(window.say)window.say(error.message||'Could not check market-intelligence status.');
 }
}
async function news(){
 const host=$('intelNewsRows');if(!host)return;
 host.innerHTML='<div class="empty">Loading source-linked trade news…</div>';
 try{
  const data=await invoke('news'),items=Array.isArray(data.items)?data.items:[];
  if(!items.length){host.innerHTML='<div class="empty">'+esc(data.error||'No current source-linked trade news is available.')+'</div>';return;}
  host.innerHTML=items.map(item=>{
   const date=item.discoveredAt?new Date(item.discoveredAt).toLocaleString():'Discovery time unavailable';
   return '<article class="row" style="display:block;padding:14px 0"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><strong>'+esc(item.title)+'</strong><span class="chip">'+esc(item.topic||'Trade & logistics')+'</span></div><p>'+esc(item.summary||'Open the original source to review the report.')+'</p><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><small class="muted">'+esc(item.source||item.domain||'Publisher not identified')+' · '+esc(date)+' · '+(item.trusted?'Trusted-domain match':'Source not verified')+'</small>'+(item.url?'<a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer" style="color:var(--red);font-weight:800">Read original source ↗</a>':'')+'</div></article>';
  }).join('');
  if(data.note){const note=document.createElement('p');note.className='small muted';note.textContent=data.note;host.appendChild(note);}
 }catch(error){host.innerHTML='<div class="empty">Trade news is temporarily unavailable. '+esc(error.message||'Please try again later.')+'</div>';}
}
async function refresh(){if(busy)return;busy=true;try{await session();await Promise.all([status(),news()]);}finally{busy=false;}}
function init(){
 if(!$('intelNewsRows')&&!$('vtgIntelStatus'))return;
 $('vtgIntelRefresh')?.addEventListener('click',status);
 $('refreshIntelNews')?.addEventListener('click',news);
 Promise.resolve(window.VTG_AUTH_READY).then(()=>{status();news();}).catch(error=>{set('vtgIntelStatus',error.message||'Sign in to check market intelligence.');if($('intelNewsRows'))$('intelNewsRows').textContent='Sign in to load source-linked trade news.';});
}
window.VTGBuyerIntel={status,news,refresh};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();