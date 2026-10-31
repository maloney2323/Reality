-- One original customer #178 selection across the authenticated owner's
-- conversations. Read only, service_role only; never mutate or merge goals.
-- We preserve all historical queued records and their Continuity receipts.
create or replace function public.reality_read_first178_owner_queue_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare r reality_internal.governed_build_queue_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'FIRST178_OWNER_SELECTION_SERVICE_ROLE_REQUIRED';
 end if;
 if p_owner_id is null then
  raise exception 'FIRST178_OWNER_SELECTION_VALID_OWNER_REQUIRED';
 end if;
 select q.* into r
 from reality_internal.governed_build_queue_v1 q
 join reality_internal.goal_publication_epochs e
  on e.user_id=q.owner_id and e.conversation_id=q.conversation_id
 where q.owner_id=p_owner_id
   and q.original_work_evidence_ref=
    'github:actions:run:40962921090:job:123760052647'
   and q.goal_revision=e.revision
   and q.goal_transition_event_id=e.last_transition_event_id
   and exists (
    select 1 from public.universe_events x
    where x.entity_type='personal_first_self_upgrade_customer_work'
     and x.event_kind='WORK'
     and x.continuity_root_id=q.continuity_root_id
     and x.worldline_id=q.worldline_id
     and x.payload->>'issue_number'='178'
     and x.payload->>'original_work_id'=q.original_work_id
     and x.payload->>'original_goal_id'=q.goal_id
     and x.payload->>'goal_transition_receipt_ref'=q.goal_transition_event_id::text
     and x.payload->>'installation_authorized'='false'
     and x.payload->>'original_job_completed'='false')
 order by q.queued_at asc,q.id asc
 limit 1;
 if not found then return '{}'::jsonb;end if;
 return pg_catalog.jsonb_build_object(
  'verified_owner',r.owner_id,
  'issue_number',178,'conversation_id',r.conversation_id,
  'original_work_id',r.original_work_id,
  'goal_id',r.goal_id,'queue_id',r.id,
  'phase',r.phase,'preview_release_sha',r.preview_release_sha,
  'existing_owner_work',true,'installation_authorized',false,
  'original_job_completed',false);
end $fn$;
revoke all on function public.reality_read_first178_owner_queue_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_first178_owner_queue_v1(uuid)
 to service_role;