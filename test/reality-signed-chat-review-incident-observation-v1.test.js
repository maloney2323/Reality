import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {investigateOneSignedShiftContinuityIncident,parseContinuityModelInvestigation,continuityTextContract}
 from '../src/reality-shift-continuity-auto-investigation-v1.js';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/20261122014628_signed_chat_review_incident_observation_v1.sql');
const worker=read('../api/reality/governed-employee-shift-worker.js');
const id=i=>'11111111-2222-4333-8444-'+String(i).padStart(12,'0');
const hash=c=>'sha256:'+c.repeat(64);
const flags={execution_authorized:false,installation_authorized:false,production_changed:false};
const evidence={schema:'reality-signed-chat-review-incident-source-v1',
 original_work_id:'work:'+'a'.repeat(32),original_source_shift_id:id(1),
 trigger_id:id(2),source_claim_id:id(3),candidate_sha256:hash('a'),
 failure_receipt_sha256:hash('b'),failure_history:[
  {retry_count:1,failure_code:'EXPIRED_PROVIDER_REVIEW_WITHOUT_VERDICT'},
  {retry_count:2,failure_code:'EXPIRED_PROVIDER_REVIEW_WITHOUT_VERDICT'}],
 investigation_only:true,root_cause_verified:false,original_job_completed:false,
 installation_authorized:false,production_changed:false};
const claim={status:'SIGNED_SHIFT_CONTINUITY_INVESTIGATION_CLAIMED',
 owner_id:id(4),shift_id:id(5),incident_id:id(6),lease_id:id(7),
 kind:'SIGNED_CHAT_RECOVERY_REVIEW_STALLED',source_claim_id:id(3),
 evidence_sha256:hash('c'),source_evidence:evidence,
 scope:'SOURCE_BACKED_SHIFT_FAILURE_INVESTIGATION_ONLY',
 model_inquiry_authorized:true,new_original_jobs_created:0,
 error_summary:'Independent review failed twice for the same candidate.',
 ...flags};
const db={project:'isolated-preview-fixture',strictSecrets:true,secretKey:'fixture-only'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project,
 OPENAI_API_KEY:'fixture-not-a-real-provider-key',REALITY_OPENAI_MODEL:'gpt-4.1-mini'};
const roles=[{function_id:'diagnose_failure',employee_name:'Diagnostician',
 role:'Engineer',responsibilities:'Investigate worker source failure'},
 {function_id:'independent_test',employee_name:'Reviewer',role:'Reviewer',
 responsibilities:'Independently reproduce and test the exact failure'}];
const plan={employee_function_id:roles[0].function_id,reviewer_function_id:roles[1].function_id,
 diagnosis:'Two exact reviews expired without a verdict; the provider and claim contract require independent readback.',
 proposed_upgrade:'Investigate the existing reviewer response and error receipt boundary without expanding authority.',
 independent_test_requirement:'Independently reproduce the failure on the same frozen contract, then verify a durable verdict.',
 limitations:'The root cause and proposed repair remain unverified.',
 blocker_class:'CONTINUITY_HANDOFF_DEFECT',next_governed_action:'INVESTIGATE_EXISTING_HANDOFF',
 resume_acceptance_condition:'Same original and candidate obtain an independently recorded review verdict.'};
const response={status:'completed',id:'resp_fixture_review',output:[{
 type:'message',content:[{type:'output_text',text:JSON.stringify(plan)}]}]};
