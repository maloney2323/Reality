-- Independent, read-only provider and Universe scope for a genuine paused audit.
create or replace function public.reality_inflight_audit_source_readback_v1(p_run_id bigint)
returns jsonb language plpgsql set search_path to '' as $fn$
declare a reality_internal.genuine_inflight_readonly_audits_v1%rowtype;
 c reality_internal.genuine_original_continuations_v1%rowtype;
 e public.universe_events%rowtype; n int;
begin
 if current_user<>'service_role' then raise exception 'REALITY_INFLIGHT_READBACK_SERVICE_ONLY';end if;
 select * into a from reality_internal.genuine_inflight_readonly_audits_v1 where run_id=p_run_id;
 select * into c from reality_internal.genuine_original_continuations_v1
 where original_work_id=a.source_original_work_id;
 select * into e from public.universe_events
 where epistemic_status='VERIFIED' and event_kind='OUTCOME'
  and payload->>'original_work_id'=a.source_original_work_id
  and payload->>'original_job_completed'='true'
  and payload->>'constitutional_phase'='SETTLED';
 select count(*)::int into n from public.universe_events
 where epistemic_status='VERIFIED' and event_kind='OUTCOME'
  and payload->>'original_work_id'=a.source_original_work_id
  and payload->>'original_job_completed'='true'
  and payload->>'constitutional_phase'='SETTLED';
 if a.run_id is null or c.state<>'SETTLED_ISOLATED' or
  c.claim_run_id<1 or c.outcome_receipt->>'github_run_id'<>c.claim_run_id::text
  or c.outcome_receipt->>'independent_outcome_verified'<>'true'
  or n<>1 or e.event_id is null or e.content_hash !~
  '^[a-f0-9]{64}$' or
  e.content_hash<>pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    public.reality_continuity_canonical_json_v1(e.payload),'UTF8'),'sha256'),'hex')
 then raise exception 'REALITY_INFLIGHT_INDEPENDENT_ORIGINAL_NOT_VERIFIED';end if;
 return jsonb_build_object('source_original_work_id',a.source_original_work_id,
  'source_claim_run_id',c.claim_run_id,'source_universe_event_id',e.event_id,
  'source_universe_content_hash',e.content_hash,'source_universe_lineage_hash',e.lineage_hash,
  'current_lease_epoch',a.lease_epoch,
  'source_universe_completion_count',n,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_inflight_audit_source_readback_v1(bigint)
 from public,anon,authenticated;
grant execute on function public.reality_inflight_audit_source_readback_v1(bigint) to service_role;
