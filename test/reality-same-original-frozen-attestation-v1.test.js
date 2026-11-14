import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Import the existing isolated CI broker without invoking Deno's HTTP server.
const source=readFileSync(new URL(
 '../supabase/functions/reality-riley-auto-corrective-ci-v1/index.ts',
 import.meta.url),'utf8');
const savedDeno=globalThis.Deno;
globalThis.Deno={serve:()=>{}};
const {verifyPinnedFrozenCiAttestation}=await import('data:text/javascript;base64,'+
 Buffer.from(source+'\nexport {verifyPinnedFrozenCiAttestation};').toString('base64'));
globalThis.Deno=savedDeno;

const root='https://api.github.com/repos/maloney2323/Reality';
const endpoint='https://hvkfreoagbrphwghjajw.supabase.co/rest/v1/rpc/';
const workflowPath='.github/workflows/reality-riley-auto-corrective-candidate-proof.yml';
const original='work:'+'a'.repeat(32),base='reality/test-isolated-owner-branch';
const branch='reality/riley/auto-corrective-'+original.slice(5)+'-a3';
const attestBranch=branch+'-ci-attest';
const candidateSha='a'.repeat(40),runnerSha='b'.repeat(40);
const attemptId='11111111-2222-4333-8444-555555555555';
const shiftId='22222222-3333-4444-8555-666666666666';
const runId=43653338050;
const runUrl='https://github.com/maloney2323/Reality/actions/runs/'+runId;
const fileFrom=text=>{
 const bytes=Buffer.from(text);
 return {path:workflowPath,encoding:'base64',
  content:bytes.toString('base64'),size:bytes.length,
  sha:createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')};
};
const exactRef='          ref: '+'$'+'{{ github.event.pull_request.head.sha || github.sha }}';
const pathBlock="    paths:\n"+
 "      - 'src/reality-riley-service-original-runtime-v1.js'\n"+
 'permissions:';
const setup='      - uses: actions/setup-node@v4';
const baseWorkflow=[
 'name: Reality independently tested auto-corrective candidate',
 'on:',
 '  pull_request:',
 '    types: [opened, reopened, synchronize]',
 pathBlock,
 'jobs:',
 '  independent-corrective-frozen:',
 '    runs-on: ubuntu-latest',
 '    steps:',
 '      - uses: actions/checkout@v4',
 '        with:',
 '          persist-credentials: false',
 exactRef,
 setup,
 '        with:',
 "          node-version: '22'",
 '      - name: Exact candidate source syntax',
 '        run: node --check src/reality-riley-service-original-runtime-v1.js',
 '      - name: Independent original-job continuity and governed handoff acceptance',
 '        run: |',
 '          node --test test/reality-riley-service-original-runtime-v1.test.js',
 '      - name: Confirm no installation authority in candidate CI',
 '        run: echo no-install',
 ''
].join('\n');
const attestedWorkflow=baseWorkflow
 .replace(exactRef,'          ref: '+candidateSha)
 .replace(setup,'      - name: Verify exact original candidate SHA\n'+
  '        run: test "$(git rev-parse HEAD)" = '+"'"+candidateSha+"'\n"+setup)
 .replace(pathBlock,"    paths:\n"+
  "      - 'src/reality-riley-service-original-runtime-v1.js'\n"+
  "      - '.github/workflows/reality-riley-auto-corrective-candidate-proof.yml'\n"+
  'permissions:');
const claim={attempt_id:attemptId,attempt_number:3,original_work_id:original,shift_id:shiftId};
function harness({tamperWorkflow=false,extraPRFile=false,wrongRunSHA=false,missingCheckout=false,verdict='success'}={}){
 const previous=globalThis.fetch,requests=[];
 const run={id:runId,name:'Reality independently tested auto-corrective candidate',
  event:'pull_request',path:workflowPath,head_sha:wrongRunSHA?'f'.repeat(40):runnerSha,
  head_branch:attestBranch,status:'completed',conclusion:verdict,html_url:runUrl};
 const pr={number:303,state:'open',draft:true,
  head:{ref:attestBranch,sha:runnerSha,repo:{full_name:'maloney2323/Reality'}},
  base:{ref:base,repo:{full_name:'maloney2323/Reality'}}};
 const steps=[
  {name:'Verify exact original candidate SHA',
   conclusion:missingCheckout?'failure':'success'},
  {name:'Exact candidate source syntax',conclusion:'success'},
  {name:'Independent original-job continuity and governed handoff acceptance',
   conclusion:verdict==='success'?'success':'failure'},
  {name:'Confirm no installation authority in candidate CI',conclusion:'success'}
 ];
 globalThis.fetch=async(url,opts={})=>{
  requests.push({url,opts});
  let data;
  if(url===root+'/git/ref/heads/'+attestBranch)
   data={ref:'refs/heads/'+attestBranch,object:{sha:runnerSha}};
  else if(url.startsWith(root+'/pulls?state=open&head='))
   data=[pr];
  else if(url===root+'/pulls/303/files?per_page=100')
   data=[{filename:workflowPath,status:'modified'},
    ...(extraPRFile?[{filename:'src/reality-riley-service-original-runtime-v1.js',
      status:'modified'}]:[])];
  else if(url.startsWith(root+'/contents/'+workflowPath+'?ref='))
   data=fileFrom(tamperWorkflow?attestedWorkflow+'\nmalicious: no':attestedWorkflow);
  else if(url.startsWith(root+'/actions/runs?branch='))
   data={workflow_runs:[run]};
  else if(url===root+'/actions/runs/'+runId)
   data=run;
  else if(url===root+'/actions/runs/'+runId+'/jobs?per_page=60')
   data={jobs:[{id:132626395937,run_id:runId,
    name:'independent-corrective-frozen',status:'completed',
    conclusion:verdict,steps}]};
  else if(url===endpoint+'reality_record_same_original_frozen_ci_attestation_v1'){
   assert.equal(opts.method,'POST');
   const input=JSON.parse(opts.body);
   assert.equal(input.p_attempt_id,attemptId);
   assert.equal(input.p_candidate_commit_sha,candidateSha);
   assert.equal(input.p_workflow_runner_commit_sha,runnerSha);
   assert.equal(input.p_verification_pr_number,303);
   assert.equal(input.p_independent_run_id,runId);
   assert.equal(input.p_independent_run_conclusion,verdict);
   data={status:verdict==='success'?
    'SAME_ORIGINAL_RECOVERY_CI_PASSED_EXACT_INSTALL_APPROVAL_REQUIRED':
    'SAME_ORIGINAL_RECOVERY_CI_FAILED_NEXT_EVIDENCE_BACKED_ATTEMPT_ELIGIBLE',
    attempt_id:attemptId,original_work_id:original,shift_id:shiftId,
    independent_run_id:runId,ci_conclusion:verdict,
    independent_ci_verified:true,installation_authorized:false,
    original_job_completed:false,production_changed:false};
  }else throw Error('UNEXPECTED_REMOTE_CALL '+url);
  return new Response(JSON.stringify(data),{status:200,
   headers:{'content-type':'application/json'}});
 };
 return {requests,restore(){globalThis.fetch=previous}};
}
async function observe(options){
 const mock=harness(options);
 try{
  const response=await verifyPinnedFrozenCiAttestation(claim,'test-only-github',
   base,'test-only-service',
   {text:baseWorkflow,bytes:Buffer.from(baseWorkflow)},branch,candidateSha);
  return {response:response&&await response.json(),requests:mock.requests};
 }finally{mock.restore()}
}
test('SHA-bound original repair passes independent frozen CI without running a different candidate',async()=>{
 const {response,requests}=await observe({});
 assert.equal(response.status,'CORRECTIVE_CI_PASSED_EXACT_INSTALL_REVIEW_REQUIRED');
 assert.equal(response.attempt_id,attemptId);
 assert.equal(response.candidate_commit_sha,candidateSha);
 assert.equal(response.verification_runner_commit_sha,runnerSha);
 assert.equal(response.exact_pinned_source_attestation,true);
 assert.equal(response.independent_ci_verified,true);
 assert.equal(response.installation_authorized,false);
 assert.equal(response.original_job_completed,false);
 assert.equal(response.production_changed,false);
 assert.equal(requests.filter(x=>x.url===endpoint+
  'reality_record_same_original_frozen_ci_attestation_v1').length,1);
});
test('CI attestation cannot smuggle additional repository changes',async()=>{
 await assert.rejects(observe({extraPRFile:true}),
  /PINNED_CI_ONLY_WORKFLOW_MAY_CHANGE/);
});
test('CI workflow must be an EXACT deterministic rewrite of trusted base workflow',async()=>{
 await assert.rejects(observe({tamperWorkflow:true}),
  /PINNED_CI_WORKFLOW_UNTRUSTED_CHANGE/);
});
test('inconsistent run head SHA is not eligible and cannot write a CI receipt',async()=>{
 const {response,requests}=await observe({wrongRunSHA:true});
 assert.equal(response,null);
 assert.equal(requests.some(x=>x.url===endpoint+
  'reality_record_same_original_frozen_ci_attestation_v1'),false);
});
test('absent exact original checkout evidence never becomes independent CI',async()=>{
 await assert.rejects(observe({missingCheckout:true}),
  /PINNED_CI_FROZEN_JOB_STEPS_NOT_PROVEN/);
});
test('legitimate original acceptance failure is recorded as CI failure, not an installation',async()=>{
 const {response}=await observe({verdict:'failure'});
 assert.equal(response.status,'CORRECTIVE_CI_REJECTED_ORIGINAL_REMAINS_OPEN');
 assert.equal(response.installation_authorized,false);
 assert.equal(response.original_job_completed,false);
});
test('durable attestation stores runner SHA and tested candidate SHA separately and atomically',()=>{
 const sql=readFileSync(new URL(
 '../supabase/migrations/20261114_same_original_frozen_ci_attestation_v1.sql',
 import.meta.url),'utf8');
 assert.match(sql,/workflow_runner_commit_sha text NOT NULL/);
 assert.match(sql,/candidate_commit_sha text NOT NULL/);
 assert.match(sql,/independent_run_id bigint UNIQUE NOT NULL/);
 assert.match(sql,/GRANT SELECT,INSERT ON reality_internal.riley_same_original_frozen_ci_attestations_v1 TO service_role/);
 assert.match(sql,/reality_read_current_shift_execution_graph_v1/);
 assert.match(sql,/reality_record_same_original_recovery_ci_v2/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.doesNotMatch(sql,/GRANT EXECUTE[^;]*authenticated/i);
 assert.doesNotMatch(sql,/DELETE FROM reality_internal|DROP TABLE/i);
});
