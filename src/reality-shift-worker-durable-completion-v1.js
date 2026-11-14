// Treat a completed worker pulse as an independently persisted checkpoint.
// A later presentation/serialization error must not erase this checkpoint.
// This does not verify original work, install an upgrade, or create authority.
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export function isDurablyCompletedShiftWorkerPulse(pulse,expectedShiftId){
 return UUID.test(expectedShiftId||'')&&
  pulse?.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
  pulse.shift_id===expectedShiftId&&
  pulse.worker_status==='WAKE_COMPLETED'&&
  pulse.job_started_by_pulse===false&&
  pulse.original_job_completed===false&&
  pulse.installation_authorized===false&&
  pulse.production_changed===false;
}
