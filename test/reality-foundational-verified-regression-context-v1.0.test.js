import test from 'node:test';
import assert from 'node:assert/strict';
import {createFoundationalBuildTicket}
 from '../src/reality-foundational-build-loop-v1.0.js';
import {createVerifiedFrozenRegressionReader}
 from '../src/reality-foundational-verified-regression-context-v1.0.js';
import {createFoundationalModelGenerator}
 from '../src/reality-foundational-model-provider-v1.0.js';
const manifest=JSON.stringify({manifest_ref:'first-ci-evidence-gap-v1',tests:[
 'test/reality-governed-self-improvement-spine-v1.0.test.js',
 'test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js']})+'\n';
const sha='6e6014f38f9fea382ea93b38418ec77e9158c1ef';
const ticket=createFoundationalBuildTicket({
 owner_id:'verified:owner',goal_id:'user-goal:confirmed',
 goal_transition_receipt_ref:'goal:transition:verified',
 goal_evidence_ref:'supabase:user-message:verified',
 original_work_id:'work:'+'f'.repeat(32),
 continuity_root_id:'root:one',worldline_id:'world:one',
 confirmed_gap_receipt_ref:'continuity:gap:confirmed',
 confirmed_gap_evidence_hash:'d'.repeat(64),
 confirmed_gap_source:'INDEPENDENT_PROVIDER_READBACK',
 frozen_regression_manifest_ref:'first-ci-evidence-gap-v1',
 frozen_regression_sha256:'7d0c6aee561c6e6ca4360f80789574b9c11f26729f575858861e18ce647cd4be',
 repository_base_sha:sha,environment:'ISOLATED_PREVIEW',
 max_attempts:3,
 allowed_source_roots:['src/reality-extensions/','test/reality-extensions/'],
});
const names=[
 'test/reality-governed-self-improvement-spine-v1.0.test.js',
 'test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js'
];
const sources=new Map([
 ['test/reality-frozen-regressions/first-ci-evidence-gap-v1.json',manifest],
 [names[0],'import test from "node:test";test("constitutional",()=>{});'],
 [names[1],'import {classifyVerifiedCiFailure} from "../../src/reality-extensions/reality-ci-failure-evidence.mjs";\nimport test from "node:test";test("missing",()=>{});'],
]);
const sourceResponse=(path,overrides={})=>{
 const value=sources.get(path);
 if(!value)throw Error('UNKNOWN_TEST_SOURCE');
 return {ok:true,json:async()=>({
  encoding:'base64',path,size:Buffer.byteLength(value),
  content:Buffer.from(value).toString('base64'),...overrides,
 })};
};
function fake(overrides={}){
 const paths=[];
 const fetchImpl=async url=>{
  const u=new URL(url);
  assert.equal(u.origin,'https://api.github.com');
  assert.equal(u.searchParams.get('ref'),sha);
  const path=decodeURI(u.pathname.split('/contents/')[1]);
  paths.push(path);
  return sourceResponse(path,overrides[path]||{});
 };
 return {paths,fetchImpl};
}
test('real #178 frozen manifest hash and test contents are sent to the model as task data',async()=>{
 const gh=fake(),readFrozenRegression=createVerifiedFrozenRegressionReader({
  fetchImpl:gh.fetchImpl});
 let modelCalls=0,received;
 const model=createFoundationalModelGenerator({
  model:'gpt-test-replaceable',apiKey:'test-model-key-with-length',
  readFrozenRegression,
  fetchImpl:async(url,options)=>{
   assert.equal(url,'https://api.openai.com/v1/responses');
   modelCalls++;
   received=JSON.parse(options.body);
   return {ok:true,json:async()=>({
    id:'response:test-only',output_text:JSON.stringify({
     ticket_hash:ticket.ticket_hash,original_work_id:ticket.original_work_id,
     rationale:'Implement verified frozen contract',
     files:[
      {path:'src/reality-extensions/reality-ci-failure-evidence.mjs',
       content:'export const classifyVerifiedCiFailure=()=>({decision:"INSUFFICIENT_EVIDENCE"});'},
      {path:'test/reality-extensions/reality-ci-evidence.test.js',
       content:'import test from "node:test";test("included",()=>{});'},
     ],
    }),
   })};
  },
 });
 const result=await model({ticket,attempt:1,execution_authority:false});
 assert.equal(result.original_work_id,ticket.original_work_id);
 assert.equal(modelCalls,1);
 assert.deepEqual(gh.paths,[...sources.keys()]);
 const user=received.input[1].content[0].text;
 const prompt=JSON.parse(user);
 assert.equal(prompt.frozen_test_source_status,'GITHUB_PINNED_READ_ONLY_TEST_FILES');
 assert.equal(prompt.verified_frozen_test_source.length,2);
 assert.equal(prompt.verified_frozen_test_source[1].path,names[1]);
 assert.match(prompt.verified_frozen_test_source[1].content,/classifyVerifiedCiFailure/);
 assert.equal(prompt.scope.ticket_hash,ticket.ticket_hash);
 assert.equal(prompt.execution_authority,undefined);
});
test('tampered manifest fails before ANY model request',async()=>{
 const gh=fake({'test/reality-frozen-regressions/first-ci-evidence-gap-v1.json':{
  content:Buffer.from(manifest+' ').toString('base64'),
  size:Buffer.byteLength(manifest+' '),
 }});
 const read=createVerifiedFrozenRegressionReader({fetchImpl:gh.fetchImpl});
 let calls=0;
 const model=createFoundationalModelGenerator({
  model:'gpt-test',apiKey:'test-model-key-with-length',
  readFrozenRegression:read,
  fetchImpl:async()=>{calls++;throw Error('MODEL_MUST_NOT_RUN')},
 });
 await assert.rejects(model({ticket,attempt:1,execution_authority:false}),
  /FOUNDATION_REGRESSION_CONTEXT_FROZEN_MANIFEST_HASH_CHANGED/);
 assert.equal(calls,0);
});
test('unverified repository response path cannot supply model task instructions',async()=>{
 const gh=fake({[names[1]]:{path:'test/foreign-file.test.js'}});
 const read=createVerifiedFrozenRegressionReader({fetchImpl:gh.fetchImpl});
 await assert.rejects(read(ticket),/FOUNDATION_REGRESSION_CONTEXT_SOURCE_CONTENT_UNVERIFIED/);
});
test('a model receives no independent authority from reading the immutable suite',async()=>{
 const gh=fake();
 const context=await createVerifiedFrozenRegressionReader({fetchImpl:gh.fetchImpl})(ticket);
 assert.equal(context.installation_authorized,false);
 assert.equal(context.model_execution_authority,false);
 assert.equal(context.repository_base_sha,sha);
 assert.equal(context.frozen_regression_sha256,ticket.frozen_regression_sha256);
});
