-- Record the specific signed model-output validation failure without authority changes.
-- No new original work, no attempt reset, no cron/shift creation.
CREATE OR REPLACE FUNCTION public.reality_block_shift_continuity_investigation_v1(p_owner_id uuid, p_incident_id uuid, p_lease_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare i reality_internal.owner_shift_continuity_incidents_v1%rowtype;
begin
 if current_user<>'service_role' or p_owner_id is null
   or p_incident_id is null or p_lease_id is null
   or p_reason not in ('INDEPENDENT_SOURCE_UNAVAILABLE','MODEL_PROOF_UNAVAILABLE',
    'MODEL_PROVIDER_AUTH_REJECTED','MODEL_RATE_LIMITED',
    'MODEL_PROVIDER_TEMPORARY_FAILURE','MODEL_PROVIDER_REJECTED',
    'MODEL_OUTPUT_UNVERIFIED','MODEL_PROVIDER_TIMEOUT',
    'MODEL_PROVIDER_TRANSPORT_UNVERIFIED','MODEL_PROVIDER_CONFIG_UNVERIFIED',
    'ROLE_DIRECTORY_UNVERIFIED','MODEL_RESPONSE_INCOMPLETE',
    'MODEL_RESPONSE_ID_MISSING','MODEL_RESPONSE_NOT_COMPLETED',
    'MODEL_JSON_UNVERIFIED','MODEL_SCHEMA_INVALID',
    'MODEL_REVIEWER_UNVERIFIED','MODEL_TEXT_BOUNDS_UNVERIFIED',
    'SIGNED_WORKER_OR_MODEL_RECEIPT_MISSING')
 then raise exception 'CONTINUITY_INVESTIGATION_BLOCKED_EXACT_OWNER_REQUIRED';end if;
 update reality_internal.owner_shift_continuity_incidents_v1
 set phase='BLOCKED_NEEDS_EVIDENCE',limitations=p_reason,
  next_investigation_at=case when investigation_attempts<3
   then clock_timestamp()+make_interval(mins=>case when investigation_attempts=1 then 2 else 10 end)
   else null end,
  investigation_failure_history=investigation_failure_history||
   pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'attempt',investigation_attempts,'failure_reason',p_reason,
    'failed_at',clock_timestamp(),'lease_id',p_lease_id))
 where owner_id=p_owner_id and incident_id=p_incident_id
  and investigation_lease_id=p_lease_id and phase='INVESTIGATION_CLAIMED'
 returning * into i;
 if not found then raise exception 'CONTINUITY_INVESTIGATION_BLOCK_LEASE_STALE';end if;
 return pg_catalog.jsonb_build_object(
  'status','CONTINUITY_INVESTIGATION_BLOCKED_NEEDS_PROOF',
  'investigation_attempts',i.investigation_attempts,
  'automatic_reinvestigation_eligible',i.investigation_attempts<3,
  'next_investigation_at',i.next_investigation_at,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $function$
;
revoke execute on function public.reality_block_shift_continuity_investigation_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_block_shift_continuity_investigation_v1(uuid,uuid,uuid,text) to service_role;
