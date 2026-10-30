import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createFoundationalBuildTicket,validateFoundationalCandidate,
 classifyFoundationalFailure,createSandboxEvidenceCandidate,
 independentlyVerifySandbox,runFoundationalGenerationSandboxLoop}
 from '../src/reality-foundational-build-loop-v1.0.js';
import {createFoundationalModelGenerator}
 from '../src/reality-foundational-model-provider-v1.0.js';
import {createIsolatedDockerSandbox,validateTrustedFrozenSuite}
 from '../src/reality-foundational-sandbox-adapter-v1.0.js';
const sha=x=>createHash('sha256').update(x).digest('hex');
const manifest=JSON.stringify({manifest_ref:'frozen-v1',tests:[
 'test/frozen-baseline.test.js','test/reality-governed-self-improvement-spine-v1.0.test.js']});
const scope={owner_id:'owner:verified',goal_id:'user-goal:durable',
 goal_transition_receipt_ref:'universe:goal-receipt',
 goal_evidence_ref:'supabase:verified-user-message',
 original_work_id:'work:'+'a'.repeat(32),
 continuity_root_id:'root:one',worldline_id:'world:one',
 confirmed_gap_receipt_ref:'provider:gap-receipt',
 confirmed_gap_evidence_hash:'sha256:independent-gap',
 confirmed_gap_source:'INDEPENDENT_PROVIDER_READBACK',
 frozen_regression_manifest_ref:'frozen-v1',
 frozen_regression_sha256:sha(manifest),repository_base_sha:'b'.repeat(40),
 environment:'ISOLATED_PREVIEW',max_attempts:3,
 allowed_source_roots:['src/reality-extensions/','test/reality-extensions/']};
const ticket=createFoundationalBuildTicket(scope);
const proposal=()=>({ticket_hash:ticket.ticket_hash,
 original_work_id:ticket.original_work_id,rationale:'Repair verified missing capability',
 files:[{path:'src/reality-extensions/fix.mjs',content:'export const fixed=true;'},
 {path:'test/reality-extensions/fix.test.js',
 content:'import test from "node:test";test("valid",()=>{});'}]});
const candidate=()=>validateFoundationalCandidate(ticket,proposal());
const report=(c,pass=true,missing_dependency=null)=>({
 ticket_hash:ticket.ticket_hash,artifact_sha256:c.artifact_sha256,
 environment:'ISOLATED_NO_SECRET_CONTAINER',
 network_disabled:true,secrets_mounted:false,production_write_permitted:false,
 frozen_suite_sha256:ticket.frozen_regression_sha256,
 frozen_test_manifest_ref:ticket.frozen_regression_manifest_ref,
 frozen_test_count:2,frozen_test_pass_count:pass?2:1,
 exit_code:pass?0:1,test_results:[{passed:pass}],governance_tests_passed:pass,
 log_excerpt:pass?'# pass 2':'not ok 2 - authority regression',
 missing_dependency,runner_receipt_ref:'github:run:frozen:1'});
