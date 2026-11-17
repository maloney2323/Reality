-- An incident's recovery approval and independent evidence belong to ONE
-- failed worker run. A fresh provider failure resets the handoff, never
-- silently carries an older original authorization into a new attempt.
create or replace function reality_internal.reset_incident_original_handoff_epoch_v1()
returns trigger language plpgsql security invoker set search_path to '' as $fn$
begin
 if new.last_failed_runid>old.last_failed_runid then
  new.original_repair_handoff_status:='UNASSESSED';
  new.original_repair_observation_id:=null;
  new.original_repair_work_id:=null;
  new.original_repair_handoff_receipt_sha256:=null;
  new.original_repair_last_checked_at:=null;
 end if;
 return new;
end $fn$;
drop trigger if exists reset_incident_original_handoff_epoch_v1
 on reality_internal.owner_worker_recovery_incidents_v1;
create trigger reset_incident_original_handoff_epoch_v1
 before update of last_failed_runid
 on reality_internal.owner_worker_recovery_incidents_v1
 for each row execute function
 reality_internal.reset_incident_original_handoff_epoch_v1();
