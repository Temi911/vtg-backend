const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const { withTransaction, query } = require('../config/db');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const audit = require('../services/audit.service');
const { notify } = require('../services/notification.service');

const createSchema = z.object({
  supplierId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid().optional(),
    description: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPriceUsd: z.number().positive()
  })).min(1),
  incoterm: z.string().min(1).max(20).optional(),
  validityUntil: z.string().date().optional(),
  notes: z.string().max(4000).optional()
});

const statusSchema = z.object({
  status: z.enum(['sent','accepted','rejected','expired'])
});

function reference() {
  return 'VTG-Q-' + new Date().getFullYear() + '-' + uuidv4().slice(0,6).toUpperCase();
}

async function getQuote(id, user) {
  const { rows } = await query(
    `SELECT q.*, bu.full_name AS buyer_name, su.full_name AS supplier_name
     FROM trade_quotes q
     JOIN users bu ON bu.id=q.buyer_id
     JOIN users su ON su.id=q.supplier_id
     WHERE q.id=$1 OR q.reference=$1`, [id]
  );
  const quote = rows[0];
  if (!quote) throw new AppError('Quote not found',404);
  if (![quote.buyer_id,quote.supplier_id].includes(user.id) && user.role !== 'admin') {
    throw new AppError('You do not have access to this quote',403,'FORBIDDEN');
  }
  const items = await query('SELECT * FROM trade_quote_items WHERE quote_id=$1 ORDER BY id',[quote.id]);
  return {quote,items:items.rows};
}

const create = asyncHandler(async (req,res)=>{
  const data=createSchema.parse(req.body);
  const supplierRes=await query(
    `SELECT id,role,business_verification_status FROM users WHERE id=$1 LIMIT 1`,
    [data.supplierId]
  );
  const supplier=supplierRes.rows[0];
  if(!supplier || supplier.role!=='supplier') throw new AppError('Selected supplier is not valid',400,'INVALID_SUPPLIER');
  if(supplier.business_verification_status!=='verified') throw new AppError('Quotes can only be requested from verified suppliers',409,'SUPPLIER_NOT_VERIFIED');

  const productIds=[...new Set(data.items.map(i=>i.productId).filter(Boolean))];
  if(productIds.length){
    const products=await query(
      `SELECT id FROM products WHERE id=ANY($1::uuid[]) AND supplier_id=$2 AND is_active=TRUE`,
      [productIds,data.supplierId]
    );
    if(products.rows.length!==productIds.length) throw new AppError('One or more selected products do not belong to this supplier or are inactive',400,'INVALID_QUOTE_PRODUCT');
  }
  if(data.validityUntil && new Date(data.validityUntil+'T23:59:59Z') < new Date()) {
    throw new AppError('Quote validity date must be in the future',400,'INVALID_VALIDITY');
  }
  const total=data.items.reduce((sum,i)=>sum+i.quantity*i.unitPriceUsd,0);
  const q=await withTransaction(async client=>{
    const qr=await client.query(
      `INSERT INTO trade_quotes
       (reference,buyer_id,supplier_id,status,total_amount_usd,incoterm,validity_until,notes)
       VALUES($1,$2,$3,'sent',$4,$5,$6,$7) RETURNING *`,
      [reference(),req.user.id,data.supplierId,total,data.incoterm||'FOB',data.validityUntil||null,data.notes||null]
    );
    for(const item of data.items){
      await client.query(
        `INSERT INTO trade_quote_items(quote_id,product_id,description,quantity,unit_price_usd)
         VALUES($1,$2,$3,$4,$5)`,
        [qr.rows[0].id,item.productId||null,item.description,item.quantity,item.unitPriceUsd]
      );
    }
    return qr.rows[0];
  });
  await audit.log(req.user.id,'Quote Created',`Quote ${q.reference} created ($${total})`,req.ip);
  await notify(q.supplier_id,'New Quote Request',`Quote ${q.reference} for $${total} is awaiting your response.`);
  res.status(201).json({quote:q});
});

const listMine=asyncHandler(async(req,res)=>{
  const column=req.user.role==='buyer'?'buyer_id':'supplier_id';
  const {rows}=await query(
    `SELECT q.*,bu.full_name AS buyer_name,su.full_name AS supplier_name
     FROM trade_quotes q JOIN users bu ON bu.id=q.buyer_id JOIN users su ON su.id=q.supplier_id
     WHERE q.${column}=$1 ORDER BY q.created_at DESC`,[req.user.id]);
  res.json({quotes:rows});
});

