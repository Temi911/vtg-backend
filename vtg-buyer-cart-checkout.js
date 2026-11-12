(function(){
 'use strict';
 const CART_KEY='vtg-buyer-cart-cart';
 const $=id=>document.getElementById(id);
 const read=()=>{try{const v=JSON.parse(localStorage.getItem(CART_KEY)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}};
 const save=items=>{try{localStorage.setItem(CART_KEY,JSON.stringify(items))}catch(_){}window.dispatchEvent(new CustomEvent('vtg:buyer-cart-changed',{detail:{items}}));window.dispatchEvent(new CustomEvent('vtg:buyer-cart-hydrated'))};
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 function note(msg,bad){const n=$('cartCheckoutNotice');if(n){n.textContent=msg;n.className='notice'+(bad?' error':'');n.hidden=!msg}}
 let busy=false;
 async function checkout(){
  if(busy)return;
  const items=read().filter(x=>x&&uuid.test(String(x.id||'')));
  if(!items.length){note('Your cart has no live supplier products to request quotations for.',true);return}
  let auth;try{auth=await window.VTG_AUTH_READY}catch(_){auth={client:window.VTG_SUPABASE}}
  const client=auth?.client||window.VTG_SUPABASE;
  if(!client){note('VTG secure sign-in service is unavailable. Refresh and try again.',true);return}
  const {data}=await client.auth.getSession();
  if(!data?.session){note('Sign in with your buyer account to request quotations.',true);return}
  const dest=($('cartDestination')?.value||'').trim()||'Tin Can Island, Lagos';
  const msg=($('cartCheckoutMessage')?.value||'').trim();
  busy=true;const btn=$('cartCheckoutBtn');if(btn)btn.disabled=true;note('Sending quotation requests…');
  const done=[],failed=[];
  for(const it of items){
   try{
    const r=await client.rpc('vtg_create_trade_quote_request',{p_product_id:it.id,p_quantity:Math.max(1,Math.floor(Number(it.qty)||1)),p_origin_country:null,p_destination:dest,p_buyer_message:msg||('Requested from cart: '+(it.name||'product'))});
    if(r.error)throw r.error;done.push({id:it.id,ref:r.data?.order_reference||''});
   }catch(e){failed.push((it.name||'Item')+': '+(e.message||'could not be requested'))}
  }
  if(done.length){const ids=new Set(done.map(d=>d.id));save(read().filter(x=>!ids.has(x.id)))}
  note((done.length?done.length+' quotation request'+(done.length>1?'s':'')+' sent ('+done.map(d=>d.ref).filter(Boolean).join(', ')+'). Suppliers can now reply with a price; track them under RFQs & quotations. ':'')+(failed.length?'Not sent — '+failed.join(' · '):''),!done.length);
  if(done.length){if(typeof window.loadLiveQuotes==='function')window.loadLiveQuotes();if(typeof window.loadLiveEnquiries==='function')window.loadLiveEnquiries()}
  busy=false;if(btn)btn.disabled=false;
 }
 document.addEventListener('DOMContentLoaded',()=>{$('cartCheckoutBtn')?.addEventListener('click',checkout)});
})();
