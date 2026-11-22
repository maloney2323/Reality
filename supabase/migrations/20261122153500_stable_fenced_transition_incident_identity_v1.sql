-- Continuity incident identity is the immutable fenced provider operation,
-- NOT incidental verifier receipt hashes that may be refreshed on each wake.
-- We still independently validate the current syntax receipt and candidate
-- using the unchanged conditional above before admitting source evidence.
-- Preserves original, candidate, fixed fence, expected provider branch.
CREATE OR REPLACE FUNCTION reality_internal.signed_chat_fenced_transition_evidence_v1(p_trigger uuid, p_shift uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 h record; candidate jsonb;branch text;epoch integer;feature_epoch integer;
begin
 if current_user<>'service_role' then
  raise exception 'SIGNED_UNSETTLED_TRANSITION_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger and source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
  and phase='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'
  and updated_at<clock_timestamp()-interval '90 seconds'
  and qualified_candidate is not null and quarantine_receipt_sha256 is null;
 if not found then return null;end if;
 select w.*,m.content into h from reality_internal.chat_work_handoffs_v1 w
 join public.reality_chat_messages m on m.id=w.message_id
 and m.role='user' and m.user_id=w.owner_id
 and m.conversation_id=w.conversation_id and m.request_id=w.request_id
 where w.message_id=q.source_message_id and w.owner_id=q.owner_id
 and w.conversation_id=q.conversation_id
 and w.message_sha256=q.source_sha256
 and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(m.content,'UTF8')),'hex')
 and w.development->>'original_work_id'=q.original_work_id
 and w.development->>'phase'='CI_VERIFIED'
 and w.development->>'original_job_completed'='false'
 and w.development->>'installation_authorized'='false'
 and w.development->>'production_changed'='false'
 and w.development->'evidence'->>'goal_gap_receipt_sha256'=q.blocker_receipt_sha256;
 if not found then return null;end if;
 candidate:=q.qualified_candidate;
 if q.source_ref is distinct from 'supabase:reality_chat_messages:'||q.source_message_id::text
 or q.original_work_id !~ '^work:[a-f0-9]{32}$'
 or q.recovery_spec_sha256 is distinct from 'sha256:'||
  pg_catalog.encode(extensions.digest(q.recovery_spec::text,'sha256'),'hex')
 or q.recovery_spec->>'original_work_id' is distinct from q.original_work_id
 or q.recovery_spec->>'signed_message_id' is distinct from q.source_message_id::text
 or q.recovery_spec->>'source_sha256' is distinct from q.source_sha256
 or q.recovery_spec->>'blocker_receipt_sha256' is distinct from q.blocker_receipt_sha256
 or q.recovery_spec->>'installation_authorized' is distinct from 'false'
 or q.recovery_spec->>'original_job_completed' is distinct from 'false'
 or q.recovery_spec->>'production_changed' is distinct from 'false'
 or candidate->>'original_work_id' is distinct from q.original_work_id
 or candidate->>'spec_sha256' is distinct from q.recovery_spec_sha256
 or candidate->>'blocker_receipt_sha256' is distinct from q.blocker_receipt_sha256
 or coalesce(candidate->>'base_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(candidate->>'source_blob_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(candidate->>'candidate_sha256','') !~ '^sha256:[a-f0-9]{64}$'
 or candidate->>'candidate_sha256' is distinct from 'sha256:'||
  pg_catalog.encode(extensions.digest((candidate-'candidate_sha256')::text,'sha256'),'hex')
 or q.qualification_receipt->>'target_review_receipt_sha256' !~ '^sha256:[a-f0-9]{64}$'
 or q.qualification_receipt->'target_review'->>'target_in_graph' is distinct from 'true'
 or q.qualification_receipt->'syntax_proof'->>'candidate' is distinct from 'VALID_SYNTAX'
 or q.qualification_receipt->'syntax_proof'->>'candidate_sha256' is distinct from candidate->>'candidate_sha256'
 or q.qualification_receipt->>'syntax_receipt_sha256' is distinct from 'sha256:'||
   pg_catalog.encode(extensions.digest((q.qualification_receipt->'syntax_proof')::text,'sha256'),'hex')
 or not reality_internal.signed_chat_goal_shift_lineage_v1(
  pg_catalog.jsonb_build_object('owner_id',q.owner_id,'attempt_id',q.trigger_id,
   'original_work_id',q.original_work_id,'source_ref',q.source_ref,
   'source_sha256',q.source_sha256,
   'source_proof_sha256',q.blocker_receipt_sha256,
   'source_original_shift_id',h.shift_id),p_shift)
 then return null;end if;
 if coalesce(q.recovery_spec->>'syntax_revision_epoch','0')!~'^[0-9]$'
  or coalesce(q.recovery_spec->>'feature_revision_epoch','0')!~'^[0-4]$'
 then return null;end if;
 epoch:=coalesce((q.recovery_spec->>'syntax_revision_epoch')::integer,0);
 feature_epoch:=coalesce((q.recovery_spec->>'feature_revision_epoch')::integer,0);
 branch:='reality/chat-recovery/'||q.trigger_id::text||
  (case when feature_epoch>0 then '-feature-r'||feature_epoch else '' end)||
  (case when epoch>0 then '-syntax-r'||epoch else '' end);
 return pg_catalog.jsonb_build_object(
  'schema','reality-source-bound-unsettled-transition-v1',
  'transition_family','SIGNED_CHAT_DEVELOPMENT_RECOVERY',
  'expected_transition','QUARANTINE_PROVIDER_RECEIPTED',
  'observed_phase',q.phase,'fenced_at',q.updated_at,
  'original_work_id',q.original_work_id,
  'source_original_shift_id',h.shift_id,
  'trigger_id',q.trigger_id,'source_claim_id',q.claim_id,
  'source_ref',q.source_ref,'source_message_id',q.source_message_id,
  'source_sha256',q.source_sha256,
  'blocker_receipt_sha256',q.blocker_receipt_sha256,
  'spec_sha256',q.recovery_spec_sha256,
  'candidate_sha256',candidate->>'candidate_sha256',
  'candidate_base_sha',candidate->>'base_sha',
  'candidate_source_blob_sha',candidate->>'source_blob_sha',
  'candidate_target_path',candidate->>'target_path',
  'target_review_receipt_sha256',q.qualification_receipt->>'target_review_receipt_sha256',
  'syntax_verified',true,
  'expected_quarantine_branch',branch,
  'provider_effect_known',false,
  'root_cause_verified',false,
  'provider_effect_replayed',false,
  'investigation_only',true,
  'new_original_admitted',false,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);
end $function$
;
revoke all on function reality_internal.signed_chat_fenced_transition_evidence_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function reality_internal.signed_chat_fenced_transition_evidence_v1(uuid,uuid) to service_role;