const getOne=asyncHandler(async(req,res)=>{
  res.json(await getQuote(req.params.id,req.user));
});

const updateStatus=asyncHandler(async(req,res)=>{
  const {status}=statusSchema.parse(req.body);
  const data=await getQuote(req.params.id,req.user);
  const q=data.quote;

  const allowed={
    sent:['accepted','rejected','expired'],
    accepted:[],
    rejected:[],
    expired:[],
    converted:[]
  };
  if(!allowed[q.status] || !allowed[q.status].includes(status)){
    throw new AppError(`Quote cannot move from ${q.status} to ${status}`,409,'INVALID_QUOTE_TRANSITION');
  }

  // Supplier responds to a sent quote; buyer/admin can mark an administrative expiry.
  if(status==='accepted' && req.user.id!==q.supplier_id && req.user.role!=='admin'){
    throw new AppError('Only the supplier can accept a quote',403,'FORBIDDEN');
  }
  if(status==='rejected' && ![q.supplier_id,q.buyer_id].includes(req.user.id) && req.user.role!=='admin'){
    throw new AppError('You do not have access to this quote',403,'FORBIDDEN');
  }

  const {rows}=await query(
    'UPDATE trade_quotes SET status=$1,updated_at=now() WHERE id=$2 RETURNING *',
    [status,q.id]);
  await audit.log(req.user.id,'Quote Status Updated',`Quote ${q.reference} -> ${status}`,req.ip);
  const recipient=req.user.id===q.buyer_id?q.supplier_id:q.buyer_id;
  if(recipient) await notify(recipient,'Quote Updated',`Quote ${q.reference} is now "${status}".`);
  res.json({quote:rows[0]});
});

const convertToOrder=asyncHandler(async(req,res)=>{
  const data=await getQuote(req.params.id,req.user);
  const q=data.quote;
  if(q.status!=='accepted') throw new AppError('Only an accepted quote can become an order',409,'QUOTE_NOT_ACCEPTED');
  if(q.converted_order_id) throw new AppError('Quote has already been converted',409,'QUOTE_ALREADY_CONVERTED');
  if(req.user.id!==q.buyer_id && req.user.role!=='admin'){
    throw new AppError('Only the buyer can convert an accepted quote into an order',403,'FORBIDDEN');
  }

  const order=await withTransaction(async client=>{
    const ref='VTG-'+new Date().getFullYear()+'-'+uuidv4().slice(0,6).toUpperCase();
    const or=await client.query(
      `INSERT INTO orders(reference,buyer_id,supplier_id,total_amount_usd,incoterm,notes)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [ref,q.buyer_id,q.supplier_id,q.total_amount_usd,q.incoterm,
       (q.notes?q.notes+' ':'')+'Converted from '+q.reference]
    );
    for(const item of data.items){
      await client.query(
        `INSERT INTO order_items(order_id,product_id,description,quantity,unit_price_usd)
         VALUES($1,$2,$3,$4,$5)`,
        [or.rows[0].id,item.product_id,item.description,item.quantity,item.unit_price_usd]
      );
    }
    const conv=await client.query('INSERT INTO conversations(order_id) VALUES($1) RETURNING id',[or.rows[0].id]);
    await client.query(
      'INSERT INTO conversation_participants(conversation_id,user_id) VALUES($1,$2),($1,$3)',
      [conv.rows[0].id,q.buyer_id,q.supplier_id]
    );
    await client.query(
      'UPDATE trade_quotes SET status=\'converted\',converted_order_id=$1,updated_at=now() WHERE id=$2',
      [or.rows[0].id,q.id]
    );
    return or.rows[0];
  });

  await audit.log(req.user.id,'Quote Converted To Order',`Quote ${q.reference} -> order ${order.reference}`,req.ip);
  await notify(q.supplier_id,'Quote Accepted — Order Created',`Quote ${q.reference} has been converted to order ${order.reference}.`);
  res.status(201).json({order,quoteReference:q.reference});
});

module.exports={create,listMine,getOne,updateStatus,convertToOrder};
