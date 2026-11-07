-- Real owner-authorized PR-review original, not an installation or synthetic shift.
-- Claim derives ONLY from the exact signed shift + independently checked PR source.
-- GitHub publish happens after durable intent; uncertain writes are never replayed.
create table if not exists reality_internal.riley_pr_review_originals_v1 (
 shift_id uuid not null references reality_internal.governed_employee_shifts_v1(shift_id),
 owner_id uuid not null,
 original_work_id text not null unique,
 source_ref text not null,
 source_proof_sha256 text not null,
 claim_id uuid not null default gen_random_uuid(),
 phase text not null default 'CLAIMED' check (phase in ('CLAIMED','PREPARED','PUBLISHING','SETTLED','BLOCKED')),
 attempts integer not null default 0 check (attempts between 0 and 8),
 source_head_sha text,
 model_response_id text,
 review_body text,
 review_digest text,
 provider_comment_id bigint,
 provider_comment_url text,
 settlement_receipt_id uuid,
 independent_provider_digest text,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 settled_at timestamptz,
 primary key (shift_id,source_ref),
 constraint riley_pr_scope check (
   source_ref ~ '^https://github[.]com/maloney2323/Reality/pull/[1-9][0-9]*$'
   and original_work_id ~ '^work:[a-f0-9]{32}$'
   and source_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'
 )
);
alter table reality_internal.riley_pr_review_originals_v1 enable row level security;
revoke all on reality_internal.riley_pr_review_originals_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.riley_pr_review_originals_v1 to service_role;

create or replace function public.reality_claim_authorized_riley_pr_review_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record; j reality_internal.riley_pr_review_originals_v1%rowtype;
 v_work text;
