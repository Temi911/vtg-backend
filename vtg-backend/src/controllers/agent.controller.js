const{z}=require('zod');const{query}=require('../config/db');const audit=require('../services/audit.service');const{AppError}=require('../utils/AppError');const{asyncHandler}=require('../utils/asyncHandler');const me=asyncHandler(async(req,res)=>{const{rows}=await query(`SELECT u.id,u.full_name,u.email,u.is_verified,u.is_active,ap.* FROM users u JOIN agent_profiles ap ON ap.user_id=u.id WHERE u.id=$1`,[req.user.id]);if(!rows[0])throw new AppError('Agent profile not found',404);res.json({agent:rows[0]});});const update=asyncHandler(async(req,res)=>{const d=z.object({bio:z.string().max(2000).optional(),regionsServed:z.string().max(1000).optional(),categories:z.array(z.string()).max(30).optional(),languages:z.array(z.string()).max(20).optional(),payoutMethod:z.string().max(80).optional()}).parse(req.body);const{rows}=await query(`UPDATE agent_profiles SET bio=COALESCE($1,bio),regions_served=COALESCE($2,regions_served),categories=COALESCE($3,categories),languages=COALESCE($4,languages),payout_method=COALESCE($5,payout_method),updated_at=now() WHERE user_id=$6 RETURNING *`,[d.bio,d.regionsServed,d.categories,d.languages,d.payoutMethod,req.user.id]);res.json({agent:rows[0]});});const review=asyncHandler(async(req,res)=>{
  const d=z.object({
    status:z.enum(['approved','rejected','suspended']),
    notes:z.string().trim().max(1000).optional()
  }).superRefine((value,ctx)=>{
    if(['rejected','suspended'].includes(value.status)&&String(value.notes||'').trim().length<5){
      ctx.addIssue({code:z.ZodIssueCode.custom,path:['notes'],message:'A review note of at least five characters is required.'});
    }
  }).parse(req.body);
  if(d.status==='approved'){
    const requiredTypes=['government_id','proof_of_address','business_registration','professional_certificate','reference_document'];
    const {rows:documents}=await query(
      `SELECT DISTINCT ON (doc_type) doc_type,status::text AS status,expires_at
         FROM verification_documents
        WHERE user_id=$1 AND doc_type=ANY($2::text[])
        ORDER BY doc_type,uploaded_at DESC,id::text DESC`,
      [req.params.id,requiredTypes]
    );
    const latest=new Map(documents.map(row=>[row.doc_type,row]));
    const isCurrentVerified=(type)=>{
      const row=latest.get(type);
      return Boolean(row&&row.status==='verified'&&(!row.expires_at||new Date(row.expires_at).getTime()>Date.now()));
    };
    const identityReady=isCurrentVerified('government_id')&&isCurrentVerified('proof_of_address');
    const experienceReady=['business_registration','professional_certificate','reference_document'].some(isCurrentVerified);
    if(!identityReady||!experienceReady){
      throw new AppError('Agent approval requires verified government ID, proof of address, and at least one verified business, professional, or reference document.',409,'AGENT_EVIDENCE_INCOMPLETE');
    }
  }
  const {rows}=await query(
    `UPDATE agent_profiles SET status=$1,updated_at=now() WHERE user_id=$2 RETURNING *`,
    [d.status,req.params.id]
  );
  if(!rows[0])throw new AppError('Agent profile not found',404);
  await audit.log(req.user.id,'Agent Status Updated',`${req.params.id}: ${d.status}${d.notes?' — '+d.notes:''}`,req.ip);
  res.json({agent:rows[0]});
});const stats=asyncHandler(async(req,res)=>{const{rows}=await query(`SELECT (SELECT count(*) FROM inspection_requests WHERE assigned_agent_id=$1) assigned,(SELECT count(*) FROM inspection_requests WHERE assigned_agent_id=$1 AND status='awaiting_buyer') submitted,(SELECT count(*) FROM inspection_requests WHERE assigned_agent_id=$1 AND status='approved') completed,(SELECT COALESCE(sum(amount_usd),0) FROM agent_payouts WHERE agent_id=$1 AND status='paid') paid_usd,(SELECT COALESCE(sum(amount_usd),0) FROM agent_payouts WHERE agent_id=$1 AND status='pending') pending_usd`,[req.user.id]);res.json({stats:rows[0]});});module.exports={me,update,review,stats};