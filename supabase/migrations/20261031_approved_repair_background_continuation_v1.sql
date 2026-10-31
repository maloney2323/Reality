-- Isolated preview continuation: no cron/model can originate installation
-- consent. Only an already atomically CLAIMED owner approval is eligible.
create table if not exists reality_internal.approved_repair_continuations_v1 (
  reservation_id uuid primary key,
  owner_id uuid not null,conversation_id uuid not null,
  original_work_id text not null check (original_work_id ~ '^work:[a-f0-9]{32}$'),
  issue_number integer not null check(issue_number between 1 and 100000),
  candidate_hash text not null check(candidate_hash ~ '^[a-f0-9]{64}$'),
  install_branch text not null check(install_branch ~ '^feature/reality-[a-z0-9][a-z0-9/-]{5,105}$'),
  status text not null default 'PENDING' check (status in ('PENDING','LEASED','SETTLED','BLOCKED')),
  lease_id uuid,lease_until timestamptz,
  attempts integer not null default 0 check(attempts between 0 and 24),
  last_observation text,created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table reality_internal.approved_repair_continuations_v1 enable row level security;
revoke all on reality_internal.approved_repair_continuations_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.approved_repair_continuations_v1 to service_role;

create or replace function public.reality_enqueue_approved_repair_continuation_v1(
 p_owner_id uuid,p_conversation_id uuid,p_original_work_id text,
 p_reservation_id uuid,p_candidate_hash text,p_install_branch text,
 p_issue_number integer)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare a reality_internal.general_repair_owner_approvals_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 j reality_internal.approved_repair_continuations_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'APPROVED_CONTINUATION_SERVICE_ROLE_REQUIRED';end if;
 if p_owner_id is null or p_reservation_id is null or p_conversation_id is null
  or p_original_work_id !~ '^work:[a-f0-9]{32}$'
  or p_candidate_hash !~ '^[a-f0-9]{64}$'
  or p_install_branch !~ '^feature/reality-[a-z0-9][a-z0-9/-]{5,105}$'
  or p_install_branch like '%..%'
  or p_issue_number not between 1 and 100000
 then raise exception 'APPROVED_CONTINUATION_EXACT_SCOPE_REQUIRED'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs where
  user_id=p_owner_id and conversation_id=p_conversation_id for update;
 select * into a from reality_internal.general_repair_owner_approvals_v1 where
  reservation_id=p_reservation_id and owner_id=p_owner_id
  and conversation_id=p_conversation_id and original_work_id=p_original_work_id
  and candidate_hash=p_candidate_hash for update;
 if a.reservation_id is null or a.status not in ('CLAIMED','INSTALLED','SETTLED')
  or a.claimed_at is null or e.user_id is null
  or e.last_transition_event_id is distinct from a.goal_transition_event_id
  or a.review_commit_sha !~ '^[a-f0-9]{40}$'
  or (a.install_branch is not null and a.install_branch<>p_install_branch)
 then raise exception 'APPROVED_CONTINUATION_ATOMIC_OWNER_CLAIM_REQUIRED'; end if;
 if not exists(select 1 from public.universe_events x
  where x.event_id=a.original_work_event_id
   and x.payload->>'owner_id'=p_owner_id::text
   and x.payload->>'original_work_id'=p_original_work_id
   and x.payload->>'issue_number'=p_issue_number::text
   and x.entity_type='reality_original_source_backed_repair_work'
   and x.epistemic_status='VERIFIED')
 then raise exception 'APPROVED_CONTINUATION_ORIGINAL_EVIDENCE_MISSING'; end if;
 insert into reality_internal.approved_repair_continuations_v1
 (reservation_id,owner_id,conversation_id,original_work_id,issue_number,candidate_hash,install_branch)
 values (p_reservation_id,p_owner_id,p_conversation_id,p_original_work_id,p_issue_number,p_candidate_hash,p_install_branch)
 on conflict(reservation_id) do nothing;
 select * into j from reality_internal.approved_repair_continuations_v1 where reservation_id=p_reservation_id;
 if j.owner_id<>p_owner_id or j.original_work_id<>p_original_work_id
  or j.install_branch<>p_install_branch or j.candidate_hash<>p_candidate_hash
  or j.issue_number<>p_issue_number then
  raise exception 'APPROVED_CONTINUATION_IDEMPOTENT_SCOPE_CHANGED'; end if;
 return pg_catalog.jsonb_build_object('queued',true,'reservation_id',j.reservation_id,
  'status',j.status,'original_work_id',j.original_work_id,'installation_authorized',true,
  'original_job_completed',j.status='SETTLED','production_changed',false);
end $$;

create or replace function public.reality_lease_approved_repair_continuation_v1(
 p_install_branch text)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare j reality_internal.approved_repair_continuations_v1%rowtype;
 a reality_internal.general_repair_owner_approvals_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
begin
 if current_user<>'service_role' then raise exception 'APPROVED_CONTINUATION_SERVICE_ROLE_REQUIRED';end if;
 if p_install_branch !~ '^feature/reality-[a-z0-9][a-z0-9/-]{5,105}$'
  or p_install_branch like '%..%' then
  raise exception 'APPROVED_CONTINUATION_WORKER_BRANCH_INVALID';end if;
 select * into j from reality_internal.approved_repair_continuations_v1 r
 where r.install_branch=p_install_branch and r.status in ('PENDING','LEASED')
  and (r.lease_until is null or r.lease_until<now()) and r.attempts<24
 order by r.created_at asc for update skip locked limit 1;
 if j.reservation_id is null then
  return pg_catalog.jsonb_build_object('status','NO_APPROVED_WORK');end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||j.owner_id::text||':'||j.conversation_id::text,0));
 select * into a from reality_internal.general_repair_owner_approvals_v1
  where reservation_id=j.reservation_id for update;
 select * into e from reality_internal.goal_publication_epochs where
  user_id=j.owner_id and conversation_id=j.conversation_id for update;
 if a.reservation_id is null or a.owner_id<>j.owner_id or
  a.conversation_id<>j.conversation_id or a.original_work_id<>j.original_work_id or
  a.candidate_hash<>j.candidate_hash or a.status not in ('CLAIMED','INSTALLED','SETTLED')
  or a.claimed_at is null or e.last_transition_event_id is distinct from a.goal_transition_event_id
 then
  update reality_internal.approved_repair_continuations_v1 set status='BLOCKED',
   last_observation='OWNER_AUTHORITY_OR_GOAL_CHANGED',updated_at=now()
  where reservation_id=j.reservation_id;
  return pg_catalog.jsonb_build_object('status','AUTHORITY_RECONCILIATION_REQUIRED');
 end if;
 update reality_internal.approved_repair_continuations_v1
  set status='LEASED',lease_id=gen_random_uuid(),lease_until=now()+interval '8 minutes',
   attempts=attempts+1,updated_at=now()
 where reservation_id=j.reservation_id returning * into j;
 return pg_catalog.jsonb_build_object('status','EXACT_OWNER_APPROVED_WORK_LEASED',
  'reservation_id',j.reservation_id,'lease_id',j.lease_id,
  'owner_id',j.owner_id,'conversation_id',j.conversation_id,
  'original_work_id',j.original_work_id,'issue_number',j.issue_number,
  'candidate_hash',j.candidate_hash,'install_branch',j.install_branch,
  'attempts',j.attempts,'production_changed',false);
