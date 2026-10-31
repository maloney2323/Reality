-- Preview-only readback: prevent a new source-backed repair intake from
-- silently replacing an earlier unfinished customer job for the SAME issue.
-- This is read-only, grants no model, installation or settlement authority.
create or replace function public.reality_read_owner_existing_original_issue_v1(
 p_owner_id uuid,p_issue_number integer)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare
 old_job reality_internal.governed_build_queue_v1%rowtype;
begin
 if current_user <> 'service_role' then
  raise exception 'REALITY_ORIGINAL_IDENTITY_SERVICE_ROLE_REQUIRED';
 end if;
 if p_owner_id is null or p_issue_number is null
   or p_issue_number<1 or p_issue_number>100000 then
  raise exception 'REALITY_ORIGINAL_IDENTITY_INPUT_INVALID';
 end if;
 select q.* into old_job
 from reality_internal.governed_build_queue_v1 q
 where q.owner_id=p_owner_id
   and q.phase not in ('SETTLED','CANCELLED')
   and exists (
    select 1 from public.universe_events e
    where e.continuity_root_id=q.continuity_root_id
      and e.worldline_id=q.worldline_id
      and e.payload->>'original_work_id'=q.original_work_id
      and e.payload->>'issue_number'=p_issue_number::text
      and e.entity_type in (
       'personal_first_self_upgrade_customer_work',
       'reality_original_source_backed_repair_work')
      and e.event_kind in ('WORK','OBSERVATION')
      and e.epistemic_status in ('OBSERVED','VERIFIED')
   )
 order by q.queued_at asc,q.id asc limit 1;
 if old_job.id is null then
  return pg_catalog.jsonb_build_object(
   'status','NO_PRIOR_ORIGINAL','installation_authorized',false,
   'job_completed',false,'production_changed',false);
 end if;
 return pg_catalog.jsonb_build_object(
  'status','EXISTING_UNFINISHED_ORIGINAL',
  'queue_id',old_job.id,'original_work_id',old_job.original_work_id,
  'goal_id',old_job.goal_id,'phase',old_job.phase,
  'installation_authorized',false,'job_completed',false,
  'production_changed',false);
end $$;
revoke all on function public.reality_read_owner_existing_original_issue_v1(uuid,integer)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_existing_original_issue_v1(uuid,integer)
 to service_role;
