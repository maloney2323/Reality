create or replace function public.reality_read_owner_qualified_capabilities_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if current_user<>'service_role' then
  raise exception 'OWNER_CAPABILITY_READ_SERVICE_ROLE_REQUIRED';end if;
 if p_owner_id is null then
  raise exception 'OWNER_CAPABILITY_READ_OWNER_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object(
   'original_work_id',q.original_work_id,'phase',q.phase,
   'capability_id',q.capability_id,
   'qualification',q.qualification_receipt,
   'approval',q.approval_receipt,
   'source_paths',(select coalesce(pg_catalog.jsonb_agg(f->>'path'),'[]'::jsonb)
       from pg_catalog.jsonb_array_elements(q.qualified_candidate->'files') f),
   'created_at',q.created_at,'updated_at',q.updated_at
  ) order by q.updated_at desc),'[]'::jsonb)
  into result
 from (select e.original_work_id,e.phase,e.capability_id,
  e.qualification_receipt,e.qualified_candidate,e.created_at,e.updated_at,
  a.approval_receipt
 from reality_internal.genuine_capability_queue_v1 e
 left join reality_internal.genuine_preview_install_approvals_v1 a
  on a.trigger_id=e.trigger_id and a.owner_id=e.owner_id and
  a.artifact_hash=e.qualified_candidate->>'artifact_sha256'
 where e.owner_id=p_owner_id and e.phase='AWAITING_OWNER_APPROVAL'
 and e.qualification_receipt is not null
 and e.qualified_candidate is not null
 order by e.updated_at desc limit 20) q;
 return result;
end $$;