test('observer uses exact durable source and preserves historical shift identity without admitting work',()=>{
 for(const text of [
  "g.owner_id=sh.owner_id","g.phase='SIGNED_CHAT_RECOVERY_TARGET_REVIEW_UNVERIFIED'",
  "g.qualification_receipt->>'target_review_retry_count'='2'",
  "g.quarantine_receipt_sha256 is null","g.qualification_receipt->>'target_review_receipt_sha256' is null",
  "target_review_failure_receipt_sha256","extensions.digest",
  "w.development->>'original_work_id'=g.original_work_id",
  "'original_source_shift_id',q.source_shift_id","'failure_history',q.qualification_receipt",
  "r.finished_at is not null","'investigation_only',true",
  "g.claim_id=owner_shift_continuity_incidents_v1.source_claim_id",
  "'source_evidence',i.source_evidence","on conflict(owner_id,shift_id,kind,evidence_key) do nothing",
  "revoke all on function public.reality_observe_signed_chat_review_incident_v1(uuid,uuid) from public,anon,authenticated",
  "grant execute on function public.reality_observe_signed_chat_review_incident_v1(uuid,uuid) to service_role"
 ])assert.ok(sql.includes(text),text);
 assert.doesNotMatch(sql,/update reality_internal\.genuine_capability_queue_v1|insert into reality_internal\.governed_employee_original_claims_v1|security definer|installation_authorized',true/i);
 assert.ok(worker.indexOf("'reality_observe_signed_chat_review_incident_v1'")<
  worker.indexOf("await investigateOneSignedShiftContinuityIncident("));
 assert.match(worker,/signed_chat_review_incident_observation:signedChatReviewIncidentObservation/);
});
test('actual investigator accepts exact observed incident and passes same original evidence to model',async()=>{
 const calls=[];
 const result=await investigateOneSignedShiftContinuityIncident({db,env,shiftId:claim.shift_id,
  rolesBuilder:()=>({roles}),call:async(_db,method,args)=>{
   calls.push(method);
   if(method==='reality_claim_next_shift_continuity_investigation_v1')return claim;
   assert.equal(method,'reality_record_shift_continuity_investigation_v1');
   assert.equal(args.p_incident_id,claim.incident_id);
   assert.equal(args.p_evidence_sha256,claim.evidence_sha256);
   assert.match(args.p_proposed_upgrade,/INVESTIGATE_EXISTING_HANDOFF/);
   return {status:'SHIFT_CONTINUITY_INVESTIGATION_RECORDED',owner_id:claim.owner_id,
    shift_id:claim.shift_id,incident_id:claim.incident_id,
    assigned_employee:roles[0].employee_name,independent_reviewer:roles[1].employee_name,
    investigation_receipt_sha256:hash('d'),independent_repair_verified:false,
    new_original_jobs_created:0,...flags};
  },
  invokeModel:async(payload)=>{
   const input=JSON.parse(payload.input[1].content[0].text);
   assert.deepEqual(input.source_evidence,evidence);
   assert.notEqual(input.owner_shift_id,evidence.original_source_shift_id);
   assert.equal(input.code_changes_not_authorized_by_this_claim,true);
   assert.match(payload.input[0].content[0].text,/investigation scope only/);
   return response;
  }});
 assert.equal(result.status,'SHIFT_CONTINUITY_INVESTIGATION_RECORDED');
 assert.equal(result.blocker_class,'CONTINUITY_HANDOFF_DEFECT');
 assert.equal(result.next_action,'INVESTIGATE_EXISTING_HANDOFF');
 assert.equal(result.original_work_resumed,false);
 assert.equal(result.installation_authorized,false);
 assert.deepEqual(calls,['reality_claim_next_shift_continuity_investigation_v1',
  'reality_record_shift_continuity_investigation_v1']);
});
test('invalid or authority-expanding incident cannot reach model',async()=>{
 for(const patch of [
  {source_claim_id:id(99)}, {failure_history:[]}, {root_cause_verified:true},
  {installation_authorized:true},{candidate_sha256:'unverified'}
 ]){
  let invoked=false;
  await assert.rejects(investigateOneSignedShiftContinuityIncident({db,env,
   shiftId:claim.shift_id,rolesBuilder:()=>({roles}),
   call:async()=>({...claim,source_evidence:{...evidence,...patch}}),
   invokeModel:async()=>{invoked=true;return response;}
  }),/SOURCE_BOUND_INCIDENT_LEASE_UNVERIFIED/);
  assert.equal(invoked,false);
 }
});
test('existing signed RPC transport allows only the observed-incident method',async()=>{
 const args={p_shift_id:claim.shift_id,p_worker_run_id:id(8)};
 let called=0;
 await shiftRpc({...db,url:'https://fixture.supabase.co'},
  'reality_observe_signed_chat_review_incident_v1',args,{fetchImpl:async(url,options)=>{
   called++;assert.ok(url.endsWith('/rpc/reality_observe_signed_chat_review_incident_v1'));
   assert.deepEqual(JSON.parse(options.body),args);return {ok:true,json:async()=>({status:'FIXTURE'})};
  }});
 assert.equal(called,1);
});

const responseFor=p=>({...response,output:[{type:'message',content:[
 {type:'output_text',text:JSON.stringify(p)}]}]});
test('all text violations are reported as metadata only; no raw rejected text escapes',()=>{
 const rejected={...plan,diagnosis:'short',limitations:' private ',resume_acceptance_condition:'x'.repeat(301)};
 assert.throws(()=>parseContinuityModelInvestigation(responseFor(rejected),roles,{guidedRecovery:true}),e=>{
  assert.equal(e.message,'SHIFT_CONTINUITY_DIAGNOSIS_AND_TEST_SPEC_UNVERIFIED');
  assert.deepEqual(e.validationEvidence.violations,[
   {field:'diagnosis',min:30,max:1500,length:5,reason:'BELOW_MIN'},
   {field:'limitations',min:20,max:1200,length:9,reason:'OUTER_WHITESPACE'},
   {field:'resume_acceptance_condition',min:30,max:300,length:301,reason:'ABOVE_MAX'}]);
  assert.doesNotMatch(JSON.stringify(e.validationEvidence),/private|short|xxx/);return true;
 });
 assert.equal(parseContinuityModelInvestigation(response,roles,{guidedRecovery:true}).model_response_id,response.id);
});
test('failed investigation sends exact lease-bound evidence; next attempt receives same field contract',async()=>{
 const methods=[];
 const rejected=await investigateOneSignedShiftContinuityIncident({db,env,shiftId:claim.shift_id,
  rolesBuilder:()=>({roles}),call:async(_db,method,args)=>{
   methods.push(method);
   if(method==='reality_claim_next_shift_continuity_investigation_v1')return claim;
   assert.equal(method,'reality_block_shift_continuity_investigation_evidenced_v1');
   assert.equal(args.p_lease_id,claim.lease_id);assert.equal(args.p_incident_id,claim.incident_id);
   assert.deepEqual(args.p_validation_evidence.violations,[{field:'resume_acceptance_condition',min:30,max:300,length:301,reason:'ABOVE_MAX'}]);
   return {status:'CONTINUITY_INVESTIGATION_BLOCKED_NEEDS_PROOF',validation_evidence_recorded:true,
    automatic_reinvestigation_eligible:true};
  },invokeModel:async()=>responseFor({...plan,resume_acceptance_condition:'x'.repeat(301)})});
 assert.equal(rejected.failure_receipt_recorded,true);
 assert.equal(rejected.execution_authorized,false);
 assert.deepEqual(methods,['reality_claim_next_shift_continuity_investigation_v1','reality_block_shift_continuity_investigation_evidenced_v1']);
 const history=[{attempt:1,failure_reason:rejected.failure_reason,validation_evidence:rejected.validation_evidence}];
 let nextPayload;
 const retry=await investigateOneSignedShiftContinuityIncident({db,env,shiftId:claim.shift_id,
  rolesBuilder:()=>({roles}),call:async(_db,method,args)=>{
   if(method==='reality_claim_next_shift_continuity_investigation_v1')return {...claim,investigation_attempt:2,failure_history:history,previous_failure_reason:rejected.failure_reason};
   assert.equal(method,'reality_record_shift_continuity_investigation_v1');
   return {status:'SHIFT_CONTINUITY_INVESTIGATION_RECORDED',owner_id:claim.owner_id,
    shift_id:claim.shift_id,incident_id:claim.incident_id,assigned_employee:roles[0].employee_name,
    independent_reviewer:roles[1].employee_name,investigation_receipt_sha256:hash('d'),
    independent_repair_verified:false,new_original_jobs_created:0,...flags};
  },invokeModel:async payload=>{nextPayload=JSON.parse(payload.input[1].content[0].text);return response;}});
 assert.deepEqual(nextPayload.prior_failure_history,history);
 assert.deepEqual(nextPayload.text_contract.map(({field,min,max})=>({field,min,max})),continuityTextContract(true));
 assert.equal(nextPayload.text_contract.find(x=>x.field==='resume_acceptance_condition').preferred_max,280);
 assert.equal(retry.status,'SHIFT_CONTINUITY_INVESTIGATION_RECORDED');
 assert.equal(retry.original_work_resumed,false);
});
test('evidenced RPC is allowlisted and migration uses existing exact lease and retry ceiling',async()=>{
 const method='reality_block_shift_continuity_investigation_evidenced_v1';
 const migration=read('../supabase/migrations/20261122020400_continuity_investigation_validation_evidence_v1.sql');
 assert.match(migration,/investigation_lease_id=p_lease_id/);
 assert.match(migration,/public\.reality_block_shift_continuity_investigation_v1\(p_owner_id,p_incident_id,p_lease_id,p_reason\)/);
 assert.match(migration,/validation_evidence.*?recorded/s);
 assert.doesNotMatch(migration,/security definer|installation_authorized',true/i);
 await shiftRpc({...db,url:'https://fixture.supabase.co'},method,{},{
  fetchImpl:async url=>{assert.ok(url.endsWith('/rpc/'+method));return {ok:true,json:async()=>({status:'FIXTURE'})};}});
});
