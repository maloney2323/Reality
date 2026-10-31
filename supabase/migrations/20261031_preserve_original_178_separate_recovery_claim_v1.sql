-- RECOVERY of the original #178 owner work, never a reset of its exhausted worker claim.
-- This is explicitly bound to an existing owner-approved investigation and independently
-- verified Continuity gap. Installation remains separately owner-gated.
create table if not exists reality_internal.original_178_recovery_v1 (
 id uuid primary key default gen_random_uuid(),
 original_queue_id uuid not null unique references reality_internal.governed_build_queue_v1(id),
 owner_id uuid not null,
 conversation_id uuid not null,
 original_work_id text not null,
 prior_worker_claim_id uuid not null,
 source_work_event_id uuid not null,
 verified_gap_event_id uuid not null,
 source_sha text not null,
 frozen_test_sha256 text not null,
 phase text not null default 'PREPARED'
  check (phase in ('PREPARED','DISPATCHED','CLAIMED')),
 dispatch_commit_sha text,
 dispatch_request_path text,
 dispatched_at timestamptz,
 recovery_claim_id uuid unique,
 claimed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table reality_internal.original_178_recovery_v1 enable row level security;
revoke all on reality_internal.original_178_recovery_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.original_178_recovery_v1 to service_role;

create or replace function public.reality_prepare_original_178_recovery_v1(p_original_queue_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $function$
declare
 q reality_internal.governed_build_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 w public.universe_events%rowtype;
 g public.universe_events%rowtype;
 r reality_internal.original_178_recovery_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'ORIGINAL_178_RECOVERY_SERVICE_ROLE_REQUIRED';end if;
 select * into q from reality_internal.governed_build_queue_v1
 where id=p_original_queue_id for update;
 if q.id is null or q.original_work_id<>'work:9b9578b3c65427589c4c6da68fe0fc87'
  or q.phase<>'ESCALATED' or q.worker_claim_id is null
  or q.original_work_evidence_ref<>'github:actions:run:40962921090:job:123760052647'
 then raise exception 'ORIGINAL_178_EXHAUSTED_CLAIM_MUST_REMAIN_UNCHANGED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||q.owner_id::text||':'||q.conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs where
 user_id=q.owner_id and conversation_id=q.conversation_id for update;
 if e.user_id is null or e.revision<>q.goal_revision
 or e.last_transition_event_id is distinct from q.goal_transition_event_id
 then raise exception 'ORIGINAL_178_GOAL_EPOCH_CHANGED';end if;
 select * into w from public.universe_events where
 entity_type='personal_first_self_upgrade_customer_work'
 and event_kind='WORK' and epistemic_status='OBSERVED'
 and continuity_root_id=q.continuity_root_id and worldline_id=q.worldline_id
 and provenance->>'principal_id'=q.owner_id::text
 and provenance->>'conversation_id'=q.conversation_id::text
 and payload->>'original_work_id'=q.original_work_id
 and payload->>'original_goal_id'=q.goal_id
 and payload->>'goal_transition_receipt_ref'=q.goal_transition_event_id::text
 and payload->>'issue_number'='178'
 and payload->>'status'='INVESTIGATION_APPROVED_GAP_WORK_NOT_COMPLETED'
 and payload->>'gap_provider_receipt_ref'=q.original_work_evidence_ref
 and payload->>'installation_authorized'='false'
 and payload->>'original_job_completed'='false'
 order by assertion_time asc limit 1;
 select * into g from public.universe_events where
 entity_type='personal_first_178_confirmed_gap'
 and event_kind='OBSERVATION' and epistemic_status='VERIFIED'
 and continuity_root_id=q.continuity_root_id and worldline_id=q.worldline_id
 and provenance->>'principal_id'=q.owner_id::text
 and provenance->>'conversation_id'=q.conversation_id::text
 and payload->>'original_work_id'=q.original_work_id
 and payload->>'goal_id'=q.goal_id
 and payload->>'provider_receipt_ref'=q.original_work_evidence_ref
 and payload->>'original_source_receipt_ref'=w.event_id::text
 and payload->>'authorization_granted'='false'
 and payload->>'original_job_completed'='false'
 order by assertion_time asc limit 1;
 if w.event_id is null or g.event_id is null or
  g.payload->>'evidence_hash' is distinct from w.payload->>'gap_evidence_hash'
 then raise exception 'ORIGINAL_178_OWNER_INVESTIGATION_AND_PROVIDER_GAP_REQUIRED';end if;
 insert into reality_internal.original_178_recovery_v1
 (original_queue_id,owner_id,conversation_id,original_work_id,
  prior_worker_claim_id,source_work_event_id,verified_gap_event_id,source_sha,frozen_test_sha256)
 values(q.id,q.owner_id,q.conversation_id,q.original_work_id,
  q.worker_claim_id,w.event_id,g.event_id,
  '6e6014f38f9fea382ea93b38418ec77e9158c1ef',
  'b42935d7300333ac7f1ecfce0aded8d2c7698bb88a55cbd413a96ebe0d73afdd')
 on conflict(original_queue_id) do nothing;
 select * into r from reality_internal.original_178_recovery_v1
 where original_queue_id=q.id;
 if r.original_work_id<>q.original_work_id or
  r.prior_worker_claim_id<>q.worker_claim_id or
  r.source_work_event_id<>w.event_id or
  r.verified_gap_event_id<>g.event_id or
  r.owner_id<>q.owner_id or
  r.source_sha<>'6e6014f38f9fea382ea93b38418ec77e9158c1ef'
 then raise exception 'ORIGINAL_178_IDEMPOTENT_RECOVERY_LINEAGE_CHANGED';end if;
 return pg_catalog.jsonb_build_object('status','EXACT_ORIGINAL_178_RECOVERY_PREPARED',
  'queue_id',r.id,'original_queue_id',q.id,
  'original_work_id',q.original_work_id,'phase',r.phase,
  'prior_worker_claim_preserved',true,'owner_investigation_previously_authorized',true,
  'installation_authorized',false,'job_completed',false,'production_changed',false);
end $function$;

create or replace function public.reality_mark_original_178_recovery_dispatched_v1(
 p_recovery_id uuid,p_github_sha text,p_request_path text)
returns jsonb language plpgsql security invoker set search_path=''
as $function$
declare r reality_internal.original_178_recovery_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'ORIGINAL_178_RECOVERY_SERVICE_ROLE_REQUIRED';end if;
 if p_github_sha !~ '^[a-f0-9]{40}$' or
 p_request_path is distinct from ('reality-requests/'||p_recovery_id::text||'.json')
 then raise exception 'ORIGINAL_178_RECOVERY_EXACT_DISPATCH_REQUIRED';end if;
 select * into r from reality_internal.original_178_recovery_v1
 where id=p_recovery_id for update;
 if r.id is null or r.phase not in ('PREPARED','DISPATCHED') then
  raise exception 'ORIGINAL_178_RECOVERY_NOT_DISPATCHABLE';end if;
 if r.dispatch_commit_sha is not null and
  (r.dispatch_commit_sha<>p_github_sha or r.dispatch_request_path<>p_request_path) then
  raise exception 'ORIGINAL_178_DISPATCH_ALREADY_PINNED';end if;
 if r.phase='PREPARED' then
  update reality_internal.original_178_recovery_v1
  set phase='DISPATCHED',dispatch_commit_sha=p_github_sha,
      dispatch_request_path=p_request_path,dispatched_at=now(),updated_at=now()
  where id=r.id;
 end if;
 return pg_catalog.jsonb_build_object('status','ORIGINAL_178_RECOVERY_DISPATCH_PINNED',
 'queue_id',r.id,'original_work_id',r.original_work_id,
 'dispatch_commit_sha',p_github_sha,'installation_authorized',false,
 'job_completed',false,'production_changed',false);
end $function$;

create or replace function public.reality_claim_original_178_recovery_v1(
 p_queue_id uuid,p_original_work_id text,p_github_sha text,p_request_path text)
returns jsonb language plpgsql security invoker set search_path=''
as $function$
declare
 r reality_internal.original_178_recovery_v1%rowtype;
 q reality_internal.governed_build_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
begin
 if current_user<>'service_role' then raise exception 'ORIGINAL_178_RECOVERY_SERVICE_ROLE_REQUIRED';end if;
 if p_original_work_id<>'work:9b9578b3c65427589c4c6da68fe0fc87'
 or p_github_sha !~ '^[a-f0-9]{40}$'
 or p_request_path is distinct from ('reality-requests/'||p_queue_id::text||'.json')
 then raise exception 'ORIGINAL_178_RECOVERY_BOUNDARY_REQUIRED';end if;
 select * into r from reality_internal.original_178_recovery_v1
 where id=p_queue_id for update;
 if r.id is null or r.phase<>'DISPATCHED' or r.recovery_claim_id is not null
 or r.original_work_id<>p_original_work_id
 or r.dispatch_commit_sha is distinct from p_github_sha
 or r.dispatch_request_path is distinct from p_request_path
 then raise exception 'ORIGINAL_178_SINGLE_RECOVERY_CLAIM_REQUIRED';end if;
 select * into q from reality_internal.governed_build_queue_v1
 where id=r.original_queue_id for update;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
 'reality-goal-pub-v1:'||r.owner_id::text||':'||r.conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs where
 user_id=r.owner_id and conversation_id=r.conversation_id for update;
 if q.id is null or q.original_work_id<>r.original_work_id
 or q.phase<>'ESCALATED' or q.worker_claim_id<>r.prior_worker_claim_id
 or q.owner_id<>r.owner_id or q.conversation_id<>r.conversation_id
 or e.user_id is null or e.revision<>q.goal_revision
 or e.last_transition_event_id is distinct from q.goal_transition_event_id
 then raise exception 'ORIGINAL_178_OLD_CLAIM_OR_GOAL_DRIFT';end if;
 if not exists(select 1 from public.universe_events g
  where g.event_id=r.verified_gap_event_id
  and g.entity_type='personal_first_178_confirmed_gap'
  and g.epistemic_status='VERIFIED'
  and g.payload->>'original_work_id'=r.original_work_id
  and g.payload->>'provider_receipt_ref'=q.original_work_evidence_ref)
 then raise exception 'ORIGINAL_178_VERIFIED_GAP_MISSING';end if;
 update reality_internal.original_178_recovery_v1 set
 phase='CLAIMED',recovery_claim_id=gen_random_uuid(),
 claimed_at=now(),updated_at=now()
 where id=r.id returning * into r;
 return pg_catalog.jsonb_build_object(
 'status','EXACT_ORIGINAL_178_RECOVERY_ADMITTED','queue_id',r.id,
 'claim_id',r.recovery_claim_id,
 'original_queue_id',r.original_queue_id,
 'original_work_id',r.original_work_id,'issue_number',178,
 'failed_run_id',40962921090,'baseline_source_sha',r.source_sha,
 'frozen_test_path','test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js',
 'frozen_test_sha256',r.frozen_test_sha256,
 'expected_source_path','src/reality-extensions/reality-ci-failure-evidence.mjs',
 'prior_worker_claim_preserved',true,'installation_authorized',false,
 'job_completed',false,'production_changed',false);
end $function$;

revoke all on function public.reality_prepare_original_178_recovery_v1(uuid)
 from public,anon,authenticated;
revoke all on function public.reality_mark_original_178_recovery_dispatched_v1(uuid,text,text)
 from public,anon,authenticated;
revoke all on function public.reality_claim_original_178_recovery_v1(uuid,text,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_prepare_original_178_recovery_v1(uuid) to service_role;
grant execute on function public.reality_mark_original_178_recovery_dispatched_v1(uuid,text,text) to service_role;
grant execute on function public.reality_claim_original_178_recovery_v1(uuid,text,text,text) to service_role;
