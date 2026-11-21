-- A non-authoritative, evidence-only handoff for an EXISTING signed shift
-- PR-review original. NEVER claims customer work, installs, or approves.
-- Service-role exclusively; the owner-specific read checks live source facts.
create table if not exists reality_internal.signed_original_lineage_packets_v1 (
 packet_id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 shift_id uuid not null,
 original_work_id text not null check(original_work_id ~ '^work:[a-f0-9]{32}$'),
 source_ref text not null,
 source_claim_id uuid not null,
 maintenance_id uuid not null,
 evidence jsonb not null,
 evidence_sha256 text not null check(evidence_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 state text not null check(state='EVIDENCE_BOUND_CUSTOMER_ORIGINAL_UNADMITTED'),
 canonical_customer_original_verified boolean not null default false
    check(canonical_customer_original_verified=false),
 original_customer_claim_admitted boolean not null default false
    check(original_customer_claim_admitted=false),
 independent_final_receipt_verified boolean not null default false
    check(independent_final_receipt_verified=false),
 installation_authorized boolean not null default false
    check(installation_authorized=false),
 production_changed boolean not null default false
    check(production_changed=false),
 created_at timestamptz not null default clock_timestamp(),
 unique(shift_id,original_work_id,source_ref,source_claim_id)
);
alter table reality_internal.signed_original_lineage_packets_v1
 enable row level security;
revoke all on reality_internal.signed_original_lineage_packets_v1
 from public,anon,authenticated;
grant select,insert on reality_internal.signed_original_lineage_packets_v1
 to service_role;

create or replace function public.reality_stage_signed_original_lineage_packet_v1(
 p_shift_id uuid,p_original_work_id text
) returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare
 v record;
 v_gate jsonb;
 v_evidence jsonb;
 v_sha text;
 v_row reality_internal.signed_original_lineage_packets_v1%rowtype;
 v_count integer;
begin
 if current_user<>'service_role' or p_shift_id is null
    or p_original_work_id is null
    or p_original_work_id !~ '^work:[a-f0-9]{32}$'
 then raise exception 'SIGNED_ORIGINAL_LINEAGE_SIGNED_SERVICE_SCOPE_REQUIRED'; end if;

 v_gate:=public.reality_read_same_original_postmaintenance_gate_v1(p_shift_id);
 if v_gate->>'status'<>'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE'
   or v_gate->>'warrant_mode'<>'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
   or v_gate->>'original_work_id'<>p_original_work_id
   or v_gate->>'next_action'<>'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI'
   or v_gate->>'canonical_owner_business_original_missing'<>'true'
   or v_gate->>'case_specific_maintenance_ci_red_attested'<>'false'
   or v_gate->>'original_job_completed'<>'false'
   or v_gate->>'installation_authorized'<>'false'
   or v_gate->>'production_changed'<>'false'
   or v_gate->>'read_only'<>'true'
 then return jsonb_build_object(
  'status','ORIGINAL_LINEAGE_NOT_ELIGIBLE_FOR_EVIDENCE_ONLY_PACKET',
  'shift_id',p_shift_id,'original_work_id',p_original_work_id,
  'source_bound',false,'customer_original_verified',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false,'new_shift_started',false);
 end if;

 -- The actual PR-review claim is read directly from the SAME source,
 -- not imported from another incident on this owner's shift.
 select s.owner_id,s.plan_fingerprint,o.original_work_id,o.claim_id,
   o.source_ref,o.source_proof_sha256,o.phase,
   t.proof_sha256 as shift_proof_sha256,t.step_index,
   m.incident_id as maintenance_id,m.origin_shift_id,
   m.independent_review_receipt_sha256,
   m.independent_review_status,m.original_customer_work_id,
   h.handoff_receipt_sha256,
   h.independent_baseline_receipt_sha256,
   h.independent_diagnostic_receipt_sha256,
   h.source_epoch_receipt_sha256,
   w.source_scope
 into v
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w
   on w.shift_id=s.shift_id and w.owner_id=s.owner_id
   and w.plan_fingerprint=s.plan_fingerprint
 join reality_internal.riley_pr_review_originals_v1 o
   on o.shift_id=s.shift_id and o.owner_id=s.owner_id
 join reality_internal.governed_employee_shift_steps_v1 t
   on t.shift_id=s.shift_id and t.source_ref=o.source_ref
   and t.step_index between 2 and 5
 join reality_internal.owner_internal_maintenance_jobs_v1 m
   on m.owner_id=s.owner_id and m.claimed_shift_id=s.shift_id
   and m.source_ref=o.source_ref
 join reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
   on h.owner_id=s.owner_id and h.shift_id=s.shift_id
   and h.maintenance_id=m.incident_id and h.source_ref=o.source_ref
   and h.existing_original_work_id=o.original_work_id
 where s.shift_id=p_shift_id
   and s.owner_id=(v_gate->>'owner_id')::uuid
   and s.status='AWAITING_EXACT_ORIGINAL_WORK'
   and s.authorized_at is not null and s.closed_at is null
   and s.planned_end_at='infinity'::timestamptz
   and o.original_work_id=p_original_work_id
   and o.phase='BLOCKED'
   and o.claim_id is not null
   and t.state='SOURCE_CHECKED' and t.source_status='OPEN_PULL_REQUEST'
   and w.state='ACTIVE'
   and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
   and m.independent_review_status='NO_ORIGINAL_ADMISSION_CONFIRMED'
   and m.original_customer_work_id is null
   and m.independent_frozen_test_receipt_sha256 is null
   and m.original_job_completed=false and m.production_changed=false
   and h.original_job_completed=false and h.installation_authorized=false
   and h.production_changed=false
   and o.source_ref=v_gate->>'source_ref'
   and o.source_ref~'^https://github[.]com/[^/]+/[^/]+/pull/[1-9][0-9]*$'
   and o.source_proof_sha256=t.proof_sha256
   and o.source_proof_sha256~'^sha256:[a-f0-9]{64}$'
   and m.independent_review_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   and h.handoff_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   and h.independent_baseline_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   and h.independent_diagnostic_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   and h.source_epoch_receipt_sha256=
       v_gate->>'maintenance_source_epoch_receipt_sha256'
   and exists(
     select 1 from pg_catalog.jsonb_array_elements(
       case when jsonb_typeof(w.source_scope)='array'
        then w.source_scope else '[]'::jsonb end
     ) as scope(entry)
     where scope.entry->>'source_ref'=o.source_ref
       and scope.entry->>'maintenance_id'=m.incident_id::text
       and scope.entry->>'origin_shift_id'=m.origin_shift_id::text
       and scope.entry->>'independent_review_receipt_sha256'=
           m.independent_review_receipt_sha256)
   and not exists (
    select 1 from reality_internal.governed_employee_original_claims_v1 c
    where c.owner_id=s.owner_id and c.source_ref=o.source_ref
      and c.shift_id in(m.origin_shift_id,p_shift_id))
   and not exists(
    select 1 from reality_internal.governed_original_independent_final_receipts_v1 f
    where f.owner_id=s.owner_id and f.shift_id=p_shift_id
      and f.original_work_id=o.original_work_id)
 limit 1;
 if not found then
   return jsonb_build_object(
    'status','ORIGINAL_LINEAGE_INDEPENDENT_SOURCE_JOIN_NOT_VERIFIED',
    'shift_id',p_shift_id,'original_work_id',p_original_work_id,
    'source_bound',false,'customer_original_verified',false,
    'original_job_completed',false,'installation_authorized',false,
    'production_changed',false,'new_shift_started',false);
 end if;
 -- A silently duplicated claim would make the original identity ambiguous.
 select count(*)::int into v_count
 from reality_internal.riley_pr_review_originals_v1 o
 where o.shift_id=p_shift_id and o.owner_id=v.owner_id
   and o.original_work_id=p_original_work_id;
 if v_count<>1 then
   raise exception 'SIGNED_ORIGINAL_LINEAGE_AMBIGUOUS_ORIGINAL_CLAIM';
 end if;
 v_evidence:=jsonb_build_object(
   'schema','reality-signed-original-lineage-packet-v1',
   'owner_id',v.owner_id,'shift_id',p_shift_id,
   'original_work_id',v.original_work_id,'source_ref',v.source_ref,
   'source_claim_id',v.claim_id,
   'source_proof_sha256',v.source_proof_sha256,
   'shift_source_proof_sha256',v.shift_proof_sha256,
   'source_step_index',v.step_index,
   'maintenance_id',v.maintenance_id,'origin_shift_id',v.origin_shift_id,
   'independent_origin_review_receipt_sha256',
     v.independent_review_receipt_sha256,
   'maintenance_handoff_receipt_sha256',v.handoff_receipt_sha256,
   'independent_baseline_receipt_sha256',
     v.independent_baseline_receipt_sha256,
   'independent_diagnostic_receipt_sha256',
     v.independent_diagnostic_receipt_sha256,
   'source_epoch_receipt_sha256',v.source_epoch_receipt_sha256,
   'continuity_event_id',v_gate->>'independent_final_receipt_id',
   'evidence_stage','SOURCE_CLAIM_BOUND_CUSTOMER_ORIGINAL_UNADMITTED',
   'missing_evidence','CANONICAL_CUSTOMER_BUSINESS_ORIGINAL_AND_ACCEPTANCE',
   'required_independent_review',
    'DISTINCT_REVIEWER_CONFIRMS_EXACT_SOURCE_CLAIM_HASH_AND_CUSTOMER_ORIGINAL',
   'next_action','VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
   'customer_job_claim_created',false,
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false,'new_shift_started',false
 );
 v_sha:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
     pg_catalog.convert_to(v_evidence::text,'UTF8')),'hex');
 insert into reality_internal.signed_original_lineage_packets_v1 (
  owner_id,shift_id,original_work_id,source_ref,source_claim_id,
  maintenance_id,evidence,evidence_sha256,state
 ) values(
  v.owner_id,p_shift_id,v.original_work_id,v.source_ref,v.claim_id,
  v.maintenance_id,v_evidence,v_sha,
  'EVIDENCE_BOUND_CUSTOMER_ORIGINAL_UNADMITTED'
 ) on conflict (shift_id,original_work_id,source_ref,source_claim_id)
   do nothing;
 select * into v_row
 from reality_internal.signed_original_lineage_packets_v1
 where shift_id=p_shift_id and original_work_id=p_original_work_id
   and source_ref=v.source_ref and source_claim_id=v.claim_id;
 if v_row.packet_id is null or v_row.owner_id<>v.owner_id
   or v_row.maintenance_id<>v.maintenance_id
   or v_row.evidence_sha256<>v_sha
   or v_row.evidence<>v_evidence
   or v_row.state<>'EVIDENCE_BOUND_CUSTOMER_ORIGINAL_UNADMITTED'
   or v_row.original_customer_claim_admitted
   or v_row.canonical_customer_original_verified
   or v_row.independent_final_receipt_verified
   or v_row.installation_authorized
   or v_row.production_changed
 then raise exception 'SIGNED_ORIGINAL_LINEAGE_IMMUTABLE_RECEIPT_DRIFT'; end if;
 return jsonb_build_object(
  'status','SIGNED_ORIGINAL_LINEAGE_EVIDENCE_PACKET_DURABLE',
  'packet_id',v_row.packet_id,'owner_id',v_row.owner_id,
  'shift_id',v_row.shift_id,'original_work_id',v_row.original_work_id,
  'source_ref',v_row.source_ref,'source_claim_id',v_row.source_claim_id,
  'maintenance_id',v_row.maintenance_id,
  'evidence_sha256',v_row.evidence_sha256,
  'source_bound',true,'customer_original_verified',false,
  'original_claim_admitted',false,'independent_final_receipt_verified',false,
  'next_action','VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
  'independent_review_required',true,'read_only_for_execution',true,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false,'new_shift_started',false);
