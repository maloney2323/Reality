import test from 'node:test';
import assert from 'node:assert/strict';
import {
 FIRST_GAP_PROOF,attestFirstGapProviderSnapshot,observeFirstGapFromGithub,
 admitFirstGapBuildTicket,generateAfterTrustedGap,
} from '../src/reality-first-gap-handoff-v0.1.js';
const p=FIRST_GAP_PROOF;
const scope={
 owner_id:'owner:real-from-authenticated-session',
 goal_id:'goal:owner-active-and-confirmed',
 original_work_id:'work:'+'3'.repeat(32),
 continuity_root_id:'continuity:verified-root',
 worldline_id:'worldline:verified-world',
 goal_transition_receipt_ref:'continuity:goal:receipt',
 goal_evidence_ref:'continuity:source:user-message',
 environment:'ISOLATED_PREVIEW',
 user_confirmed:true,owner_session_verified:true,goal_current_verified:true,
 original_issue_number:178,
};
const manifest=JSON.stringify({
 manifest_ref:p.manifest_ref,
 tests:['test/reality-governed-self-improvement-spine-v1.0.test.js',p.frozen_test],
})+'\n';
const run={
 id:p.run_id,head_sha:p.run_head_sha,head_branch:p.head_branch,
 event:'push',path:p.workflow_path,status:'completed',conclusion:'failure',
 html_url:'https://github.com/'+p.repository+'/actions/runs/'+p.run_id,
 repository:{full_name:p.repository},
};
const job={id:123760052647,name:p.job_name,run_id:p.run_id,
 head_sha:p.run_head_sha,status:'completed',conclusion:'failure',
 steps:[
  {name:'Independently check the constitutional baseline',conclusion:'success'},
  {name:'Frozen customer acceptance — expected RED until Reality installs the missing source',conclusion:'failure'}
 ]};
