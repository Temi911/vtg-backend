create or replace function public.vtg_supplier_record_delivery(p_order_id uuid,p_description text,p_location text default null)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare v_uid uuid:=auth.uid(); v_order public.trade_orders%rowtype; v_milestone_id uuid; v_note text:=btrim(coalesce(p_description,'')); v_location text:=nullif(btrim(coalesce(p_location,'')),''); v_bank record;
begin
  if v_uid is null or not exists(select 1 from public.profiles p where p.id=v_uid and p.role='supplier'::public.vtg_account_role and p.is_active=true and p.account_environment='trade') then
    raise exception 'An active supplier trade account is required' using errcode='42501';
  end if;
  if length(v_note)<5 or length(v_note)>1600 then raise exception 'Add a delivery note between 5 and 1600 characters'; end if;
  select * into v_order from public.trade_orders where id=p_order_id and supplier_id=v_uid for update;
  if not found then raise exception 'Order not found for this supplier' using errcode='42501'; end if;
  if v_order.status::text in ('cancelled','disputed') then raise exception 'A cancelled or disputed trade cannot be marked delivered'; end if;
  if not exists(select 1 from public.shipments s where s.order_id=v_order.id and lower(s.status)='delivered') then raise exception 'First update the linked shipment status to Delivered in Logistics & Trade Atlas'; end if;
  if not exists(select 1 from public.trade_documents d where d.order_id=v_order.id and d.owner_id=v_uid and lower(replace(btrim(d.document_type),'_',' '))='proof of delivery') then raise exception 'Upload a Proof of delivery document to this order before recording delivery'; end if;
  select id into v_milestone_id from public.trade_order_milestones where order_id=v_order.id and milestone='delivered' and created_by=v_uid order by event_at desc limit 1;
  if v_milestone_id is not null then raise exception 'Delivery has already been recorded for this order'; end if;
  insert into public.trade_order_milestones(order_id,created_by,milestone,description,location,event_at) values(v_order.id,v_uid,'delivered',v_note,left(v_location,200),now()) returning id into v_milestone_id;
  insert into public.vtg_notifications(user_id,title,body,notification_type,entity_type,entity_id) values(v_order.buyer_id,'Delivery recorded · '||coalesce(v_order.reference,'VTG order'),left(v_note,300),'shipment_update','trade_order',v_order.id);
  for v_bank in select distinct lc.bank_id from public.letters_of_credit lc where lc.order_id=v_order.id and lc.bank_id is not null loop
    insert into public.vtg_notifications(user_id,title,body,notification_type,entity_type,entity_id) values(v_bank.bank_id,'Delivery recorded · '||coalesce(v_order.reference,'VTG order'),left(v_note,300),'shipment_update','trade_order',v_order.id);
  end loop;
  return v_milestone_id;
end;
$function$;
revoke all on function public.vtg_supplier_record_delivery(uuid,text,text) from public,anon;
grant execute on function public.vtg_supplier_record_delivery(uuid,text,text) to authenticated;
