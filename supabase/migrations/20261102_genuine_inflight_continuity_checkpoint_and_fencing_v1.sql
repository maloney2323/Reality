-- Real isolated process interruption and recovery of an evidence-only audit of an
-- already settled customer repair. No external action, installer, production write,
-- or re-execution of the historical original job.
create table if not exists reality_internal.genuine_inflight_readonly_audits_v1 (
 run_id bigint primary key check(run_id>0),
 source_original_work_id text not null check(source_original_work_id ~ '^work:[a-f0-9]{32}$'),
 source_original_event_id uuid not null,
 owner_id uuid not null,
 state text not null check(state in ('ACTIVE','PAUSED','SETTLED')),
 lease_epoch int not null check(lease_epoch>0),
 checkpoint_step int not null default 0 check(checkpoint_step between 0 and 3),
 last_checkpoint_hash text not null default repeat('0',64),
 last_event_id uuid,
 created_at timestamptz not null default clock_timestamp(),
 finished_at timestamptz
);
alter table reality_internal.genuine_inflight_readonly_audits_v1 enable row level security;
revoke all on reality_internal.genuine_inflight_readonly_audits_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.genuine_inflight_readonly_audits_v1 to service_role;

create table if not exists reality_internal.genuine_inflight_readonly_checkpoints_v1 (
 run_id bigint not null references reality_internal.genuine_inflight_readonly_audits_v1(run_id),
 step int not null check(step between 1 and 3),
 lease_epoch int not null,
 prior_hash text not null check(prior_hash ~ '^[a-f0-9]{64}$'),
 checkpoint_hash text not null check(checkpoint_hash ~ '^[a-f0-9]{64}$'),
 provider_evidence jsonb not null,
 universe_event_id uuid not null unique,
 recorded_at timestamptz not null default clock_timestamp(),
 primary key (run_id,step)
);
alter table reality_internal.genuine_inflight_readonly_checkpoints_v1 enable row level security;
revoke all on reality_internal.genuine_inflight_readonly_checkpoints_v1 from public,anon,authenticated;
grant select,insert on reality_internal.genuine_inflight_readonly_checkpoints_v1 to service_role;

create or replace function public.reality_inflight_audit_control_v1(
 p_action text,p_run_id bigint,p_expected_epoch int default null,
 p_step int default null,p_evidence jsonb default null
) returns jsonb language plpgsql set search_path to '' as $fn$
declare
 a reality_internal.genuine_inflight_readonly_audits_v1%rowtype;
 c reality_internal.genuine_preview_execution_control_v1%rowtype;
 q reality_internal.genuine_capability_queue_v1%rowtype;
 cont reality_internal.genuine_original_continuations_v1%rowtype;
 origin public.universe_events%rowtype;
 prior public.universe_events%rowtype;
 ev public.universe_events%rowtype;
 step_hash text; prev_hash text; content_sha text; lineage_sha text;
 payload jsonb; refs jsonb; provenance jsonb; basis jsonb; next_time timestamptz; iso text;
 matching int;
