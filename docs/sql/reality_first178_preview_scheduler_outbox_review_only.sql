-- Review-only Phase 1 scheduler contract for original #178.
-- Not activated by migration: protected-preview egress requires vetted
-- service-to-service permission and secrets in Supabase Vault.
-- This SQL is the preferred pathway, NOT an owner/browser action.
-- IMPORTANT: Installation is a SEPARATE owner approval, never automated.
create table if not exists reality_internal.first178_scheduler_outbox_v1 (
 queue_id uuid primary key,
 original_work_id text not null
   check (original_work_id = 'work:9b9578b3c65427589c4c6da68fe0fc87'),
 dispatch_request_id bigint unique,
 created_at timestamptz not null default pg_catalog.now(),
 state text not null default 'DISPATCH_QUEUED'
   check(state in ('DISPATCH_QUEUED','RECEIPT_VERIFIED','BLOCKED','UNRESOLVED')),
 constraint first178_dispatch_request_required check(
  state <> 'DISPATCH_QUEUED' or dispatch_request_id is not null)
);
revoke all on reality_internal.first178_scheduler_outbox_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.first178_scheduler_outbox_v1 to service_role;

create or replace function reality_internal.schedule_existing_first178_preview_once_v1()
returns bigint language plpgsql security invoker set search_path='' as $body$
declare
 q reality_internal.governed_build_queue_v1%rowtype;
 target constant text :=
 'https://reality-bxs74ak3u-maloney2323-5310s-projects.vercel.app/api/reality/personal-first-upgrade-178-dispatch';
 service_key text;
 bypass_key text;
 request_id bigint;
begin
 if current_user <> 'postgres' and current_user <> 'service_role' then
  raise exception 'FIRST178_SCHEDULER_SERVICE_ROLE_REQUIRED';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('first178:preview:exact:work:9b9578b3c65427589c4c6da68fe0fc87',0));
 select * into q from reality_internal.governed_build_queue_v1
 where original_work_id='work:9b9578b3c65427589c4c6da68fe0fc87' for update;
 if q.id is null or q.phase<>'ESCALATED' or
  q.worker_claim_id is null or q.claimed_at is null or
  q.report->>'state'<>'ESCALATED' or
  q.report->>'installation_authorized'<>'false' or
  q.report->>'job_completed'<>'false' or
  q.report->>'checkpoint_receipt_id'<>'372ed47b-13b0-567d-b2b8-fbc691208e18' or
  exists(select 1 from reality_internal.first178_background_handoffs_v1
   where queue_id=q.id) or
  exists(select 1 from reality_internal.first178_scheduler_outbox_v1
   where queue_id=q.id) then
  return null;
 end if;
 select decrypted_secret into service_key from vault.decrypted_secrets
  where name='reality_178_preview_dispatch_token';
 select decrypted_secret into bypass_key from vault.decrypted_secrets
  where name='reality_178_preview_vercel_bypass';
 if pg_catalog.length(service_key)<32 or pg_catalog.length(bypass_key)<>32 then
  raise exception 'FIRST178_SCHEDULER_PROTECTED_CREDENTIALS_MISSING';
 end if;
 -- pg_net starts the request only AFTER this transaction commits.
 -- A single row per queue disallows repeated submissions.
 select net.http_post(
  url:=target,
  headers:=pg_catalog.jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer '||service_key,
    'x-vercel-protection-bypass',bypass_key),
  body:='{}'::jsonb,
  timeout_milliseconds:=290000
 ) into request_id;
 insert into reality_internal.first178_scheduler_outbox_v1(
  queue_id,original_work_id,dispatch_request_id)
 values(q.id,q.original_work_id,request_id);
 return request_id;
end;
$body$;
revoke all on function reality_internal.schedule_existing_first178_preview_once_v1()
 from public,anon,authenticated;
grant execute on function reality_internal.schedule_existing_first178_preview_once_v1()
 to service_role;

-- ACTIVATE ONLY WHEN:
-- 1. Vault secrets above have been securely provisioned and ACL-checked.
-- 2. Vercel automation bypass and bearer agree with those Vault entries.
-- 3. Target deployment and runner are independently verified.
-- 4. The provider has authorized protected-preview egress.
--
-- Once ready, schedule with:
-- select cron.schedule('reality-178-preview-once','* * * * *',
--   $$select reality_internal.schedule_existing_first178_preview_once_v1();$$);
-- After first submitted request, call cron.unschedule(...).
