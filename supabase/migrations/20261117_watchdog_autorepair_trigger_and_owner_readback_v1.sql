-- Existing pg_cron watchdog owns the deterministic preview self-repair
-- and independently observes signed worker completion. No new cron job.
create or replace function reality_internal.watchdog_guarded_preview_self_repair_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare applied text;verified text;
begin
 -- A repair error must NOT stop the watchdog's other investigation lanes.
 begin
  applied:=reality_internal.auto_repair_known_preview_worker_gate_v1();
 exception when others then
  applied:='PREVIEW_AUTO_REPAIR_BLOCKED_REPAIR_PROOF_UNAVAILABLE';
 end;
 begin
  verified:=reality_internal.verify_preview_worker_auto_repair_v1();
 exception when others then
  verified:='PREVIEW_AUTO_REPAIR_BLOCKED_INDEPENDENT_VERIFIER_UNAVAILABLE';
 end;
 return coalesce(applied,'AUTO_REPAIR_UNAVAILABLE')||' | '||
  coalesce(verified,'INDEPENDENT_VERIFIER_UNAVAILABLE');
end $fn$;
revoke all on function reality_internal.watchdog_guarded_preview_self_repair_v1()
 from public,anon,authenticated,service_role;

create or replace function public.reality_read_owner_preview_worker_auto_repair_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare receipts jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null
 then raise exception 'AUTO_REPAIR_OWNER_READ_SERVICE_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'repair_id',r.repair_id,'incident_id',r.incident_id,
  'phase',r.phase,'failed_runid',r.failed_runid,
  'repair_kind',r.repair_kind,
  'scope_verified',r.scope_verified,
  'before_sha256',r.before_sha256,'after_sha256',r.after_sha256,
  'repair_receipt_sha256',r.repair_receipt_sha256,
  'repair_applied_at',r.repair_applied_at,
  'worker_run_id',r.worker_run_id,
  'original_capability_claim_id',r.original_capability_claim_id,
  'original_work_receipt_sha256',r.original_work_receipt_sha256,
  'verified_at',r.verified_at,
  'blocker',r.blocker,
  'preview_only',r.preview_only,
  'production_changed',r.production_changed,
  'next_action',case r.phase
   when 'PATCH_APPLIED_AWAITING_WORKER' then
    'Reality applied the exact known preview scheduling correction. Wait for a signed-worker process receipt; SQL dispatch success is not enough.'
   when 'WORKER_ATTESTED_AWAITING_ORIGINAL' then
    'Reality independently saw the signed worker run. Wait for the SAME previously scheduled authorized investigation to complete and produce an independent original work receipt.'
   when 'INDEPENDENT_WORKER_AND_ORIGINAL_VERIFIED' then
    'Reality independently verified repaired scheduling, the signed worker ran, and a previously scheduled owner investigation recorded a genuine receipt. Continue ordinary work and monitor for regression.'
   when 'BLOCKED_UNRECOGNIZED_SCOPE' then
    'The failure did not match the safely reviewed correction. Reality cannot modify it automatically; inspect and approve an exact repair recipe while other work continues.'
   else
    'Independent worker or original evidence is missing. Preserve the defect, exact blocker, and existing work; do not claim completion.'
   end
 ) order by r.last_checked_at desc),'[]'::jsonb)
 into receipts from (
  select * from reality_internal.preview_worker_auto_repairs_v1
  where owner_id=p_owner_id order by last_checked_at desc limit 6
 ) r;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_PREVIEW_OPERATIONAL_AUTO_REPAIR_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,'read_only',true,
  'items',receipts,'count',pg_catalog.jsonb_array_length(receipts),
  'production_changed',false,'new_job_authorized_by_read',false,
  'install_authorized_by_read',false,
  'historical_external_correction_not_reclassified',true
 );
end $fn$;
revoke all on function public.reality_read_owner_preview_worker_auto_repair_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_preview_worker_auto_repair_v1(uuid)
 to service_role;

do $watch$
declare job_id bigint;command text;v_new text;
begin
 select jobid,command into strict job_id,command from cron.job
 where jobname='reality-governed-wake-watchdog-v1'
  and active=true and schedule='* * * * *'
  and command like '%observe_owner_worker_cron_failures_v1%'
  and command like '%reconcile_incident_existing_original_handoff_v1%'
  and command like '%reconcile_stalled_scheduled_capability_inquiries_v1%';
 if position('watchdog_guarded_preview_self_repair_v1' in command)=0 then
  v_new:=command||
   E'\nSELECT reality_internal.watchdog_guarded_preview_self_repair_v1();';
  perform cron.alter_job(job_id,command=>v_new);
 end if;
end $watch$;

-- The same signed worker has one bounded retry opportunity after a patched
-- scheduling gate, even when there are temporarily zero eligible customer
-- or investigation jobs. This is a read-only health check (not job settlement).
do $wake$
declare job_id bigint;command text;v_new text;
 anchor text:='where (eligible_shift.permitted';
 extra text:=$extra$
 or exists(
   select 1 from reality_internal.preview_worker_auto_repairs_v1 r
   where r.phase='PATCH_APPLIED_AWAITING_WORKER'
    and r.scope_verified=true and r.preview_only=true
    and r.production_changed=false
    and r.repair_applied_at>clock_timestamp()-interval '15 minutes'
 )
$extra$;
begin
 select jobid,command into strict job_id,command from cron.job
 where jobname='reality-riley-preview-original-execution-wake-v1'
  and active=true and schedule='* * * * *'
  and command like '%credential.worker_token%'
  and command like '%credential.vercel_bypass%'
  and command like '%net.http_post%'
  and command like '%INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF%'
  and command like '%owner_routine_delegations_v1%'
  and command like '%eligible_shift.permitted%';
 if position('preview_worker_auto_repairs_v1' in command)=0 then
  if length(command)-length(replace(command,anchor,''))<>length(anchor)
  then raise exception 'EXACT_SIGNED_PREVIEW_WORKER_GATE_NOT_UNIQUE';end if;
  v_new:=replace(command,anchor,anchor||E'\n'||extra);
  if length(v_new)<=length(command) or
    position('credential.worker_token' in v_new)=0 or
    position('credential.vercel_bypass' in v_new)=0 or
    position('public.reality_read_owner_capability_gap_feed_v1' in v_new)>0
  then raise exception 'PREVIEW_RECOVERY_WAKE_INDEPENDENT_GATE_UNVERIFIED';end if;
  perform cron.alter_job(job_id,command=>v_new);
 end if;
end $wake$;
