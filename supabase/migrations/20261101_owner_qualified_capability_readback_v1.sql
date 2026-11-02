create or replace function public.reality_read_owner_qualified_capabilities_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare result jsonb;
begin
 if current_user<>'service_role' then
  raise exception 'OWNER_CAPABILITY_READ_SERVICE_ROLE_REQUIRED';end if;
 if p_owner_id is null then
  raise exception 'OWNER_CAPABILITY_READ_OWNER_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object(
   'original_work_id',q.original_work_id,
   'phase',q.phase,
   'capability_id',q.capability_id,
   'qualification',q.qualification_receipt,
   'source_paths',(select coalesce(pg_catalog.jsonb_agg(f->>'path'),'[]'::jsonb)
       from pg_catalog.jsonb_array_elements(q.qualified_candidate->'files') f),
   'created_at',q.created_at,
   'updated_at',q.updated_at
  ) order by q.updated_at desc),'[]'::jsonb)
  into result
 from (select original_work_id,phase,capability_id,qualification_receipt,
 qualified_candidate,created_at,updated_at
 from reality_internal.genuine_capability_queue_v1
 where owner_id=p_owner_id and phase='AWAITING_OWNER_APPROVAL'
 and qualification_receipt is not null
 and qualified_candidate is not null
 order by updated_at desc limit 20) q;
 return result;
end $$;
revoke all on function public.reality_read_owner_qualified_capabilities_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_qualified_capabilities_v1(uuid)
 to service_role;