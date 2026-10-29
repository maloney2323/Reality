alter table reality_internal.governed_build_queue_v1
 add column if not exists dispatch_commit_sha text,
 add column if not exists dispatch_request_path text,
 add column if not exists dispatched_at timestamptz;
alter table reality_internal.governed_build_queue_v1
 drop constraint if exists governed_build_dispatch_sha_valid;
alter table reality_internal.governed_build_queue_v1
 add constraint governed_build_dispatch_sha_valid
 check(dispatch_commit_sha is null or dispatch_commit_sha ~ '^[a-f0-9]{40}$');

create or replace function public.reality_mark_governed_build_dispatched_v1(
 p_owner_id uuid,p_conversation_id uuid,p_queue_id uuid,
 p_commit_sha text,p_request_path text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare row record;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role'
 then raise exception 'GOVERNED_BUILD_SERVICE_ROLE_REQUIRED'; end if;
 if p_commit_sha !~ '^[a-f0-9]{40}$' or
  p_request_path is distinct from 'reality-requests/'||p_queue_id::text||'.json'
 then raise exception 'GOVERNED_BUILD_DISPATCH_SOURCE_INVALID'; end if;
 select * into row from reality_internal.governed_build_queue_v1
 where id=p_queue_id and owner_id=p_owner_id and conversation_id=p_conversation_id
 for update;
 if not found or row.phase<>'QUEUED_DISCOVERY'
 then raise exception 'GOVERNED_BUILD_DISPATCH_OWNER_QUEUE_NOT_FOUND'; end if;
 if row.dispatch_commit_sha is not null and row.dispatch_request_path<>p_request_path
 then raise exception 'GOVERNED_BUILD_DISPATCH_ALREADY_COMMITTED'; end if;
 if row.dispatch_commit_sha is null then
  update reality_internal.governed_build_queue_v1
  set dispatch_commit_sha=p_commit_sha,dispatch_request_path=p_request_path,
  dispatched_at=pg_catalog.now(),updated_at=pg_catalog.now()
  where id=p_queue_id;
 end if;
 return pg_catalog.jsonb_build_object('queue_id',row.id,'dispatched',true,
  'dispatch_commit_sha',coalesce(row.dispatch_commit_sha,p_commit_sha),
  'request_path',p_request_path,'job_completed',false,
  'installation_authorized',false);
end $$;
revoke all on function public.reality_mark_governed_build_dispatched_v1(uuid,uuid,uuid,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_mark_governed_build_dispatched_v1(uuid,uuid,uuid,text,text)
 to service_role;

create or replace function public.reality_read_governed_build_v1(
 p_owner_id uuid,p_conversation_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare row record;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role'
 then raise exception 'GOVERNED_BUILD_SERVICE_ROLE_REQUIRED'; end if;
 select * into row from reality_internal.governed_build_queue_v1
 where owner_id=p_owner_id and conversation_id=p_conversation_id
 order by queued_at desc limit 1;
 if not found then return '{}'::jsonb; end if;
 return pg_catalog.jsonb_build_object('queue_id',row.id,'phase',row.phase,
 'goal_id',row.goal_id,'original_work_id',row.original_work_id,
 'preview_release_sha',row.preview_release_sha,'queued_at',row.queued_at,
 'updated_at',row.updated_at,'dispatch_commit_sha',row.dispatch_commit_sha,
 'dispatched_at',row.dispatched_at,'request_path',row.dispatch_request_path,
 'report',row.report,'installation_authorized',false,
 'job_completed',false);
end $$;
revoke all on function public.reality_read_governed_build_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_governed_build_v1(uuid,uuid)
 to service_role;