end $$;

create or replace function public.reality_reconcile_approved_repair_continuation_v1(
 p_reservation_id uuid,p_lease_id uuid,p_status text,p_observation text)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare j reality_internal.approved_repair_continuations_v1%rowtype;
 a reality_internal.general_repair_owner_approvals_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'APPROVED_CONTINUATION_SERVICE_ROLE_REQUIRED';end if;
 if p_status not in ('PENDING','SETTLED','BLOCKED') or
    length(coalesce(p_observation,'')) not between 5 and 180 or
    p_observation !~ '^[A-Z0-9_]+$'
 then raise exception 'APPROVED_CONTINUATION_RESULT_INVALID'; end if;
 select * into j from reality_internal.approved_repair_continuations_v1
  where reservation_id=p_reservation_id for update;
 if j.reservation_id is null or j.lease_id is distinct from p_lease_id
  or j.status<>'LEASED' then raise exception 'APPROVED_CONTINUATION_LEASE_MISMATCH';end if;
 select * into a from reality_internal.general_repair_owner_approvals_v1
  where reservation_id=p_reservation_id for update;
 if p_status='SETTLED' and (a.status<>'SETTLED' or a.settled_at is null
   or a.original_work_id<>j.original_work_id) then
  raise exception 'APPROVED_CONTINUATION_INDEPENDENT_SETTLEMENT_MISSING';end if;
 update reality_internal.approved_repair_continuations_v1 set
  status=p_status,lease_id=null,lease_until=null,
  last_observation=p_observation,updated_at=now()
 where reservation_id=p_reservation_id;
 return pg_catalog.jsonb_build_object('status',p_status,
   'reservation_id',p_reservation_id,'original_work_id',j.original_work_id,
   'original_job_completed',p_status='SETTLED','production_changed',false);
end $$;
revoke all on function public.reality_enqueue_approved_repair_continuation_v1(uuid,uuid,text,uuid,text,text,integer) from public,anon,authenticated;
revoke all on function public.reality_lease_approved_repair_continuation_v1(text) from public,anon,authenticated;
revoke all on function public.reality_reconcile_approved_repair_continuation_v1(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reality_enqueue_approved_repair_continuation_v1(uuid,uuid,text,uuid,text,text,integer) to service_role;
grant execute on function public.reality_lease_approved_repair_continuation_v1(text) to service_role;
grant execute on function public.reality_reconcile_approved_repair_continuation_v1(uuid,uuid,text,text) to service_role;