function harness(sequence){
 const db=new Map(),receipts=new Map(),requests=[];
 return {requests,adapters:{
  modelGenerate:async request=>{requests.push(request);return proposal();},
  isolatedSandbox:async ({candidate:c,attempt})=>{
   const status=sequence[attempt-1];const r=report(c,status==='PASS',status==='MISSING'?'rpc:new-capability':null);
   const evidence=createSandboxEvidenceCandidate(ticket,c,r);
   receipts.set(evidence.report_hash,evidence);return r;
  },
  independentReadback:async x=>{
   const actual=receipts.get(x.report_hash);
   if(!actual||actual.artifact_sha256!==x.artifact_sha256)
    return {independent_provider_readback:false};
   return {...x,independent_provider_readback:true,attestation_ref:'github:attested:'+x.report_hash};
  },
  continuity:{persist:async r=>{db.set(r.attempt,r);return {committed:true}},
   readback:async x=>db.get(x.attempt)},
 }};
}
test('trusted ticket preserves owner, goal, original work, frozen suite and attempt budget',()=>{
 assert.equal(ticket.environment,'ISOLATED_PREVIEW');
 assert.equal(ticket.max_attempts,3);
 assert.ok(Object.isFrozen(ticket));
 assert.equal(ticket.ticket_hash.length,64);
});
test('production, model-claimed gap, unbounded retries and path-shaped manifest are rejected',()=>{
 for(const patch of [{environment:'production'},{max_attempts:0},{max_attempts:9},
  {confirmed_gap_source:'MODEL_SAYS_VERIFIED'},
  {frozen_regression_manifest_ref:'../../hidden'}])
  assert.throws(()=>createFoundationalBuildTicket({...scope,...patch}),/FOUNDATION_/);
});
test('model cannot change owner-bound ticket or original work, even while reporting installed',()=>{
 assert.throws(()=>validateFoundationalCandidate(ticket,{...proposal(),ticket_hash:'forged'}),
  /FOUNDATION_GENERATION_GOAL_DRIFT/);
 assert.throws(()=>validateFoundationalCandidate(ticket,{...proposal(),original_work_id:'work:'+'c'.repeat(32)}),
  /FOUNDATION_GENERATION_WORK_DRIFT/);
 const c=validateFoundationalCandidate(ticket,{...proposal(),installed:true,authority_granted:true});
 assert.equal(c.installed,false);assert.equal(c.authority_granted,false);
});
test('candidate paths cannot edit auth, endpoints, constitution, GitHub workflows or parent directory',()=>{
 for(const path of ['api/reality/personal-chat.js','src/reality-private-chat-auth-v0.1.js',
  '.github/workflows/production.yml','src/reality-governed-self-improvement-spine-v1.0.js',
  'test/reality-extensions/../../package.json']){
  const p=proposal();p.files[0].path=path;
  assert.throws(()=>validateFoundationalCandidate(ticket,p),
   /FOUNDATION_MODEL_PATH_ESCAPED_BOUNDARY/);
 }
});
test('candidate requires unique source and tests, not an empty model output',()=>{
 let p=proposal();p.files[1].path=p.files[0].path;
 assert.throws(()=>validateFoundationalCandidate(ticket,p),/FOUNDATION_DUPLICATE_MODEL_PATH/);
 p=proposal();p.files=[p.files[0]];
 assert.throws(()=>validateFoundationalCandidate(ticket,p),/FOUNDATION_CANDIDATE_FILES_REQUIRED|FOUNDATION_SOURCE_AND_TEST_REQUIRED/);
});
test('sandbox must prove no network, no secrets, exact artifact and frozen test counts',()=>{
 const c=candidate();
 for(const patch of [{network_disabled:false},{secrets_mounted:true},
  {frozen_test_count:0},{frozen_suite_sha256:'forged'},{artifact_sha256:'forged'}])
  assert.throws(()=>createSandboxEvidenceCandidate(ticket,c,{...report(c),...patch}),/FOUNDATION_/);
});
test('model JSON saying passed cannot replace independent readback attestation',async()=>{
 const c=candidate(),e=createSandboxEvidenceCandidate(ticket,c,report(c));
 await assert.rejects(independentlyVerifySandbox(ticket,c,e,{
  readback:async()=>({independent_provider_readback:true,attestation_ref:'fake'})
 }),/FOUNDATION_SANDBOX_INDEPENDENT_EVIDENCE_MISSING/);
});
test('missing database function and owner authority are distinct from source errors',()=>{
 assert.equal(classifyFoundationalFailure({missing_dependency:'rpc:register'}),'MISSING_CAPABILITY');
 assert.equal(classifyFoundationalFailure({log_excerpt:'OWNER_APPROVAL_REQUIRED'}),'AUTHORITY_REQUIRED');
 assert.equal(classifyFoundationalFailure({log_excerpt:'SyntaxError: nope'}),'SYNTAX');
 assert.equal(classifyFoundationalFailure({exit_code:1,log_excerpt:'not ok 3'}),'TEST_REGRESSION');
});
test('model automatically corrects from independent test feedback, then stops for approval',async()=>{
 const h=harness(['FAIL','PASS']);
 const out=await runFoundationalGenerationSandboxLoop({ticket,adapters:h.adapters});
 assert.equal(out.status,'AWAITING_EXACT_OWNER_APPROVAL');
 assert.equal(out.attempt_count,2);assert.equal(h.requests.length,2);
 assert.equal(h.requests[1].verified_feedback.classification,'TEST_REGRESSION');
 assert.equal(out.installation_authorized,false);assert.equal(out.original_job_completed,false);
});
test('missing dependency escalates without hallucinating endless repairs',async()=>{
 const h=harness(['MISSING']);
 const out=await runFoundationalGenerationSandboxLoop({ticket,adapters:h.adapters});
 assert.equal(out.status,'ESCALATED_WITH_INDEPENDENT_EVIDENCE');
 assert.equal(out.reason,'MISSING_CAPABILITY');assert.equal(h.requests.length,1);
});
test('three independent failures exhaust budget and never claim finished',async()=>{
 const h=harness(['FAIL','FAIL','FAIL']);
 const out=await runFoundationalGenerationSandboxLoop({ticket,adapters:h.adapters});
 assert.equal(out.status,'ATTEMPT_BUDGET_EXHAUSTED');assert.equal(h.requests.length,3);
 assert.equal(out.original_job_completed,false);
});
test('missing durable checkpoint readback blocks next model request',async()=>{
 const h=harness(['FAIL','PASS']);h.adapters.continuity.readback=async()=>null;
 await assert.rejects(runFoundationalGenerationSandboxLoop({ticket,adapters:h.adapters}),
  /FOUNDATION_CHECKPOINT_NOT_DURABLY_READ_BACK/);
 assert.equal(h.requests.length,1);
});
test('OpenAI adapter proposes bounded JSON without giving secret to model input',async()=>{
 let captured=null;
 const gen=createFoundationalModelGenerator({model:'gpt-5.6-luna',apiKey:'secret-test-redacted',
  fetchImpl:async(u,opts)=>{captured=opts;return {ok:true,json:async()=>({
   id:'resp_1',output_text:JSON.stringify(proposal())})};}});
 const c=await gen({ticket,attempt:1,execution_authority:false});
 assert.equal(c.model_response_id,'resp_1');assert.equal(c.authority_granted,false);
 assert.ok(!captured.body.includes('secret-test-redacted'));
});
test('model cannot retry using fabricated test feedback',async()=>{
 const gen=createFoundationalModelGenerator({model:'gpt-5.6-luna',
  apiKey:'secret-test-redacted'});
 await assert.rejects(gen({ticket,attempt:2,execution_authority:false,
  previous_candidate:candidate(),
  verified_feedback:{kind:'MODEL_SAYS_FAILED'}}),
  /FOUNDATION_REPAIR_REQUIRES_INDEPENDENT_FAILURE/);
});
test('Docker adapter requires digest pin and unchanged frozen manifest',()=>{
 assert.throws(()=>createIsolatedDockerSandbox({workspace:'none',image:'node:22-alpine'}),
  /FOUNDATION_SANDBOX_DIGEST_PIN_REQUIRED/);
 assert.throws(()=>validateTrustedFrozenSuite(ticket,'{}','/tmp'),
  /FOUNDATION_FROZEN_MANIFEST_CHANGED/);
});
test('sandbox only runs candidate code in secret-free, read-only, no-network Docker',async()=>{
 const root=mkdtempSync(join(tmpdir(),'reality-foundation-test-'));
 try{
  for(const path of ['package.json','src/base.mjs','test/frozen-baseline.test.js',
   'test/reality-frozen-regressions/frozen-v1.json',
   'test/reality-governed-self-improvement-spine-v1.0.test.js']){
   const file=join(root,path);mkdirSync(dirname(file),{recursive:true});
   writeFileSync(file,path.endsWith('.json')?
    path.includes('frozen-v1')?manifest:'{"type":"module"}':'export const x=true;');
  }
  const calls=[];
  const spawn=(name,args,opts)=>{
   calls.push({name,args,opts});
   return {status:0,stdout:'TAP version 13\n# tests 2\n# pass 2\n# fail 0\n',stderr:''};
  };
  const run=createIsolatedDockerSandbox({workspace:root,
   image:'node@sha256:'+'a'.repeat(64),spawn,
   readBaseSha:()=>ticket.repository_base_sha});
  const result=await run({ticket,candidate:candidate(),attempt:1,
   frozen_suite_ref:'frozen-v1',network_permitted:false,secrets_permitted:false});
  assert.equal(result.exit_code,0);assert.equal(result.frozen_test_count,2);
  assert.equal(calls.length,2);
  for(const c of calls){
   assert.equal(c.name,'docker');
   assert.equal(c.args[c.args.indexOf('--network')+1],'none');
   assert.ok(c.args.includes('--read-only'));
   assert.ok(!Object.keys(c.opts.env).some(k=>/TOKEN|SECRET|GITHUB|OPENAI/.test(k)));
  }
 }finally{rmSync(root,{recursive:true,force:true})}
});
test('sandbox refuses even well-tested source if the base repository SHA moves',async()=>{
 const root=mkdtempSync(join(tmpdir(),'reality-base-sha-'));
 try{
  for(const p of ['package.json','src/base.mjs','test/base.test.js']){
   const target=join(root,p);mkdirSync(dirname(target),{recursive:true});
   writeFileSync(target,'{}');
  }
  const runner=createIsolatedDockerSandbox({workspace:root,
   image:'node@sha256:'+'f'.repeat(64),
   readBaseSha:()=> 'c'.repeat(40),
   spawn:()=>{throw Error('SANDBOX_SHOULD_NOT_EXECUTE')}});
  await assert.rejects(runner({ticket,candidate:candidate(),attempt:1,
   frozen_suite_ref:'frozen-v1',network_permitted:false,secrets_permitted:false}),
   /FOUNDATION_SANDBOX_BASE_COMMIT_CHANGED/);
 }finally{rmSync(root,{recursive:true,force:true})}
});

test('Real #178: frozen test quoting missing capability remains a repairable regression',()=>{
 const actual={...report(candidate(),false),exit_code:1,
  test_results:[{kind:'FROZEN',passed:false},{kind:'MODEL_CANDIDATE',passed:false}],
  log_excerpt:[
   'not ok 3 - absent provider provenance or incomplete exact hash cannot start generation',
   'AssertionError [ERR_ASSERTION]:',
   "  + 'MISSING_CAPABILITY'",
   "  - 'INSUFFICIENT_EVIDENCE'",
   'ReferenceError: describe is not defined',
  ].join('\n'),
 };
 assert.equal(classifyFoundationalFailure(actual),'TEST_REGRESSION');
 const explicit={...actual,missing_dependency:'trusted:provider:missing_rpc'};
 assert.equal(classifyFoundationalFailure(explicit),'MISSING_CAPABILITY');
});
