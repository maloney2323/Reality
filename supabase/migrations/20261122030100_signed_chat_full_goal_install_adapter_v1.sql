-- Source-family adapter for the existing signed Chat capability queue.
-- No fabricated legacy issue, goal transition, owner approval or provider effect.
-- The existing generalized installer, owner card and independent postinstall
-- broker consume these exact readbacks. Authority is a separate one-use click.
create or replace function reality_internal.signed_chat_goal_active_shift_v1(p_owner uuid,p_shift uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id and w.plan_fingerprint=s.plan_fingerprint
 where s.owner_id=p_owner and s.shift_id=p_shift and s.closed_at is null
 and s.authorized_at is not null and s.status in ('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
 and s.planned_start_at<=clock_timestamp() and s.planned_end_at>clock_timestamp()
 and w.state='ACTIVE')
$$;
revoke all on function reality_internal.signed_chat_goal_active_shift_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function reality_internal.signed_chat_goal_active_shift_v1(uuid,uuid) to service_role;

create or replace function reality_internal.signed_chat_goal_context_v1(p_trigger uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q reality_internal.genuine_capability_queue_v1%rowtype; h record; c jsonb; v jsonb; sy jsonb; rr jsonb;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_CHAT_GOAL_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger and source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 and capability_id='reality.chat-original.full-goal-installer-adapter-v1'
 and recovery_spec->'required_interfaces' @> '["existing-chat-source-to-governed-development","independent-full-original-goal-feature-acceptance","compatible-same-original-preview-installer","separate-exact-owner-install-authorization","independent-provider-effect-and-final-universe-reconciliation"]'::jsonb
 and phase='SIGNED_CHAT_RECOVERY_CANDIDATE_QUARANTINED';
 if not found then return null;end if;
 select w.*,m.content into h from reality_internal.chat_work_handoffs_v1 w
 join public.reality_chat_messages m on m.id=w.message_id and m.role='user' and m.user_id=w.owner_id
  and m.conversation_id=w.conversation_id and m.request_id=w.request_id
 where w.message_id=q.source_message_id and w.owner_id=q.owner_id and w.conversation_id=q.conversation_id
  and w.message_sha256=q.source_sha256 and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(m.content,'UTF8')),'hex')
  and w.development->>'original_work_id'=q.original_work_id and w.development->>'phase'='CI_VERIFIED'
  and w.development->>'installation_authorized'='false' and w.development->>'production_changed'='false'
  and w.development->'evidence'->>'goal_gap_receipt_sha256'=q.blocker_receipt_sha256;
 if not found then return null;end if;
 c:=q.qualified_candidate;v:=c->'provider_proof';sy:=q.qualification_receipt->'syntax_proof';rr:=q.qualification_receipt->'target_review';
 if q.recovery_spec_sha256 is distinct from 'sha256:'||pg_catalog.encode(extensions.digest(q.recovery_spec::text,'sha256'),'hex')
 or c->>'candidate_sha256' is distinct from 'sha256:'||pg_catalog.encode(extensions.digest((c-array['candidate_sha256','provider_proof','quarantine_receipt_sha256'])::text,'sha256'),'hex')
 or c->>'original_work_id' is distinct from q.original_work_id or c->>'spec_sha256' is distinct from q.recovery_spec_sha256
 or c->>'blocker_receipt_sha256' is distinct from q.blocker_receipt_sha256
 or q.quarantine_receipt_sha256 is distinct from 'sha256:'||pg_catalog.encode(extensions.digest(v::text,'sha256'),'hex')
 or c->>'quarantine_receipt_sha256' is distinct from q.quarantine_receipt_sha256
 or v->>'candidate_sha256' is distinct from c->>'candidate_sha256'
 or v->>'original_work_id' is distinct from q.original_work_id or v->>'trigger_id' is distinct from q.trigger_id::text
 or v->>'source_sha256' is distinct from q.source_sha256 or v->>'spec_sha256' is distinct from q.recovery_spec_sha256
 or v->>'target_review_receipt_sha256' is distinct from q.qualification_receipt->>'target_review_receipt_sha256'
 or q.qualification_receipt->>'target_review_receipt_sha256' is distinct from 'sha256:'||pg_catalog.encode(extensions.digest(rr::text,'sha256'),'hex')
 or rr->>'target_in_graph' is distinct from 'true' or rr->>'candidate_sha256' is distinct from c->>'candidate_sha256'
 or q.qualification_receipt->>'syntax_receipt_sha256' is distinct from 'sha256:'||pg_catalog.encode(extensions.digest(sy::text,'sha256'),'hex')
 or sy->>'candidate' is distinct from 'VALID_SYNTAX' or sy->>'candidate_sha256' is distinct from c->>'candidate_sha256'
 or sy->>'candidate_executed' is distinct from 'false'
 or coalesce(sy->>'proposed_sha256','') !~ '^sha256:[a-f0-9]{64}$'
 or coalesce(c->>'target_path','') !~ '^(src/|api/reality/)[A-Za-z0-9_/-]+[.]js$'
 or c->>'target_path' like '%..%' or c->>'target_path' like '%//%'
 or coalesce(v->>'github_commit_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(v->>'source_commit_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(c->>'base_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(v->>'source_blob_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(c->>'source_blob_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(v->>'branch','') !~ '^reality/chat-recovery/[a-f0-9-]{36}(-feature-r[1-9][0-9]*)?(-syntax-r1)?$'
 or coalesce(v->>'pr_number','') !~ '^[1-9][0-9]*$'
 or v->>'installation_authorized' is distinct from 'false' or v->>'original_job_completed' is distinct from 'false'
 or v->>'source_installed' is distinct from 'false' or v->>'production_changed' is distinct from 'false'
 then return null;end if;
 return pg_catalog.jsonb_build_object('source_family','SIGNED_CHAT_DEVELOPMENT_RECOVERY',
  'attempt_id',q.trigger_id,'owner_id',q.owner_id,'original_work_id',q.original_work_id,
  'source_message_id',q.source_message_id,'source_ref',q.source_ref,'source_sha256',q.source_sha256,
  'conversation_id',q.conversation_id,'source_original_shift_id',h.shift_id,
  'source_proof_sha256',q.blocker_receipt_sha256,'spec_sha256',q.recovery_spec_sha256,
  'candidate_sha256',c->>'candidate_sha256','candidate_commit_sha',v->>'github_commit_sha',
  'source_commit_sha',v->>'source_commit_sha','candidate_artifact_sha256',sy->>'proposed_sha256',
  'base_sha',c->>'base_sha','target_path',c->>'target_path',
  'expected_preinstall_blob_sha',c->>'source_blob_sha','expected_installed_blob_sha',v->>'source_blob_sha',
  'candidate_branch',v->>'branch','candidate_pr_number',(v->>'pr_number')::bigint,
  'quarantine_receipt_sha256',q.quarantine_receipt_sha256,'syntax_receipt_sha256',q.qualification_receipt->>'syntax_receipt_sha256',
  'target_review_receipt_sha256',q.qualification_receipt->>'target_review_receipt_sha256',
  'goal_install',q.qualification_receipt->'goal_install',
  'installation_authorized',false,'original_job_completed',coalesce(h.development->>'original_job_completed'='true',false),'production_changed',false);
end $$;
revoke all on function reality_internal.signed_chat_goal_context_v1(uuid) from public,anon,authenticated;
grant execute on function reality_internal.signed_chat_goal_context_v1(uuid) to service_role;

create or replace function public.reality_read_signed_chat_goal_acceptance_scope_v1(p_shift_id uuid,p_worker_run_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare sh record; q record; context jsonb;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_GOAL_ACCEPTANCE_SERVICE_ONLY';end if;
 select s.owner_id,r.started_at into sh from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 r on r.run_id=p_worker_run_id
 where s.shift_id=p_shift_id and reality_internal.signed_chat_goal_active_shift_v1(s.owner_id,s.shift_id)
  and pulse.last_worker_status='WAKE_RECEIVED' and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and r.status='STARTED' and r.started_at>clock_timestamp()-interval '3 minutes';
 if not found then return pg_catalog.jsonb_build_object('status','SIGNED_GOAL_ACCEPTANCE_NO_CURRENT_SIGNED_WORKER');end if;
 select g.trigger_id into q from reality_internal.genuine_capability_queue_v1 g
 where g.owner_id=sh.owner_id and g.source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 and g.phase='SIGNED_CHAT_RECOVERY_CANDIDATE_QUARANTINED' and g.updated_at<sh.started_at
 and not (coalesce(g.qualification_receipt,'{}'::jsonb)?'goal_install')
 order by g.updated_at,g.trigger_id limit 1;
 if not found then return pg_catalog.jsonb_build_object('status','NO_SIGNED_CHAT_FULL_GOAL_ACCEPTANCE_DUE');end if;
 context:=reality_internal.signed_chat_goal_context_v1(q.trigger_id);
 if context is null or context->>'original_job_completed' is distinct from 'false' then
  return pg_catalog.jsonb_build_object('status','SIGNED_CHAT_GOAL_ORIGINAL_LINEAGE_UNVERIFIED');end if;
 return context||pg_catalog.jsonb_build_object('status','SIGNED_CHAT_FULL_GOAL_ACCEPTANCE_ELIGIBLE','shift_id',p_shift_id,'worker_run_id',p_worker_run_id);
end $$;
revoke all on function public.reality_read_signed_chat_goal_acceptance_scope_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reality_read_signed_chat_goal_acceptance_scope_v1(uuid,uuid) to service_role;

-- Append to the canonical immutable Universe, using its existing canonical
-- serializer. This is an observation of an EXISTING authenticated original,
-- never a synthetic owner goal transition. The outcome uses that same root.
create or replace function reality_internal.append_signed_chat_original_event_v1(
 p_context jsonb,p_parent uuid,p_event_kind text,p_payload jsonb,p_refs jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare n uuid; prior public.universe_events%rowtype; root uuid; world uuid; entity uuid;
 iso text; t timestamptz; provenance jsonb; basis jsonb; ch text; lh text;
begin
 if current_user<>'service_role' or p_event_kind not in ('OBSERVATION','OUTCOME')
 or p_payload->>'original_work_id' is distinct from p_context->>'original_work_id'
 or p_payload->>'owner_id' is distinct from p_context->>'owner_id'
 or p_payload->>'production_changed' is distinct from 'false'
 then raise exception 'SIGNED_GOAL_UNIVERSE_EXACT_SCOPE_REQUIRED';end if;
 root:=(p_context->>'source_message_id')::uuid;world:=(p_context->>'conversation_id')::uuid;entity:=root;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('reality:outcome:v2:'||root::text||':'||world::text,0));
 if p_parent is null then
  if p_event_kind<>'OBSERVATION' or exists(select 1 from public.universe_events e where e.continuity_root_id=root and e.worldline_id=world)
  then raise exception 'SIGNED_GOAL_UNIVERSE_SOURCE_ROOT_ALREADY_EXISTS';end if;
 else
  select * into prior from public.universe_events where event_id=p_parent and continuity_root_id=root and worldline_id=world
   and payload->>'original_work_id'=p_context->>'original_work_id' and payload->>'owner_id'=p_context->>'owner_id';
  if not found or p_event_kind<>'OUTCOME' or prior.epistemic_status<>'VERIFIED'
  or exists(select 1 from public.universe_events e where e.parent_event_id=p_parent)
  then raise exception 'SIGNED_GOAL_UNIVERSE_PRIOR_TIP_UNVERIFIED';end if;
 end if;
 t:=pg_catalog.clock_timestamp();iso:=pg_catalog.to_char(t at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 provenance:=pg_catalog.jsonb_build_object('source','SIGNED_CHAT_EXISTING_ORIGINAL_LEDGER_ADAPTER',
  'principal_id',p_context->>'owner_id','conversation_id',p_context->>'conversation_id',
  'source_message_id',p_context->>'source_message_id','signed_source_sha256',p_context->>'source_sha256',
  'continuity_spine',pg_catalog.jsonb_build_object('version','reality-continuity-spine-v2.1','source_event_id',p_parent,
   'prior_lineage_hash',prior.lineage_hash,'transformation_receipt_id',null));
 ch:=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(p_payload),'UTF8'),'sha256'),'hex');
 basis:=pg_catalog.jsonb_build_object('spine_version','reality-continuity-spine-v2.1','continuity_root_id',root::text,'worldline_id',world::text,
  'parent_event_id',p_parent,'prior_lineage_hash',prior.lineage_hash,'stage',p_event_kind,'entity_id',entity::text,
  'evidence_refs',p_refs,'transformation_receipt_id',null,'effective_time',iso,'assertion_time',iso,
  'epistemic_status','VERIFIED','payload',p_payload,'provenance',provenance);
 lh:=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(basis),'UTF8'),'sha256'),'hex');
 insert into public.universe_events(event_id,event_kind,entity_type,entity_id,continuity_root_id,worldline_id,parent_event_id,
  effective_time,assertion_time,epistemic_status,payload,evidence_refs,provenance,content_hash,lineage_hash)
 values(pg_catalog.gen_random_uuid(),p_event_kind,case when p_event_kind='OUTCOME' then 'reality_verified_original_work_settlement_v2' else 'reality_signed_chat_existing_original_work_v1' end,
  entity,root,world,p_parent,t,t,'VERIFIED',p_payload,p_refs,provenance,ch,lh) returning event_id into n;
 return n;
