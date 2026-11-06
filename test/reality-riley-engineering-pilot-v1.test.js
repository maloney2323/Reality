import test from 'node:test';
import assert from 'node:assert/strict';
import {
 auditRealityEngineeringIssue,verifyRileyAuditReceipt,
 independentlyVerifyRileyProviderAudit
} from '../src/reality-riley-engineering-pilot-v1.js';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const ISSUE='https://github.com/maloney2323/Reality/issues/143';
const NAME='Reality Governed Execution Engine v0.1',SHA='a'.repeat(40);
const issue={number:143,state:'open',html_url:ISSUE,
 title:'Reality recurring failures require fresh reproduction',
 repository_url:ROOT};
const workflow={id:73,name:NAME,path:'.github/workflows/reality-governed-execution.yml'};
const run=(id,status,day)=>({
 id,workflow_id:73,name:NAME,status:'completed',conclusion:status,
 head_repository:{full_name:'maloney2323/Reality'},head_sha:SHA,
 html_url:'https://github.com/maloney2323/Reality/actions/runs/'+id,
 created_at:'2026-11-0'+day+'T12:00:00Z',
 updated_at:'2026-11-0'+day+'T12:05:00Z',event:'push'
});
const old=[run(4101,'failure',1),run(4102,'failure',2),run(4103,'success',3)];
const params={issueNumber:143,workflowName:NAME,sourceCommitSha:SHA,
 sourceRunId:428001};
function provider({runs=old,issueData=issue,workflows=[workflow]}={}){
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,method:options?.method});
  const path=url.slice(ROOT.length);
  const found=path==='/issues/143'?issueData:
   path==='/actions/workflows?per_page=100'?{
    total_count:workflows.length,workflows
   }:path==='/actions/workflows/73/runs?per_page=50'?{
    total_count:runs.length,workflow_runs:runs
   }:path.startsWith('/actions/runs/')?
    runs.find(x=>String(x.id)===path.split('/').at(-1)):null;
  return {ok:!!found,json:async()=>found};
 };
 return {fetchImpl,calls};
}
test('Riley investigates actual source observations without replaying old repairs',async()=>{
 const p=provider();
 const evidence=await auditRealityEngineeringIssue({...params,fetchImpl:p.fetchImpl});
 assert.equal(evidence.status,'REAL_PROVIDER_INVESTIGATION_COMPLETED_READ_ONLY');
 assert.equal(evidence.employee,'Riley');
 assert.equal(evidence.issue_number,143);
 assert.equal(evidence.workflow_runs_observed,3);
 assert.equal(evidence.finding,'RECENT_SUCCESS_AFTER_HISTORICAL_FAILURES');
 assert.equal(evidence.fresh_failure_count,0);
 assert.equal(evidence.original_job_admitted,false);
 assert.equal(evidence.missing_capability_verified,false);
 assert.equal(evidence.model_generation_performed,false);
 assert.equal(evidence.original_job_settled,false);
 assert.equal(evidence.human_hours_saved,null);
 assert.match(evidence.evidence_sha256,/^[a-f0-9]{64}$/);
 assert.ok(p.calls.every(x=>x.method==='GET'&&x.url.startsWith(ROOT)));
 assert.equal(verifyRileyAuditReceipt(evidence).verified,true);
 const verifier=await independentlyVerifyRileyProviderAudit(evidence,
  {fetchImpl:p.fetchImpl});
 assert.equal(verifier.status,'INDEPENDENT_PROVIDER_READBACK_PASSED');
 assert.equal(verifier.receipt_sha256,evidence.evidence_sha256);
 assert.equal(verifier.original_job_completed,false);
 assert.equal(verifier.production_changed,false);
});
test('new repeated failures after success require fresh reproduction, never automatic installation',async()=>{
 const p=provider({runs:[...old,run(4104,'failure',4),run(4105,'failure',5)]});
 const e=await auditRealityEngineeringIssue({...params,fetchImpl:p.fetchImpl});
 assert.equal(e.finding,'REPEATED_FAILURES_NEED_FROZEN_REPRODUCTION');
 assert.equal(e.fresh_failure_count,2);
 assert.deepEqual(e.fresh_failure_refs,[
  'https://github.com/maloney2323/Reality/actions/runs/4105',
  'https://github.com/maloney2323/Reality/actions/runs/4104'
 ]);
 assert.equal(e.next_action,'FREEZE_AND_REPRODUCE_BEFORE_GOVERNED_REPAIR');
 assert.equal(e.capability_installed,false);
 assert.equal(e.owner_shift_authorized,false);
});
test('closed issue and incomplete runs do not claim original-job completion',async()=>{
 const p=provider({issueData:{...issue,state:'closed'},
  runs:[{...old[0],status:'in_progress',conclusion:null},old[2]]});
 const e=await auditRealityEngineeringIssue({...params,fetchImpl:p.fetchImpl});
 assert.equal(e.finding,'ISSUE_CLOSED_REQUIRES_NO_NEW_EXECUTION');
 assert.equal(e.incomplete_workflow_runs_in_sample,1);
 assert.equal(e.original_job_admitted,false);
});
test('foreign provider identity and forged artifacts fail closed',async()=>{
 const foreign=provider({runs:[{...old[2],head_repository:{full_name:'other/Reality'}}]});
 await assert.rejects(
  auditRealityEngineeringIssue({...params,fetchImpl:foreign.fetchImpl}),
  /RILEY_AUDIT_WORKFLOW_RUN_IDENTITY_UNVERIFIED/);
 const missing=provider({workflows:[]});
 await assert.rejects(
  auditRealityEngineeringIssue({...params,fetchImpl:missing.fetchImpl}),
  /RILEY_AUDIT_WORKFLOW_NOT_FOUND_IN_BOUNDED_SCAN/);
 const p=provider();
 const e=await auditRealityEngineeringIssue({...params,fetchImpl:p.fetchImpl});
 assert.throws(()=>verifyRileyAuditReceipt({...e,
  finding:'VERIFIED_FULL_SELF_REPAIR',capability_installed:true}),
  /RILEY_AUDIT_RECEIPT_EVIDENCE_UNVERIFIED/);
 const p2=provider({runs:[{...old[2],head_sha:'b'.repeat(40)}]});
 await assert.rejects(
  independentlyVerifyRileyProviderAudit(e,{fetchImpl:p2.fetchImpl}),
  /RILEY_AUDIT_INDEPENDENT_RUN_READBACK_MISMATCH/);
});
test('untrusted work scope cannot trigger a model or authorize execution',async()=>{
 const p=provider();
 await assert.rejects(auditRealityEngineeringIssue({...params,
  sourceCommitSha:'not-real',fetchImpl:p.fetchImpl}),
 /RILEY_AUDIT_SCOPED_INVESTIGATION_REQUIRED/);
 await assert.rejects(auditRealityEngineeringIssue({...params,
  issueNumber:0,fetchImpl:p.fetchImpl}),
 /RILEY_AUDIT_SCOPED_INVESTIGATION_REQUIRED/);
 assert.equal(p.calls.length,0);
});
