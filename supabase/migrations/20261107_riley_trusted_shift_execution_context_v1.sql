-- PREVIEW ONLY, service-role owner/source context needed to load the REAL
-- authorized original before consuming a globally unique execution claim.
-- No job/goal/shift/approval creation. No production work and no replay.
create or replace function public.reality_read_shift_original_execution_context_v1(
 p_shift_id uuid,p_original_work_id text,p_trigger_id uuid
) returns jsonb language plpgsql security invoker set search_path=pg_catalog as $fn$
declare v record;v_n integer;v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' then
  raise exception 'SHIFT_ORIGINAL_CONTEXT_SERVICE_ONLY';end if;
 if p_shift_id is null or p_trigger_id is null or
    p_original_work_id !~ '^work:[a-f0-9]{32}$' then
  return jsonb_build_object('status','SHIFT_ORIGINAL_CONTEXT_NOT_ELIGIBLE',
   'original_work_id',null,'installation_authorized',false,
   'production_changed',false);
 end if;
 -- Before any claim: current shift, checked exact source digest, existing
 -- Universe event, owner goal publication epoch, existing capability queue
 -- and no prior durable provider-effect claim or final independent receipt.
 select s.shift_id,s.owner_id,q.conversation_id,q.original_work_id,
    q.trigger_id,q.goal_id,q.original_work_event_id,
    e.provenance->>'conversation_id' as source_conversation_id,
    e.payload->>'original_goal_id' as source_goal_id,
    e.payload->>'issue_number' as source_issue_number,
    t.source_ref,t.proof_sha256,t.step_index into v
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_shift_steps_v1 t
  on t.shift_id=s.shift_id and t.step_index between 2 and 5
  and t.state='SOURCE_CHECKED' and t.source_status='OPEN_ISSUE'
  and t.source_ref~'^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$'
  and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
  and t.proof->>'source_url'=t.source_ref
  and t.proof->>'provider_status'='OPEN_ISSUE'
  and t.proof->>'provider_checked'='true'
  and t.proof->>'read_only'='true'
  and t.proof->>'production_changed'='false'
  and t.proof_sha256='sha256:'||encode(
   sha256(convert_to(t.proof::text,'UTF8')),'hex')
 join public.universe_events e
  on e.entity_type='reality_original_source_backed_repair_work'
  and e.event_kind='OBSERVATION' and e.epistemic_status='VERIFIED'
  and e.payload->>'owner_id'=s.owner_id::text
  and e.provenance->>'principal_id'=s.owner_id::text
  and e.payload->>'owner_authorized_investigation'='true'
  and e.payload->>'owner_authorized_installation'='false'
  and e.payload->>'original_job_completed'='false'
  and e.payload->>'production_changed'='false'
  and e.payload->>'issue_number'=split_part(t.source_ref,'/issues/',2)
 join reality_internal.genuine_capability_queue_v1 q
  on q.original_work_event_id=e.event_id and q.owner_id=s.owner_id
  and q.original_work_id=e.payload->>'original_work_id'
  and q.conversation_id::text=e.provenance->>'conversation_id'
  and q.goal_id::text=e.payload->>'original_goal_id'
 join reality_internal.goal_publication_epochs epoch
  on epoch.user_id=q.owner_id and epoch.conversation_id=q.conversation_id
  and epoch.last_transition_event_id=q.goal_transition_event_id
 where s.shift_id=p_shift_id
  and s.status='AWAITING_EXACT_ORIGINAL_WORK'
  and s.planned_start_at<=v_now and s.planned_end_at>v_now
  and s.closed_at is null
  and t.step_index between 2 and 5
  and q.original_work_id=p_original_work_id and q.trigger_id=p_trigger_id
  and q.phase in ('PENDING_FROZEN_REPRODUCTION',
   'EVIDENCE_RECONCILIATION_REQUIRED','FROZEN_REPRODUCED_AWAITING_CANDIDATE')
  and q.claim_id is null
  and not exists(select 1 from reality_internal.governed_employee_original_claims_v1 c
   where c.original_work_id=q.original_work_id)
  and not exists(select 1 from reality_internal.genuine_independent_final_receipts_v1 r
   where r.original_work_id=q.original_work_id and r.owner_id=q.owner_id)
  and not exists(select 1 from public.universe_events settled
   where settled.epistemic_status='VERIFIED'
    and settled.payload->>'owner_id'=q.owner_id::text
    and settled.payload->>'original_work_id'=q.original_work_id
    and (settled.payload->>'constitutional_phase'='SETTLED'
     or settled.payload->>'original_job_completed'='true'))
 limit 2;
 if not found or v.owner_id is null or
    v.source_conversation_id is distinct from v.conversation_id::text or
    v.source_goal_id is distinct from v.goal_id::text or
    v.source_issue_number is distinct from split_part(v.source_ref,'/issues/',2)
 then return jsonb_build_object('status','SHIFT_ORIGINAL_CONTEXT_NOT_ELIGIBLE',
   'installation_authorized',false,'production_changed',false);
 end if;
 -- The queue/source/owner was checked above; also require wake's existing
 -- current verified goal and exactly pinned source proof.
 if (select g->>'status' from (
  select public.reality_read_shift_capability_wake_v1(
   p_shift_id,p_original_work_id,p_trigger_id) as g) x) <>
  'EXACT_SHIFT_CAPABILITY_WAKE_ELIGIBLE' then
  return jsonb_build_object('status','SHIFT_ORIGINAL_CONTEXT_NOT_ELIGIBLE',
   'installation_authorized',false,'production_changed',false);
 end if;
 return jsonb_build_object(
  'status','SHIFT_ORIGINAL_TRUSTED_CONTEXT_READY',
  'shift_id',v.shift_id,'owner_id',v.owner_id,
  'conversation_id',v.conversation_id,'goal_id',v.goal_id,
  'original_work_id',v.original_work_id,'trigger_id',v.trigger_id,
  'original_work_event_id',v.original_work_event_id,
  'source_ref',v.source_ref,
  'source_proof_sha256',v.proof_sha256,
  'source_step_index',v.step_index,
  'owner_scope_verified',true,'source_checked',true,
  'original_job_settled',false,'execution_claim_consumed',false,
  'installation_authorized',false,'production_changed',false
 );
end $fn$;
revoke all on function public.reality_read_shift_original_execution_context_v1(uuid,text,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_shift_original_execution_context_v1(uuid,text,uuid)
 to service_role;
