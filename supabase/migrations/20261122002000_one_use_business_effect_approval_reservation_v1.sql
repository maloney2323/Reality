-- One-use exact business-effect authority, attached to the EXISTING
-- original work + Continuity source + shift, not a parallel job history.
-- An owner must click approval AFTER reviewing the exact target and payload.
-- A signed worker can reserve a matching approved effect only ONCE.
-- Provider outcome and independent acceptance remain separate obligations.
create table if not exists reality_internal.owner_business_original_effect_approvals_v1(
 packet_id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 shift_id uuid not null references reality_internal.governed_employee_shifts_v1(shift_id),
 original_work_id text not null,
 continuity_ref text not null,
 source_ref text not null,
 source_epoch_fingerprint text not null,
 job_class text not null,
 effect_type text not null,
 target_ref text not null,
 payload_sha256 text not null,
 registered_execution_adapter text not null,
 proposal_fingerprint text not null,
 authority_state text not null default 'AWAITING_EXACT_OWNER_APPROVAL',
 approval_request_id uuid unique,
 approval_receipt_sha256 text,
 approved_at timestamptz,
 reserved_worker_run_id uuid unique,
 reserved_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 unique(owner_id,original_work_id,job_class,effect_type,target_ref,payload_sha256),
 constraint owner_business_effect_original_shape check(
  original_work_id~'^work:[a-f0-9]{32}$'
  and continuity_ref~'^reality:qualification:[a-f0-9]{64}$'
  and source_epoch_fingerprint~'^[a-f0-9]{64}$'
  and job_class~'^[a-z][a-z0-9_-]{2,90}$'
  and effect_type in('INTERNAL_READ','INTERNAL_DRAFT',
   'CUSTOMER_SEND','MARKETING_PUBLISH','PROCUREMENT_COMMIT','FINANCIAL_COMMIT')
  and length(trim(target_ref)) between 6 and 450
  and payload_sha256~'^sha256:[a-f0-9]{64}$'
  and registered_execution_adapter~'^reality_[a-z0-9_]+_v[0-9]+$'
  and proposal_fingerprint~'^sha256:[a-f0-9]{64}$'
 ),
 constraint owner_business_effect_state_consistency check(
  (authority_state='AWAITING_EXACT_OWNER_APPROVAL'
   and approval_request_id is null and approved_at is null
   and approval_receipt_sha256 is null
   and reserved_worker_run_id is null and reserved_at is null)
  or (authority_state='APPROVED_ONE_USE_NOT_EXECUTED'
   and approval_request_id is not null and approved_at is not null
   and approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   and reserved_worker_run_id is null and reserved_at is null)
  or (authority_state='PROVIDER_EFFECT_RESERVED_RECONCILE_ONLY'
   and approval_request_id is not null and approved_at is not null
   and approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   and reserved_worker_run_id is not null and reserved_at is not null)
 )
);
alter table reality_internal.owner_business_original_effect_approvals_v1
 enable row level security;
revoke all on reality_internal.owner_business_original_effect_approvals_v1
 from public,anon,authenticated;
grant select,insert,update on
 reality_internal.owner_business_original_effect_approvals_v1 to service_role;

create or replace function public.reality_stage_exact_business_original_effect_review_v1(
 p_owner_id uuid,p_original_work_id text,p_job_class text,
 p_effect_type text,p_target_ref text,p_payload_sha256 text
) returns jsonb language plpgsql set search_path to ''
as $function$
declare
 v jsonb;v_route record;v_p record;v_hash text;
