-- Cover workforce foreign-key lookups used by task queues, handoff inboxes and audit history.
create index if not exists vtg_workforce_tasks_created_by_idx
  on public.vtg_workforce_tasks(created_by, created_at desc);
create index if not exists vtg_workforce_handoffs_initiated_by_idx
  on public.vtg_workforce_handoffs(initiated_by, created_at desc);
create index if not exists vtg_workforce_handoffs_proposed_assignee_idx
  on public.vtg_workforce_handoffs(proposed_assignee, status, created_at desc);
create index if not exists vtg_workforce_handoffs_accepted_by_idx
  on public.vtg_workforce_handoffs(accepted_by, created_at desc);
create index if not exists vtg_workforce_activity_actor_idx
  on public.vtg_workforce_activity(actor_id, created_at desc);
create index if not exists vtg_workforce_activity_handoff_idx
  on public.vtg_workforce_activity(handoff_id, created_at desc);