end $$;
revoke all on function reality_internal.append_signed_chat_original_event_v1(jsonb,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function reality_internal.append_signed_chat_original_event_v1(jsonb,uuid,text,jsonb,jsonb) to service_role;

create or replace function public.reality_record_signed_chat_goal_acceptance_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_attempt_id uuid,p_proof jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare ctx jsonb; q reality_internal.genuine_capability_queue_v1%rowtype; receipt text; event_id uuid; v jsonb; revised jsonb; revised_hash text; ep int;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_GOAL_ACCEPTANCE_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1 where trigger_id=p_attempt_id for update;
 ctx:=public.reality_read_signed_chat_goal_acceptance_scope_v1(p_shift_id,p_worker_run_id);
 if ctx->>'status' is distinct from 'SIGNED_CHAT_FULL_GOAL_ACCEPTANCE_ELIGIBLE' or ctx->>'attempt_id' is distinct from p_attempt_id::text
 or jsonb_typeof(p_proof) is distinct from 'object'
 or p_proof->>'candidate_sha256' is distinct from ctx->>'candidate_sha256'
 or p_proof->>'candidate_commit_sha' is distinct from ctx->>'candidate_commit_sha'
 or p_proof->>'candidate_artifact_sha256' is distinct from ctx->>'candidate_artifact_sha256'
 or p_proof->>'quarantine_receipt_sha256' is distinct from ctx->>'quarantine_receipt_sha256'
 or p_proof->>'base_sha' is distinct from ctx->>'base_sha'
 or p_proof->>'expected_preinstall_blob_sha' is distinct from ctx->>'expected_preinstall_blob_sha'
 or p_proof->>'expected_installed_blob_sha' is distinct from ctx->>'expected_installed_blob_sha'
 or p_proof->>'original_work_id' is distinct from ctx->>'original_work_id'
 or p_proof->>'workflow' is distinct from '.github/workflows/reality-signed-chat-full-goal-acceptance-v1.yml'
 or p_proof->>'isolation' is distinct from 'DOCKER_NETWORK_NONE_READONLY_NO_SECRETS'
 or coalesce(p_proof->>'workflow_blob_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(p_proof->>'functional_suite_blob_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(p_proof->>'functional_run_id','') !~ '^[1-9][0-9]{4,}$'
 or coalesce(p_proof->>'functional_job_id','') !~ '^[1-9][0-9]{4,}$'
 or p_proof->>'original_job_completed' is distinct from 'false'
 or p_proof->>'installation_authorized' is distinct from 'false'
 or p_proof->>'production_changed' is distinct from 'false'
 then raise exception 'SIGNED_GOAL_ACCEPTANCE_EXACT_INDEPENDENT_PROOF_REQUIRED';end if;
 receipt:='sha256:'||pg_catalog.encode(extensions.digest(p_proof::text,'sha256'),'hex');
 if p_proof->>'verdict'='FEATURE_TEST_FAILED' then
  ep:=coalesce((q.recovery_spec->>'feature_revision_epoch')::int,0);
  if ep>=4 then
   update reality_internal.genuine_capability_queue_v1 set qualification_receipt=qualification_receipt||pg_catalog.jsonb_build_object(
    'goal_install',pg_catalog.jsonb_build_object('phase','INDEPENDENT_FEATURE_FAILURE_REQUIRES_REINVESTIGATION','proof',p_proof,'receipt_sha256',receipt,'shift_id',p_shift_id)),updated_at=clock_timestamp()
   where trigger_id=p_attempt_id;
   return pg_catalog.jsonb_build_object('status','SIGNED_CHAT_FEATURE_FAILURE_NEEDS_FRESH_INVESTIGATION','original_work_id',q.original_work_id,'receipt_sha256',receipt,'original_job_completed',false,'installation_authorized',false,'production_changed',false);
  end if;
  -- This candidate was quarantined, never installed; a distinct corrected
  -- candidate can be synthesized from the exact failed functional contract.
  revised:=q.recovery_spec||pg_catalog.jsonb_build_object('feature_revision_epoch',ep+1,'syntax_revision_epoch',0,
   'prior_feature_failure_receipt_sha256',receipt,'prior_feature_failed_candidate_sha256',ctx->>'candidate_sha256',
   'prior_feature_failed_run_id',p_proof->>'functional_run_id','prior_feature_failed_target_path',ctx->>'target_path',
   'prior_feature_test_contract','SIGNED_CHAT_FULL_GOAL_FUNCTIONAL_ACCEPTANCE','full_goal_accepted',false,
   'installation_authorized',false,'original_job_completed',false,'production_changed',false);
  revised_hash:='sha256:'||pg_catalog.encode(extensions.digest(revised::text,'sha256'),'hex');
  update reality_internal.genuine_capability_queue_v1 set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
   claim_id=null,claim_expires_at=null,qualified_candidate=null,quarantine_receipt_sha256=null,
   recovery_spec=revised,recovery_spec_sha256=revised_hash,frozen_suite_ref='recovery-spec:'||revised_hash,
   qualification_receipt=(qualification_receipt-array['target_review','target_review_receipt_sha256','target_review_lease','target_reviewed_at',
    'target_review_retry_count','target_review_last_failure','target_review_failure_receipt_sha256','target_review_failure_history','target_review_next_action',
    'last_target_rejection','continuity_source_probe','continuity_source_probe_sha256','publish_fenced_at','publish_candidate_sha256','syntax_proof','syntax_receipt_sha256','syntax_next_action','goal_install'])
   ||pg_catalog.jsonb_build_object('prior_feature_attempts',coalesce(qualification_receipt->'prior_feature_attempts','[]'::jsonb)||
    pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('candidate',q.qualified_candidate,'spec',q.recovery_spec,
     'receipt',q.qualification_receipt-'prior_feature_attempts','proof',p_proof,'proof_sha256',receipt,'quarantine_receipt_sha256',q.quarantine_receipt_sha256)),
    'feature_revision_epoch',ep+1,'revised_spec_sha256',revised_hash),
   updated_at=clock_timestamp() where trigger_id=p_attempt_id;
  return pg_catalog.jsonb_build_object('status','SIGNED_CHAT_FULL_GOAL_FAILURE_RECOMPILED_SAME_ORIGINAL','original_work_id',q.original_work_id,'receipt_sha256',receipt,'original_job_completed',false,'installation_authorized',false,'production_changed',false);
 end if;
 if p_proof->>'verdict' is distinct from 'FUNCTIONAL_ACCEPTANCE_PASSED'
 or coalesce(p_proof->>'integration_run_id','') !~ '^[1-9][0-9]{4,}$'
 or coalesce(p_proof->>'integration_job_id','') !~ '^[1-9][0-9]{4,}$'
 or p_proof->>'integration_run_id'=p_proof->>'functional_run_id'
 or coalesce(p_proof->>'target_branch','') !~ '^(repair|reality)/[A-Za-z0-9/_-]{10,135}$'
 or p_proof->>'target_branch' like '%..%' or p_proof->>'target_branch' like '%//%'
 or p_proof->>'target_branch' like 'reality/chat-recovery/%' or p_proof->>'target_branch' like 'reality/chat-development/%' or p_proof->>'target_branch' like 'reality/riley/%'
 or p_proof->>'target_base_sha' is distinct from ctx->>'base_sha'
 or coalesce(p_proof->>'vercel_status_id','') !~ '^[1-9][0-9]*$'
 or coalesce(p_proof->>'vercel_app_check_id','') !~ '^[1-9][0-9]*$'
 or coalesce(p_proof->>'vercel_app_id','') !~ '^[1-9][0-9]*$'
 or p_proof->>'independent_transport_verified' is distinct from 'true'
 then raise exception 'SIGNED_GOAL_PREINSTALL_CONTRACT_NOT_VERIFIED';end if;
 event_id:=reality_internal.append_signed_chat_original_event_v1(ctx,null,'OBSERVATION',
  pg_catalog.jsonb_build_object('schema','reality-existing-signed-chat-original-observation-v1',
   'original_work_id',q.original_work_id,'owner_id',q.owner_id,'source_ref',q.source_ref,'source_sha256',q.source_sha256,
   'goal_gap_receipt_sha256',q.blocker_receipt_sha256,'quarantine_receipt_sha256',q.quarantine_receipt_sha256,
   'independent_functional_acceptance_receipt_sha256',receipt,'original_job_completed',false,
   'owner_authorized_installation',false,'production_changed',false),
  pg_catalog.jsonb_build_array(q.source_ref,'github:actions:run:'||(p_proof->>'functional_run_id'),'github:actions:run:'||(p_proof->>'integration_run_id')));
 v:=pg_catalog.jsonb_build_object('phase','READY_FOR_EXACT_OWNER_APPROVAL','shift_id',p_shift_id,'worker_run_id',p_worker_run_id,
  'proof',p_proof,'proof_sha256',receipt,'original_event_id',event_id,'approval_receipt_id',null,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false,'staged_at',clock_timestamp());
 update reality_internal.genuine_capability_queue_v1 set qualification_receipt=qualification_receipt||pg_catalog.jsonb_build_object('goal_install',v),updated_at=clock_timestamp()
 where trigger_id=p_attempt_id;
 return pg_catalog.jsonb_build_object('status','SIGNED_CHAT_FULL_GOAL_FUNCTIONALLY_QUALIFIED_EXACT_OWNER_REVIEW_READY',
  'original_work_id',q.original_work_id,'attempt_id',p_attempt_id,'receipt_sha256',receipt,'universe_original_event_id',event_id,
  'owner_approval_ready',true,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
end $$;
revoke all on function public.reality_record_signed_chat_goal_acceptance_v1(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reality_record_signed_chat_goal_acceptance_v1(uuid,uuid,uuid,jsonb) to service_role;

create or replace function reality_internal.signed_chat_install_scope_v1(p_attempt_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c jsonb; a jsonb; p jsonb; ph text;
begin
 c:=reality_internal.signed_chat_goal_context_v1(p_attempt_id);a:=c->'goal_install';p:=a->'proof';ph:=a->>'phase';
 if c is null or a is null or a->>'proof_sha256' is distinct from 'sha256:'||pg_catalog.encode(extensions.digest(p::text,'sha256'),'hex')
 or p->>'verdict' is distinct from 'FUNCTIONAL_ACCEPTANCE_PASSED' or p->>'candidate_sha256' is distinct from c->>'candidate_sha256'
 or p->>'candidate_commit_sha' is distinct from c->>'candidate_commit_sha' or p->>'candidate_artifact_sha256' is distinct from c->>'candidate_artifact_sha256'
 or not exists(select 1 from public.universe_events e where e.event_id=(a->>'original_event_id')::uuid
  and e.payload->>'original_work_id'=c->>'original_work_id' and e.payload->>'owner_id'=c->>'owner_id'
  and e.payload->>'independent_functional_acceptance_receipt_sha256'=a->>'proof_sha256' and e.epistemic_status='VERIFIED')
 then return null;end if;
 if ph not in ('READY_FOR_EXACT_OWNER_APPROVAL','OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED','ORIGINAL_SETTLED') or ph is null then return null;end if;
 if ph='ORIGINAL_SETTLED' and (c->>'original_job_completed' is distinct from 'true'
 or a->>'final_receipt_sha256' is distinct from 'sha256:'||pg_catalog.encode(extensions.digest((a->'final_proof')::text,'sha256'),'hex')
 or not exists(select 1 from public.universe_events e where e.event_id=(a->>'final_receipt_id')::uuid and e.parent_event_id=(a->>'original_event_id')::uuid
  and e.event_kind='OUTCOME' and e.epistemic_status='VERIFIED' and e.payload->>'original_work_id'=c->>'original_work_id'
  and e.payload->>'owner_id'=c->>'owner_id' and e.payload->>'original_job_completed'='true' and e.payload->>'provider_outcome_digest'=a->>'final_receipt_sha256'))
 then return null;end if;
 if ph<>'ORIGINAL_SETTLED' and not reality_internal.signed_chat_goal_active_shift_v1((c->>'owner_id')::uuid,(a->>'shift_id')::uuid)
 then return null;end if;
 if ph in ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED','ORIGINAL_SETTLED')
 and (a->>'approval_receipt_id' is null or a->'approval'->>'owner_id' is distinct from c->>'owner_id'
 or a->'approval'->>'original_work_id' is distinct from c->>'original_work_id'
 or a->'approval'->>'candidate_sha256' is distinct from c->>'candidate_sha256'
 or a->'approval'->>'proof_sha256' is distinct from a->>'proof_sha256'
 or a->'approval'->>'target_base_sha' is distinct from p->>'target_base_sha'
 or a->'approval'->>'target_branch' is distinct from p->>'target_branch'
 or a->'approval'->>'candidate_commit_sha' is distinct from c->>'candidate_commit_sha'
 or a->'approval'->>'artifact_sha256' is distinct from c->>'candidate_artifact_sha256'
 or a->>'approval_sha256' is distinct from 'sha256:'||pg_catalog.encode(extensions.digest((a->'approval')::text,'sha256'),'hex')
 or a->'approval'->>'approval_receipt_id' is distinct from a->>'approval_receipt_id'
 or a->'approval'->>'origin' is distinct from 'AUTHENTICATED_OWNER_EXPLICIT_ACTION'
 or a->'approval'->>'production_changed' is distinct from 'false')
 then return null;end if;
 return c-'goal_install'||pg_catalog.jsonb_build_object('phase',ph,'shift_id',a->>'shift_id',
  'target_branch',p->>'target_branch','target_base_sha',p->>'target_base_sha',
  'exact_install_target_branch',p->>'target_branch','approval_receipt_id',a->'approval_receipt_id',
  'expected_parent_commit_sha',a->>'expected_parent_commit_sha','installed_commit_sha',a->>'installed_commit_sha',
  'installed_source_blob_sha',a->>'installed_source_blob_sha',
  'independent_frozen_run_id',(p->>'functional_run_id')::bigint,'frozen_candidate_run_id',(p->>'functional_run_id')::bigint,
  'integrated_test_run_id',(p->>'integration_run_id')::bigint,'integrated_test_commit_sha',c->>'candidate_commit_sha',
  'workflow_blob_sha',p->>'workflow_blob_sha','functional_suite_blob_sha',p->>'functional_suite_blob_sha',
  'proof_sha256',a->>'proof_sha256','original_event_id',a->>'original_event_id',
  'isolated_github_write_verified',true,'preview_auto_deploy_verified',true,
  'same_original_execution_and_settlement_contract_verified',true,
  'owner_approval_ready',ph='READY_FOR_EXACT_OWNER_APPROVAL',
  'installation_authorized',ph in ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED','ORIGINAL_SETTLED'),
  'original_job_completed',ph='ORIGINAL_SETTLED','final_receipt_id',a->>'final_receipt_id',
  'roi_status','NOT_MEASURED','production_installation_authorized',false,'fenced_recovery_observation',a->'fenced_recovery_observation',
  'final_receipt_sha256',a->>'final_receipt_sha256','production_changed',false);
end $$;
revoke all on function reality_internal.signed_chat_install_scope_v1(uuid) from public,anon,authenticated;
grant execute on function reality_internal.signed_chat_install_scope_v1(uuid) to service_role;

create or replace function public.reality_read_signed_chat_general_install_card_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q record; c jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then raise exception 'SIGNED_GOAL_CARD_OWNER_SERVICE_REQUIRED';end if;
 for q in select trigger_id from reality_internal.genuine_capability_queue_v1
 where owner_id=p_owner_id and source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 and qualification_receipt->'goal_install'->>'phase' in ('READY_FOR_EXACT_OWNER_APPROVAL','OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED','ORIGINAL_SETTLED')
 order by (qualification_receipt->'goal_install'->>'phase'='ORIGINAL_SETTLED'),updated_at desc loop
  c:=reality_internal.signed_chat_install_scope_v1(q.trigger_id);
  if c is not null then return c||pg_catalog.jsonb_build_object('status','GENERALIZED_VERIFIED_ORIGINAL_INSTALL_REVIEW');end if;
 end loop;
 return pg_catalog.jsonb_build_object('status','NO_CURRENT_VERIFIED_ORIGINAL_INSTALL_REVIEW','owner_approval_ready',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
end $$;
revoke all on function public.reality_read_signed_chat_general_install_card_v1(uuid) from public,anon,authenticated;
grant execute on function public.reality_read_signed_chat_general_install_card_v1(uuid) to service_role;

create or replace function public.reality_owner_approve_signed_chat_general_install_v1(
 p_owner_id uuid,p_original_work_id text,p_attempt_id uuid,p_candidate_commit_sha text,p_artifact_sha256 text,p_intent text,p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q reality_internal.genuine_capability_queue_v1%rowtype;c jsonb;a jsonb;ap uuid;
begin
 if current_user<>'service_role' or p_request_id is null or p_intent is distinct from 'OWNER_APPROVE_EXACT_INDEPENDENTLY_VERIFIED_ISOLATED_REPAIR'
 then raise exception 'SIGNED_GOAL_EXACT_AUTHENTICATED_OWNER_ACTION_REQUIRED';end if;
 select * into q from reality_internal.genuine_capability_queue_v1 where trigger_id=p_attempt_id and owner_id=p_owner_id for update;
 if not found then raise exception 'SIGNED_GOAL_OWNER_MISMATCH';end if;
 c:=reality_internal.signed_chat_install_scope_v1(p_attempt_id);a:=q.qualification_receipt->'goal_install';
 if c is null or c->>'original_work_id' is distinct from p_original_work_id
 or c->>'candidate_commit_sha' is distinct from p_candidate_commit_sha or c->>'candidate_artifact_sha256' is distinct from p_artifact_sha256
 or c->>'phase' is distinct from 'READY_FOR_EXACT_OWNER_APPROVAL' or c->>'owner_approval_ready' is distinct from 'true'
 or c->>'installation_authorized' is distinct from 'false' or c->>'original_job_completed' is distinct from 'false'
 then raise exception 'SIGNED_GOAL_EXACT_REVIEW_CHANGED_OR_ALREADY_APPROVED';end if;
 ap:=pg_catalog.gen_random_uuid();
 a:=a||pg_catalog.jsonb_build_object('phase','OWNER_APPROVED','approval_receipt_id',ap,'installation_authorized',true,'approved_at',clock_timestamp(),
  'approval',pg_catalog.jsonb_build_object('origin','AUTHENTICATED_OWNER_EXPLICIT_ACTION','owner_id',p_owner_id,'request_id',p_request_id,
   'approval_receipt_id',ap,'original_work_id',p_original_work_id,'candidate_sha256',c->>'candidate_sha256','candidate_commit_sha',p_candidate_commit_sha,
   'artifact_sha256',p_artifact_sha256,'proof_sha256',c->>'proof_sha256','target_base_sha',c->>'target_base_sha','target_branch',c->>'target_branch','production_changed',false));
 a:=a||pg_catalog.jsonb_build_object('approval_sha256','sha256:'||pg_catalog.encode(extensions.digest((a->'approval')::text,'sha256'),'hex'));
 update reality_internal.genuine_capability_queue_v1 set qualification_receipt=pg_catalog.jsonb_set(qualification_receipt,'{goal_install}',a),updated_at=clock_timestamp()
 where trigger_id=p_attempt_id;
 return pg_catalog.jsonb_build_object('status','GENERAL_ORIGINAL_OWNER_APPROVED_AUTO_CONTINUATION','original_work_id',p_original_work_id,'shift_id',c->>'shift_id',
  'attempt_id',p_attempt_id,'candidate_commit_sha',p_candidate_commit_sha,'artifact_sha256',p_artifact_sha256,'approval_id',ap,'approval_recorded',true,
  'installation_authorized',true,'installation_completed',false,'original_job_completed',false,'production_changed',false,'no_third_confirmation',true);
end $$;
revoke all on function public.reality_owner_approve_signed_chat_general_install_v1(uuid,text,uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.reality_owner_approve_signed_chat_general_install_v1(uuid,text,uuid,text,text,text,uuid) to service_role;

create or replace function public.reality_read_signed_chat_install_scope_v1(p_postinstall boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q record; c jsonb; found_scope jsonb; n int:=0;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_GOAL_INSTALL_SERVICE_ONLY';end if;
 for q in select trigger_id from reality_internal.genuine_capability_queue_v1
 where source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 and (case when p_postinstall then qualification_receipt->'goal_install'->>'phase'='SOURCE_INSTALLED'
  else qualification_receipt->'goal_install'->>'phase' in ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED') end)
 order by updated_at loop
  c:=reality_internal.signed_chat_install_scope_v1(q.trigger_id);
  if c is not null and c->>'installation_authorized'='true' then n:=n+1;found_scope:=c;end if;
 end loop;
 if n<>1 then return pg_catalog.jsonb_build_object('status',case when p_postinstall then 'GENERAL_POSTINSTALL_NO_INSTALLED_ORIGINAL' else 'GENERAL_INSTALL_AWAITING_EXACT_OWNER_APPROVAL' end,'installation_authorized',false,'original_job_completed',false,'production_changed',false);end if;
 return found_scope||pg_catalog.jsonb_build_object('status',case when p_postinstall then 'GENERAL_POSTINSTALL_EXACT_ORIGINAL_PROVIDER_VERIFICATION_ELIGIBLE' else 'GENERAL_INSTALL_OWNER_APPROVED_SOURCE_SCOPE' end);
end $$;
revoke all on function public.reality_read_signed_chat_install_scope_v1(boolean) from public,anon,authenticated;
grant execute on function public.reality_read_signed_chat_install_scope_v1(boolean) to service_role;

create or replace function public.reality_claim_signed_chat_install_v1(p_attempt_id uuid,p_expected_head_sha text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q reality_internal.genuine_capability_queue_v1%rowtype;c jsonb;a jsonb;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_GOAL_INSTALL_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1 where trigger_id=p_attempt_id for update;
 c:=reality_internal.signed_chat_install_scope_v1(p_attempt_id);a:=q.qualification_receipt->'goal_install';
 if c is null or c->>'installation_authorized' is distinct from 'true' or c->>'original_job_completed' is distinct from 'false'
 then raise exception 'SIGNED_GOAL_INSTALL_OWNER_SCOPE_UNVERIFIED';end if;
 if c->>'phase'='INSTALL_INTENT_FENCED' then return pg_catalog.jsonb_build_object('status','GENERAL_INSTALL_INTENT_ALREADY_FENCED_READBACK_ONLY');end if;
 if c->>'phase' is distinct from 'OWNER_APPROVED' or p_expected_head_sha is distinct from c->>'target_base_sha'
 then raise exception 'SIGNED_GOAL_INSTALL_PREVIEW_HEAD_CHANGED_NO_WRITE';end if;
 a:=a||pg_catalog.jsonb_build_object('phase','INSTALL_INTENT_FENCED','expected_parent_commit_sha',p_expected_head_sha,'fenced_at',clock_timestamp());
 update reality_internal.genuine_capability_queue_v1 set qualification_receipt=pg_catalog.jsonb_set(qualification_receipt,'{goal_install}',a),updated_at=clock_timestamp() where trigger_id=p_attempt_id;
 return c||pg_catalog.jsonb_build_object('status','GENERAL_INSTALL_EXACT_ONCE_OWNER_APPROVED_SOURCE_WRITE_FENCED','phase','INSTALL_INTENT_FENCED',
  'expected_parent_commit_sha',p_expected_head_sha,'source_installed',false);
end $$;
revoke all on function public.reality_claim_signed_chat_install_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.reality_claim_signed_chat_install_v1(uuid,text) to service_role;

create or replace function public.reality_record_signed_chat_installed_source_v1(p_attempt_id uuid,p_installed_commit_sha text,p_source_blob_sha text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q reality_internal.genuine_capability_queue_v1%rowtype;c jsonb;a jsonb;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_GOAL_INSTALL_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1 where trigger_id=p_attempt_id for update;
 c:=reality_internal.signed_chat_install_scope_v1(p_attempt_id);a:=q.qualification_receipt->'goal_install';
 if c is null or c->>'phase' is distinct from 'INSTALL_INTENT_FENCED' or c->>'installation_authorized' is distinct from 'true'
 or coalesce(p_installed_commit_sha,'') !~ '^[a-f0-9]{40}$' or p_installed_commit_sha=c->>'expected_parent_commit_sha'
 or p_source_blob_sha is distinct from c->>'expected_installed_blob_sha'
 then raise exception 'SIGNED_GOAL_INSTALL_EXACT_PROVIDER_RECEIPT_REQUIRED';end if;
 a:=a||pg_catalog.jsonb_build_object('phase','SOURCE_INSTALLED','installed_commit_sha',p_installed_commit_sha,'installed_source_blob_sha',p_source_blob_sha,'installed_at',clock_timestamp());
 update reality_internal.genuine_capability_queue_v1 set qualification_receipt=pg_catalog.jsonb_set(qualification_receipt,'{goal_install}',a),updated_at=clock_timestamp() where trigger_id=p_attempt_id;
 return pg_catalog.jsonb_build_object('status','GENERAL_ORIGINAL_EXACT_SOURCE_INSTALLED_AWAITING_INDEPENDENT_SETTLEMENT','original_work_id',c->>'original_work_id',
  'shift_id',c->>'shift_id','installed_commit_sha',p_installed_commit_sha,'source_blob_sha',p_source_blob_sha,'source_installed',true,'original_job_completed',false,'production_changed',false);
end $$;
revoke all on function public.reality_record_signed_chat_installed_source_v1(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reality_record_signed_chat_installed_source_v1(uuid,text,text) to service_role;

create or replace function public.reality_record_signed_chat_goal_settlement_v1(p_attempt_id uuid,p_proof jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q reality_internal.genuine_capability_queue_v1%rowtype;c jsonb;a jsonb;receipt text;final_id uuid;payload jsonb;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_GOAL_SETTLEMENT_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1 where trigger_id=p_attempt_id for update;
 c:=reality_internal.signed_chat_install_scope_v1(p_attempt_id);a:=q.qualification_receipt->'goal_install';
 if c is null or c->>'phase' is distinct from 'SOURCE_INSTALLED'
 or c->>'installation_authorized' is distinct from 'true' or c->>'original_job_completed' is distinct from 'false'
 or p_proof->>'original_work_id' is distinct from c->>'original_work_id' or p_proof->>'attempt_id' is distinct from p_attempt_id::text
 or p_proof->>'approval_receipt_id' is distinct from c->>'approval_receipt_id'
 or p_proof->>'shift_id' is distinct from c->>'shift_id'
 or p_proof->>'installed_commit_sha' is distinct from c->>'installed_commit_sha'
 or p_proof->>'installed_source_blob_sha' is distinct from c->>'installed_source_blob_sha'
 or p_proof->>'workflow_blob_sha' is distinct from c->>'workflow_blob_sha'
 or p_proof->>'functional_suite_blob_sha' is distinct from c->>'functional_suite_blob_sha'
 or p_proof->>'frozen_candidate_run_id' is distinct from c->>'frozen_candidate_run_id'
 or p_proof->>'integration_run_id' is distinct from c->>'integrated_test_run_id'
 or coalesce(p_proof->>'original_acceptance_run_id','') !~ '^[1-9][0-9]{4,}$'
 or p_proof->>'original_acceptance_run_id' in (c->>'frozen_candidate_run_id',c->>'integrated_test_run_id')
 or coalesce(p_proof->>'vercel_status_id','') !~ '^[1-9][0-9]*$'
 or coalesce(p_proof->>'vercel_app_check_run_id','') !~ '^[1-9][0-9]*$'
 or coalesce(p_proof->>'vercel_app_id','') !~ '^[1-9][0-9]*$'
 or p_proof->>'independent_functional_postinstall_verified' is distinct from 'true'
 or p_proof->>'production_changed' is distinct from 'false'
 then raise exception 'SIGNED_GOAL_FINAL_PROVIDER_ACCEPTANCE_NOT_VERIFIED';end if;
 receipt:='sha256:'||pg_catalog.encode(extensions.digest(p_proof::text,'sha256'),'hex');
 payload:=pg_catalog.jsonb_build_object('schema','reality-signed-chat-original-final-receipt-v1','original_work_id',q.original_work_id,
  'owner_id',q.owner_id,'source_ref',q.source_ref,'source_sha256',q.source_sha256,'approval_receipt_id',c->>'approval_receipt_id',
  'installed_commit_sha',c->>'installed_commit_sha','candidate_artifact_sha256',c->>'candidate_artifact_sha256',
  'provider_outcome_digest',receipt,'provider_run_id',p_proof->>'original_acceptance_run_id',
  'independent_outcome_verified',true,'original_job_completed',true,'constitutional_phase','SETTLED','production_changed',false,'roi_status','NOT_MEASURED');
 final_id:=reality_internal.append_signed_chat_original_event_v1(c,(c->>'original_event_id')::uuid,'OUTCOME',payload,
  pg_catalog.jsonb_build_array(q.source_ref,'github:actions:run:'||(p_proof->>'original_acceptance_run_id'),'github:commit:'||(c->>'installed_commit_sha')));
 a:=a||pg_catalog.jsonb_build_object('phase','ORIGINAL_SETTLED','final_receipt_id',final_id,'final_receipt_sha256',receipt,'final_proof',p_proof,
   'original_job_completed',true,'settled_at',clock_timestamp());
 update reality_internal.genuine_capability_queue_v1 set qualification_receipt=pg_catalog.jsonb_set(qualification_receipt,'{goal_install}',a),updated_at=clock_timestamp()
 where trigger_id=p_attempt_id;
 update reality_internal.chat_work_handoffs_v1 set development=development||pg_catalog.jsonb_build_object('original_job_completed',true,
  'evidence',coalesce(development->'evidence','{}'::jsonb)||pg_catalog.jsonb_build_object('full_goal_feature_acceptance_verified',true,'feature_acceptance_verified',true,
   'compatible_install_adapter_verified',true,'exact_owner_install_approval_id',c->>'approval_receipt_id',
   'independent_final_receipt_id',final_id,'independent_final_receipt_sha256',receipt,'universe_outcome_event_id',final_id,
   'installed_commit_sha',c->>'installed_commit_sha','original_job_completed',true,'production_changed',false))
 where message_id=q.source_message_id and owner_id=q.owner_id and message_sha256=q.source_sha256 and development->>'original_work_id'=q.original_work_id
 and development->>'original_job_completed'='false';
 if not found then raise exception 'SIGNED_GOAL_ORIGINAL_CHAT_SETTLEMENT_DRIFT';end if;
 return pg_catalog.jsonb_build_object('status','GENERAL_ORIGINAL_INDEPENDENTLY_SETTLED_WITH_FINAL_RECEIPT','original_work_id',q.original_work_id,
  'shift_id',c->>'shift_id','approval_receipt_id',c->>'approval_receipt_id','installed_commit_sha',c->>'installed_commit_sha',
  'original_acceptance_run_id',(p_proof->>'original_acceptance_run_id')::bigint,'vercel_deployment_status_id',(p_proof->>'vercel_status_id')::bigint,
  'final_receipt_id',final_id,'final_receipt_sha256',receipt,'universe_outcome_event_id',final_id,'original_job_completed',true,
  'production_changed',false,'roi_verified',false,'roi_status','NOT_MEASURED','no_third_confirmation',true);
end $$;
revoke all on function public.reality_record_signed_chat_goal_settlement_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reality_record_signed_chat_goal_settlement_v1(uuid,jsonb) to service_role;

-- Distinct immutable quarantine namespace for verified functional failure revisions.
CREATE OR REPLACE FUNCTION public.reality_read_next_signed_chat_recovery_publish_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype; h record;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_CHAT_RECOVERY_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 and phase in ('SIGNED_CHAT_RECOVERY_TARGET_REVIEWED',
               'SIGNED_CHAT_RECOVERY_PUBLISH_FENCED')
 order by created_at,trigger_id limit 1;
 if q.trigger_id is null then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_CHAT_RECOVERY_QUARANTINE_CANDIDATE');end if;
 select w.*,m.content into h from reality_internal.chat_work_handoffs_v1 w
 join public.reality_chat_messages m on m.id=w.message_id and m.role='user'
  and m.user_id=w.owner_id and m.conversation_id=w.conversation_id
  and m.request_id=w.request_id
 where w.message_id=q.source_message_id and w.owner_id=q.owner_id
  and w.conversation_id=q.conversation_id
  and w.development->>'phase'='CI_VERIFIED'
  and w.development->>'original_work_id'=q.original_work_id
  and w.message_sha256=q.source_sha256
  and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(
     pg_catalog.convert_to(m.content,'UTF8')),'hex')
  and w.development->'evidence'->>'goal_gap_receipt_sha256'=
     q.blocker_receipt_sha256
  and w.development->>'installation_authorized'='false'
  and w.development->>'original_job_completed'='false'
  and w.development->>'production_changed'='false';
 if h.message_id is null or
   q.recovery_spec_sha256 is distinct from
    'sha256:'||pg_catalog.encode(extensions.digest(q.recovery_spec::text,'sha256'),'hex')
   or q.qualification_receipt->>'target_review_receipt_sha256' !~ '^sha256:[a-f0-9]{64}$'
   or q.qualification_receipt->'target_review'->>'target_in_graph' is distinct from 'true'
   or q.qualification_receipt->'target_review'->>'candidate_sha256'
     is distinct from q.qualified_candidate->>'candidate_sha256'
   or q.qualified_candidate->>'candidate_sha256' is distinct from
    'sha256:'||pg_catalog.encode(extensions.digest(
     (q.qualified_candidate-'candidate_sha256')::text,'sha256'),'hex')
 then raise exception 'SIGNED_CHAT_RECOVERY_PREPUBLISH_SOURCE_OR_DIGEST_DRIFT';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_CHAT_RECOVERY_QUARANTINE_CANDIDATE_READ',
  'trigger_id',q.trigger_id,'owner_id',q.owner_id,'message_id',q.source_message_id,
  'original_work_id',q.original_work_id,'source_ref',q.source_ref,
  'source_sha256',q.source_sha256,'blocker_receipt_sha256',q.blocker_receipt_sha256,
  'spec_sha256',q.recovery_spec_sha256,
  'target_review_receipt_sha256',q.qualification_receipt->>'target_review_receipt_sha256',
  'independent_target_review_verified',true,
  'phase',q.phase,'candidate',q.qualified_candidate,
  'quarantine_epoch',coalesce((q.recovery_spec->>'syntax_revision_epoch')::integer,0),
  'feature_epoch',coalesce((q.recovery_spec->>'feature_revision_epoch')::integer,0),
  'syntax_verified',coalesce(q.qualification_receipt->'syntax_proof'->>'candidate'='VALID_SYNTAX'
   and q.qualification_receipt->'syntax_proof'->>'candidate_sha256'=q.qualified_candidate->>'candidate_sha256'
   and q.qualification_receipt->>'syntax_receipt_sha256'='sha256:'||pg_catalog.encode(extensions.digest((q.qualification_receipt->'syntax_proof')::text,'sha256'),'hex'),false),
  'release_sha',q.qualified_candidate->>'base_sha',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $function$
;
CREATE OR REPLACE FUNCTION public.reality_record_signed_chat_recovery_quarantine_v1(p_trigger_id uuid, p_candidate_sha256 text, p_commit_sha text, p_source_commit_sha text, p_branch text, p_pr_number bigint, p_artifact_blob_sha text, p_source_blob_sha text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype; proof jsonb; receipt text;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_CHAT_RECOVERY_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
  where trigger_id=p_trigger_id for update;
 if q.trigger_id is null or q.source_kind<>'SIGNED_CHAT_DEVELOPMENT_RECOVERY'
  or q.phase<>'SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'
  or q.qualification_receipt->>'target_review_receipt_sha256' !~ '^sha256:[a-f0-9]{64}$'
  or q.qualification_receipt->'target_review'->>'target_in_graph' is distinct from 'true'
  or q.qualified_candidate->>'candidate_sha256' is distinct from p_candidate_sha256
  or q.qualification_receipt->'syntax_proof'->>'candidate' is distinct from 'VALID_SYNTAX'
  or q.qualification_receipt->'syntax_proof'->>'candidate_sha256' is distinct from p_candidate_sha256
  or q.qualification_receipt->>'syntax_receipt_sha256' is distinct from 'sha256:'||pg_catalog.encode(extensions.digest((q.qualification_receipt->'syntax_proof')::text,'sha256'),'hex')
  or p_commit_sha !~ '^[a-f0-9]{40}$'
  or p_source_commit_sha !~ '^[a-f0-9]{40}$'
  or p_source_blob_sha !~ '^[a-f0-9]{40}$'
  or p_source_blob_sha = q.qualified_candidate->>'source_blob_sha'
  or p_artifact_blob_sha !~ '^[a-f0-9]{40}$'
  or p_branch is distinct from ('reality/chat-recovery/'||q.trigger_id::text||
    (case when coalesce(q.recovery_spec->>'feature_revision_epoch','0')<>'0' then '-feature-r'||(q.recovery_spec->>'feature_revision_epoch') else '' end)||
    (case when q.recovery_spec->>'syntax_revision_epoch'='1' then '-syntax-r1' else '' end))
  or p_pr_number is null or p_pr_number<1
 then raise exception 'SIGNED_CHAT_RECOVERY_QUARANTINE_PROVIDER_RECEIPT_INVALID';end if;
 proof:=pg_catalog.jsonb_build_object(
  'schema','reality-signed-chat-recovery-quarantine-receipt-v1',
  'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'source_message_id',q.source_message_id,
  'source_sha256',q.source_sha256,
  'spec_sha256',q.recovery_spec_sha256,
  'blocker_receipt_sha256',q.blocker_receipt_sha256,
  'candidate_sha256',p_candidate_sha256,
  'target_review_receipt_sha256',q.qualification_receipt->>'target_review_receipt_sha256',
  'independent_target_review_verified',true,
  'github_commit_sha',p_commit_sha,
  'source_commit_sha',p_source_commit_sha,
  'artifact_blob_sha',p_artifact_blob_sha,
  'source_blob_sha',p_source_blob_sha,
  'branch',p_branch,'pr_number',p_pr_number,
  'pr_url','https://github.com/maloney2323/Reality/pull/'||p_pr_number,
  'verification_state','PROVIDER_READBACK_NO_INDEPENDENT_CI_YET',
  'source_installed',false,
  'feature_acceptance_verified',false,
  'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
 receipt:='sha256:'||pg_catalog.encode(extensions.digest(proof::text,'sha256'),'hex');
 update reality_internal.genuine_capability_queue_v1
 set phase='SIGNED_CHAT_RECOVERY_CANDIDATE_QUARANTINED',
  quarantine_receipt_sha256=receipt,
  qualified_candidate=qualified_candidate||
   pg_catalog.jsonb_build_object('provider_proof',proof,'quarantine_receipt_sha256',receipt),
  updated_at=clock_timestamp()
 where trigger_id=q.trigger_id;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_CHAT_RECOVERY_QUARANTINE_PROVIDER_RECEIPTED',
  'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'receipt_sha256',receipt,'source_commit_sha',p_source_commit_sha,
  'artifact_commit_sha',p_commit_sha,
  'pr_url','https://github.com/maloney2323/Reality/pull/'||p_pr_number,
  'source_installed',false,'independent_ci_verified',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $function$
;
CREATE OR REPLACE FUNCTION public.reality_record_signed_chat_recovery_syntax_v1(p_shift_id uuid, p_worker_run_id uuid, p_trigger_id uuid, p_candidate_sha256 text, p_base_sha text, p_source_blob_sha text, p_release_sha text, p_proof jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 sh record; proof jsonb; receipt text; spec jsonb; spec_hash text; archive jsonb;
 status text; next_action text;
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
  update reality_internal.genuine_capability_queue_v1 set qualification_receipt=coalesce(qualification_receipt,'{}'::jsonb)||pg_catalog.jsonb_build_object('syntax_proof',proof,'syntax_receipt_sha256',receipt,'syntax_next_action',next_action) where trigger_id=q.trigger_id;
 end if;
 return pg_catalog.jsonb_build_object('status',status,'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'syntax_receipt_sha256',receipt,'next_action',next_action,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,'new_shift_started',false);
end $function$
;

create or replace function public.reality_record_signed_chat_install_fence_observation_v1(
 p_attempt_id uuid,p_observed_branch_head text,p_evidence_sha256 text,p_finding text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q reality_internal.genuine_capability_queue_v1%rowtype;c jsonb;a jsonb;v jsonb;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_GOAL_INSTALL_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1 where trigger_id=p_attempt_id for update;
 c:=reality_internal.signed_chat_install_scope_v1(p_attempt_id);a:=q.qualification_receipt->'goal_install';
 if c is null or c->>'phase' is distinct from 'INSTALL_INTENT_FENCED'
 or c->>'expected_parent_commit_sha' is distinct from p_observed_branch_head
 or coalesce(p_evidence_sha256,'') !~ '^[a-f0-9]{64}$'
 or p_finding is distinct from 'FENCED_BASELINE_AND_APPROVED_GIT_OBJECTS_STILL_READABLE'
 then raise exception 'SIGNED_GOAL_FENCE_READ_ONLY_SCOPE_UNVERIFIED';end if;
 v:=pg_catalog.jsonb_build_object('finding',p_finding,'evidence_sha256',p_evidence_sha256,
  'original_work_id',q.original_work_id,'candidate_sha256',c->>'candidate_sha256',
  'approval_receipt_id',c->>'approval_receipt_id','observed_branch_head',p_observed_branch_head,
  'next_governed_action','INVESTIGATE_REGISTERED_CAPABILITY_PROVIDER_FAILURE_WITHOUT_REPLAY',
  'provider_effect_may_have_occurred',true,'installation_retried',false,'original_job_completed',false,'production_changed',false);
 if a->'fenced_recovery_observation' is null then
  a:=a||pg_catalog.jsonb_build_object('fenced_recovery_observation',v,'fenced_recovery_observation_sha256','sha256:'||pg_catalog.encode(extensions.digest(v::text,'sha256'),'hex'));
  update reality_internal.genuine_capability_queue_v1 set qualification_receipt=pg_catalog.jsonb_set(qualification_receipt,'{goal_install}',a),updated_at=clock_timestamp() where trigger_id=p_attempt_id;
 end if;
 return pg_catalog.jsonb_build_object('status','GENERAL_ORIGINAL_FENCED_RECOVERY_OBSERVATION_DURABLE','original_work_id',q.original_work_id,
  'shift_id',c->>'shift_id','phase','READ_ONLY_DIAGNOSIS_RECORDED','installation_retried',false,'original_job_completed',false,'production_changed',false);
end $$;
revoke all on function public.reality_record_signed_chat_install_fence_observation_v1(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.reality_record_signed_chat_install_fence_observation_v1(uuid,text,text,text) to service_role;

-- Reuse the existing Auto Qualifier routing and owner readback, without a second original.
CREATE OR REPLACE FUNCTION public.reality_reconcile_continuity_qualification_routes_v1(p_worker_run_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_now timestamptz:=clock_timestamp();v_count int:=0;v_matched int:=0;
 v_owner int:=0;v_review int:=0;
begin
 if current_user<>'service_role' or p_worker_run_id is null then
  raise exception 'CONTINUITY_ROUTE_SIGNED_SERVICE_REQUIRED';
 end if;
 -- The existing single-flight signed worker is the only lawful automatic
 -- trigger. An arbitrary Chat request cannot advance even evidence routing.
 if not exists (
  select 1 from reality_internal.signed_worker_actual_runs_v1 r
  where r.run_id=p_worker_run_id and r.status='STARTED'
   and r.started_at>v_now-interval '3 minutes'
 ) then raise exception 'CONTINUITY_ROUTE_CURRENT_SIGNED_WORKER_REQUIRED'; end if;

 with eligible as (
  select distinct g.owner_id from reality_internal.owner_routine_delegations_v1 g
  where g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
   and g.enabled is true and g.activated_at<=v_now and g.expires_at>v_now
 ),
 matching as (
  select i.*,c.original_work_id as claim_original_work_id,
   c.shift_id as claim_shift_id,c.phase as original_claim_phase,
   sh.status as claim_shift_status,w.mode as claim_warrant_mode,
   w.state as claim_warrant_state,
   coalesce((
    select true from reality_internal.governed_original_independent_final_receipts_v1 f
    where f.owner_id=i.owner_id and f.original_work_id=c.original_work_id
     and f.shift_id=c.shift_id and f.source_ref=i.source_ref
     and f.outcome='SUCCEEDED'
     and f.final_evidence_sha256~'^sha256:[a-f0-9]{64}$'
    limit 1
   ),false) as independently_settled,
   q.trigger_id as qualified_trigger_id,
   q.original_work_id as qualified_original_work_id,
   a.approval_id as approved_employee_list_id,
   packet.review_state as exact_chat_review_state,
   packet.original_work_id as exact_chat_original_work_id,
   (existing_chat.development->>'original_work_id') as existing_chat_original_work_id,
   chat_goal.scope as signed_chat_goal_install,
   chat_goal.queue_phase as signed_chat_recovery_queue_phase
  from reality_internal.owner_continuous_qualification_inbox_v1 i
  join eligible e on e.owner_id=i.owner_id
  left join lateral(
   select x.* from reality_internal.governed_employee_original_claims_v1 x
   where x.owner_id=i.owner_id and x.source_ref=i.source_ref
    and x.original_work_id~'^work:[a-f0-9]{32}$'
   order by x.updated_at desc,x.original_work_id limit 1
  ) c on true
  left join reality_internal.governed_employee_shifts_v1 sh
   on sh.shift_id=c.shift_id and sh.owner_id=c.owner_id
  left join reality_internal.governed_employee_completion_warrants_v1 w
   on w.shift_id=sh.shift_id and w.owner_id=sh.owner_id
  left join lateral (
   select g.trigger_id,g.original_work_id from reality_internal.genuine_capability_queue_v1 g
   where g.owner_id=i.owner_id and g.source_ref=i.source_ref
    and g.phase='AWAITING_OWNER_APPROVAL'
    and g.qualification_receipt is not null
    and g.qualified_candidate->>'artifact_sha256'~'^[a-f0-9]{64}$'
    and g.original_work_id~'^work:[a-f0-9]{32}$'
   order by g.updated_at desc,g.trigger_id limit 1
  ) q on true
  left join reality_internal.owner_continuity_qualification_routes_v1 prior_route
   on prior_route.owner_id=i.owner_id and prior_route.intake_family=i.intake_family
    and prior_route.intake_key=i.intake_key
  left join lateral (
   select p.review_state,p.original_work_id from
    reality_internal.owner_qualified_chat_original_review_packets_v1 p
   where i.intake_family='AUTHENTICATED_CHAT'
    and p.owner_id=i.owner_id and p.message_id::text=i.intake_key
    and p.continuity_ref=prior_route.continuity_ref
   limit 1
  ) packet on true
  left join lateral (
   select h.development from reality_internal.chat_work_handoffs_v1 h
   join public.reality_chat_messages m on m.id=h.message_id
    and m.user_id=h.owner_id and m.conversation_id=h.conversation_id
    and m.request_id=h.request_id and m.role='user'
    and h.message_sha256=pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to(m.content,'UTF8')),'hex')
   where i.intake_family='AUTHENTICATED_CHAT'
    and h.owner_id=i.owner_id and h.message_id::text=i.intake_key
    and h.development->>'original_work_id'~'^work:[a-f0-9]{32}$'
   limit 1
  ) existing_chat on true
  left join lateral (
   select reality_internal.signed_chat_install_scope_v1(g.trigger_id) as scope,g.phase as queue_phase
   from reality_internal.genuine_capability_queue_v1 g
   where g.owner_id=i.owner_id and g.source_ref=i.source_ref
    and g.source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
    and g.original_work_id=existing_chat.development->>'original_work_id'
   order by g.updated_at desc limit 1
  ) chat_goal on true
  left join lateral (
   select a.approval_id from reality_internal.approved_chat_employee_assignments_v1 a
   where i.intake_family='AUTHENTICATED_CHAT'
    and a.owner_id=i.owner_id
    and i.intake_key=a.source_message_id::text
    and a.approval_status='APPROVED'
    and a.execution_authorized is false
   order by a.approved_at desc limit 1
  ) a on true
  where i.last_seen_at>v_now-interval '48 hours'
 ),
 classified as (
  select m.*,
   case
    when m.terminal_observation then 'TERMINAL_RECEIPT_PRESERVED_NO_REPLAY'
    when m.independently_settled then 'INDEPENDENT_ORIGINAL_RECEIPT_RECONCILE_UNIVERSE'
    when m.exact_chat_review_state='ORIGINAL_ADMITTED_IN_EXISTING_CHAT_WORK_ADAPTER'
     then 'QUALIFIED_CHAT_ORIGINAL_ADMITTED_PENDING_GOVERNED_EXECUTION'
    when m.signed_chat_goal_install->>'phase'='ORIGINAL_SETTLED' then 'INDEPENDENT_ORIGINAL_RECEIPT_RECONCILE_UNIVERSE'
    when m.signed_chat_goal_install->>'phase'='READY_FOR_EXACT_OWNER_APPROVAL' then 'EXISTING_SIGNED_CHAT_ORIGINAL_AWAITING_EXACT_INSTALL_APPROVAL'
    when m.signed_chat_goal_install->>'phase' in ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED') then 'EXISTING_SIGNED_CHAT_ORIGINAL_RECHECK_GOVERNED_INSTALLER'
    when m.signed_chat_recovery_queue_phase='SIGNED_CHAT_RECOVERY_CANDIDATE_QUARANTINED' then 'EXISTING_SIGNED_CHAT_ORIGINAL_INDEPENDENT_FULL_GOAL_ACCEPTANCE_REQUIRED'
    when m.existing_chat_original_work_id~'^work:[a-f0-9]{32}
    when m.exact_chat_review_state='AWAITING_OWNER_EXACT_APPROVAL'
     then 'QUALIFIED_CHAT_ORIGINAL_AWAITING_EXACT_OWNER_APPROVAL'
    when m.qualified_trigger_id is not null
     then 'EXISTING_QUALIFIED_ARTIFACT_CHECK_OWNER_APPROVAL_ADAPTER'
    when m.claim_original_work_id is not null
     and m.claim_shift_status in('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
     and m.claim_warrant_state='ACTIVE'
     and m.claim_warrant_mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
     then 'EXISTING_ORIGINAL_RECHECK_GOVERNED_TRIGGER'
    when m.claim_original_work_id is not null
     then 'EXISTING_ORIGINAL_AUTHORITY_SCOPE_RECHECK_REQUIRED'
    when m.approved_employee_list_id is not null
     then 'APPROVED_JOB_LIST_NEEDS_INDEPENDENT_ORIGINAL_QUALIFICATION'
    when m.intake_family='AUTHENTICATED_CHAT'
     then 'SAVED_CHAT_INTENT_NEEDS_GOVERNED_CLASSIFICATION'
    when m.source_ref is null or m.source_ref=''
     then 'MISSING_EXACT_SOURCE_LINEAGE_RECHECK'
    when m.qualification_state like '%PROVIDER%'
     or m.qualification_state like '%EPOCH%'
     then 'SOURCE_EPOCH_REVALIDATION_REQUIRED'
    else 'OWNER_GOAL_ORIGINAL_AND_INDEPENDENT_SOURCE_QUALIFICATION_REQUIRED'
   end as next_route,
   case
    when m.terminal_observation or m.independently_settled
     then 'RECONCILE_VERIFIED_RECEIPT_IN_UNIVERSE_WITHOUT_REPLAY'
    when m.exact_chat_review_state='ORIGINAL_ADMITTED_IN_EXISTING_CHAT_WORK_ADAPTER'
     then 'EXISTING_SIGNED_CHAT_WORKER_RECHECK_ORIGINAL_SOURCE_SCOPE_AND_ACCEPTANCE'
    when m.signed_chat_goal_install->>'phase'='ORIGINAL_SETTLED' then 'RECONCILE_VERIFIED_RECEIPT_IN_UNIVERSE_WITHOUT_REPLAY'
    when m.signed_chat_goal_install->>'phase'='READY_FOR_EXACT_OWNER_APPROVAL' then 'PRESENT_EXISTING_EXACT_OWNER_INSTALL_CARD_IN_REALITY_CHAT'
    when m.signed_chat_goal_install->>'phase' in ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED') then 'RECONCILE_EXACT_APPROVED_INSTALL_AND_INDEPENDENT_FINAL_RECEIPT_WITHOUT_REPLAY'
    when m.signed_chat_recovery_queue_phase='SIGNED_CHAT_RECOVERY_CANDIDATE_QUARANTINED' then 'VERIFY_PINNED_FULL_GOAL_FUNCTIONAL_ACCEPTANCE_AND_INSTALLER_COMPATIBILITY'
    when m.existing_chat_original_work_id~'^work:[a-f0-9]{32}
    when m.exact_chat_review_state='AWAITING_OWNER_EXACT_APPROVAL'
     then 'PRESENT_EXISTING_EXACT_OWNER_ADMISSION_CARD_IN_REALITY_CHAT'
    when m.qualified_trigger_id is not null
     then 'READ_EXISTING_QUALIFIED_CAPABILITY_PREFLIGHT_IN_REALITY_CHAT'
    when m.claim_original_work_id is not null
     and m.claim_shift_status in('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
     and m.claim_warrant_state='ACTIVE'
     and m.claim_warrant_mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
     then 'GOVERNED_TRIGGER_MUST_RECHECK_SOURCE_GOAL_AND_EXACT_AUTHORITY'
    when m.claim_original_work_id is not null
     then 'VERIFY_EXISTING_ORIGINAL_WARRANT_NO_SILENT_SCOPE_EXPANSION'
    when m.approved_employee_list_id is not null
     then 'INDEPENDENTLY_QUALIFY_APPROVED_TASK_LIST_AS_ACTUAL_ORIGINALS'
    when m.intake_family='AUTHENTICATED_CHAT'
     then 'VERIFY_AUTHENTICATED_MESSAGE_GOAL_SOURCE_AND_CONSEQUENCE'
    when m.source_ref is null or m.source_ref=''
     then 'FIND_EXACT_SOURCE_BEFORE_OWNER_PROPOSAL'
    else 'INDEPENDENTLY_VERIFY_CURRENT_SOURCE_AND_OWNER_BUSINESS_OBLIGATION'
   end as route_action
  from matching m
 ),
 saved as(
  insert into reality_internal.owner_continuity_qualification_routes_v1(
   owner_id,intake_family,intake_key,continuity_ref,source_ref,
   original_work_id,qualified_capability_trigger_id,source_epoch_fingerprint,
   route_state,governed_next_action,existing_approval_adapter,last_checked_at
  )
  select owner_id,intake_family,intake_key,
   'reality:qualification:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(owner_id::text||'|'||intake_family||'|'||intake_key,'UTF8')),'hex'),
   source_ref,coalesce(claim_original_work_id,qualified_original_work_id,
     exact_chat_original_work_id,
     case when existing_chat_original_work_id~'^work:[a-f0-9]{32}$'
      then existing_chat_original_work_id else null end),
   qualified_trigger_id,evidence_fingerprint,next_route,route_action,
   case when next_route='EXISTING_SIGNED_CHAT_ORIGINAL_AWAITING_EXACT_INSTALL_APPROVAL' then 'EXISTING_GENERALIZED_ORIGINAL_INSTALL_CHAT'
   when qualified_trigger_id is not null then 'EXISTING_QUALIFIED_CAPABILITY_CHAT'
   else null end,
   v_now
  from classified
  on conflict(owner_id,intake_family,intake_key) do update set
   source_ref=excluded.source_ref,
   original_work_id=excluded.original_work_id,
   qualified_capability_trigger_id=excluded.qualified_capability_trigger_id,
   source_epoch_fingerprint=excluded.source_epoch_fingerprint,
   route_state=excluded.route_state,
   governed_next_action=excluded.governed_next_action,
   existing_approval_adapter=excluded.existing_approval_adapter,
   last_checked_at=excluded.last_checked_at
  returning owner_id,original_work_id,route_state
 )
 select count(*),count(*) filter(where original_work_id is not null),
  count(distinct owner_id),
  count(*) filter(where route_state='EXISTING_QUALIFIED_ARTIFACT_CHECK_OWNER_APPROVAL_ADAPTER')
 into v_count,v_matched,v_owner,v_review from saved;

 return pg_catalog.jsonb_build_object(
  'status','CONTINUITY_QUALIFICATION_ROUTES_RECONCILED',
  'worker_run_id',p_worker_run_id,'owner_count',v_owner,
  'routed_source_count',v_count,'existing_original_matches',v_matched,
  'existing_qualified_capability_adapter_checks',v_review,
  'model_execution_authorized',false,'owner_approval_granted',false,
  'new_original_admitted',false,'new_shift_started',false,
  'installation_authorized',false,'production_changed',false);
end $function$

     then 'EXISTING_SIGNED_CHAT_ORIGINAL_RECONCILE_WORKER'
    when m.exact_chat_review_state='AWAITING_OWNER_EXACT_APPROVAL'
     then 'QUALIFIED_CHAT_ORIGINAL_AWAITING_EXACT_OWNER_APPROVAL'
    when m.qualified_trigger_id is not null
     then 'EXISTING_QUALIFIED_ARTIFACT_CHECK_OWNER_APPROVAL_ADAPTER'
    when m.claim_original_work_id is not null
     and m.claim_shift_status in('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
     and m.claim_warrant_state='ACTIVE'
     and m.claim_warrant_mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
     then 'EXISTING_ORIGINAL_RECHECK_GOVERNED_TRIGGER'
    when m.claim_original_work_id is not null
     then 'EXISTING_ORIGINAL_AUTHORITY_SCOPE_RECHECK_REQUIRED'
    when m.approved_employee_list_id is not null
     then 'APPROVED_JOB_LIST_NEEDS_INDEPENDENT_ORIGINAL_QUALIFICATION'
    when m.intake_family='AUTHENTICATED_CHAT'
     then 'SAVED_CHAT_INTENT_NEEDS_GOVERNED_CLASSIFICATION'
    when m.source_ref is null or m.source_ref=''
     then 'MISSING_EXACT_SOURCE_LINEAGE_RECHECK'
    when m.qualification_state like '%PROVIDER%'
     or m.qualification_state like '%EPOCH%'
     then 'SOURCE_EPOCH_REVALIDATION_REQUIRED'
    else 'OWNER_GOAL_ORIGINAL_AND_INDEPENDENT_SOURCE_QUALIFICATION_REQUIRED'
   end as next_route,
   case
    when m.terminal_observation or m.independently_settled
     then 'RECONCILE_VERIFIED_RECEIPT_IN_UNIVERSE_WITHOUT_REPLAY'
    when m.exact_chat_review_state='ORIGINAL_ADMITTED_IN_EXISTING_CHAT_WORK_ADAPTER'
     then 'EXISTING_SIGNED_CHAT_WORKER_RECHECK_ORIGINAL_SOURCE_SCOPE_AND_ACCEPTANCE'
    when m.existing_chat_original_work_id~'^work:[a-f0-9]{32}$'
     then 'RECONCILE_EXISTING_SIGNED_CHAT_ORIGINAL_WITH_EXECUTOR_NO_REPLAY'
    when m.exact_chat_review_state='AWAITING_OWNER_EXACT_APPROVAL'
     then 'PRESENT_EXISTING_EXACT_OWNER_ADMISSION_CARD_IN_REALITY_CHAT'
    when m.qualified_trigger_id is not null
     then 'READ_EXISTING_QUALIFIED_CAPABILITY_PREFLIGHT_IN_REALITY_CHAT'
    when m.claim_original_work_id is not null
     and m.claim_shift_status in('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
     and m.claim_warrant_state='ACTIVE'
     and m.claim_warrant_mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
     then 'GOVERNED_TRIGGER_MUST_RECHECK_SOURCE_GOAL_AND_EXACT_AUTHORITY'
    when m.claim_original_work_id is not null
     then 'VERIFY_EXISTING_ORIGINAL_WARRANT_NO_SILENT_SCOPE_EXPANSION'
    when m.approved_employee_list_id is not null
     then 'INDEPENDENTLY_QUALIFY_APPROVED_TASK_LIST_AS_ACTUAL_ORIGINALS'
    when m.intake_family='AUTHENTICATED_CHAT'
     then 'VERIFY_AUTHENTICATED_MESSAGE_GOAL_SOURCE_AND_CONSEQUENCE'
    when m.source_ref is null or m.source_ref=''
     then 'FIND_EXACT_SOURCE_BEFORE_OWNER_PROPOSAL'
    else 'INDEPENDENTLY_VERIFY_CURRENT_SOURCE_AND_OWNER_BUSINESS_OBLIGATION'
   end as route_action
  from matching m
 ),
 saved as(
  insert into reality_internal.owner_continuity_qualification_routes_v1(
   owner_id,intake_family,intake_key,continuity_ref,source_ref,
   original_work_id,qualified_capability_trigger_id,source_epoch_fingerprint,
   route_state,governed_next_action,existing_approval_adapter,last_checked_at
  )
  select owner_id,intake_family,intake_key,
   'reality:qualification:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(owner_id::text||'|'||intake_family||'|'||intake_key,'UTF8')),'hex'),
   source_ref,coalesce(claim_original_work_id,qualified_original_work_id,
     exact_chat_original_work_id,
     case when existing_chat_original_work_id~'^work:[a-f0-9]{32}$'
      then existing_chat_original_work_id else null end),
   qualified_trigger_id,evidence_fingerprint,next_route,route_action,
   case when qualified_trigger_id is not null then 'EXISTING_QUALIFIED_CAPABILITY_CHAT'
   else null end,
   v_now
  from classified
  on conflict(owner_id,intake_family,intake_key) do update set
   source_ref=excluded.source_ref,
   original_work_id=excluded.original_work_id,
   qualified_capability_trigger_id=excluded.qualified_capability_trigger_id,
   source_epoch_fingerprint=excluded.source_epoch_fingerprint,
   route_state=excluded.route_state,
   governed_next_action=excluded.governed_next_action,
   existing_approval_adapter=excluded.existing_approval_adapter,
   last_checked_at=excluded.last_checked_at
  returning owner_id,original_work_id,route_state
 )
 select count(*),count(*) filter(where original_work_id is not null),
  count(distinct owner_id),
  count(*) filter(where route_state='EXISTING_QUALIFIED_ARTIFACT_CHECK_OWNER_APPROVAL_ADAPTER')
 into v_count,v_matched,v_owner,v_review from saved;

 return pg_catalog.jsonb_build_object(
  'status','CONTINUITY_QUALIFICATION_ROUTES_RECONCILED',
  'worker_run_id',p_worker_run_id,'owner_count',v_owner,
  'routed_source_count',v_count,'existing_original_matches',v_matched,
  'existing_qualified_capability_adapter_checks',v_review,
  'model_execution_authorized',false,'owner_approval_granted',false,
  'new_original_admitted',false,'new_shift_started',false,
  'installation_authorized',false,'production_changed',false);
end $function$

     then 'RECONCILE_EXISTING_SIGNED_CHAT_ORIGINAL_WITH_EXECUTOR_NO_REPLAY'
    when m.exact_chat_review_state='AWAITING_OWNER_EXACT_APPROVAL'
     then 'PRESENT_EXISTING_EXACT_OWNER_ADMISSION_CARD_IN_REALITY_CHAT'
    when m.qualified_trigger_id is not null
     then 'READ_EXISTING_QUALIFIED_CAPABILITY_PREFLIGHT_IN_REALITY_CHAT'
    when m.claim_original_work_id is not null
     and m.claim_shift_status in('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
     and m.claim_warrant_state='ACTIVE'
     and m.claim_warrant_mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
     then 'GOVERNED_TRIGGER_MUST_RECHECK_SOURCE_GOAL_AND_EXACT_AUTHORITY'
    when m.claim_original_work_id is not null
     then 'VERIFY_EXISTING_ORIGINAL_WARRANT_NO_SILENT_SCOPE_EXPANSION'
    when m.approved_employee_list_id is not null
     then 'INDEPENDENTLY_QUALIFY_APPROVED_TASK_LIST_AS_ACTUAL_ORIGINALS'
    when m.intake_family='AUTHENTICATED_CHAT'
     then 'VERIFY_AUTHENTICATED_MESSAGE_GOAL_SOURCE_AND_CONSEQUENCE'
    when m.source_ref is null or m.source_ref=''
     then 'FIND_EXACT_SOURCE_BEFORE_OWNER_PROPOSAL'
    else 'INDEPENDENTLY_VERIFY_CURRENT_SOURCE_AND_OWNER_BUSINESS_OBLIGATION'
   end as route_action
  from matching m
 ),
 saved as(
  insert into reality_internal.owner_continuity_qualification_routes_v1(
   owner_id,intake_family,intake_key,continuity_ref,source_ref,
   original_work_id,qualified_capability_trigger_id,source_epoch_fingerprint,
   route_state,governed_next_action,existing_approval_adapter,last_checked_at
  )
  select owner_id,intake_family,intake_key,
   'reality:qualification:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(owner_id::text||'|'||intake_family||'|'||intake_key,'UTF8')),'hex'),
   source_ref,coalesce(claim_original_work_id,qualified_original_work_id,
     exact_chat_original_work_id,
     case when existing_chat_original_work_id~'^work:[a-f0-9]{32}$'
      then existing_chat_original_work_id else null end),
   qualified_trigger_id,evidence_fingerprint,next_route,route_action,
   case when qualified_trigger_id is not null then 'EXISTING_QUALIFIED_CAPABILITY_CHAT'
   else null end,
   v_now
  from classified
  on conflict(owner_id,intake_family,intake_key) do update set
   source_ref=excluded.source_ref,
   original_work_id=excluded.original_work_id,
   qualified_capability_trigger_id=excluded.qualified_capability_trigger_id,
   source_epoch_fingerprint=excluded.source_epoch_fingerprint,
   route_state=excluded.route_state,
   governed_next_action=excluded.governed_next_action,
   existing_approval_adapter=excluded.existing_approval_adapter,
   last_checked_at=excluded.last_checked_at
  returning owner_id,original_work_id,route_state
 )
 select count(*),count(*) filter(where original_work_id is not null),
  count(distinct owner_id),
  count(*) filter(where route_state='EXISTING_QUALIFIED_ARTIFACT_CHECK_OWNER_APPROVAL_ADAPTER')
 into v_count,v_matched,v_owner,v_review from saved;

 return pg_catalog.jsonb_build_object(
  'status','CONTINUITY_QUALIFICATION_ROUTES_RECONCILED',
  'worker_run_id',p_worker_run_id,'owner_count',v_owner,
  'routed_source_count',v_count,'existing_original_matches',v_matched,
  'existing_qualified_capability_adapter_checks',v_review,
  'model_execution_authorized',false,'owner_approval_granted',false,
  'new_original_admitted',false,'new_shift_started',false,
  'installation_authorized',false,'production_changed',false);
end $function$

     then 'EXISTING_SIGNED_CHAT_ORIGINAL_RECONCILE_WORKER'
    when m.exact_chat_review_state='AWAITING_OWNER_EXACT_APPROVAL'
     then 'QUALIFIED_CHAT_ORIGINAL_AWAITING_EXACT_OWNER_APPROVAL'
    when m.qualified_trigger_id is not null
     then 'EXISTING_QUALIFIED_ARTIFACT_CHECK_OWNER_APPROVAL_ADAPTER'
    when m.claim_original_work_id is not null
     and m.claim_shift_status in('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
     and m.claim_warrant_state='ACTIVE'
     and m.claim_warrant_mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
     then 'EXISTING_ORIGINAL_RECHECK_GOVERNED_TRIGGER'
    when m.claim_original_work_id is not null
     then 'EXISTING_ORIGINAL_AUTHORITY_SCOPE_RECHECK_REQUIRED'
    when m.approved_employee_list_id is not null
     then 'APPROVED_JOB_LIST_NEEDS_INDEPENDENT_ORIGINAL_QUALIFICATION'
    when m.intake_family='AUTHENTICATED_CHAT'
     then 'SAVED_CHAT_INTENT_NEEDS_GOVERNED_CLASSIFICATION'
    when m.source_ref is null or m.source_ref=''
     then 'MISSING_EXACT_SOURCE_LINEAGE_RECHECK'
    when m.qualification_state like '%PROVIDER%'
     or m.qualification_state like '%EPOCH%'
     then 'SOURCE_EPOCH_REVALIDATION_REQUIRED'
    else 'OWNER_GOAL_ORIGINAL_AND_INDEPENDENT_SOURCE_QUALIFICATION_REQUIRED'
   end as next_route,
   case
    when m.terminal_observation or m.independently_settled
     then 'RECONCILE_VERIFIED_RECEIPT_IN_UNIVERSE_WITHOUT_REPLAY'
    when m.exact_chat_review_state='ORIGINAL_ADMITTED_IN_EXISTING_CHAT_WORK_ADAPTER'
     then 'EXISTING_SIGNED_CHAT_WORKER_RECHECK_ORIGINAL_SOURCE_SCOPE_AND_ACCEPTANCE'
    when m.existing_chat_original_work_id~'^work:[a-f0-9]{32}$'
     then 'RECONCILE_EXISTING_SIGNED_CHAT_ORIGINAL_WITH_EXECUTOR_NO_REPLAY'
    when m.exact_chat_review_state='AWAITING_OWNER_EXACT_APPROVAL'
     then 'PRESENT_EXISTING_EXACT_OWNER_ADMISSION_CARD_IN_REALITY_CHAT'
    when m.qualified_trigger_id is not null
     then 'READ_EXISTING_QUALIFIED_CAPABILITY_PREFLIGHT_IN_REALITY_CHAT'
    when m.claim_original_work_id is not null
     and m.claim_shift_status in('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
     and m.claim_warrant_state='ACTIVE'
     and m.claim_warrant_mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
     then 'GOVERNED_TRIGGER_MUST_RECHECK_SOURCE_GOAL_AND_EXACT_AUTHORITY'
    when m.claim_original_work_id is not null
     then 'VERIFY_EXISTING_ORIGINAL_WARRANT_NO_SILENT_SCOPE_EXPANSION'
    when m.approved_employee_list_id is not null
     then 'INDEPENDENTLY_QUALIFY_APPROVED_TASK_LIST_AS_ACTUAL_ORIGINALS'
    when m.intake_family='AUTHENTICATED_CHAT'
     then 'VERIFY_AUTHENTICATED_MESSAGE_GOAL_SOURCE_AND_CONSEQUENCE'
    when m.source_ref is null or m.source_ref=''
     then 'FIND_EXACT_SOURCE_BEFORE_OWNER_PROPOSAL'
    else 'INDEPENDENTLY_VERIFY_CURRENT_SOURCE_AND_OWNER_BUSINESS_OBLIGATION'
   end as route_action
  from matching m
 ),
 saved as(
  insert into reality_internal.owner_continuity_qualification_routes_v1(
   owner_id,intake_family,intake_key,continuity_ref,source_ref,
   original_work_id,qualified_capability_trigger_id,source_epoch_fingerprint,
   route_state,governed_next_action,existing_approval_adapter,last_checked_at
  )
  select owner_id,intake_family,intake_key,
   'reality:qualification:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(owner_id::text||'|'||intake_family||'|'||intake_key,'UTF8')),'hex'),
   source_ref,coalesce(claim_original_work_id,qualified_original_work_id,
     exact_chat_original_work_id,
     case when existing_chat_original_work_id~'^work:[a-f0-9]{32}$'
      then existing_chat_original_work_id else null end),
   qualified_trigger_id,evidence_fingerprint,next_route,route_action,
   case when qualified_trigger_id is not null then 'EXISTING_QUALIFIED_CAPABILITY_CHAT'
   else null end,
   v_now
  from classified
  on conflict(owner_id,intake_family,intake_key) do update set
   source_ref=excluded.source_ref,
   original_work_id=excluded.original_work_id,
   qualified_capability_trigger_id=excluded.qualified_capability_trigger_id,
   source_epoch_fingerprint=excluded.source_epoch_fingerprint,
   route_state=excluded.route_state,
   governed_next_action=excluded.governed_next_action,
   existing_approval_adapter=excluded.existing_approval_adapter,
   last_checked_at=excluded.last_checked_at
  returning owner_id,original_work_id,route_state
 )
 select count(*),count(*) filter(where original_work_id is not null),
  count(distinct owner_id),
  count(*) filter(where route_state='EXISTING_QUALIFIED_ARTIFACT_CHECK_OWNER_APPROVAL_ADAPTER')
 into v_count,v_matched,v_owner,v_review from saved;

 return pg_catalog.jsonb_build_object(
  'status','CONTINUITY_QUALIFICATION_ROUTES_RECONCILED',
  'worker_run_id',p_worker_run_id,'owner_count',v_owner,
  'routed_source_count',v_count,'existing_original_matches',v_matched,
  'existing_qualified_capability_adapter_checks',v_review,
  'model_execution_authorized',false,'owner_approval_granted',false,
  'new_original_admitted',false,'new_shift_started',false,
  'installation_authorized',false,'production_changed',false);
end $function$
;
CREATE OR REPLACE FUNCTION public.reality_read_owner_chat_development_completion_preflight_v1(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_count int;v_items jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'CHAT_COMPLETION_PREFLIGHT_OWNER_SERVICE_REQUIRED';
 end if;
 select count(*) into v_count
 from reality_internal.chat_work_handoffs_v1 h
 where h.owner_id=p_owner_id and h.development->>'version'='reality-chat-new-development-v1';
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'message_id',x.message_id,'original_work_id',x.original_work_id,
  'conversation_id',x.conversation_id,'source_ref',x.source_ref,
  'original_goal',x.original_goal,'phase',x.phase,
  'signed_source_current',x.signed_source_current,
  'syntax_ci_independently_recorded',x.syntax_ci,
  'syntax_ci_run_id',x.syntax_ci_run_id,
  'candidate_pr_url',x.candidate_pr_url,
  'candidate_commit_sha',x.candidate_commit_sha,
  'feature_acceptance_independently_verified',coalesce(x.signed_adapter->>'original_job_completed'='true',false),
  'preinstall_functional_acceptance_verified',x.signed_adapter is not null,
  'signed_chat_install_adapter_phase',x.signed_adapter->>'phase',
  'universe_outcome_event_id',x.signed_adapter->>'final_receipt_id',
  'feature_acceptance_requires_full_original_goal',true,
  'prior_unrelated_install_does_not_authorize_this_original',true,
  'existing_general_install_lineage_compatible',x.general_install_lineage_compatible or x.signed_adapter is not null,
  'same_original_install_review_bound',x.install_review_bound or x.signed_adapter is not null,
  'exact_owner_install_approval_recorded',x.exact_owner_approval or coalesce(x.signed_adapter->>'installation_authorized'='true',false),
  'independent_final_receipt_recorded',x.final_receipt_recorded or coalesce(x.signed_adapter->>'original_job_completed'='true',false),
  'next_gate',case
   when not x.signed_source_current then 'REQUALIFY_EXACT_SIGNED_CHAT_ORIGINAL_SOURCE'
   when x.signed_adapter->>'phase'='ORIGINAL_SETTLED' then 'VERIFIED_ISOLATED_ORIGINAL_UNIVERSE_RECEIPT_NO_REPLAY'
   when x.signed_adapter->>'phase'='READY_FOR_EXACT_OWNER_APPROVAL' then 'PRESENT_EXISTING_EXACT_OWNER_INSTALL_APPROVAL'
   when x.signed_adapter->>'phase' in ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED') then 'CONTINUE_EXACT_APPROVED_INSTALL_AND_INDEPENDENT_FINAL_RECEIPT'
   when not x.syntax_ci then 'RECONCILE_EXACT_ORIGINAL_GITHUB_CI_BEFORE_FEATURE_TEST'
   -- Current Chat-development evidence contains source/syntax CI but no
   -- independently provider-verified original-goal feature acceptance.
   when not x.general_install_lineage_compatible then
    'RUN_FULL_GOAL_FEATURE_ACCEPTANCE_AND_CONNECT_COMPATIBLE_ORIGINAL_INSTALL_ADAPTER'
   else 'RUN_INDEPENDENT_FULL_GOAL_FEATURE_ACCEPTANCE_BEFORE_INSTALL'
   end,
  'owner_install_approval_ready',coalesce(x.signed_adapter->>'owner_approval_ready'='true',false),
  'execution_authorized',false,'installation_authorized',false,
  'original_job_completed_by_read',false,'production_changed',false
 ) order by x.created_at desc), '[]'::jsonb) into v_items
 from (
  select h.message_id,h.conversation_id,h.created_at,
   h.development->>'original_work_id' as original_work_id,
   h.development->>'phase' as phase,
   pg_catalog.left(coalesce(h.development->>'objective',''),600) as original_goal,
   'supabase:reality_chat_messages:'||h.message_id::text as source_ref,
   (m.id is not null and m.role='user' and
    m.user_id=h.owner_id and m.conversation_id=h.conversation_id and
    m.request_id=h.request_id and
    h.development->>'source_sha256'=h.message_sha256 and
    h.development->>'original_work_id' ~ '^work:[a-f0-9]{32}$') as signed_source_current,
   (h.development->>'phase'='CI_VERIFIED' and
    h.development->>'independent_ci_verified'='true' and
    h.development->'evidence'->>'ci_scope'='SYNTAX_AND_SOURCE_IDENTITY_ONLY' and
    h.development->'evidence'->>'independent_ci_run_id' ~ '^[1-9][0-9]{4,}$' and
    h.development->'evidence'->>'artifact_commit_sha' ~ '^[a-f0-9]{40}$') as syntax_ci,
   case when h.development->'evidence'->>'independent_ci_run_id' ~ '^[1-9][0-9]{4,}$'
    then (h.development->'evidence'->>'independent_ci_run_id')::bigint
    else null end as syntax_ci_run_id,
   h.development->'evidence'->>'pr_url' as candidate_pr_url,
   h.development->'evidence'->>'artifact_commit_sha' as candidate_commit_sha,
   exists(select 1 from reality_internal.riley_unattended_repair_originals_v1 r
    where r.original_work_id=h.development->>'original_work_id'
    and r.owner_id=h.owner_id) as general_install_lineage_compatible,
   exists(select 1 from reality_internal.governed_original_install_reviews_v1 i
    where i.original_work_id=h.development->>'original_work_id'
    and i.owner_id=h.owner_id
    and i.candidate_commit_sha=h.development->'evidence'->>'artifact_commit_sha') as install_review_bound,
   exists(select 1 from reality_internal.governed_original_install_reviews_v1 i
    where i.original_work_id=h.development->>'original_work_id'
    and i.owner_id=h.owner_id and i.approval_receipt_id is not null) as exact_owner_approval,
   exists(select 1 from reality_internal.governed_original_independent_final_receipts_v1 f
    where f.original_work_id=h.development->>'original_work_id' and
    f.owner_id=h.owner_id and f.outcome='SUCCEEDED') as final_receipt_recorded,
   (select reality_internal.signed_chat_install_scope_v1(q.trigger_id) from reality_internal.genuine_capability_queue_v1 q
    where q.owner_id=h.owner_id and q.source_message_id=h.message_id and q.original_work_id=h.development->>'original_work_id'
    and q.source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY' order by q.updated_at desc limit 1) as signed_adapter
  from reality_internal.chat_work_handoffs_v1 h
  left join public.reality_chat_messages m on m.id=h.message_id
  where h.owner_id=p_owner_id and
    h.development->>'version'='reality-chat-new-development-v1'
  order by h.created_at desc
  limit 10
 ) x;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_CHAT_DEVELOPMENT_FULL_GOAL_COMPLETION_PREFLIGHT_READ_ONLY',
  'owner_id',p_owner_id,'items',v_items,'total',coalesce(v_count,0),
  'read_only',true,'new_original_created',false,'new_shift_started',false,
  'owner_approval_granted',false,'execution_authorized',false,
  'installation_authorized',false,'original_job_completed_by_read',false,
  'production_changed',false);
end; $function$
;
