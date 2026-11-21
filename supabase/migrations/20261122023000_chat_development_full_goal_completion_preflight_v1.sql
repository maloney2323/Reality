-- Owner-scoped read-only bridge from existing signed Chat originals to
-- independent full-goal acceptance and existing governed install machinery.
-- It never treats syntax-only CI, a model assertion, or an unrelated settled
-- Riley original as authority, feature acceptance, installation, or settlement.
create or replace function public.reality_read_owner_chat_development_completion_preflight_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_count int;v_items jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'CHAT_COMPLETION_PREFLIGHT_OWNER_SERVICE_REQUIRED';
 end if;
 select count(*) into v_count
 from reality_internal.chat_work_handoffs_v1 h
 where h.owner_id=p_owner_id and h.development->>'version'='reality-chat-new-development-v1';
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'message_id',x.message_id,'original_work_id',x.original_work_id,
  'conversation_id',x.conversation_id,'source_ref',x.source_ref,
  'original_goal',x.original_goal,'phase',x.phase,
  'signed_source_current',x.signed_source_current,
  'syntax_ci_independently_recorded',x.syntax_ci,
  'syntax_ci_run_id',x.syntax_ci_run_id,
  'candidate_pr_url',x.candidate_pr_url,
  'candidate_commit_sha',x.candidate_commit_sha,
  'feature_acceptance_independently_verified',false,
  'feature_acceptance_requires_full_original_goal',true,
  'prior_unrelated_install_does_not_authorize_this_original',true,
  'existing_general_install_lineage_compatible',x.general_install_lineage_compatible,
  'same_original_install_review_bound',x.install_review_bound,
  'exact_owner_install_approval_recorded',x.exact_owner_approval,
  'independent_final_receipt_recorded',x.final_receipt_recorded,
  'next_gate',case
   when not x.signed_source_current then 'REQUALIFY_EXACT_SIGNED_CHAT_ORIGINAL_SOURCE'
   when not x.syntax_ci then 'RECONCILE_EXACT_ORIGINAL_GITHUB_CI_BEFORE_FEATURE_TEST'
   -- Current Chat-development evidence contains source/syntax CI but no
   -- independently provider-verified original-goal feature acceptance.
   when not x.general_install_lineage_compatible then
    'RUN_FULL_GOAL_FEATURE_ACCEPTANCE_AND_CONNECT_COMPATIBLE_ORIGINAL_INSTALL_ADAPTER'
   else 'RUN_INDEPENDENT_FULL_GOAL_FEATURE_ACCEPTANCE_BEFORE_INSTALL'
   end,
  'owner_install_approval_ready',false,
  'execution_authorized',false,'installation_authorized',false,
  'original_job_completed_by_read',false,'production_changed',false
 ) order by x.created_at desc), '[]'::jsonb) into v_items
 from (
  select h.message_id,h.conversation_id,h.created_at,
   h.development->>'original_work_id' as original_work_id,
   h.development->>'phase' as phase,
   pg_catalog.left(coalesce(h.development->>'objective',''),600) as original_goal,
   'supabase:reality_chat_messages:'||h.message_id::text as source_ref,
   (m.id is not null and m.role='user' and
    m.user_id=h.owner_id and m.conversation_id=h.conversation_id and
    m.request_id=h.request_id and
    h.development->>'source_sha256'=h.message_sha256 and
    h.development->>'original_work_id' ~ '^work:[a-f0-9]{32}$') as signed_source_current,
   (h.development->>'phase'='CI_VERIFIED' and
    h.development->>'independent_ci_verified'='true' and
    h.development->'evidence'->>'ci_scope'='SYNTAX_AND_SOURCE_IDENTITY_ONLY' and
    h.development->'evidence'->>'independent_ci_run_id' ~ '^[1-9][0-9]{4,}$' and
    h.development->'evidence'->>'artifact_commit_sha' ~ '^[a-f0-9]{40}$') as syntax_ci,
   case when h.development->'evidence'->>'independent_ci_run_id' ~ '^[1-9][0-9]{4,}$'
    then (h.development->'evidence'->>'independent_ci_run_id')::bigint
    else null end as syntax_ci_run_id,
   h.development->'evidence'->>'pr_url' as candidate_pr_url,
   h.development->'evidence'->>'artifact_commit_sha' as candidate_commit_sha,
   exists(select 1 from reality_internal.riley_unattended_repair_originals_v1 r
    where r.original_work_id=h.development->>'original_work_id'
    and r.owner_id=h.owner_id) as general_install_lineage_compatible,
   exists(select 1 from reality_internal.governed_original_install_reviews_v1 i
    where i.original_work_id=h.development->>'original_work_id'
    and i.owner_id=h.owner_id
    and i.candidate_commit_sha=h.development->'evidence'->>'artifact_commit_sha') as install_review_bound,
   exists(select 1 from reality_internal.governed_original_install_reviews_v1 i
    where i.original_work_id=h.development->>'original_work_id'
    and i.owner_id=h.owner_id and i.approval_receipt_id is not null) as exact_owner_approval,
   exists(select 1 from reality_internal.governed_original_independent_final_receipts_v1 f
    where f.original_work_id=h.development->>'original_work_id' and
    f.owner_id=h.owner_id and f.outcome='SUCCEEDED') as final_receipt_recorded
  from reality_internal.chat_work_handoffs_v1 h
  left join public.reality_chat_messages m on m.id=h.message_id
  where h.owner_id=p_owner_id and
    h.development->>'version'='reality-chat-new-development-v1'
  order by h.created_at desc
  limit 10
 ) x;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_CHAT_DEVELOPMENT_FULL_GOAL_COMPLETION_PREFLIGHT_READ_ONLY',
  'owner_id',p_owner_id,'items',v_items,'total',coalesce(v_count,0),
  'read_only',true,'new_original_created',false,'new_shift_started',false,
  'owner_approval_granted',false,'execution_authorized',false,
  'installation_authorized',false,'original_job_completed_by_read',false,
  'production_changed',false);
end; $fn$;
revoke all on function public.reality_read_owner_chat_development_completion_preflight_v1(uuid) from public,anon,authenticated;
grant execute on function public.reality_read_owner_chat_development_completion_preflight_v1(uuid) to service_role;
