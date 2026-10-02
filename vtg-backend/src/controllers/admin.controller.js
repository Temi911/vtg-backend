const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const dashboard = asyncHandler(async (req,res)=>{
  if(req.user.role!=='admin') throw new AppError('Admin access required',403,'FORBIDDEN');
  const [users,verification,orders,lcs,payments,shipments] = await Promise.all([
    query("SELECT role, COUNT(*)::int AS count FROM users GROUP BY role ORDER BY role"),
    query("SELECT COUNT(*) FILTER (WHERE status='pending')::int AS pending, COUNT(*) FILTER (WHERE status='verified')::int AS verified, COUNT(*) FILTER (WHERE status='rejected')::int AS rejected FROM verification_documents"),
    query("SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status ORDER BY status"),
    query("SELECT status, COUNT(*)::int AS count FROM letters_of_credit GROUP BY status ORDER BY status"),
    query("SELECT status, COUNT(*)::int AS count FROM payments GROUP BY status ORDER BY status"),
    query("SELECT status, COUNT(*)::int AS count FROM shipments GROUP BY status ORDER BY status")
  ]);
  res.json({users:users.rows,verification:verification.rows[0],orders:orders.rows,lcs:lcs.rows,payments:payments.rows,shipments:shipments.rows});
});

const users = asyncHandler(async (req,res)=>{
  if(req.user.role!=='admin') throw new AppError('Admin access required',403,'FORBIDDEN');
  const {rows}=await query("SELECT id,full_name,email,role,business_verification_status,created_at FROM users ORDER BY created_at DESC LIMIT 100");
  res.json({users:rows});
});

module.exports={dashboard,users};