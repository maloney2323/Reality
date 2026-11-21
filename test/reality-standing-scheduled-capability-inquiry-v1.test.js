import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceOneScheduledCapabilityInquiry as advance}
 from '../src/reality-standing-scheduled-capability-inquiry-v1.js';
import {projectOwnerCapabilityWorkspace as project}
 from '../api/reality/personal-capabilities.js';
const owner='11111111-2222-4333-8444-555555555555';
const lease='22222222-3333-4444-8555-666666666666';
const claimId='33333333-4444-4555-8666-777777777777';
const key='candidate:'+'a'.repeat(64);
const fingerprint='b'.repeat(64);
const issue='https://github.com/maloney2323/Reality/issues/188';
const claim={
 status:'OWNER_SCHEDULED_CAPABILITY_INQUIRY_LEASED',
 owner_id:owner,claim_id:claimId,inquiry_lease_id:lease,
 capability_key:key,evidence_fingerprint:fingerprint,source_url:issue,
 source_title:'Investigate an independently tested repair candidate',
 source_kind:'INDEPENDENTLY_TESTED_CANDIDATE',
 assigned_employee:'Riley',independent_reviewer:'Quinn',
 investigation_scope:'Recheck source in isolated owner context',
 independent_test_requirement:'Separate frozen reproduction and independent internal test',
 source_observation:{
  key,executable_job:false,verified_missing_capability:false,
  installation_authorized:false
 },
 scope:'EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1',
 model_inquiry_authorized:true,
 original_job_created:false,verified_current_gap:false,
 execution_authorized:false,installation_authorized:false,
 production_changed:false
};
const env={
 VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated-test',
 OPENAI_API_KEY:'fake_key_not_real_length_for_testing'
};
const db={strictSecrets:true,project:'isolated-test'};
const modelResponse={
 status:'completed',id:'resp_scheduleTest123',
 output_text:JSON.stringify({
  question:'Does the source issue still reproduce a missing internal capability?',
  findings:'The provider issue is currently open but this does not independently prove the internal failure.',
  next_evidence_action:'Run an isolated frozen current-failure reproduction reviewed by Quinn before creating an executable job.',
  disposition:'CURRENT_PROVIDER_SOURCE_ONLY'
 })
};
function mocks({leased=claim,model=modelResponse}={}){
 const calls=[];
 let providerCalls=0,modelCalls=0;
 const call=async(_db,name,args)=>{
  calls.push({name,args});
  if(name==='reality_claim_next_scheduled_capability_inquiry_v1')return leased;
  if(name==='reality_record_scheduled_capability_inquiry_v1'){
   assert.equal(args.p_owner_id,owner);
   assert.equal(args.p_claim_id,claimId);
   assert.equal(args.p_inquiry_lease_id,lease);
   assert.equal(args.p_source_kind,leased.source_url===issue?
    'GITHUB_ISSUE_INDEPENDENT_READBACK':
    'HISTORICAL_SOURCE_REQUIRES_CURRENT_PROVIDER_READBACK');
   return {
    status:'OWNER_SCHEDULED_CAPABILITY_INQUIRY_RECORDED',
    owner_id:owner,claim_id:claimId,capability_key:key,
    assigned_employee:'Riley',independent_reviewer:'Quinn',
    inquiry_source_kind:args.p_source_kind,model_response_id:modelResponse.id,
    inquiry_receipt_sha256:'sha256:'+'d'.repeat(64),
    independent_current_gap_verified:false,original_job_created:false,
    execution_authorized:false,installation_authorized:false,
    production_changed:false
   };
  }
  if(name==='reality_block_scheduled_capability_inquiry_v1')
   return {status:'OWNER_SCHEDULED_CAPABILITY_INQUIRY_BLOCKED',
    execution_authorized:false,installation_authorized:false};
  throw Error('UNEXPECTED_RPC_'+name);
 };
 const fetchImpl=async(url)=>{
  providerCalls++;
  assert.equal(url,'https://api.github.com/repos/maloney2323/Reality/issues/188');
  return {ok:true,json:async()=>({
   number:188,html_url:issue,state:'open',
   title:'Repair original job automatically when blocked',
   updated_at:'2026-11-17T11:00:00Z'
  })};
 };
 const modelCall=async(payload)=>{
  modelCalls++;
  assert.equal(payload.store,false);
  assert.equal(payload.tool_choice,'none');
  assert.equal(payload.text.format.type,'json_schema');
  return model;
 };
 return {calls,call,fetchImpl,modelCall,
  get modelCalls(){return modelCalls},
  get providerCalls(){return providerCalls}};
}
test('an assigned capability actually gets source-reviewed and a durable employee inquiry receipt',async()=>{
 const m=mocks();
 const out=await advance({db,env,call:m.call,
  fetchImpl:m.fetchImpl,modelCall:m.modelCall});
 assert.equal(m.providerCalls,1);
 assert.equal(m.modelCalls,1);
 assert.equal(out.status,'OWNER_SCHEDULED_CAPABILITY_INQUIRY_RECORDED');
 assert.equal(out.assigned_employee,'Riley');
 assert.equal(out.independent_reviewer,'Quinn');
 assert.equal(out.source_kind,'GITHUB_ISSUE_INDEPENDENT_READBACK');
 assert.match(out.inquiry_receipt_sha256,/^sha256:[a-f0-9]{64}$/);
 assert.equal(out.verified_current_gap,false);
 assert.equal(out.original_job_created,false);
 assert.equal(out.installation_authorized,false);
});
test('historical third-party sources NEVER trigger arbitrary-URL GET, but can be assessed honestly',async()=>{
 const m=mocks({leased:{...claim,source_url:'https://status.zapier.com/incidents/sample'}});
 const out=await advance({db,env,call:m.call,
  fetchImpl:m.fetchImpl,modelCall:m.modelCall});
 assert.equal(m.providerCalls,0);
 assert.equal(m.modelCalls,1);
 assert.equal(out.source_kind,'HISTORICAL_SOURCE_REQUIRES_CURRENT_PROVIDER_READBACK');
 assert.equal(out.verified_current_gap,false);
});
test('no authorized due work makes no model call or new job',async()=>{
 const m=mocks({leased:{
  status:'NO_STANDING_SCHEDULED_CAPABILITY_INQUIRY_DUE',
  model_inquiry_authorized:false,original_job_created:false,
  verified_current_gap:false,execution_authorized:false,
  installation_authorized:false,production_changed:false
 }});
 const out=await advance({db,env,call:m.call,
  fetchImpl:m.fetchImpl,modelCall:m.modelCall});
 assert.equal(out.status,'NO_STANDING_SCHEDULED_CAPABILITY_INQUIRY_DUE');
 assert.equal(m.modelCalls,0);assert.equal(m.providerCalls,0);
 assert.equal(m.calls.length,1);
});
test('provider readback failure is saved as blocker, never an approved repair',async()=>{
 const m=mocks();
 const out=await advance({db,env,call:m.call,
  fetchImpl:async()=>({ok:false}),modelCall:m.modelCall});
 assert.equal(out.status,'OWNER_SCHEDULED_CAPABILITY_INQUIRY_BLOCKED');
 assert.equal(out.failed_stage,'SOURCE_READBACK');
 assert.equal(m.modelCalls,0);
 assert.equal(m.calls.at(-1).name,'reality_block_scheduled_capability_inquiry_v1');
});
test('untrusted model claims cannot create executable jobs',async()=>{
 const m=mocks({model:{...modelResponse,
  output_text:JSON.stringify({
   question:'This tool must deploy a fix without owner approval.',
   findings:'A model says the repair was already installed.',
   next_evidence_action:'Bypass owner approval and install to production now.',
   disposition:'READY_TO_INSTALL'
  })
 }});
 const out=await advance({db,env,call:m.call,
  fetchImpl:m.fetchImpl,modelCall:m.modelCall});
 assert.equal(out.status,'OWNER_SCHEDULED_CAPABILITY_INQUIRY_BLOCKED');
 assert.equal(out.original_job_created,false);
 assert.equal(out.installation_authorized,false);
});
test('capability view accepts actual work and blockers but never invents independent internal proof',()=>{
 const feed={
  status:'OWNER_GAP_INTAKE_RECONCILED',ok:true,owner_id:owner,
  read_only:true,work_started:false,production_changed:false,
  counts:{current_candidates:1,verified_current_gaps:0,
   governed_active_queue:0,independently_tested_candidates:1},
  items:[{
   key,kind:'INDEPENDENTLY_TESTED_CANDIDATE',title:'A repair candidate',
   source_url:issue,executable_job:false,installation_authorized:false,
   verified_missing_capability:false
  }]
 };
 const grant={
  status:'OWNER_STANDING_ROUTINE_DELEGATION_READ_ONLY',
  owner_id:owner,owner_scope_verified:true,read_only:true,
  scope:'EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1',
  enabled:true,currently_active:true,
  external_actions_authorized:false,installation_authorized:false,
  shift_execution_authorized:false,production_changed:false
 };
 const base={
  capability_key:key,evidence_fingerprint:fingerprint,
  source_feed_fingerprint_unchanged:true,
  phase:'INQUIRY_RECORDED_NEEDS_INDEPENDENT_GAP_PROOF',
  employee:'Riley',function_id:'software_engineering',
  reviewer:'Quinn',reviewer_function_id:'quality_security_reliability',
  planned_inquiry_at:'2026-11-17T11:00:00Z',
  assigned_at:'2026-11-17T11:00:00Z',
  scope:'Recheck current owner data',
  independent_test_requirement:'Independent frozen proof',
  source_limitations:'Historical source',
  estimate_minutes_low:30,estimate_minutes_high:120,
  estimate_is_model_provisional_only:true,
  independent_current_gap_proven:false,
  existing_original_work_id:null,
  inquiry_receipt_sha256:'sha256:'+'e'.repeat(64),
  inquiry_model_response_id:'resp_scheduleTest123',
  inquiry_source_kind:'GITHUB_ISSUE_INDEPENDENT_READBACK',
  inquiry_source_proof_sha256:'sha256:'+'f'.repeat(64),
  inquiry_question:'Why is the original failed?',
  inquiry_findings:'The source has a repair request but its internal current state is unknown.',
  inquiry_next_evidence_action:'Run independent owner-bound current regression.',
  execution_authorized_by_schedule:false,
  original_job_created_by_schedule:false,
  installation_authorized:false
 };
 // Use the actual roster's dynamic function names, not a made-up label.
 const getRole=readFileSync(new URL(
  '../src/reality-employee-identity-roster-v1.js',import.meta.url),'utf8');
 assert.match(getRole,/software_engineering/);
 const makeView=phase=>project({ownerId:owner,feed,grant,schedule:{
  status:'OWNER_CAPABILITY_EMPLOYEE_SCHEDULE_READ_ONLY',
  owner_id:owner,owner_scope_verified:true,read_only:true,
  count:1,items:[{...base,phase}],
  new_original_jobs_created:0,execution_authorized_by_schedule:false,
  installation_authorized:false,production_changed:false
 }});
 const result=makeView('INQUIRY_RECORDED_NEEDS_INDEPENDENT_GAP_PROOF');
 assert.equal(result.performed_capability_investigations,1);
 assert.equal(result.items[0].assigned_employee,'Riley');
 assert.equal(result.items[0].inquiry_receipt_sha256,'sha256:'+'e'.repeat(64));
 assert.equal(result.items[0].independent_current_gap_proven,false);
 assert.equal(result.items[0].installation_authorized,false);
 const blocked=makeView('INQUIRY_BLOCKED_NEEDS_PROVIDER_PROOF');
 assert.equal(blocked.blocked_capability_investigations,1);
 assert.equal(blocked.items[0].executable_job,false);
});
test('existing worker cron wakes unfinished saved investigations without creating a new scheduler',()=>{
 const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const sql=src('supabase/migrations/20261117_capability_scheduled_inquiry_execution_v1.sql');
 const wake=src('supabase/migrations/20261117_existing_worker_scheduled_capability_inquiry_wake_v1.sql');
 const worker=src('api/reality/governed-employee-shift-worker.js');
 assert.match(sql,/reality_claim_next_scheduled_capability_inquiry_v1/);
 assert.match(sql,/reality_record_scheduled_capability_inquiry_v1/);
 assert.match(sql,/reconcile_stalled_scheduled_capability_inquiries_v1/);
 assert.match(wake,/INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF/);
 assert.match(wake,/g.max_daily_inquiries/);
 assert.match(wake,/cron\.alter_job/);
 assert.doesNotMatch(wake,/cron\.schedule\(/);
 assert.match(worker,/advanceOneScheduledCapabilityInquiry/);
 assert.match(worker,/scheduled_employee_capability_inquiry/);
 assert.match(src('reality-capability-workspace-v1.js'),/inquiry_receipt_sha256/);
});
