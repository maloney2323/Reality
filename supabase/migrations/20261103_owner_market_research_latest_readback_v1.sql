-- Restore the latest authenticated owner's verified research receipt.
-- Read-only. Never treat a research hypothesis as executable work.
create or replace function public.reality_read_latest_owner_market_research_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to ''
as $func$
declare v reality_internal.market_research_receipts_v1%rowtype;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'MARKET_RESEARCH_OWNER_SERVICE_ROLE_REQUIRED';
 end if;
 select * into v from reality_internal.market_research_receipts_v1
  where owner_id=p_owner_id order by created_at desc,receipt_id desc limit 1;
 if not found then
  return pg_catalog.jsonb_build_object(
   'ok',true,'status','NO_RESEARCH_RECEIPT','findings','[]'::jsonb,
   'verified_readback',true,'review_only',true,
   'installation_authorized',false,'job_started',false,'production_changed',false);
 end if;
 if v.report->>'version'<>'reality-market-intelligence-v1' or
   (v.report->>'report_sha256')<>v.report_sha256 or
   (v.report->>'installation_authorized')<>'false' or
   (v.report->>'job_started')<>'false' or
   (v.report->>'production_changed')<>'false' or
   pg_catalog.jsonb_typeof(v.report->'findings')<>'array' or
   pg_catalog.jsonb_array_length(v.report->'findings')<>v.candidate_count then
  raise exception 'MARKET_RESEARCH_PERSISTED_RECEIPT_INCONSISTENT';
 end if;
 return pg_catalog.jsonb_build_object(
  'ok',true,'status','GOVERNED_MARKET_RESEARCH_RECORDED',
  'receipt_id',v.receipt_id,
  'report_sha256',v.report_sha256,
  'recorded_at',v.created_at,
  'pinned_commit_sha',v.source_commit_sha,
  'researched_source_count',v.report->'search_source_count',
  'findings',v.report->'findings',
  'verified_readback',true,'review_only',true,
  'installation_authorized',false,'job_started',false,'production_changed',false);
end $func$;
revoke all on function public.reality_read_latest_owner_market_research_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_latest_owner_market_research_v1(uuid)
 to service_role;