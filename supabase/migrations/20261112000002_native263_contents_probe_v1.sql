-- Reality owner-authorized shift #263: verify the existing broker's GitHub
-- Contents-write capability on ONE inert isolated canary branch/file.
-- This is NOT #263 installation, a new job, a production change or an
-- installation approval. Exactly one POST/PUT attempt can be authorized.
create table if not exists reality_internal.native263_contents_canary_probes_v1 (
 probe_key text primary key
  check (probe_key='native263-isolated-github-contents-canary-20261112'),
 original_work_id text not null
  check (original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc'),
 shift_id uuid not null
  check (shift_id='9460cfff-937a-4105-9093-2e41ab39a950'::uuid),
 state text not null default 'CLAIMED'
  check (state in ('CLAIMED','VERIFIED','BLOCKED','UNCERTAIN')),
 result_status text,
 github_http_status integer,
 provider_commit_sha text,
 provider_blob_sha text,
 claimed_at timestamptz not null default clock_timestamp(),
 recorded_at timestamptz,
 constraint native263_probe_result_check check (
  result_status is null or result_status in (
   'WRITE_READBACK_VERIFIED','GITHUB_HTTP_403_FORBIDDEN',
   'GITHUB_HTTP_401_UNAUTHORIZED','GITHUB_HTTP_409_CONFLICT',
   'GITHUB_HTTP_OTHER_REJECTED','PROVIDER_EFFECT_UNVERIFIED',
   'PRECONDITION_SOURCE_DRIFT','CANARY_PREEXISTING_UNATTRIBUTED',
   'BROKER_CREDENTIAL_MISSING','GITHUB_READ_UNVERIFIED')),
 constraint native263_probe_sha_check check (
  (provider_commit_sha is null or provider_commit_sha ~ '^[a-f0-9]{40}$')
  and (provider_blob_sha is null or provider_blob_sha ~ '^[a-f0-9]{40}$'))
);
alter table reality_internal.native263_contents_canary_probes_v1 enable row level security;
revoke all on reality_internal.native263_contents_canary_probes_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.native263_contents_canary_probes_v1 to service_role;

create or replace function public.reality_claim_native263_contents_canary_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 g jsonb; j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 v reality_internal.native263_contents_canary_probes_v1%rowtype;
 inserted boolean:=false;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE263_CANARY_SERVICE_ROLE_REQUIRED';
 end if;
 g:=public.reality_read_current_shift_execution_graph_v1();
 if g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  or g->>'shift_id'<>'9460cfff-937a-4105-9093-2e41ab39a950'
  or g->>'execution_scope_from_owner_warrant_only'<>'true'
  or g->>'completion_bound'<>'true'
  or g->>'installation_authorized'<>'false'
  or g->>'production_changed'<>'false'
  or (select count(*) from pg_catalog.jsonb_array_elements(g->'jobs') item
   where item->>'original_work_id'='work:873a6e74fd14c6beacc9042dd8021dfc'
    and item->>'original_kind'='REAL_ENGINEERING_REPAIR_ORIGINAL'
    and item->>'source_ref'='https://github.com/maloney2323/Reality/issues/263'
    and item->>'phase'='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'
    and item->>'independent_source_proof_verified'='true'
    and item->>'capability_installation_authorized'='false')<>1
 then raise exception 'NATIVE263_CANARY_ORIGINAL_SHIFT_WARRANT_INVALID'; end if;
 select * into j from reality_internal.riley_unattended_repair_originals_v1
 where original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc';
 if not found or j.shift_id::text<>g->>'shift_id'
  or j.owner_id::text<>g->>'owner_id'
  or j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'
  or j.installed is distinct from false
  or j.production_changed is distinct from false
  or j.exact_approval_receipt_ref is not null
  or j.original_settlement_receipt_ref is not null
  or j.candidate_commit_sha<>'e44ee294f21c73803a2bcdb5a9cb487f0f80fc85'
  or j.candidate_artifact_sha256<>
    'sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48'
 then raise exception 'NATIVE263_CANARY_SOURCE_OR_OWNER_CONTEXT_CHANGED'; end if;
 insert into reality_internal.native263_contents_canary_probes_v1 (
  probe_key,original_work_id,shift_id,state)
 values ('native263-isolated-github-contents-canary-20261112',
  'work:873a6e74fd14c6beacc9042dd8021dfc',
  '9460cfff-937a-4105-9093-2e41ab39a950','CLAIMED')
 on conflict do nothing returning * into v;
 inserted:=found;
 if not inserted then
  select * into v from reality_internal.native263_contents_canary_probes_v1
  where probe_key='native263-isolated-github-contents-canary-20261112';
 end if;
 return pg_catalog.jsonb_build_object(
  'status',case when inserted then 'ONE_INERT_CANARY_WRITE_PROBE_CLAIMED'
   else 'ALREADY_CLAIMED_OR_RECORDED_NEVER_REPOST' end,
  'state',v.state,'result_status',v.result_status,
  'github_http_status',v.github_http_status,
  'provider_commit_sha',v.provider_commit_sha,
  'provider_blob_sha',v.provider_blob_sha,
  'original_work_id',v.original_work_id,'shift_id',v.shift_id,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_record_native263_contents_canary_v1(
 p_result_status text,p_http_status integer,
 p_commit_sha text default null,p_blob_sha text default null)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v reality_internal.native263_contents_canary_probes_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE263_CANARY_RESULT_SERVICE_ROLE_REQUIRED';
 end if;
 if p_result_status not in (
  'WRITE_READBACK_VERIFIED','GITHUB_HTTP_403_FORBIDDEN',
  'GITHUB_HTTP_401_UNAUTHORIZED','GITHUB_HTTP_409_CONFLICT',
  'GITHUB_HTTP_OTHER_REJECTED','PROVIDER_EFFECT_UNVERIFIED',
  'PRECONDITION_SOURCE_DRIFT','CANARY_PREEXISTING_UNATTRIBUTED',
  'BROKER_CREDENTIAL_MISSING','GITHUB_READ_UNVERIFIED')
  or (p_http_status is not null and (p_http_status<100 or p_http_status>599))
  or (p_result_status='WRITE_READBACK_VERIFIED' and
   (p_http_status is distinct from 201 or
    coalesce(p_commit_sha,'') !~ '^[a-f0-9]{40})
  or (p_result_status<>'WRITE_READBACK_VERIFIED' and
    (p_commit_sha is not null or p_blob_sha is not null))
 then raise exception 'NATIVE263_CANARY_EXACT_RESULT_INVALID'; end if;
 update reality_internal.native263_contents_canary_probes_v1
 set state=case when p_result_status='WRITE_READBACK_VERIFIED' then 'VERIFIED'
  when p_result_status='PROVIDER_EFFECT_UNVERIFIED' then 'UNCERTAIN'
  else 'BLOCKED' end,
  result_status=p_result_status,github_http_status=p_http_status,
  provider_commit_sha=p_commit_sha,provider_blob_sha=p_blob_sha,
  recorded_at=clock_timestamp()
 where probe_key='native263-isolated-github-contents-canary-20261112'
  and state='CLAIMED'
 returning * into v;
 if not found then
  select * into v from reality_internal.native263_contents_canary_probes_v1
  where probe_key='native263-isolated-github-contents-canary-20261112';
  if not found then raise exception 'NATIVE263_CANARY_CLAIM_MISSING'; end if;
 end if;
 return pg_catalog.jsonb_build_object(
  'status','NATIVE263_INERT_PROVIDER_WRITE_RESULT_RECORDED',
  'state',v.state,'result_status',v.result_status,
  'github_http_status',v.github_http_status,
  'provider_commit_sha',v.provider_commit_sha,
  'provider_blob_sha',v.provider_blob_sha,
  'original_work_id',v.original_work_id,
  'shift_id',v.shift_id,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_claim_native263_contents_canary_v1()
 from public,anon,authenticated;
grant execute on function public.reality_claim_native263_contents_canary_v1()
 to service_role;
revoke all on function public.reality_record_native263_contents_canary_v1(text,integer,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_record_native263_contents_canary_v1(text,integer,text,text)
 to service_role;

    or coalesce(p_blob_sha,'') !~ '^[a-f0-9]{40})
  or (p_result_status<>'WRITE_READBACK_VERIFIED' and
    (p_commit_sha is not null or p_blob_sha is not null))
 then raise exception 'NATIVE263_CANARY_EXACT_RESULT_INVALID'; end if;
 update reality_internal.native263_contents_canary_probes_v1
 set state=case when p_result_status='WRITE_READBACK_VERIFIED' then 'VERIFIED'
  when p_result_status='PROVIDER_EFFECT_UNVERIFIED' then 'UNCERTAIN'
  else 'BLOCKED' end,
  result_status=p_result_status,github_http_status=p_http_status,
  provider_commit_sha=p_commit_sha,provider_blob_sha=p_blob_sha,
  recorded_at=clock_timestamp()
 where probe_key='native263-isolated-github-contents-canary-20261112'
  and state='CLAIMED'
 returning * into v;
 if not found then
  select * into v from reality_internal.native263_contents_canary_probes_v1
  where probe_key='native263-isolated-github-contents-canary-20261112';
  if not found then raise exception 'NATIVE263_CANARY_CLAIM_MISSING'; end if;
 end if;
 return pg_catalog.jsonb_build_object(
  'status','NATIVE263_INERT_PROVIDER_WRITE_RESULT_RECORDED',
  'state',v.state,'result_status',v.result_status,
  'github_http_status',v.github_http_status,
  'provider_commit_sha',v.provider_commit_sha,
  'provider_blob_sha',v.provider_blob_sha,
  'original_work_id',v.original_work_id,
  'shift_id',v.shift_id,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_claim_native263_contents_canary_v1()
 from public,anon,authenticated;
grant execute on function public.reality_claim_native263_contents_canary_v1()
 to service_role;
revoke all on function public.reality_record_native263_contents_canary_v1(text,integer,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_record_native263_contents_canary_v1(text,integer,text,text)
 to service_role;
))
  or (p_result_status<>'WRITE_READBACK_VERIFIED' and
    (p_commit_sha is not null or p_blob_sha is not null))
 then raise exception 'NATIVE263_CANARY_EXACT_RESULT_INVALID'; end if;
 update reality_internal.native263_contents_canary_probes_v1
 set state=case when p_result_status='WRITE_READBACK_VERIFIED' then 'VERIFIED'
  when p_result_status='PROVIDER_EFFECT_UNVERIFIED' then 'UNCERTAIN'
  else 'BLOCKED' end,
  result_status=p_result_status,github_http_status=p_http_status,
  provider_commit_sha=p_commit_sha,provider_blob_sha=p_blob_sha,
  recorded_at=clock_timestamp()
 where probe_key='native263-isolated-github-contents-canary-20261112'
  and state='CLAIMED'
 returning * into v;
 if not found then
  select * into v from reality_internal.native263_contents_canary_probes_v1
  where probe_key='native263-isolated-github-contents-canary-20261112';
  if not found then raise exception 'NATIVE263_CANARY_CLAIM_MISSING'; end if;
 end if;
 return pg_catalog.jsonb_build_object(
  'status','NATIVE263_INERT_PROVIDER_WRITE_RESULT_RECORDED',
  'state',v.state,'result_status',v.result_status,
  'github_http_status',v.github_http_status,
  'provider_commit_sha',v.provider_commit_sha,
  'provider_blob_sha',v.provider_blob_sha,
  'original_work_id',v.original_work_id,
  'shift_id',v.shift_id,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_claim_native263_contents_canary_v1()
 from public,anon,authenticated;
grant execute on function public.reality_claim_native263_contents_canary_v1()
 to service_role;
revoke all on function public.reality_record_native263_contents_canary_v1(text,integer,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_record_native263_contents_canary_v1(text,integer,text,text)
 to service_role;
