-- SYNTHETIC PROVIDER EVIDENCE. RUN ONLY inside BEGIN + 4 migrations + ROLLBACK.
-- No actual GitHub comment, owner approval, or production effect occurs.
SET LOCAL ROLE service_role;
DO $test$
DECLARE p record;plan uuid;packet jsonb;approved jsonb;prep jsonb;
 pub jsonb;claim jsonb;candidate jsonb;settled jsonb;readback jsonb;
 v_goal_count integer;v_original_phase text;
 v_runs uuid[]:=ARRAY[]::uuid[];v_i integer;
 v_file_list jsonb;v_scopes jsonb;v_source_sha text;
 v_a uuid;v_batch uuid;v_comment bigint:=987650123;
 v_evidence jsonb;v_original text;v_result jsonb;
BEGIN
 SELECT s.shift_id,s.owner_id,s.plan_fingerprint,r.original_work_id,
  r.source_ref,r.source_proof_sha256 INTO p
 FROM reality_internal.riley_pr_review_originals_v1 r
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=r.shift_id AND s.owner_id=r.owner_id
 WHERE r.source_ref='https://github.com/maloney2323/Reality/pull/307'
  AND r.phase='BLOCKED' AND r.review_body IS NULL
  AND r.provider_comment_id IS NULL AND s.closed_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'SIGNED_BLOCKED_PARENT_UNAVAILABLE';END IF;
 FOR v_i IN 1..8 LOOP
  v_runs:=array_append(v_runs,gen_random_uuid());
  INSERT INTO reality_internal.signed_worker_actual_runs_v1(
   run_id,started_at,status,worker_stage)
  VALUES(v_runs[v_i],clock_timestamp(),'STARTED','FINAL_LOOP_TEST_V1');
 END LOOP;
 v_file_list:='[]'::jsonb;
 FOR v_i IN 1..8 LOOP
  v_file_list:=v_file_list||jsonb_build_array(jsonb_build_object(
   'path','src/test-file-'||v_i::text||'.js',
   'blob_sha',repeat('a',40),'status','modified'));
 END LOOP;
 v_scopes:=jsonb_build_array(
  jsonb_build_object('index',0,'file_count',8,
   'proposed_scope_sha256','sha256:'||repeat('1',64),
   'files',v_file_list),
  jsonb_build_object('index',1,'file_count',1,
   'proposed_scope_sha256','sha256:'||repeat('2',64),
   'files',jsonb_build_array(jsonb_build_object(
    'path','src/test-file-9.js','blob_sha',repeat('b',40),
    'status','modified'))));
 v_source_sha:='sha256:'||repeat('c',64);
 INSERT INTO reality_internal.final_loop_pr_source_plans_v1(
  shift_id,owner_id,plan_fingerprint,source_ref,source_proof_sha256,
  parent_original_work_id,parent_source_phase,source_head_sha,
  source_base_sha,source_manifest_sha256,database_plan_digest_sha256,
  file_count,proposed_scope_count,source_plan,staging_worker_run_id)
 VALUES(p.shift_id,p.owner_id,p.plan_fingerprint,p.source_ref,
  p.source_proof_sha256,p.original_work_id,'BLOCKED',
  repeat('f',40),repeat('e',40),v_source_sha,
  'sha256:'||repeat('d',64),9,2,
  jsonb_build_object('bounded_scopes',v_scopes),
  v_runs[1]) RETURNING plan_id INTO plan;
 packet:=public.reality_prepare_final_loop_child_approval_v1(
  plan,reality_internal.final_loop_pr_review_acceptance_digest_v1(plan),
  v_runs[1]);
 IF packet->>'status'<>'FINAL_LOOP_CHILD_EXACT_OWNER_APPROVAL_REQUIRED' THEN
  RAISE EXCEPTION 'PARENT_OWNER_GOAL_PACKET_NOT_READY: %',packet;END IF;
 approved:=public.reality_owner_approve_final_loop_child_v1(
  p.owner_id,(packet->>'packet_id')::uuid,
  packet->>'proposal_fingerprint',
  v_source_sha,gen_random_uuid());
 IF approved->>'approved'<>'true' THEN
  RAISE EXCEPTION 'SIMULATED_GOAL_APPROVAL_REJECTED: %',approved;END IF;
 SELECT count(*) INTO v_goal_count FROM public.universe_events e
 WHERE e.continuity_root_id=p.shift_id AND e.worldline_id=plan
  AND e.epistemic_status='VERIFIED' AND e.event_kind='WORK'
  AND e.payload->>'original_job_completed'='false';
 IF v_goal_count<>1 THEN
  RAISE EXCEPTION 'OWNER_ACCEPTED_GOAL_UNIVERSE_MISSING';END IF;
 FOR v_i IN 0..1 LOOP
  INSERT INTO reality_internal.final_loop_child_review_work_v1(
   child_work_id,packet_id,plan_id,owner_id,shift_id,
   parent_original_work_id,scope_index,scope_sha256,
   source_manifest_sha256,source_head_sha,
   acceptance_contract_sha256,phase,claimant_worker_run_id,
   independent_verifier_run_id,model_response_id,
   review_body,review_sha256,independent_review_receipt_sha256,
   verified_at)
  VALUES('work:'||repeat((v_i+2)::text,32),
   (packet->>'packet_id')::uuid,plan,p.owner_id,p.shift_id,
   p.original_work_id,v_i,'sha256:'||repeat((v_i+1)::text,64),
   v_source_sha,repeat('f',40),
   approved->>'acceptance_contract_sha256',
   'INDEPENDENTLY_VERIFIED',v_runs[1+v_i*2],v_runs[2+v_i*2],
   'resp_synthetic'||v_i::text,
   repeat('Source-backed changes, verified controls and integration tests. ',12),
   'sha256:'||repeat('6',64),
   'sha256:'||repeat((v_i+3)::text,64),
   clock_timestamp());
 END LOOP;
 -- One independent integration receipt, separate signed worker.
 INSERT INTO reality_internal.final_loop_parent_integration_batches_v1(
  plan_id,packet_id,owner_id,shift_id,parent_original_work_id,
  source_manifest_sha256,source_head_sha,acceptance_contract_sha256,
  batch_index,first_scope_index,last_scope_index,phase,
  verifier_worker_run_id,verified_child_receipts_sha256,
  cross_scope_receipt_sha256,evidence,verified_at)
 VALUES(plan,(packet->>'packet_id')::uuid,p.owner_id,p.shift_id,
  p.original_work_id,v_source_sha,repeat('f',40),
  approved->>'acceptance_contract_sha256',
  0,0,1,'VERIFIED',v_runs[5],
  'sha256:'||repeat('7',64),'sha256:'||repeat('8',64),
  jsonb_build_object('independent_provider_readback',true,
   'all_child_receipts_verified',true),clock_timestamp())
 RETURNING batch_id INTO v_batch;
 UPDATE reality_internal.final_loop_child_approval_packets_v1
 SET state='EFFECT_RESERVED_RECONCILE_ONLY'
 WHERE packet_id=(packet->>'packet_id')::uuid
  AND state='APPROVED_ONCE';
 prep:=public.reality_prepare_final_loop_parent_delivery_v1(plan,v_runs[6]);
 IF prep->>'status'<>
   'FINAL_LOOP_PARENT_DELIVERY_EXACT_OWNER_PUBLICATION_REQUIRED'
 THEN RAISE EXCEPTION 'FULL_PARENT_DELIVERY_NOT_READY: %',prep;END IF;
 claim:=public.reality_claim_final_loop_parent_publish_v1(p.shift_id,v_runs[7]);
 IF claim->>'publication_effect_reserved'='true' THEN
  RAISE EXCEPTION 'GITHUB_WRITE_CLAIMED_WITHOUT_SECOND_OWNER_CLICK';END IF;
 pub:=public.reality_owner_approve_final_loop_parent_delivery_v1(
  p.owner_id,(prep->>'delivery_id')::uuid,
  prep->>'proposal_fingerprint',
  prep->>'review_body_sha256',gen_random_uuid());
 IF pub->>'publication_approved'<>'true' THEN
  RAISE EXCEPTION 'EXACT_SECOND_OWNER_PUBLISH_APPROVAL_REJECTED: %',pub;END IF;
 claim:=public.reality_claim_final_loop_parent_publish_v1(
  p.shift_id,v_runs[7]);
 IF claim->>'status'<>'FINAL_LOOP_PARENT_GITHUB_WRITE_RESERVED_ONCE'
  OR claim->>'original_job_completed'<>'false'
 THEN RAISE EXCEPTION 'ATOMIC_EXTERNAL_WRITE_NOT_RESERVED: %',claim;END IF;
 candidate:=public.reality_read_final_loop_parent_publish_verify_v1(
  p.shift_id,v_runs[7]);
 IF candidate->>'status'=
  'FINAL_LOOP_PARENT_GITHUB_EFFECT_UNCERTAIN_READBACK_ONLY' THEN
  RAISE EXCEPTION 'PUBLISHER_CANNOT_VERIFY_OWN_EFFECT';END IF;
 candidate:=public.reality_read_final_loop_parent_publish_verify_v1(
  p.shift_id,v_runs[8]);
 IF candidate->>'status'<>
  'FINAL_LOOP_PARENT_GITHUB_EFFECT_UNCERTAIN_READBACK_ONLY'
 THEN RAISE EXCEPTION 'SEPARATE_VERIFIER_CANNOT_READ_PENDING: %',candidate;END IF;
 settled:=public.reality_record_final_loop_parent_settlement_v1(
  (claim->>'delivery_id')::uuid,
  (claim->>'claim_id')::uuid,v_runs[8],'{}'::jsonb);
 IF settled->>'original_job_completed'='true' THEN
  RAISE EXCEPTION 'MISSING_PROVIDER_EVIDENCE_FALSE_SETTLEMENT';END IF;
 SELECT phase INTO v_original_phase
 FROM reality_internal.riley_pr_review_originals_v1
 WHERE original_work_id=p.original_work_id;
 IF v_original_phase<>'BLOCKED' THEN
  RAISE EXCEPTION 'UNVERIFIED_GITHUB_EFFECT_MUTATED_NATIVE_PARENT';END IF;
 -- Synthetic provider evidence: NO REAL GITHUB COMMENT WAS PUBLISHED.
 v_evidence:=jsonb_build_object(
  'schema','reality-final-loop-independent-github-parent-verification-v1',
  'delivery_id',claim->>'delivery_id',
  'publication_claim_id',claim->>'claim_id',
  'verifier_worker_run_id',v_runs[8],
  'parent_original_work_id',p.original_work_id,
  'source_ref',p.source_ref,'source_head_sha',repeat('f',40),
  'source_manifest_sha256',v_source_sha,
  'body_sha256',claim->>'delivery_body_sha256',
  'approval_receipt_sha256',pub->>'publication_approval_receipt_sha256',
  'comment_id',v_comment::text,
  'provider_comment_url',p.source_ref||'#issuecomment-'||v_comment::text,
  'provider_actor_id','12345','authenticated_actor_id','12345',
  'provider_comment_created_at',to_char(clock_timestamp() AT TIME ZONE 'UTC',
   'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'independent_provider_readback',true,
  'full_comment_body_verified',true,'source_head_current',true,
  'authenticated_writer_verified',true,'provider_comment_unique',true,
  'external_effect_performed',true,'production_changed',false);
 settled:=public.reality_record_final_loop_parent_settlement_v1(
  (claim->>'delivery_id')::uuid,
  (claim->>'claim_id')::uuid,v_runs[8],v_evidence);
 IF settled->>'status'<>
   'FINAL_LOOP_PARENT_ORIGINAL_AND_UNIVERSE_ATOMICALLY_SETTLED'
  OR settled->>'universe_reconciled'<>'true'
  OR settled->>'original_job_completed'<>'true'
 THEN RAISE EXCEPTION 'FULL_PARENT_ATOMIC_SETTLEMENT_REJECTED: %',settled;END IF;
 readback:=public.reality_read_final_loop_parent_settlement_v1(
  p.owner_id,p.original_work_id);
 IF readback->>'status'<>
  'FINAL_LOOP_PARENT_AND_UNIVERSE_INDEPENDENT_READBACK_SETTLED'
  OR readback->>'original_job_completed'<>'true'
  OR readback->>'universe_reconciled'<>'true'
 THEN RAISE EXCEPTION 'UNIVERSE_POSTSETTLEMENT_READBACK_NOT_VERIFIED: %',readback;END IF;
 settled:=public.reality_record_final_loop_parent_settlement_v1(
  (claim->>'delivery_id')::uuid,
  (claim->>'claim_id')::uuid,v_runs[8],v_evidence);
 IF settled->>'original_job_completed'='true' THEN
  RAISE EXCEPTION 'DUPLICATE_SETTLEMENT_REPLAYED';END IF;
 SELECT count(*) INTO v_goal_count FROM public.universe_events e
 WHERE e.continuity_root_id=p.shift_id AND e.worldline_id=plan
  AND e.epistemic_status='VERIFIED';
 IF v_goal_count<>2 THEN
  RAISE EXCEPTION 'UNIVERSE_LINEAGE_DUPLICATED_OR_MISSING';END IF;
END $test$;
SELECT 'SYNTHETIC_PARENT_GOAL_CHILD_INTEGRATION_PUBLICATION_UNIVERSE_SETTLEMENT_ROLLED_BACK'
 AS result;
