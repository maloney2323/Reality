-- Isolated fault probe: exercise ACTUAL privileged settlement denial and database subtransaction rollback.
-- Never creates a live work item or sends an external operation. All writes are rolled back.
create or replace function public.reality_genuine_fault_injection_probe_v1()
returns jsonb
language plpgsql
set search_path to ''
as $fn$
declare
 c reality_internal.genuine_original_continuations_v1%rowtype;
 before_events bigint; after_events bigint;
 fault_sha text; inserted_probe boolean := false;
 rejection_count int := 0; rollback_count int := 0;
 got_error text; after_c reality_internal.genuine_original_continuations_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'REALITY_FAULT_PROBE_SERVICE_ROLE_REQUIRED';
 end if;
 select * into c from reality_internal.genuine_original_continuations_v1
 where state='SETTLED_ISOLATED' and claim_run_id>0
 order by claim_run_id asc limit 1;
 if c.trigger_id is null then raise exception 'REALITY_FAULT_PROBE_NO_GENUINE_SETTLED_WORK';end if;
 select count(*) into before_events from public.universe_events e where
   e.epistemic_status='VERIFIED'
   and e.payload->>'original_work_id'=c.original_work_id
   and e.payload->>'original_job_completed'='true';
 if before_events<>1 then raise exception 'REALITY_FAULT_PROBE_INITIAL_LEDGER_NOT_UNIQUE';end if;
 -- Negative probe 1: an already consumed one-time completion claim with wrong
 -- provider run MUST NOT be accepted, even by the service role.
 begin
   perform public.reality_settle_genuine_original_v1(
    c.trigger_id,c.claim_run_id+1,'{}'::jsonb);
   raise exception 'REALITY_FAULT_PROBE_UNEXPECTED_SETTLEMENT_ACCEPTANCE';
 exception when others then
   get stacked diagnostics got_error = message_text;
   if got_error<>'CONTINUATION_SETTLEMENT_CONFLICT' then
    raise exception 'REALITY_FAULT_PROBE_SETTLEMENT_REJECTION_INVALID: %',got_error;
   end if;
   rejection_count:=rejection_count+1;
 end;
 -- Negative probe 2: no arbitrary owner work ID can receive a verified outcome.
 begin
   perform public.reality_append_verified_genuine_original_outcome_v2(
    'work:00000000000000000000000000000000');
   raise exception 'REALITY_FAULT_PROBE_UNEXPECTED_WORK_ACCEPTANCE';
 exception when others then
   get stacked diagnostics got_error = message_text;
   if got_error<>'REALITY_OUTCOME_ORIGINAL_WORK_NOT_FOUND' then
    raise exception 'REALITY_FAULT_PROBE_UNAUTHORIZED_WORK_REJECTION_INVALID: %',got_error;
   end if;
   rejection_count:=rejection_count+1;
 end;
 -- Fault injection 3: simulate a genuine durable queue-observation write,
 -- inject an exception AFTER it, and prove the entire subtransaction rolls back.
 fault_sha:=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
  'reality-isolated-fault-probe:'||pg_catalog.gen_random_uuid()::text,'UTF8'),'sha256'),'hex');
 begin
   insert into reality_internal.genuine_unbound_capability_discoveries_v1
    (frozen_sha256,frozen_test_path,missing_module_path,first_observed_sha,
     latest_observed_sha,status)
   values(fault_sha,'test/reality-frozen-regressions/fault-probe.test.js',
     'src/reality-extensions/fault-probe.mjs',
     '0000000000000000000000000000000000000000',
     '0000000000000000000000000000000000000000',
     'ROLLBACK_FAULT_INJECTION');
   inserted_probe:=true;
   raise exception 'REALITY_FAULT_INJECTED_AFTER_DURABLE_QUEUE_WRITE';
 exception when others then
   get stacked diagnostics got_error = message_text;
   if got_error<>'REALITY_FAULT_INJECTED_AFTER_DURABLE_QUEUE_WRITE' or not inserted_probe then
     raise exception 'REALITY_FAULT_PROBE_WRITE_OR_INJECTION_INVALID: %',got_error;
   end if;
 end;
 if exists (select 1 from reality_internal.genuine_unbound_capability_discoveries_v1
           where frozen_sha256=fault_sha) then
  raise exception 'REALITY_FAULT_PROBE_TRANSACTION_ROLLBACK_FAILED';
 end if;
 rollback_count:=rollback_count+1;
 select count(*) into after_events from public.universe_events e where
   e.epistemic_status='VERIFIED'
   and e.payload->>'original_work_id'=c.original_work_id
   and e.payload->>'original_job_completed'='true';
 select * into after_c from reality_internal.genuine_original_continuations_v1
 where trigger_id=c.trigger_id;
 if after_events<>before_events or
    after_c.state<>c.state or
    after_c.claim_run_id<>c.claim_run_id or
    after_c.outcome_receipt is distinct from c.outcome_receipt then
    raise exception 'REALITY_FAULT_PROBE_GENUINE_STATE_MUTATED';
 end if;
 return jsonb_build_object(
  'schema','reality-genuine-fault-injection-probe-v1',
  'scope','ISOLATED_PROJECT_ONLY',
  'genuine_original_work_id',c.original_work_id,
  'historical_provider_run_id',c.claim_run_id,
  'invalid_settlement_claim_denied',true,
  'nonexistent_work_outcome_denied',true,
  'durable_queue_write_rolled_back',true,
  'live_original_job_unchanged',true,
  'verified_original_outcome_count',after_events,
  'fault_injection_cases_passed',rejection_count+rollback_count,
  'fault_injection_cases_total',3,
  'actual_install_rollback','NOT_TESTED',
  'emergency_kill_switch','NOT_TESTED',
  'live_business_probation','NOT_TESTED',
  'production_changed',false,'production_release_authorized',false);
end $fn$;
revoke all on function public.reality_genuine_fault_injection_probe_v1()
 from public, anon, authenticated;
grant execute on function public.reality_genuine_fault_injection_probe_v1() to service_role;
