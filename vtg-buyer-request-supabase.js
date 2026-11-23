(function(){
  'use strict';
  const form=document.getElementById('rfqForm');
  if(!form)return;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client=null,products=[];
  const field=form.querySelector('[name="product"]')?.closest('.field');
  if(!field)return;
  const picker=document.createElement('label');
  picker.className='field full';
  picker.innerHTML='<span>Live supplier catalogue product *</span><select id="sbRfqProduct" required><option value="">Loading active supplier products…</option></select><small id="sbRfqProductHelp" class="notice">Select a listed product to route this request to its supplier.</small>';
  field.insertAdjacentElement('afterend',picker);
  const select=$('sbRfqProduct'),help=$('sbRfqProductHelp');
const style=document.createElement('style');
  style.textContent='.rfq-catalogue-empty{display:block!important;padding:22px 24px!important;margin-top:10px;border:1px solid var(--line,#e7e8eb);border-left:3px solid var(--red,#1558D6);border-radius:13px;background:var(--panel2,#f8f9fb);color:var(--ink,#20252d);line-height:1.65}.rfq-catalogue-kicker{display:block;color:var(--red,#1558D6);font-size:10px;font-weight:800;letter-spacing:.16em;margin-bottom:8px}.rfq-catalogue-title{display:block;font-size:17px;letter-spacing:-.03em;margin-bottom:7px}.rfq-catalogue-empty p{font-size:12px;color:var(--muted,#727c88);line-height:1.75;margin:0 0 13px}.rfq-catalogue-next{display:flex;align-items:center;gap:11px;padding:10px 0;border-top:1px solid var(--line,#e7e8eb)}.rfq-catalogue-mark{display:grid;place-items:center;width:27px;height:27px;flex:none;border-radius:50%;background:var(--soft,#E4EEFC);color:var(--red,#1558D6);font-size:10px;font-weight:800}.rfq-catalogue-next b,.rfq-catalogue-next small{display:block}.rfq-catalogue-next b{font-size:11.5px}.rfq-catalogue-next small{font-size:11px;color:var(--muted,#727c88);margin-top:2px}.rfq-catalogue-empty .rfq-catalogue-foot{margin:12px 0 0;padding-top:12px;border-top:1px solid var(--line,#e7e8eb)}';
  document.head.appendChild(style);
  function setStatus(message){help.textContent=message;help.classList.remove('rfq-catalogue-empty');}
  function renderEmptyCatalogue(){
    help.classList.add('rfq-catalogue-empty');
    help.innerHTML='<span class="rfq-catalogue-kicker">CATALOGUE STATUS</span><strong class="rfq-catalogue-title">No approved products are available yet</strong><p>The live VTG catalogue is currently empty. A supplier listing must be approved, and the supplier must complete VTG verification, before a buyer can route a product-specific quote request.</p><div class="rfq-catalogue-next"><span class="rfq-catalogue-mark" aria-hidden="true">01</span><span><b>Supplier publishes a listing</b><small>The product is submitted for VTG review.</small></span></div><div class="rfq-catalogue-next"><span class="rfq-catalogue-mark" aria-hidden="true">02</span><span><b>VTG reviews the listing and supplier</b><small>Only approved, eligible products enter the live catalogue.</small></span></div><p class="rfq-catalogue-foot">You can save your sourcing details as a draft in the RFQ workspace. Publishing to a supplier will become available when an eligible listing is live.</p>';
  }
  async function initialise(){
    try{
      const auth=await window.VTG_AUTH_READY;
      const result=await auth.client.auth.getSession();
      if(result.error)throw result.error;
      if(!result.data.session)throw new Error('Sign in as a buyer to submit a live supplier request.');
      client=auth.client;
      const p=await client.from('profiles').select('role,is_active').eq('id',result.data.session.user.id).single();
      if(p.error)throw p.error;
      if(p.data.role!=='buyer'||!p.data.is_active)throw new Error('An active buyer account is required.');
      const response=await client.from('vtg_marketplace_products').select('id,supplier_id,name,category,currency,unit_price,minimum_order_quantity,origin_country,supplier_name,supplier_country,supplier_verification_level').order('name').limit(500);
      if(response.error)throw response.error;
      products=response.data||[];
      if(!products.length){
        select.innerHTML='<option value="">No active supplier products are listed yet</option>';
        renderEmptyCatalogue();
        return;
      }
      select.innerHTML='<option value="">Choose a supplier product…</option>'+products.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' — '+esc(p.supplier_name||'VTG supplier')+' · MOQ '+Number(p.minimum_order_quantity||1).toLocaleString()+'</option>').join('');
      setStatus('Choose a live product. Your request will be linked to its supplier and appear in both account workspaces.');
      select.addEventListener('change',()=>{
        const p=products.find(x=>x.id===select.value);
        if(p){form.querySelector('[name="product"]').value=p.name;setStatus('Selected '+p.name+' · '+(p.supplier_name||'supplier')+' · MOQ '+Number(p.minimum_order_quantity||1).toLocaleString());}
      });
    }catch(error){select.innerHTML='<option value="">Live catalogue unavailable</option>';setStatus(error.message||'Could not load supplier products.');}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    if(!client){setStatus('A valid buyer sign-in and live supplier catalogue are required.');return;}
    const product=products.find(p=>p.id===select.value);
    if(!product){setStatus('Select an active supplier product before submitting.');return;}
    const values=Object.fromEntries(new FormData(form));
    const quantity=Number(values.quantity);
    if(!Number.isSafeInteger(quantity)||quantity<1){setStatus('Enter a whole-number quantity of at least one.');return;}
    if(quantity<Number(product.minimum_order_quantity||1)){setStatus('This supplier requires a minimum order quantity of '+Number(product.minimum_order_quantity||1).toLocaleString()+'.');return;}
    const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
    setStatus('Submitting your request securely to Supabase…');
    try{
      const message=['Specifications: '+String(values.details||'Not provided'),'Sourcing country: '+String(values.origin||'Open to options'),'Destination market: '+String(values.destination||'Nigeria')].join('\n');
      const result=await client.rpc('vtg_create_trade_quote_request',{
        p_product_id:product.id,p_quantity:quantity,p_origin_country:null,
        p_destination:String(values.destination||'Tin Can Island, Lagos'),p_buyer_message:message
      });
      if(result.error)throw result.error;
      const ref=result.data?.order_reference||'created';
      form.reset();select.value='';
      setStatus('Request sent successfully. Reference: '+ref+'. The assigned supplier can now prepare a quotation.');
      if(typeof window.loadLiveEnquiries==='function')await window.loadLiveEnquiries();if(typeof window.loadLiveQuotes==='function')await window.loadLiveQuotes();
      if(typeof window.say==='function')window.say('Your supplier quote request has been submitted.');
    }catch(error){setStatus(error.message||'The quote request could not be submitted.');}
    finally{if(button)button.disabled=false;}
  },true);
  initialise();
})();