begin
 if current_user<>'service_role' or p_owner_id is null
  or p_original_work_id!~'^work:[a-f0-9]{32}$'
  or p_job_class!~'^[a-z][a-z0-9_-]{2,90}$'
  or p_effect_type not in ('INTERNAL_READ','INTERNAL_DRAFT',
    'CUSTOMER_SEND','MARKETING_PUBLISH','PROCUREMENT_COMMIT','FINANCIAL_COMMIT')
  or p_target_ref is null or length(trim(p_target_ref)) not between 6 and 450
  or p_payload_sha256!~'^sha256:[a-f0-9]{64}$'
 then raise exception 'BUSINESS_EFFECT_EXACT_OWNER_PACKET_FIELDS_REQUIRED';end if;
 v:=public.reality_read_owner_exact_business_effect_preflight_v1(
  p_owner_id,p_original_work_id,p_job_class,p_effect_type);
 -- A maintenance-only shift does NOT become a business-wide warrant.
 -- The explicit one-use owner action is the ONLY potential new effect authority.
 if v->>'status'<>'OWNER_EXACT_BUSINESS_EFFECT_AUTHORITY_PREFLIGHT'
  or v->>'canonical_original_admission_verified'<>'true'
  or v->>'canonical_source_current'<>'true'
  or v->>'consented_business_provider_verified'<>'true'
  or v->>'registered_executor_independently_verified'<>'true'
  or v->>'independent_final_original_already_present'<>'false'
  or v->>'execution_claim_created'<>'false'
  or v->>'owner_review_before_execution_claim'<>'true'
  or v->>'execution_authorized'<>'false'
  or v->>'itemized_approval_granted'<>'false'
  or v->>'registered_executor_adapter' is null
 then return pg_catalog.jsonb_build_object(
   'status','EXACT_BUSINESS_EFFECT_OWNER_REVIEW_NOT_YET_PROVABLE',
   'next_gate',v->>'next_gate','owner_approval_ready',false,
   'execution_authorized',false,'original_job_completed',false,
   'new_shift_started',false,'production_changed',false);end if;
 select r.source_epoch_fingerprint,r.continuity_ref into v_route
 from reality_internal.owner_continuity_qualification_routes_v1 r
 where r.owner_id=p_owner_id and r.original_work_id=p_original_work_id
 and r.continuity_ref=v->>'continuity_ref' and r.source_ref=v->>'source_ref';
 if not found then raise exception 'BUSINESS_EFFECT_EXACT_SOURCE_MOVED';end if;
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to('business-exact-one-use-v1|'||
  p_owner_id::text||'|'||(v->>'shift_id')||'|'||p_original_work_id||'|'||
  (v->>'continuity_ref')||'|'||(v->>'source_ref')||'|'||
  v_route.source_epoch_fingerprint||'|'||p_job_class||'|'||p_effect_type||'|'||
  trim(p_target_ref)||'|'||p_payload_sha256||'|'||
  (v->>'registered_executor_adapter'),'UTF8')),'hex');
 insert into reality_internal.owner_business_original_effect_approvals_v1(
  owner_id,shift_id,original_work_id,continuity_ref,source_ref,
  source_epoch_fingerprint,job_class,effect_type,target_ref,payload_sha256,
  registered_execution_adapter,proposal_fingerprint)
 values(p_owner_id,(v->>'shift_id')::uuid,p_original_work_id,
  v->>'continuity_ref',v->>'source_ref',v_route.source_epoch_fingerprint,
  p_job_class,p_effect_type,trim(p_target_ref),p_payload_sha256,
  v->>'registered_executor_adapter',v_hash)
 on conflict (owner_id,original_work_id,job_class,effect_type,
  target_ref,payload_sha256) do nothing;
 select * into v_p from reality_internal.owner_business_original_effect_approvals_v1 p
 where p.owner_id=p_owner_id and p.original_work_id=p_original_work_id
  and p.job_class=p_job_class and p.effect_type=p_effect_type
  and p.target_ref=trim(p_target_ref) and p.payload_sha256=p_payload_sha256;
 if not found or v_p.proposal_fingerprint<>v_hash
  or v_p.authority_state<>'AWAITING_EXACT_OWNER_APPROVAL'
  or v_p.created_at<clock_timestamp()-interval '20 minutes'
 then return pg_catalog.jsonb_build_object(
  'status','EXACT_BUSINESS_EFFECT_PACKET_STALE_OR_ALREADY_USED_NO_REPLAY',
  'owner_approval_ready',false,'execution_authorized',false,
  'new_shift_started',false,'production_changed',false);end if;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_BUSINESS_EFFECT_OWNER_REVIEW_STAGED',
  'owner_id',p_owner_id,'packet_id',v_p.packet_id,
  'shift_id',v_p.shift_id,'original_work_id',v_p.original_work_id,
  'continuity_ref',v_p.continuity_ref,'source_ref',v_p.source_ref,
  'source_epoch_fingerprint',v_p.source_epoch_fingerprint,
  'job_class',v_p.job_class,'effect_type',v_p.effect_type,
  'target_ref',v_p.target_ref,'payload_sha256',v_p.payload_sha256,
  'registered_execution_adapter',v_p.registered_execution_adapter,
  'proposal_fingerprint',v_p.proposal_fingerprint,
  'owner_approval_ready',true,'owner_approval_granted',false,
  'execution_authorized',false,'effect_reserved',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false,'new_shift_started',false);
