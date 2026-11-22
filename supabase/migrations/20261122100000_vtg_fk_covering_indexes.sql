-- Covering indexes for foreign keys flagged by the Supabase performance advisor.
-- Idempotent and additive only; no data or access rules change.
create index if not exists buyer_landed_cost_estimates_buyer_id_fk_idx on public.buyer_landed_cost_estimates (buyer_id);
create index if not exists buyer_lc_request_drafts_order_id_fk_idx on public.buyer_lc_request_drafts (order_id);
create index if not exists buyer_trade_requests_accepted_quote_id_fk_idx on public.buyer_trade_requests (accepted_quote_id);
create index if not exists buyer_trade_requests_buyer_id_fk_idx on public.buyer_trade_requests (buyer_id);
create index if not exists supplier_trade_quotations_supplier_id_fk_idx on public.supplier_trade_quotations (supplier_id);
create index if not exists trade_negotiation_messages_request_id_fk_idx on public.trade_negotiation_messages (request_id);
create index if not exists trade_negotiation_messages_sender_id_fk_idx on public.trade_negotiation_messages (sender_id);
create index if not exists trade_order_milestones_created_by_fk_idx on public.trade_order_milestones (created_by);
create index if not exists trade_orders_source_request_id_fk_idx on public.trade_orders (source_request_id);
create index if not exists vtg_bank_lc_review_events_actor_id_fk_idx on public.vtg_bank_lc_review_events (actor_id);
create index if not exists vtg_bank_lc_review_events_bank_id_fk_idx on public.vtg_bank_lc_review_events (bank_id);
create index if not exists vtg_bank_lc_review_events_lc_id_fk_idx on public.vtg_bank_lc_review_events (lc_id);
create index if not exists vtg_call_participants_user_id_fk_idx on public.vtg_call_participants (user_id);
create index if not exists vtg_call_signals_call_id_fk_idx on public.vtg_call_signals (call_id);
create index if not exists vtg_call_signals_from_user_fk_idx on public.vtg_call_signals (from_user);
create index if not exists vtg_calls_started_by_fk_idx on public.vtg_calls (started_by);
create index if not exists vtg_chat_attachments_uploaded_by_fk_idx on public.vtg_chat_attachments (uploaded_by);
create index if not exists vtg_network_connection_requests_partner_id_fk_idx on public.vtg_network_connection_requests (partner_id);
create index if not exists vtg_trade_infrastructure_data_source_key_fk_idx on public.vtg_trade_infrastructure (data_source_key);
