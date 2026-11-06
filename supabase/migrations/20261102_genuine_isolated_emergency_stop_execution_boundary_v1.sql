-- Real isolated emergency-stop boundary for trusted installer and original-job execution.
-- Uses row locks to serialize a HALT against any in-flight new claim.
create table if not exists reality_internal.genuine_preview_execution_control_v1 (
 singleton boolean primary key default true check(singleton),
 mode text not null default 'RUNNING' check(mode in ('RUNNING','HALTED')),
 epoch bigint not null default 0,
 halt_run_id bigint,
 halt_source_sha text,
 updated_at timestamptz not null default clock_timestamp()
);
alter table reality_internal.genuine_preview_execution_control_v1 enable row level security;
revoke all on reality_internal.genuine_preview_execution_control_v1 from public,anon,authenticated;
grant select,update on reality_internal.genuine_preview_execution_control_v1 to service_role;
insert into reality_internal.genuine_preview_execution_control_v1(singleton) values(true) on conflict do nothing;

create table if not exists reality_internal.genuine_preview_safety_transitions_v1 (
 transition_id uuid primary key default gen_random_uuid(),
 epoch bigint not null,
 mode text not null check(mode in ('RUNNING','HALTED')),
 run_id bigint not null,
 source_sha text not null,
 observed_at timestamptz not null default clock_timestamp()
);
alter table reality_internal.genuine_preview_safety_transitions_v1 enable row level security;
revoke all on reality_internal.genuine_preview_safety_transitions_v1 from public,anon,authenticated;
grant select,insert on reality_internal.genuine_preview_safety_transitions_v1 to service_role;

create or replace function public.reality_assert_genuine_preview_running_v1()
returns void language plpgsql set search_path to '' as $fn$
declare s reality_internal.genuine_preview_execution_control_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'REALITY_PREVIEW_STOP_SERVICE_ROLE_REQUIRED';end if;
 select * into s from reality_internal.genuine_preview_execution_control_v1 where singleton=true for share;
 if s.singleton is null or s.mode<>'RUNNING' then
  raise exception 'REALITY_ISOLATED_EMERGENCY_STOP_ACTIVE';
 end if;
end $fn$;

create or replace function public.reality_set_genuine_preview_emergency_mode_v1(
 p_mode text,p_run_id bigint,p_source_sha text)
returns jsonb language plpgsql set search_path to '' as $fn$
declare c reality_internal.genuine_preview_execution_control_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'REALITY_PREVIEW_STOP_CONTROLLER_SERVICE_ROLE_REQUIRED';end if;
 if p_mode not in ('HALTED','RUNNING') or p_run_id<1 or p_source_sha !~ '^[a-f0-9]{40}$' then
  raise exception 'REALITY_PREVIEW_STOP_SIGNED_SCOPE_REQUIRED';
 end if;
 select * into c from reality_internal.genuine_preview_execution_control_v1 where singleton=true for update;
 if c.singleton is null then raise exception 'REALITY_PREVIEW_STOP_CONTROL_MISSING';end if;
 if p_mode='HALTED' then
  if c.mode<>'RUNNING' then raise exception 'REALITY_PREVIEW_ALREADY_HALTED';end if;
 else
  if c.mode<>'HALTED' or c.halt_run_id<>p_run_id or c.halt_source_sha<>p_source_sha then
   raise exception 'REALITY_PREVIEW_STOP_DIFFERENT_CONTROLLER_CANNOT_RESTART';
  end if;
 end if;
 update reality_internal.genuine_preview_execution_control_v1
 set mode=p_mode,epoch=c.epoch+1,halt_run_id=case when p_mode='HALTED' then p_run_id else null end,
 halt_source_sha=case when p_mode='HALTED' then p_source_sha else null end,
 updated_at=clock_timestamp() where singleton=true;
 insert into reality_internal.genuine_preview_safety_transitions_v1(epoch,mode,run_id,source_sha)
 values(c.epoch+1,p_mode,p_run_id,p_source_sha);
 return jsonb_build_object('status','ISOLATED_PREVIEW_'||p_mode,'mode',p_mode,'epoch',c.epoch+1,
  'run_id',p_run_id,'production_changed',false,'production_release_authorized',false);
end $fn$;

create or replace function public.reality_probe_genuine_preview_emergency_stop_v1()
returns jsonb language plpgsql set search_path to '' as $fn$
declare c reality_internal.genuine_preview_execution_control_v1%rowtype;
 observed text; blocked int:=0;
