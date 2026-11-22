-- A missing verdict is not a rejection. A different signed reviewer may
-- re-observe the existing frozen source BEFORE acquiring another verdict lease.
-- No retry counter is reset, no original admission or install authority created.
create or replace function public.reality_claim_signed_continuity_review_probe_v1(
 p_shift_id uuid,p_worker_run_id uuid)
returns jsonb language plpgsql set search_path='' as $f$
declare i record;q reality_internal.genuine_capability_queue_v1%rowtype;
 probe uuid; stamp jsonb;
begin
 if current_user<>'service_role' or p_shift_id is null or p_worker_run_id is null
 then raise exception 'CONTINUITY_SOURCE_PROBE_SIGNED_WORKER_REQUIRED';end if;
 select inc.* into i
 from reality_internal.owner_shift_continuity_incidents_v1 inc
 join reality_internal.governed_employee_shifts_v1 s
   on s.shift_id=inc.shift_id and s.owner_id=inc.owner_id
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
   on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 r on r.run_id=p_worker_run_id
 join reality_internal.genuine_capability_queue_v1 g
   on g.owner_id=inc.owner_id and g.trigger_id::text=inc.source_evidence->>'trigger_id'
   and g.claim_id=inc.source_claim_id and g.original_work_id=inc.source_evidence->>'original_work_id'
   and g.qualified_candidate->>'candidate_sha256'=inc.source_evidence->>'candidate_sha256'
   and g.qualification_receipt->>'target_review_failure_receipt_sha256'=inc.source_evidence->>'failure_receipt_sha256'
 where inc.shift_id=p_shift_id and inc.kind='SIGNED_CHAT_RECOVERY_REVIEW_STALLED'
 and inc.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'
 and inc.investigated_at<r.started_at and inc.assigned_function_id<>inc.reviewer_function_id
 and inc.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
 and inc.evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(inc.source_evidence::text,'sha256'),'hex')
 and inc.source_evidence->>'investigation_only'='true'
 and inc.repair_executed=false and inc.installation_authorized=false and inc.production_changed=false
 and inc.proposed_upgrade~'^\[GOVERNED_ACTION:(INVESTIGATE_EXISTING_HANDOFF|RUN_INDEPENDENT_FROZEN_TEST|VERIFY_INSTALLED_EXECUTOR|RECONCILE_PROVIDER_EFFECT_WITHOUT_REPLAY)\]\[BLOCKER_CLASS:(CONTINUITY_HANDOFF_DEFECT|CAPABILITY_DEFECT|PROVIDER_TRANSIENT|PROVIDER_EFFECT_UNKNOWN|UNKNOWN|MISSING_SOURCE_EVIDENCE|MISSING_EXECUTOR_ADAPTER)\]'
 and s.authorized_at is not null and s.closed_at is null
 and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
 and s.planned_start_at<=clock_timestamp() and s.planned_end_at>clock_timestamp()
 and pulse.last_worker_status='WAKE_RECEIVED'
 and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
 and r.status='STARTED' and r.started_at>clock_timestamp()-interval '3 minutes'
 and g.phase='SIGNED_CHAT_RECOVERY_TARGET_REVIEW_UNVERIFIED'
 and g.quarantine_receipt_sha256 is null
 and g.qualification_receipt->>'target_review_retry_count'='2'
 and g.qualification_receipt->>'target_review_receipt_sha256' is null
 and g.qualification_receipt->'continuity_source_probe' is null
 order by inc.investigated_at,inc.incident_id limit 1 for update of inc skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_INDEPENDENT_CONTINUITY_SOURCE_PROBE_READY','installation_authorized',false,
  'original_job_completed',false,'production_changed',false,'new_shift_started',false);end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where owner_id=i.owner_id and trigger_id::text=i.source_evidence->>'trigger_id'
 and claim_id=i.source_claim_id and original_work_id=i.source_evidence->>'original_work_id'
 and phase='SIGNED_CHAT_RECOVERY_TARGET_REVIEW_UNVERIFIED'
 and quarantine_receipt_sha256 is null
 and qualification_receipt->>'target_review_retry_count'='2'
 and qualification_receipt->>'target_review_receipt_sha256' is null
 and qualification_receipt->'continuity_source_probe' is null
 and qualified_candidate->>'candidate_sha256'=i.source_evidence->>'candidate_sha256'
 and qualified_candidate->>'candidate_sha256'='sha256:'||pg_catalog.encode(extensions.digest((qualified_candidate-'candidate_sha256')::text,'sha256'),'hex')
 and recovery_spec_sha256='sha256:'||pg_catalog.encode(extensions.digest(recovery_spec::text,'sha256'),'hex')
 and qualification_receipt->>'target_review_failure_receipt_sha256'=i.source_evidence->>'failure_receipt_sha256'
 and qualification_receipt->>'target_review_failure_receipt_sha256'='sha256:'||pg_catalog.encode(extensions.digest((qualification_receipt->'target_review_last_failure')::text,'sha256'),'hex')
 and exists(select 1 from reality_internal.chat_work_handoffs_v1 w
  join public.reality_chat_messages m on m.id=w.message_id and m.user_id=w.owner_id
   and m.conversation_id=w.conversation_id and m.request_id=w.request_id and m.role='user'
  where w.message_id=source_message_id and w.owner_id=i.owner_id
   and w.message_sha256=source_sha256
   and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(m.content,'UTF8')),'hex')
   and w.development->>'original_work_id'=original_work_id
   and w.development->>'phase'='CI_VERIFIED'
   and w.development->>'installation_authorized'='false'
   and w.development->>'original_job_completed'='false'
   and w.development->>'production_changed'='false'
   and w.development->'evidence'->>'goal_gap_receipt_sha256'=blocker_receipt_sha256)
 for update;
 if not found then raise exception 'CONTINUITY_SOURCE_PROBE_ORIGINAL_OR_EVIDENCE_DRIFT';end if;
 probe:=pg_catalog.gen_random_uuid();
 stamp:=pg_catalog.jsonb_build_object(
  'schema','reality-independent-continuity-source-probe-v1','probe_id',probe,
  'incident_id',i.incident_id,'shift_id',i.shift_id,'worker_run_id',p_worker_run_id,
  'investigation_receipt_sha256',i.investigation_receipt_sha256,
  'failure_receipt_sha256',i.source_evidence->>'failure_receipt_sha256',
  'candidate_sha256',q.qualified_candidate->>'candidate_sha256','status','PROBE_CLAIMED',
  'claimed_at',clock_timestamp(),'installation_authorized',false,'original_job_completed',false,'production_changed',false);
 update reality_internal.genuine_capability_queue_v1
 set qualification_receipt=qualification_receipt||pg_catalog.jsonb_build_object('continuity_source_probe',stamp),
 updated_at=clock_timestamp() where trigger_id=q.trigger_id;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_CONTINUITY_SOURCE_PROBE_CLAIMED','probe_id',probe,
  'incident_id',i.incident_id,'shift_id',i.shift_id,'worker_run_id',p_worker_run_id,
  'trigger_id',q.trigger_id,'owner_id',q.owner_id,'original_work_id',q.original_work_id,
  'source_message_id',q.source_message_id,'source_ref',q.source_ref,
  'candidate_sha256',q.qualified_candidate->>'candidate_sha256',
  'base_sha',q.qualified_candidate->>'base_sha','target_path',q.qualified_candidate->>'target_path',
  'source_entrypoints',q.recovery_spec->'source_relevance_roots',
  'investigation_receipt_sha256',i.investigation_receipt_sha256,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false,'new_shift_started',false);
