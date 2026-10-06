const {query}=require('../config/db');
function level(score){return score>=80?'critical':score>=55?'high':score>=30?'medium':'low';}
function assess(row){
 let score=0;const factors=[],recommendations=[];
 const add=(points,code,label,rec)=>{score+=points;factors.push({code,points,label});if(rec)recommendations.push(rec);};
 if(['failed'].includes(row.payment_status))add(30,'PAYMENT_FAILED','Payment failed','Resolve or replace the failed payment before release.');
 if(['pending','processing'].includes(row.payment_status)&&row.payment_age_hours>48)add(20,'PAYMENT_DELAY','Payment has remained pending/processing for more than 48 hours','Review payment provider status and reconciliation.');
 if(row.compliance_status&& !['cleared','closed'].includes(row.compliance_status))add(20,'COMPLIANCE_OPEN','Compliance case is still open','Assign an owner and complete outstanding compliance actions.');
 if(Number(row.document_gaps)>0)add(Math.min(20,Number(row.document_gaps)*5),'DOCUMENT_GAPS',row.document_gaps+' required document gap(s)','Resolve required document gaps before clearance or release.');
 if(row.shipment_stale)add(20,'SHIPMENT_STALE','Shipment has not updated recently','Check carrier/port status and record the latest verified milestone.');
 if(row.inspection_status&&['rejected','disputed'].includes(row.inspection_status))add(15,'INSPECTION_ISSUE','Inspection requires attention','Review inspection evidence and buyer response.');
 if(row.order_status==='disputed')add(25,'ORDER_DISPUTED','Order is disputed','Route the transaction to the appropriate resolution workflow.');
 score=Math.min(100,score);
 return {score,level:level(score),factors,recommendations};
}
async function scanOrder(orderId){
 const r=await query(`SELECT o.id,o.status AS order_status,
 p.status AS payment_status,EXTRACT(EPOCH FROM (now()-p.created_at))/3600 AS payment_age_hours,
 c.status AS compliance_status,
 (SELECT COUNT(*) FROM trade_document_requirements d WHERE d.order_id=o.id AND d.required=TRUE AND d.status IN ('required','rejected')) AS document_gaps,
 s.updated_at AS shipment_updated_at,
 CASE WHEN s.id IS NOT NULL AND s.status NOT IN ('delivered','cancelled') AND s.updated_at < now()-interval '72 hours' THEN TRUE ELSE FALSE END AS shipment_stale,
 ir.status AS inspection_status
 FROM orders o
 LEFT JOIN LATERAL (SELECT * FROM payment_requests x WHERE x.order_id=o.id ORDER BY x.created_at DESC LIMIT 1) p ON true
 LEFT JOIN trade_compliance_cases c ON c.order_id=o.id
 LEFT JOIN LATERAL (SELECT * FROM shipments x WHERE x.order_id=o.id ORDER BY x.created_at DESC LIMIT 1) s ON true
 LEFT JOIN LATERAL (SELECT status FROM inspection_requests x WHERE x.order_id=o.id ORDER BY x.created_at DESC LIMIT 1) ir ON true
 WHERE o.id=$1`,[orderId]);
 if(!r.rows[0]) return null;
 const result=assess(r.rows[0]);
 await query(`INSERT INTO trade_risk_assessments(order_id,score,level,factors,recommendations,assessed_at) VALUES($1,$2,$3,$4,$5,now()) ON CONFLICT(order_id) DO UPDATE SET score=EXCLUDED.score,level=EXCLUDED.level,factors=EXCLUDED.factors,recommendations=EXCLUDED.recommendations,assessed_at=now()`,[orderId,result.score,result.level,JSON.stringify(result.factors),JSON.stringify(result.recommendations)]);
 return {orderId,...result,assessedAt:new Date().toISOString()};
}
async function scanOpenOrders(){
 const r=await query(`SELECT id FROM orders WHERE status NOT IN ('delivered','cancelled') ORDER BY updated_at DESC LIMIT 200`);
 const out=[];for(const x of r.rows){const a=await scanOrder(x.id);if(a)out.push(a);}return out;
}
module.exports={scanOrder,scanOpenOrders,assess};