begin
 if current_user<>'service_role' then raise exception 'REALITY_INFLIGHT_SERVICE_ROLE_REQUIRED';end if;
 if p_run_id<1 or p_action not in ('START','READ','PAUSE','RESUME','CHECKPOINT') then
  raise exception 'REALITY_INFLIGHT_EXACT_ACTION_REQUIRED';end if;
 -- A HALT serializes with every in-flight checkpoint. The controller updates
 -- this singleton with FOR UPDATE; checkpoints hold FOR SHARE until committed.
 select * into c from reality_internal.genuine_preview_execution_control_v1
 where singleton=true for share;
 if c.singleton is null then raise exception 'REALITY_INFLIGHT_CONTROL_MISSING';end if;
 select * into a from reality_internal.genuine_inflight_readonly_audits_v1
 where run_id=p_run_id for update;
 if p_action='START' then
  if c.mode<>'RUNNING' then raise exception 'REALITY_INFLIGHT_STOP_ACTIVE';end if;
  if a.run_id is null then
   select * into q from reality_internal.genuine_capability_queue_v1
     where capability_id='reality-continuity-settlement-reconciler'
     and phase='SETTLED_ISOLATED'
     order by created_at desc limit 1;
   select * into cont from reality_internal.genuine_original_continuations_v1
     where trigger_id=q.trigger_id;
   select * into origin from public.universe_events
     where event_id=q.original_work_event_id;
   if q.trigger_id is null or cont.state<>'SETTLED_ISOLATED'
    or cont.outcome_receipt->>'independent_outcome_verified'<>'true'
    or cont.outcome_receipt->>'original_job_completed'<>'true'
    or cont.outcome_receipt->>'production_changed'<>'false'
    or origin.epistemic_status<>'VERIFIED'
    or origin.payload->>'original_work_id'<>q.original_work_id
    or not exists(select 1 from public.universe_events e
       where e.epistemic_status='VERIFIED'
       and e.payload->>'original_work_id'=q.original_work_id
       and e.payload->>'original_job_completed'='true'
       and e.payload->>'constitutional_phase'='SETTLED')
   then raise exception 'REALITY_INFLIGHT_REAL_SOURCE_SETTLEMENT_REQUIRED';end if;
   insert into reality_internal.genuine_inflight_readonly_audits_v1
    (run_id,source_original_work_id,source_original_event_id,owner_id,state,lease_epoch)
   values(p_run_id,q.original_work_id,origin.event_id,q.owner_id,'ACTIVE',1)
   returning * into a;
  end if;
 end if;
 if a.run_id is null then raise exception 'REALITY_INFLIGHT_JOB_NOT_FOUND';end if;
 if p_action='READ' or p_action='START' then
  return jsonb_build_object('status',a.state,'job_id','audit:provider-continuity:'||a.run_id::text,
    'source_original_work_id',a.source_original_work_id,'run_id',a.run_id,
    'lease_epoch',a.lease_epoch,'checkpoint_step',a.checkpoint_step,
    'last_checkpoint_hash',a.last_checkpoint_hash,'last_event_id',a.last_event_id,
    'emergency_mode',c.mode,'production_changed',false);
 end if;
 if p_action='PAUSE' then
  if c.mode<>'HALTED' then raise exception 'REALITY_INFLIGHT_PAUSE_REQUIRES_REAL_HALT';end if;
  if a.state<>'ACTIVE' then raise exception 'REALITY_INFLIGHT_PAUSE_NOT_ACTIVE';end if;
  update reality_internal.genuine_inflight_readonly_audits_v1
    set state='PAUSED',lease_epoch=lease_epoch+1
    where run_id=p_run_id returning * into a;
 elsif p_action='RESUME' then
  if c.mode<>'RUNNING' then raise exception 'REALITY_INFLIGHT_STOP_ACTIVE';end if;
  if a.state<>'PAUSED' then raise exception 'REALITY_INFLIGHT_RESUME_NOT_PAUSED';end if;
  update reality_internal.genuine_inflight_readonly_audits_v1
   set state='ACTIVE',lease_epoch=lease_epoch+1
   where run_id=p_run_id returning * into a;
 elsif p_action='CHECKPOINT' then
  if c.mode<>'RUNNING' then raise exception 'REALITY_INFLIGHT_STOP_ACTIVE';end if;
  if a.state<>'ACTIVE' or a.lease_epoch is distinct from p_expected_epoch then
   raise exception 'REALITY_INFLIGHT_STALE_WORKER_FENCED';end if;
  if p_step is distinct from a.checkpoint_step+1 or p_step not between 1 and 3 then
   raise exception 'REALITY_INFLIGHT_CHECKPOINT_OUT_OF_ORDER';end if;
  if pg_catalog.jsonb_typeof(p_evidence)<>'object'
   or p_evidence->>'verified'<>'true'
   or p_evidence->>'source_work_id'<>a.source_original_work_id
   or p_evidence->>'source' not in ('GITHUB_PROVIDER_JOB_READBACK',
     'UNIVERSE_VERIFIED_SOURCE_READBACK','SIGNED_REAL_READINESS_REPORT')
   or pg_catalog.length(p_evidence::text)>3500 then
   raise exception 'REALITY_INFLIGHT_INDEPENDENT_EVIDENCE_REQUIRED';end if;
  if p_step=1 and p_evidence->>'source'<>'GITHUB_PROVIDER_JOB_READBACK'
    or p_step=2 and p_evidence->>'source'<>'UNIVERSE_VERIFIED_SOURCE_READBACK'
    or p_step=3 and p_evidence->>'source'<>'SIGNED_REAL_READINESS_REPORT'
   then raise exception 'REALITY_INFLIGHT_STAGE_EVIDENCE_MISMATCH';end if;
  select * into origin from public.universe_events where event_id=a.source_original_event_id;
  if origin.event_id is null then raise exception 'REALITY_INFLIGHT_ORIGIN_MISSING';end if;
  -- Shared ancestral ledger. Append only, no fabricated settled original state.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
   'reality:outcome:v2:'||origin.continuity_root_id::text||':'||origin.worldline_id::text,0));
  select count(*)::int into matching from public.universe_events e
   where e.continuity_root_id=origin.continuity_root_id
   and e.worldline_id=origin.worldline_id
   and not exists(select 1 from public.universe_events d where d.parent_event_id=e.event_id);
  if matching<>1 then raise exception 'REALITY_INFLIGHT_UNIVERSE_NONUNIQUE_TIP';end if;
  select * into prior from public.universe_events e
   where e.continuity_root_id=origin.continuity_root_id
   and e.worldline_id=origin.worldline_id
   and not exists(select 1 from public.universe_events d where d.parent_event_id=e.event_id);
  prev_hash:=a.last_checkpoint_hash;
  step_hash:=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
   public.reality_continuity_canonical_json_v1(jsonb_build_object(
    'run_id',p_run_id,'step',p_step,'lease_epoch',a.lease_epoch,
    'prior_hash',prev_hash,'evidence',p_evidence)),'UTF8'),'sha256'),'hex');
  next_time:=pg_catalog.clock_timestamp();
  iso:=to_char(next_time at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  payload:=jsonb_build_object('schema','reality-inflight-source-audit-checkpoint-v1',
    'audit_job_id','audit:provider-continuity:'||a.run_id::text,
    'source_original_work_id',a.source_original_work_id,'audit_run_id',a.run_id,
    'phase','AUDIT_CHECKPOINT','step',p_step,'lease_epoch',a.lease_epoch,
    'prior_checkpoint_hash',prev_hash,'checkpoint_hash',step_hash,
    'independent_evidence_source',p_evidence->>'source',
    'production_changed',false,'original_job_reexecuted',false);
  refs:=jsonb_build_array('github:actions:run:'||p_run_id::text);
  provenance:=jsonb_build_object('source','SIGNED_GITHUB_PROVIDER_AND_DURABLE_READONLY_AUDIT',
   'principal_id',a.owner_id::text,
   'source_original_event_id',a.source_original_event_id::text,
   'continuity_spine',jsonb_build_object('version','reality-continuity-spine-v2.1',
    'prior_lineage_hash',prior.lineage_hash,
    'source_event_id',a.source_original_event_id::text,
    'transformation_receipt_id',null));
  content_sha:=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
   public.reality_continuity_canonical_json_v1(payload),'UTF8'),'sha256'),'hex');
  basis:=jsonb_build_object('spine_version','reality-continuity-spine-v2.1',
   'continuity_root_id',origin.continuity_root_id::text,'worldline_id',origin.worldline_id::text,
   'parent_event_id',prior.event_id::text,'prior_lineage_hash',prior.lineage_hash,
   'stage','OBSERVATION','entity_id',origin.entity_id::text,'evidence_refs',refs,
   'transformation_receipt_id',null,'effective_time',iso,'assertion_time',iso,
   'epistemic_status','VERIFIED','payload',payload,'provenance',provenance);
  lineage_sha:=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
   public.reality_continuity_canonical_json_v1(basis),'UTF8'),'sha256'),'hex');
  insert into public.universe_events(event_id,event_kind,entity_type,entity_id,
   continuity_root_id,worldline_id,parent_event_id,effective_time,assertion_time,
   epistemic_status,payload,evidence_refs,provenance,content_hash,lineage_hash)
   values(pg_catalog.gen_random_uuid(),'OBSERVATION','reality_genuine_inflight_audit_checkpoint_v1',
    origin.entity_id,origin.continuity_root_id,origin.worldline_id,
    prior.event_id,next_time,next_time,'VERIFIED',payload,refs,provenance,content_sha,lineage_sha)
   returning * into ev;
  insert into reality_internal.genuine_inflight_readonly_checkpoints_v1(
    run_id,step,lease_epoch,prior_hash,checkpoint_hash,provider_evidence,universe_event_id)
   values(p_run_id,p_step,a.lease_epoch,prev_hash,step_hash,p_evidence,ev.event_id);
  update reality_internal.genuine_inflight_readonly_audits_v1
   set checkpoint_step=p_step,last_checkpoint_hash=step_hash,last_event_id=ev.event_id,
   state=case when p_step=3 then 'SETTLED' else 'ACTIVE' end,
   finished_at=case when p_step=3 then clock_timestamp() else null end
   where run_id=p_run_id returning * into a;
 end if;
 return jsonb_build_object('status',a.state,'run_id',a.run_id,
  'source_original_work_id',a.source_original_work_id,
  'lease_epoch',a.lease_epoch,'checkpoint_step',a.checkpoint_step,
  'last_checkpoint_hash',a.last_checkpoint_hash,
  'last_event_id',a.last_event_id,'emergency_mode',c.mode,
  'original_job_reexecuted',false,'production_changed',false);
end $fn$;

revoke all on function public.reality_inflight_audit_control_v1(text,bigint,int,int,jsonb)
 from public,anon,authenticated;
grant execute on function public.reality_inflight_audit_control_v1(text,bigint,int,int,jsonb) to service_role;