end $f$;

create or replace function public.reality_record_signed_continuity_review_probe_v1(
 p_trigger_id uuid,p_probe_id uuid,p_worker_run_id uuid,p_tree_sha text,p_roots jsonb,
 p_target_in_graph boolean,p_failure_code text)
returns jsonb language plpgsql set search_path='' as $f$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 stamp jsonb; proof jsonb; result jsonb; v_review uuid;
begin
 if current_user<>'service_role' or p_trigger_id is null or p_probe_id is null or p_worker_run_id is null
 then raise exception 'CONTINUITY_SOURCE_PROBE_SIGNED_RESULT_REQUIRED';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger_id and phase='SIGNED_CHAT_RECOVERY_TARGET_REVIEW_UNVERIFIED'
 and quarantine_receipt_sha256 is null and qualification_receipt->>'target_review_receipt_sha256' is null
 and qualification_receipt->>'target_review_retry_count'='2'
 and qualification_receipt->'continuity_source_probe'->>'probe_id'=p_probe_id::text
 and qualification_receipt->'continuity_source_probe'->>'worker_run_id'=p_worker_run_id::text
 and qualification_receipt->'continuity_source_probe'->>'status'='PROBE_CLAIMED'
 and qualification_receipt->'continuity_source_probe'->>'candidate_sha256'=qualified_candidate->>'candidate_sha256'
 and qualification_receipt->'continuity_source_probe'->>'failure_receipt_sha256'=qualification_receipt->>'target_review_failure_receipt_sha256'
 and qualified_candidate->>'candidate_sha256'='sha256:'||pg_catalog.encode(extensions.digest((qualified_candidate-'candidate_sha256')::text,'sha256'),'hex')
 and exists(select 1 from reality_internal.signed_worker_actual_runs_v1 r
 where r.run_id=p_worker_run_id and r.status='STARTED' and r.started_at>clock_timestamp()-interval '3 minutes')
 for update;
 if not found then raise exception 'CONTINUITY_SOURCE_PROBE_STALE_OR_CONSUMED';end if;
 stamp:=q.qualification_receipt->'continuity_source_probe';
 if p_failure_code is not null then
  if p_failure_code !~ '^[A-Z][A-Z0-9_]{5,95}$' or p_tree_sha is not null or p_roots is not null or p_target_in_graph is not null
  then raise exception 'CONTINUITY_SOURCE_PROBE_FAILURE_CONFLICT';end if;
  proof:=stamp||pg_catalog.jsonb_build_object('status','SOURCE_PROBE_BLOCKED',
   'failure_code',p_failure_code,'observed_at',clock_timestamp(),
   'root_cause_verified',false,'next_action','QUALIFY_EXACT_OBSERVED_PROVIDER_OR_CAPABILITY_FAILURE');
  update reality_internal.genuine_capability_queue_v1
   set qualification_receipt=qualification_receipt||pg_catalog.jsonb_build_object('continuity_source_probe',proof,
    'continuity_source_probe_sha256','sha256:'||pg_catalog.encode(extensions.digest(proof::text,'sha256'),'hex')),
    updated_at=clock_timestamp() where trigger_id=q.trigger_id;
  return pg_catalog.jsonb_build_object('status','SIGNED_CONTINUITY_SOURCE_PROBE_BLOCKED',
    'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,'failure_code',p_failure_code,
    'installation_authorized',false,'original_job_completed',false,'production_changed',false,'new_shift_started',false);
 end if;
 if p_tree_sha is null or p_tree_sha !~ '^[a-f0-9]{40}$'
 or p_target_in_graph is null or pg_catalog.jsonb_typeof(p_roots) is distinct from 'array'
 then raise exception 'CONTINUITY_SOURCE_PROBE_PINNED_PROOF_REQUIRED';end if;
 -- The alternate preflight acquired actual source proof. Only now fence the
 -- absent verdict and consume the EXISTING authoritative independent recorder.
 v_review:=pg_catalog.gen_random_uuid();
 proof:=stamp||pg_catalog.jsonb_build_object('status','PINNED_SOURCE_PROOF_OBSERVED',
  'tree_sha',p_tree_sha,'root_proofs',p_roots,'target_in_graph',p_target_in_graph,
  'observed_at',clock_timestamp(),'root_cause_verified',false);
 update reality_internal.genuine_capability_queue_v1
 set phase='SIGNED_CHAT_RECOVERY_TARGET_REVIEW_CLAIMED',
 qualification_receipt=qualification_receipt||pg_catalog.jsonb_build_object(
  'continuity_source_probe',proof,
  'continuity_source_probe_sha256','sha256:'||pg_catalog.encode(extensions.digest(proof::text,'sha256'),'hex'),
  'target_review_lease',pg_catalog.jsonb_build_object('review_id',v_review,
  'signed_worker_run_id',p_worker_run_id,'source_claim_id',q.claim_id,
  'review_started_at',clock_timestamp(),'expires_at',clock_timestamp()+interval '3 minutes'))
 where trigger_id=q.trigger_id;
 result:=public.reality_record_signed_chat_recovery_target_review_v1(q.trigger_id,v_review,p_worker_run_id,p_tree_sha,p_roots,p_target_in_graph);
 return result||pg_catalog.jsonb_build_object('continuity_source_probe_verified',true,'root_cause_verified',false);
end $f$;
revoke all on function public.reality_claim_signed_continuity_review_probe_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reality_claim_signed_continuity_review_probe_v1(uuid,uuid) to service_role;
revoke all on function public.reality_record_signed_continuity_review_probe_v1(uuid,uuid,uuid,text,jsonb,boolean,text) from public,anon,authenticated;
grant execute on function public.reality_record_signed_continuity_review_probe_v1(uuid,uuid,uuid,text,jsonb,boolean,text) to service_role;