end $$;
revoke all on function public.reality_stage_signed_original_lineage_packet_v1(uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_stage_signed_original_lineage_packet_v1(uuid,text)
 to service_role;

create or replace function public.reality_read_owner_original_lineage_packet_v1(
 p_owner_id uuid
) returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v record; v_source record; v_warrant record; v_hash text;
begin
 if current_user<>'service_role' or p_owner_id is null then
   raise exception 'ORIGINAL_LINEAGE_READ_SERVICE_OWNER_REQUIRED'; end if;
 select h.* into v
 from reality_internal.signed_original_lineage_packets_v1 h
 join reality_internal.governed_employee_shifts_v1 s
 on s.shift_id=h.shift_id and s.owner_id=h.owner_id
 where h.owner_id=p_owner_id and s.closed_at is null
   and s.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 order by h.created_at desc limit 1;
 if not found then return jsonb_build_object(
   'status','NO_SIGNED_ORIGINAL_LINEAGE_PACKET',
   'owner_id',p_owner_id,'packet_verified',false,
   'original_job_completed',false,'installation_authorized',false,
   'production_changed',false); end if;
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(v.evidence::text,'UTF8')),'hex');
 -- Revalidate exact original and maintenance source. Evidence is durable,
 -- but the existence of a customer original must be checked separately.
 select o.claim_id,o.source_proof_sha256,m.independent_review_receipt_sha256,
   m.original_customer_work_id,m.origin_shift_id,
   h.handoff_receipt_sha256,h.source_epoch_receipt_sha256,
   t.proof_sha256 as shift_proof_sha256
 into v_source
 from reality_internal.riley_pr_review_originals_v1 o
 join reality_internal.owner_internal_maintenance_jobs_v1 m
   on m.owner_id=o.owner_id and m.claimed_shift_id=o.shift_id
   and m.source_ref=o.source_ref and m.incident_id=v.maintenance_id
 join reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
   on h.maintenance_id=m.incident_id and h.owner_id=o.owner_id
   and h.shift_id=o.shift_id and h.source_ref=o.source_ref
 join reality_internal.governed_employee_shift_steps_v1 t
   on t.shift_id=o.shift_id and t.source_ref=o.source_ref
 where o.owner_id=v.owner_id and o.shift_id=v.shift_id
   and o.original_work_id=v.original_work_id
   and o.source_ref=v.source_ref and o.claim_id=v.source_claim_id
   and h.existing_original_work_id=v.original_work_id
 limit 1;
 select w.source_scope,w.state into v_warrant
 from reality_internal.governed_employee_completion_warrants_v1 w
 where w.shift_id=v.shift_id and w.owner_id=v.owner_id
   and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS';
 if v_hash<>v.evidence_sha256 or v_source.claim_id is null
  or v_source.source_proof_sha256<>v.evidence->>'source_proof_sha256'
  or v_source.shift_proof_sha256<>v.evidence->>'shift_source_proof_sha256'
  or v_source.handoff_receipt_sha256<>v.evidence->>'maintenance_handoff_receipt_sha256'
  or v_source.source_epoch_receipt_sha256<>v.evidence->>'source_epoch_receipt_sha256'
  or v_source.independent_review_receipt_sha256<>
     v.evidence->>'independent_origin_review_receipt_sha256'
  or v_warrant.state<>'ACTIVE'
  or not exists(
   select 1 from pg_catalog.jsonb_array_elements(
    case when pg_catalog.jsonb_typeof(v_warrant.source_scope)='array'
    then v_warrant.source_scope else '[]'::jsonb end) scope(entry)
   where scope.entry->>'source_ref'=v.source_ref
     and scope.entry->>'maintenance_id'=v.maintenance_id::text
     and scope.entry->>'origin_shift_id'=v_source.origin_shift_id::text
     and scope.entry->>'independent_review_receipt_sha256'=
       v_source.independent_review_receipt_sha256)
 then return jsonb_build_object(
  'status','SIGNED_ORIGINAL_LINEAGE_PACKET_SOURCE_DRIFT',
  'owner_id',p_owner_id,'packet_verified',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false); end if;
 return jsonb_build_object(
  'status','SIGNED_ORIGINAL_LINEAGE_EVIDENCE_INDEPENDENTLY_READ',
  'packet_id',v.packet_id,'owner_id',v.owner_id,
  'shift_id',v.shift_id,'original_work_id',v.original_work_id,
  'source_ref',v.source_ref,'source_claim_id',v.source_claim_id,
  'maintenance_id',v.maintenance_id,
  'evidence_sha256',v.evidence_sha256,
  'packet_verified',true,'customer_original_verified',false,
  'canonical_customer_original_present',v_source.original_customer_work_id is not null,
  'next_action','VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
  'independent_review_required',true,'original_claim_admitted',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false,'new_shift_started',false);
end $$;
revoke all on function public.reality_read_owner_original_lineage_packet_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_original_lineage_packet_v1(uuid)
 to service_role;
