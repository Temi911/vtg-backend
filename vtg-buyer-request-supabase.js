(function(){
  'use strict';
  const form=document.getElementById('rfqForm');
  if(!form)return;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client=null,products=[];
  const preview=new URLSearchParams(location.search).get('preview')==='1';
  const field=form.querySelector('[name="product"]')?.closest('.field');
  if(!field)return;
  const picker=document.createElement('label');
  picker.className='field full';
  picker.innerHTML='<span>Live supplier catalogue product *</span><select id="sbRfqProduct" required><option value="">Loading active supplier products…</option></select><small id="sbRfqProductHelp" class="notice">Select a listed product to route this request to its supplier.</small>';
  field.insertAdjacentElement('afterend',picker);
  const select=$('sbRfqProduct'),help=$('sbRfqProductHelp');
  function setStatus(message){help.textContent=message;}
  async function initialise(){
    if(preview){select.innerHTML='<option value="">Live requests are available after sign-in</option>';select.disabled=true;return;}
    try{
      const auth=await window.VTG_AUTH_READY;
      const result=await auth.client.auth.getSession();
      if(result.error)throw result.error;
      if(!result.data.session)throw new Error('Sign in as a buyer to submit a live supplier request.');
      client=auth.client;
      const p=await client.from('profiles').select('role,is_active').eq('id',result.data.session.user.id).single();
      if(p.error)throw p.error;
      if(p.data.role!=='buyer'||!p.data.is_active)throw new Error('An active buyer account is required.');
      const response=await client.from('products').select('id,supplier_id,name,category,currency,unit_price,minimum_order_quantity,origin_country,supplier:profiles!products_supplier_id_fkey(full_name)').eq('is_active',true).order('name').limit(500);
      if(response.error)throw response.error;
      products=response.data||[];
      if(!products.length){
        select.innerHTML='<option value="">No active supplier products are listed yet</option>';
        setStatus('The live catalogue currently has no active products. A supplier must publish an active product before a buyer can route a quote request.');
        return;
      }
      select.innerHTML='<option value="">Choose a supplier product…</option>'+products.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' — '+esc(p.supplier?.full_name||'VTG supplier')+' · MOQ '+Number(p.minimum_order_quantity||1).toLocaleString()+'</option>').join('');
      setStatus('Choose a live product. Your request will be linked to its supplier and appear in both account workspaces.');
      select.addEventListener('change',()=>{
        const p=products.find(x=>x.id===select.value);
        if(p){form.querySelector('[name="product"]').value=p.name;setStatus('Selected '+p.name+' · '+(p.supplier?.full_name||'supplier')+' · MOQ '+Number(p.minimum_order_quantity||1).toLocaleString());}
      });
    }catch(error){select.innerHTML='<option value="">Live catalogue unavailable</option>';setStatus(error.message||'Could not load supplier products.');}
  }
  form.addEventListener('submit',async event=>{
    if(preview)return;
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
      if(typeof window.loadLiveQuotes==='function')await window.loadLiveQuotes();
      if(typeof window.say==='function')window.say('Your supplier quote request has been submitted.');
    }catch(error){setStatus(error.message||'The quote request could not be submitted.');}
    finally{if(button)button.disabled=false;}
  },true);
  initialise();
})();