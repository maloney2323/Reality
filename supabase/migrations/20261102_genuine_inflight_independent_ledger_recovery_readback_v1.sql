create or replace function public.reality_inflight_independent_checkpoint_readback_v1(p_run_id bigint)
returns jsonb language plpgsql set search_path to '' as $fn$
declare
 a reality_internal.genuine_inflight_readonly_audits_v1%rowtype;
 r reality_internal.genuine_inflight_readonly_checkpoints_v1%rowtype;
 e public.universe_events%rowtype;
 origin public.universe_events%rowtype;
 prev text:=repeat('0',64);
 expected text;
 count_seen int:=0;
 event_ids jsonb:='[]'::jsonb;
begin
 if current_user<>'service_role' then
  raise exception 'REALITY_INFLIGHT_INDEPENDENT_READBACK_SERVICE_REQUIRED';end if;
 select * into a from reality_internal.genuine_inflight_readonly_audits_v1
 where run_id=p_run_id;
 if a.run_id is null then raise exception 'REALITY_INFLIGHT_INDEPENDENT_JOB_NOT_FOUND';end if;
 select * into origin from public.universe_events
 where event_id=a.source_original_event_id;
 if origin.event_id is null or origin.epistemic_status<>'VERIFIED' then
  raise exception 'REALITY_INFLIGHT_SOURCE_LOST';end if;
 for r in select * from reality_internal.genuine_inflight_readonly_checkpoints_v1
  where run_id=p_run_id order by step loop
   count_seen:=count_seen+1;
   if r.step<>count_seen or r.prior_hash<>prev or r.provider_evidence->>'verified'<>'true'
   then raise exception 'REALITY_INFLIGHT_CHECKPOINT_SEQUENCE_BROKEN';end if;
   expected:=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
     public.reality_continuity_canonical_json_v1(jsonb_build_object(
       'run_id',p_run_id,'step',r.step,'lease_epoch',r.lease_epoch,
       'prior_hash',r.prior_hash,'evidence',r.provider_evidence)),
       'UTF8'),'sha256'),'hex');
   if expected<>r.checkpoint_hash then
    raise exception 'REALITY_INFLIGHT_CHECKPOINT_HASH_MISMATCH';end if;
   select * into e from public.universe_events where event_id=r.universe_event_id;
   if e.event_id is null or e.epistemic_status<>'VERIFIED'
    or e.event_kind<>'OBSERVATION'
    or e.entity_type<>'reality_genuine_inflight_audit_checkpoint_v1'
    or e.continuity_root_id<>origin.continuity_root_id
    or e.worldline_id<>origin.worldline_id
    or e.payload->>'audit_run_id'<>p_run_id::text
    or e.payload->>'checkpoint_hash'<>r.checkpoint_hash
    or e.payload->>'prior_checkpoint_hash'<>r.prior_hash
    or e.payload->>'step'<>r.step::text
    or e.payload->>'original_job_reexecuted'<>'false'
    or e.payload->>'production_changed'<>'false'
    or e.provenance->'continuity_spine'->>'prior_lineage_hash' is distinct from
      (select x.lineage_hash from public.universe_events x where x.event_id=e.parent_event_id)
    or e.content_hash<>pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
      public.reality_continuity_canonical_json_v1(e.payload),'UTF8'),'sha256'),'hex')
    then raise exception 'REALITY_INFLIGHT_UNIVERSE_EVENT_READBACK_INVALID';end if;
   prev:=r.checkpoint_hash;
   event_ids:=event_ids||jsonb_build_array(e.event_id);
 end loop;
 if count_seen<>a.checkpoint_step or prev<>a.last_checkpoint_hash
  or (count_seen>0 and a.last_event_id::text<>event_ids->>(count_seen-1)) then
   raise exception 'REALITY_INFLIGHT_DURABLE_STATE_NOT_RECONCILED';end if;
 return jsonb_build_object(
  'status',a.state,'source_original_work_id',a.source_original_work_id,
  'run_id',a.run_id,'checkpoint_count',count_seen,
  'last_checkpoint_hash',a.last_checkpoint_hash,'checkpoint_event_ids',event_ids,
  'lease_epoch',a.lease_epoch,
  'original_job_reexecuted',false,
  'production_changed',false,'production_release_authorized',false);
end $fn$;
revoke all on function public.reality_inflight_independent_checkpoint_readback_v1(bigint)
 from public,anon,authenticated;
grant execute on function public.reality_inflight_independent_checkpoint_readback_v1(bigint) to service_role;
