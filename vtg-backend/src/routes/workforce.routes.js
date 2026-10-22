const router = require('express').Router();
const { query, withTransaction } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const audit = require('../services/audit.service');

const MANAGERS = new Set(['admin','manager']);
const WORKFORCE = new Set(['admin','manager','staff','logistics','compliance','support','finance','inspector','marketing','agent']);
const STATUSES = new Set(['open','in_progress','blocked','completed','cancelled']);
const PRIORITIES = new Set(['low','normal','high','urgent']);
const isManager = user => MANAGERS.has(String(user.role || '').toLowerCase());
const ensureWorkforce = req => { if (!WORKFORCE.has(String(req.user.role || '').toLowerCase())) throw new AppError('Workforce access is required',403,'FORBIDDEN'); };
const bounded = (value,max=2000) => String(value ?? '').trim().slice(0,max);
const userExists = async id => {
  const r = await query('SELECT id,role,is_active FROM users WHERE id=$1',[id]);
  return r.rows[0] && r.rows[0].is_active && WORKFORCE.has(String(r.rows[0].role).toLowerCase()) ? r.rows[0] : null;
};

router.use(requireAuth, (req,res,next) => { try { ensureWorkforce(req); next(); } catch(e) { next(e); } });

router.get('/tasks', asyncHandler(async (req,res) => {
  const values=[]; const where=[];
  if (!isManager(req.user)) { values.push(req.user.id); where.push(`(t.assigned_to=$${values.length} OR t.created_by=$${values.length})`); }
  const status=bounded(req.query.status,30);
  if(status && status!=='all') { if(!STATUSES.has(status)) throw new AppError('Invalid task status',400,'INVALID_STATUS'); values.push(status); where.push(`t.status=$${values.length}`); }
  const search=bounded(req.query.q,120);
  if(search) { values.push('%'+search+'%'); where.push(`(t.title ILIKE $${values.length} OR COALESCE(t.description,'') ILIKE $${values.length} OR COALESCE(t.reference,'') ILIKE $${values.length})`); }
  const r=await query(`SELECT t.id,t.title,t.description,t.reference,t.status,t.priority,t.due_at,t.assigned_to,t.assigned_by,t.created_by,t.created_at,t.updated_at,
    a.full_name AS assignee_name,a.email AS assignee_email,c.full_name AS creator_name
    FROM workforce_tasks t JOIN users a ON a.id=t.assigned_to JOIN users c ON c.id=t.created_by
    ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,t.due_at NULLS LAST,t.updated_at DESC LIMIT 500`,values);
  res.json({tasks:r.rows});
}));

