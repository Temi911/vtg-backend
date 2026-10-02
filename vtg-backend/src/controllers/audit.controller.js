const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const listMine = asyncHandler(async (req,res)=>{
  if(!['bank','admin'].includes(req.user.role)) throw new AppError('Only bank or admin users can view audit activity',403,'FORBIDDEN');
  const limit=Math.min(Number(req.query.limit)||100,200);
  const {rows}=await query(
    `SELECT al.id,al.actor_id,al.action,al.detail,al.ip_address,al.created_at,
            u.full_name AS actor_name,u.role AS actor_role
       FROM audit_log al LEFT JOIN users u ON u.id=al.actor_id
      WHERE al.actor_id=$1 OR ($2='admin' AND al.actor_id IS NOT NULL)
      ORDER BY al.created_at DESC LIMIT $3`,[req.user.id,req.user.role,limit]);
  res.json({audit:rows});
});
module.exports={listMine};