insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('vtg-rfq-attachments','vtg-rfq-attachments',false,20971520,
 array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','text/csv'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "buyers upload own RFQ attachments" on storage.objects;
create policy "buyers upload own RFQ attachments"
on storage.objects for insert to authenticated
with check (
 bucket_id='vtg-rfq-attachments'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='buyer'::public.vtg_account_role and p.is_active=true and p.account_environment='trade')
);

drop policy if exists "trade parties read RFQ attachments" on storage.objects;
create policy "trade parties read RFQ attachments"
on storage.objects for select to authenticated
using (
 bucket_id='vtg-rfq-attachments'
 and (
  (storage.foldername(name))[1]=(select auth.uid())::text
  or exists(
   select 1 from public.buyer_trade_requests r
   where r.id=case when split_part(name,'/',2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',2)::uuid else null end
  )
 )
);

drop policy if exists "buyers delete own RFQ attachments" on storage.objects;
create policy "buyers delete own RFQ attachments"
on storage.objects for delete to authenticated
using (
 bucket_id='vtg-rfq-attachments'
 and (storage.foldername(name))[1]=(select auth.uid())::text
);
