-- Repair a bounded GitHub permission rejection on the SAME signed owner
-- PR57 review original; never create a second shift, work item or approval.
-- Only the prior exact 403, recorded in durable authenticated worker evidence,
-- permits one additional attempt after a fully authenticated provider scan.
alter table reality_internal.riley_pr_review_originals_v1
 add column if not exists publish_permission_remediation_count integer not null default 0;
alter table reality_internal.riley_pr_review_originals_v1
 add column if not exists publish_permission_scan_sha256 text;
alter table reality_internal.riley_pr_review_originals_v1
 add column if not exists publish_permission_scanned_at timestamptz;
alter table reality_internal.riley_pr_review_originals_v1
 add constraint riley_pr57_permission_remediation_once_v1_check
 check (publish_permission_remediation_count between 0 and 1);

create or replace function public.reality_rearm_authorized_riley_pr_post_403_v1(
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
 v_403_id bigint;
begin
 if current_user <> 'service_role' then
  raise exception 'RILEY_PR_POST403_SERVICE_ROLE_REQUIRED';
 end if;
 if p_original_work_id<>'work:94fc872f8ba9062f968920c59218c3ca' or
    p_head_sha !~ '^[a-f0-9]{40}$' or
    p_review_digest !~ '^sha256:[a-f0-9]{64}$' or
    p_provider_comment_scan_sha256 !~ '^sha256:[a-f0-9]{64}$' or
    p_provider_comment_count is null or
    p_provider_comment_count < 0 or p_provider_comment_count > 500
 then
  raise exception 'RILEY_PR_POST403_SCOPE_OR_PROVIDER_SCAN_INVALID';
 end if;
 select * into j from reality_internal.riley_pr_review_originals_v1
 where original_work_id=p_original_work_id and claim_id=p_claim_id
 for update;
 if not found or
    j.shift_id <> '9460cfff-937a-4105-9093-2e41ab39a950'::uuid or
    j.source_ref <> 'https://github.com/maloney2323/Reality/pull/57' or
    j.source_head_sha <> p_head_sha or
    j.review_digest <> p_review_digest or
    j.review_body is null or
    j.review_digest <> 'sha256:'||pg_catalog.encode(
     pg_catalog.sha256(pg_catalog.convert_to(j.review_body,'UTF8')),'hex') or
    j.provider_comment_id is not null or
    j.provider_comment_url is not null or
    j.settlement_receipt_id is not null or
    j.independent_provider_digest is not null or
    j.settled_at is not null
 then
  raise exception 'RILEY_PR_POST403_ORIGINAL_OR_EFFECT_DRIFT';
 end if;
 if j.phase <> 'PUBLISHING' or
    j.publish_recovery_count <> 1 or
    j.publish_permission_remediation_count <> 0
 then
  return jsonb_build_object(
   'status','PR57_POST403_REMEDIATION_NOT_ELIGIBLE_NO_REPLAY',
   'original_job_completed',false,
   'installation_authorized',false,'production_changed',false);
 end if;
 if j.publish_recovery_scanned_at is null or
    j.publish_recovery_scan_sha256 !~ '^sha256:[a-f0-9]{64}$' or
    j.publish_recovery_scanned_at > v_now or
    j.updated_at > v_now - interval '5 minutes'
 then
  return jsonb_build_object(
   'status','PR57_POST403_REMEDIATION_HOLDOFF_NO_REPLAY',
   'original_job_completed',false,
   'installation_authorized',false,'production_changed',false);
 end if;
 -- The original owner's shift warrant and exact independently verified
 -- source receipt must still be live. No new start or installation grant.
 if not exists (
  select 1 from reality_internal.governed_employee_shifts_v1 s
  join reality_internal.governed_employee_shift_steps_v1 t
   on t.shift_id=s.shift_id
  where s.shift_id=j.shift_id and s.owner_id=j.owner_id
   and s.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and s.authorized_at is not null and s.closed_at is null
   and s.planned_start_at <= v_now and s.planned_end_at > v_now
   and t.state='SOURCE_CHECKED' and t.source_ref=j.source_ref
   and t.proof_sha256=j.source_proof_sha256
 ) then
  raise exception 'RILEY_PR_POST403_OWNER_WARRANT_OR_SOURCE_INVALID';
 end if;
 -- A definitive GitHub HTTP 403 was captured DURABLY by the SAME
 -- Reality service wake, not inferred by OpenAI or from an owner prompt.
 select e.id into v_403_id from net._http_response e
 where e.status_code=200
   and e.created >= j.publish_recovery_scanned_at - interval '5 minutes'
   and e.created <= v_now - interval '5 minutes'
   and e.content::jsonb #>> '{riley_governed_pr_write_broker,status}'=
    'GITHUB_POST_DEFINITIVELY_REJECTED_HTTP_403_FENCE_PRESERVED'
   and e.content::jsonb #>> '{riley_governed_pr_write_broker,existing_original}'=
    j.original_work_id
 order by e.id desc limit 1;
 if v_403_id is null then
  return jsonb_build_object(
   'status','PR57_POST403_INDEPENDENT_REJECTION_RECEIPT_REQUIRED',
   'original_job_completed',false,
   'installation_authorized',false,'production_changed',false);
 end if;
 update reality_internal.riley_pr_review_originals_v1
 set phase='PREPARED',publish_permission_remediation_count=1,
     publish_permission_scan_sha256=p_provider_comment_scan_sha256,
     publish_permission_scanned_at=v_now,updated_at=v_now
 where original_work_id=j.original_work_id and claim_id=j.claim_id
 and phase='PUBLISHING' and publish_recovery_count=1
 and publish_permission_remediation_count=0;
 if not found then
  raise exception 'RILEY_PR_POST403_ATOMIC_REARM_RACE';
 end if;
 return jsonb_build_object(
  'status','EXACT_PR57_ONE_PERMISSION_REMEDIATION_ARMED',
  'original_work_id',j.original_work_id,'shift_id',j.shift_id,
  'claim_id',j.claim_id,'source_head_sha',j.source_head_sha,
  'review_digest',j.review_digest,
  'comment_scan_sha256',p_provider_comment_scan_sha256,
  'publish_permission_remediation_count',1,
  'original_job_completed',false,
  'installation_authorized',false,'production_changed',false);
end
$fn$;

revoke all on function public.reality_rearm_authorized_riley_pr_post_403_v1(text,uuid,text,text,text,integer)
 from public, anon, authenticated;
grant execute on function public.reality_rearm_authorized_riley_pr_post_403_v1(text,uuid,text,text,text,integer)
 to service_role;
