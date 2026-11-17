import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectOwnerCapabilityWorkspace as project}
 from '../api/reality/personal-capabilities.js';
import {runOneStandingEmployeeDiscovery as run}
 from '../src/reality-standing-employee-discovery-v1.js';
const owner='11111111-2222-4333-8444-555555555555';
const env={
 VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated-test'
};
const db={project:'isolated-test',strictSecrets:true,secretKey:'private'};
const feed={
 status:'OWNER_GAP_INTAKE_RECONCILED',ok:true,
 owner_id:owner,read_only:true,work_started:false,
 production_changed:false,source_basis:'PERSISTED_OWNER_EVIDENCE_NO_PROVIDER_LIVE_REFRESH',
 counts:{current_candidates:2,verified_current_gaps:0,governed_active_queue:0,
  independently_tested_candidates:1},
 items:[{
  key:'research:123',kind:'RESEARCH_OPPORTUNITY',
  title:'Verify the observed connector policy gap',
  stage:'INSPECTED_NEEDS_INDEPENDENT_GAP_TEST',
  source_url:'https://docs.example.org/research',
  next_proof:'Perform isolated permission comparisons.',
  executable_job:false,installation_authorized:false,
  verified_missing_capability:false
 },{
  key:'candidate:456',kind:'INDEPENDENTLY_TESTED_CANDIDATE',
  title:'Previously tested code correction',
  source_url:'https://github.com/example/repo/issues/99',
  stage:'TESTED_AWAITING_FRESH_OWNER_WORK_BINDING',
  executable_job:false,installation_authorized:false,
  verified_missing_capability:false
 }]
};
const grant={
 status:'OWNER_STANDING_ROUTINE_DELEGATION_READ_ONLY',
 owner_scope_verified:true,owner_id:owner,read_only:true,
 scope:'EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1',
 enabled:false,currently_active:false,expires_at:null,
 max_daily_inquiries:12,today_reserved:0,
 external_actions_authorized:false,installation_authorized:false,
 shift_execution_authorized:false,production_changed:false
};
const reservation={
 status:'STANDING_OWNER_EVIDENCE_INQUIRY_RESERVED',owner_id:owner,
 owner_bound:true,scope:'EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1',
 model_inquiry_authorized:true,max_daily_inquiries:12,
 new_original_jobs_created:0,shift_execution_authorized:false,
 external_actions_authorized:false,
 installation_authorized:false,production_changed:false
};
const noEligible={
 status:'NO_ELIGIBLE_GRANTED_STANDING_INQUIRY',
 owner_bound:false,model_inquiry_authorized:false,
 new_original_jobs_created:0,installation_authorized:false,
 production_changed:false
};
function mocks({reserve=reservation,read={...grant,enabled:true,currently_active:true}}={}){
 const calls=[];
 const call=async(_db,name)=>{
  calls.push(name);
  if(name==='reality_reserve_next_standing_inquiry_v1')return reserve;
  if(name==='reality_read_owner_routine_delegation_v1')return read;
  throw Error('RPC_OUTSIDE_ROUTINE_SCOPE');
 };
 let generated=0;
 const generate=async({ownerId})=>{
  assert.equal(ownerId,owner);
  generated++;
  return {status:'EMPLOYEE_SOURCE_QUESTION_AND_INVESTIGATION_RECORDED',
   question:'Which exact source evidence supports this current issue?',
   new_original_jobs_created:0,execution_authorized:false,
   installation_authorized:false,production_changed:false};
 };
 return {call,generate,calls,get generated(){return generated}};
}
test('capability workspace shows real ledger items without inventing time, owners or executable work',()=>{
 const p=project({ownerId:owner,feed,grant});
 assert.equal(p.candidate_count,2);
 assert.equal(p.verified_current_gaps,0);
 assert.equal(p.active_capability_queue,0);
 assert.equal(p.items[0].assigned_employee,null);
 assert.equal(p.items[0].estimated_hours,null);
 assert.equal(p.items[0].execution_authorized,false);
 assert.equal(p.items[1].estimated_hours,null);
 assert.equal(p.standing_delegation.active,false);
 assert.equal(p.jobs_created_by_read,0);
});
test('capability projection fails closed for cross-owner and forged executable claims',()=>{
 assert.throws(()=>project({ownerId:owner,feed:{...feed,owner_id:'00000000-0000-4000-8000-000000000000'},grant}),
  /CAPABILITIES_OWNER_SOURCE_OR_DELEGATION_NOT_VERIFIED/);
 assert.throws(()=>project({ownerId:owner,feed:{...feed,items:[
  {...feed.items[0],executable_job:true},feed.items[1]
 ]},grant}),/CAPABILITY_UNVERIFIED_OR_DUPLICATE/);
 assert.throws(()=>project({ownerId:owner,feed,grant:{
  ...grant,external_actions_authorized:true
 }}),/CAPABILITIES_OWNER_SOURCE_OR_DELEGATION_NOT_VERIFIED/);
});
test('no owner standing grant never calls a model, claims a job, or creates a shift',async()=>{
 const m=mocks({reserve:noEligible});
 const result=await run({db,env,call:m.call,generate:m.generate});
 assert.equal(result.status,'NO_ELIGIBLE_GRANTED_STANDING_INQUIRY');
 assert.equal(m.generated,0);
 assert.deepEqual(m.calls,['reality_reserve_next_standing_inquiry_v1']);
 assert.equal(result.new_original_jobs_created,0);
 assert.equal(result.production_changed,false);
});
test('valid signed grant executes one evidence-only inquiry, no external authorization',async()=>{
 const m=mocks();
 const result=await run({db,env,call:m.call,generate:m.generate});
 assert.equal(m.generated,1);
 assert.equal(result.standing_grant_verified,true);
 assert.equal(result.question,'Which exact source evidence supports this current issue?');
 assert.equal(result.generated_executable_jobs,0);
 assert.equal(result.new_original_jobs_created,0);
 assert.equal(result.external_actions_authorized,false);
 assert.equal(result.shift_execution_authorized,false);
 assert.equal(result.installation_authorized,false);
 assert.deepEqual(m.calls,[
  'reality_reserve_next_standing_inquiry_v1',
  'reality_read_owner_routine_delegation_v1'
 ]);
});
test('paused or expired grant after reservation prevents the model',async()=>{
 for(const record of [{...grant,enabled:false,currently_active:false},
  {...grant,enabled:true,currently_active:false}]){
  const m=mocks({read:record});
  const result=await run({db,env,call:m.call,generate:m.generate});
  assert.equal(result.status,'STANDING_GRANT_REVOKED_OR_EXPIRED_NO_MODEL_CALL');
  assert.equal(m.generated,0);
 }
});
test('the signed worker retains normal execution gates and the new grant is never a blanket install grant',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const sql=read('supabase/migrations/20261117_standing_routine_discovery_delegation_v1.sql');
 const api=read('api/reality/personal-capabilities.js');
 const worker=read('api/reality/governed-employee-shift-worker.js');
 const ui=read('reality-capability-workspace-v1.js');
 const home=read('reality-home-command-v1.js');
 assert.match(sql,/max_daily_inquiries integer not null default 12/);
 assert.match(sql,/interval '30 days'/);
 assert.match(sql,/for update of g skip locked/i);
 assert.match(sql,/revoke execute on function public.reality_set_owner_routine_delegation_v1/);
 assert.match(sql,/source_ref ~ '\^https:\/\/github\.com/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/ENABLE_ROUTINE_DISCOVERY/);
 assert.match(api,/PAUSE_ROUTINE_DISCOVERY/);
 assert.match(worker,/validSecret\(req,process\.env\)/);
 assert.match(worker,/runOneStandingEmployeeDiscovery/);
 assert.match(worker,/NO_CURRENT_AUTHORIZED_SHIFT_FOR_WORKER_PULSE/);
 assert.match(ui,/window\.confirm\(/);
 assert.match(home,/Capabilities/);
 assert.doesNotMatch(sql,/external_actions_authorized',true/);
});
