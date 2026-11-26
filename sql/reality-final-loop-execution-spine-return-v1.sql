-- Evidence-only return to the existing canonical Spine. No additional
-- scheduler, ledger, model invocation, installation or recovery authority.
-- Deliberately requires a current signed run and exact CAS snapshot.
CREATE OR REPLACE FUNCTION public.reality_return_final_loop_invocation_observations_v1(
 p_shift_id uuid,p_original_work_id text,p_worker_run_id uuid,
 p_expected_head_sha256 text,p_expected_revision bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE s record; p jsonb; g jsonb; o jsonb; e jsonb; tail record;
 root uuid; event uuid; receipt uuid; basis jsonb; payload jsonb; refs jsonb;
 provenance jsonb; stamp timestamptz; iso text; content_hash text; lineage text;
 checkpoint jsonb; checkpoint_hash text; observation_hash text;
 sub_count integer; rebound integer; old_events jsonb; old_count integer;
 observed_count integer; after_p jsonb; after_g jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FINAL_LOOP_SPINE_RETURN_SERVICE_ONLY';END IF;
 IF p_shift_id IS NULL OR p_worker_run_id IS NULL
  OR coalesce(p_original_work_id,'') !~ '^work:[a-f0-9]{32}$'
  OR coalesce(p_expected_head_sha256,'') !~ '^sha256:[a-f0-9]{64}$'
  OR p_expected_revision IS NULL OR p_expected_revision<1
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_EXACT_SCOPE_REQUIRED');END IF;
 SELECT sh.owner_id,sh.plan_fingerprint INTO s
 FROM reality_internal.governed_employee_shifts_v1 sh
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=sh.shift_id AND w.owner_id=sh.owner_id AND w.plan_fingerprint=sh.plan_fingerprint
 WHERE sh.shift_id=p_shift_id AND sh.authorized_at IS NOT NULL AND sh.closed_at IS NULL
  AND sh.planned_end_at='infinity'::timestamptz AND w.state='ACTIVE'
  AND sh.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK','QUEUED')
 FOR UPDATE OF sh;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_SHIFT_NOT_CURRENT');END IF;
 -- The historical runs are evidence, not new authority. The writer itself
 -- requires an actual current signed event-bound worker.
 IF NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
  JOIN reality_internal.governed_signed_worker_release_wakes_v1 w ON w.worker_run_id=r.run_id
   AND w.owner_id=s.owner_id AND w.shift_id=p_shift_id AND w.operating_lane='NORMAL_SIGNED_SHIFT'
  JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=w.release_claim_id
   AND a.owner_id=w.owner_id AND a.shift_id=w.shift_id AND a.release_sha=w.running_release_sha
   AND a.provider_alias_observed_at IS NOT NULL
  JOIN reality_internal.final_loop_resume_events_v1 ev ON ev.governed_wake_worker_run_id=r.run_id
   AND ev.shift_id=p_shift_id AND ev.owner_id=s.owner_id AND ev.original_work_id=p_original_work_id
  WHERE r.run_id=p_worker_run_id AND r.status='STARTED' AND r.finished_at IS NULL
   AND r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes'
   AND ev.continuity_head_sha256=p_expected_head_sha256 AND ev.continuity_revision=p_expected_revision)
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_CURRENT_SIGNED_EVENT_REQUIRED');END IF;
 p:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 IF p->>'status' IS DISTINCT FROM 'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'
  OR p->>'owner_id' IS DISTINCT FROM s.owner_id::text
  OR p->>'continuity_head_sha256' IS DISTINCT FROM p_expected_head_sha256
  OR (p->>'revision')::bigint IS DISTINCT FROM p_expected_revision
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_CAUSAL_HEAD_DRIFT_NO_REPLAY');END IF;
 root:=(p->>'continuity_root_id')::uuid;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality:canonical-continuity-return:'||root::text,0));
 g:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
 IF g->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
  OR g->>'continuity_head_sha256' IS DISTINCT FROM p_expected_head_sha256
  OR (g->>'revision')::bigint IS DISTINCT FROM p_expected_revision
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_SHARED_PROOF_UNVERIFIED');END IF;
 SELECT x.value INTO o FROM pg_catalog.jsonb_array_elements(g->'obligations') x
 WHERE x.value->>'original_work_id'=p_original_work_id AND x.value->>'continuity_identity_verified'='true'
  AND x.value->>'qualifier_digest_verified'='true' AND x.value->>'source_proof_verified'='true'
  AND x.value->>'independent_original_outcome_verified'='false';
 e:=o->'execution_spine_readback';
 IF e->>'status' IS DISTINCT FROM 'SIGNED_INVOCATION_OBSERVATIONS_READY_FOR_CANONICAL_RETURN'
  OR e->>'provider_outcome_verified' IS DISTINCT FROM 'false'
  OR e->>'replay_authorized' IS DISTINCT FROM 'false'
  OR pg_catalog.jsonb_array_length(e->'observations') NOT BETWEEN 1 AND 63
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_OBSERVATIONS_NOT_READY');END IF;
 -- Append each distinct set of already durable observations only once.
 observation_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  (e->'observations')::text,'UTF8')),'hex');
 IF EXISTS(SELECT 1 FROM public.universe_events u WHERE u.continuity_root_id=root
  AND u.entity_type='reality_final_loop_invocation_observation_v1'
  AND u.payload->>'observation_sha256'=observation_hash
  AND u.payload->>'original_work_id'=p_original_work_id)
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_OBSERVATIONS_ALREADY_RETURNED_NO_REPLAY');END IF;
 -- Do not strand unrelated obligations, queued/unclaimed workers, or
 -- unresolved older signal kinds. Those require their own reconciliation.
 -- No events are deleted or rearmed by this evidence-only return.
 IF EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 v
  WHERE v.shift_id=p_shift_id AND v.state='SHADOW_PENDING'
   AND (v.original_work_id<>p_original_work_id
    OR v.governed_wake_worker_run_id IS NULL
    OR v.governed_wake_worker_run_id=p_worker_run_id
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(e->'observations') x
      WHERE x.value->>'event_id'=v.event_id::text)))
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_PENDING_EVENTS_REQUIRE_CAUSAL_RECONCILIATION',
  'canonical_return_committed',false,'replay_authorized',false);END IF;
 SELECT u.event_id,u.worldline_id,u.lineage_hash INTO tail FROM public.universe_events u
  WHERE u.continuity_root_id=root AND u.payload->>'owner_id'=s.owner_id::text
   AND u.payload->>'shift_id'=p_shift_id::text ORDER BY u.assertion_time DESC,u.event_id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR 'sha256:'||tail.lineage_hash IS DISTINCT FROM p_expected_head_sha256
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_CAUSAL_HEAD_DRIFT_NO_REPLAY');END IF;
 -- All suspended subscriptions must be current and individually scoped.
 IF EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 sub
  WHERE sub.shift_id=p_shift_id AND (sub.owner_id<>s.owner_id
    OR sub.original_work_id<>p_original_work_id
    OR sub.continuity_head_sha256<>p_expected_head_sha256
    OR sub.continuity_revision<>p_expected_revision))
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_SUBSCRIPTION_RECONCILIATION_REQUIRED');END IF;
 SELECT count(*) INTO sub_count FROM reality_internal.final_loop_resume_conditions_v1 WHERE shift_id=p_shift_id;
 SELECT count(*),coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(v) ORDER BY v.event_id),'[]'::jsonb)
 INTO old_count,old_events FROM reality_internal.final_loop_resume_events_v1 v
 WHERE v.shift_id=p_shift_id AND v.state='SHADOW_PENDING';
 stamp:=pg_catalog.clock_timestamp();iso:=pg_catalog.to_char(stamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 event:=pg_catalog.gen_random_uuid();
 payload:=pg_catalog.jsonb_build_object('schema','reality-final-loop-invocation-observation-return-v1',
  'owner_id',s.owner_id,'shift_id',p_shift_id,'original_work_id',p_original_work_id,
  'source_ref',o->>'source_ref','observation_sha256',observation_hash,'invocation_observations',e->'observations',
  'prior_resume_events',old_events,'provider_outcome_verified',false,'original_job_completed',false,
  'execution_authorized',false,'replay_authorized',false,'production_changed',false);
 refs:=pg_catalog.jsonb_build_array(observation_hash,o->>'qualifier_receipt_sha256');
 provenance:=pg_catalog.jsonb_build_object('source','SIGNED_CANONICAL_INVOCATION_READBACK',
  'principal_id',s.owner_id,'worker_run_id',p_worker_run_id,'continuity_spine',pg_catalog.jsonb_build_object(
   'version','reality-continuity-spine-v2.1','source_event_id',tail.event_id::text,
   'prior_lineage_hash',tail.lineage_hash,'transformation_receipt_id',NULL));
 content_hash:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  public.reality_continuity_canonical_json_v1(payload),'UTF8')),'hex');
 basis:=pg_catalog.jsonb_build_object('spine_version','reality-continuity-spine-v2.1',
  'continuity_root_id',root::text,'worldline_id',tail.worldline_id::text,
  'parent_event_id',tail.event_id,'prior_lineage_hash',tail.lineage_hash,
  'stage','OBSERVATION','entity_id',event::text,'evidence_refs',refs,
  'transformation_receipt_id',NULL,'effective_time',iso,'assertion_time',iso,
  'epistemic_status','OBSERVED','payload',payload,'provenance',provenance);
 lineage:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  public.reality_continuity_canonical_json_v1(basis),'UTF8')),'hex');
 checkpoint:=pg_catalog.jsonb_build_object('shift_id',p_shift_id,'owner_id',s.owner_id,
  'original_work_id',p_original_work_id,'source_ref',o->>'source_ref','plan_fingerprint',s.plan_fingerprint,
  'frozen_shift_scope_sha256',p->>'frozen_shift_scope_sha256','continuity_root_id',root,
  'continuity_head_sha256',p_expected_head_sha256,'expected_revision',p_expected_revision,
  'worker_run_id',p_worker_run_id,'decision','SUSPEND','reason_code','PROVIDER_EFFECT_UNCERTAIN');
 checkpoint_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(checkpoint::text,'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_transition_receipts_v1
  (shift_id,owner_id,original_work_id,source_ref,plan_fingerprint,frozen_shift_scope_sha256,
  continuity_root_id,continuity_head_sha256,expected_revision,worker_run_id,decision,reason_code,receipt_sha256)
 VALUES(p_shift_id,s.owner_id,p_original_work_id,o->>'source_ref',s.plan_fingerprint,p->>'frozen_shift_scope_sha256',
  root,p_expected_head_sha256,p_expected_revision,p_worker_run_id,'SUSPEND','PROVIDER_EFFECT_UNCERTAIN',checkpoint_hash)
 RETURNING receipt_id INTO receipt;
 INSERT INTO public.universe_events(event_id,event_kind,entity_type,entity_id,continuity_root_id,worldline_id,parent_event_id,
  effective_time,assertion_time,epistemic_status,payload,evidence_refs,provenance,content_hash,lineage_hash)
 VALUES(event,'OBSERVATION','reality_final_loop_invocation_observation_v1',event,root,tail.worldline_id,tail.event_id,
  stamp,stamp,'OBSERVED',payload,refs,provenance,content_hash,lineage);
 UPDATE reality_internal.final_loop_resume_events_v1 v SET state='SHADOW_OBSERVED'
 WHERE v.shift_id=p_shift_id AND v.state='SHADOW_PENDING'
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(e->'observations') x WHERE x.value->>'event_id'=v.event_id::text);
 GET DIAGNOSTICS observed_count=ROW_COUNT;
 IF observed_count<>old_count THEN RAISE EXCEPTION 'FINAL_LOOP_SPINE_RETURN_EVENT_CAS_FAILED';END IF;
 UPDATE reality_internal.final_loop_resume_conditions_v1 SET continuity_head_sha256='sha256:'||lineage,
  continuity_revision=p_expected_revision+1,state='SUSPENDED',updated_at=stamp
 WHERE shift_id=p_shift_id AND owner_id=s.owner_id AND continuity_head_sha256=p_expected_head_sha256
  AND continuity_revision=p_expected_revision;
 GET DIAGNOSTICS rebound=ROW_COUNT;
 IF rebound<>sub_count THEN RAISE EXCEPTION 'FINAL_LOOP_SPINE_RETURN_SUBSCRIPTION_CAS_FAILED';END IF;
 after_p:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 after_g:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
 IF after_p->>'continuity_head_sha256' IS DISTINCT FROM 'sha256:'||lineage
  OR (after_p->>'revision')::bigint IS DISTINCT FROM p_expected_revision+1
  OR after_g->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
  OR after_g->>'continuity_head_sha256' IS DISTINCT FROM 'sha256:'||lineage
 THEN RAISE EXCEPTION 'FINAL_LOOP_SPINE_RETURN_POSTWRITE_READBACK_FAILED';END IF;
 RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_OBSERVATIONS_RETURNED_ORIGINAL_OPEN',
  'canonical_return_committed',true,'event_id',event,'checkpoint_receipt_id',receipt,
  'observation_sha256',observation_hash,'continuity_head_sha256','sha256:'||lineage,
  'revision',p_expected_revision+1,'rebound_subscriptions',rebound,'observed_events',observed_count,
  'execution_authorized',false,'replay_authorized',false,'original_job_completed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_return_final_loop_invocation_observations_v1(uuid,text,uuid,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_return_final_loop_invocation_observations_v1(uuid,text,uuid,text,bigint) TO service_role;
