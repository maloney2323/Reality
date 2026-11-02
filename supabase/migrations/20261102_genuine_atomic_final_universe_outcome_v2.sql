-- Isolated Reality: verified, owner-approved, provider-settled work MUST have a
-- durable Universe OUTCOME in the same transaction as its settlement.
-- No model or client may authorize or invoke these service-role-only RPCs.
create or replace function public.reality_append_verified_genuine_original_outcome_v2(p_original_work_id text)
returns jsonb language plpgsql set search_path to '' as $fn$
declare
 c reality_internal.genuine_original_continuations_v1%rowtype;
 q reality_internal.genuine_capability_queue_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
 origin public.universe_events%rowtype;
 last_event public.universe_events%rowtype;
 existing public.universe_events%rowtype;
 created public.universe_events%rowtype;
 payload jsonb; provenance jsonb; refs jsonb; basis jsonb;
 recorded_at timestamptz; iso text; content_sha text; lineage_sha text;
 matches integer; tips integer;
begin
 if current_user <> 'service_role' then
  raise exception 'REALITY_OUTCOME_SERVICE_ROLE_REQUIRED';
 end if;
 if p_original_work_id !~ '^work:[a-f0-9]{32}$' then
  raise exception 'REALITY_OUTCOME_EXACT_WORK_ID_REQUIRED';
 end if;
 select * into c from reality_internal.genuine_original_continuations_v1
 where original_work_id=p_original_work_id;
 if not found then raise exception 'REALITY_OUTCOME_ORIGINAL_WORK_NOT_FOUND';end if;
 select * into q from reality_internal.genuine_capability_queue_v1 where trigger_id=c.trigger_id;
 select * into a from reality_internal.genuine_preview_install_approvals_v1 where trigger_id=c.trigger_id;
 select * into origin from public.universe_events where event_id=q.original_work_event_id;
 if c.state<>'SETTLED_ISOLATED' or q.phase<>'SETTLED_ISOLATED'
   or q.original_work_id<>c.original_work_id
   or c.owner_id is distinct from q.owner_id
   or c.owner_id is distinct from a.owner_id
   or a.approval_id is null or c.approval_id is distinct from a.approval_id
   or a.approval_receipt->>'approval_origin'<>'AUTHENTICATED_OWNER_EXPLICIT_ACTION'
   or a.consumed_at is null or a.target_environment<>'ISOLATED_PREVIEW'
   or a.probation_status<>'ACTIVE'
   or c.installed_commit_sha is distinct from a.installed_commit_sha
   or c.artifact_sha256 is distinct from a.artifact_hash
   or c.claim_run_id is null or c.claim_run_id<1
   or c.outcome_receipt->>'github_run_id'<>c.claim_run_id::text
   or c.outcome_receipt->>'independent_outcome_verified'<>'true'
   or c.outcome_receipt->>'original_job_completed'<>'true'
   or c.outcome_receipt->>'production_changed'<>'false'
   or c.outcome_receipt->>'installed_commit_sha'<>c.installed_commit_sha
   or c.outcome_receipt->>'artifact_sha256'<>c.artifact_sha256
   or c.outcome_receipt->>'provider_outcome_digest' !~ '^[a-f0-9]{64}$'
   or a.settlement_receipt is null
   or a.settlement_receipt->>'github_run_id'<>c.claim_run_id::text
   or a.settlement_receipt->>'independent_outcome_verified'<>'true'
   or origin.event_id is null or origin.epistemic_status<>'VERIFIED'
   or origin.payload->>'original_work_id'<>p_original_work_id
   or origin.payload->>'original_job_completed'<>'false'
   or origin.payload->>'owner_id'<>q.owner_id::text
 then
  raise exception 'REALITY_OUTCOME_OWNER_APPROVED_PROVIDER_SETTLEMENT_REQUIRED';
 end if;
 -- Serialize all appenders on the same lineage, not merely on a work ID.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality:outcome:v2:'||origin.continuity_root_id::text||':'||origin.worldline_id::text,0));
 select count(*)::int into matches from public.universe_events e
 where e.epistemic_status='VERIFIED'
 and e.payload->>'original_work_id'=p_original_work_id
 and e.payload->>'original_job_completed'='true'
 and e.payload->>'constitutional_phase'='SETTLED';
 if matches>1 then raise exception 'REALITY_OUTCOME_MULTIPLE_VERIFIED_COMPLETIONS';end if;
 if matches=1 then
  select * into existing from public.universe_events e
  where e.epistemic_status='VERIFIED'
  and e.payload->>'original_work_id'=p_original_work_id
  and e.payload->>'original_job_completed'='true'
  and e.payload->>'constitutional_phase'='SETTLED';
  if existing.continuity_root_id<>origin.continuity_root_id
   or existing.worldline_id<>origin.worldline_id
   or existing.event_kind<>'OUTCOME'
   or existing.content_hash<>pg_catalog.encode(extensions.digest(
    pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(existing.payload),'UTF8'),'sha256'),'hex')
  then raise exception 'REALITY_OUTCOME_EXISTING_VERIFIED_EVENT_INVALID';end if;
  return jsonb_build_object('status','VERIFIED_UNIVERSE_SETTLED','original_work_id',
   p_original_work_id,'verified_event_id',existing.event_id,
   'event_content_hash',existing.content_hash,'event_lineage_hash',existing.lineage_hash,
   'idempotent',true,'production_changed',false);
 end if;
 select count(*)::int into tips from public.universe_events e
 where e.continuity_root_id=origin.continuity_root_id and e.worldline_id=origin.worldline_id
 and not exists(select 1 from public.universe_events child where child.parent_event_id=e.event_id);
 if tips<>1 then raise exception 'REALITY_OUTCOME_NON_UNIQUE_LINEAGE_TIP';end if;
 select * into last_event from public.universe_events e
 where e.continuity_root_id=origin.continuity_root_id and e.worldline_id=origin.worldline_id
 and not exists(select 1 from public.universe_events child where child.parent_event_id=e.event_id);
 if last_event.lineage_hash !~ '^[a-f0-9]{64}$' then
  raise exception 'REALITY_OUTCOME_PRIOR_LINEAGE_INVALID';
 end if;
 recorded_at:=clock_timestamp();
 iso:=to_char(recorded_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 payload:=jsonb_build_object(
  'schema','reality-verified-genuine-original-outcome-v2',
  'original_work_id',p_original_work_id,
  'owner_id',q.owner_id,
  'original_job_completed',true,'constitutional_phase','SETTLED',
  'independent_outcome_verified',true,
  'provider_run_id',c.claim_run_id,
  'provider_outcome_digest',c.outcome_receipt->>'provider_outcome_digest',
  'owner_approval_id',c.approval_id,
  'installed_commit_sha',c.installed_commit_sha,
  'artifact_sha256',c.artifact_sha256,
  'production_changed',false);
 refs:=jsonb_build_array('github:actions:run:'||c.claim_run_id::text);
 provenance:=jsonb_build_object(
  'source','DURABLE_SIGNED_PROVIDER_SETTLEMENT_AND_OWNER_APPROVAL',
  'principal_id',q.owner_id::text,
  'conversation_id',q.conversation_id::text,
  'source_original_event_id',origin.event_id::text,
  'continuity_spine',jsonb_build_object(
   'version','reality-continuity-spine-v2.1',
   'prior_lineage_hash',last_event.lineage_hash,
   'source_event_id',origin.event_id::text,
   'transformation_receipt_id',null));
 content_sha:=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
  public.reality_continuity_canonical_json_v1(payload),'UTF8'),'sha256'),'hex');
 basis:=jsonb_build_object(
  'spine_version','reality-continuity-spine-v2.1',
  'continuity_root_id',origin.continuity_root_id::text,
  'worldline_id',origin.worldline_id::text,
  'parent_event_id',last_event.event_id::text,
  'prior_lineage_hash',last_event.lineage_hash,
  'stage','OUTCOME','entity_id',origin.entity_id::text,
  'evidence_refs',refs,'transformation_receipt_id',null,
  'effective_time',iso,'assertion_time',iso,
  'epistemic_status','VERIFIED','payload',payload,'provenance',provenance);
 lineage_sha:=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
  public.reality_continuity_canonical_json_v1(basis),'UTF8'),'sha256'),'hex');
 insert into public.universe_events(event_id,event_kind,entity_type,entity_id,
  continuity_root_id,worldline_id,parent_event_id,effective_time,assertion_time,
  epistemic_status,payload,evidence_refs,provenance,content_hash,lineage_hash)
 values(gen_random_uuid(),'OUTCOME','reality_verified_original_work_settlement_v2',origin.entity_id,
  origin.continuity_root_id,origin.worldline_id,last_event.event_id,recorded_at,recorded_at,
  'VERIFIED',payload,refs,provenance,content_sha,lineage_sha)
 returning * into created;
 if created.event_id is null or created.content_hash<>content_sha
 or created.lineage_hash<>lineage_sha or created.parent_event_id<>last_event.event_id
 then raise exception 'REALITY_OUTCOME_ATOMIC_WRITE_READBACK_FAILED';end if;
 return jsonb_build_object('status','VERIFIED_UNIVERSE_SETTLED','original_work_id',
  p_original_work_id,'verified_event_id',created.event_id,
  'event_content_hash',content_sha,'event_lineage_hash',lineage_sha,
  'idempotent',false,'production_changed',false);
