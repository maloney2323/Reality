-- ONE explicit authenticated owner approval for the exact independently
-- verified first #178 candidate, not permission for a model or cron to approve.
-- Only the trusted preview server (service_role) can invoke this after its
-- same-origin user session has been independently checked.
create or replace function public.reality_authorize_first178_exact_upgrade_v1(
 p_owner_id uuid,p_conversation_id uuid,p_queue_id uuid,
 p_original_work_id text,p_candidate_hash text,
 p_checkpoint_hash text,p_checkpoint_receipt_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare q reality_internal.governed_build_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 receipt uuid;
begin
 if current_user<>'service_role'
 then raise exception 'FIRST178_EXACT_OWNER_APPROVAL_SERVICE_ONLY';end if;
 if p_owner_id is null or p_conversation_id is null or p_queue_id is null
  or p_checkpoint_receipt_id is null or
  p_original_work_id !~ '^work:[a-f0-9]{32}$' or
  p_candidate_hash !~ '^[a-f0-9]{64}$' or
  p_checkpoint_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'FIRST178_OWNER_APPROVAL_SCOPE_INVALID';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into q from reality_internal.governed_build_queue_v1
 where id=p_queue_id and owner_id=p_owner_id and conversation_id=p_conversation_id
 for update;
 select * into e from reality_internal.goal_publication_epochs
 where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if q.id is null or e.user_id is null or
   q.phase<>'AWAITING_OWNER_APPROVAL' or
   q.original_work_id<>p_original_work_id or
   q.goal_revision is distinct from e.revision or
   q.goal_transition_event_id is distinct from e.last_transition_event_id or
   q.worker_claim_id is null or
   q.report->>'state'<>'AWAITING_OWNER_APPROVAL' or
   q.report->>'checkpoint_hash'<>p_checkpoint_hash or
   q.report->>'checkpoint_receipt_id'<>p_checkpoint_receipt_id::text or
   q.report->>'installation_authorized'<>'false' or
   q.report->>'job_completed'<>'false' or
   q.report ? 'installation_approval_reservation_id' or
   q.dispatch_commit_sha is not null or q.dispatched_at is not null
 then raise exception 'FIRST178_OWNER_APPROVAL_NOT_UNIQUELY_ELIGIBLE';end if;
 if not exists(select 1 from public.universe_events x
    where x.event_id=p_checkpoint_receipt_id
      and x.entity_type='personal_first_178_constitutional_checkpoint'
      and x.continuity_root_id=q.continuity_root_id
      and x.worldline_id=q.worldline_id
      and x.payload->>'original_work_id'=p_original_work_id
      and x.payload->>'constitutional_phase'='AWAITING_OWNER_APPROVAL'
      and x.payload->>'constitutional_head_hash'=p_checkpoint_hash
      and x.payload->>'installation_authorized'='false'
      and x.payload->>'original_job_completed'='false'
      and x.payload->'driver_state'->>'phase'='AWAITING_OWNER_APPROVAL'
      and x.payload->'driver_state'->'candidate'->>'artifact_hash'=p_candidate_hash
      and x.payload->'driver_state'->'sandbox_receipt'->>'artifact_hash'=p_candidate_hash
      and x.payload->'driver_state'->'sandbox_receipt'->>'independent_tests_passed'='true'
      and x.payload->'driver_state'->'sandbox_receipt'->>'frozen_regression_passed'='true'
      and x.payload->'driver_state'->'sandbox_receipt'->>'governance_preserved'='true'
      and x.payload->'driver_state'->'promotion_authorization'='null'::jsonb
      and x.payload->'driver_state'->'journal'->-1->>'kind'='SANDBOX_VERIFIED'
 ) then raise exception 'FIRST178_OWNER_APPROVAL_SANDBOX_PROOF_MISSING';end if;
 receipt:=pg_catalog.gen_random_uuid();
 update reality_internal.governed_build_queue_v1
 set report=report||pg_catalog.jsonb_build_object(
  'installation_approval_reservation_id',receipt,
  'installation_approval_candidate_hash',p_candidate_hash,
  'installation_approval_checkpoint_hash',p_checkpoint_hash,
  'installation_approval_receipt_ref',p_checkpoint_receipt_id,
  'installation_approval_origin','AUTHENTICATED_OWNER_EXPLICIT_ACTION',
  'installation_approval_target','ISOLATED_PREVIEW',
  'installation_approved_at',pg_catalog.now(),
  'installation_authorized',false,'job_completed',false),
 updated_at=pg_catalog.now()
 where id=q.id;
 return pg_catalog.jsonb_build_object(
  'approved_exact_candidate',true,
  'reservation_id',receipt,
  'owner_id',p_owner_id,'queue_id',q.id,
  'original_work_id',p_original_work_id,
  'candidate_hash',p_candidate_hash,
  'checkpoint_hash',p_checkpoint_hash,
  'checkpoint_receipt_id',p_checkpoint_receipt_id,
  'approval_origin','AUTHENTICATED_OWNER_EXPLICIT_ACTION',
  'installation_target','ISOLATED_PREVIEW',
  'consumed_once',true,'production_changed',false);
end $fn$;
create or replace function public.reality_read_first178_exact_approval_v1(
 p_owner_id uuid,p_conversation_id uuid,p_queue_id uuid,
 p_original_work_id text,p_candidate_hash text)
returns jsonb language sql security invoker set search_path='' as $fn$
 select coalesce((select pg_catalog.jsonb_build_object(
  'verified',true,'reservation_id',
    (q.report->>'installation_approval_reservation_id')::uuid,
  'owner_id',q.owner_id,'original_work_id',q.original_work_id,
  'candidate_hash',q.report->>'installation_approval_candidate_hash',
  'approval_origin',q.report->>'installation_approval_origin',
  'installation_target',q.report->>'installation_approval_target')
 from reality_internal.governed_build_queue_v1 q
 where current_user='service_role'
  and q.owner_id=p_owner_id and q.conversation_id=p_conversation_id
  and q.id=p_queue_id and q.original_work_id=p_original_work_id
  and q.report->>'installation_approval_candidate_hash'=p_candidate_hash
  and q.report->>'installation_approval_origin'='AUTHENTICATED_OWNER_EXPLICIT_ACTION'
  and q.report->>'installation_approval_target'='ISOLATED_PREVIEW'
  and (q.report->>'installation_approval_reservation_id')::uuid is not null
 ),'{}'::jsonb)
$fn$;
revoke all on function public.reality_authorize_first178_exact_upgrade_v1(uuid,uuid,uuid,text,text,text,uuid) from public,authenticated,anon;
revoke all on function public.reality_read_first178_exact_approval_v1(uuid,uuid,uuid,text,text) from public,authenticated,anon;
grant execute on function public.reality_authorize_first178_exact_upgrade_v1(uuid,uuid,uuid,text,text,text,uuid) to service_role;
grant execute on function public.reality_read_first178_exact_approval_v1(uuid,uuid,uuid,text,text) to service_role;