router.post('/tasks', asyncHandler(async (req,res) => {
  if(!isManager(req.user)) throw new AppError('Only an authorised manager or administrator can assign tasks',403,'FORBIDDEN');
  const title=bounded(req.body?.title,180),description=bounded(req.body?.description,4000),reference=bounded(req.body?.reference,120);
  const assignedTo=bounded(req.body?.assignedTo,80),priority=bounded(req.body?.priority||'normal',20),dueAt=req.body?.dueAt||null;
  if(title.length<3) throw new AppError('Task title must contain at least 3 characters',400,'INVALID_TASK');
  if(!assignedTo || !await userExists(assignedTo)) throw new AppError('Choose an active VTG workforce member',400,'INVALID_ASSIGNEE');
  if(!PRIORITIES.has(priority)) throw new AppError('Invalid task priority',400,'INVALID_PRIORITY');
  if(dueAt && (!Number.isFinite(Date.parse(dueAt)) || Date.parse(dueAt)<0)) throw new AppError('Invalid due date',400,'INVALID_DUE_DATE');
  const r=await query(`INSERT INTO workforce_tasks(title,description,reference,priority,due_at,assigned_to,assigned_by,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,[title,description||null,reference||null,priority,dueAt,assignedTo,req.user.id]);
  await audit.log(req.user.id,'Workforce Task Created',`Task ${r.rows[0].id}: ${title}`,req.ip);
  res.status(201).json({task:r.rows[0]});
}));

router.patch('/tasks/:id', asyncHandler(async (req,res) => {
  const existing=await query('SELECT * FROM workforce_tasks WHERE id=$1',[req.params.id]);
  const task=existing.rows[0]; if(!task) throw new AppError('Task not found',404,'NOT_FOUND');
  if(!isManager(req.user) && task.assigned_to!==req.user.id) throw new AppError('You can update only tasks assigned to you',403,'FORBIDDEN');
  const status=bounded(req.body?.status,30);
  if(!status || !STATUSES.has(status)) throw new AppError('A valid task status is required',400,'INVALID_STATUS');
  if(['cancelled'].includes(status) && !isManager(req.user)) throw new AppError('Only a manager or administrator can cancel a task',403,'FORBIDDEN');
  const r=await query('UPDATE workforce_tasks SET status=$1,updated_at=now() WHERE id=$2 RETURNING *',[status,task.id]);
  await audit.log(req.user.id,'Workforce Task Status Updated',`Task ${task.id}: ${task.status} -> ${status}`,req.ip);
  res.json({task:r.rows[0]});
}));

router.get('/members', asyncHandler(async (req,res) => {
  const r=await query(`SELECT id,full_name,email,role FROM users WHERE is_active=true AND role::text = ANY($1::text[]) ORDER BY full_name LIMIT 500`,[Array.from(WORKFORCE)]);
  res.json({members:r.rows});
}));

router.get('/team', asyncHandler(async (req,res) => {
  if(!isManager(req.user)) throw new AppError('Manager access is required to view workforce members',403,'FORBIDDEN');
  const r=await query(`SELECT id,full_name,email,role FROM users WHERE is_active=true AND role::text = ANY($1::text[]) ORDER BY full_name LIMIT 500`,[Array.from(WORKFORCE)]);
  res.json({members:r.rows});
}));

router.get('/handoffs', asyncHandler(async(req,res)=>{
  const r=await query(`SELECT h.*,f.full_name AS from_name,t.full_name AS to_name,wt.title AS task_title
    FROM workforce_handoffs h JOIN users f ON f.id=h.from_user JOIN users t ON t.id=h.to_user LEFT JOIN workforce_tasks wt ON wt.id=h.task_id
    WHERE h.from_user=$1 OR h.to_user=$1 OR $2=true ORDER BY h.created_at DESC LIMIT 300`,[req.user.id,isManager(req.user)]);
  res.json({handoffs:r.rows});
}));
router.post('/handoffs', asyncHandler(async(req,res)=>{
  const toUser=bounded(req.body?.toUser,80),note=bounded(req.body?.note,2000),taskId=bounded(req.body?.taskId,80),reference=bounded(req.body?.reference,120);
  if(note.length<3) throw new AppError('Handoff note must contain at least 3 characters',400,'INVALID_HANDOFF');
  if(!toUser||toUser===req.user.id||!await userExists(toUser)) throw new AppError('Choose another active workforce member',400,'INVALID_RECIPIENT');
  let task=null;
  if(taskId){const q=await query('SELECT id,assigned_to FROM workforce_tasks WHERE id=$1',[taskId]);task=q.rows[0];if(!task)throw new AppError('Task not found',404,'NOT_FOUND');if(!isManager(req.user)&&task.assigned_to!==req.user.id)throw new AppError('Only the assignee or a manager can hand off this task',403,'FORBIDDEN');}
  const r=await query(`INSERT INTO workforce_handoffs(task_id,reference,note,from_user,to_user) VALUES($1,$2,$3,$4,$5) RETURNING *`,[task?.id||null,reference||null,note,req.user.id,toUser]);
  await audit.log(req.user.id,'Workforce Handoff Created',`Handoff ${r.rows[0].id} to ${toUser}`,req.ip);
  res.status(201).json({handoff:r.rows[0]});
}));
router.patch('/handoffs/:id', asyncHandler(async(req,res)=>{
  const status=bounded(req.body?.status,20);if(!['accepted','declined'].includes(status))throw new AppError('Choose accept or decline',400,'INVALID_STATUS');
  const q=await query('SELECT * FROM workforce_handoffs WHERE id=$1',[req.params.id]);const h=q.rows[0];if(!h)throw new AppError('Handoff not found',404,'NOT_FOUND');
  if(h.to_user!==req.user.id && !isManager(req.user))throw new AppError('Only the receiving member can respond to this handoff',403,'FORBIDDEN');
  if(h.status!=='pending')throw new AppError('This handoff has already been decided',409,'ALREADY_DECIDED');
  const r=await query('UPDATE workforce_handoffs SET status=$1,decided_at=now(),decided_by=$2 WHERE id=$3 AND status=\'pending\' RETURNING *',[status,req.user.id,h.id]);
  if(!r.rows[0])throw new AppError('This handoff has already been decided',409,'ALREADY_DECIDED');
  await audit.log(req.user.id,'Workforce Handoff '+status,`Handoff ${h.id}`,req.ip);
  res.json({handoff:r.rows[0]});
}));

router.get('/approvals', asyncHandler(async(req,res)=>{
  const r=await query(`SELECT a.*,rq.full_name AS requester_name,rv.full_name AS reviewer_name,dc.full_name AS decision_maker
    FROM workforce_approvals a JOIN users rq ON rq.id=a.requested_by LEFT JOIN users rv ON rv.id=a.assigned_reviewer LEFT JOIN users dc ON dc.id=a.decided_by
    WHERE a.requested_by=$1 OR a.assigned_reviewer=$1 OR $2=true ORDER BY a.created_at DESC LIMIT 300`,[req.user.id,isManager(req.user)]);
  res.json({approvals:r.rows});
}));
router.post('/approvals', asyncHandler(async(req,res)=>{
  const title=bounded(req.body?.title,180),details=bounded(req.body?.details,4000),reference=bounded(req.body?.reference,120),reviewer=bounded(req.body?.assignedReviewer,80),taskId=bounded(req.body?.taskId,80);
  if(title.length<3)throw new AppError('Approval title must contain at least 3 characters',400,'INVALID_APPROVAL');
  if(reviewer&&!await userExists(reviewer))throw new AppError('Choose an active workforce reviewer',400,'INVALID_REVIEWER');
  if(taskId){const t=await query('SELECT id,assigned_to,created_by FROM workforce_tasks WHERE id=$1',[taskId]);if(!t.rows[0])throw new AppError('Task not found',404,'NOT_FOUND');if(!isManager(req.user)&&t.rows[0].assigned_to!==req.user.id&&t.rows[0].created_by!==req.user.id)throw new AppError('You cannot request approval for this task',403,'FORBIDDEN');}
  const r=await query(`INSERT INTO workforce_approvals(task_id,reference,title,details,requested_by,assigned_reviewer)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[taskId||null,reference||null,title,details||null,req.user.id,reviewer||null]);
  await audit.log(req.user.id,'Workforce Approval Requested',`Approval ${r.rows[0].id}: ${title}`,req.ip);
  res.status(201).json({approval:r.rows[0]});
}));
router.patch('/approvals/:id', asyncHandler(async(req,res)=>{
  if(!isManager(req.user))throw new AppError('Only a manager or administrator can decide approvals',403,'FORBIDDEN');
  const status=bounded(req.body?.status,20),note=bounded(req.body?.decisionNote,2000);
  if(!['approved','rejected'].includes(status))throw new AppError('Choose approve or reject',400,'INVALID_STATUS');
  const q=await query('SELECT * FROM workforce_approvals WHERE id=$1',[req.params.id]);const a=q.rows[0];if(!a)throw new AppError('Approval not found',404,'NOT_FOUND');
  if(a.status!=='pending')throw new AppError('This approval has already been decided',409,'ALREADY_DECIDED');
  const r=await query('UPDATE workforce_approvals SET status=$1,decision_note=$2,decided_by=$3,decided_at=now() WHERE id=$4 AND status=\'pending\' RETURNING *',[status,note||null,req.user.id,a.id]);
  if(!r.rows[0])throw new AppError('This approval has already been decided',409,'ALREADY_DECIDED');
  await audit.log(req.user.id,'Workforce Approval '+status,`Approval ${a.id}`,req.ip);
  res.json({approval:r.rows[0]});
}));
module.exports=router;
