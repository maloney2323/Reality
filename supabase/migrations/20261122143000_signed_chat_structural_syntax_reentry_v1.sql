-- Evidence-bound generalized frozen structural parse proof for existing signed original.
-- One distinct signed incident investigation and later read-only parser wake
-- are required before any recompile. No source writes, replay or new authority.
CREATE OR REPLACE FUNCTION public.reality_record_signed_chat_recovery_syntax_v1(p_shift_id uuid, p_worker_run_id uuid, p_trigger_id uuid, p_candidate_sha256 text, p_base_sha text, p_source_blob_sha text, p_release_sha text, p_proof jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 sh record; proof jsonb; receipt text; spec jsonb; spec_hash text; archive jsonb;
 status text; next_action text; i record; evidence jsonb; prior_proof jsonb; boundary jsonb; rev integer;
begin
 if current_user<>'service_role' or p_release_sha is null or p_release_sha!~'^[a-f0-9]{40}$'
 then raise exception 'CHAT_RECOVERY_PARSE_SIGNED_PREVIEW_REQUIRED'; end if;
 select s.owner_id,s.shift_id,r.started_at into sh
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w on w.shift_id=s.shift_id and w.owner_id=s.owner_id
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 r on r.run_id=p_worker_run_id
 where s.shift_id=p_shift_id and s.closed_at is null and s.authorized_at is not null
  and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  and s.planned_start_at<=clock_timestamp() and s.planned_end_at>clock_timestamp()
  and w.state='ACTIVE' and pulse.last_worker_status='WAKE_RECEIVED'
  and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and r.status='STARTED' and r.started_at>clock_timestamp()-interval '3 minutes';
 if not found then raise exception 'CHAT_RECOVERY_PARSE_CURRENT_SIGNED_WAKE_REQUIRED';end if;
 select g.* into q from reality_internal.genuine_capability_queue_v1 g
 join reality_internal.chat_work_handoffs_v1 h on h.message_id=g.source_message_id and h.owner_id=g.owner_id and h.conversation_id=g.conversation_id and h.message_sha256=g.source_sha256
 join public.reality_chat_messages m on m.id=h.message_id and m.role='user' and m.user_id=h.owner_id and m.conversation_id=h.conversation_id and m.request_id=h.request_id
 where g.trigger_id=p_trigger_id and g.owner_id=sh.owner_id and g.source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
  and g.phase in ('SIGNED_CHAT_RECOVERY_TARGET_REVIEWED','SIGNED_CHAT_RECOVERY_PUBLISH_FENCED')
  and g.quarantine_receipt_sha256 is null
  and g.recovery_spec_sha256='sha256:'||pg_catalog.encode(extensions.digest(g.recovery_spec::text,'sha256'),'hex')
  and g.qualified_candidate->>'candidate_sha256'=p_candidate_sha256
  and p_candidate_sha256='sha256:'||pg_catalog.encode(extensions.digest((g.qualified_candidate-'candidate_sha256')::text,'sha256'),'hex')
  and g.qualified_candidate->>'base_sha'=p_base_sha and g.qualified_candidate->>'source_blob_sha'=p_source_blob_sha
  and g.qualified_candidate->>'target_path'~'^(src/|api/reality/)[A-Za-z0-9_/-]+[.]js$'
  and g.qualified_candidate->>'original_work_id'=g.original_work_id
  and g.qualified_candidate->>'spec_sha256'=g.recovery_spec_sha256
  and g.qualified_candidate->>'blocker_receipt_sha256'=g.blocker_receipt_sha256
  and g.qualification_receipt->>'target_review_receipt_sha256'='sha256:'||pg_catalog.encode(extensions.digest((g.qualification_receipt->'target_review')::text,'sha256'),'hex')
  and g.qualification_receipt->'target_review'->>'target_in_graph'='true'
  and g.qualification_receipt->'target_review'->>'candidate_sha256'=p_candidate_sha256
  and g.qualification_receipt->'target_review'->>'original_work_id'=g.original_work_id
  and h.development->>'original_work_id'=g.original_work_id and h.development->>'phase'='CI_VERIFIED'
  and h.development->>'installation_authorized'='false' and h.development->>'original_job_completed'='false'
  and h.development->>'production_changed'='false' and h.development->'evidence'->>'goal_gap_receipt_sha256'=g.blocker_receipt_sha256
  and h.message_sha256=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(m.content,'UTF8')),'hex')
 for update of g;
 if not found then raise exception 'CHAT_RECOVERY_PARSE_EXACT_ORIGINAL_DRIFT';end if;
 if p_proof is null or jsonb_typeof(p_proof) is distinct from 'object'
  or p_proof->>'parse_only' is distinct from 'true' or p_proof->>'candidate_executed' is distinct from 'false'
  or p_proof->>'baseline' is distinct from 'VALID_SYNTAX'
  or coalesce(p_proof->>'candidate','') not in ('VALID_SYNTAX','INVALID_SYNTAX')
  or coalesce(p_proof->>'baseline_sha256','') !~ '^sha256:[a-f0-9]{64}$'
  or coalesce(p_proof->>'proposed_sha256','') !~ '^sha256:[a-f0-9]{64}$'
  or p_proof->>'baseline_sha256'=p_proof->>'proposed_sha256'
 then raise exception 'CHAT_RECOVERY_PARSE_NEGATIVE_OR_POSITIVE_PROOF_INVALID';end if;
 proof:=pg_catalog.jsonb_build_object('schema','reality-independent-signed-chat-parse-proof-v1',
  'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,'owner_id',q.owner_id,
  'worker_run_id',p_worker_run_id,'shift_id',p_shift_id,'spec_sha256',q.recovery_spec_sha256,
  'candidate_sha256',p_candidate_sha256,'base_sha',p_base_sha,'source_blob_sha',p_source_blob_sha,
  'target_path',q.qualified_candidate->>'target_path','baseline',p_proof->>'baseline',
  'candidate',p_proof->>'candidate','baseline_sha256',p_proof->>'baseline_sha256',
  'proposed_sha256',p_proof->>'proposed_sha256','parse_only',true,'candidate_executed',false,
  'prior_phase',q.phase,'full_goal_feature_accepted',false,'execution_authorized',false,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);
 receipt:='sha256:'||pg_catalog.encode(extensions.digest(proof::text,'sha256'),'hex');
 if p_proof->>'candidate'='VALID_SYNTAX' then
  status:='SIGNED_RECOVERY_PARSE_ONLY_VERIFIED';
  next_action:=case when q.phase='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED' then 'RECONCILE_EXISTING_PROVIDER_EFFECT_WITHOUT_REPLAY' else 'STAGE_EXACT_QUARANTINE_THEN_INDEPENDENT_FULL_GOAL_TEST' end;
  update reality_internal.genuine_capability_queue_v1 set qualification_receipt=coalesce(qualification_receipt,'{}'::jsonb)||pg_catalog.jsonb_build_object('syntax_proof',proof,'syntax_receipt_sha256',receipt,'syntax_next_action',next_action) where trigger_id=q.trigger_id;
 elsif coalesce(q.recovery_spec->>'syntax_revision_epoch','0')='0' then
  archive:=pg_catalog.jsonb_build_object('prior_phase',q.phase,'prior_candidate',q.qualified_candidate,
   'prior_claim_id',q.claim_id,'prior_spec',q.recovery_spec,'prior_spec_sha256',q.recovery_spec_sha256,
   'prior_qualification_receipt',q.qualification_receipt,'syntax_proof',proof,'syntax_receipt_sha256',receipt,
   'prior_branch','reality/chat-recovery/'||q.trigger_id::text||
    (case when coalesce(q.recovery_spec->>'feature_revision_epoch','0')<>'0' then '-feature-r'||(q.recovery_spec->>'feature_revision_epoch') else '' end),'prior_provider_effect_not_replayed',true,
   'no_install_authority',true);
  spec:=q.recovery_spec||pg_catalog.jsonb_build_object(
   'schema','reality-recovery-compiler-capability-spec-v2','syntax_revision_epoch',1,
   'prior_syntax_rejection_receipt_sha256',receipt,'prior_syntax_target_path',q.qualified_candidate->>'target_path',
   'prior_syntax_failed_candidate_sha256',p_candidate_sha256,'prior_syntax_reason','INVALID_SYNTAX',
   'full_goal_accepted',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
  spec_hash:='sha256:'||pg_catalog.encode(extensions.digest(spec::text,'sha256'),'hex');
  update reality_internal.genuine_capability_queue_v1 set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
   claim_id=null,claim_expires_at=null,qualified_candidate=null,recovery_spec=spec,recovery_spec_sha256=spec_hash,
   frozen_suite_ref='recovery-spec:'||spec_hash,
   qualification_receipt=(coalesce(q.qualification_receipt,'{}'::jsonb)-array[
     'target_review','target_review_receipt_sha256','target_review_lease','target_reviewed_at',
     'target_review_retry_count','target_review_last_failure','target_review_failure_receipt_sha256',
     'target_review_failure_history','target_review_next_action','last_target_rejection',
     'continuity_source_probe','continuity_source_probe_sha256','publish_fenced_at',
     'publish_candidate_sha256','syntax_proof','syntax_receipt_sha256','syntax_next_action'])
    ||pg_catalog.jsonb_build_object('prior_syntax_epoch',archive,'syntax_revision_epoch',1,'revised_spec_sha256',spec_hash),
   updated_at=clock_timestamp() where trigger_id=q.trigger_id and phase=q.phase;
  status:='SIGNED_RECOVERY_INVALID_SYNTAX_SAME_ORIGINAL_RECOMPILED';
  next_action:='GENERATE_DISTINCT_CORRECTED_CANDIDATE_WITHOUT_REPLAYING_PRIOR_FENCE';
 else
  status:='SIGNED_RECOVERY_SYNTAX_REVISION_EXHAUSTED_NEEDS_INVESTIGATION';
  next_action:='INVESTIGATE_REPEATED_CANDIDATE_SYNTAX_FAILURE';
  prior_proof:=q.qualification_receipt->'syntax_proof';
  if prior_proof is null then
   update reality_internal.genuine_capability_queue_v1 set qualification_receipt=coalesce(qualification_receipt,'{}'::jsonb)||pg_catalog.jsonb_build_object('syntax_proof',proof,'syntax_receipt_sha256',receipt,'syntax_next_action',next_action) where trigger_id=q.trigger_id;
  else
   -- Retain the originally observed negative verdict, not a new receipt on
   -- each wake. A distinct post-investigation parser run must reproduce it.
   receipt:=q.qualification_receipt->>'syntax_receipt_sha256';
   evidence:=reality_internal.signed_chat_syntax_exhaustion_evidence_v1(q.trigger_id,p_shift_id);
   boundary:=p_proof->'boundary_reproduction';rev:=coalesce((q.recovery_spec->>'syntax_revision_epoch')::integer,0);
   if evidence is not null and rev between 1 and 8
    and prior_proof->>'baseline_sha256'=proof->>'baseline_sha256'
    and prior_proof->>'proposed_sha256'=proof->>'proposed_sha256'
    and boundary->>'original_candidate_sha256'=proof->>'proposed_sha256'
    and boundary->>'corrected_candidate_sha256'~'^sha256:[a-f0-9]{64}
   then
    select j.* into i from reality_internal.owner_shift_continuity_incidents_v1 j
    where j.owner_id=q.owner_id and j.shift_id=p_shift_id and j.kind='SIGNED_CHAT_RECOVERY_SYNTAX_STALLED'
     and j.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF' and j.source_evidence=evidence
     and j.evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(evidence::text,'sha256'),'hex')
     and j.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
     and j.assigned_function_id<>j.reviewer_function_id
     and j.investigated_at<sh.started_at
     and j.proposed_upgrade ~ '^\[GOVERNED_ACTION:(INVESTIGATE_EXISTING_HANDOFF|RUN_INDEPENDENT_FROZEN_TEST|VERIFY_INSTALLED_EXECUTOR)\]'
     and j.repair_executed=false and j.installation_authorized=false and j.production_changed=false
    order by j.investigated_at desc limit 1 for update;
    if found then
     archive:=pg_catalog.jsonb_build_object('prior_phase',q.phase,'prior_candidate',q.qualified_candidate,'prior_claim_id',q.claim_id,
       'prior_spec',q.recovery_spec,'prior_spec_sha256',q.recovery_spec_sha256,'prior_qualification_receipt',q.qualification_receipt,
       'syntax_proof',prior_proof,'syntax_receipt_sha256',receipt,'independent_boundary_reproduction',boundary,
       'reobservation_worker_run_id',p_worker_run_id,'investigation_incident_id',i.incident_id,'investigation_receipt_sha256',i.investigation_receipt_sha256,
       'prior_provider_effect_not_replayed',true,'no_install_authority',true,'prior_branch','reality/chat-recovery/'||q.trigger_id::text||
        (case when coalesce(q.recovery_spec->>'feature_revision_epoch','0')<>'0' then '-feature-r'||(q.recovery_spec->>'feature_revision_epoch') else '' end)||
        '-syntax-r'||rev::text);
     spec:=q.recovery_spec||pg_catalog.jsonb_build_object('schema','reality-recovery-compiler-capability-spec-v2',
       'syntax_revision_epoch',rev+1,'prior_syntax_rejection_receipt_sha256',receipt,
       'prior_syntax_target_path',q.qualified_candidate->>'target_path','prior_syntax_failed_candidate_sha256',p_candidate_sha256,
       'prior_syntax_reason','INVALID_SYNTAX','syntax_investigation_receipt_sha256',i.investigation_receipt_sha256,
       'syntax_compiler_reproduction',boundary,'syntax_investigation_diagnosis',i.diagnosis,
       'syntax_investigation_test_requirement',i.independent_test_requirement,
       'full_goal_accepted',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
     spec_hash:='sha256:'||pg_catalog.encode(extensions.digest(spec::text,'sha256'),'hex');
     update reality_internal.genuine_capability_queue_v1 set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
       claim_id=null,claim_expires_at=null,qualified_candidate=null,recovery_spec=spec,recovery_spec_sha256=spec_hash,frozen_suite_ref='recovery-spec:'||spec_hash,
       qualification_receipt=(qualification_receipt-array['target_review','target_review_receipt_sha256','target_review_lease','target_reviewed_at',
        'target_review_retry_count','target_review_last_failure','target_review_failure_receipt_sha256','target_review_failure_history','target_review_next_action',
        'last_target_rejection','continuity_source_probe','continuity_source_probe_sha256','publish_fenced_at','publish_candidate_sha256','syntax_proof','syntax_receipt_sha256','syntax_next_action'])
        ||pg_catalog.jsonb_build_object('prior_syntax_epoch',archive,'syntax_revision_epoch',rev+1,'revised_spec_sha256',spec_hash),
       updated_at=clock_timestamp() where trigger_id=q.trigger_id and phase=q.phase;
     status:='SIGNED_RECOVERY_SYNTAX_INVESTIGATION_RECOMPILED_SAME_ORIGINAL';
     next_action:='GENERATE_DISTINCT_CANDIDATE_WITH_INDEPENDENTLY_VERIFIED_STRUCTURAL_COMPILER';
    end if;
   end if;
  end if;
 end if;
 return pg_catalog.jsonb_build_object('status',status,'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'syntax_receipt_sha256',receipt,'next_action',next_action,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,'new_shift_started',false);
end $function$

    and boundary->>'corrected_candidate_sha256'<>proof->>'proposed_sha256'
    and boundary->>'expanded_find_sha256'~'^sha256:[a-f0-9]{64}
   then
    select j.* into i from reality_internal.owner_shift_continuity_incidents_v1 j
    where j.owner_id=q.owner_id and j.shift_id=p_shift_id and j.kind='SIGNED_CHAT_RECOVERY_SYNTAX_STALLED'
     and j.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF' and j.source_evidence=evidence
     and j.evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(evidence::text,'sha256'),'hex')
     and j.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
     and j.assigned_function_id<>j.reviewer_function_id
     and j.investigated_at<sh.started_at
     and j.proposed_upgrade ~ '^\[GOVERNED_ACTION:(INVESTIGATE_EXISTING_HANDOFF|RUN_INDEPENDENT_FROZEN_TEST|VERIFY_INSTALLED_EXECUTOR)\]'
     and j.repair_executed=false and j.installation_authorized=false and j.production_changed=false
    order by j.investigated_at desc limit 1 for update;
    if found then
     archive:=pg_catalog.jsonb_build_object('prior_phase',q.phase,'prior_candidate',q.qualified_candidate,'prior_claim_id',q.claim_id,
       'prior_spec',q.recovery_spec,'prior_spec_sha256',q.recovery_spec_sha256,'prior_qualification_receipt',q.qualification_receipt,
       'syntax_proof',prior_proof,'syntax_receipt_sha256',receipt,'independent_boundary_reproduction',boundary,
       'reobservation_worker_run_id',p_worker_run_id,'investigation_incident_id',i.incident_id,'investigation_receipt_sha256',i.investigation_receipt_sha256,
       'prior_provider_effect_not_replayed',true,'no_install_authority',true,'prior_branch','reality/chat-recovery/'||q.trigger_id::text||
        (case when coalesce(q.recovery_spec->>'feature_revision_epoch','0')<>'0' then '-feature-r'||(q.recovery_spec->>'feature_revision_epoch') else '' end)||
        '-syntax-r'||rev::text);
     spec:=q.recovery_spec||pg_catalog.jsonb_build_object('schema','reality-recovery-compiler-capability-spec-v2',
       'syntax_revision_epoch',rev+1,'prior_syntax_rejection_receipt_sha256',receipt,
       'prior_syntax_target_path',q.qualified_candidate->>'target_path','prior_syntax_failed_candidate_sha256',p_candidate_sha256,
       'prior_syntax_reason','INVALID_SYNTAX','syntax_investigation_receipt_sha256',i.investigation_receipt_sha256,
       'syntax_compiler_reproduction',boundary,'syntax_investigation_diagnosis',i.diagnosis,
       'syntax_investigation_test_requirement',i.independent_test_requirement,
       'full_goal_accepted',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
     spec_hash:='sha256:'||pg_catalog.encode(extensions.digest(spec::text,'sha256'),'hex');
     update reality_internal.genuine_capability_queue_v1 set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
       claim_id=null,claim_expires_at=null,qualified_candidate=null,recovery_spec=spec,recovery_spec_sha256=spec_hash,frozen_suite_ref='recovery-spec:'||spec_hash,
       qualification_receipt=(qualification_receipt-array['target_review','target_review_receipt_sha256','target_review_lease','target_reviewed_at',
        'target_review_retry_count','target_review_last_failure','target_review_failure_receipt_sha256','target_review_failure_history','target_review_next_action',
        'last_target_rejection','continuity_source_probe','continuity_source_probe_sha256','publish_fenced_at','publish_candidate_sha256','syntax_proof','syntax_receipt_sha256','syntax_next_action'])
        ||pg_catalog.jsonb_build_object('prior_syntax_epoch',archive,'syntax_revision_epoch',rev+1,'revised_spec_sha256',spec_hash),
       updated_at=clock_timestamp() where trigger_id=q.trigger_id and phase=q.phase;
     status:='SIGNED_RECOVERY_SYNTAX_INVESTIGATION_RECOMPILED_SAME_ORIGINAL';
     next_action:='GENERATE_DISTINCT_CANDIDATE_WITH_INDEPENDENTLY_PROVEN_BOUNDARY_COMPILER';
    end if;
   end if;
  end if;
 end if;
 return pg_catalog.jsonb_build_object('status',status,'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'syntax_receipt_sha256',receipt,'next_action',next_action,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,'new_shift_started',false);
end $function$

    and boundary->>'unchanged_replacement_sha256'='sha256:'||pg_catalog.encode(extensions.digest(q.qualified_candidate->>'replace','sha256'),'hex')
    and boundary->>'parse_only'='true' and boundary->>'candidate_executed'='false'
    and boundary->>'functional_acceptance_verified'='false'
    and (
     (boundary->>'schema'='reality-exact-splice-boundary-reproduction-v1'
      and boundary->>'classification'='DUPLICATED_FROZEN_CLOSING_DELIMITER'
      and boundary->>'additional_source_lines'='1'
      and length(boundary->>'boundary_line') between 2 and 80)
     or
     (boundary->>'schema'='reality-exact-structural-span-reproduction-v1'
      and boundary->>'classification'='INCOMPLETE_FROZEN_SYNTAX_SPAN'
      and boundary->>'baseline_sha256'=proof->>'baseline_sha256'
      and coalesce(boundary->>'additional_source_lines','')~'^[1-9][0-9]?
   then
    select j.* into i from reality_internal.owner_shift_continuity_incidents_v1 j
    where j.owner_id=q.owner_id and j.shift_id=p_shift_id and j.kind='SIGNED_CHAT_RECOVERY_SYNTAX_STALLED'
     and j.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF' and j.source_evidence=evidence
     and j.evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(evidence::text,'sha256'),'hex')
     and j.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
     and j.assigned_function_id<>j.reviewer_function_id
     and j.investigated_at<sh.started_at
     and j.proposed_upgrade ~ '^\[GOVERNED_ACTION:(INVESTIGATE_EXISTING_HANDOFF|RUN_INDEPENDENT_FROZEN_TEST|VERIFY_INSTALLED_EXECUTOR)\]'
     and j.repair_executed=false and j.installation_authorized=false and j.production_changed=false
    order by j.investigated_at desc limit 1 for update;
    if found then
     archive:=pg_catalog.jsonb_build_object('prior_phase',q.phase,'prior_candidate',q.qualified_candidate,'prior_claim_id',q.claim_id,
       'prior_spec',q.recovery_spec,'prior_spec_sha256',q.recovery_spec_sha256,'prior_qualification_receipt',q.qualification_receipt,
       'syntax_proof',prior_proof,'syntax_receipt_sha256',receipt,'independent_boundary_reproduction',boundary,
       'reobservation_worker_run_id',p_worker_run_id,'investigation_incident_id',i.incident_id,'investigation_receipt_sha256',i.investigation_receipt_sha256,
       'prior_provider_effect_not_replayed',true,'no_install_authority',true,'prior_branch','reality/chat-recovery/'||q.trigger_id::text||
        (case when coalesce(q.recovery_spec->>'feature_revision_epoch','0')<>'0' then '-feature-r'||(q.recovery_spec->>'feature_revision_epoch') else '' end)||
        '-syntax-r'||rev::text);
     spec:=q.recovery_spec||pg_catalog.jsonb_build_object('schema','reality-recovery-compiler-capability-spec-v2',
       'syntax_revision_epoch',rev+1,'prior_syntax_rejection_receipt_sha256',receipt,
       'prior_syntax_target_path',q.qualified_candidate->>'target_path','prior_syntax_failed_candidate_sha256',p_candidate_sha256,
       'prior_syntax_reason','INVALID_SYNTAX','syntax_investigation_receipt_sha256',i.investigation_receipt_sha256,
       'syntax_compiler_reproduction',boundary,'syntax_investigation_diagnosis',i.diagnosis,
       'syntax_investigation_test_requirement',i.independent_test_requirement,
       'full_goal_accepted',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
     spec_hash:='sha256:'||pg_catalog.encode(extensions.digest(spec::text,'sha256'),'hex');
     update reality_internal.genuine_capability_queue_v1 set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
       claim_id=null,claim_expires_at=null,qualified_candidate=null,recovery_spec=spec,recovery_spec_sha256=spec_hash,frozen_suite_ref='recovery-spec:'||spec_hash,
       qualification_receipt=(qualification_receipt-array['target_review','target_review_receipt_sha256','target_review_lease','target_reviewed_at',
        'target_review_retry_count','target_review_last_failure','target_review_failure_receipt_sha256','target_review_failure_history','target_review_next_action',
        'last_target_rejection','continuity_source_probe','continuity_source_probe_sha256','publish_fenced_at','publish_candidate_sha256','syntax_proof','syntax_receipt_sha256','syntax_next_action'])
        ||pg_catalog.jsonb_build_object('prior_syntax_epoch',archive,'syntax_revision_epoch',rev+1,'revised_spec_sha256',spec_hash),
       updated_at=clock_timestamp() where trigger_id=q.trigger_id and phase=q.phase;
     status:='SIGNED_RECOVERY_SYNTAX_INVESTIGATION_RECOMPILED_SAME_ORIGINAL';
     next_action:='GENERATE_DISTINCT_CANDIDATE_WITH_INDEPENDENTLY_PROVEN_BOUNDARY_COMPILER';
    end if;
   end if;
  end if;
 end if;
 return pg_catalog.jsonb_build_object('status',status,'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'syntax_receipt_sha256',receipt,'next_action',next_action,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,'new_shift_started',false);
end $function$

      and (boundary->>'additional_source_lines')::integer between 1 and 80
      and coalesce(boundary->>'original_start_line','')~'^[1-9][0-9]{0,5}
   then
    select j.* into i from reality_internal.owner_shift_continuity_incidents_v1 j
    where j.owner_id=q.owner_id and j.shift_id=p_shift_id and j.kind='SIGNED_CHAT_RECOVERY_SYNTAX_STALLED'
     and j.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF' and j.source_evidence=evidence
     and j.evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(evidence::text,'sha256'),'hex')
     and j.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
     and j.assigned_function_id<>j.reviewer_function_id
     and j.investigated_at<sh.started_at
     and j.proposed_upgrade ~ '^\[GOVERNED_ACTION:(INVESTIGATE_EXISTING_HANDOFF|RUN_INDEPENDENT_FROZEN_TEST|VERIFY_INSTALLED_EXECUTOR)\]'
     and j.repair_executed=false and j.installation_authorized=false and j.production_changed=false
    order by j.investigated_at desc limit 1 for update;
    if found then
     archive:=pg_catalog.jsonb_build_object('prior_phase',q.phase,'prior_candidate',q.qualified_candidate,'prior_claim_id',q.claim_id,
       'prior_spec',q.recovery_spec,'prior_spec_sha256',q.recovery_spec_sha256,'prior_qualification_receipt',q.qualification_receipt,
       'syntax_proof',prior_proof,'syntax_receipt_sha256',receipt,'independent_boundary_reproduction',boundary,
       'reobservation_worker_run_id',p_worker_run_id,'investigation_incident_id',i.incident_id,'investigation_receipt_sha256',i.investigation_receipt_sha256,
       'prior_provider_effect_not_replayed',true,'no_install_authority',true,'prior_branch','reality/chat-recovery/'||q.trigger_id::text||
        (case when coalesce(q.recovery_spec->>'feature_revision_epoch','0')<>'0' then '-feature-r'||(q.recovery_spec->>'feature_revision_epoch') else '' end)||
        '-syntax-r'||rev::text);
     spec:=q.recovery_spec||pg_catalog.jsonb_build_object('schema','reality-recovery-compiler-capability-spec-v2',
       'syntax_revision_epoch',rev+1,'prior_syntax_rejection_receipt_sha256',receipt,
       'prior_syntax_target_path',q.qualified_candidate->>'target_path','prior_syntax_failed_candidate_sha256',p_candidate_sha256,
       'prior_syntax_reason','INVALID_SYNTAX','syntax_investigation_receipt_sha256',i.investigation_receipt_sha256,
       'syntax_compiler_reproduction',boundary,'syntax_investigation_diagnosis',i.diagnosis,
       'syntax_investigation_test_requirement',i.independent_test_requirement,
       'full_goal_accepted',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
     spec_hash:='sha256:'||pg_catalog.encode(extensions.digest(spec::text,'sha256'),'hex');
     update reality_internal.genuine_capability_queue_v1 set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
       claim_id=null,claim_expires_at=null,qualified_candidate=null,recovery_spec=spec,recovery_spec_sha256=spec_hash,frozen_suite_ref='recovery-spec:'||spec_hash,
       qualification_receipt=(qualification_receipt-array['target_review','target_review_receipt_sha256','target_review_lease','target_reviewed_at',
        'target_review_retry_count','target_review_last_failure','target_review_failure_receipt_sha256','target_review_failure_history','target_review_next_action',
        'last_target_rejection','continuity_source_probe','continuity_source_probe_sha256','publish_fenced_at','publish_candidate_sha256','syntax_proof','syntax_receipt_sha256','syntax_next_action'])
        ||pg_catalog.jsonb_build_object('prior_syntax_epoch',archive,'syntax_revision_epoch',rev+1,'revised_spec_sha256',spec_hash),
       updated_at=clock_timestamp() where trigger_id=q.trigger_id and phase=q.phase;
     status:='SIGNED_RECOVERY_SYNTAX_INVESTIGATION_RECOMPILED_SAME_ORIGINAL';
     next_action:='GENERATE_DISTINCT_CANDIDATE_WITH_INDEPENDENTLY_PROVEN_BOUNDARY_COMPILER';
    end if;
   end if;
  end if;
 end if;
 return pg_catalog.jsonb_build_object('status',status,'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'syntax_receipt_sha256',receipt,'next_action',next_action,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,'new_shift_started',false);
end $function$

      and coalesce(boundary->>'original_end_line','')~'^[1-9][0-9]{0,5}
   then
    select j.* into i from reality_internal.owner_shift_continuity_incidents_v1 j
    where j.owner_id=q.owner_id and j.shift_id=p_shift_id and j.kind='SIGNED_CHAT_RECOVERY_SYNTAX_STALLED'
     and j.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF' and j.source_evidence=evidence
     and j.evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(evidence::text,'sha256'),'hex')
     and j.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
     and j.assigned_function_id<>j.reviewer_function_id
     and j.investigated_at<sh.started_at
     and j.proposed_upgrade ~ '^\[GOVERNED_ACTION:(INVESTIGATE_EXISTING_HANDOFF|RUN_INDEPENDENT_FROZEN_TEST|VERIFY_INSTALLED_EXECUTOR)\]'
     and j.repair_executed=false and j.installation_authorized=false and j.production_changed=false
    order by j.investigated_at desc limit 1 for update;
    if found then
     archive:=pg_catalog.jsonb_build_object('prior_phase',q.phase,'prior_candidate',q.qualified_candidate,'prior_claim_id',q.claim_id,
       'prior_spec',q.recovery_spec,'prior_spec_sha256',q.recovery_spec_sha256,'prior_qualification_receipt',q.qualification_receipt,
       'syntax_proof',prior_proof,'syntax_receipt_sha256',receipt,'independent_boundary_reproduction',boundary,
       'reobservation_worker_run_id',p_worker_run_id,'investigation_incident_id',i.incident_id,'investigation_receipt_sha256',i.investigation_receipt_sha256,
       'prior_provider_effect_not_replayed',true,'no_install_authority',true,'prior_branch','reality/chat-recovery/'||q.trigger_id::text||
        (case when coalesce(q.recovery_spec->>'feature_revision_epoch','0')<>'0' then '-feature-r'||(q.recovery_spec->>'feature_revision_epoch') else '' end)||
        '-syntax-r'||rev::text);
     spec:=q.recovery_spec||pg_catalog.jsonb_build_object('schema','reality-recovery-compiler-capability-spec-v2',
       'syntax_revision_epoch',rev+1,'prior_syntax_rejection_receipt_sha256',receipt,
       'prior_syntax_target_path',q.qualified_candidate->>'target_path','prior_syntax_failed_candidate_sha256',p_candidate_sha256,
       'prior_syntax_reason','INVALID_SYNTAX','syntax_investigation_receipt_sha256',i.investigation_receipt_sha256,
       'syntax_compiler_reproduction',boundary,'syntax_investigation_diagnosis',i.diagnosis,
       'syntax_investigation_test_requirement',i.independent_test_requirement,
       'full_goal_accepted',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
     spec_hash:='sha256:'||pg_catalog.encode(extensions.digest(spec::text,'sha256'),'hex');
     update reality_internal.genuine_capability_queue_v1 set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
       claim_id=null,claim_expires_at=null,qualified_candidate=null,recovery_spec=spec,recovery_spec_sha256=spec_hash,frozen_suite_ref='recovery-spec:'||spec_hash,
       qualification_receipt=(qualification_receipt-array['target_review','target_review_receipt_sha256','target_review_lease','target_reviewed_at',
        'target_review_retry_count','target_review_last_failure','target_review_failure_receipt_sha256','target_review_failure_history','target_review_next_action',
        'last_target_rejection','continuity_source_probe','continuity_source_probe_sha256','publish_fenced_at','publish_candidate_sha256','syntax_proof','syntax_receipt_sha256','syntax_next_action'])
        ||pg_catalog.jsonb_build_object('prior_syntax_epoch',archive,'syntax_revision_epoch',rev+1,'revised_spec_sha256',spec_hash),
       updated_at=clock_timestamp() where trigger_id=q.trigger_id and phase=q.phase;
     status:='SIGNED_RECOVERY_SYNTAX_INVESTIGATION_RECOMPILED_SAME_ORIGINAL';
     next_action:='GENERATE_DISTINCT_CANDIDATE_WITH_INDEPENDENTLY_PROVEN_BOUNDARY_COMPILER';
    end if;
   end if;
  end if;
 end if;
 return pg_catalog.jsonb_build_object('status',status,'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'syntax_receipt_sha256',receipt,'next_action',next_action,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,'new_shift_started',false);
end $function$

      and coalesce(boundary->>'corrected_end_line','')~'^[1-9][0-9]{0,5}
   then
    select j.* into i from reality_internal.owner_shift_continuity_incidents_v1 j
    where j.owner_id=q.owner_id and j.shift_id=p_shift_id and j.kind='SIGNED_CHAT_RECOVERY_SYNTAX_STALLED'
     and j.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF' and j.source_evidence=evidence
     and j.evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(evidence::text,'sha256'),'hex')
     and j.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
     and j.assigned_function_id<>j.reviewer_function_id
     and j.investigated_at<sh.started_at
     and j.proposed_upgrade ~ '^\[GOVERNED_ACTION:(INVESTIGATE_EXISTING_HANDOFF|RUN_INDEPENDENT_FROZEN_TEST|VERIFY_INSTALLED_EXECUTOR)\]'
     and j.repair_executed=false and j.installation_authorized=false and j.production_changed=false
    order by j.investigated_at desc limit 1 for update;
    if found then
     archive:=pg_catalog.jsonb_build_object('prior_phase',q.phase,'prior_candidate',q.qualified_candidate,'prior_claim_id',q.claim_id,
       'prior_spec',q.recovery_spec,'prior_spec_sha256',q.recovery_spec_sha256,'prior_qualification_receipt',q.qualification_receipt,
       'syntax_proof',prior_proof,'syntax_receipt_sha256',receipt,'independent_boundary_reproduction',boundary,
       'reobservation_worker_run_id',p_worker_run_id,'investigation_incident_id',i.incident_id,'investigation_receipt_sha256',i.investigation_receipt_sha256,
       'prior_provider_effect_not_replayed',true,'no_install_authority',true,'prior_branch','reality/chat-recovery/'||q.trigger_id::text||
        (case when coalesce(q.recovery_spec->>'feature_revision_epoch','0')<>'0' then '-feature-r'||(q.recovery_spec->>'feature_revision_epoch') else '' end)||
        '-syntax-r'||rev::text);
     spec:=q.recovery_spec||pg_catalog.jsonb_build_object('schema','reality-recovery-compiler-capability-spec-v2',
       'syntax_revision_epoch',rev+1,'prior_syntax_rejection_receipt_sha256',receipt,
       'prior_syntax_target_path',q.qualified_candidate->>'target_path','prior_syntax_failed_candidate_sha256',p_candidate_sha256,
       'prior_syntax_reason','INVALID_SYNTAX','syntax_investigation_receipt_sha256',i.investigation_receipt_sha256,
       'syntax_compiler_reproduction',boundary,'syntax_investigation_diagnosis',i.diagnosis,
       'syntax_investigation_test_requirement',i.independent_test_requirement,
       'full_goal_accepted',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
     spec_hash:='sha256:'||pg_catalog.encode(extensions.digest(spec::text,'sha256'),'hex');
     update reality_internal.genuine_capability_queue_v1 set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
       claim_id=null,claim_expires_at=null,qualified_candidate=null,recovery_spec=spec,recovery_spec_sha256=spec_hash,frozen_suite_ref='recovery-spec:'||spec_hash,
       qualification_receipt=(qualification_receipt-array['target_review','target_review_receipt_sha256','target_review_lease','target_reviewed_at',
        'target_review_retry_count','target_review_last_failure','target_review_failure_receipt_sha256','target_review_failure_history','target_review_next_action',
        'last_target_rejection','continuity_source_probe','continuity_source_probe_sha256','publish_fenced_at','publish_candidate_sha256','syntax_proof','syntax_receipt_sha256','syntax_next_action'])
        ||pg_catalog.jsonb_build_object('prior_syntax_epoch',archive,'syntax_revision_epoch',rev+1,'revised_spec_sha256',spec_hash),
       updated_at=clock_timestamp() where trigger_id=q.trigger_id and phase=q.phase;
     status:='SIGNED_RECOVERY_SYNTAX_INVESTIGATION_RECOMPILED_SAME_ORIGINAL';
     next_action:='GENERATE_DISTINCT_CANDIDATE_WITH_INDEPENDENTLY_PROVEN_BOUNDARY_COMPILER';
    end if;
   end if;
  end if;
 end if;
 return pg_catalog.jsonb_build_object('status',status,'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'syntax_receipt_sha256',receipt,'next_action',next_action,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,'new_shift_started',false);
end $function$

      and (boundary->>'original_end_line')::integer>=(boundary->>'original_start_line')::integer
      and (boundary->>'corrected_end_line')::integer=
          (boundary->>'original_end_line')::integer+(boundary->>'additional_source_lines')::integer
      and not (boundary?'corrected_find') and not (boundary?'unchanged_replace'))
    )
   then
    select j.* into i from reality_internal.owner_shift_continuity_incidents_v1 j
    where j.owner_id=q.owner_id and j.shift_id=p_shift_id and j.kind='SIGNED_CHAT_RECOVERY_SYNTAX_STALLED'
     and j.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF' and j.source_evidence=evidence
     and j.evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(evidence::text,'sha256'),'hex')
     and j.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
     and j.assigned_function_id<>j.reviewer_function_id
     and j.investigated_at<sh.started_at
     and j.proposed_upgrade ~ '^\[GOVERNED_ACTION:(INVESTIGATE_EXISTING_HANDOFF|RUN_INDEPENDENT_FROZEN_TEST|VERIFY_INSTALLED_EXECUTOR)\]'
     and j.repair_executed=false and j.installation_authorized=false and j.production_changed=false
    order by j.investigated_at desc limit 1 for update;
    if found then
     archive:=pg_catalog.jsonb_build_object('prior_phase',q.phase,'prior_candidate',q.qualified_candidate,'prior_claim_id',q.claim_id,
       'prior_spec',q.recovery_spec,'prior_spec_sha256',q.recovery_spec_sha256,'prior_qualification_receipt',q.qualification_receipt,
       'syntax_proof',prior_proof,'syntax_receipt_sha256',receipt,'independent_boundary_reproduction',boundary,
       'reobservation_worker_run_id',p_worker_run_id,'investigation_incident_id',i.incident_id,'investigation_receipt_sha256',i.investigation_receipt_sha256,
       'prior_provider_effect_not_replayed',true,'no_install_authority',true,'prior_branch','reality/chat-recovery/'||q.trigger_id::text||
        (case when coalesce(q.recovery_spec->>'feature_revision_epoch','0')<>'0' then '-feature-r'||(q.recovery_spec->>'feature_revision_epoch') else '' end)||
        '-syntax-r'||rev::text);
     spec:=q.recovery_spec||pg_catalog.jsonb_build_object('schema','reality-recovery-compiler-capability-spec-v2',
       'syntax_revision_epoch',rev+1,'prior_syntax_rejection_receipt_sha256',receipt,
       'prior_syntax_target_path',q.qualified_candidate->>'target_path','prior_syntax_failed_candidate_sha256',p_candidate_sha256,
       'prior_syntax_reason','INVALID_SYNTAX','syntax_investigation_receipt_sha256',i.investigation_receipt_sha256,
       'syntax_compiler_reproduction',boundary,'syntax_investigation_diagnosis',i.diagnosis,
       'syntax_investigation_test_requirement',i.independent_test_requirement,
       'full_goal_accepted',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
     spec_hash:='sha256:'||pg_catalog.encode(extensions.digest(spec::text,'sha256'),'hex');
     update reality_internal.genuine_capability_queue_v1 set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
       claim_id=null,claim_expires_at=null,qualified_candidate=null,recovery_spec=spec,recovery_spec_sha256=spec_hash,frozen_suite_ref='recovery-spec:'||spec_hash,
       qualification_receipt=(qualification_receipt-array['target_review','target_review_receipt_sha256','target_review_lease','target_reviewed_at',
        'target_review_retry_count','target_review_last_failure','target_review_failure_receipt_sha256','target_review_failure_history','target_review_next_action',
        'last_target_rejection','continuity_source_probe','continuity_source_probe_sha256','publish_fenced_at','publish_candidate_sha256','syntax_proof','syntax_receipt_sha256','syntax_next_action'])
        ||pg_catalog.jsonb_build_object('prior_syntax_epoch',archive,'syntax_revision_epoch',rev+1,'revised_spec_sha256',spec_hash),
       updated_at=clock_timestamp() where trigger_id=q.trigger_id and phase=q.phase;
     status:='SIGNED_RECOVERY_SYNTAX_INVESTIGATION_RECOMPILED_SAME_ORIGINAL';
     next_action:='GENERATE_DISTINCT_CANDIDATE_WITH_INDEPENDENTLY_PROVEN_BOUNDARY_COMPILER';
    end if;
   end if;
  end if;
 end if;
 return pg_catalog.jsonb_build_object('status',status,'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'syntax_receipt_sha256',receipt,'next_action',next_action,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,'new_shift_started',false);
end $function$
;
revoke all on function public.reality_record_signed_chat_recovery_syntax_v1(uuid,uuid,uuid,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.reality_record_signed_chat_recovery_syntax_v1(uuid,uuid,uuid,text,text,text,text,jsonb) to service_role;
