(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
let client=null,userId=null;
async function cart(){
 const {data:state,error}=await client.from('buyer_cart_states').select('items').eq('buyer_id',userId).maybeSingle();
 if(error)throw error;
 const raw=Array.isArray(state?.items)?state.items:[];
 const quantities=raw.map(x=>({id:String(x.id||''),qty:Math.floor(Number(x.qty)||0)})).filter(x=>x.id&&x.qty>0);
 if(!quantities.length)return [];
 const ids=[...new Set(quantities.map(x=>x.id))];
 const {data:products,error:productError}=await client.from('products').select('id,name,unit_price,currency,is_active').in('id',ids);
 if(productError)throw productError;
 const byId=new Map((products||[]).map(p=>[p.id,p]));
 return quantities.map(item=>{
  const p=byId.get(item.id);
  if(!p||p.is_active===false)throw new Error('A cart product is no longer active. Refresh your marketplace cart before estimating landed cost.');
  if(String(p.currency||'USD').toUpperCase()!=='USD')throw new Error('Your cart contains non-USD products. Separate currency totals before preparing a USD landed-cost estimate.');
  const price=Number(p.unit_price);
  if(!Number.isFinite(price)||price<0)throw new Error('A cart product has an invalid price. Refresh the marketplace cart.');
  return {id:p.id,name:p.name,price,qty:item.qty};
 });
}
async function estimate(){
 const cartItems=await cart();
 const items=cartItems.map(x=>({product_id:String(x.id),name:String(x.name||'Product'),unit_price_usd:Number(x.price)||0,quantity:Math.max(0,Number(x.qty)||0),line_total_usd:(Number(x.price)||0)*(Number(x.qty)||0)}));
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
 const {data,error}=await client.from('buyer_landed_cost_estimates').select('id,title,goods_subtotal,shipping_usd,insurance_usd,duty_percent,duty_usd,other_charges_usd,estimated_total_usd,cart_snapshot,created_at').order('created_at',{ascending:false}).limit(25);
 if(error){host.innerHTML='<div class="empty">'+esc(error.message)+'</div>';return}
 host.innerHTML=data?.length?data.map(x=>'<article class="row"><div class="rowMain"><strong>'+esc(x.title)+'</strong><p>'+esc(new Date(x.created_at).toLocaleString())+' · '+(x.cart_snapshot||[]).length+' cart item(s)</p><p>Goods '+money(x.goods_subtotal)+' · Shipping '+money(x.shipping_usd)+' · Insurance '+money(x.insurance_usd)+' · Duty ('+Number(x.duty_percent||0)+'%) '+money(x.duty_usd)+' · Other '+money(x.other_charges_usd)+'</p></div><strong>'+money(x.estimated_total_usd)+'</strong></article>').join(''):'<div class="empty">No saved estimates yet.</div>';
}
async function save(event){
 event.preventDefault();event.stopImmediatePropagation();const b=$('saveEstimate');b.disabled=true;
 try{await session();const payload=await estimate();if(!payload.cart_snapshot.length)throw new Error('Add live marketplace products to your account cart before saving a landed-cost estimate.');const {error}=await client.from('buyer_landed_cost_estimates').insert({...payload,buyer_id:userId});if(error)throw error;notice('Your landed-cost estimate has been saved to your VTG account.');await loadSaved()}
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