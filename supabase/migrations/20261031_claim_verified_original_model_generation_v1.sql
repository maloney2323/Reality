-- Owner-scoped GENERATION admission. A request JSON alone can NEVER mint
-- a coding attempt. This consumes exactly one independently authorized,
-- previously dispatched original customer queue under the current goal epoch.
create or replace function public.reality_claim_source_bound_generation_v1(
 p_queue_id uuid,p_original_work_id text,p_github_sha text,p_request_path text)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare
 q reality_internal.governed_build_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 original public.universe_events%rowtype;
 src jsonb;
begin
 if current_user<>'service_role' then
  raise exception 'SOURCE_GENERATION_SERVICE_ROLE_REQUIRED';end if;
 if p_queue_id is null or p_original_work_id !~ '^work:[a-f0-9]{32}$'
  or p_github_sha !~ '^[a-f0-9]{40}$'
  or p_request_path is distinct from ('reality-requests/'||p_queue_id::text||'.json')
 then raise exception 'SOURCE_GENERATION_EXACT_PIN_REQUIRED';end if;
 select * into q from reality_internal.governed_build_queue_v1
  where id=p_queue_id and original_work_id=p_original_work_id;
 if q.id is null then raise exception 'SOURCE_GENERATION_QUEUE_NOT_FOUND';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||q.owner_id::text||':'||q.conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs
  where user_id=q.owner_id and conversation_id=q.conversation_id for update;
 select * into q from reality_internal.governed_build_queue_v1
  where id=p_queue_id and original_work_id=p_original_work_id for update;
 if e.user_id is null or e.revision<>q.goal_revision
  or e.last_transition_event_id is distinct from q.goal_transition_event_id
  or q.phase<>'QUEUED_DISCOVERY' or q.worker_claim_id is not null
  or q.dispatch_commit_sha is distinct from p_github_sha
  or q.dispatch_request_path is distinct from p_request_path
  or q.dispatched_at is null
 then raise exception 'SOURCE_GENERATION_UNSPENT_APPROVED_DISPATCH_REQUIRED';end if;
 if q.original_work_evidence_ref !~ '^universe:[0-9a-f-]{36}$'
 then raise exception 'SOURCE_GENERATION_ORIGINAL_EVENT_ID_INVALID';end if;
 select * into original from public.universe_events
  where event_id=split_part(q.original_work_evidence_ref,':',2)::uuid
   and continuity_root_id=q.continuity_root_id
   and worldline_id=q.worldline_id;
 src:=original.payload;
 if original.event_id is null or
  original.entity_type<>'reality_original_source_backed_repair_work'
  or original.epistemic_status<>'VERIFIED'
  or original.event_kind<>'OBSERVATION'
  or src->>'owner_id'<>q.owner_id::text
  or src->>'original_work_id'<>q.original_work_id
  or src->>'goal_id'<>q.goal_id
  or src->>'goal_transition_receipt_ref'<>q.goal_transition_event_id::text
  or src->>'owner_authorized_investigation'<>'true'
  or src->>'owner_authorized_installation'<>'false'
  or src->>'original_job_completed'<>'false'
  or coalesce(src->>'source_path','') !~ '^src/reality-extensions/[a-z0-9._/-]+[.]mjs$'
  or coalesce(src->>'frozen_test_path','') !~ '^test/reality-frozen-regressions/[a-z0-9._/-]+[.]test[.]js$'
  or coalesce(src->>'original_source_sha','') !~ '^[a-f0-9]{40}$'
  or coalesce(src->>'frozen_test_sha256','') !~ '^[a-f0-9]{64}$'
  or coalesce(src->>'original_provider_failed_run_id','') !~ '^[1-9][0-9]{0,18}$'
  or coalesce(src->>'issue_number','') !~ '^[1-9][0-9]{0,5}$'
 then raise exception 'SOURCE_GENERATION_VERIFIED_ORIGINAL_FAILURE_REQUIRED';end if;
 update reality_internal.governed_build_queue_v1 set
  phase='BUILD_TICKET_VERIFIED',
  worker_claim_id=gen_random_uuid(),
  worker_identity_ref='github:actions:sha:'||p_github_sha,
  claimed_at=now(),updated_at=now(),
  report=jsonb_build_object(
   'state','BUILD_TICKET_VERIFIED','original_work_id',p_original_work_id,
   'installation_authorized',false,'job_completed',false)
 where id=p_queue_id returning * into q;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_SOURCE_BOUND_GENERATION_ADMITTED',
  'queue_id',q.id,'claim_id',q.worker_claim_id,
  'owner_id',q.owner_id,'goal_id',q.goal_id,
  'original_work_id',q.original_work_id,
  'issue_number',(src->>'issue_number')::integer,
  'failed_run_id',(src->>'original_provider_failed_run_id')::bigint,
  'baseline_source_sha',src->>'original_source_sha',
  'frozen_test_path',src->>'frozen_test_path',
  'frozen_test_sha256',src->>'frozen_test_sha256',
  'expected_source_path',src->>'source_path',
  'installation_authorized',false,'job_completed',false,
  'production_changed',false);
end $$;
revoke all on function public.reality_claim_source_bound_generation_v1(uuid,text,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_claim_source_bound_generation_v1(uuid,text,text,text)
 to service_role;
