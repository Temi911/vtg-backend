(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
let client=null,userId=null;
function cart(){try{const a=JSON.parse(localStorage.getItem('vtg-buyer-cart')||'[]');return Array.isArray(a)?a:[]}catch(_){return[]}}
function estimate(){
 const items=cart().map(x=>({product_id:String(x.id||''),name:String(x.name||'Product'),unit_price_usd:Number(x.price)||0,quantity:Math.max(0,Number(x.qty)||0),line_total_usd:(Number(x.price)||0)*(Number(x.qty)||0)}));
 const goods=items.reduce((n,x)=>n+x.line_total_usd,0),shipping=Math.max(0,Number($('shipping').value)||0),insurance=Math.max(0,Number($('insurance').value)||0),percent=Math.min(100,Math.max(0,Number($('duty').value)||0)),duty=goods*percent/100,other=Math.max(0,Number($('other').value)||0);
 return {title:'Landed cost estimate',goods_subtotal:+goods.toFixed(2),shipping_usd:+shipping.toFixed(2),insurance_usd:+insurance.toFixed(2),duty_percent:percent,duty_usd:+duty.toFixed(2),other_charges_usd:+other.toFixed(2),estimated_total_usd:+(goods+shipping+insurance+duty+other).toFixed(2),cart_snapshot:items};
}
async function session(){
 const ready=await window.VTG_AUTH_READY;
 if(!ready?.client)throw new Error('VTG secure sign-in is not ready. Refresh and try again.');
 const {data,error}=await ready.client.auth.getSession();if(error)throw error;
 if(!data.session)throw new Error('Please sign in to save estimates to your VTG account.');
 client=ready.client;userId=data.session.user.id;
}
function notice(msg){let el=$('landedCostSaveStatus');if(!el){el=document.createElement('p');el.id='landedCostSaveStatus';el.className='notice';$('saveEstimate').insertAdjacentElement('afterend',el)}el.textContent=msg}
function savedPanel(){
 if($('savedLandedEstimates'))return;
 const section=document.createElement('section');section.id='savedLandedEstimates';section.className='panel';section.style.marginTop='18px';
 section.innerHTML='<div class="panelHead"><div><h2>Saved estimates</h2><p class="desc">Saved privately to your buyer account.</p></div><button class="btn" type="button" id="refreshLandedEstimates">Refresh</button></div><div class="panelBody" id="savedLandedEstimateRows"><div class="empty">Loading saved estimates…</div></div>';
 $('page-cart').appendChild(section);$('refreshLandedEstimates').addEventListener('click',loadSaved);
}
async function loadSaved(){
 const host=$('savedLandedEstimateRows');if(!host||!client)return;
 const {data,error}=await client.from('buyer_landed_cost_estimates').select('id,title,goods_subtotal,shipping_usd,insurance_usd,duty_usd,other_charges_usd,estimated_total_usd,cart_snapshot,created_at').order('created_at',{ascending:false}).limit(25);
 if(error){host.innerHTML='<div class="empty">'+esc(error.message)+'</div>';return}
 host.innerHTML=data?.length?data.map(x=>'<article class="row"><div class="rowMain"><strong>'+esc(x.title)+'</strong><p>'+esc(new Date(x.created_at).toLocaleString())+' · '+(x.cart_snapshot||[]).length+' cart item(s)</p><p>Goods '+money(x.goods_subtotal)+' · Shipping '+money(x.shipping_usd)+' · Insurance '+money(x.insurance_usd)+' · Duty '+money(x.duty_usd)+' · Other '+money(x.other_charges_usd)+'</p></div><strong>'+money(x.estimated_total_usd)+'</strong></article>').join(''):'<div class="empty">No saved estimates yet.</div>';
}
async function save(event){
 event.preventDefault();event.stopImmediatePropagation();const b=$('saveEstimate');b.disabled=true;
 try{await session();const {error}=await client.from('buyer_landed_cost_estimates').insert({...estimate(),buyer_id:userId});if(error)throw error;notice('Your landed-cost estimate has been saved to your VTG account.');await loadSaved()}
 catch(e){notice(e.message||'Could not save estimate.')}
 finally{b.disabled=false}
}
async function init(){
 if(!$('saveEstimate')||!$('page-cart'))return;
 $('saveEstimate').addEventListener('click',save,true);
 savedPanel();
 try{await session();await loadSaved()}catch(e){const host=$('savedLandedEstimateRows');if(host)host.textContent=e.message}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();