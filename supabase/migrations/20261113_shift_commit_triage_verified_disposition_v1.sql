
-- Independently settled original #62: owner-assisted GitHub disposition.
-- No new shift, generated capability, installation, or production effect.
alter table reality_internal.riley_commit_reference_triage_originals_v1
 add column if not exists provider_comment_id bigint,
 add column if not exists provider_comment_url text,
 add column if not exists provider_comment_body_sha256 text,
 add column if not exists final_receipt_id uuid,
 add column if not exists settled_at timestamptz,
 add column if not exists execution_origin text;
alter table reality_internal.riley_commit_reference_triage_originals_v1
 drop constraint if exists riley_commit_reference_triage_originals_v1_phase_check;
alter table reality_internal.riley_commit_reference_triage_originals_v1
 add constraint riley_commit_reference_triage_originals_v1_phase_check
 check(phase in ('SOURCE_ADMITTED','EVIDENCE_VERIFIED','BLOCKED','SETTLED'));
create or replace function public.reality_settle_verified_shift_commit_triage_v1(
 p_original_work_id text,p_commit_sha text,
 p_issue_state text,p_issue_state_reason text,p_issue_closed_at timestamptz,
 p_comment_id bigint,p_comment_url text,p_comment_body text,
 p_comment_created_at timestamptz,p_author text,p_author_association text)
returns jsonb language plpgsql security invoker
set search_path to '' as $fn$
declare j reality_internal.riley_commit_reference_triage_originals_v1%rowtype;
 v_digest text;v_receipt uuid;
begin
 if current_user<>'service_role' then raise exception 'TRIAGE_SETTLEMENT_SERVICE_ONLY';end if;
 select * into j from reality_internal.riley_commit_reference_triage_originals_v1
 where original_work_id=p_original_work_id for update;
 if not found or j.phase not in ('EVIDENCE_VERIFIED','SETTLED')
  or j.source_ref<>'https://github.com/maloney2323/Reality/issues/62'
  or j.commit_sha<>p_commit_sha
  or p_issue_state<>'closed' or p_issue_state_reason<>'completed'
  or p_comment_id is null or p_comment_id<1
  or p_comment_url<>j.source_ref||'#issuecomment-'||p_comment_id::text
  or p_author<>'maloney2323' or p_author_association<>'OWNER'
  or p_comment_body is null or length(p_comment_body)<200 or length(p_comment_body)>10000
  or strpos(p_comment_body,j.original_work_id)=0
  or strpos(p_comment_body,j.commit_sha)=0
  or strpos(p_comment_body,'Verified commit-reference triage')=0
  or strpos(p_comment_body,'not automatically authored by Reality')=0
  or j.evidence_verified_at is null or p_comment_created_at is null
  or p_issue_closed_at is null
  or p_comment_created_at<j.evidence_verified_at
  or p_issue_closed_at<p_comment_created_at
  or p_issue_closed_at>clock_timestamp()+interval '2 minutes'
  or not exists(select 1 from reality_internal.governed_employee_shifts_v1 s
   join reality_internal.governed_employee_completion_warrants_v1 w
    on w.shift_id=s.shift_id and w.owner_id=s.owner_id
    and w.plan_fingerprint=s.plan_fingerprint
   where s.shift_id=j.shift_id and s.owner_id=j.owner_id
    and s.closed_at is null and w.state='ACTIVE'
    and s.planned_end_at='infinity'::timestamptz)
 then raise exception 'TRIAGE_EXACT_PROVIDER_OWNER_WARRANT_REQUIRED';end if;
 v_digest:='sha256:'||encode(sha256(convert_to(p_comment_body,'UTF8')),'hex');
 if j.phase='SETTLED' then
  if j.provider_comment_id<>p_comment_id or
   j.provider_comment_url<>p_comment_url or
   j.provider_comment_body_sha256<>v_digest or
   j.execution_origin<>'OWNER_DIRECTED_CHATGPT_GITHUB_ACTION'
  then raise exception 'TRIAGE_SETTLED_IDENTITY_DRIFT';end if;
  v_receipt:=j.final_receipt_id;
 else
  v_receipt:=gen_random_uuid();
  update reality_internal.riley_commit_reference_triage_originals_v1
   set phase='SETTLED',provider_comment_id=p_comment_id,
    provider_comment_url=p_comment_url,
    provider_comment_body_sha256=v_digest,final_receipt_id=v_receipt,
    settled_at=clock_timestamp(),
    execution_origin='OWNER_DIRECTED_CHATGPT_GITHUB_ACTION'
  where original_work_id=j.original_work_id and phase='EVIDENCE_VERIFIED';
  if not found then raise exception 'TRIAGE_ATOMIC_SETTLEMENT_UNVERIFIED';end if;
 end if;
 if v_receipt is null then raise exception 'TRIAGE_FINAL_RECEIPT_UNVERIFIED';end if;
 return jsonb_build_object(
  'status','EXACT_COMMIT_TRIAGE_ORIGINAL_INDEPENDENTLY_SETTLED',
  'original_work_id',j.original_work_id,'shift_id',j.shift_id,
  'source_ref',j.source_ref,'commit_sha',j.commit_sha,
  'provider_comment_url',p_comment_url,
  'settlement_receipt_ref','supabase:riley_commit_reference_triage_originals_v1:'||v_receipt::text,
  'phase','SETTLED','execution_origin','OWNER_DIRECTED_CHATGPT_GITHUB_ACTION',
  'original_job_completed',true,'independent_provider_readback_verified',true,
  'installation_authorized',false,'production_changed',false,
  'verified_human_hours_saved',null);
end $fn$;
revoke all on function public.reality_settle_verified_shift_commit_triage_v1(
 text,text,text,text,timestamptz,bigint,text,text,timestamptz,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_settle_verified_shift_commit_triage_v1(
 text,text,text,text,timestamptz,bigint,text,text,timestamptz,text,text)
 to service_role;
do $graph$
declare code text;
 needle text:='when v_phase=''EVIDENCE_VERIFIED''
        then ''AWAIT_INDEPENDENT_COMMIT_TRIAGE_DISPOSITION''';
begin
 select pg_get_functiondef(
  'public.reality_read_owner_shift_execution_graph_v1(uuid,uuid)'::regprocedure)
 into code;
 if code is null or strpos(code,needle)=0
 or strpos(code,'INDEPENDENT_FINAL_COMMIT_TRIAGE_RECEIPT_READBACK')>0
 then raise exception 'TRIAGE_GRAPH_SOURCE_CHANGED';end if;
 execute replace(code,needle,needle||
 E'\n       when v_phase=''SETTLED''\n        then ''INDEPENDENT_FINAL_COMMIT_TRIAGE_RECEIPT_READBACK''');
end $graph$;