begin
 if current_user<>'service_role' then raise exception 'REALITY_PREVIEW_STOP_PROBE_SERVICE_ROLE_REQUIRED';end if;
 select * into c from reality_internal.genuine_preview_execution_control_v1 where singleton=true;
 if c.mode<>'HALTED' then raise exception 'REALITY_PREVIEW_STOP_NOT_ACTIVE';end if;
 begin
  perform public.reality_reserve_approved_genuine_preview_v1(
   '00000000-0000-4000-8000-000000000000'::uuid,
   '00000000-0000-4000-8000-000000000000'::uuid,
   repeat('0',64),repeat('0',40),'12345678');
  raise exception 'REALITY_PREVIEW_STOP_INSTALL_WAS_ALLOWED';
 exception when others then
  get stacked diagnostics observed=message_text;
  if observed<>'REALITY_ISOLATED_EMERGENCY_STOP_ACTIVE' then
    raise exception 'REALITY_PREVIEW_STOP_INSTALL_GATE_WRONG_ERROR: %',observed;end if;
  blocked:=blocked+1;
 end;
 begin
  perform public.reality_claim_genuine_original_v1(
   '00000000-0000-4000-8000-000000000000'::uuid,12345678,repeat('0',40));
  raise exception 'REALITY_PREVIEW_STOP_CLAIM_WAS_ALLOWED';
 exception when others then
  get stacked diagnostics observed=message_text;
  if observed<>'REALITY_ISOLATED_EMERGENCY_STOP_ACTIVE' then
    raise exception 'REALITY_PREVIEW_STOP_CLAIM_GATE_WRONG_ERROR: %',observed;end if;
  blocked:=blocked+1;
 end;
 begin
  perform public.reality_read_approved_genuine_preview_v1();
  raise exception 'REALITY_PREVIEW_STOP_PREPARE_WAS_ALLOWED';
 exception when others then
  get stacked diagnostics observed=message_text;
  if observed<>'REALITY_ISOLATED_EMERGENCY_STOP_ACTIVE' then
    raise exception 'REALITY_PREVIEW_STOP_PREPARE_GATE_WRONG_ERROR: %',observed;end if;
  blocked:=blocked+1;
 end;
 return jsonb_build_object('status','ISOLATED_HALT_ENFORCED','blocked_admission_operations',blocked,
  'total_probes',3,'epoch',c.epoch,'halt_controller_run_id',c.halt_run_id,
  'production_changed',false,'production_release_authorized',false);
end $fn$;

create or replace function public.reality_read_genuine_preview_emergency_state_v1()
returns jsonb language plpgsql set search_path to '' as $fn$
declare c reality_internal.genuine_preview_execution_control_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'REALITY_PREVIEW_STOP_READ_SERVICE_ROLE_REQUIRED';end if;
 select * into c from reality_internal.genuine_preview_execution_control_v1 where singleton=true;
 return jsonb_build_object('mode',c.mode,'epoch',c.epoch,
 'halt_run_id',c.halt_run_id,'production_changed',false,
 'production_release_authorized',false);
end $fn$;
revoke all on function public.reality_assert_genuine_preview_running_v1() from public,anon,authenticated;
revoke all on function public.reality_set_genuine_preview_emergency_mode_v1(text,bigint,text) from public,anon,authenticated;
revoke all on function public.reality_probe_genuine_preview_emergency_stop_v1() from public,anon,authenticated;
revoke all on function public.reality_read_genuine_preview_emergency_state_v1() from public,anon,authenticated;
grant execute on function public.reality_assert_genuine_preview_running_v1() to service_role;
grant execute on function public.reality_set_genuine_preview_emergency_mode_v1(text,bigint,text) to service_role;
grant execute on function public.reality_probe_genuine_preview_emergency_stop_v1() to service_role;
grant execute on function public.reality_read_genuine_preview_emergency_state_v1() to service_role;

