-- Continuous, work-conserving source monitoring within an EXISTING exact
-- owner-authorized employee shift. No new owner work, no install, no shift extension.
-- Every 15 minutes the independent signed edge worker may re-read ONE original
-- source explicitly approved for steps 2..5. This is ongoing observation,
-- NOT an original-job execution, value receipt, repair, or upgrade.
--
-- DB is the durable source of truth. Lease/claim fencing prevents competing
-- workers from overwriting an independently verified observation.
create table if not exists reality_internal.governed_shift_continuation_monitor_v1 (
 shift_id uuid not null references reality_internal.governed_employee_shifts_v1(shift_id),
 monitor_bucket timestamptz not null,
 source_step_index smallint not null check (source_step_index between 2 and 5),
 source_ref text not null,
 state text not null check (state in ('CLAIMED','VERIFIED','BLOCKED')),
 claim_id uuid not null,
 attempt_count smallint not null default 1 check (attempt_count between 1 and 2),
 claimed_at timestamptz not null,
 lease_expires_at timestamptz not null,
 observed_at timestamptz,
 proof jsonb,
 proof_sha256 text,
 primary key (shift_id,monitor_bucket)
);
alter table reality_internal.governed_shift_continuation_monitor_v1 enable row level security;
revoke all on reality_internal.governed_shift_continuation_monitor_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.governed_shift_continuation_monitor_v1 to service_role;

create or replace function public.reality_claim_shift_continuation_monitor_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 v_shift record;
 v_row record;
 v_now timestamptz:=pg_catalog.clock_timestamp();
 v_bucket timestamptz;
 v_refs text[];
 v_indices smallint[];
 v_pos integer;
 v_claim uuid;
