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
  {path:'other.yml'},{run_id:0},{id:0},
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
   /FIRST_GAP_CONTINUITY_READBACK_MISMATCH/);
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
