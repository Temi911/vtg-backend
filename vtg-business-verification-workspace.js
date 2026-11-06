(function(){
'use strict';
const host=document.getElementById('vtgBusinessVerificationWorkspace');
if(!host)return;
const required={
 supplier:[['company_registration','Company registration certificate'],['business_license','Business / trade licence'],['tax_certificate','Tax registration certificate'],['company_address_proof','Company address proof']],
 bank:[['bank_license','Bank / financial institution licence'],['regulatory_certificate','Regulatory certificate / authorisation'],['company_registration','Institution registration certificate'],['swift_bic_certificate','SWIFT / BIC evidence'],['institution_address_proof','Institution address proof'],['officer_authorization','Authorised officer evidence']]
};
const BUCKET='vtg-verification-documents',LOGO_BUCKET='vtg-company-logos',MAX=10*1024*1024;
let auth,client,user,role,docs=[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function statusLabel(s){return String(s||'pending').replace(/_/g,' ')}
function message(s,ok){const n=host.querySelector('[data-vtg-message]');if(n){n.textContent=s;n.dataset.state=ok?'ok':'error';}}
function latestDocs(){const m=new Map();for(const d of docs)if(!m.has(d.doc_type))m.set(d.doc_type,d);return m;}
function render(){
 const latest=latestDocs(),logo=latest.get('company_logo'),items=required[role]||[];
 const rejected=docs.filter(d=>d.status==='rejected');
 const all=[...items.map(x=>x[0]),'company_logo'].every(k=>latest.has(k)&&latest.get(k).status!=='rejected');
 const state=user.businessVerificationStatus||user.verificationStatus||(rejected.length?'needs_correction':all?'under_review':'pending');
 const verified=state==='verified';
 host.querySelector('[data-vtg-state]').textContent=verified?'Verified':statusLabel(state).replace(/^./,x=>x.toUpperCase());
 host.querySelector('[data-vtg-state]').className='vtg-vstate '+(verified?'good':state==='needs_correction'?'warn':'');
 host.querySelector('[data-vtg-state-note]').textContent=verified?'Your organisation has been approved.':state==='needs_correction'?'Review the notes beside rejected documents, then upload corrected files.':all?'Your documents have been received and are awaiting VTG review.':'Complete the required uploads below. Your account remains under review until VTG approves it.';
 host.querySelector('[data-vtg-logo-status]').textContent=logo?statusLabel(logo.status):'Required';
 host.querySelector('[data-vtg-docs]').innerHTML=items.map(([type,label])=>{
  const d=latest.get(type),st=d?statusLabel(d.status):'Not submitted';
  return '<article class="vtg-vdoc"><div><strong>'+esc(label)+'</strong><span class="vtg-vtag">'+esc(st)+'</span><p>'+esc(d?.review_notes||'PDF, JPEG, PNG or WEBP · up to 10 MB')+'</p></div><label class="vtg-vupload">Choose file<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" data-vtg-type="'+type+'" '+(verified?'disabled':'')+'></label><button type="button" data-vtg-upload="'+type+'" '+(verified?'disabled':'')+'>Upload</button></article>';
 }).join('');
 host.querySelector('[data-vtg-submitted]').innerHTML=docs.length?docs.map(d=>'<div class="vtg-vsubmitted"><span>'+esc(d.doc_type.replace(/_/g,' '))+' · '+esc(d.file_name)+'</span><b>'+esc(statusLabel(d.status))+'</b>'+(d.review_notes?'<p>'+esc(d.review_notes)+'</p>':'')+'</div>').join(''):'<p class="vtg-vmuted">No documents submitted yet.</p>';
 host.querySelector('[data-vtg-logo-input]').disabled=verified;
 host.querySelector('[data-vtg-logo-upload]').disabled=verified;
 host.querySelector('[data-vtg-resubmit]').hidden=state!=='needs_correction';
 host.querySelector('[data-vtg-resubmit]').disabled=!(user.pendingBusinessVerification||user.requestedRole===role);
 host.querySelector('[data-vtg-required-note]').textContent=verified?'Verification is complete.': 'Organisation logo and all listed documents are required for VTG business verification.';
}
async function refresh(){
 const {data,error}=await client.from('vtg_verification_documents').select('id,doc_type,file_name,status,review_notes,uploaded_at,reviewed_at').eq('user_id',user.id).eq('account_role',role).order('uploaded_at',{ascending:false});
 if(error)throw error;docs=data||[];render();
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
 const btn=e.target.closest('[data-vtg-upload],[data-vtg-logo-upload],[data-vtg-resubmit]');if(!btn)return;
 try{
  btn.disabled=true;message('Uploading securely…',true);
  if(btn.hasAttribute('data-vtg-resubmit')){
   const result=await client.rpc('vtg_resubmit_rejected_role_request',{p_requested_role:role});
   if(result.error)throw result.error;
   message('Your corrected application has been resubmitted for review.',true);return;
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
  await refresh();
 }catch(err){message(err.message||'Could not load verification records.',false);}
})();
})();