end $function$;
revoke all on function public.reality_stage_exact_business_original_effect_review_v1(uuid,text,text,text,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_stage_exact_business_original_effect_review_v1(uuid,text,text,text,text,text)
 to service_role;

create or replace function public.reality_owner_approve_exact_business_original_effect_v1(
 p_owner_id uuid,p_packet_id uuid,p_proposal_fingerprint text,
 p_approval_request_id uuid
) returns jsonb language plpgsql set search_path to ''
as $function$
declare v_p record; v jsonb;v_source record; v_receipt text;
begin
 if current_user<>'service_role' or p_owner_id is null
 or p_packet_id is null or p_approval_request_id is null
 or p_proposal_fingerprint!~'^sha256:[a-f0-9]{64}$'
 then raise exception 'BUSINESS_EFFECT_EXACT_OWNER_APPROVAL_REQUIRED';end if;
 select * into v_p from reality_internal.owner_business_original_effect_approvals_v1
 where owner_id=p_owner_id and packet_id=p_packet_id for update;
 if not found or v_p.proposal_fingerprint<>p_proposal_fingerprint
 then raise exception 'BUSINESS_EFFECT_OWNER_PACKET_MISMATCH';end if;
 if v_p.authority_state<>'AWAITING_EXACT_OWNER_APPROVAL'
 then return pg_catalog.jsonb_build_object(
   'status','EXACT_BUSINESS_EFFECT_ALREADY_APPROVED_OR_RESERVED_NO_REPLAY',
   'packet_id',v_p.packet_id,'owner_id',p_owner_id,
   'approval_receipt_sha256',v_p.approval_receipt_sha256,
   'execution_authorized',false,'effect_reserved',
    v_p.reserved_worker_run_id is not null,
   'original_job_completed',false,'production_changed',false);end if;
 if v_p.created_at<clock_timestamp()-interval '20 minutes'
 then raise exception 'BUSINESS_EFFECT_OWNER_REVIEW_EXPIRED';end if;
 v:=public.reality_read_owner_exact_business_effect_preflight_v1(
  p_owner_id,v_p.original_work_id,v_p.job_class,v_p.effect_type);
 select r.source_epoch_fingerprint into v_source
 from reality_internal.owner_continuity_qualification_routes_v1 r
 where r.owner_id=p_owner_id and r.original_work_id=v_p.original_work_id
  and r.continuity_ref=v_p.continuity_ref
  and r.source_ref=v_p.source_ref;
 if v->>'status'<>'OWNER_EXACT_BUSINESS_EFFECT_AUTHORITY_PREFLIGHT'
  or v->>'shift_id'<>v_p.shift_id::text
  or v->>'canonical_original_admission_verified'<>'true'
  or v->>'canonical_source_current'<>'true'
  or v->>'consented_business_provider_verified'<>'true'
  or v->>'registered_executor_independently_verified'<>'true'
  or v->>'independent_final_original_already_present'<>'false'
  or v->>'registered_executor_adapter'<>v_p.registered_execution_adapter
  or v_source.source_epoch_fingerprint<>v_p.source_epoch_fingerprint
 then raise exception 'BUSINESS_EFFECT_SOURCE_AUTHORITY_CHANGED_REVIEW_AGAIN';end if;
 v_receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to('business-approved-one-use-v1|'||
   v_p.packet_id::text||'|'||p_approval_request_id::text||'|'||
   v_p.proposal_fingerprint,'UTF8')),'hex');
 update reality_internal.owner_business_original_effect_approvals_v1
 set authority_state='APPROVED_ONE_USE_NOT_EXECUTED',
  approval_request_id=p_approval_request_id,
  approval_receipt_sha256=v_receipt,approved_at=clock_timestamp()
 where packet_id=p_packet_id and authority_state='AWAITING_EXACT_OWNER_APPROVAL';
 if not found then raise exception 'BUSINESS_EFFECT_APPROVAL_ATOMIC_CONFLICT';end if;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_BUSINESS_EFFECT_OWNER_APPROVED_ONE_USE',
  'owner_id',p_owner_id,'packet_id',p_packet_id,'shift_id',v_p.shift_id,
  'original_work_id',v_p.original_work_id,
  'effect_type',v_p.effect_type,'target_ref',v_p.target_ref,
  'payload_sha256',v_p.payload_sha256,'approval_receipt_sha256',v_receipt,
  'itemized_owner_approval_recorded',true,
  'execution_authorized',false,'effect_reserved',false,
  'original_job_completed',false,'new_shift_started',false,
  'installation_authorized',false,'production_changed',false);
