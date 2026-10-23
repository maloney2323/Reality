// Runs ONLY inside an ephemeral GitHub Actions PostgreSQL service.
// Generates synthetic JS Universe entries and matching SQL fixtures.
// No network, no customer data, no provider tokens or model requests.
import {writeFileSync} from 'node:fs';
import {createUniverseEntry} from '../../src/reality-universe-persistence-contract-v1.0.js';
const owner='e83340ec-4266-4c95-a6cd-929bc58b445e';
const root='continuity:'+'a'.repeat(32),world='reality:primary',tid='synthetic-interrupted';
const claim='6617c2a8-5ed7-40ff-bde7-6c0d13726844';
const timestamp=new Date().toISOString();
const q=v=>JSON.stringify(v).replaceAll("'","''");
const literal=x=>"'"+q(x)+"'";
const entry=(id,kind,payload,evidence_references=[],source='SYNTHETIC_TEST')=>
 createUniverseEntry({entry_id:id,continuity_root_id:root,worldline_id:world,
 event_kind:kind,epistemic_kind:'OBSERVATION',
 assertion_time:timestamp,effective_time:timestamp,
 source_ref:'synthetic:ephemeral:sql-test',payload,evidence_references,
 provenance:{source,authenticated_user_id:owner,authority_granted:false}});
const user=entry('synthetic-user','AUTHENTICATED_CONVERSATION_MESSAGE',
 {role:'user',turn_id:tid,principal_id:owner,
  text:'Approval required before sending $12,500 estimate.'});
const processing=entry('synthetic-processing','REALITY_CAUSAL_TURN_RECEIPT',
 {phase:'PROCESSING',turn_id:tid,authenticated_user_id:owner,
  user_message_hash:user.ledger_entry_hash});
const interrupted=entry('synthetic-interrupted-receipt','REALITY_CAUSAL_TURN_RECEIPT',
 {phase:'INTERRUPTED',turn_id:tid,authenticated_user_id:owner});
const approval=entry('synthetic-approved','REALITY_TURN_ABANDONMENT_APPROVAL',
 {owner_user_id:owner,turn_id:tid,claim_sequence_num:1,
 approval_intent:'EXPLICIT_OWNER_ABANDON_INCOMPLETE',
 acknowledges_uncertain_model_execution:true,acknowledges_possible_model_billing:true,
 user_message_hash:user.ledger_entry_hash,
 interruption_receipt_hash:interrupted.ledger_entry_hash},
 [user.entry_id,interrupted.entry_id],'REALITY_STANDALONE_OWNER_AUTHORIZED');
const resolution=entry('synthetic-resolution','REALITY_TURN_RESOLUTION_RECEIPT',
 {owner_user_id:owner,turn_id:tid,claim_sequence_num:1,
 prior_commit_entry_id:null,prior_commit_hash:null,
 resolution_status:'ABANDONED',model_call_outcome:'UNKNOWN',
 external_action_outcome:'NOT_ESTABLISHED',
 approval_receipt_id:approval.entry_id,approval_receipt_hash:approval.ledger_entry_hash,
 user_message_hash:user.ledger_entry_hash,
 processing_receipt_hash:processing.ledger_entry_hash,
 interruption_receipt_hash:interrupted.ledger_entry_hash},
 [user.entry_id,processing.entry_id,interrupted.entry_id,approval.entry_id],
 'REALITY_STANDALONE_VERIFIED_RESOLUTION');
const assistant=entry('synthetic-late-assistant','AUTHENTICATED_CONVERSATION_MESSAGE',
 {role:'assistant',turn_id:tid,principal_id:owner,text:'Late reply must be blocked'});
const sourceEntries=[user,processing,interrupted];
function insert(e){return `insert into public.reality_universe_entries
(entry_id,continuity_root_id,worldline_id,event_kind,epistemic_kind,
 assertion_time,effective_time,source_ref,payload,evidence_references,provenance,ledger_entry_hash)
values (${[e.entry_id,e.continuity_root_id,e.worldline_id,e.event_kind,
 e.epistemic_kind,e.assertion_time,e.effective_time,e.source_ref].map(literal).join(',')},
 ${literal(e.payload)}::jsonb,${literal(e.evidence_references)}::jsonb,
 ${literal(e.provenance)}::jsonb,${literal(e.ledger_entry_hash)});`}
