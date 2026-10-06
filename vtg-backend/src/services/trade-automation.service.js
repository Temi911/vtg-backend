const {query}=require('../config/db');
async function run(){
 const actions=[];
 const add=async(orderId,type,priority,title,detail,dueAt=null)=>{
  const r=await query(`INSERT INTO trade_automation_actions(order_id,action_type,priority,title,detail,due_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(order_id,action_type) DO UPDATE SET priority=EXCLUDED.priority,title=EXCLUDED.title,detail=EXCLUDED.detail,due_at=EXCLUDED.due_at,updated_at=now() WHERE trade_automation_actions.status IN ('open','acknowledged') RETURNING *`,[orderId,type,priority,title,detail,dueAt]);if(r.rows[0])actions.push(r.rows[0]);
 };
 const payments=await query(`SELECT p.order_id,o.reference FROM payment_requests p JOIN orders o ON o.id=p.order_id WHERE p.status='failed' OR (p.status IN ('pending','processing') AND p.created_at<now()-interval '48 hours')`);
 for(const x of payments.rows)await add(x.order_id,'payment_attention','high','Payment requires attention',`Payment for ${x.reference} is failed or delayed beyond the operating threshold.`);
 const docs=await query(`SELECT DISTINCT r.order_id,o.reference,COUNT(*)::int AS gaps FROM trade_document_requirements r JOIN orders o ON o.id=r.order_id WHERE r.required=TRUE AND r.status IN ('required','rejected') GROUP BY r.order_id,o.reference`);
 for(const x of docs.rows)await add(x.order_id,'document_gap','high','Required documents are incomplete',`${x.gaps} required document gap(s) remain for ${x.reference}.`);
 const ships=await query(`SELECT s.order_id,o.reference FROM shipments s JOIN orders o ON o.id=s.order_id WHERE s.status NOT IN ('delivered','cancelled') AND s.updated_at<now()-interval '72 hours'`);
 for(const x of ships.rows)await add(x.order_id,'shipment_stalled','high','Shipment update is overdue',`No shipment update has been recorded within the 72-hour operating threshold for ${x.reference}.`);
 const compliance=await query(`SELECT c.order_id,o.reference FROM trade_compliance_cases c JOIN orders o ON o.id=c.order_id WHERE c.status NOT IN ('cleared','closed')`);
 for(const x of compliance.rows)await add(x.order_id,'compliance_attention','medium','Compliance case remains open',`Compliance review for ${x.reference} is not yet cleared or closed.`);
 return {generatedAt:new Date().toISOString(),actions};
}
async function list(){const r=await query(`SELECT a.*,o.reference AS order_reference FROM trade_automation_actions a LEFT JOIN orders o ON o.id=a.order_id WHERE a.status IN ('open','acknowledged') ORDER BY CASE a.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,a.created_at ASC LIMIT 200`);return r.rows;}
async function update(id,status){const r=await query(`UPDATE trade_automation_actions SET status=$2,updated_at=now() WHERE id=$1 RETURNING *`,[id,status]);return r.rows[0]||null;}
module.exports={run,list,update};