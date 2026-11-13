-- Exactly one service-governed recovery of an original owner-authorized
-- PR review after a provider POST returned an unclassified/uncertain effect.
-- This is NOT another job, model approval, installation or arbitrary replay.
-- A complete authenticated GitHub comment scan and pinned unchanged PR head
-- must precede this atomic database transition. Broker rechecks immediately
-- before its ONE additional provider POST and never retries uncertain posts.
alter table reality_internal.riley_pr_review_originals_v1
 add column if not exists publish_recovery_count integer not null default 0;
alter table reality_internal.riley_pr_review_originals_v1
 add column if not exists publish_recovery_scan_sha256 text;
alter table reality_internal.riley_pr_review_originals_v1
 add column if not exists publish_recovery_scanned_at timestamptz;
alter table reality_internal.riley_pr_review_originals_v1
 add constraint riley_pr_review_publish_recovery_count_v1_check
 check (publish_recovery_count between 0 and 1);

create or replace function public.reality_rearm_authorized_riley_pr_publish_v1(
 p_original_work_id text,
 p_claim_id uuid,
 p_head_sha text,
 p_review_digest text,
 p_provider_comment_scan_sha256 text,
 p_provider_comment_count integer)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $fn$
declare
 j reality_internal.riley_pr_review_originals_v1%rowtype;
 v_now timestamptz:=clock_timestamp();
 v_scan_age interval;
begin
 if current_user <> 'service_role' then
  raise exception 'RILEY_PR_RECOVERY_SERVICE_ROLE_REQUIRED';
 end if;
 if p_original_work_id<>'work:94fc872f8ba9062f968920c59218c3ca' or
  p_head_sha !~ '^[a-f0-9]{40}$' or
  p_review_digest !~ '^sha256:[a-f0-9]{64}$' or
  p_provider_comment_scan_sha256 !~ '^sha256:[a-f0-9]{64}$' or
  p_provider_comment_count is null or
  p_provider_comment_count<0 or p_provider_comment_count>500
 then
  raise exception 'RILEY_PR_RECOVERY_EXACT_SOURCE_PROOF_REQUIRED';
 end if;
 select * into j from reality_internal.riley_pr_review_originals_v1
 where original_work_id=p_original_work_id and claim_id=p_claim_id
 for update;
 if not found or
  j.shift_id<>'9460cfff-937a-4105-9093-2e41ab39a950'::uuid or
  j.source_ref<>'https://github.com/maloney2323/Reality/pull/57' or
  j.source_head_sha<>p_head_sha or
  j.review_digest<>p_review_digest or
  j.review_body is null or
  j.review_digest<>'sha256:'||
   pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(j.review_body,'UTF8')),'hex') or
  j.provider_comment_id is not null or j.provider_comment_url is not null or
  j.settlement_receipt_id is not null or j.settled_at is not null
 then
  raise exception 'RILEY_PR_RECOVERY_ORIGINAL_EVIDENCE_CHANGED';
 end if;
 -- Same owner, same already-authorized shift, frozen source receipt.
 if not exists (
  select 1 from reality_internal.governed_employee_shifts_v1 s
  join reality_internal.governed_employee_shift_steps_v1 t
  on t.shift_id=s.shift_id
  where s.shift_id=j.shift_id and s.owner_id=j.owner_id
   and s.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and s.authorized_at is not null and s.closed_at is null
   and s.planned_start_at<=v_now and s.planned_end_at>v_now
   and t.source_ref=j.source_ref and t.state='SOURCE_CHECKED'
   and t.proof_sha256=j.source_proof_sha256
 ) then
  raise exception 'RILEY_PR_RECOVERY_OWNER_WARRANT_OR_SOURCE_MISSING';
 end if;
 if j.phase<>'PUBLISHING' or j.publish_recovery_count<>0 then
  return jsonb_build_object(
   'status','PR_REVIEW_RECOVERY_NOT_ARMABLE_PRESERVE_FENCE',
   'original_work_id',j.original_work_id,
   'original_job_completed',false,
   'installation_authorized',false,'production_changed',false);
 end if;
 -- GitHub's initial HTTP write outcome was not captured. Never infer a
 -- negative effect from an instantaneous read: insist on a stable interval.
 if j.updated_at > v_now - interval '20 minutes' then
  return jsonb_build_object(
   'status','PR_REVIEW_RECOVERY_HOLDOFF_ACTIVE_NO_REPLAY',
   'original_work_id',j.original_work_id,
   'original_job_completed',false,
   'installation_authorized',false,'production_changed',false);
 end if;
 -- Trusted service boundary attests a complete authenticated provider GET
 -- across all comment pages. This witness is stored and review bytes frozen.
 update reality_internal.riley_pr_review_originals_v1
 set phase='PREPARED',
     publish_recovery_count=1,
     publish_recovery_scan_sha256=p_provider_comment_scan_sha256,
     publish_recovery_scanned_at=v_now,
     updated_at=v_now
 where original_work_id=j.original_work_id and claim_id=p_claim_id
  and phase='PUBLISHING' and publish_recovery_count=0;
 if not found then
  raise exception 'RILEY_PR_RECOVERY_ATOMIC_FENCE_CHANGED';
 end if;
 return jsonb_build_object(
  'status','EXACT_PR_REVIEW_ONE_RECOVERY_ARMED',
  'original_work_id',j.original_work_id,
  'claim_id',j.claim_id,
  'shift_id',j.shift_id,
  'review_digest',j.review_digest,
  'source_head_sha',j.source_head_sha,
  'publish_recovery_count',1,
  'comment_scan_sha256',p_provider_comment_scan_sha256,
  'original_job_completed',false,
  'installation_authorized',false,'production_changed',false);
end
$fn$;
revoke all on function public.reality_rearm_authorized_riley_pr_publish_v1(text,uuid,text,text,text,integer)
 from public,anon,authenticated;
grant execute on function public.reality_rearm_authorized_riley_pr_publish_v1(text,uuid,text,text,text,integer)
 to service_role;
