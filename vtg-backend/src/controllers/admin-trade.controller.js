const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

function adminOnly(req){ if(req.user.role!=='admin') throw new AppError('Admin access required',403,'FORBIDDEN'); }

const overview = asyncHandler(async (req,res)=>{
  adminOnly(req);
  const [orders,lcs,payments,shipments,docs] = await Promise.all([
    query(`SELECT o.id,o.reference,o.status,o.total_amount_usd,o.incoterm,o.created_at,o.updated_at,
                   bu.full_name AS buyer_name,su.full_name AS supplier_name
            FROM orders o JOIN users bu ON bu.id=o.buyer_id JOIN users su ON su.id=o.supplier_id
            ORDER BY o.updated_at DESC LIMIT 100`),
    query(`SELECT lc.id,lc.reference,lc.status,lc.amount_usd,lc.issuing_bank_name,lc.issuing_bank_id,
                   lc.swift_mt700_ref,lc.swift_mt103_ref,lc.created_at,lc.updated_at,
                   o.reference AS order_reference,bu.full_name AS buyer_name,su.full_name AS supplier_name
            FROM letters_of_credit lc
            JOIN orders o ON o.id=lc.order_id
            JOIN users bu ON bu.id=lc.buyer_id
            JOIN users su ON su.id=lc.supplier_id
            ORDER BY lc.updated_at DESC LIMIT 100`),
    query(`SELECT p.*,o.reference AS order_reference, CASE WHEN p.status IN ('pending','processing') AND p.created_at < now() - interval '48 hours' THEN 'overdue' WHEN p.status='failed' THEN 'failed' WHEN p.status='refunded' THEN 'refunded' WHEN p.status='processing' THEN 'attention' ELSE 'normal' END AS finance_exception
            FROM payment_requests p LEFT JOIN orders o ON o.id=p.order_id
            ORDER BY p.created_at DESC LIMIT 100`),
    query(`SELECT s.*,o.reference AS order_reference,o.status AS order_status,
                   bu.full_name AS buyer_name,su.full_name AS supplier_name
            FROM shipments s
            JOIN orders o ON o.id=s.order_id
            JOIN users bu ON bu.id=o.buyer_id
            JOIN users su ON su.id=o.supplier_id
            ORDER BY s.created_at DESC LIMIT 100`),
    query(`SELECT d.id,d.doc_type,d.file_name,d.status,d.notes,d.created_at,d.updated_at,
                   d.order_id,d.lc_id,u.full_name AS owner_name,u.email AS owner_email
            FROM documents d JOIN users u ON u.id=d.uploaded_by
            ORDER BY d.updated_at DESC LIMIT 100`)
  ]);
  res.json({
    orders:orders.rows,lcs:lcs.rows,payments:payments.rows,shipments:shipments.rows,documents:docs.rows,
    summary:{
      orders:orders.rows.length,lcs:lcs.rows.length,payments:payments.rows.length,
      shipments:shipments.rows.length,documents:docs.rows.length,
      openOrders:orders.rows.filter(x=>!['delivered','cancelled'].includes(x.status)).length,
      activeShipments:shipments.rows.filter(x=>!['delivered','cancelled'].includes(x.order_status)).length
    }
  });
});

const getOrder = asyncHandler(async(req,res)=>{
  adminOnly(req);
  const r=await query('SELECT * FROM orders WHERE id=$1 OR reference=$1',[req.params.id]);
  if(!r.rows[0]) throw new AppError('Order not found',404);
  const items=await query('SELECT * FROM order_items WHERE order_id=$1',[r.rows[0].id]);
  res.json({order:r.rows[0],items:items.rows});
});

const getLC = asyncHandler(async(req,res)=>{
  adminOnly(req);
  const r=await query('SELECT * FROM letters_of_credit WHERE id=$1 OR reference=$1',[req.params.id]);
  if(!r.rows[0]) throw new AppError('LC not found',404);
  res.json({letterOfCredit:r.rows[0]});
});

module.exports={overview,getOrder,getLC};