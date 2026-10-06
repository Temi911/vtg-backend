const {query}=require('../config/db');
const {asyncHandler}=require('../utils/asyncHandler');
const {AppError}=require('../utils/AppError');

const events=asyncHandler(async(req,res)=>{
 const q=await query(`SELECT se.id,se.shipment_id,se.event_type,se.status,se.location,se.detail,se.event_time,se.source,se.created_at
 FROM shipment_events se JOIN shipments s ON s.id=se.shipment_id JOIN orders o ON o.id=s.order_id
 WHERE s.id=$1 AND (o.buyer_id=$2 OR o.supplier_id=$2 OR o.bank_id=$2 OR o.id IN (SELECT ir.order_id FROM inspection_requests ir WHERE ir.assigned_agent_id=$2) OR $3='admin')
 ORDER BY se.event_time DESC NULLS LAST,se.created_at DESC LIMIT 100`,[req.params.shipmentId,req.user.id,req.user.role]);
 res.json({events:q.rows});
});
const append=asyncHandler(async(req,res)=>{
 if(!['admin','supplier','agent'].includes(req.user.role))throw new AppError('Role cannot add external tracking events',403,'FORBIDDEN');
 const {eventType,status,location,detail,source}=req.body||{};
 if(!eventType||!status)throw new AppError('eventType and status are required',400,'INVALID_EVENT');
 const q=await query(`INSERT INTO shipment_events(shipment_id,event_type,status,location,detail,source,event_time,created_by)
 VALUES($1,$2,$3,$4,$5,$6,COALESCE($7,now()),$8) RETURNING *`,[req.params.shipmentId,String(eventType).slice(0,80),String(status).slice(0,40),String(location||'').slice(0,200)||null,String(detail||'').slice(0,1000)||null,String(source||'VTG').slice(0,80),req.body.eventTime||null,req.user.id]);
 res.status(201).json({event:q.rows[0]});
});
module.exports={events,append};