const log=[
 '# pass 26','# fail 0',
 'Error [ERR_MODULE_NOT_FOUND]: Cannot find module /home/runner/work/Reality/Reality/'+p.missing_source,
 'imported from /home/runner/work/Reality/Reality/'+p.frozen_test,
 '# fail 1',
].join('\n');
const read=(patch={})=>attestFirstGapProviderSnapshot({
 run,jobs:[job],log,manifest,scope,...patch,
});
test('actual pinned red-run contract yields source-bound non-authorizing evidence',()=>{
 const e=read();
 assert.equal(e.status,'INDEPENDENT_CI_MISSING_CAPABILITY_OBSERVED');
 assert.equal(e.provider_receipt_ref,'github:actions:run:40962921090:job:123760052647');
 assert.equal(e.original_work_id,scope.original_work_id);
 assert.equal(e.goal_id,scope.goal_id);
 assert.match(e.evidence_hash,/^[a-f0-9]{64}$/);
 for(const key of ['model_generated','sandbox_verified','installation_authorized',
   'capability_installed','original_job_resumed','original_job_settled',
   'production_changed'])assert.equal(e[key],false,key);
});
test('wrong run SHA, branch, repo, conclusion and workflow fail closed',()=>{
 for(const wrong of [
  {head_sha:'f'.repeat(40)}, {head_branch:'main'},
  {repository:{full_name:'adversary/Reality'}},
  {conclusion:'success'},{event:'workflow_dispatch'},
  {path:'other.yml'},{id:0},
 ])assert.throws(()=>read({run:{...run,...wrong}}),/FIRST_GAP_PINNED_RUN_NOT_VERIFIED/);
});
test('job mismatch or unresolved independent constitutional run is rejected',()=>{
 for(const wrong of [
  {id:0},{run_id:13},{head_sha:'b'.repeat(40)},
  {conclusion:'success'}, {name:'other'},
  {steps:[]}, {status:'queued'}
 ])assert.throws(()=>read({jobs:[{...job,...wrong}]}),/FIRST_GAP_/);
 assert.throws(()=>read({jobs:[job,job]}),/UNIQUE_FAILED_JOB_REQUIRED/);
});
test('log tampering and manifest tampering cannot assert a gap',()=>{
 for(const txt of [log.replace('ERR_MODULE_NOT_FOUND','WARNING'),
  log.replace(p.missing_source,'src/untrusted.mjs'),
  log.replace('# pass 26','# pass 25'),
  log.replace('# fail 1','# fail 0')])
  assert.throws(()=>read({log:txt}),/FIRST_GAP_EXACT_MISSING_EXTENSION_NOT_PROVEN/);
 assert.throws(()=>read({manifest:manifest+' '}),/FIRST_GAP_FROZEN_MANIFEST_HASH_CHANGED/);
});
test('owner scope absent, changed goal or wrong original issue cannot create proof',()=>{
 for(const wrong of [
  {original_issue_number:143}, {goal_id:null}, {owner_session_verified:false},
  {user_confirmed:false},{environment:'production'},
  {original_work_id:'not-a-work'}, {goal_current_verified:false}
 ])assert.throws(()=>read({scope:{...scope,...wrong}}),/FIRST_GAP_OWNER_WORK_SCOPE_NOT_VERIFIED/);
});
test('only durable EXACT source, owner, goal and worldline readback admits model ticket',async()=>{
 const e=read();
 const persist=async()=>({committed:true,receipt_id:'continuity:verified:new-gap'});
 const verified={
  receipt_id:'continuity:verified:new-gap',verified:true,
  owner_id:scope.owner_id,goal_id:scope.goal_id,
  original_work_id:scope.original_work_id,worldline_id:scope.worldline_id,
  evidence_hash:e.evidence_hash,provider_receipt_ref:e.provider_receipt_ref
 };
 const a=await admitFirstGapBuildTicket({scope,providerEvidence:e,
  persistGap:persist,readBackGap:async()=>verified,
  reobserveProviderEvidence:async()=>read()});
 assert.equal(a.proof,'OWNER_SCOPED_PROVIDER_GAP_DURABLY_READ_BACK');
 assert.equal(a.ticket.original_work_id,scope.original_work_id);
 assert.equal(a.ticket.frozen_regression_sha256,p.manifest_sha256);
 assert.equal(a.ticket.repository_base_sha,p.run_head_sha);
 assert.equal(a.installation_authorized,false);
 for(const bad of [{owner_id:'other'},{evidence_hash:'c'.repeat(64)},
  {verified:false},{original_work_id:'work:'+'4'.repeat(32)}]){
  await assert.rejects(
   ()=>admitFirstGapBuildTicket({scope,providerEvidence:e,
    persistGap:persist,readBackGap:async()=>({...verified,...bad}),
    reobserveProviderEvidence:async()=>read()}),
   /FIRST_GAP_GAP_CONTINUITY_READBACK_MISMATCH/);
 }
});
test('model invocation cannot begin on fabricated or non-durable gap',async()=>{
 let called=0;
 await assert.rejects(()=>generateAfterTrustedGap({
  admitted:{proof:'MODEL_SAYS_APPROVED'},adapters:{modelGenerate:()=>{called++}}
 }),/FIRST_GAP_NO_TRUSTED_TICKET/);
 const e=read();
 await assert.rejects(()=>admitFirstGapBuildTicket({
  scope,providerEvidence:e,persistGap:async()=>({committed:false}),
  readBackGap:async()=>({verified:true}),
  reobserveProviderEvidence:async()=>read()}),/FIRST_GAP_GAP_NOT_COMMITTED/);
 assert.equal(called,0);
});

