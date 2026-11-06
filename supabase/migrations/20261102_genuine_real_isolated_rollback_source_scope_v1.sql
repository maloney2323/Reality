-- Trusted read-only source pin for actual historical isolated install.
create or replace function public.reality_genuine_isolated_rollback_drill_scope_v1()
returns jsonb language plpgsql set search_path to '' as $fn$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'REALITY_ROLLBACK_SCOPE_SERVICE_ROLE_REQUIRED';end if;
 select * into q from reality_internal.genuine_capability_queue_v1 where
 capability_id='reality-continuity-settlement-reconciler' and phase='SETTLED_ISOLATED'
 order by created_at desc limit 1;
 select * into a from reality_internal.genuine_preview_install_approvals_v1 where trigger_id=q.trigger_id;
 if q.trigger_id is null or q.original_work_id<>a.original_work_id
 or a.approval_receipt->>'approval_origin'<>'AUTHENTICATED_OWNER_EXPLICIT_ACTION'
 or a.target_environment<>'ISOLATED_PREVIEW' or a.installed_commit_sha !~ '^[a-f0-9]{40}$'
 or a.installation_receipt->>'installed_branch' !~ '^feature/reality-qualified-install-[a-f0-9]{12}$'
 or a.installation_receipt->>'installed_commit_sha'<>a.installed_commit_sha
 or a.artifact_hash<>a.installation_receipt->>'artifact_sha256'
 or a.settlement_receipt->>'original_job_completed'<>'true'
 or a.probation_status<>'ACTIVE'
 or jsonb_array_length(q.qualified_candidate->'files')<2
 then raise exception 'REALITY_ROLLBACK_PINNED_OWNER_INSTALL_NOT_FOUND';end if;
 return jsonb_build_object(
  'schema','reality-signed-isolated-rollback-scope-v1',
  'original_work_id',q.original_work_id,
  'approval_id',a.approval_id,
  'artifact_sha256',a.artifact_hash,
  'installed_commit_sha',a.installed_commit_sha,
  'installed_branch',a.installation_receipt->>'installed_branch',
  'source_paths',coalesce((select jsonb_agg(x->>'path')
    from jsonb_array_elements(q.qualified_candidate->'files') as x),'[]'::jsonb),
  'target_environment','ISOLATED_PREVIEW',
  'original_job_completed',true,
  'original_install_branch_must_remain_unchanged',true,
  'production_changed',false,'production_release_authorized',false);
end $fn$;
revoke all on function public.reality_genuine_isolated_rollback_drill_scope_v1() from public,anon,authenticated;
grant execute on function public.reality_genuine_isolated_rollback_drill_scope_v1() to service_role;

create table if not exists reality_internal.genuine_isolated_rollback_drill_receipts_v1(
 run_id bigint primary key,
 repository_sha text not null check(repository_sha ~ '^[a-f0-9]{40}$'),
 original_work_id text not null check(original_work_id ~ '^work:[a-f0-9]{32}$'),
 installed_commit_sha text not null check(installed_commit_sha ~ '^[a-f0-9]{40}$'),
 rollback_commit_sha text not null check(rollback_commit_sha ~ '^[a-f0-9]{40}$'),
 drill_branch text not null unique,
 base_tree_sha text not null check(base_tree_sha ~ '^[a-f0-9]{40}$'),
 source_paths jsonb not null,
 original_branch_preserved boolean not null check(original_branch_preserved),
 rolled_back_source_absent boolean not null check(rolled_back_source_absent),
 production_changed boolean not null default false check(not production_changed),
 recorded_at timestamptz not null default clock_timestamp()
);
alter table reality_internal.genuine_isolated_rollback_drill_receipts_v1 enable row level security;
revoke all on reality_internal.genuine_isolated_rollback_drill_receipts_v1 from public,anon,authenticated;
grant select,insert on reality_internal.genuine_isolated_rollback_drill_receipts_v1 to service_role;
create or replace function public.reality_record_genuine_isolated_rollback_drill_v1(
 p_run_id bigint,p_repository_sha text,p_original_work_id text,p_installed_commit_sha text,
 p_rollback_commit_sha text,p_drill_branch text,p_base_tree_sha text,p_source_paths jsonb)
returns jsonb language plpgsql set search_path to '' as $fn$
declare r reality_internal.genuine_isolated_rollback_drill_receipts_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'REALITY_ROLLBACK_RECORD_SERVICE_ROLE_REQUIRED';end if;
 if p_run_id<1 or p_repository_sha !~ '^[a-f0-9]{40}$'
 or p_original_work_id !~ '^work:[a-f0-9]{32}$'
 or p_installed_commit_sha !~ '^[a-f0-9]{40}$'
 or p_rollback_commit_sha !~ '^[a-f0-9]{40}$'
 or p_base_tree_sha !~ '^[a-f0-9]{40}$'
 or p_drill_branch<>('feature/reality-rollback-drill-'||p_run_id::text)
 or jsonb_typeof(p_source_paths)<>'array' then
  raise exception 'REALITY_ROLLBACK_EXACT_SOURCE_REQUIRED';end if;
 insert into reality_internal.genuine_isolated_rollback_drill_receipts_v1
 (run_id,repository_sha,original_work_id,installed_commit_sha,rollback_commit_sha,
 drill_branch,base_tree_sha,source_paths,original_branch_preserved,rolled_back_source_absent)
 values(p_run_id,p_repository_sha,p_original_work_id,p_installed_commit_sha,p_rollback_commit_sha,
 p_drill_branch,p_base_tree_sha,p_source_paths,true,true)
 on conflict(run_id) do nothing;
 select * into r from reality_internal.genuine_isolated_rollback_drill_receipts_v1
 where run_id=p_run_id;
 if r.original_work_id<>p_original_work_id or r.installed_commit_sha<>p_installed_commit_sha
 or r.rollback_commit_sha<>p_rollback_commit_sha or r.base_tree_sha<>p_base_tree_sha
 or r.drill_branch<>p_drill_branch or r.source_paths<>p_source_paths or
 r.repository_sha<>p_repository_sha then raise exception 'REALITY_ROLLBACK_REPLAY_CONFLICT';end if;
 return jsonb_build_object('status','ISOLATED_ROLLBACK_DRILL_RECORDED',
 'run_id',r.run_id,'original_work_id',r.original_work_id,
 'rollback_commit_sha',r.rollback_commit_sha,'installed_commit_sha',r.installed_commit_sha,
 'original_branch_preserved',r.original_branch_preserved,
 'rolled_back_source_absent',r.rolled_back_source_absent,
 'production_changed',false,'production_release_authorized',false);
end $fn$;
revoke all on function public.reality_record_genuine_isolated_rollback_drill_v1(bigint,text,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.reality_record_genuine_isolated_rollback_drill_v1(bigint,text,text,text,text,text,text,jsonb) to service_role;
