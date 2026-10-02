(() => {
  'use strict';

  const API = '/api';
  const token = () => localStorage.getItem('vtg_access_token') || '';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(n)||0);

  async function api(path, options={}) {
    const headers = {...(options.headers||{}), Authorization:'Bearer '+token()};
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type']='application/json';
    const r=await fetch(API+path,{...options,headers});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d?.error?.message||d?.message||'Request failed');
    return d;
  }

  function style(){
    if(document.getElementById('buyerTradeRoomStyle')) return;
    const s=document.createElement('style'); s.id='buyerTradeRoomStyle';
    s.textContent=`
      .buyerRoom{margin-top:14px}.buyerRoomGrid{display:grid;grid-template-columns:1.15fr .85fr;gap:14px}
      .buyerRoomPanel{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px}
      .buyerRoomPanel h3{margin:0 0 4px;font-size:15px}.buyerRoomSub{color:var(--muted);font-size:10px;margin-bottom:12px}
      .buyerRoomList{display:grid;gap:8px}.buyerRoomItem{border:1px solid var(--line);border-radius:11px;padding:11px}
      .buyerRoomItem small{display:block;color:var(--muted);font-size:10px;line-height:1.45;margin-top:3px}
      .buyerRoomBadge{display:inline-block;border-radius:999px;padding:4px 7px;font-size:9px;font-weight:800;background:#edf8f8;color:#176a70;text-transform:uppercase}
      .buyerRoomActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.buyerRoomActions .btn{font-size:10px;padding:8px 10px}
      .buyerRoomTimeline{display:grid;gap:0}.buyerRoomStep{display:grid;grid-template-columns:18px 1fr;gap:9px;position:relative;padding-bottom:13px}
      .buyerRoomStep:not(:last-child):before{content:'';position:absolute;left:7px;top:16px;bottom:0;width:2px;background:var(--line)}
      .buyerRoomDot{width:16px;height:16px;border-radius:50%;background:var(--line);border:3px solid var(--card);z-index:1}
      .buyerRoomStep.done .buyerRoomDot,.buyerRoomStep.active .buyerRoomDot{background:var(--accent)}
      .buyerRoomStep strong{font-size:11px}.buyerRoomStep small{display:block;color:var(--muted);font-size:9px;margin-top:2px}
      .buyerRoomEmpty{padding:18px;text-align:center;color:var(--muted);font-size:10px;border:1px dashed var(--line);border-radius:10px}
      .buyerRoomModal{position:fixed;inset:0;background:rgba(3,15,20,.58);display:none;place-items:center;z-index:5100;padding:16px}
      .buyerRoomModal.open{display:grid}.buyerRoomDialog{width:min(680px,100%);max-height:90vh;overflow:auto;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:18px}
      .buyerRoomDialog h3{margin:0 0 4px}.buyerRoomField{display:grid;gap:5px;margin:10px 0}.buyerRoomField label{font-size:9px;font-weight:800;color:var(--muted)}
      .buyerRoomField input,.buyerRoomField select{width:100%;border:1px solid var(--line);border-radius:9px;padding:9px;background:var(--card);color:var(--ink)}
      @media(max-width:900px){.buyerRoomGrid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function mount(){
    if(document.getElementById('buyerTradeRoomLive')) return;
    const host=document.getElementById('buyerOs'); if(!host) return;
    const section=document.createElement('section'); section.id='buyerTradeRoomLive'; section.className='buyerRoom';
    section.innerHTML=`
      <div class="buyerRoomGrid">
        <div class="buyerRoomPanel">
          <h3>Buyer Trade Room</h3>
          <div class="buyerRoomSub">Persistent transaction workspace: quote → order → documents → payment → shipment → delivery.</div>
          <div id="buyerRoomTransactions" class="buyerRoomList"><div class="buyerRoomEmpty">Loading transactions…</div></div>
        </div>
        <div class="buyerRoomPanel">
          <h3>Selected transaction</h3>
          <div class="buyerRoomSub">Choose a quote or order to open its live transaction record.</div>
          <div id="buyerRoomDetail"><div class="buyerRoomEmpty">Nothing selected yet.</div></div>
        </div>
      </div>
    `;
    host.insertAdjacentElement('afterend',section);

    const modal=document.createElement('div'); modal.id='buyerRoomModal'; modal.className='buyerRoomModal';
    modal.innerHTML=`
      <div class="buyerRoomDialog">
        <h3 id="buyerRoomModalTitle">Trade action</h3>
        <div id="buyerRoomModalMeta" class="buyerRoomSub"></div>
        <div id="buyerRoomModalBody"></div>
        <div id="buyerRoomModalMsg"></div>
        <div class="buyerRoomActions" style="justify-content:flex-end;margin-top:14px">
          <button class="btn" id="buyerRoomClose">Close</button><button class="btn primary" id="buyerRoomSubmit">Continue</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    let state={quotes:[],orders:[],selected:null,documents:[],shipment:null,shipmentEvents:[],shipmentRoute:[],payments:[]};

    function openModal(title,meta,body,submit){
      document.getElementById('buyerRoomModalTitle').textContent=title;
      document.getElementById('buyerRoomModalMeta').textContent=meta||'';
      document.getElementById('buyerRoomModalBody').innerHTML=body;
      document.getElementById('buyerRoomModalMsg').innerHTML='';
      document.getElementById('buyerRoomSubmit').textContent='Continue';
      document.getElementById('buyerRoomSubmit').onclick=submit;
      modal.classList.add('open');
    }
    document.getElementById('buyerRoomClose').onclick=()=>modal.classList.remove('open');
    modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});

    function renderTransactions(){
      const box=document.getElementById('buyerRoomTransactions');
      const rows=[];
      state.quotes.forEach(q=>rows.push(`
        <div class="buyerRoomItem">
          <div class="row"><strong>${esc(q.reference)}</strong><span class="buyerRoomBadge">${esc(q.status)}</span></div>
          <small>Quote • ${esc(q.supplier_name||'Supplier')} • ${money(q.total_amount_usd)} • ${esc(q.incoterm||'FOB')}</small>
          <div class="buyerRoomActions"><button class="btn" data-q="${esc(q.id)}">Open quote</button>${q.status==='accepted'&&!q.converted_order_id?'<button class="btn primary" data-convert="'+esc(q.id)+'">Create order</button>':''}${q.converted_order_id?'<button class="btn" data-o="'+esc(q.converted_order_id)+'">Open order</button>':''}</div>
        </div>`));
      state.orders.forEach(o=>rows.push(`
        <div class="buyerRoomItem">
          <div class="row"><strong>${esc(o.reference)}</strong><span class="buyerRoomBadge">${esc(o.status)}</span></div>
          <small>Order • ${esc(o.supplier_name||'Supplier')} • ${money(o.total_amount_usd)}</small>
          <div class="buyerRoomActions"><button class="btn primary" data-o="${esc(o.id)}">Open order</button></div>
        </div>`));
      box.innerHTML=rows.length?rows.join(''):'<div class="buyerRoomEmpty">No live quotes or orders yet. Request a supplier quote from the sourcing desk above.</div>';
      box.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>selectQuote(b.dataset.q));
      box.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>selectOrder(b.dataset.o));
      box.querySelectorAll('[data-convert]').forEach(b=>b.onclick=()=>convertQuote(b.dataset.convert));
    }

    async function convertQuote(id){
      const q=state.quotes.find(x=>String(x.id)===String(id)); if(!q)return;
      openModal('Create order from accepted quote',q.reference,`
        <div class="notice">This will create the order using the accepted quote's supplier, commercial total, incoterm and line items. The quote will then be marked converted.</div>
      `,async()=>{
        try{const d=await api('/quotes/'+encodeURIComponent(id)+'/convert-to-order',{method:'POST'});modal.classList.remove('open');await refresh();selectOrder(d.order.id);}
        catch(e){
          if(/already|converted|conflict/i.test(e.message||'')){modal.classList.remove('open');await refresh();const latest=state.quotes.find(x=>String(x.id)===String(id));if(latest?.converted_order_id)selectOrder(latest.converted_order_id);return}
          document.getElementById('buyerRoomModalMsg').innerHTML='<div class="buyerOsError">'+esc(e.message)+'</div>';
        }
      });
    }

    async function selectQuote(id){
      try{
        const d=await api('/quotes/'+encodeURIComponent(id)); state.selected={type:'quote',data:d.quote,items:d.items||[]}; renderDetail();
      }catch(e){alert(e.message)}
    }

    async function selectOrder(id){
      try{
        const d=await api('/orders/'+encodeURIComponent(id)); state.selected={type:'order',data:d.order,items:d.items||[]};
        const [docs,ship,pay]=await Promise.all([
          api('/documents/order/'+encodeURIComponent(id)).catch(()=>({documents:[]})),
          api('/shipments/order/'+encodeURIComponent(id)).catch(()=>null),
          api('/payments').catch(()=>({paymentRequests:[]}))
        ]);
        state.documents=docs.documents||[];
        state.shipment=ship?.shipment||null; state.shipmentEvents=ship?.events||[]; state.shipmentRoute=ship?.routePoints||[];
        state.payments=(pay.paymentRequests||[]).filter(x=>String(x.order_id)===String(id));
        renderDetail();
      }catch(e){alert(e.message)}
    }

    function timelineForOrder(o){
      const map=[['pending','Order created'],['confirmed','Supplier confirmed'],['lc_issued','Finance / LC milestone'],['shipped','Shipment departed'],['in_transit','In transit'],['arrived','Arrived at destination'],['customs','Customs clearance'],['delivered','Delivered']];
      if(o.status==='cancelled') return map.map(x=>`<div class="buyerRoomStep"><span class="buyerRoomDot"></span><div><strong>${x[1]}</strong><small>Not completed</small></div></div>`).join('')+`<div class="buyerRoomStep active"><span class="buyerRoomDot"></span><div><strong>Order cancelled</strong><small>Closed milestone</small></div></div>`;
      if(o.status==='disputed') return map.map(x=>`<div class="buyerRoomStep"><span class="buyerRoomDot"></span><div><strong>${x[1]}</strong><small>Review required</small></div></div>`).join('')+`<div class="buyerRoomStep active"><span class="buyerRoomDot"></span><div><strong>Order disputed</strong><small>Requires resolution</small></div></div>`;
      const idx=map.findIndex(x=>x[0]===o.status);
      return map.map((x,i)=>`<div class="buyerRoomStep ${i<(idx<0?0:idx)?'done':i===(idx<0?0:idx)?'active':''}"><span class="buyerRoomDot"></span><div><strong>${x[1]}</strong><small>${i<(idx<0?0:idx)?'Completed':i===(idx<0?0:idx)?'Current milestone':'Next milestone'}</small></div></div>`).join('');
    }
    function orderActions(o){
      const a=[];
      if(['pending','confirmed','lc_issued'].includes(o.status)) a.push('<button class="btn" id="roomCancel">Request cancellation</button>');
      if(!['delivered','cancelled','disputed'].includes(o.status)) a.push('<button class="btn" id="roomDispute">Open dispute</button>');
      if(o.status==='disputed') a.push('<span class="buyerRoomBadge">Resolution required</span>');
      return a.join('');
    }

    function renderDetail(){
      const box=document.getElementById('buyerRoomDetail'),s=state.selected;
      if(!s){box.innerHTML='<div class="buyerRoomEmpty">Nothing selected yet.</div>';return}
      const d=s.data;
      if(s.type==='quote'){
        box.innerHTML=`
          <div class="buyerRoomItem"><div class="row"><strong>${esc(d.reference)}</strong><span class="buyerRoomBadge">${esc(d.status)}</span></div>
          <small>Supplier: ${esc(d.supplier_name||'Supplier')} • ${money(d.total_amount_usd)} • ${esc(d.incoterm||'FOB')} • Valid until ${esc(d.validity_until||'Not specified')}</small>
          <div class="buyerRoomActions">${d.status==='accepted'&&!d.converted_order_id?'<button class="btn primary" id="roomConvert">Create order</button>':''}${d.converted_order_id?'<button class="btn" id="roomConvertedOrder">Open created order</button>':''}</div>
          ${d.notes?'<div class="buyerRoomSub" style="margin-top:9px"><strong>Trade notes:</strong> '+esc(d.notes)+'</div>':''}</div>
          <div style="margin-top:12px"><strong style="font-size:11px">Line items</strong><div class="buyerRoomList" style="margin-top:7px">${(s.items||[]).map(i=>`<div class="buyerRoomItem"><strong>${esc(i.description)}</strong><small>${esc(i.quantity)} × ${money(i.unit_price_usd)}</small></div>`).join('')}</div></div>`;
        document.getElementById('roomConvert')?.addEventListener('click',()=>convertQuote(d.id));
        document.getElementById('roomConvertedOrder')?.addEventListener('click',()=>selectOrder(d.converted_order_id));
        return;
      }
      const docs=state.documents;
      box.innerHTML=`
        <div class="buyerRoomItem"><div class="row"><strong>${esc(d.reference)}</strong><span class="buyerRoomBadge">${esc(d.status)}</span></div>
          <small>${esc(d.supplier_name||'Supplier')} • ${money(d.total_amount_usd)} • ${esc(d.incoterm||'FOB')}</small>
          <div class="buyerRoomActions"><button class="btn" id="roomUpload">Upload document</button>${!['delivered','cancelled'].includes(d.status)?'<button class="btn" id="roomPay">Start payment</button>':''}${['arrived','customs'].includes(d.status)?'<button class="btn primary" id="roomDeliver">Confirm delivery</button>':''}${d.status==='delivered'?'<span class="buyerRoomBadge">Delivery confirmed</span>':''}${orderActions(d)}</div></div>
        <div class="buyerRoomItem" style="margin-top:8px"><strong style="font-size:11px">Transaction timeline</strong><div class="buyerRoomTimeline" style="margin-top:10px">${timelineForOrder(d)}</div></div>
        <div class="buyerRoomItem" style="margin-top:8px"><strong style="font-size:11px">Documents</strong><div class="buyerRoomList" style="margin-top:7px">${docs.length?docs.map(x=>`<div class="buyerRoomItem"><div class="row"><strong style="font-size:10px">${esc(x.doc_type)}</strong><span class="buyerRoomBadge">${esc(x.status||'uploaded')}</span></div><small>${esc(x.file_name)}</small><div class="buyerRoomActions"><button class="btn" data-doc-download="${esc(x.id)}">Download</button></div></div>`).join(''):'<div class="buyerRoomEmpty">No order documents uploaded yet.</div>'}</div></div>
        <div class="buyerRoomActions" style="margin-top:8px"><button class="btn" id="roomConversation">Message supplier</button></div></div><div class="buyerRoomItem" style="margin-top:8px"><strong style="font-size:11px">Payments</strong><div class="buyerRoomList" style="margin-top:7px">${state.payments.length?state.payments.map(x=>`<div><strong style="font-size:10px">${esc(x.method)} • ${esc(x.amount)} ${esc(x.currency)}</strong><small>${esc(x.status)} • ${esc(x.provider_ref||'Pending provider reference')}</small></div>`).join(''):'<div class="buyerRoomEmpty">No payment request initiated for this order.</div>'}</div></div>
        ${state.shipment?`<div class="buyerRoomItem" style="margin-top:8px"><strong style="font-size:11px">Shipment</strong><div class="buyerRoomActions"><button class="btn" id="roomLiveTrack">Check live tracking</button></div><small>${esc(state.shipment.container_no||"Container pending")} • ${esc(state.shipment.carrier||"Carrier pending")} • ${esc(state.shipment.origin_port||"Origin")} → ${esc(state.shipment.destination_port||"Destination")}</small><div class="buyerRoomTimeline" style="margin-top:10px">${state.shipmentEvents.length?state.shipmentEvents.map((x,i)=>`<div class="buyerRoomStep ${x.status==="done"?"done":x.status==="active"?"active":""}"><span class="buyerRoomDot"></span><div><strong>${esc(x.location)}</strong><small>${esc(x.detail||x.status||"Milestone")}</small></div></div>`).join(""):"<div class="buyerRoomEmpty">Shipment exists but no tracking milestones have been recorded yet.</div>"}</div>${state.shipmentRoute.length?`<div class="buyerRoomSub" style="margin-top:8px"><strong>Mapped route:</strong> ${state.shipmentRoute.map(x=>esc(x.name)).join(" → ")}</div>`:""}</div>`:""}
      `;
      document.getElementById('roomUpload')?.addEventListener('click',()=>uploadDoc(d.id));
      document.getElementById('roomPay')?.addEventListener('click',()=>payment(d));document.getElementById('roomConversation')?.addEventListener('click',()=>openOrderConversation(d));
      document.getElementById('roomCancel')?.addEventListener('click',()=>changeOrderStatus(d,'cancelled'));
      document.getElementById('roomDispute')?.addEventListener('click',()=>changeOrderStatus(d,'disputed'));
      document.getElementById('roomDeliver')?.addEventListener('click',()=>confirmDelivery(d));
      document.getElementById('roomLiveTrack')?.addEventListener('click',()=>showLiveTracking(state.shipment?.id));
      document.getElementById('roomRefreshShipment')?.addEventListener('click',()=>selectOrder(d.id));
      box.querySelectorAll('[data-doc-download]').forEach(b=>b.onclick=()=>downloadDocument(b.dataset.docDownload));
    }

    async function changeOrderStatus(order,status){
      const title=status==='disputed'?'Open order dispute':'Request order cancellation';
      const note=status==='disputed'
        ?'<div class="notice">This marks the order for resolution. The supplier/admin can then review the order through the trade workflow.</div>'
        :'<div class="notice">Cancellation is available only before the order reaches shipping milestones. Confirm this request carefully.</div>';
      openModal(title,'Order '+order.reference,note,async()=>{
        try{
          await api('/orders/'+encodeURIComponent(order.id)+'/status',{method:'PATCH',body:JSON.stringify({status})});
          modal.classList.remove('open');await refresh();await selectOrder(order.id);
        }catch(e){document.getElementById('buyerRoomModalMsg').innerHTML='<div class="buyerOsError">'+esc(e.message)+'</div>';}
      });
    }

    async function downloadDocument(id){
      const t=token();
      if(!t){alert('Please sign in again.');return}
      try{
        const r=await fetch(API+'/documents/'+encodeURIComponent(id)+'/download',{headers:{Authorization:'Bearer '+t}});
        if(!r.ok) throw new Error('Unable to download this document');
        const blob=await r.blob();
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download='trade-document';document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      }catch(e){alert(e.message)}
    }

    async function confirmDelivery(order){
      openModal('Confirm delivery','Order '+order.reference,'<div class="notice">Confirm only after the goods have actually been received and the delivery record is ready to be closed.</div>',async()=>{
        try{await api('/orders/'+encodeURIComponent(order.id)+'/status',{method:'PATCH',body:JSON.stringify({status:'delivered'})});modal.classList.remove('open');await refresh();await selectOrder(order.id);}
        catch(e){document.getElementById('buyerRoomModalMsg').innerHTML='<div class="buyerOsError">'+esc(e.message)+'</div>';}
      });
    }

    async function showLiveTracking(shipmentId){
      if(!shipmentId){alert('No shipment is linked yet.');return}
      try{
        const d=await api('/shipments/'+encodeURIComponent(shipmentId)+'/live-tracking');
        openModal('Live vessel tracking','Shipment '+shipmentId,
          '<div class="buyerRoomItem"><strong>'+esc(d.vessel?.name||'Live vessel position unavailable')+'</strong><small>Provider: '+esc(d.provider||'Not connected')+' • Next milestone: '+esc(d.nextMilestone||'Pending')+'</small><small>'+(d.available?'Current vessel coordinates are available from the connected tracking provider.':'No live AIS/carrier position is currently available; recorded shipment milestones remain the source of truth.')+'</small></div>',
          ()=>modal.classList.remove('open'));
      }catch(e){alert(e.message)}
    }

    function uploadDoc(orderId){
      openModal('Upload trade document','Secure document linked to '+(state.selected?.data?.reference||'order'),`
        <div class="buyerRoomField"><label>Document type</label><select id="roomDocType"><option value="commercial_invoice">Commercial invoice</option><option value="packing_list">Packing list</option><option value="bill_of_lading">Bill of lading</option><option value="certificate_of_origin">Certificate of origin</option><option value="other">Other</option></select></div>
        <div class="buyerRoomField"><label>File</label><input id="roomDocFile" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"></div>
      `,async()=>{
        const file=document.getElementById('roomDocFile').files[0];
        if(!file){document.getElementById('buyerRoomModalMsg').innerHTML='<div class="buyerOsError">Choose a file first.</div>';return}
        const fd=new FormData();fd.append('file',file);fd.append('docType',document.getElementById('roomDocType').value);fd.append('orderId',orderId);
        try{await api('/documents',{method:'POST',body:fd});modal.classList.remove('open');await selectOrder(orderId)}
        catch(e){document.getElementById('buyerRoomModalMsg').innerHTML='<div class="buyerOsError">'+esc(e.message)+'</div>'}
      });
    }

    function openOrderConversation(order){openModal('Supplier conversation','Order '+order.reference,`<div id="roomConversationMessages" class="buyerRoomList"><div class="buyerRoomEmpty">Loading conversation…</div></div><div class="buyerRoomField" style="margin-top:10px"><label>Message supplier</label><textarea id="roomConversationInput" placeholder="Write a trade-related message…"></textarea></div>`,async()=>{const input=document.getElementById('roomConversationInput');const body=input?.value.trim();if(!body){document.getElementById('buyerRoomModalMsg').innerHTML='<div class="buyerOsError">Write a message first.</div>';return}try{const conv=await api('/messages');const match=(conv.conversations||[]).find(x=>String(x.order_id)===String(order.id));if(!match)throw new Error('No supplier conversation is linked to this order yet.');await api('/messages/'+encodeURIComponent(match.id)+'/messages',{method:'POST',body:JSON.stringify({body})});modal.classList.remove('open')}catch(e){document.getElementById('buyerRoomModalMsg').innerHTML='<div class="buyerOsError">'+esc(e.message)+'</div>'}});api('/messages').then(d=>{const match=(d.conversations||[]).find(x=>String(x.order_id)===String(order.id));if(!match){document.getElementById('roomConversationMessages').innerHTML='<div class="buyerRoomEmpty">No supplier conversation is linked to this order yet.</div>';return}return api('/messages/'+encodeURIComponent(match.id)+'/messages').then(m=>{document.getElementById('roomConversationMessages').innerHTML=(m.messages||[]).map(x=>'<div class="buyerRoomItem"><strong>'+esc(x.sender_id===getUserId()?'You':'Supplier')+'</strong><small>'+esc(x.body)+'</small></div>').join('')||'<div class="buyerRoomEmpty">No messages yet.</div>'})}).catch(e=>{const el=document.getElementById('roomConversationMessages');if(el)el.innerHTML='<div class="buyerOsError">'+esc(e.message)+'</div>'})}