end $fn$;

revoke all on function public.reality_append_verified_genuine_original_outcome_v2(text) from public,anon,authenticated;
grant execute on function public.reality_append_verified_genuine_original_outcome_v2(text) to service_role;

create or replace function public.reality_reconcile_all_genuine_original_outcomes_v2()
returns jsonb language plpgsql set search_path to '' as $fn$
declare r record; ledger jsonb; changed integer:=0; reused integer:=0;
begin
 if current_user<>'service_role' then raise exception 'REALITY_OUTCOME_AUTO_RECONCILE_SERVICE_ROLE_REQUIRED';end if;
 for r in select original_work_id from reality_internal.genuine_original_continuations_v1
  where state='SETTLED_ISOLATED' order by original_work_id
 loop
  ledger:=public.reality_append_verified_genuine_original_outcome_v2(r.original_work_id);
  if ledger->>'status'<>'VERIFIED_UNIVERSE_SETTLED' then
    raise exception 'REALITY_OUTCOME_AUTO_RECONCILE_REFUSED';
  end if;
  if ledger->>'idempotent'='true' then reused:=reused+1;
  else changed:=changed+1;end if;
 end loop;
 return jsonb_build_object('status','ALL_SETTLED_OUTCOMES_VERIFIED',
  'newly_reconciled',changed,'already_verified',reused,
  'production_changed',false,'production_release_authorized',false);
end $fn$;

revoke all on function public.reality_reconcile_all_genuine_original_outcomes_v2() from public,anon,authenticated;
grant execute on function public.reality_reconcile_all_genuine_original_outcomes_v2() to service_role;