begin
 if current_user<>'service_role' then raise exception 'RILEY_REVIEW_SERVICE_ROLE_REQUIRED'; end if;
 select s.shift_id,s.owner_id,t.source_ref,t.proof_sha256
 into v
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_shift_steps_v1 t on t.shift_id=s.shift_id
 where s.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and s.authorized_at is not null and s.closed_at is null
   and s.planned_start_at<=clock_timestamp() and s.planned_end_at>clock_timestamp()
   and t.step_index between 2 and 5
   and t.state='SOURCE_CHECKED'
   and t.source_status='OPEN_PULL_REQUEST'
   and t.source_ref ~ '^https://github[.]com/maloney2323/Reality/pull/[1-9][0-9]*$'
   and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
   and t.proof->>'source_url'=t.source_ref
   and t.proof->>'provider_status'='OPEN_PULL_REQUEST'
   and t.proof->>'read_only'='true'
   and t.proof->>'production_changed'='false'
   and t.proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(t.proof::text,'UTF8')),'hex')
   and (select count(*) from reality_internal.governed_employee_shift_steps_v1 x
      where x.shift_id=s.shift_id and x.step_index between 1 and 5 and x.state='SOURCE_CHECKED')=5
 order by s.authorized_at,t.step_index limit 1;
 if not found then return jsonb_build_object(
  'status','NO_SOURCE_CHECKED_OWNER_AUTHORIZED_PR_REVIEW',
  'installation_authorized',false,'production_changed',false); end if;
 v_work:='work:'||left(pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to('reality:riley:pr-review-original-v1:'||v.owner_id::text||':'||
    v.shift_id::text||':'||v.source_ref||':'||v.proof_sha256,'UTF8')),'hex'),32);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_work));
 insert into reality_internal.riley_pr_review_originals_v1
   (shift_id,owner_id,original_work_id,source_ref,source_proof_sha256)
 values (v.shift_id,v.owner_id,v_work,v.source_ref,v.proof_sha256)
 on conflict (shift_id,source_ref) do nothing;
 select * into j from reality_internal.riley_pr_review_originals_v1
  where shift_id=v.shift_id and source_ref=v.source_ref for update;
 if j.original_work_id<>v_work or j.owner_id<>v.owner_id or
   j.source_proof_sha256<>v.proof_sha256 then
    raise exception 'RILEY_REVIEW_ORIGINAL_IDENTITY_CHANGED'; end if;
 if j.phase='CLAIMED' and j.attempts>=6 then
  update reality_internal.riley_pr_review_originals_v1
   set phase='BLOCKED',updated_at=clock_timestamp()
   where shift_id=j.shift_id and source_ref=j.source_ref;
  j.phase:='BLOCKED';
 elsif j.phase in ('CLAIMED','PREPARED','PUBLISHING') then
  update reality_internal.riley_pr_review_originals_v1
   set attempts=attempts+1,updated_at=clock_timestamp()
   where shift_id=j.shift_id and source_ref=j.source_ref;
 end if;
 return jsonb_build_object('status',
  case when j.phase='SETTLED' then 'EXACT_PR_REVIEW_ORIGINAL_INDEPENDENTLY_SETTLED'
       when j.phase='BLOCKED' then 'EXACT_PR_REVIEW_ORIGINAL_BLOCKED'
       else 'EXACT_OWNER_AUTHORIZED_PR_REVIEW_CLAIMED' end,
  'shift_id',j.shift_id,'owner_id',j.owner_id,'original_work_id',j.original_work_id,
  'claim_id',j.claim_id,'source_ref',j.source_ref,'source_proof_sha256',j.source_proof_sha256,
  'phase',j.phase,'source_head_sha',j.source_head_sha,
  'model_response_id',j.model_response_id,'review_body',j.review_body,
  'review_digest',j.review_digest,'provider_comment_id',j.provider_comment_id,
  'provider_comment_url',j.provider_comment_url,
  'settlement_receipt_id',j.settlement_receipt_id,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_prepare_authorized_riley_pr_review_v1(
 p_original_work_id text,p_claim_id uuid,p_head_sha text,p_model_response_id text,p_review_body text)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare j reality_internal.riley_pr_review_originals_v1%rowtype; v_hash text;
begin
 if current_user<>'service_role' then raise exception 'RILEY_REVIEW_SERVICE_ROLE_REQUIRED';end if;
 if p_head_sha !~ '^[a-f0-9]{40}$' or
    p_model_response_id !~ '^resp_[a-zA-Z0-9_-]{4,160}$' or
    p_review_body is null or length(p_review_body)<140 or length(p_review_body)>4200 or
    position('<!-- reality-riley-original:'||p_original_work_id||' -->' in p_review_body)=0 then
  raise exception 'RILEY_REVIEW_EXACT_MODEL_PROPOSAL_REQUIRED';end if;
 select * into j from reality_internal.riley_pr_review_originals_v1
 where original_work_id=p_original_work_id and claim_id=p_claim_id for update;
 if not found or j.phase not in ('CLAIMED','PREPARED') then
  raise exception 'RILEY_REVIEW_ORIGINAL_NOT_CLAIMED';end if;
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(p_review_body,'UTF8')),'hex');
 if j.phase='PREPARED' and (j.review_digest<>v_hash or j.source_head_sha<>p_head_sha)
 then raise exception 'RILEY_REVIEW_PREPARED_PROPOSAL_DRIFT';end if;
 update reality_internal.riley_pr_review_originals_v1
 set phase='PREPARED',source_head_sha=p_head_sha,
   model_response_id=p_model_response_id,
   review_body=p_review_body,review_digest=v_hash,
   updated_at=clock_timestamp()
 where original_work_id=p_original_work_id;
 return jsonb_build_object('status','EXACT_REVIEW_PREPARED_NOT_PUBLISHED',
  'original_work_id',p_original_work_id,'claim_id',p_claim_id,
  'review_digest',v_hash,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $fn$;

create or replace function public.reality_mark_authorized_riley_pr_publish_v1(
 p_original_work_id text,p_claim_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare j reality_internal.riley_pr_review_originals_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'RILEY_REVIEW_SERVICE_ROLE_REQUIRED';end if;
 select * into j from reality_internal.riley_pr_review_originals_v1
  where original_work_id=p_original_work_id and claim_id=p_claim_id for update;
 if not found or j.phase<>'PREPARED' or
    j.review_body is null or j.source_head_sha !~ '^[a-f0-9]{40}$'
 then raise exception 'RILEY_REVIEW_PUBLISH_INTENT_REQUIRES_PREPARED_ORIGINAL';end if;
 update reality_internal.riley_pr_review_originals_v1
  set phase='PUBLISHING',updated_at=clock_timestamp()
  where original_work_id=p_original_work_id;
 return jsonb_build_object('status','PR_REVIEW_PUBLISH_INTENT_DURABLY_RECORDED',
  'original_work_id',p_original_work_id,'claim_id',p_claim_id,
  'review_digest',j.review_digest,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $fn$;

create or replace function public.reality_settle_authorized_riley_pr_review_v1(
 p_original_work_id text,p_claim_id uuid,
 p_comment_id bigint,p_comment_url text,p_independent_body_sha256 text,
 p_head_sha text)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare j reality_internal.riley_pr_review_originals_v1%rowtype;
 v_receipt uuid;
begin
 if current_user<>'service_role' then raise exception 'RILEY_REVIEW_SERVICE_ROLE_REQUIRED';end if;
 select * into j from reality_internal.riley_pr_review_originals_v1
  where original_work_id=p_original_work_id and claim_id=p_claim_id for update;
 if not found or j.phase not in ('PUBLISHING','SETTLED') or
   p_comment_id is null or p_comment_id<1 or
   p_comment_url not in (
    'https://github.com/maloney2323/Reality/issues/'||
      split_part(j.source_ref,'/pull/',2)||'#issuecomment-'||p_comment_id::text,
    'https://github.com/maloney2323/Reality/pull/'||
      split_part(j.source_ref,'/pull/',2)||'#issuecomment-'||p_comment_id::text
   ) or
   p_independent_body_sha256<>j.review_digest or
   p_head_sha<>j.source_head_sha
 then raise exception 'RILEY_REVIEW_INDEPENDENT_PROVIDER_READBACK_REQUIRED';end if;
 if j.phase='SETTLED' then
  if j.provider_comment_id<>p_comment_id or
    j.independent_provider_digest<>p_independent_body_sha256 then
   raise exception 'RILEY_REVIEW_ALREADY_SETTLED_IDENTITY_DRIFT';end if;
  v_receipt:=j.settlement_receipt_id;
 else
  v_receipt:=gen_random_uuid();
  update reality_internal.riley_pr_review_originals_v1
   set phase='SETTLED',provider_comment_id=p_comment_id,
    provider_comment_url=p_comment_url,
    settlement_receipt_id=v_receipt,
    independent_provider_digest=p_independent_body_sha256,
    settled_at=clock_timestamp(),updated_at=clock_timestamp()
   where original_work_id=p_original_work_id;
 end if;
 return jsonb_build_object('status','EXACT_PR_REVIEW_ORIGINAL_INDEPENDENTLY_SETTLED',
  'original_work_id',p_original_work_id,'claim_id',p_claim_id,
  'settlement_receipt_ref','supabase:riley_pr_review_originals_v1:'||v_receipt::text,
  'provider_comment_url',p_comment_url,'independent_provider_readback_verified',true,
  'original_job_completed',true,'repair_installed',false,
  'installation_authorized',false,'production_changed',false,
  'verified_human_hours_saved',null);
end $fn$;

create or replace function public.reality_read_owner_riley_pr_review_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
begin
 if current_user<>'service_role' then raise exception 'RILEY_REVIEW_SERVICE_ROLE_REQUIRED';end if;
 if p_owner_id is null then raise exception 'RILEY_REVIEW_OWNER_REQUIRED';end if;
 return jsonb_build_object('status','OWNER_PR_REVIEW_ORIGINAL_READBACK',
  'jobs',coalesce((select jsonb_agg(jsonb_build_object(
   'shift_id',j.shift_id,'original_work_id',j.original_work_id,
   'source_ref',j.source_ref,'phase',j.phase,
   'source_head_sha',j.source_head_sha,
   'provider_comment_url',case when j.phase='SETTLED' then j.provider_comment_url else null end,
   'settlement_receipt_ref',case when j.phase='SETTLED' then
     'supabase:riley_pr_review_originals_v1:'||j.settlement_receipt_id::text else null end,
   'original_job_completed',j.phase='SETTLED',
   'source_review_job_only',true,'source_code_repaired',false,
   'installation_authorized',false,'production_changed',false
  ) order by j.created_at desc)
   from (select * from reality_internal.riley_pr_review_originals_v1
    where owner_id=p_owner_id order by created_at desc limit 10) j),'[]'::jsonb),
  'production_changed',false,'verified_human_hours_saved',null);
end $fn$;

revoke all on function public.reality_claim_authorized_riley_pr_review_v1()
 from public,anon,authenticated;
revoke all on function public.reality_prepare_authorized_riley_pr_review_v1(text,uuid,text,text,text)
 from public,anon,authenticated;
revoke all on function public.reality_mark_authorized_riley_pr_publish_v1(text,uuid)
 from public,anon,authenticated;
revoke all on function public.reality_settle_authorized_riley_pr_review_v1(text,uuid,bigint,text,text,text)
 from public,anon,authenticated;
revoke all on function public.reality_read_owner_riley_pr_review_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_claim_authorized_riley_pr_review_v1() to service_role;
grant execute on function public.reality_prepare_authorized_riley_pr_review_v1(text,uuid,text,text,text) to service_role;
grant execute on function public.reality_mark_authorized_riley_pr_publish_v1(text,uuid) to service_role;
grant execute on function public.reality_settle_authorized_riley_pr_review_v1(text,uuid,bigint,text,text,text) to service_role;
grant execute on function public.reality_read_owner_riley_pr_review_v1(uuid) to service_role;