function payment(order){
      openModal('Start payment','Order '+order.reference,`
        <div class="buyerRoomField"><label>Payment method</label><select id="roomPayMethod"><option value="tt">Bank transfer / TT</option><option value="escrow">Escrow</option><option value="forex">Forex</option><option value="dp">Documentary payment</option><option value="crypto">Crypto</option></select></div>
        <div class="buyerRoomField"><label>Amount (USD)</label><input id="roomPayAmount" type="number" min="0.01" step="0.01" value="${esc(Number(order.total_amount_usd)||0)}"></div>
        <div class="buyerRoomField"><label>Currency</label><select id="roomPayCurrency"><option>USD</option><option>NGN</option><option>CNY</option></select></div>
        <div class="notice">Payment initiation records the chosen rail and provider response. It does not itself confirm settlement.</div>
      `,async()=>{
        try{await api('/payments',{method:'POST',body:JSON.stringify({method:document.getElementById('roomPayMethod').value,orderId:order.id,amount:Number(document.getElementById('roomPayAmount').value),currency:document.getElementById('roomPayCurrency').value,counterpartyName:order.supplier_name||undefined})});modal.classList.remove('open');await selectOrder(order.id)}
        catch(e){document.getElementById('buyerRoomModalMsg').innerHTML='<div class="buyerOsError">'+esc(e.message)+'</div>'}
      });
    }

    async function refresh(){
      try{
        const [q,o]=await Promise.all([api('/quotes'),api('/orders')]);
        state.quotes=q.quotes||[]; state.orders=o.orders||[]; renderTransactions();
        if(state.selected?.type==='order'){const still=state.orders.find(x=>String(x.id)===String(state.selected.data.id));if(still)await selectOrder(still.id)}
      }catch(e){document.getElementById('buyerRoomTransactions').innerHTML='<div class="buyerOsError">'+esc(e.message)+'</div>'}
    }

    refresh();
  }

  function boot(){style();mount()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();