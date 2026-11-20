-- The owner-visible Chat status reads an existing signed wake; it never
-- dispatches another one or grants new permissions.
create or replace function public.reality_read_owner_latest_signed_chat_shift_receipt_v1(
 p_owner_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'OWNER_SIGNED_SHIFT_WAKE_SERVICE_ONLY';
 end if;
 select w.owner_id,w.conversation_id,w.request_id,w.shift_id,w.network_request_id,
  w.queued_at,w.chat_source_ref,s.status as shift_status,
  p.wake_count,p.last_worker_safe_result,p.last_worker_completed_at
 into v
 from reality_internal.owner_chat_existing_shift_wakes_v1 w
 join public.reality_chat_messages m
  on m.user_id=w.owner_id and m.conversation_id=w.conversation_id
  and m.request_id=w.request_id and m.role='user'
  and w.chat_source_ref='supabase:reality_chat_messages:'||m.id::text
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=w.shift_id and s.owner_id=w.owner_id
 join reality_internal.governed_employee_completion_warrants_v1 warrant
  on warrant.shift_id=s.shift_id and warrant.owner_id=s.owner_id
   and warrant.plan_fingerprint=s.plan_fingerprint
 left join reality_internal.governed_employee_shift_worker_pulses_v1 p
  on p.shift_id=s.shift_id and p.owner_id=s.owner_id
 where w.owner_id=p_owner_id and w.network_request_id>0
  and s.authorized_at is not null and s.closed_at is null
  and s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and warrant.state='ACTIVE'
  and warrant.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 order by w.queued_at desc,w.request_id desc
 limit 1;
 if not found then
  return pg_catalog.jsonb_build_object(
   'status','NO_OWNER_ACTIVE_SIGNED_SHIFT_CHAT_WAKE',
   'installation_authorized',false,'production_changed',false,
   'original_job_completed',false,'new_shift_started',false);
 end if;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_LATEST_SIGNED_SHIFT_CHAT_WAKE_VERIFIED',
  'owner_id',v.owner_id,'conversation_id',v.conversation_id,
  'request_id',v.request_id,'source_ref',v.chat_source_ref,
  'shift_id',v.shift_id,'network_request_id',v.network_request_id,
  'queued_at',v.queued_at,'shift_status',v.shift_status,
  'wake_count',v.wake_count,
  'last_worker_safe_result',v.last_worker_safe_result,
  'last_worker_completed_at',v.last_worker_completed_at,
  'wake_enqueued',true,'worker_execution_verified_for_this_request',false,
  'installation_authorized',false,'production_changed',false,
  'original_job_completed',false,'new_shift_started',false);
end $fn$;
revoke all on function public.reality_read_owner_latest_signed_chat_shift_receipt_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_latest_signed_chat_shift_receipt_v1(uuid)
 to service_role;
