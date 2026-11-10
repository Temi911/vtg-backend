(()=> {
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  let client = null, data = null, busy = false;
  const panel = (id) => document.getElementById(id);
  const message = (id, value, bad=false) => { const n=panel(id); if(n){n.textContent=value;n.dataset.state=bad?"error":"info";} };
  async function signedDocument(path, name) {
    if (!client || !path) return;
    const { data: signed, error } = await client.storage.from("vtg-trade-documents").createSignedUrl(path, 60);
    if (error || !signed?.signedUrl) { alert("This bank account cannot access that private file."); return; }
    const a=document.createElement("a");a.href=signed.signedUrl;a.target="_blank";a.rel="noopener";a.download=name||"VTG-trade-document";a.click();
  }
  function render() {
    if (!data) return;
    const orders=new Map((data.orders||[]).map(x=>[x.id,x]));
    const lcs=data.letters_of_credit||[];
    const cases=panel("vtgBankLiveCases");
    if(cases) cases.innerHTML='<div class="panelhead"><h2>Live assigned VTG trade cases</h2><span class="pill blue">'+lcs.length+' assigned</span></div><p class="footnote">'+esc(data.notice||"Assigned cases only.")+'</p>'+
      (lcs.length?lcs.map(lc=>{const o=orders.get(lc.order_id)||{};return '<article class="queueitem" style="display:block;margin:10px 0;padding:14px"><b>'+esc(lc.reference||lc.id)+'</b><small>'+esc(o.reference||"Linked order")+' · '+esc(o.quantity??"—")+' units · '+esc(lc.currency||o.currency||"")+' '+Number(lc.amount||0).toLocaleString()+'</small><small>Order status: '+esc(o.status||"—")+' · LC review: '+esc(lc.status||"requested")+' · Expires: '+esc(lc.expiry_date||"Not set")+'</small><div class="actions" style="margin-top:10px"><button class="btn" data-lc-review="'+esc(lc.id)+'" data-review-status="under_review">Start review</button><button class="btn" data-lc-review="'+esc(lc.id)+'" data-review-status="documents_requested">Request documents</button><button class="btn alt" data-lc-review="'+esc(lc.id)+'" data-review-status="declined">Decline request</button></div></article>'}).join(""):'<p class="muted">No letters of credit have been assigned to this verified bank account.</p>');
    const docs=panel("vtgBankLiveDocuments");
    if(docs) docs.innerHTML='<div class="panelhead"><h2>Private trade documents</h2><span class="pill blue">'+(data.documents||[]).length+' linked</span></div><p class="footnote">Files are available only where this bank is assigned to the order through a letter of credit. Download links expire after 60 seconds.</p>'+
      ((data.documents||[]).length?data.documents.map(d=>'<div class="queueitem"><div style="flex:1"><b>'+esc(d.file_name||"Trade document")+'</b><small>'+esc(d.document_type||"Document")+' · '+esc(d.status||"pending")+' · '+esc(orders.get(d.order_id)?.reference||"Linked order")+'</small></div><button class="btn" data-doc-path="'+esc(d.storage_path)+'" data-doc-name="'+esc(d.file_name)+'">Secure download</button></div>').join(""):'<p class="muted">No documents are attached to the bank’s assigned cases.</p>');
    const ship=panel("vtgBankLiveShipments");
    if(ship) ship.innerHTML='<div class="panelhead"><h2>Live shipment records</h2><span class="pill blue">'+(data.shipments||[]).length+' shipments</span></div>'+
      ((data.shipments||[]).length?data.shipments.map(s=>'<article class="queueitem" style="display:block"><b>'+esc(orders.get(s.order_id)?.reference||s.order_id)+'</b><small>'+esc(s.carrier||"Carrier pending")+' · '+esc(s.container_number||s.tracking_number||"No tracking reference")+'</small><small>'+esc(s.origin_port||"Origin pending")+' → '+esc(s.destination_port||"Destination pending")+' · '+esc(s.status||"pending")+'</small>'+((data.shipment_events||[]).filter(e=>e.shipment_id===s.id).map(e=>'<small>• '+esc(e.event_type)+' · '+esc(e.location||"Location not supplied")+' · '+esc(e.event_time)+'</small>').join(""))+'</article>').join(""):'<p class="muted">No shipment records are linked to the assigned LC cases yet.</p>');
    const payments=panel("vtgBankLivePayments");
    if(payments) payments.innerHTML='<div class="panelhead"><h2>Payment records</h2><span class="pill amber">Reference only</span></div><p class="footnote">These are payment intents, not proof of settlement. This workspace does not initiate, approve or release payments.</p>'+
      ((data.payment_intents||[]).length?data.payment_intents.map(p=>'<div class="queueitem"><b>'+esc(orders.get(p.order_id)?.reference||p.order_id)+'</b><small>'+esc(p.currency)+' '+Number(p.amount||0).toLocaleString()+' · '+esc(p.purpose)+' · '+esc(p.status)+'</small></div>').join(""):'<p class="muted">No payment intents are linked to assigned cases.</p>');
  }
  async function load() {
    if(busy||!client)return;busy=true;
    ["vtgBankLiveCases","vtgBankLiveDocuments","vtgBankLiveShipments","vtgBankLivePayments"].forEach(id=>message(id,"Loading verified bank records…"));
    try {
      const {data:result,error}=await client.functions.invoke("vtg-bank-trade-workspace",{body:{action:"overview"}});
      if(error) throw error;
      if(result?.error) throw new Error(result.error);
      data=result;render();
    } catch(e) {
      const msg=String(e?.message||"Bank records could not be loaded.");
      ["vtgBankLiveCases","vtgBankLiveDocuments","vtgBankLiveShipments","vtgBankLivePayments"].forEach(id=>message(id,msg,true));
    } finally {busy=false;}
  }
  document.addEventListener("click",async e=>{
    const doc=e.target.closest("[data-doc-path]");
    if(doc){await signedDocument(doc.dataset.docPath,doc.dataset.docName);return;}
    const btn=e.target.closest("[data-lc-review]");
    if(!btn||!client)return;
    const status=btn.dataset.reviewStatus,lcId=btn.dataset.lcReview;
    const note=prompt("Add a short review note for the audit record:","");
    if(note===null)return;
    btn.disabled=true;
    try{
      const {data:result,error}=await client.functions.invoke("vtg-bank-trade-workspace",{body:{action:"review-lc",lc_id:lcId,status,note}});
      if(error)throw error;
      if(result?.error)throw new Error(result.error);
      await load();
    }catch(err){alert(err.message||"The review action could not be recorded.");}
    finally{btn.disabled=false;}
  });
  async function init(){
    const host=panel("vtgBankLiveCases");
    if(!host)return;
    try{
      const auth=await window.VTG_AUTH_READY;
      client=auth?.client||window.VTGAuth?.client||window.VTG_SUPABASE;
      if(!client)throw new Error("Secure VTG sign-in is unavailable.");
      const {data:session,error}=await client.auth.getSession();if(error)throw error;
      if(!session.session)throw new Error("Sign in with your VTG bank account to view assigned cases.");
      const {data:profile,error:pe}=await client.from("profiles").select("role,is_active,account_environment").eq("id",session.session.user.id).maybeSingle();
      if(pe)throw pe;
      if(profile?.role!=="bank"||profile?.is_active!==true||profile?.account_environment!=="trade")throw new Error("An active bank trade account is required.");
      const {data:bank,error:be}=await client.from("bank_profiles").select("verification_status").eq("user_id",session.session.user.id).maybeSingle();
      if(be)throw be;
      if(bank?.verification_status!=="verified"){
        ["vtgBankLiveCases","vtgBankLiveDocuments","vtgBankLiveShipments","vtgBankLivePayments"].forEach(id=>message(id,"Your bank account is awaiting VTG approval. Assigned trade records will appear after approval."));
        return;
      }
      await load();
      panel("vtgBankLiveRefresh")?.addEventListener("click",load);
    }catch(e){["vtgBankLiveCases","vtgBankLiveDocuments","vtgBankLiveShipments","vtgBankLivePayments"].forEach(id=>message(id,e.message||"Bank workspace unavailable.",true));}
  }
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();
