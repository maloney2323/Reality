-- Owner-reviewed effect content must survive the worker wake, privately.
alter table reality_internal.owner_business_original_effect_approvals_v1
 add column if not exists effect_payload text;
alter table reality_internal.owner_business_original_effect_approvals_v1
 add constraint owner_business_effect_exact_payload_digest_v1 check(
  effect_payload is not null and length(effect_payload) between 8 and 4000
  and payload_sha256='sha256:'||pg_catalog.encode(
   pg_catalog.sha256(pg_catalog.convert_to(effect_payload,'UTF8')),'hex')
 );
drop function if exists public.reality_stage_exact_business_original_effect_review_v1(
 uuid,text,text,text,text,text);
create or replace function public.reality_stage_exact_business_original_effect_review_v1(
 p_owner_id uuid,p_original_work_id text,p_job_class text,
 p_effect_type text,p_target_ref text,p_payload_sha256 text,p_effect_payload text
) returns jsonb language plpgsql set search_path to ''
as $function$
declare
 v jsonb; epoch text; ref text; fingerprint text; packet record;
begin
 if current_user <> 'service_role' or p_owner_id is null
  or p_original_work_id is null or p_original_work_id !~ '^work:[a-f0-9]{32}$'
  or p_target_ref is null or length(trim(p_target_ref)) not between 6 and 450
  or p_effect_payload is null or length(p_effect_payload) not between 8 and 4000
  or p_payload_sha256 is distinct from 'sha256:'||pg_catalog.encode(
   pg_catalog.sha256(pg_catalog.convert_to(p_effect_payload,'UTF8')),'hex')
 then
  raise exception 'EXACT_BUSINESS_EFFECT_OWNER_AND_PAYLOAD_REQUIRED';
 end if;
 v:=public.reality_read_owner_exact_business_effect_preflight_v1(
  p_owner_id,p_original_work_id,p_job_class,p_effect_type);
 if v->>'status'<>'OWNER_EXACT_BUSINESS_EFFECT_AUTHORITY_PREFLIGHT'
  or v->>'canonical_original_admission_verified'<>'true'
  or v->>'canonical_source_current'<>'true'
  or v->>'consented_business_provider_verified'<>'true'
  or v->>'registered_executor_independently_verified'<>'true'
  or v->>'independent_final_original_already_present'<>'false'
  or v->>'execution_claim_created'<>'false'
  or v->>'registered_executor_adapter' is null
 then
  return pg_catalog.jsonb_build_object(
   'status','EXACT_BUSINESS_EFFECT_OWNER_REVIEW_NOT_YET_PROVABLE',
   'next_gate',v->>'next_gate','owner_approval_ready',false,
   'execution_authorized',false,'new_shift_started',false,
   'production_changed',false);
 end if;
 select r.source_epoch_fingerprint,r.continuity_ref into epoch,ref
 from reality_internal.owner_continuity_qualification_routes_v1 r
 where r.owner_id=p_owner_id and r.original_work_id=p_original_work_id
  and r.source_ref=v->>'source_ref' and r.continuity_ref=v->>'continuity_ref';
 if epoch is null or ref is null
 then raise exception 'EXACT_BUSINESS_EFFECT_SOURCE_EPOCH_NOT_VERIFIED';end if;
 fingerprint:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to('one-use-business-owner-effect-v1|'||
   p_owner_id::text||'|'||(v->>'shift_id')||'|'||p_original_work_id||'|'||
   ref||'|'||(v->>'source_ref')||'|'||epoch||'|'||p_job_class||'|'||
   p_effect_type||'|'||trim(p_target_ref)||'|'||p_payload_sha256||'|'||
   (v->>'registered_executor_adapter'),'UTF8')),'hex');
 insert into reality_internal.owner_business_original_effect_approvals_v1(
  owner_id,shift_id,original_work_id,continuity_ref,source_ref,
  source_epoch_fingerprint,job_class,effect_type,target_ref,payload_sha256,
  effect_payload,registered_execution_adapter,proposal_fingerprint)
 values(p_owner_id,(v->>'shift_id')::uuid,p_original_work_id,ref,
  v->>'source_ref',epoch,p_job_class,p_effect_type,trim(p_target_ref),
  p_payload_sha256,p_effect_payload,v->>'registered_executor_adapter',fingerprint)
 on conflict (owner_id,original_work_id,job_class,effect_type,
  target_ref,payload_sha256) do nothing;
 select * into packet from reality_internal.owner_business_original_effect_approvals_v1
 where owner_id=p_owner_id and original_work_id=p_original_work_id
  and job_class=p_job_class and effect_type=p_effect_type
  and target_ref=trim(p_target_ref) and payload_sha256=p_payload_sha256;
 if not found or packet.proposal_fingerprint<>fingerprint
  or packet.authority_state<>'AWAITING_EXACT_OWNER_APPROVAL'
  or packet.created_at<clock_timestamp()-interval '20 minutes'
 then return pg_catalog.jsonb_build_object(
  'status','EXACT_BUSINESS_EFFECT_PACKET_STALE_OR_ALREADY_USED_NO_REPLAY',
  'owner_approval_ready',false,'execution_authorized',false,
  'production_changed',false);end if;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_BUSINESS_EFFECT_OWNER_REVIEW_STAGED',
  'packet_id',packet.packet_id,'owner_id',packet.owner_id,
  'shift_id',packet.shift_id,'original_work_id',packet.original_work_id,
  'continuity_ref',packet.continuity_ref,'source_ref',packet.source_ref,
  'source_epoch_fingerprint',packet.source_epoch_fingerprint,
  'job_class',packet.job_class,'effect_type',packet.effect_type,
  'target_ref',packet.target_ref,'payload_sha256',packet.payload_sha256,
  'registered_execution_adapter',packet.registered_execution_adapter,
  'proposal_fingerprint',packet.proposal_fingerprint,
  'owner_approval_ready',true,'owner_approval_granted',false,
  'execution_authorized',false,'effect_reserved',false,
  'original_job_completed',false,'production_changed',false,
  'new_shift_started',false);
end;
$function$;
revoke all on function public.reality_stage_exact_business_original_effect_review_v1(uuid,text,text,text,text,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_stage_exact_business_original_effect_review_v1(uuid,text,text,text,text,text,text)
 to service_role;