test('trusted runner fetches only pinned read-only GitHub URLs, then attaches exact evidence',async()=>{
 const calls=[];
 const base='https://api.github.com/repos/maloney2323/Reality';
 const responder=async(url,opts)=>{
  calls.push({url,method:opts.method,body:opts.body||null});
  assert.equal(opts.method,'GET');
  let payload,raw=false;
  if(url===base+'/actions/runs/'+p.run_id)payload=run;
  else if(url===base+'/actions/runs/'+p.run_id+'/jobs?per_page=100')
   payload={jobs:[job],total_count:1};
  else if(url===base+'/actions/jobs/'+job.id+'/logs'){payload=log;raw=true}
  else if(url===base+'/contents/'+p.manifest_path+'?ref='+p.run_head_sha)
   payload={encoding:'base64',content:Buffer.from(manifest).toString('base64'),
    path:p.manifest_path,size:manifest.length};
  else throw Error('UNEXPECTED_NETWORK_TARGET');
  return {ok:true,headers:{get:()=>null},
   json:async()=>{if(raw)throw Error('WRONG_FORMAT');return payload},
   text:async()=>{if(!raw)throw Error('WRONG_FORMAT');return payload}};
 };
 const result=await observeFirstGapFromGithub({
  scope,apiToken:'read-only-test-credential-12345678',fetchImpl:responder
 });
 assert.equal(result.evidence_hash,read().evidence_hash);
 assert.equal(calls.length,4);
 for(const call of calls){assert.match(call.url,/^https:\/\/api\.github\.com\/repos\/maloney2323\/Reality\//);
  assert.equal(call.body,null)}
});
test('provider reobservation required after initial evidence before any continuity write',async()=>{
 const e=read();
 let persisted=0;
 await assert.rejects(()=>admitFirstGapBuildTicket({
  scope,providerEvidence:e,persistGap:async()=>{persisted++;return {committed:true}},
  readBackGap:async()=>({verified:true}),
  reobserveProviderEvidence:async()=>({...e,evidence_hash:'f'.repeat(64)})
 }),/FIRST_GAP_FRESH_PROVIDER_GAP_REOBSERVATION_MISMATCH/);
 assert.equal(persisted,0);
 await assert.rejects(()=>admitFirstGapBuildTicket({
  scope,providerEvidence:e,persistGap:async()=>{persisted++;return {committed:true}},
  readBackGap:async()=>({verified:true}),
 }),/FIRST_GAP_INDEPENDENT_REOBSERVATION_REQUIRED/);
 assert.equal(persisted,0);
});

test('one constitutional driver takes real-gap ticket through model and independent sandbox to owner gate only',async()=>{
 const {createFoundationalBuildTicket}=await import('../src/reality-foundational-build-loop-v1.0.js');
 const {createSandboxEvidenceCandidate}=await import('../src/reality-foundational-build-loop-v1.0.js');
 const ticket=createFoundationalBuildTicket({
  owner_id:scope.owner_id,goal_id:scope.goal_id,
  original_work_id:scope.original_work_id,
  goal_transition_receipt_ref:scope.goal_transition_receipt_ref,
  goal_evidence_ref:scope.goal_evidence_ref,
  continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
  confirmed_gap_receipt_ref:'continuity:confirmed:first-178',
  confirmed_gap_evidence_hash:'d'.repeat(64),
  confirmed_gap_source:'INDEPENDENT_PROVIDER_READBACK',
  frozen_regression_manifest_ref:p.manifest_ref,
  frozen_regression_sha256:p.manifest_sha256,
  repository_base_sha:p.run_head_sha,
  allowed_source_roots:['src/reality-extensions/','test/reality-extensions/'],
  environment:'ISOLATED_PREVIEW',max_attempts:3,
 });
 const admitted={proof:'OWNER_SCOPED_PROVIDER_GAP_DURABLY_READ_BACK',
  ticket,gap_continuity_receipt_id:ticket.confirmed_gap_receipt_ref,
  provider_evidence_hash:ticket.confirmed_gap_evidence_hash,
  model_generated:false,installation_authorized:false,
  original_job_completed:false};
 let generate=0,sandbox=0;
 const verifiedEvidence=new Map();
 const gapProof=state=>{
  const receipt={kind:'GAP_CONFIRMED',
   owner_id:ticket.owner_id,goal_id:ticket.goal_id,
   original_work_id:ticket.original_work_id,
   continuity_root_id:ticket.continuity_root_id,
   worldline_id:ticket.worldline_id,
   evidence_ref:ticket.confirmed_gap_receipt_ref,
   evidence_hash:ticket.confirmed_gap_evidence_hash,
   capability_id:'reality.ci-failure-evidence-v1',
   failure_refs:['https://github.com/maloney2323/Reality/actions/runs/'+p.run_id],
   verification_suite_ref:ticket.frozen_regression_manifest_ref};
  verifiedEvidence.set(receipt.evidence_ref,{evidence_hash:receipt.evidence_hash,
   scope_hash:state.checkpoint_hash,
   // the verifier below establishes state.scope_hash from its own request
  });
  return receipt;
 };
 const adapters={
  observeMissingCapability:async ctx=>gapProof(ctx),
  modelGenerate:async ctx=>{
   generate++;
   assert.equal(ctx.execution_authority,false);
   assert.equal(ctx.ticket.original_work_id,ticket.original_work_id);
   return {ticket_hash:ticket.ticket_hash,original_work_id:ticket.original_work_id,
    files:[
     {path:'src/reality-extensions/reality-ci-failure-evidence.mjs',
      content:'export function classifyVerifiedCiFailure(){return {decision:"INSUFFICIENT_EVIDENCE"}}'},
     {path:'test/reality-extensions/ci-evidence.test.js',
      content:'import test from "node:test";test("foundation",()=>{});'},
    ],rationale:'Provider-backed first capability candidate',
    model_response_id:'response:isolated-model-only'};
  },
  isolatedSandbox:async ({candidate})=>{
   sandbox++;
   const report={ticket_hash:ticket.ticket_hash,
    artifact_sha256:candidate.artifact_sha256,
    environment:'ISOLATED_NO_SECRET_CONTAINER',network_disabled:true,
    secrets_mounted:false,production_write_permitted:false,
    frozen_suite_sha256:ticket.frozen_regression_sha256,
    frozen_test_manifest_ref:ticket.frozen_regression_manifest_ref,
    frozen_test_count:7,frozen_test_pass_count:7,exit_code:0,
    governance_tests_passed:true,
    test_results:[{kind:'FROZEN',passed:true},{kind:'MODEL',passed:true}],
    log_excerpt:'# tests 7\\n# pass 7\\n# fail 0',
    runner_receipt_ref:'isolated:sandbox:trusted-test'},
    proof=createSandboxEvidenceCandidate(ticket,candidate,report);
   verifiedEvidence.set('trusted:actual-sandbox:1',{
     evidence_hash:proof.report_hash,runner:proof.runner_receipt_ref});
   return report;
  },
  independentReadback:async req=>{
   assert.equal(req.ticket_hash,ticket.ticket_hash);
   assert.equal(req.frozen_suite_sha256,ticket.frozen_regression_sha256);
   return {...req,independent_provider_readback:true,
    attestation_ref:'trusted:actual-sandbox:1'};
  },
  verifyIndependentReceipt:async req=>{
   const rec=req.receipt;
   const trust=verifiedEvidence.get(rec.evidence_ref);
   if(!trust||rec.evidence_hash!==trust.evidence_hash)return {verified:false};
   if(rec.kind==='SANDBOX_VERIFIED'&&
      (rec.artifact_hash!==req.candidate_hash||
       !rec.independent_tests_passed))return {verified:false};
   return {verified:true,independent_provider_readback:true,
    evidence_ref:rec.evidence_ref,evidence_hash:rec.evidence_hash,
    original_work_id:ticket.original_work_id,
    scope_hash:req.scope_hash,
    attestation_ref:'trusted:readback:'+rec.evidence_ref};
  },
  persistCheckpoint:async state=>{
   assert.equal(state.scope.original_work_id,ticket.original_work_id);
   assert.equal(state.scope.goal_id,ticket.goal_id);
   return {persisted:true,independent_readback_verified:true,
    checkpoint_hash:state.head_hash,
    original_work_id:ticket.original_work_id};
  },
 };
 const r=await generateAfterTrustedGap({
  admitted,adapters,verifiedGovernanceReleaseSha:'b'.repeat(40)});
 assert.equal(r.status,'OWNER_APPROVAL_REQUIRED');
 assert.equal(r.state.phase,'AWAITING_OWNER_APPROVAL');
 assert.equal(r.state.scope.original_work_id,ticket.original_work_id);
 assert.equal(generate,1);assert.equal(sandbox,1);
 assert.equal(r.state.registration,null);
 assert.equal(r.state.resumption,null);
 assert.equal(r.state.settlement,null);
 assert.equal(r.owner_approval_required,true);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.capability_installed,false);
 assert.equal(r.original_job_completed,false);
});
test('constitutional generation refuses incomplete admission before calling model',async()=>{
 let calls=0;
 await assert.rejects(()=>generateAfterTrustedGap({
  admitted:{proof:'MODEL_SAYS_GAP_CONFIRMED'},
  adapters:{modelGenerate:async()=>{calls++}},
  verifiedGovernanceReleaseSha:'b'.repeat(40),
 }),/FIRST_GAP_NO_TRUSTED_TICKET/);
 assert.equal(calls,0);
});