const call=`public.reality_abandon_incomplete_conversation_turn_v1(
${literal(root)},${literal(world)},${literal(owner)}::uuid,
${literal(tid)},${literal(claim)}::uuid,1,
${literal(approval)}::jsonb,${literal(resolution)}::jsonb)`;
const sql=`\\set ON_ERROR_STOP on
-- JS -> PostgreSQL SHA256 canonical fixture parity. A single mismatch fails.
do $do$ begin
 if not public.reality_verify_resolution_entry_v1(
  ${literal(approval)}::jsonb) then
  raise exception 'APPROVAL_JS_HASH_MISMATCH';
 end if;
 if not public.reality_verify_resolution_entry_v1(
  ${literal(resolution)}::jsonb) then
  raise exception 'RESOLUTION_JS_HASH_MISMATCH';
 end if;
end $do$;

insert into public.reality_conversation_turn_fences(
 root_id,worldline_id,owner_user_id,sequence_num,active_turn_id,active_claim_token)
values (${literal(root)},${literal(world)},${literal(owner)}::uuid,
 1,${literal(tid)},${literal(claim)}::uuid);
${sourceEntries.map(insert).join('\n')}
set role service_role;
do $do$
declare x jsonb;
begin
 x:=${call};
 if x->>'status' <> 'ABANDONED' or (x->>'sequence_num')::bigint<>0
 then raise exception 'ATOMIC_RESOLUTION_FAILED:%',x; end if;
 if (select count(*) from public.reality_universe_entries
     where entry_id in (${literal(approval.entry_id)},${literal(resolution.entry_id)}))<>2
 then raise exception 'IMMUTABLE_APPROVAL_OR_RESOLUTION_MISSING'; end if;
 if not exists(select 1 from public.reality_conversation_turn_fences
   where root_id=${literal(root)} and active_turn_id is null
   and active_claim_token is null and sequence_num=0
   and last_committed_entry_id is null and last_committed_entry_hash is null)
 then raise exception 'ATOMIC_SEQUENCE_NOT_RECOVERED'; end if;
end $do$;
-- Idempotent retry must not append a second receipt.
do $do$ declare x jsonb;
begin
 x:=${call};
 if x->>'status'<>'ALREADY_ABANDONED' then
  raise exception 'IDEMPOTENT_REPLAY_FAILED:%',x;end if;
end $do$;
-- Once abandoned, a delayed assistant may not be inserted.
do $do$ begin
 begin
  ${insert(assistant)}
  raise exception 'LATE_WRITE_WAS_NOT_BLOCKED';
 exception when others then
  if sqlerrm<>'REALITY_LATE_OUTPUT_FOR_ABANDONED_TURN' then raise; end if;
 end;
end $do$;
-- An anonymous user cannot call the privileged SQL RPC.
reset role;
set role anon;
do $do$ begin
 begin
  perform ${call};
  raise exception 'ANON_WAS_ALLOWED_TO_RESOLVE';
 exception when insufficient_privilege then null;
 end;
end $do$;
reset role;
do $do$ begin
 if (select count(*) from public.reality_universe_entries
    where event_kind='REALITY_TURN_RESOLUTION_RECEIPT')<>1 then
  raise exception 'DUPLICATE_ABANDONMENT_RECEIPTS';
 end if;
 if exists(select 1 from public.reality_universe_entries
    where event_kind='AUTHENTICATED_CONVERSATION_MESSAGE'
      and payload->>'role'='assistant') then
  raise exception 'LATE_OUTPUT_PUBLISHED';
 end if;
end $do$;
select 'EPHEMERAL_ATOMIC_ABANDONMENT_PASSED' as status;
`;
writeFileSync('/tmp/reality-ephemeral-fixture.sql',sql,{mode:0o600});
