import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectOwnerIncidentChatBriefing}
 from '../src/reality-owner-operational-incident-chat-v1.js';
import {advanceOneQualifiedEmployeeEvidenceJob}
 from '../src/reality-automatic-qualified-evidence-worker-v1.js';
const owner='11111111-2222-4333-8444-555555555555';
const shift='22222222-3333-4444-8555-666666666666';
const execRun='33333333-4444-4555-8666-777777777777';
const reviewRun='44444444-5555-4666-8777-888888888888';
const job='55555555-6666-4777-8888-999999999999';
const claimId='66666666-7777-4888-8999-aaaaaaaaaaaa';
const reviewClaim='77777777-8888-4999-8aaa-bbbbbbbbbbbb';
const ref='https://github.com/maloney2323/Reality/issues/201';
const digest=x=>'sha256:'+x.repeat(64);
const db={strictSecrets:true,project:'test-project',secretKey:'fixture'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'test-project'};
const provider={
 source_ref:ref,source_title:'Reality continuity - real source',
 source_body:'Observed unchanged provider issue body in this synthetic test.',
 provider_updated_at:'2026-11-17T15:10:00Z',
 provider_proof_sha256:digest('a'),
 checked_at:'2026-11-17T16:20:00Z'
};
const noReview={
 status:'NO_INDEPENDENT_EVIDENCE_JOB_REVIEW_READY',
 installation_authorized:false,production_changed:false
};
const executeClaim={
 status:'QUALIFIED_EVIDENCE_JOB_SIGNED_CLAIMED',
 job_id:job,owner_id:owner,shift_id:shift,
 execution_claim_id:claimId,worker_run_id:execRun,
 source_ref:ref,employee:'Riley',job_type:'CURRENT_SOURCE_EVIDENCE_PACK',
 objective:'Independently verify the exact current provider source and frozen failure evidence.',
 qualification_receipt_sha256:digest('b'),
 authorized_evidence_only:true,installation_authorized:false,
 production_changed:false,original_customer_job_completed:false
};
const submitted={
 status:'EXECUTABLE_SOURCE_EVIDENCE_PACK_SUBMITTED',
 job_id:job,owner_id:owner,shift_id:shift,source_ref:ref,
 execution_worker_run_id:execRun,evidence_deliverable_sha256:digest('c'),
 independent_verification_required:true,original_customer_job_completed:false,
 installation_authorized:false,production_changed:false
};
const review={
 status:'INDEPENDENT_SOURCE_RECHECK_SIGNED_CLAIMED',
 job_id:job,owner_id:owner,shift_id:shift,source_ref:ref,
 review_claim_id:reviewClaim,review_worker_run_id:reviewRun,
 original_execution_worker_run_id:execRun,
 source_sha256_to_verify:digest('a'),
 deliverable_receipt_sha256:digest('c'),
 installation_authorized:false,production_changed:false
};
const completed={
 status:'QUALIFIED_SOURCE_EVIDENCE_JOB_INDEPENDENTLY_COMPLETED',
 job_id:job,owner_id:owner,shift_id:shift,source_ref:ref,
 independent_receipt_sha256:digest('d'),evidence_job_completed:true,
 original_customer_job_completed:false,code_repair_installed:false,
 installation_authorized:false,production_changed:false
};
const calls=[];
const execDb=async(_db,name,args)=>{
 calls.push({name,args});
 if(name==='reality_claim_qualified_employee_evidence_review_v1')return noReview;
 if(name==='reality_claim_next_qualified_employee_evidence_job_v1')return executeClaim;
 if(name==='reality_record_qualified_employee_evidence_job_v1')return submitted;
 throw Error('UNAUTHORIZED_RPC_'+name);
};
test('automatically claim and execute a qualified source-backed original evidence work item',async()=>{
 calls.length=0;
 const result=await advanceOneQualifiedEmployeeEvidenceJob({
  db,env,shiftId:shift,workerRunId:execRun,call:execDb,
  readSource:async()=>provider,fetchImpl:async()=>{throw Error('NO_NETWORK')}
 });
 assert.equal(result.status,'EXECUTABLE_SOURCE_EVIDENCE_PACK_SUBMITTED');
 assert.equal(result.actual_evidence_report_submitted,true);
 assert.equal(result.independent_verification_required,true);
 assert.equal(result.customer_original_completed,false);
 assert.equal(result.installation_authorized,false);
 assert.deepEqual(calls.map(x=>x.name),[
  'reality_claim_qualified_employee_evidence_review_v1',
  'reality_claim_next_qualified_employee_evidence_job_v1',
  'reality_record_qualified_employee_evidence_job_v1'
 ]);
 assert.equal(calls.at(-1).args.p_worker_run_id,execRun);
 assert.equal(calls.at(-1).args.p_source_ref,ref);
 assert.equal(calls.at(-1).args.p_source_proof_sha256,digest('a'));
});
test('evidence deliverable preserves bounded untrusted issue comments with the signed proof',async()=>{
 calls.length=0;
 const received=[];
 const v=await advanceOneQualifiedEmployeeEvidenceJob({
  db,env,shiftId:shift,workerRunId:execRun,call:execDb,
  readSource:async(source,options)=>{
   received.push(options.includeRecentComments);
   return {...provider,recent_source_comments:[
    {comment_id:7016689201,body:'Reality should investigate this exact handoff; this is not a separate install approval.'}
   ]};
  },
  fetchImpl:async()=>{throw Error('NO_NETWORK')}
 });
 assert.equal(v.status,'EXECUTABLE_SOURCE_EVIDENCE_PACK_SUBMITTED');
 assert.deepEqual(received,[true]);
 assert.match(calls.at(-1).args.p_source_excerpt,/7016689201/);
 assert.match(calls.at(-1).args.p_source_excerpt,/NOT OWNER AUTHORIZATION/);
 assert.equal(v.installation_authorized,false);
});
test('independent current source read from a distinct signed worker proves evidence job, never code install',async()=>{
 calls.length=0;
 const reviewDb=async(_db,name,args)=>{
  calls.push({name,args});
  if(name==='reality_claim_qualified_employee_evidence_review_v1')return review;
  if(name==='reality_record_qualified_employee_evidence_review_v1')return completed;
  throw Error('REVIEW_MUST_NOT_CREATE_NEW_JOB_OR_APPROVE_INSTALL');
 };
 const result=await advanceOneQualifiedEmployeeEvidenceJob({
  db,env,shiftId:shift,workerRunId:reviewRun,call:reviewDb,
  readSource:async()=>provider,fetchImpl:async()=>{throw Error('NO_NETWORK')}
 });
 assert.equal(result.status,'QUALIFIED_SOURCE_EVIDENCE_JOB_INDEPENDENTLY_COMPLETED');
 assert.equal(result.evidence_job_independently_completed,true);
 assert.equal(result.first_worker_run_id,execRun);
 assert.equal(result.independent_worker_run_id,reviewRun);
 assert.notEqual(result.first_worker_run_id,result.independent_worker_run_id);
 assert.equal(result.customer_original_completed,false);
 assert.equal(result.code_repair_installed,false);
 assert.deepEqual(calls.map(x=>x.name),[
  'reality_claim_qualified_employee_evidence_review_v1',
  'reality_record_qualified_employee_evidence_review_v1'
 ]);
});
test('forged scopes and wrong worker IDs fail before provider execution',async()=>{
 const forged=[{...executeClaim,worker_run_id:reviewRun},
  {...executeClaim,installation_authorized:true},
  {...executeClaim,job_type:'ARBITRARY_CODE_INSTALL'},
  {...executeClaim,source_ref:'https://evil.example/install'},
  {...executeClaim,qualification_receipt_sha256:'FAKE'}];
 for(const altered of forged){
  const rpc=async(_db,name)=>{
   if(name==='reality_claim_qualified_employee_evidence_review_v1')
    return noReview;
   if(name==='reality_claim_next_qualified_employee_evidence_job_v1')
    return altered;
   throw Error('MUST_NOT_RECORD');
  };
  await assert.rejects(advanceOneQualifiedEmployeeEvidenceJob({
   db,env,shiftId:shift,workerRunId:execRun,call:rpc,
   readSource:async()=>{throw Error('MUST_NOT_FETCH')},
   fetchImpl:async()=>{throw Error('MUST_NOT_FETCH')}
  }),/QUALIFIED_EVIDENCE_WORK_QUALIFIED_SOURCE_WORK_CLAIM_UNVERIFIED/);
 }
});
test('current provider or proof readback absent blocks, never reports a completed work item',async()=>{
 const x=await advanceOneQualifiedEmployeeEvidenceJob({
  db,env,shiftId:shift,workerRunId:execRun,call:execDb,
  readSource:async()=>{throw Error('PROVIDER_UNAVAILABLE')},
  fetchImpl:async()=>{throw Error('UNAVAILABLE')}
 });
 assert.equal(x.status,'QUALIFIED_EVIDENCE_JOB_EXECUTION_PROVIDER_BLOCKED');
 assert.equal(x.actual_evidence_report_submitted,false);
 assert.equal(x.customer_original_completed,false);
 assert.equal(x.installation_authorized,false);
});
test('source changes are not independently verified as a successful original job',async()=>{
 const rpc=async(_db,name)=>{
  if(name==='reality_claim_qualified_employee_evidence_review_v1')return review;
  if(name==='reality_record_qualified_employee_evidence_review_v1')
   return{...completed,status:'QUALIFIED_SOURCE_EVIDENCE_SOURCE_CHANGED_NO_COMPLETION',
    evidence_job_completed:false};
  throw Error('UNAUTHORIZED');
 };
 const x=await advanceOneQualifiedEmployeeEvidenceJob({
  db,env,shiftId:shift,workerRunId:reviewRun,call:rpc,
  readSource:async()=>({...provider,provider_proof_sha256:digest('e')}),
  fetchImpl:async()=>{throw Error('UNAVAILABLE')}
 });
 assert.equal(x.evidence_job_independently_completed,false);
 assert.equal(x.status,'QUALIFIED_SOURCE_EVIDENCE_SOURCE_CHANGED_NO_COMPLETION');
});
test('owner Chat shows a true qualified executable job and independent proof without calling it a customer repair',()=>{
 const work={
  status:'OWNER_SOURCE_QUALIFIED_EMPLOYEE_WORK_READ_ONLY',
  owner_id:owner,owner_scope_verified:true,read_only:true,
  installation_authorized_by_read:false,
  original_customer_job_completed_by_read:false,production_changed:false,
  counts:{total:2,qualified_executable:1,executing:0,
   pending_independent_verification:0,independently_completed:1,blocked:0},
  items:[{
   job_id:job,shift_id:shift,employee:'Casey',
   source_ref:ref,job_type:'CURRENT_SOURCE_EVIDENCE_PACK',
   phase:'COMPLETED_INDEPENDENTLY_VERIFIED',
   objective:'Independently recheck real code source evidence without approving external changes.',
   qualification_receipt_sha256:digest('a'),
   deliverable_receipt_sha256:digest('b'),
   independent_receipt_sha256:digest('c'),
   execution_worker_run_id:execRun,review_worker_run_id:reviewRun,
   verified_at:'2026-11-17T16:29:01Z',
   deliverable:{source_title:'Evidence report - ready',
    next_evidence_required:'Authenticate the owner and run final acceptance.'},
   evidence_job_completed:true,original_customer_job_completed:false,
   code_repair_installed:false,production_changed:false
  },{
   job_id:'88888888-9999-4aaa-8bbb-cccccccccccc',
   shift_id:shift,employee:'Riley',source_ref:ref,
   job_type:'CURRENT_SOURCE_EVIDENCE_PACK',
   phase:'QUALIFIED_EXECUTABLE',
   objective:'Read the current provider source and prepare an immutable independent evidence pack.',
   qualification_receipt_sha256:digest('d'),
   deliverable_receipt_sha256:null,independent_receipt_sha256:null,
   execution_worker_run_id:null,review_worker_run_id:null,
   verified_at:null,deliverable:null,evidence_job_completed:false,
   original_customer_job_completed:false,
   code_repair_installed:false,production_changed:false
  }]
 };
 const legacy={
  status:'OWNER_SIGNED_WORKER_RECOVERY_EVIDENCE_READ_ONLY',
  owner_id:owner,owner_scope_verified:true,read_only:true,
  execution_authorized_by_read:false,installation_authorized:false,
  production_changed:false,scheduler_dispatch_success_not_worker_proof:true,
  autonomous_self_repair_proven:false,incident_count:0,
  next_action:'Continue the current shift.',last_scheduler_status:'succeeded',
  incidents:[]
 };
 const info=projectOwnerIncidentChatBriefing({
  ownerId:owner,source:legacy,qualifiedWork:work
 });
 assert.equal(info.qualified_employee_evidence_work.counts.total,2);
 assert.equal(info.qualified_employee_evidence_work.items[0].evidence_job_completed,true);
 assert.equal(info.qualified_employee_evidence_work.items[0].original_customer_job_completed,false);
 assert.ok(info.qualified_employee_evidence_work.items[0].followup_proof_still_required);
 for(const bad of [
  {...work,owner_id:shift},
  {...work,counts:{...work.counts,total:3}},
  {...work,items:[{...work.items[0],review_worker_run_id:execRun}]},
  {...work,items:[{...work.items[0],original_customer_job_completed:true}]}
 ])assert.throws(()=>projectOwnerIncidentChatBriefing({
  ownerId:owner,source:legacy,qualifiedWork:bad
 }),/OPERATIONAL_CHAT_OWNER_INCIDENT_PROOF_REQUIRED/);
});
test('qualification engine is dynamic, signed, time bounded and does not grant code installation',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const sql=read('supabase/migrations/20261117_automatic_qualified_employee_evidence_work_v1.sql');
 const corrected=read('supabase/migrations/20261117_automatic_qualified_employee_evidence_work_pulse_v2.sql');
 const worker=read('api/reality/governed-employee-shift-worker.js');
 const broker=read('src/reality-governed-shift-boundary-v1.js');
 assert.match(sql,/qualify_owner_employee_evidence_jobs_v1/);
 assert.match(sql,/employee_temporal_inquiries_v1 i/);
 assert.match(sql,/model_response_id ~ '\^resp_/);
 assert.match(sql,/QUALIFIED_EVIDENCE_EXACT_PROVIDER_PROOF_REQUIRED/); 
 assert.match(sql,/qualify_owner_employee_evidence_jobs_v1\(\)/);
 assert.match(sql,/original_customer_job_completed boolean not null default false/);
 assert.match(sql,/executed\.run_id=q\.execution_worker_run_id/);
 assert.match(sql,/q\.execution_worker_run_id<>p_worker_run_id/);
 assert.match(sql,/phase='SUBMITTED_AWAITING_INDEPENDENT_RECHECK'/);
 assert.match(sql,/cron\.alter_job/);
 assert.doesNotMatch(sql,/cron\.schedule\(/);
 assert.match(corrected,/WAKE_COMPLETED/);
 assert.match(worker,/advanceOneQualifiedEmployeeEvidenceJob/);
 assert.match(worker,/qualified_employee_executable_work:qualifiedEmployeeWork/);
 assert.match(broker,/claim_next_qualified_employee_evidence_job_v1/);
 assert.match(broker,/record_qualified_employee_evidence_review_v1/);
});
