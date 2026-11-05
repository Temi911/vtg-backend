(function(){
'use strict';
const CART_KEY='vtg-buyer-cart-cart';
let client=null,buyerId=null,hydrated=false,syncChain=Promise.resolve(),cartChannel=null;
const $=id=>document.getElementById(id);
function readLocal(){try{const v=JSON.parse(localStorage.getItem(CART_KEY)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}}
function writeLocal(items){try{localStorage.setItem(CART_KEY,JSON.stringify(items))}catch(_){}}
function status(message){const el=$('cartCloudStatus');if(el)el.textContent=message}
function clean(items){return (Array.isArray(items)?items:[]).map(x=>({
 id:String(x.id||''),name:String(x.name||'Product').slice(0,240),
 price:Math.max(0,Number(x.price??x.unit_price_usd)||0),
 qty:Math.max(1,Math.floor(Number(x.qty)||1)),
 cat:String(x.cat||x.category||'').slice(0,120),
 desc:String(x.desc||x.description||'').slice(0,1000),
 supplier_name:String(x.supplier_name||'').slice(0,240),
 image_url:String(x.image_url||'').slice(0,2000),
 hs_code:String(x.hs_code||'').slice(0,40),
 origin_country:String(x.origin_country||x.supplier_country||'').slice(0,100)
 })).filter(x=>x.id||x.name)}
async function persist(items){
 if(!client||!buyerId||!hydrated)return;
 const payload={buyer_id:buyerId,items:clean(items),updated_at:new Date().toISOString()};
 syncChain=syncChain.then(async()=>{
  const {error}=await client.from('buyer_cart_states').upsert(payload,{onConflict:'buyer_id'});
  if(error)throw error;
 });
 try{await syncChain;status('Cart synced securely to your VTG account.')}
 catch(error){status('Cart is saved on this device, but cloud sync failed: '+(error.message||'Please try again.'))}
}
async function init(){
 try{
  const auth=await window.VTG_AUTH_READY;
  client=auth?.client;
  if(!client){status('Cloud cart is unavailable. Your cart remains on this device.');return}
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  if(!data.session){status('Preview cart: sign in to sync items across devices.');return}
  buyerId=data.session.user.id;
  const {data:row,error:loadError}=await client.from('buyer_cart_states').select('items,updated_at').eq('buyer_id',buyerId).maybeSingle();
  if(loadError)throw loadError;
  const local=clean(readLocal());
  if(row&&Array.isArray(row.items)){
   writeLocal(clean(row.items));
  }else if(local.length){
   writeLocal(local);
  }
  hydrated=true;
  window.dispatchEvent(new CustomEvent('vtg:buyer-cart-hydrated'));
  cartChannel=client.channel('buyer-cart-'+buyerId)
   .on('postgres_changes',{event:'*',schema:'public',table:'buyer_cart_states',filter:'buyer_id=eq.'+buyerId},payload=>{
    if(payload.eventType==='DELETE')return;
    writeLocal(clean(payload.new?.items||[]));
    window.dispatchEvent(new CustomEvent('vtg:buyer-cart-hydrated'));
    status('Cart synced live across your signed-in devices.');
   })
   .subscribe(state=>{
    if(state==='SUBSCRIBED')status('Cart synced live across your signed-in devices.');
    else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT')status('Cart is saved to your VTG account. Live updates are temporarily unavailable.');
   });
  if(!row&&local.length)await persist(local);
  else status('Cart synced securely to your VTG account.');
 }catch(error){status('Cloud cart could not load: '+(error.message||'Your local cart is still available.'))}
}
window.addEventListener('vtg:buyer-cart-changed',event=>{
 const items=clean(event.detail?.items||readLocal());
 if(hydrated)persist(items);
});
window.addEventListener('storage',event=>{
 if(event.key===CART_KEY&&event.newValue){
  try{const items=clean(JSON.parse(event.newValue));window.dispatchEvent(new CustomEvent('vtg:buyer-cart-hydrated'));}
  catch(_){}
 }
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();