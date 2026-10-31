-- One evidence-linked replay of a dispatch that failed BEFORE DB admission.
-- No change to original job queue, exhausted claim, installation authority or goal.
create table if not exists reality_internal.original_178_dispatch_retries_v1(
 id uuid primary key default gen_random_uuid(),
 recovery_id uuid not null unique references reality_internal.original_178_recovery_v1(id),
 old_dispatch_sha text not null,
 new_dispatch_sha text not null,
 failed_preclaim_workflow_run_id bigint not null,
 reason text not null check(reason='WORKER_MISSING_DB_SECRET_OIDC_REMEDIATION'),
 created_at timestamptz not null default now()
);
alter table reality_internal.original_178_dispatch_retries_v1 enable row level security;
revoke all on reality_internal.original_178_dispatch_retries_v1 from public,anon,authenticated;
grant select,insert on reality_internal.original_178_dispatch_retries_v1 to service_role;

create or replace function public.reality_rebind_original_178_unclaimed_dispatch_v1(
 p_recovery_id uuid,p_prior_dispatch_sha text,p_replacement_dispatch_sha text,
 p_failed_preclaim_run_id bigint)
returns jsonb language plpgsql security invoker set search_path=''
as $function$
declare
 r reality_internal.original_178_recovery_v1%rowtype;
 q reality_internal.governed_build_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'ORIGINAL_178_WORKER_RETRY_SERVICE_ROLE_REQUIRED';end if;
 if p_prior_dispatch_sha !~ '^[a-f0-9]{40}$' or
  p_replacement_dispatch_sha !~ '^[a-f0-9]{40}$' or
  p_prior_dispatch_sha=p_replacement_dispatch_sha or
  p_failed_preclaim_run_id<>41216725076 then
  raise exception 'ORIGINAL_178_DOCUMENTED_PRECLAIM_FAILURE_REQUIRED';end if;
 select * into r from reality_internal.original_178_recovery_v1
  where id=p_recovery_id for update;
 if r.id is null or r.phase<>'DISPATCHED' or r.recovery_claim_id is not null
  or r.dispatched_at is null or r.dispatch_commit_sha<>p_prior_dispatch_sha
  or r.original_work_id<>'work:9b9578b3c65427589c4c6da68fe0fc87'
  or r.dispatch_request_path is distinct from
    ('reality-requests/'||r.id::text||'.json')
  or exists(select 1 from reality_internal.original_178_dispatch_retries_v1
     where recovery_id=r.id)
 then raise exception 'ORIGINAL_178_RECOVERY_RETRY_EXHAUSTED_OR_CHANGED';end if;
 select * into q from reality_internal.governed_build_queue_v1
  where id=r.original_queue_id for update;
 select * into e from reality_internal.goal_publication_epochs
  where user_id=r.owner_id and conversation_id=r.conversation_id for update;
 if q.phase<>'ESCALATED' or q.worker_claim_id<>r.prior_worker_claim_id
  or q.original_work_id<>r.original_work_id or e.revision<>q.goal_revision
  or e.last_transition_event_id is distinct from q.goal_transition_event_id
 then raise exception 'ORIGINAL_178_OLD_CLAIM_OR_GOAL_CHANGED';end if;
 insert into reality_internal.original_178_dispatch_retries_v1
  (recovery_id,old_dispatch_sha,new_dispatch_sha,
   failed_preclaim_workflow_run_id,reason)
 values(r.id,p_prior_dispatch_sha,p_replacement_dispatch_sha,
  p_failed_preclaim_run_id,'WORKER_MISSING_DB_SECRET_OIDC_REMEDIATION');
 update reality_internal.original_178_recovery_v1 set
 dispatch_commit_sha=p_replacement_dispatch_sha,dispatched_at=now(),updated_at=now()
 where id=r.id;
 return pg_catalog.jsonb_build_object(
 'status','ORIGINAL_178_PRECLAIM_WORKER_RETRY_PINNED',
 'queue_id',r.id,'original_queue_id',r.original_queue_id,
 'original_work_id',r.original_work_id,'prior_worker_claim_preserved',true,
 'installation_authorized',false,'job_completed',false,
 'production_changed',false,'new_worker_sha',p_replacement_dispatch_sha);
end $function$;
revoke all on function public.reality_rebind_original_178_unclaimed_dispatch_v1(uuid,text,text,bigint)
 from public,anon,authenticated;
grant execute on function public.reality_rebind_original_178_unclaimed_dispatch_v1(uuid,text,text,bigint)
 to service_role;
