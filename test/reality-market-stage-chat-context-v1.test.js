import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readVerifiedMarketStageForChat}
 from '../src/reality-market-stage-chat-context-v1.js';

const owner='22222222-2222-4222-8222-222222222222';
const url='https://hvkfreoagbrphwghjajw.supabase.co';
const session={user_id:owner,config:{url}};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
const db={url,project:'hvkfreoagbrphwghjajw',strictSecrets:true,secretKey:'test-only'};
const receipt='11111111-1111-4111-8111-111111111111';
const digest='c'.repeat(64);
function evidence(){
 return {ok:true,owner_id:owner,status:'AUTO_REPAIRED_RESEARCH_STAGE_HANDOFF',
  receipt_id:receipt,report_sha256:digest,expected_findings:2,
  stage_handoff_verified:true,read_only:true,
  installation_authorized:false,external_execution_authorized:false,
  production_changed:false,
  items:[0,1].map(i=>({
   finding_fingerprint:String(i).repeat(64),report_sha256:digest,
   phase:'EVIDENCE_INSPECTED_INDEPENDENT_TEST_REQUIRED',
   stage_repair_verified:true,verified_missing_capability:false,
   owner_install_authorized:false})),
  events:['RESEARCH_HANDOFF_ABSENT_DETECTED',
    'AUTO_REPAIRED_INVESTIGATION_HANDOFF',
    'INDEPENDENT_FAILURE_PROOF_STILL_REQUIRED'].map(event_code=>({
     event_code,observed_at:'2026-11-03T19:11:09Z'
    }))};
}
const call=async (data,opts={})=>{
 const seen=[];
 const result=await readVerifiedMarketStageForChat({
  session,message:opts.message||'Reality why did research stop?',
  env:opts.env||env,db:opts.db||db,
  fetchImpl:async (endpoint,request)=>{
   seen.push({endpoint,request});
   return {ok:opts.httpSuccess!==false,json:async()=>data};
  }
 });
 return {result,seen};
};
test('Reality dialogue gets compact, owner-bound source-backed stage repair evidence',async()=>{
 const x=await call(evidence());
 assert.equal(x.result.length,1);
 const observation=x.result[0];
 assert.equal(observation.source_kind,'AUTHENTICATED_OWNER_SERVICE_ROLE_SUPABASE_READBACK');
 assert.equal(observation.source_ref,'reality:market-stage-receipt:'+receipt);
 assert.equal(observation.stage_handoff_verified,true);
 assert.equal(observation.verified_missing_capabilities,0);
 assert.equal(observation.installation_authorized,false);
 assert.equal(observation.external_execution_authorized,false);
 assert.match(observation.summary,/database watchdog restored the READ-ONLY investigation stage/);
 assert.match(observation.summary,/independently reproduced frozen original-job failure/);
 assert.equal(x.seen.length,1);
 assert.equal(x.seen[0].endpoint,url+'/rest/v1/rpc/reality_read_owner_market_stage_v1');
 assert.equal(x.seen[0].request.method,'POST');
 assert.deepEqual(JSON.parse(x.seen[0].request.body),{p_owner_id:owner});
});
test('ordinary chat has no extra market lookup or model influence',async()=>{
 const x=await call(evidence(),{message:'Tell me a joke about frogs.'});
 assert.deepEqual(x.result,[]);
 assert.equal(x.seen.length,0);
});
test('research and capability questions correctly trigger owner evidence',async()=>{
 for(const prompt of ['Reality repair this','why is the research stalled?',
  'What capabilities do we need?','Compare market upgrades and competitors']){
  const x=await call(evidence(),{message:prompt});
  assert.equal(x.result.length,1,prompt);
 }
});
test('cross-owner, forged stages, missing event and authority contamination fail closed',async()=>{
 const changes=[
  r=>{r.owner_id='33333333-3333-4333-8333-333333333333'},
  r=>{r.installation_authorized=true},
  r=>{r.stage_handoff_verified=false},
  r=>{r.items[0].verified_missing_capability=true},
  r=>{r.items[1].phase='CAPABILITY_INSTALLED'},
  r=>{r.items[0].report_sha256='d'.repeat(64)},
  r=>{r.events.pop()},
  r=>{r.expected_findings=3}
 ];
 for(const change of changes){
  const data=evidence();change(data);
  const v=await call(data);
  assert.deepEqual(v.result,[]);
 }
 const untrusted=await call(evidence(),{httpSuccess:false});
 assert.deepEqual(untrusted.result,[]);
});
test('wrong environment or secrets does not permit model grounding',async()=>{
 const badEnv=await call(evidence(),{env:{...env,VERCEL_ENV:'production'}});
 assert.deepEqual(badEnv.result,[]);
 assert.equal(badEnv.seen.length,0);
 const badDb=await call(evidence(),{db:{...db,strictSecrets:false}});
 assert.deepEqual(badDb.result,[]);
 assert.equal(badDb.seen.length,0);
});
test('chat existing governance and atomic publication remain intact',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 assert.match(api,/readVerifiedMarketStageForChat/);
 assert.match(api,/connected_world_observations:marketStageObservations/);
 assert.match(api,/action_authorized:false,execution_authorized:false/);
 assert.match(api,/assertFinalChatPublicationProof/);
 assert.match(api,/publishPrivateAssistantAtomically/);
 assert.doesNotMatch(api,/marketStageObservations.*authorize/i);
});
