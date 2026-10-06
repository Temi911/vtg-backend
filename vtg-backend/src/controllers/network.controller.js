const {query}=require('../config/db');
const {AppError}=require('../utils/AppError');
const {asyncHandler}=require('../utils/asyncHandler');
const audit=require('../services/audit.service');

const directory=asyncHandler(async(req,res)=>{
  const role=String(req.query.role||'').trim();
  const allowed=['supplier','bank','agent'];
  const params=[];
  let filter="((u.role IN ('supplier','bank') AND u.business_verification_status='verified') OR (u.role='agent' AND ap.status='approved'))";
  params.push(role&&allowed.includes(role)?[role]:allowed);
  const q=await query(`
    SELECT u.id,u.role,u.full_name,u.business_verification_status,
           sp.company_name,sp.company_logo_url,
           bp.bank_name,bp.institution_logo_url,
           ap.city,ap.country,ap.languages,ap.regions_served
      FROM users u
      LEFT JOIN supplier_profiles sp ON sp.user_id=u.id
      LEFT JOIN bank_profiles bp ON bp.user_id=u.id
      LEFT JOIN agent_profiles ap ON ap.user_id=u.id
     WHERE ${filter}
     ORDER BY u.role,u.full_name
     LIMIT 200`,params);
  res.json({partners:q.rows.map(x=>({
    id:x.id,role:x.role,name:x.company_name||x.bank_name||x.full_name,
    fullName:x.full_name,verificationStatus:x.business_verification_status,
    logoUrl:x.company_logo_url||x.institution_logo_url||null,
    location:[x.city,x.country].filter(Boolean).join(', ')||null,
    languages:x.languages||null,regions:x.regions_served||null
  }))});
});

const mine=asyncHandler(async(req,res)=>{
  const q=await query(`
    SELECT r.*,u.full_name AS partner_full_name,u.role AS partner_role,
           sp.company_name,bp.bank_name,ap.city,ap.country
      FROM partner_relationships r JOIN users u ON u.id=r.partner_id
      LEFT JOIN supplier_profiles sp ON sp.user_id=u.id
      LEFT JOIN bank_profiles bp ON bp.user_id=u.id
      LEFT JOIN agent_profiles ap ON ap.user_id=u.id
     WHERE r.requester_id=$1 OR r.partner_id=$1
     ORDER BY r.updated_at DESC`,[req.user.id]);
  res.json({relationships:q.rows});
});

const requestRelationship=asyncHandler(async(req,res)=>{
  const {partnerId,partnerType,note}=req.body||{};
  const allowed=['supplier','bank','agent','logistics','inspection','technology','institution'];
  if(!partnerId||!allowed.includes(partnerType)) throw new AppError('A valid partner and partner type are required',400,'INVALID_PARTNER');
  if(partnerId===req.user.id) throw new AppError('You cannot connect your own account',400,'INVALID_PARTNER');
  const target=await query('SELECT id,role,business_verification_status FROM users WHERE id=$1',[partnerId]);
  if(!target.rows[0]) throw new AppError('Partner not found',404);
  if(['supplier','bank','agent'].includes(target.rows[0].role)&&target.rows[0].business_verification_status!=='verified') throw new AppError('This partner is not currently verified',400,'PARTNER_NOT_VERIFIED');
  const q=await query(`INSERT INTO partner_relationships(requester_id,partner_id,partner_type,note) VALUES($1,$2,$3,$4) ON CONFLICT(requester_id,partner_id,partner_type) DO UPDATE SET status='requested',note=EXCLUDED.note,updated_at=now() RETURNING *`,[req.user.id,partnerId,partnerType,String(note||'').slice(0,1000)||null]);
  await audit.log(req.user.id,'Partner Relationship Requested',`${partnerType}: ${partnerId}`,req.ip);
  res.status(201).json({relationship:q.rows[0]});
});

const reviewRelationship=asyncHandler(async(req,res)=>{
  if(req.user.role!=='admin') throw new AppError('Admin access required',403,'FORBIDDEN');
  const status=['approved','suspended','rejected','ended'].includes(req.body?.status)?req.body.status:null;
  if(!status) throw new AppError('Invalid relationship status',400,'INVALID_STATUS');
  const q=await query('UPDATE partner_relationships SET status=$1,updated_at=now() WHERE id=$2 RETURNING *',[status,req.params.id]);
  if(!q.rows[0]) throw new AppError('Relationship not found',404);
  await audit.log(req.user.id,'Partner Relationship Reviewed',`${q.rows[0].id}: ${status}`,req.ip);
  res.json({relationship:q.rows[0]});
});

const performance=asyncHandler(async(req,res)=>{
  const target=req.params.id;
  const u=await query('SELECT id,role,full_name,business_verification_status FROM users WHERE id=$1',[target]);
  if(!u.rows[0]) throw new AppError('Partner not found',404);
  const role=u.rows[0].role;
  const [orders,inspections,payments,relationships]=await Promise.all([
    query(`SELECT count(*)::int AS count FROM orders WHERE ${role==='supplier'?'supplier_id':role==='buyer'?'buyer_id':'id'}=$1`,[target]),
    query(`SELECT count(*)::int AS count FROM inspection_requests WHERE ${role==='buyer'?'buyer_id':'assigned_agent_id'}=$1`,[target]).catch(()=>({rows:[{count:0}]})),
    query(`SELECT count(*)::int AS count FROM payment_requests WHERE initiated_by=$1`,[target]).catch(()=>({rows:[{count:0}]})),
    query('SELECT count(*)::int AS count FROM partner_relationships WHERE (requester_id=$1 OR partner_id=$1) AND status=\'approved\'',[target])
  ]);
  res.json({partner:u.rows[0],metrics:{orders:orders.rows[0].count,inspections:inspections.rows[0].count,payments:payments.rows[0].count,approvedRelationships:relationships.rows[0].count}});
});
module.exports={directory,mine,requestRelationship,reviewRelationship,performance};
