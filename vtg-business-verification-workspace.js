(function(){
'use strict';
const host=document.getElementById('vtgBusinessVerificationWorkspace');
if(!host)return;
const required={
 supplier:[['company_registration','Company registration certificate'],['business_license','Business / trade licence'],['tax_certificate','Tax registration certificate'],['company_address_proof','Company address proof']],
 bank:[['bank_license','Bank / financial institution licence'],['regulatory_certificate','Regulatory certificate / authorisation'],['company_registration','Institution registration certificate'],['swift_bic_certificate','SWIFT / BIC evidence'],['institution_address_proof','Institution address proof'],['officer_authorization','Authorised officer evidence']]
};
const optional={supplier:[['production_facility_evidence','Production facility evidence'],['trade_performance_evidence','Trade performance evidence']]};
const BUCKET='vtg-verification-documents',LOGO_BUCKET='vtg-company-logos',MAX=10*1024*1024;
let auth,client,user,role,docs=[],supplierProfile=null,verificationRequest=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function statusLabel(s){return String(s||'pending').replace(/_/g,' ')}
function message(s,ok){const n=host.querySelector('[data-vtg-message]');if(n){n.textContent=s;n.dataset.state=ok?'ok':'error';}}
function latestDocs(){const m=new Map();for(const d of docs)if(!m.has(d.doc_type))m.set(d.doc_type,d);return m;}
function render(){
 const latest=latestDocs(),logo=latest.get('company_logo'),requiredItems=required[role]||[],items=[...requiredItems,...(optional[role]||[])];
 const rejected=[...latest.values()].filter(d=>d.status==='rejected');
 const all=[...requiredItems.map(x=>x[0]),'company_logo'].every(k=>latest.has(k)&&latest.get(k).status!=='rejected');
 const profileStatus=supplierProfile?.verification_status;
 const state=profileStatus==='verified'||user.businessVerificationStatus==='verified'||user.verificationStatus==='verified'?'verified':rejected.length?'needs_correction':(user.businessVerificationStatus||user.verificationStatus|| (all?'under_review':'pending'));
 const level=supplierProfile?.verification_level||'unverified';
 const levelNames={unverified:'Not yet verified',registered_business:'Registered Business',vtg_verified:'VTG Verified',production_verified:'Production Verified',trade_performance_reviewed:'Trade Performance Reviewed'};
 const verified=state==='verified';
 host.querySelector('[data-vtg-state]').textContent=verified?'Verified':statusLabel(state).replace(/^./,x=>x.toUpperCase());
 host.querySelector('[data-vtg-state]').className='vtg-vstate '+(verified?'good':state==='needs_correction'?'warn':'');
 host.querySelector('[data-vtg-state-note]').textContent=verified?(role==='supplier'?(level==='unverified'?'Your existing business document review is complete. Your VTG supplier verification level has not yet been assigned.':'Your organisation has been approved. Current level: '+(levelNames[level]||level)+'.'):'Your organisation has been approved.'):state==='needs_correction'?'Review the notes beside rejected documents, then upload corrected files.':all?'Your documents have been received. The verification level is awarded only after VTG reviews the evidence.':'Complete the required uploads below. Your account remains under review until VTG approves it.';
 host.querySelector('[data-vtg-logo-status]').textContent=logo?statusLabel(logo.status):'Required';
 host.querySelector('[data-vtg-docs]').innerHTML=items.map(([type,label])=>{
  const d=latest.get(type),st=d?statusLabel(d.status):'Not submitted',isOptional=(optional[role]||[]).some(x=>x[0]===type),locked=verified&&!(role==='supplier'&&isOptional&&level!=='trade_performance_reviewed');
  return '<article class="vtg-vdoc"><div><strong>'+esc(label)+(isOptional?' <small>(for higher verification levels)</small>':'')+'</strong><span class="vtg-vtag">'+esc(st)+'</span><p>'+esc(d?.review_notes||'PDF, JPEG, PNG or WEBP · up to 10 MB')+'</p></div><label class="vtg-vupload">Choose file<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" data-vtg-type="'+type+'" '+(locked?'disabled':'')+'></label><button type="button" data-vtg-upload="'+type+'" '+(locked?'disabled':'')+'>Upload</button></article>';
 }).join('');
 host.querySelector('[data-vtg-submitted]').innerHTML=docs.length?docs.map(d=>'<div class="vtg-vsubmitted"><span>'+esc(d.doc_type.replace(/_/g,' '))+' · '+esc(d.file_name)+'</span><b>'+esc(statusLabel(d.status))+'</b>'+(d.review_notes?'<p>'+esc(d.review_notes)+'</p>':'')+'</div>').join(''):'<p class="vtg-vmuted">No documents submitted yet.</p>';
 host.querySelector('[data-vtg-logo-input]').disabled=verified;
 host.querySelector('[data-vtg-logo-upload]').disabled=verified;
 host.querySelector('[data-vtg-resubmit]').hidden=state!=='needs_correction';
 host.querySelector('[data-vtg-resubmit]').disabled=!(user.pendingBusinessVerification||user.requestedRole===role);
 host.querySelector('[data-vtg-required-note]').textContent=verified?'Verification is complete.': 'The first four documents and organisation logo are the base evidence set. The two additional evidence types support higher verification levels.';
 const requestPanel=host.querySelector('[data-vtg-request-panel]');
 if(requestPanel&&role==='supplier'){
  const open=verificationRequest&&['submitted','under_review'].includes(verificationRequest.status);
  const baseReady=['company_registration','company_address_proof'].every(k=>latest.has(k)&&latest.get(k).status==='verified');
  requestPanel.innerHTML='<h3>Request a VTG verification level</h3><p>Choose the level supported by the evidence you have submitted. VTG reviewers make the final decision; requesting a level does not award it.</p>'+
   (level==='trade_performance_reviewed'?'<p>Your highest VTG supplier verification level is already recorded.</p>':(verificationRequest?'<p><strong>Latest request:</strong> '+esc(statusLabel(verificationRequest.status))+' · '+esc(levelNames[verificationRequest.requested_level]||verificationRequest.requested_level)+'</p>'+(verificationRequest.decision_summary?'<p>'+esc(verificationRequest.decision_summary)+'</p>':''):'')+
   (open?'': '<div class="vtg-vactions"><select data-vtg-level aria-label="Requested verification level"><option value="registered_business">Registered Business</option><option value="vtg_verified">VTG Verified</option><option value="production_verified">Production Verified</option><option value="trade_performance_reviewed">Trade Performance Reviewed</option></select></div><textarea data-vtg-applicant-note maxlength="1500" placeholder="Optional note for the VTG reviewer"></textarea><div class="vtg-vactions"><button type="button" data-vtg-request '+(!baseReady?'disabled':'')+'>Submit verification request</button></div>')+
   (!baseReady&&!open?'<p class="vtg-vmuted">To request a review, first have your company registration and address documents verified by VTG.</p>':'') ) );
 }else if(requestPanel){requestPanel.hidden=true;}
}
async function refresh(){
 const {data,error}=await client.from('vtg_verification_documents').select('id,doc_type,file_name,status,review_notes,uploaded_at,reviewed_at').eq('user_id',user.id).eq('account_role',role).order('uploaded_at',{ascending:false});
 if(error)throw error;docs=data||[];
 if(role==='supplier'){
  const [profileResult,requestResult]=await Promise.all([
   client.from('supplier_profiles').select('verification_status,verification_level,verification_expires_at,verification_summary').eq('user_id',user.id).maybeSingle(),
   client.from('vtg_supplier_verification_requests').select('id,requested_level,status,decision_summary,submitted_at,reviewed_at,awarded_level,expires_at').eq('supplier_id',user.id).order('submitted_at',{ascending:false}).limit(1).maybeSingle()
  ]);
  if(profileResult.error)throw profileResult.error;if(requestResult.error)throw requestResult.error;
  supplierProfile=profileResult.data;verificationRequest=requestResult.data;
 }
 render();
}
function fileExt(file){const ext=(file.name.split('.').pop()||'').toLowerCase();return ['pdf','jpg','jpeg','png','webp'].includes(ext)?ext:'';}
async function upload(file,type){
 if(!file)throw new Error('Choose a file first.');
 if(file.size<1||file.size>MAX)throw new Error('Each document must be 10 MB or smaller.');
 const allowed=type==='company_logo'?['image/jpeg','image/png','image/webp']:['application/pdf','image/jpeg','image/png','image/webp'];
 if(!allowed.includes(file.type)||!fileExt(file))throw new Error('Use a PDF, JPEG, PNG or WEBP file.');
 if(type==='company_logo'&&file.size>5*1024*1024)throw new Error('The organisation logo must be 5 MB or smaller.');
 const bucket=type==='company_logo'?LOGO_BUCKET:BUCKET;
 const path=user.id+'/'+Date.now()+'-'+crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-100);
 const up=await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
 if(up.error)throw up.error;
 const row={user_id:user.id,account_role:role,doc_type:type,file_name:file.name,mime_type:file.type,file_size_bytes:file.size,storage_path:bucket+'/'+path,status:'pending'};
 const ins=await client.from('vtg_verification_documents').insert(row);
 if(ins.error){await client.storage.from(bucket).remove([path]);throw ins.error;}
 await refresh();
}
host.addEventListener('click',async e=>{
 const btn=e.target.closest('[data-vtg-upload],[data-vtg-logo-upload],[data-vtg-resubmit],[data-vtg-request]');if(!btn)return;
 try{
  btn.disabled=true;message(btn.hasAttribute('data-vtg-request')?'Submitting your verification request…':'Uploading securely…',true);
  if(btn.hasAttribute('data-vtg-request')){
   const requestedLevel=host.querySelector('[data-vtg-level]')?.value;
   const applicantNote=host.querySelector('[data-vtg-applicant-note]')?.value||'';
   const result=await client.from('vtg_supplier_verification_requests').insert({supplier_id:user.id,requested_level:requestedLevel,applicant_note:applicantNote.trim()||null});
   if(result.error)throw result.error;
   await refresh();message('Your request has been submitted. VTG will review the evidence and notify you of the decision.',true);return;
  }
  if(btn.hasAttribute('data-vtg-resubmit')){
   const result=await client.rpc('vtg_resubmit_rejected_role_request',{p_requested_role:role});
   if(result.error)throw result.error;
   const state=await client.from('role_requests').select('status')
    .eq('user_id',user.id).eq('requested_role',role)
    .order('created_at',{ascending:false}).limit(1).maybeSingle();
   if(state.error)throw state.error;
   host.innerHTML='<section class="vtg-vpanel"><header><div><span class="vtg-veye">ACCOUNT APPLICATION</span><h2>Application resubmitted</h2><p>Your application is back in VTG’s review queue. No further action is required unless our team contacts you.</p></div><span class="vtg-vstate">Awaiting approval</span></header><p class="vtg-vstate-note">We will email you when a decision has been made. Please check your inbox and spam or junk folder.</p></section>';
   return;
  }
  const type=btn.getAttribute('data-vtg-upload')||'company_logo';
  const input=type==='company_logo'?host.querySelector('[data-vtg-logo-input]'):host.querySelector('[data-vtg-type="'+type+'"]');
  await upload(input?.files?.[0],type);if(input)input.value='';
  message('Upload received. VTG will review the submitted evidence.',true);
 }catch(err){message(err.message||'Upload failed. Please try again.',false);}
 finally{btn.disabled=false;}
});
(async()=>{
 host.innerHTML='<section class="vtg-vpanel"><header><div><span class="vtg-veye">ORGANISATION</span><h2>Business verification</h2><p>Submit your organisation’s evidence securely from this workspace. VTG will email its decision after review.</p></div><span class="vtg-vstate" data-vtg-state>Loading…</span></header><p class="vtg-vstate-note" data-vtg-state-note>Connecting to your secure verification records…</p><div class="vtg-vgrid"><section class="vtg-vcard"><h3>Organisation logo <span data-vtg-logo-status>Required</span></h3><p>A clear official company or institution logo is required.</p><div class="vtg-vactions"><input type="file" accept=".jpg,.jpeg,.png,.webp" data-vtg-logo-input><button type="button" data-vtg-logo-upload>Upload logo</button></div></section><section class="vtg-vcard"><h3>Required documents</h3><p data-vtg-required-note>Preparing your checklist…</p><div data-vtg-docs></div></section></div><section class="vtg-vcard"><h3>Submitted documents</h3><div data-vtg-submitted></div></section><div class="vtg-vfooter"><span data-vtg-message role="status"></span><button type="button" data-vtg-resubmit hidden>Resubmit application</button></div></section>';
 try{
  if(!window.VTG_AUTH_READY)throw new Error('Secure sign-in is unavailable. Refresh the workspace and try again.');
  auth=await window.VTG_AUTH_READY;const current=await auth.getCurrent();
  if(!current?.user)throw new Error('Sign in again to access business verification.');
  user=current.user;role=user.role==='buyer'&&user.requestedRole?user.requestedRole:user.role;
  if(!['supplier','bank'].includes(role))throw new Error('This verification workspace is for supplier and bank accounts.');
  client=auth.client;if(!client)throw new Error('Secure document storage is unavailable.');
  // A new supplier/bank applicant must wait for account-opening approval before
  // entering the separate document-verification stage.
  if(user.pendingBusinessVerification){
   const application=await client.from('role_requests')
    .select('status,reviewer_notes,created_at')
    .eq('user_id',user.id).eq('requested_role',role)
    .order('created_at',{ascending:false}).limit(1).maybeSingle();
   if(application.error)throw application.error;
   const status=application.data?.status||'pending';
   const notes=application.data?.reviewer_notes||'';
   if(status==='rejected'){
    host.innerHTML='<section class="vtg-vpanel"><header><div><span class="vtg-veye">ACCOUNT APPLICATION</span><h2>Application needs attention</h2><p>VTG has reviewed your account-opening application and has not approved it at this time.</p></div><span class="vtg-vstate warn">Action required</span></header><p class="vtg-vstate-note">'+esc(notes||'Please resubmit your application for another review.')+'</p><div class="vtg-vfooter"><span data-vtg-message role="status"></span><button type="button" data-vtg-resubmit>Resubmit application</button></div></section>';
   }else if(status==='approved'){
    host.innerHTML='<section class="vtg-vpanel"><header><div><span class="vtg-veye">ACCOUNT APPLICATION</span><h2>Approval recorded</h2><p>Your account-opening application has been approved. Refresh this page or sign in again to continue to business verification.</p></div><span class="vtg-vstate good">Approved</span></header></section>';
   }else{
    host.innerHTML='<section class="vtg-vpanel"><header><div><span class="vtg-veye">ACCOUNT APPLICATION</span><h2>Application received</h2><p>Your '+(role==='bank'?'bank / financial institution':'supplier / trading company')+' account application is awaiting VTG administrative approval.</p></div><span class="vtg-vstate">Awaiting approval</span></header><p class="vtg-vstate-note">No further action is required while your application is being reviewed. VTG will send an email to your registered address when a decision has been made. Please check your inbox and spam or junk folder. Business document verification and workspace features will become available after account approval.</p></section>';
   }
   return;
  }
  await refresh();
 }catch(err){message(err.message||'Could not load verification records.',false);}
})();
})();