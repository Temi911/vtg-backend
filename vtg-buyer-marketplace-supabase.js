(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(value,currency)=>String(currency||'USD')+' '+Number(value||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const state={client:null,buyerId:null,products:[],cart:[],channel:null,loading:true,error:null};
let saveChain=Promise.resolve();
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
 if(!state.products.length){host.innerHTML='<div class="empty"><strong>The verified VTG catalogue is being built.</strong><br>No supplier listings are available to quote yet. A product becomes visible only after its listing is approved and the supplier completes VTG verification. Need something now? Create a sourcing request and VTG can help coordinate sourcing.<br><button class="btn primary" type="button" data-empty-rfq>Create a sourcing request</button><br><small>Are you a supplier? <a href="/supplier-signup.html">Register your company with VTG</a> and submit products for review.</small></div>';return;}
 if(!matches.length){host.innerHTML='<div class="empty">No verified supplier listings match your search. Try another category or search term.</div>';return;}
 host.innerHTML=matches.map(p=>{
  const PM=window.VTGProductMedia,image=PM?PM.cardHtml(p.image_urls,p.name):(Array.isArray(p.image_urls)&&p.image_urls[0]?'<img src="'+esc(p.image_urls[0])+'" alt="'+esc(p.name)+'" loading="lazy">':'<span>Image not supplied</span>');
  const supplier=p.supplier_name||'Verified VTG supplier';
  const levelNames={registered_business:'Registered Business',vtg_verified:'VTG Verified',production_verified:'Production Verified',trade_performance_reviewed:'Trade Performance Reviewed'};
  const trustLabel=levelNames[p.supplier_verification_level]||'Business documents reviewed';
  return '<article class="product"><div class="productArt"'+(PM?PM.attrs(p.image_urls,p.name):'')+'>'+image+'</div><div class="productInfo"><span class="productCategory">'+esc(p.category||'General trade')+'</span><strong>'+esc(p.name)+'</strong><p>'+esc(p.supplier_country||p.origin_country||'Origin not supplied')+' · <span class="chip">'+esc(supplier)+'</span><br><small>'+esc(trustLabel)+' · MOQ '+Number(p.minimum_order_quantity||1).toLocaleString()+'</small></p><div class="productFoot"><b>'+money(p.unit_price,p.currency)+' <small>/ unit</small></b></div><div class="productActions"><button class="btn" type="button" data-view-product="'+esc(p.id)+'">View &amp; quote</button><button class="btn primary" type="button" data-enquire-product="'+esc(p.id)+'">Enquire</button><button class="btn" type="button" data-add="'+esc(p.id)+'">Add to cart</button></div></div></article>';
 }).join('');
}
function stopGallery(){if(window.__vtgBuyerGallery){try{window.__vtgBuyerGallery.destroy();}catch(_){}window.__vtgBuyerGallery=null;}}
function openProductDetails(id,mode){
 const p=state.products.find(item=>item.id===String(id));if(!p)return;
 const modal=$('buyerProductModal');if(!modal)return;
 const image='';
 const levelNames={registered_business:'Registered Business',vtg_verified:'VTG Verified',production_verified:'Production Verified',trade_performance_reviewed:'Trade Performance Reviewed'};
 $('buyerProductContent').innerHTML='<div class="buyerProductMedia">'+image+'</div><div class="buyerProductSummary"><span class="productCategory">'+esc(p.category||'General trade')+'</span><h2>'+esc(p.name)+'</h2><p class="buyerProductPrice">'+money(p.unit_price,p.currency)+' <small>/ unit</small></p><dl><div><dt>Supplier</dt><dd>'+esc(p.supplier_name||'Verified VTG supplier')+'</dd></div><div><dt>Supplier country</dt><dd>'+esc(p.supplier_country||p.origin_country||'Not supplied')+'</dd></div><div><dt>Verification</dt><dd>'+esc(levelNames[p.supplier_verification_level]||'Business documents reviewed')+'</dd></div><div><dt>Minimum order</dt><dd>'+Number(p.minimum_order_quantity||1).toLocaleString()+'</dd></div><div><dt>HS code</dt><dd>'+esc(p.hs_code||'Not supplied')+'</dd></div><div><dt>Lead time</dt><dd>'+(p.lead_time_days?Number(p.lead_time_days)+' days':'Not supplied')+'</dd></div></dl><h3>Product description</h3><p class="buyerProductDescription">'+esc(p.description||'The supplier has not added a product description.')+'</p></div>';
 (function(){const host=$('buyerProductContent').querySelector('.buyerProductMedia'),PM=window.VTGProductMedia;if(!host)return;
  if(window.__vtgBuyerGallery){try{window.__vtgBuyerGallery.destroy();}catch(_){}window.__vtgBuyerGallery=null;}
  if(PM){window.__vtgBuyerGallery=PM.gallery(host,p.image_urls,p.name,{expand:i=>PM.open(p.image_urls,p.name,i)});}
  else{const u=Array.isArray(p.image_urls)&&p.image_urls[0];host.innerHTML=u?'<img src="'+esc(u)+'" alt="'+esc(p.name)+' product image">':'<div class="buyerProductNoImage">Product image not supplied</div>';}})();
 $('buyerProductTitle').textContent=mode==='enquiry'?'Enquire about this product':'Product details & quote';
 $('buyerProductMode').value=mode;
 $('buyerProductId').value=p.id;
 $('buyerProductQty').min=String(Math.max(1,Number(p.minimum_order_quantity||1)));
 $('buyerProductQty').value=String(Math.max(1,Number(p.minimum_order_quantity||1)));
 $('buyerProductNotes').value='';
 $('buyerProductDestination').value='Nigeria — Tin Can Island, Lagos';
 $('buyerProductSubmit').textContent=mode==='enquiry'?'Send enquiry':'Request a quote';
 $('buyerProductStatus').textContent='';
 modal.classList.remove('hidden');
}
async function submitProductAction(event){
 event.preventDefault();
 const p=state.products.find(item=>item.id===$('buyerProductId').value),mode=$('buyerProductMode').value;
 const statusNode=$('buyerProductStatus'),button=$('buyerProductSubmit');
 if(!p||!state.client||!state.buyerId){statusNode.textContent='Your buyer session is not ready. Refresh the marketplace and try again.';return;}
 const quantity=Number($('buyerProductQty').value),minimum=Number(p.minimum_order_quantity||1);
 if(!Number.isSafeInteger(quantity)||quantity<minimum){statusNode.textContent='Enter a whole-number quantity at or above the supplier minimum of '+minimum.toLocaleString()+'.';return;}
 if(button.disabled)return;
 button.disabled=true;button.textContent='Sending…';statusNode.textContent='';
 const noteParts=[mode==='enquiry'?'Product enquiry — please contact me about this listing.':'Quote request from the Buyer Dashboard.', 'Requested Incoterm: '+$('buyerProductIncoterm').value, $('buyerProductNotes').value.trim()].filter(Boolean);
 try{
  const session=await state.client.auth.getSession();if(session.error)throw session.error;
  if(!session.data.session||session.data.session.user.id!==state.buyerId)throw new Error('Your buyer session has expired. Please sign in again.');
  const result=await state.client.rpc('vtg_create_trade_quote_request',{p_product_id:p.id,p_quantity:quantity,p_origin_country:p.origin_country||null,p_destination:$('buyerProductDestination').value.trim()||'Nigeria',p_buyer_message:noteParts.join('\n\n')});
  if(result.error)throw result.error;
  const ref=result.data?.order_reference||'created';
  statusNode.textContent=(mode==='enquiry'?'Enquiry ':'Quote request ')+ref+' has been sent to the supplier.';
  button.textContent='Sent successfully';
  setTimeout(()=>{stopGallery();$('buyerProductModal').classList.add('hidden');button.disabled=false;button.textContent=mode==='enquiry'?'Send enquiry':'Request a quote';},1200);
 }catch(error){statusNode.textContent=error.message||'Could not send your request.';button.disabled=false;button.textContent=mode==='enquiry'?'Send enquiry':'Request a quote';}
}
function normaliseCart(items){
 const map=new Map();
 (Array.isArray(items)?items:[]).forEach(item=>{const id=String(item?.id||'');const qty=Math.floor(Number(item?.qty)||0);if(id&&qty>0&&state.products.some(p=>p.id===id))map.set(id,Math.min(100000,qty));});
 return Array.from(map,([id,qty])=>({id,qty}));
}
async function persistCart(){
 if(!state.client||!state.buyerId)return;
 const snapshot=state.cart.map(item=>({id:item.id,qty:item.qty}));
 saveChain=saveChain.then(async()=>{
  const {error}=await state.client.from('buyer_cart_states').upsert({buyer_id:state.buyerId,items:snapshot,updated_at:new Date().toISOString()},{onConflict:'buyer_id'});
  if(error)throw error;
 });
 status('Saving your cart to your VTG account…');
 try{await saveChain;status('Cart saved securely to your VTG account.');}
 catch(error){status('Cart could not be saved to Supabase: '+(error.message||'Please try again.'));}
}
async function refresh(){
 state.loading=true;state.error=null;renderProducts();
 try{
  const result=await state.client.from('vtg_marketplace_products').select('id,supplier_id,name,category,description,unit_price,currency,minimum_order_quantity,hs_code,lead_time_days,origin_country,image_urls,is_verified,created_at,supplier_name,supplier_country,supplier_logo_url,supplier_rating,supplier_verification_level').order('created_at',{ascending:false}).limit(500);
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
 const add=event.target.closest('[data-add]'),view=event.target.closest('[data-view-product]'),enquire=event.target.closest('[data-enquire-product]'),qty=event.target.closest('[data-q]'),remove=event.target.closest('[data-rem]'),retry=event.target.closest('[data-market-retry]'),empty=event.target.closest('[data-empty-rfq]');
 if(!add&&!view&&!enquire&&!qty&&!remove&&!retry&&!empty)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 if(retry){refresh();return;}if(view){openProductDetails(view.dataset.viewProduct,'quote');return;}if(enquire){openProductDetails(enquire.dataset.enquireProduct,'enquiry');return;}if(empty){document.querySelector('[data-view="rfqs"]')?.click();return;}
 if(add){updateCart(add.dataset.add,1,false);status('Product added to your account cart.');return;}
 if(qty){updateCart(qty.dataset.q,Number(qty.dataset.d)||0,false);return;}
 if(remove)updateCart(remove.dataset.rem,0,true);
},true);
$('searchProducts')?.addEventListener('input',renderProducts);
$('category')?.addEventListener('change',renderProducts);

/* Buyer dashboard visual search: analyse a photo, then filter only the live approved catalogue. */
(function mountBuyerVisualSearch(){
 const file=$('buyerVisualPhoto'),upload=$('buyerVisualUpload'),camera=$('buyerVisualCamera'),run=$('buyerVisualRun'),clear=$('buyerVisualClear'),preview=$('buyerVisualPreview'),note=$('buyerVisualStatus');
 if(!file||!upload||!camera||!run||!preview||!note)return;
 let selected=null,previewUrl='';
 const say=t=>{note.textContent=t;};
 function choose(f){
  if(!f)return;
  if(!['image/jpeg','image/png','image/webp'].includes(f.type)){say('Choose a JPG, PNG or WEBP product photo.');return;}
  if(f.size>12*1024*1024){say('Photo must be 12 MB or smaller.');return;}
  selected=f;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(f);
  preview.src=previewUrl;preview.hidden=false;clear.hidden=false;run.disabled=false;say('Photo ready. Select Find matching products.');
 }
 async function compress(f){
  const url=URL.createObjectURL(f);
  try{const img=new Image();img.src=url;await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;});
   const scale=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.75);
  }finally{URL.revokeObjectURL(url);}
 }
 upload.onclick=()=>{file.removeAttribute('capture');file.click();};
 camera.onclick=()=>{file.setAttribute('capture','environment');file.click();};
 file.onchange=()=>choose(file.files?.[0]);
 clear.onclick=()=>{selected=null;file.value='';if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';preview.hidden=true;clear.hidden=true;run.disabled=true;say('Matches are drawn only from approved VTG marketplace listings.');};
 run.onclick=async()=>{
  if(!selected||run.disabled)return;
  run.disabled=true;upload.disabled=camera.disabled=true;say('Analysing the photo and searching approved listings…');
  try{
   const response=await fetch('/api/visual-search',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({image:await compress(selected)})});
   const data=await response.json();if(!response.ok)throw new Error(data?.error?.message||'Visual search is unavailable.');
   const terms=[data.product,data.category,...(Array.isArray(data.keywords)?data.keywords:[])].filter(Boolean).join(' ').trim();
   if(!terms)throw new Error('The product could not be identified. Try a clearer photo or type a search.');
   $('searchProducts').value=terms;renderProducts();
   say('Identified as '+(data.product||data.category)+'. Showing matching approved supplier listings.');
   $('products')?.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){say(error.message||'Visual search failed. Please try again.');}
  finally{run.disabled=!selected;upload.disabled=camera.disabled=false;}
 };
})();
['shipping','insurance','duty','other'].forEach(id=>$(id)?.addEventListener('input',renderCart));
window.addEventListener('vtg:buyer-cart-hydrated',()=>{});
$('buyerProductForm')?.addEventListener('submit',submitProductAction);
 $('buyerProductClose')?.addEventListener('click',()=>{stopGallery();$('buyerProductModal')?.classList.add('hidden');});
 $('buyerProductModal')?.addEventListener('click',event=>{if(event.target.id==='buyerProductModal'){stopGallery();event.currentTarget.classList.add('hidden');}});
 init();
})();