-- Insert a control read into the ACTUAL isolated admission and claim RPCs.
CREATE OR REPLACE FUNCTION public.reality_reserve_approved_genuine_preview_v1(p_trigger_id uuid, p_approval_id uuid, p_artifact_hash text, p_runner_sha text, p_run_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 o public.universe_events%rowtype;
 now_at timestamptz;
begin
 perform public.reality_assert_genuine_preview_running_v1();
 if current_user <> 'service_role' then
  raise exception 'GENUINE_INSTALL_RESERVE_SERVICE_REQUIRED'; end if;
 if p_runner_sha !~ '^[a-f0-9]{40}$' or
    p_artifact_hash !~ '^[a-f0-9]{64}$' or
    p_run_id !~ '^[1-9][0-9]{7,17}$' then
  raise exception 'GENUINE_INSTALL_RESERVE_SIGNED_SCOPE_REQUIRED';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
  where trigger_id=p_trigger_id for update;
 select * into a from reality_internal.genuine_preview_install_approvals_v1
  where trigger_id=p_trigger_id for update;
 if q.trigger_id is null or a.trigger_id is null or
  a.approval_id is distinct from p_approval_id or
  a.artifact_hash is distinct from p_artifact_hash or
  q.phase<>'AWAITING_OWNER_APPROVAL' or
  q.qualification_receipt->>'status'<>'AWAITING_OWNER_APPROVAL' or
  q.qualified_candidate->>'artifact_sha256' is distinct from p_artifact_hash or
  a.target_environment<>'ISOLATED_PREVIEW' then
  raise exception 'GENUINE_INSTALL_EXACT_APPROVAL_NOT_VERIFIED';end if;
 if a.consumed_at is not null then
   raise exception 'GENUINE_INSTALL_ALREADY_RESERVED_NO_AUTOMATIC_RETRY';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
   'reality-goal-pub-v1:'||q.owner_id::text||':'||q.conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs
 where user_id=q.owner_id and conversation_id=q.conversation_id for update;
 select * into o from public.universe_events
 where event_id=q.original_work_event_id;
 if e.user_id is null or
    e.last_transition_event_id is distinct from q.goal_transition_event_id or
    o.epistemic_status<>'VERIFIED' or
    o.payload->>'original_job_completed' is distinct from 'false' or
    o.payload->>'owner_authorized_investigation' is distinct from 'true' or
    q.verified_frozen_reproduction->>'status'<>'ORIGINAL_FROZEN_REPRODUCED_RED'
 then raise exception 'GENUINE_INSTALL_CURRENT_GOAL_OR_RED_INVALID';end if;
 if exists(select 1 from public.universe_events v
  where v.continuity_root_id=o.continuity_root_id
   and v.worldline_id=o.worldline_id
   and v.epistemic_status='VERIFIED'
   and v.payload->>'original_work_id'=q.original_work_id
   and (v.payload->>'original_job_completed'='true'
    or v.payload->>'constitutional_phase'='SETTLED'))
 then raise exception 'GENUINE_INSTALL_ORIGINAL_ALREADY_SETTLED';end if;
 now_at:=clock_timestamp();
 update reality_internal.genuine_preview_install_approvals_v1
  set consumed_at=now_at,installer_run_id=p_run_id,
      installer_source_sha=p_runner_sha
  where trigger_id=p_trigger_id;
 return pg_catalog.jsonb_build_object(
  'status','AUTHORIZED_INSTALL_RESERVATION_CONSUMED_ONCE',
  'original_work_id',q.original_work_id,'trigger_id',p_trigger_id,
  'approval_id',p_approval_id,'artifact_sha256',p_artifact_hash,
  'runner_sha',p_runner_sha,'run_id',p_run_id,
  'reserved_at',now_at,
  'target_environment','ISOLATED_PREVIEW',
  'installation_verified',false,
  'original_job_completed',false,'production_changed',false);
end $function$;

CREATE OR REPLACE FUNCTION public.reality_claim_genuine_original_v1(p_trigger_id uuid, p_run_id bigint, p_runner_sha text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 c reality_internal.genuine_original_continuations_v1%rowtype;
 q reality_internal.genuine_capability_queue_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 o public.universe_events%rowtype;
 original_run bigint;
 recovered boolean;
begin
 perform public.reality_assert_genuine_preview_running_v1();
 if current_user <> 'service_role' then
  raise exception 'CONTINUATION_CLAIM_SERVICE_ROLE_REQUIRED';end if;
 if p_trigger_id is null or p_run_id is null or p_run_id<1 or
  p_runner_sha !~ '^[a-f0-9]{40}$' then
  raise exception 'CONTINUATION_CLAIM_SIGNED_RUN_REQUIRED';end if;
 select * into c from reality_internal.genuine_original_continuations_v1
  where trigger_id=p_trigger_id for update;
 select * into q from reality_internal.genuine_capability_queue_v1
  where trigger_id=p_trigger_id for update;
 select * into a from reality_internal.genuine_preview_install_approvals_v1
  where trigger_id=p_trigger_id for update;
 if c.trigger_id is null or q.trigger_id is null or a.trigger_id is null or
  c.state<>'ACCEPTED_FOR_ISOLATED_RESUMPTION' or
  c.claimed_at is not null or c.claim_run_id is not null or
  c.outcome_receipt is not null or
  c.acceptance_receipt->>'status'<>'ACCEPTED_FOR_ISOLATED_RESUMPTION' or
  c.acceptance_receipt->>'original_work_id' is distinct from q.original_work_id or
  c.acceptance_receipt->>'installed_commit_sha' is distinct from c.installed_commit_sha or
  c.acceptance_receipt->>'owner_approval_id' is distinct from a.approval_id::text or
  c.acceptance_receipt->>'artifact_sha256' is distinct from a.artifact_hash or
  c.acceptance_receipt->>'provider_branch_verified'<>'true' or
  c.acceptance_receipt->>'installed_bytes_verified'<>'true' or
  c.acceptance_receipt->>'production_changed'<>'false' or
  (c.acceptance_receipt->>'run_id') !~ '^[1-9][0-9]{6,17}$' or
  (c.acceptance_receipt->>'runner_sha') !~ '^[a-f0-9]{40}$' then
  raise exception 'CONTINUATION_CLAIM_ORIGINAL_ACCEPTANCE_UNVERIFIED';end if;
 select * into e from reality_internal.goal_publication_epochs
  where user_id=q.owner_id and conversation_id=q.conversation_id;
 select * into o from public.universe_events
  where event_id=q.original_work_event_id;
 if q.phase<>'ISOLATED_INSTALLED_PROBATION' or
  q.original_work_id is distinct from c.original_work_id or
  q.owner_id is distinct from c.owner_id or
  q.qualified_candidate->>'artifact_sha256' is distinct from c.artifact_sha256 or
  a.owner_id is distinct from q.owner_id or
  a.original_work_id is distinct from q.original_work_id or
  a.approval_id is distinct from c.approval_id or
  a.artifact_hash is distinct from c.artifact_sha256 or
  a.approval_receipt->>'approval_origin'<>'AUTHENTICATED_OWNER_EXPLICIT_ACTION' or
  a.consumed_at is null or a.target_environment<>'ISOLATED_PREVIEW' or
  a.probation_status<>'ACTIVE' or
  a.installation_receipt->>'status'<>'ISOLATED_INSTALLED_PROBATION' or
  a.installation_receipt->>'original_job_completed'<>'false' or
  a.installation_receipt->>'production_changed'<>'false' or
  a.installed_commit_sha is distinct from c.installed_commit_sha or
  a.settlement_receipt is not null or
  e.user_id is null or
  e.last_transition_event_id is distinct from q.goal_transition_event_id or
  o.event_id is null or o.epistemic_status<>'VERIFIED' or
  o.payload->>'original_work_id' is distinct from q.original_work_id or
  o.payload->>'owner_authorized_investigation'<>'true' or
  o.payload->>'original_job_completed'<>'false' then
  raise exception 'CONTINUATION_CLAIM_CURRENT_OWNER_OR_INSTALLED_STATE_CHANGED';end if;
 if exists(select 1 from public.universe_events v
  where v.continuity_root_id=o.continuity_root_id
    and v.worldline_id=o.worldline_id
    and v.epistemic_status='VERIFIED'
    and v.payload->>'original_work_id'=q.original_work_id
    and (v.payload->>'original_job_completed'='true'
       or v.payload->>'constitutional_phase'='SETTLED')) then
  raise exception 'CONTINUATION_CLAIM_ALREADY_SETTLED';end if;
 original_run:=(c.acceptance_receipt->>'run_id')::bigint;
 recovered:=original_run<>p_run_id or
  (c.acceptance_receipt->>'runner_sha')<>p_runner_sha;
 if recovered then
  insert into reality_internal.genuine_original_claim_recoveries_v1(
   trigger_id,original_work_id,owner_id,approval_id,installed_commit_sha,
   acceptance_run_id,acceptance_runner_sha,claim_run_id,claim_runner_sha)
  values(c.trigger_id,c.original_work_id,c.owner_id,c.approval_id,
   c.installed_commit_sha,original_run,
   c.acceptance_receipt->>'runner_sha',p_run_id,p_runner_sha);
 end if;
 update reality_internal.genuine_original_continuations_v1
  set state='RESUMPTION_CLAIMED',claim_run_id=p_run_id,
   claim_runner_sha=p_runner_sha,claimed_at=clock_timestamp()
  where trigger_id=p_trigger_id and state='ACCEPTED_FOR_ISOLATED_RESUMPTION';
 if not found then raise exception 'CONTINUATION_CLAIM_CONCURRENT_STATE_CHANGE';end if;
 return jsonb_build_object('status','RESUMPTION_CLAIMED',
  'trigger_id',c.trigger_id,'original_work_id',c.original_work_id,
  'installed_commit_sha',c.installed_commit_sha,
  'artifact_sha256',c.artifact_sha256,
  'run_id',p_run_id,'recovered_from_prior_acceptance_run',recovered,
  'production_changed',false,'original_job_completed',false);
end $function$;

CREATE OR REPLACE FUNCTION public.reality_read_approved_genuine_preview_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 perform public.reality_assert_genuine_preview_running_v1();
 if current_user <> 'service_role' then
  raise exception 'GENUINE_INSTALL_READ_SERVICE_REQUIRED'; end if;
 select pg_catalog.jsonb_build_object(
   'status','OWNER_APPROVED_CAPABILITY_FOUND',
   'trigger_id',q.trigger_id,'gap_event_id',q.gap_event_id,
   'owner_id',q.owner_id,'original_work_id',q.original_work_id,
   'original_work_event_id',q.original_work_event_id,
   'goal_id',q.goal_id,'goal_transition_event_id',q.goal_transition_event_id,
   'approval_id',a.approval_id,
   'approval',a.approval_receipt,
   'artifact_sha256',a.artifact_hash,
   'candidate',q.qualified_candidate,
   'qualification',q.qualification_receipt,
   'frozen_receipt',q.verified_frozen_reproduction,
   'phase',q.phase,
   'target_environment','ISOLATED_PREVIEW',
   'production_changed',false
 ) into result
 from reality_internal.genuine_capability_queue_v1 q
 join reality_internal.genuine_preview_install_approvals_v1 a
  on a.trigger_id=q.trigger_id
 where q.phase='AWAITING_OWNER_APPROVAL'
  and a.consumed_at is null
  and a.target_environment='ISOLATED_PREVIEW'
  and a.owner_id=q.owner_id
  and a.original_work_id=q.original_work_id
  and a.artifact_hash=q.qualified_candidate->>'artifact_sha256'
  and a.artifact_hash=q.qualification_receipt->>'artifact_sha256'
  and a.approval_receipt->>'approval_origin'='AUTHENTICATED_OWNER_EXPLICIT_ACTION'
  and a.approval_receipt->>'source_installation_completed'='false'
 order by a.approved_at asc limit 1;
 return coalesce(result,'{"status":"NO_APPROVED_WORK"}'::jsonb);
end $function$;

CREATE OR REPLACE FUNCTION public.reality_accept_genuine_original_v1(p_trigger_id uuid, p_run_id bigint, p_runner_sha text, p_proof jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
 c reality_internal.genuine_original_continuations_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 o public.universe_events%rowtype;
 receipt jsonb;
begin
 perform public.reality_assert_genuine_preview_running_v1();
 if current_user<>'service_role' then raise exception 'CONTINUATION_ACCEPT_SERVICE_ROLE_REQUIRED';end if;
 if p_run_id<1 or p_runner_sha !~ '^[a-f0-9]{40}$' or
 p_proof->>'provider_branch_verified'<>'true' or
 p_proof->>'installed_bytes_verified'<>'true' or
 p_proof->>'production_changed'<>'false' then
  raise exception 'CONTINUATION_ACCEPT_PROVIDER_PROOF_MISSING';
 end if;
 select * into q from reality_internal.genuine_capability_queue_v1 where trigger_id=p_trigger_id for update;
 select * into a from reality_internal.genuine_preview_install_approvals_v1 where trigger_id=p_trigger_id for update;
 select * into c from reality_internal.genuine_original_continuations_v1 where trigger_id=p_trigger_id for update;
 select * into e from reality_internal.goal_publication_epochs
 where user_id=q.owner_id and conversation_id=q.conversation_id;
 select * into o from public.universe_events where event_id=q.original_work_event_id;
 if q.phase<>'ISOLATED_INSTALLED_PROBATION' or a.approval_id is null or
    a.consumed_at is null or a.target_environment<>'ISOLATED_PREVIEW' or
    a.probation_status<>'ACTIVE' or a.installed_commit_sha is null or
    a.installed_commit_sha<>p_proof->>'installed_commit_sha' or
    a.installation_receipt->>'original_work_id'<>q.original_work_id or
    a.installation_receipt->>'settlement_verified'<>'false' or
    (a.installation_receipt->>'monitored_executions')::int<>5 or
    (a.installation_receipt->>'passed_assertions')::int<220 or
    jsonb_array_length(a.probation_observations)<>5 or
    (select count(*) from jsonb_array_elements(a.probation_observations) obs
      where obs->>'failed'='0' and obs->>'exit_code'='0' and
      obs->>'sandbox_network_disabled'='true' and
      obs->>'executor_privileges_dropped'='true')<>5 or
    a.settlement_receipt is not null or
    e.last_transition_event_id is distinct from q.goal_transition_event_id or
    o.epistemic_status<>'VERIFIED' or o.payload->>'original_work_id'<>q.original_work_id or
    o.payload->>'original_job_completed'<>'false' then
    raise exception 'CONTINUATION_ACCEPT_ORIGINAL_GATES_NOT_MET';
 end if;
 if c.trigger_id is not null then
   if c.installed_commit_sha<>a.installed_commit_sha or c.artifact_sha256<>a.artifact_hash or
      c.approval_id<>a.approval_id then raise exception 'CONTINUATION_ACCEPT_REPLAY_CONFLICT';end if;
   return c.acceptance_receipt;
 end if;
 receipt:=jsonb_build_object('status','ACCEPTED_FOR_ISOLATED_RESUMPTION',
  'version','reality-capability-independent-acceptance-v1',
  'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'owner_approval_id',a.approval_id,'artifact_sha256',a.artifact_hash,
  'installed_commit_sha',a.installed_commit_sha,'runner_sha',p_runner_sha,'run_id',p_run_id,
  'provider_branch_verified',true,'installed_bytes_verified',true,
  'monitored_executions',5,'passed_assertions',(a.installation_receipt->>'passed_assertions')::int,
  'probation_window_target',(a.installation_receipt->>'probation_window_target')::int,
  'live_business_executions',0,'full_probation_complete',false,
  'scope','ONE_ORIGINAL_JOB_ISOLATED_PREVIEW_ONLY',
  'production_changed',false,'original_job_completed',false,
  'accepted_at',clock_timestamp());
 insert into reality_internal.genuine_original_continuations_v1
 (trigger_id,original_work_id,owner_id,installed_commit_sha,approval_id,artifact_sha256,state,acceptance_receipt)
 values(q.trigger_id,q.original_work_id,q.owner_id,a.installed_commit_sha,a.approval_id,
 a.artifact_hash,'ACCEPTED_FOR_ISOLATED_RESUMPTION',receipt);
 return receipt;
end $function$;

CREATE OR REPLACE FUNCTION public.reality_record_genuine_preview_activation_v1(p_trigger_id uuid, p_approval_id uuid, p_proof jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 q reality_internal.genuine_capability_queue_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 o public.universe_events%rowtype;
 receipt jsonb;
 now_at timestamptz;
begin
 perform public.reality_assert_genuine_preview_running_v1();
 if current_user<>'service_role' then
  raise exception 'GENUINE_ACTIVATION_SERVICE_ROLE_REQUIRED';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger_id for update;
 select * into a from reality_internal.genuine_preview_install_approvals_v1
 where trigger_id=p_trigger_id for update;
 if q.trigger_id is null or a.approval_id is distinct from p_approval_id or
   a.consumed_at is null or a.installer_run_id is null or
   a.target_environment<>'ISOLATED_PREVIEW' or
   a.artifact_hash is distinct from q.qualified_candidate->>'artifact_sha256' or
   q.qualification_receipt->>'status'<>'AWAITING_OWNER_APPROVAL'
 then raise exception 'GENUINE_ACTIVATION_CONSUMED_OWNER_AUTHORITY_REQUIRED';end if;
 if q.phase='ISOLATED_INSTALLED_PROBATION' then
   if a.installed_commit_sha is distinct from p_proof->>'installed_commit_sha'
    then raise exception 'GENUINE_ACTIVATION_PROOF_REPLAY_CONFLICT';end if;
   return a.installation_receipt;
 end if;
 if q.phase<>'AWAITING_OWNER_APPROVAL' or
   (p_proof->>'original_work_id') is distinct from q.original_work_id or
   (p_proof->>'approval_id') is distinct from a.approval_id::text or
   (p_proof->>'artifact_sha256') is distinct from a.artifact_hash or
   (p_proof->>'installer_run_id') is distinct from a.installer_run_id or
   (p_proof->>'installed_commit_sha') !~ '^[a-f0-9]{40}$' or
   (p_proof->>'installed_branch') !~ '^feature/reality-qualified-install-[a-f0-9]{12}$' or
   (p_proof->>'independent_verified') is distinct from 'true' or
   (p_proof->>'original_frozen_acceptance_passed') is distinct from 'true' or
   (p_proof->>'isolation_network_disabled') is distinct from 'true' or
   (p_proof->>'production_changed') is distinct from 'false' or
   (p_proof->>'original_job_completed') is distinct from 'false' or
   coalesce((p_proof->>'monitored_executions')::integer,0)<5 or
   coalesce((p_proof->>'failed_assertions')::integer,1)<>0 or
   coalesce((p_proof->>'passed_assertions')::integer,0)<220 or
   pg_catalog.jsonb_typeof(p_proof->'observations')<>'array' or
   pg_catalog.jsonb_array_length(p_proof->'observations')<>5
 then raise exception 'GENUINE_ACTIVATION_FIVE_INDEPENDENT_EXECUTIONS_REQUIRED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
 'reality-goal-pub-v1:'||q.owner_id::text||':'||q.conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs
 where user_id=q.owner_id and conversation_id=q.conversation_id for update;
 select * into o from public.universe_events
 where event_id=q.original_work_event_id;
 if e.user_id is null or
   e.last_transition_event_id is distinct from q.goal_transition_event_id or
   o.epistemic_status<>'VERIFIED' or
   o.payload->>'original_job_completed' is distinct from 'false'
 then raise exception 'GENUINE_ACTIVATION_OWNER_GOAL_CHANGED';end if;
 if exists(select 1 from public.universe_events v
   where v.continuity_root_id=o.continuity_root_id and
   v.worldline_id=o.worldline_id and v.epistemic_status='VERIFIED'
   and v.payload->>'original_work_id'=q.original_work_id
   and (v.payload->>'original_job_completed'='true' or
    v.payload->>'constitutional_phase'='SETTLED'))
 then raise exception 'GENUINE_ACTIVATION_ALREADY_SETTLED';end if;
 now_at:=clock_timestamp();
 receipt:=pg_catalog.jsonb_build_object(
  'version','reality-genuine-preview-activation-v1',
  'status','ISOLATED_INSTALLED_PROBATION',
  'original_work_id',q.original_work_id,
  'approval_id',a.approval_id,'artifact_sha256',a.artifact_hash,
  'installed_branch',p_proof->>'installed_branch',
  'installed_commit_sha',p_proof->>'installed_commit_sha',
  'independent_run_id',p_proof->>'independent_run_id',
  'monitored_executions',(p_proof->>'monitored_executions')::integer,
  'passed_assertions',(p_proof->>'passed_assertions')::integer,
  'probation_window_target',50,
  'probation_live_business_executions',0,
  'valid_time',o.effective_time,
  'transaction_time',now_at,
  'prior_state_hash',q.qualification_receipt->>'post_state_hash',
  'owner_approval_ref',a.approval_id,
  'production_changed',false,
  'original_job_completed',false,
  'settlement_verified',false);
 update reality_internal.genuine_preview_install_approvals_v1
 set installed_commit_sha=p_proof->>'installed_commit_sha',
  install_branch=p_proof->>'installed_branch',
  installation_receipt=receipt,
  probation_status='ACTIVE',
  probation_observations=p_proof->'observations'
 where trigger_id=q.trigger_id;
 update reality_internal.genuine_capability_queue_v1
 set phase='ISOLATED_INSTALLED_PROBATION',
 updated_at=now_at where trigger_id=q.trigger_id;
 return receipt;
end $function$;