begin
 if current_user<>'service_role' then raise exception 'CONTINUATION_SERVICE_ONLY'; end if;
 -- Only an authorized shift after its first five source checks are terminal.
 -- Step 6/7 may be waiting for EXACT original-job authority; monitor does
 -- not consume, change, or impersonate those execution/approval gates.
 -- The approved final report remains queued until the original end time.
 select s.* into v_shift
 from reality_internal.governed_employee_shifts_v1 s
 where s.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and s.planned_start_at<=v_now and s.planned_end_at>v_now
   and exists (select 1 from reality_internal.governed_employee_shift_steps_v1 e
     where e.shift_id=s.shift_id and e.step_index=8 and e.state='QUEUED')
   and not exists (select 1 from reality_internal.governed_employee_shift_steps_v1 p
     where p.shift_id=s.shift_id and p.step_index between 1 and 5
       and p.state in ('QUEUED','CLAIMED','AWAITING_EXACT_WORK'))
 order by s.planned_start_at,s.created_at
 for update of s skip locked limit 1;
 if not found then
  return pg_catalog.jsonb_build_object('status','NO_AUTHORIZED_CONTINUATION_DUE',
    'installation_authorized',false,'production_changed',false);
 end if;
 select pg_catalog.array_agg(t.source_ref order by t.step_index),
        pg_catalog.array_agg(t.step_index order by t.step_index)
 into v_refs,v_indices
 from reality_internal.governed_employee_shift_steps_v1 t
 where t.shift_id=v_shift.shift_id
   and t.step_index between 2 and 5
   and t.state='SOURCE_CHECKED'
   and t.source_ref ~
    '^https://github[.]com/maloney2323/Reality/(issues|pull|actions/runs)/[1-9][0-9]{0,15}$';
 if pg_catalog.cardinality(v_refs)=0 or v_refs is null then
  return pg_catalog.jsonb_build_object('status','NO_APPROVED_SOURCES_TO_MONITOR',
    'shift_id',v_shift.shift_id,'production_changed',false);
 end if;
 -- Never manufacture a new task from the rest of the repo; round-robin
 -- only the EXACT owner-approved source refs from the existing shift.
 v_bucket:=pg_catalog.date_bin(interval '15 minutes',v_now,v_shift.planned_start_at);
 v_pos:=1+pg_catalog.mod(
   pg_catalog.floor(pg_catalog.extract(epoch from
    (v_bucket-v_shift.planned_start_at))/900)::integer,
   pg_catalog.cardinality(v_refs));
 select m.* into v_row
 from reality_internal.governed_shift_continuation_monitor_v1 m
 where m.shift_id=v_shift.shift_id and m.monitor_bucket=v_bucket
 for update;
 if found then
  if v_row.state='VERIFIED' then
   return pg_catalog.jsonb_build_object('status','CONTINUATION_SOURCE_ALREADY_VERIFIED',
     'shift_id',v_shift.shift_id,'monitor_bucket',v_bucket,
     'proof_sha256',v_row.proof_sha256,'production_changed',false);
  end if;
  if v_row.state='CLAIMED' and v_row.lease_expires_at>v_now then
   return pg_catalog.jsonb_build_object('status','CONTINUATION_SOURCE_INFLIGHT',
     'shift_id',v_shift.shift_id,'monitor_bucket',v_bucket,
     'production_changed',false);
  end if;
  if v_row.state='BLOCKED' or v_row.attempt_count>=2 then
   update reality_internal.governed_shift_continuation_monitor_v1
    set state='BLOCKED',lease_expires_at=v_now
    where shift_id=v_shift.shift_id and monitor_bucket=v_bucket
     and state='CLAIMED' and lease_expires_at<=v_now;
   return pg_catalog.jsonb_build_object('status','CONTINUATION_SOURCE_RETRY_BOUNDED',
     'shift_id',v_shift.shift_id,'monitor_bucket',v_bucket,
     'next_slot_remains_eligible',true,'production_changed',false);
  end if;
 end if;
 v_claim:=pg_catalog.gen_random_uuid();
 if v_row.shift_id is null then
  insert into reality_internal.governed_shift_continuation_monitor_v1
   (shift_id,monitor_bucket,source_step_index,source_ref,state,claim_id,
    attempt_count,claimed_at,lease_expires_at)
   values(v_shift.shift_id,v_bucket,v_indices[v_pos],v_refs[v_pos],
    'CLAIMED',v_claim,1,v_now,v_now+interval '3 minutes');
 else
  update reality_internal.governed_shift_continuation_monitor_v1
  set claim_id=v_claim,attempt_count=attempt_count+1,
      claimed_at=v_now,lease_expires_at=v_now+interval '3 minutes'
  where shift_id=v_shift.shift_id and monitor_bucket=v_bucket and state='CLAIMED'
    and lease_expires_at<=v_now;
  if not found then raise exception 'CONTINUATION_CLAIM_RACE'; end if;
 end if;
 return pg_catalog.jsonb_build_object(
  'status','CONTINUATION_SOURCE_READ_ONLY_CLAIMED',
  'shift_id',v_shift.shift_id,'owner_id',v_shift.owner_id,
  'shift_status',v_shift.status,'monitor_bucket',v_bucket,
  'source_step_index',v_indices[v_pos],'source_ref',v_refs[v_pos],
  'claim_id',v_claim,'planned_end_at',v_shift.planned_end_at,
  'only_originally_approved_sources',true,
  'read_only',true,'no_external_write_authority',true,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_settle_shift_continuation_monitor_v1(
 p_shift_id uuid,p_monitor_bucket timestamptz,p_claim_id uuid,p_proof jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;v_now timestamptz:=pg_catalog.clock_timestamp();v_digest text;
begin
 if current_user<>'service_role' then raise exception 'CONTINUATION_SERVICE_ONLY'; end if;
 select m.*,s.planned_end_at,s.planned_start_at,s.status as shift_status
  into v from reality_internal.governed_shift_continuation_monitor_v1 m
  join reality_internal.governed_employee_shifts_v1 s using (shift_id)
  where m.shift_id=p_shift_id and m.monitor_bucket=p_monitor_bucket
  for update of m;
 if not found or v.state<>'CLAIMED' or v.claim_id<>p_claim_id or
  v.lease_expires_at<=v_now or v.shift_status not in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK') or
  v_now>=v.planned_end_at or v_now<v.planned_start_at then
  raise exception 'CONTINUATION_FENCED_OR_SHIFT_ENDED';
 end if;
 if pg_catalog.jsonb_typeof(p_proof)<>'object' or
  pg_catalog.octet_length(p_proof::text)>16000 or
  p_proof->>'kind' is distinct from 'GITHUB_SOURCE_READBACK' or
  p_proof->>'source_url' is distinct from v.source_ref or
  p_proof->>'provider_checked' is distinct from 'true' or
  p_proof->>'read_only' is distinct from 'true' or
  p_proof->>'production_changed' is distinct from 'false' or
  pg_catalog.coalesce(p_proof->>'provider_status','') not in
    ('NOT_FOUND','OPEN_ISSUE','CLOSED','OPEN_PULL_REQUEST',
     'FAILED_WORKFLOW','COMPLETED_WORKFLOW') or
  p_proof ? 'installation_authorized' or
  p_proof ? 'original_job_completed' or
  p_proof ? 'execution_authorized' then
  raise exception 'CONTINUATION_PROVIDER_EVIDENCE_INVALID';
 end if;
 if p_proof->>'observed_at' is null or
   pg_catalog.abs(pg_catalog.extract(epoch from
    (v_now-(p_proof->>'observed_at')::timestamptz)))>180 then
  raise exception 'CONTINUATION_PROVIDER_EVIDENCE_STALE';
 end if;
 v_digest:='sha256:'||
  pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_proof::text,'UTF8')),'hex');
 update reality_internal.governed_shift_continuation_monitor_v1
  set state='VERIFIED',observed_at=v_now,lease_expires_at=v_now,
      proof=p_proof,proof_sha256=v_digest
 where shift_id=p_shift_id and monitor_bucket=p_monitor_bucket
  and claim_id=p_claim_id and state='CLAIMED';
 if not found then raise exception 'CONTINUATION_CLAIM_LOST'; end if;
 return pg_catalog.jsonb_build_object(
  'status','CONTINUATION_SOURCE_OBSERVATION_RECORDED',
  'shift_id',p_shift_id,'monitor_bucket',p_monitor_bucket,
  'source_step_index',v.source_step_index,'proof_sha256',v_digest,
  'customer_work_completed',false,'human_hours_saved',null,
  'installation_authorized',false,'production_changed',false);
end $fn$;

revoke all on function public.reality_claim_shift_continuation_monitor_v1()
 from public,anon,authenticated;
revoke all on function public.reality_settle_shift_continuation_monitor_v1(
 uuid,timestamptz,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reality_claim_shift_continuation_monitor_v1()
 to service_role;
grant execute on function public.reality_settle_shift_continuation_monitor_v1(
 uuid,timestamptz,uuid,jsonb) to service_role;
