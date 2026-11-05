(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(value,currency)=>String(currency||'USD')+' '+Number(value||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const state={client:null,buyerId:null,products:[],cart:[],channel:null,loading:true,error:null,saving:false};
const status=message=>{const node=$('cartCloudStatus');if(node)node.textContent=message;};
function setCounts(){const count=state.cart.reduce((n,item)=>n+item.qty,0);if($('cartCount'))$('cartCount').textContent=count;if($('statCart'))$('statCart').textContent=count;}
function cartSubtotalByCurrency(){
 const totals={};
 state.cart.forEach(item=>{const p=state.products.find(x=>x.id===item.id);if(!p)return;totals[p.currency]=(totals[p.currency]||0)+Number(p.unit_price||0)*item.qty;});
 return totals;
}
function renderCart(){
 const host=$('cartRows');if(!host)return;
 setCounts();
 if(!state.buyerId){host.innerHTML='<div class="empty">Sign in to your buyer account to use a live, account-synced cart.</div>';return;}
 if(!state.cart.length){host.innerHTML='<div class="empty">Your cart is empty. Browse the live marketplace and add a supplier listing.</div>';return;}
 host.innerHTML=state.cart.map(item=>{
  const p=state.products.find(x=>x.id===item.id);if(!p)return '';
  return '<div class="cartLine"><div class="rowMain"><strong>'+esc(p.name)+'</strong><p>'+money(p.unit_price,p.currency)+' / unit · MOQ '+Number(p.minimum_order_quantity||1).toLocaleString()+'</p></div><div class="qty"><button type="button" data-q="'+esc(p.id)+'" data-d="-1" aria-label="Decrease quantity">−</button><b>'+item.qty+'</b><button type="button" data-q="'+esc(p.id)+'" data-d="1" aria-label="Increase quantity">+</button></div><b>'+money(Number(p.unit_price||0)*item.qty,p.currency)+'</b><button class="btn" type="button" data-rem="'+esc(p.id)+'">Remove</button></div>';
 }).join('');
 const totals=cartSubtotalByCurrency(),keys=Object.keys(totals);
 if($('goodsTotal'))$('goodsTotal').textContent=keys.length===1?money(totals[keys[0]],keys[0]):keys.length?keys.map(k=>money(totals[k],k)).join(' · '):'—';
 if($('grandTotal'))$('grandTotal').textContent=keys.length===1?money(totals[keys[0]]+(Number($('shipping')?.value)||0)+(Number($('insurance')?.value)||0)+totals[keys[0]]*(Number($('duty')?.value)||0)/100+(Number($('other')?.value)||0),keys[0]):keys.length?'Mixed currencies — calculate separately':'—';
 if(keys.length>1)status('Your cart contains more than one currency. Landed-cost totals are not combined across currencies.');
}
function renderProducts(){
 const host=$('products');if(!host)return;
 if(!state.buyerId){host.innerHTML='<div class="empty"><strong>Buyer sign-in required.</strong><br>Sign in to browse the live VTG supplier catalogue.<br><a href="/signin.html?role=buyer">Sign in to VTG ↗</a></div>';return;}
 if(state.loading){host.innerHTML='<div class="empty">Loading verified supplier listings from Supabase…</div>';return;}
 if(state.error){host.innerHTML='<div class="empty"><strong>The live marketplace is temporarily unavailable.</strong><br>'+esc(state.error)+'<br><button class="btn" type="button" data-market-retry>Retry</button></div>';return;}
 const search=String($('searchProducts')?.value||'').trim().toLowerCase(),category=$('category')?.value||'all';
 const matches=state.products.filter(p=>(category==='all'||String(p.category||'').toLowerCase()===category.toLowerCase())&&[p.name,p.category,p.description,p.supplier_name,p.supplier_country,p.origin_country].join(' ').toLowerCase().includes(search));
 if(!state.products.length){host.innerHTML='<div class="empty"><strong>No verified supplier products are published yet.</strong><br>Products will appear automatically when an eligible VTG supplier publishes a listing and completes verification. You can still create a sourcing request for a product you need.<br><button class="btn primary" type="button" data-empty-rfq>Create a sourcing request</button></div>';return;}
 if(!matches.length){host.innerHTML='<div class="empty">No verified supplier listings match your search. Try another category or search term.</div>';return;}
 host.innerHTML=matches.map(p=>{
  const image=Array.isArray(p.image_urls)&&p.image_urls[0]?'<img src="'+esc(p.image_urls[0])+'" alt="'+esc(p.name)+'" loading="lazy" style="width:100%;height:100%;object-fit:contain;background:#fff">':'<span>Product image not supplied</span>';
  const supplier=p.supplier_name||'Verified VTG supplier';
  return '<article class="product"><div class="productArt">'+image+'</div><div class="productInfo"><strong>'+esc(p.name)+'</strong><p>'+esc(p.category||'General trade')+' · '+esc(p.supplier_country||p.origin_country||'Origin not supplied')+'<br><span class="chip">'+esc(supplier)+' · Verified supplier</span><br><small>MOQ: '+Number(p.minimum_order_quantity||1).toLocaleString()+'</small></p><div class="productFoot"><b>'+money(p.unit_price,p.currency)+' <small>/ unit</small></b><button class="btn primary" type="button" data-add="'+esc(p.id)+'">Add to cart</button></div></div></article>';
 }).join('');
}
function normaliseCart(items){
 const map=new Map();
 (Array.isArray(items)?items:[]).forEach(item=>{const id=String(item?.id||'');const qty=Math.floor(Number(item?.qty)||0);if(id&&qty>0&&state.products.some(p=>p.id===id))map.set(id,Math.min(100000,qty));});
 return Array.from(map,([id,qty])=>({id,qty}));
}
async function persistCart(){
 if(!state.client||!state.buyerId||state.saving)return;
 state.saving=true;status('Saving your cart to your VTG account…');
 try{
  const {error}=await state.client.from('buyer_cart_states').upsert({buyer_id:state.buyerId,items:state.cart,updated_at:new Date().toISOString()},{onConflict:'buyer_id'});
  if(error)throw error;
  status('Cart saved securely to your VTG account.');
 }catch(error){status('Cart could not be saved to Supabase: '+(error.message||'Please try again.'));}
 finally{state.saving=false;}
}
async function refresh(){
 state.loading=true;state.error=null;renderProducts();
 try{
  const result=await state.client.from('vtg_marketplace_products').select('id,supplier_id,name,category,description,unit_price,currency,minimum_order_quantity,hs_code,lead_time_days,origin_country,image_urls,is_verified,created_at,supplier_name,supplier_country,supplier_logo_url,supplier_rating').order('created_at',{ascending:false}).limit(500);
  if(result.error)throw result.error;
  state.products=(result.data||[]).filter(p=>p.is_verified===true).map(p=>({...p,id:String(p.id)}));
  const select=$('category'),previous=select?.value||'all';
  if(select){
   const categories=[...new Set(state.products.map(p=>String(p.category||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
   select.innerHTML='<option value="all">All categories</option>'+categories.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
   select.value=categories.includes(previous)?previous:'all';
  }
  state.cart=normaliseCart(state.cart);
  renderProducts();renderCart();
 }catch(error){state.error=error.message||'Could not load the supplier catalogue.';renderProducts();}
 finally{state.loading=false;renderProducts();}
}
async function init(){
 try{
  const auth=await window.VTG_AUTH_READY;
  if(!auth?.client)throw new Error('VTG authentication is unavailable.');
  state.client=auth.client;
  const session=await state.client.auth.getSession();if(session.error)throw session.error;
  if(!session.data.session){state.buyerId=null;state.loading=false;renderProducts();renderCart();status('Sign in to access the live marketplace and account cart.');return;}
  state.buyerId=session.data.session.user.id;
  const profile=await state.client.from('profiles').select('role,is_active').eq('id',state.buyerId).single();
  if(profile.error)throw profile.error;
  if(profile.data.role!=='buyer'||!profile.data.is_active)throw new Error('An active buyer account is required.');
  const saved=await state.client.from('buyer_cart_states').select('items').eq('buyer_id',state.buyerId).maybeSingle();
  if(saved.error)throw saved.error;
  state.cart=Array.isArray(saved.data?.items)?saved.data.items.map(x=>({id:String(x.id||''),qty:Number(x.qty)||1})):[];
  await refresh();
  state.channel=state.client.channel('buyer-marketplace-cart-'+state.buyerId).on('postgres_changes',{event:'*',schema:'public',table:'buyer_cart_states',filter:'buyer_id=eq.'+state.buyerId},payload=>{
   if(payload.eventType==='UPDATE'&&Array.isArray(payload.new?.items)){state.cart=normaliseCart(payload.new.items);renderCart();status('Your cart was updated from another signed-in session.');}
  }).subscribe();
  if(!saved.data&&state.cart.length)await persistCart();
  status('Connected to the live VTG catalogue. Your cart is stored in Supabase.');
 }catch(error){state.loading=false;state.error=error.message||'Marketplace connection failed.';renderProducts();status(state.error);}
}
function updateCart(id,delta,remove){
 const existing=state.cart.find(x=>x.id===id);
 if(remove){state.cart=state.cart.filter(x=>x.id!==id);}
 else if(existing){existing.qty=Math.max(0,existing.qty+delta);state.cart=state.cart.filter(x=>x.qty>0);}
 else if(delta>0&&state.products.some(p=>p.id===id)){state.cart.push({id,qty:1});}
 renderCart();persistCart();
}
document.addEventListener('click',event=>{
 const add=event.target.closest('[data-add]'),qty=event.target.closest('[data-q]'),remove=event.target.closest('[data-rem]'),retry=event.target.closest('[data-market-retry]'),empty=event.target.closest('[data-empty-rfq]');
 if(!add&&!qty&&!remove&&!retry&&!empty)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 if(retry){refresh();return;}if(empty){document.querySelector('[data-view="rfqs"]')?.click();return;}
 if(add){updateCart(add.dataset.add,1,false);status('Product added to your account cart.');return;}
 if(qty){updateCart(qty.dataset.q,Number(qty.dataset.d)||0,false);return;}
 if(remove)updateCart(remove.dataset.rem,0,true);
},true);
$('searchProducts')?.addEventListener('input',renderProducts);
$('category')?.addEventListener('change',renderProducts);
['shipping','insurance','duty','other'].forEach(id=>$(id)?.addEventListener('input',renderCart));
window.addEventListener('vtg:buyer-cart-hydrated',()=>{});
init();
})();