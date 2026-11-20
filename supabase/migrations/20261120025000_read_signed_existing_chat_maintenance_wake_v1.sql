-- Read-only owner-scoped signed Chat wake reconciliation. No work dispatch,
-- worker claim, artifact installation or original-job settlement.
create or replace function public.reality_read_existing_chat_maintenance_wake_v1(
 p_owner_id uuid,p_conversation_id uuid,p_request_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;
begin
 if current_user<>'service_role' or p_owner_id is null or
    p_conversation_id is null or p_request_id is null then
  raise exception 'CHAT_EXISTING_WAKE_SERVICE_SCOPE_REQUIRED';
 end if;
 select w.shift_id,w.network_request_id,w.queued_at,w.chat_source_ref,
   s.status as shift_status,p.last_worker_safe_result,
   p.last_worker_completed_at,p.wake_count
 into v
 from reality_internal.owner_chat_existing_shift_wakes_v1 w
 join public.reality_chat_messages m
  on m.user_id=w.owner_id and m.conversation_id=w.conversation_id
   and m.request_id=w.request_id and m.role='user'
   and 'supabase:reality_chat_messages:'||m.id::text=w.chat_source_ref
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=w.shift_id and s.owner_id=w.owner_id
 join reality_internal.governed_employee_completion_warrants_v1 auth
  on auth.shift_id=s.shift_id and auth.owner_id=s.owner_id
   and auth.plan_fingerprint=s.plan_fingerprint
 left join reality_internal.governed_employee_shift_worker_pulses_v1 p
  on p.shift_id=s.shift_id and p.owner_id=s.owner_id
 where w.owner_id=p_owner_id and w.conversation_id=p_conversation_id
  and w.request_id=p_request_id and w.network_request_id>0
  and s.authorized_at is not null
  and auth.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 limit 1;
 if not found then
  return pg_catalog.jsonb_build_object(
   'status','CHAT_EXISTING_SHIFT_NO_WAKE_RECEIPT',
   'installation_authorized',false,'production_changed',false,
   'original_job_completed',false,'new_shift_started',false);
 end if;
 return pg_catalog.jsonb_build_object(
  'status','CHAT_EXISTING_SHIFT_WAKE_RECEIPT_VERIFIED',
  'owner_id',p_owner_id,'conversation_id',p_conversation_id,
  'request_id',p_request_id,'source_ref',v.chat_source_ref,
  'shift_id',v.shift_id,'network_request_id',v.network_request_id,
  'queued_at',v.queued_at,'shift_status',v.shift_status,
  'wake_count',v.wake_count,
  'last_worker_safe_result',v.last_worker_safe_result,
  'last_worker_completed_at',v.last_worker_completed_at,
  'wake_enqueued',true,'worker_execution_verified_for_this_request',false,
  'installation_authorized',false,'production_changed',false,
  'original_job_completed',false,'new_shift_started',false);
end $fn$;
revoke all on function public.reality_read_existing_chat_maintenance_wake_v1(uuid,uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_existing_chat_maintenance_wake_v1(uuid,uuid,uuid)
 to service_role;
