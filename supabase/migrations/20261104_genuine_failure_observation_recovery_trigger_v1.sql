-- Persist same-original recovery obligation automatically from the existing
-- signed service-only failure-observation insertion, not a new AI agent.
create or replace function reality_internal.genuine_failure_recovery_obligation_trigger_v1()
returns trigger language plpgsql security invoker set search_path='' as $trigger$
declare v_receipt jsonb;
begin
 if current_user<>'service_role' then
   raise exception 'GENUINE_RECOVERY_INSERT_SERVICE_ROLE_ONLY';
 end if;
 v_receipt:=public.reality_commit_genuine_original_recovery_v1(NEW.observation_id);
 if v_receipt->>'status'<>'EXISTING_ORIGINAL_RECOVERY_OBLIGATION_PRESERVED'
    or v_receipt->>'original_work_id'<>NEW.original_work_id
    or v_receipt->>'original_job_completed'<>'false'
    or v_receipt->>'installation_authorized'<>'false' then
   raise exception 'GENUINE_RECOVERY_OBLIGATION_COMMITMENT_UNVERIFIED';
 end if;
 return NEW;
end $trigger$;
revoke all on function reality_internal.genuine_failure_recovery_obligation_trigger_v1()
 from public,anon,authenticated;
drop trigger if exists genuine_failure_recovery_obligation_v1
 on reality_internal.genuine_worker_failure_observations_v1;
create trigger genuine_failure_recovery_obligation_v1
 after insert on reality_internal.genuine_worker_failure_observations_v1
 for each row execute function
 reality_internal.genuine_failure_recovery_obligation_trigger_v1();
