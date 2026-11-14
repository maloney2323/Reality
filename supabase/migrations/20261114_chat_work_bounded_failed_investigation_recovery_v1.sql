-- Retry the same authenticated Chat instruction after a confirmed *non-executing*
-- investigation failure. Never reopen settled work or create a new shift.
-- The original failed attempt remains in an append-only history on the row.
alter table reality_internal.chat_work_handoffs_v1
 add column if not exists bounded_recovery_count integer not null default 0
 check (bounded_recovery_count between 0 and 1);
alter table reality_internal.chat_work_handoffs_v1
 add column if not exists previous_failed_investigations jsonb not null default '[]'::jsonb
 check (pg_catalog.jsonb_typeof(previous_failed_investigations)='array');

create or replace function public.reality_reconcile_expired_chat_work_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare stale_n integer; recovery_n integer;
begin
 if current_user<>'service_role' then
  raise exception 'CHAT_WORK_RECONCILIATION_SERVICE_ROLE_ONLY';
 end if;
 -- Existing lease expiry remains terminal unless separately proven safe.
 update reality_internal.chat_work_handoffs_v1
 set status='PROVIDER_UNVERIFIED',finalized_at=clock_timestamp(),
 investigation=pg_catalog.jsonb_build_object(
  'status','INCOMPLETE_PROVIDER_ATTEMPT_NO_AUTOMATIC_REPLAY',
  'failure_code','LEASE_EXPIRED_WITHOUT_DURABLE_RESULT',
  'independently_verified_code_repair',false,
  'execution_authorized_by_chat',false,'installation_authorized',false,
  'job_settled',false)
 where status='CLAIMED' and claim_expires_at<clock_timestamp();
 get diagnostics stale_n=row_count;

 -- Reopen only known software-gate defects with no recorded diagnosis:
 -- never an ambiguous lease expiry, unauthorized source or settled receipt.
 -- Every case must still have the SAME live owner-approved shift and frozen
 -- warrant, and the original human message must match its saved SHA256.
 with eligible as (
  select i.message_id
  from reality_internal.chat_work_handoffs_v1 i
  join public.reality_chat_messages m
   on m.id=i.message_id and m.role='user'
   and m.user_id=i.owner_id and m.conversation_id=i.conversation_id
   and m.request_id=i.request_id
  join reality_internal.governed_employee_shifts_v1 sh
   on sh.shift_id=i.shift_id and sh.owner_id=i.owner_id
   and sh.plan_fingerprint=i.plan_fingerprint
  join reality_internal.governed_employee_completion_warrants_v1 w
   on w.shift_id=sh.shift_id and w.owner_id=sh.owner_id
   and w.plan_fingerprint=sh.plan_fingerprint
  where i.status='PROVIDER_UNVERIFIED'
   and i.bounded_recovery_count=0
   and i.claim_id is not null and i.finalized_at is not null
   and i.investigation->>'failure_code' in
    ('DIAGNOSIS_PERSISTENCE_UNVERIFIED',
     'MODEL_SELECTED_SOURCES_WITHOUT_WORK_DECISION')
   and i.message_sha256=pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(m.content,'UTF8')),'hex')
   and sh.authorized_at is not null and sh.closed_at is null
   and sh.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and sh.planned_start_at<=clock_timestamp()
   and sh.planned_end_at>clock_timestamp()
   and w.state='ACTIVE'
   and w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
   and pg_catalog.jsonb_typeof(w.source_scope)='array'
   and pg_catalog.jsonb_array_length(w.source_scope) between 1 and 25
  order by i.created_at,i.message_id
  limit 10
  for update of i skip locked
 )
 update reality_internal.chat_work_handoffs_v1 i
 set previous_failed_investigations=i.previous_failed_investigations ||
  pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
   'prior_status',i.status,'prior_claim_id',i.claim_id,
   'prior_claimed_at',i.claimed_at,'prior_finalized_at',i.finalized_at,
   'prior_failure_record',i.investigation,'original_shift_id',i.shift_id,
   'original_plan_fingerprint',i.plan_fingerprint,
   'retry_reason','VERIFIED_NONEXECUTING_CHAT_INVESTIGATION_GATE_REPAIR')),
  bounded_recovery_count=i.bounded_recovery_count+1,
  status='PENDING',claim_id=null,claimed_at=null,
  claim_expires_at=null,finalized_at=null,investigation=null
 from eligible e
 where i.message_id=e.message_id and i.status='PROVIDER_UNVERIFIED';
 get diagnostics recovery_n=row_count;

 return pg_catalog.jsonb_build_object(
  'status','STALE_CHAT_WORK_CLAIMS_RECONCILED',
  'stale_claims',stale_n,'verified_gate_failures_requeued',recovery_n,
  'new_shift_started',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_reconcile_expired_chat_work_v1()
 from public,anon,authenticated;
grant execute on function public.reality_reconcile_expired_chat_work_v1()
 to service_role;