end $function$;
revoke all on function public.reality_owner_approve_exact_business_original_effect_v1(uuid,uuid,text,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_owner_approve_exact_business_original_effect_v1(uuid,uuid,text,uuid)
 to service_role;

create or replace function public.reality_claim_approved_business_original_effect_v1(
 p_packet_id uuid,p_worker_run_id uuid,p_registered_execution_adapter text
) returns jsonb language plpgsql set search_path to ''
as $function$
declare v_p record; v jsonb;v_epoch record;
begin
 if current_user<>'service_role' or p_packet_id is null
 or p_worker_run_id is null or
 p_registered_execution_adapter!~'^reality_[a-z0-9_]+_v[0-9]+$'
 then raise exception 'BUSINESS_EFFECT_SIGNED_WORKER_EXACT_ADAPTER_REQUIRED';end if;
 if not exists(select 1
  from reality_internal.governed_preview_shift_worker_leases_v1 l
  where l.worker_key='preview-governed-employee-shift-worker'
    and l.claim_id=p_worker_run_id
    and l.released_at is null
    and l.lease_expires_at>clock_timestamp())
 then return pg_catalog.jsonb_build_object(
  'status','EXACT_BUSINESS_EFFECT_SIGNED_WORKER_LEASE_REQUIRED',
  'effect_reserved',false,'execution_authorized',false,
  'original_job_completed',false,'production_changed',false);end if;
 select * into v_p from reality_internal.owner_business_original_effect_approvals_v1
 where packet_id=p_packet_id for update;
 if not found or v_p.authority_state<>'APPROVED_ONE_USE_NOT_EXECUTED'
  or v_p.registered_execution_adapter<>p_registered_execution_adapter
  or v_p.approved_at<clock_timestamp()-interval '30 minutes'
 then return pg_catalog.jsonb_build_object(
  'status','EXACT_BUSINESS_EFFECT_NOT_APPROVED_OR_ALREADY_RESERVED_NO_REPLAY',
  'effect_reserved',false,'execution_authorized',false,
  'original_job_completed',false,'production_changed',false);end if;
 v:=public.reality_read_owner_exact_business_effect_preflight_v1(
  v_p.owner_id,v_p.original_work_id,v_p.job_class,v_p.effect_type);
 select r.source_epoch_fingerprint into v_epoch
 from reality_internal.owner_continuity_qualification_routes_v1 r
 where r.owner_id=v_p.owner_id and r.original_work_id=v_p.original_work_id
  and r.source_ref=v_p.source_ref and r.continuity_ref=v_p.continuity_ref;
 if v->>'status'<>'OWNER_EXACT_BUSINESS_EFFECT_AUTHORITY_PREFLIGHT'
  or v->>'shift_id'<>v_p.shift_id::text
  or v->>'canonical_original_admission_verified'<>'true'
  or v->>'canonical_source_current'<>'true'
  or v->>'consented_business_provider_verified'<>'true'
  or v->>'registered_executor_independently_verified'<>'true'
  or v->>'independent_final_original_already_present'<>'false'
  or v->>'registered_executor_adapter'<>v_p.registered_execution_adapter
  or v_epoch.source_epoch_fingerprint<>v_p.source_epoch_fingerprint
 then return pg_catalog.jsonb_build_object(
  'status','EXACT_BUSINESS_EFFECT_PROVIDER_OR_SOURCE_DRIFT_NO_CLAIM',
  'effect_reserved',false,'execution_authorized',false,
  'original_job_completed',false,'production_changed',false);end if;
 update reality_internal.owner_business_original_effect_approvals_v1
  set authority_state='PROVIDER_EFFECT_RESERVED_RECONCILE_ONLY',
   reserved_worker_run_id=p_worker_run_id,reserved_at=clock_timestamp()
 where packet_id=p_packet_id and authority_state='APPROVED_ONE_USE_NOT_EXECUTED';
 if not found then raise exception 'BUSINESS_EFFECT_ATOMIC_RESERVATION_LOST';end if;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_APPROVED_BUSINESS_EFFECT_SINGLE_USE_RESERVED',
  'packet_id',v_p.packet_id,'owner_id',v_p.owner_id,
  'shift_id',v_p.shift_id,'original_work_id',v_p.original_work_id,
  'continuity_ref',v_p.continuity_ref,'source_ref',v_p.source_ref,
  'source_epoch_fingerprint',v_p.source_epoch_fingerprint,
  'job_class',v_p.job_class,'effect_type',v_p.effect_type,
  'target_ref',v_p.target_ref,'payload_sha256',v_p.payload_sha256,
  'registered_execution_adapter',v_p.registered_execution_adapter,
  'approval_receipt_sha256',v_p.approval_receipt_sha256,
  'reserved_worker_run_id',p_worker_run_id,
  'one_use_reserved',true,'provider_effect_performed',false,
  'independent_final_original_verified',false,
  'original_job_completed',false,'installation_authorized',false,
  'new_shift_started',false,'production_changed',false);
end $function$;
revoke all on function public.reality_claim_approved_business_original_effect_v1(uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_claim_approved_business_original_effect_v1(uuid,uuid,text)
 to service_role;