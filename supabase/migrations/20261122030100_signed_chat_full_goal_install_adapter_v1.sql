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
 if ph<>'ORIGINAL_SETTLED' and not reality_internal.signed_chat_goal_active_shift_v1((c->>'owner_id')::uuid,(a->>'shift_id')::uuid)
 then return null;end if;
 if ph in ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED','ORIGINAL_SETTLED')
 and (a->>'approval_receipt_id' is null or a->'approval'->>'owner_id' is distinct from c->>'owner_id'
 or a->'approval'->>'original_work_id' is distinct from c->>'original_work_id'
 or a->'approval'->>'candidate_sha256' is distinct from c->>'candidate_sha256'
 or a->'approval'->>'proof_sha256' is distinct from a->>'proof_sha256'
 or a->'approval'->>'target_base_sha' is distinct from p->>'target_base_sha'
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
