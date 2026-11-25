import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {needsRealityCapabilityInspection,readRealitySelfVisibilityForChat,
 reconcileOwnerOriginalStatesForChat}
 from '../src/reality-chat-self-visibility-v1.js';
const sha='a'.repeat(40),tree='b'.repeat(40);
const session={user_id:'85eeae0b-2988-43c4-b20c-590fb51da70d',
 config:{url:'https://hvkfreoagbrphwghjajw.supabase.co'}};
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:sha,
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
const db={strictSecrets:true,project:env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF,
 url:session.config.url,secretKey:'x'.repeat(40)};
const paths=[
 'src/reality-governed-self-improvement-driver-v1.0.js',
 'src/reality-evidence-grounded-self-audit-v1.js',
 'src/reality-capability-operating-context-v1.js',
 'src/reality-original-job-roi-evidence-v1.js',
 'src/reality-operational-roi-v2.js',
 'src/reality-conversation-drift-integrity-v0.1.js',
 'src/reality-independent-goal-drift-scorecard-v0.1.js',
 'src/reality-riley-governed-original-job-v1.js',
 'api/reality/personal-chat.js',
 'test/reality-chat-original-work-replay.test.js'
];
const samples=()=>paths.map(path=>({path,type:'blob',sha:'c'.repeat(40)}));
const sourceGet=async(u,request)=>{
 assert.equal(request.method,'GET');
 assert.equal(request.redirect,'error');
 assert.equal(u.includes('/git/commits/')||u.includes('/git/trees/'),true);
 if(u.includes('/git/commits/'))return new Response(JSON.stringify({
  sha,tree:{sha:tree}
 }),{status:200});
 return new Response(JSON.stringify({
  sha:tree,truncated:false,tree:samples()
 }),{status:200});
};
const base={session,message:'Investigate Reality drifting ROI visualization and existing verification capabilities',
 env,db,fetchImpl:sourceGet,
 readAudit:async()=>null};

test('exact current and follow-up owner questions trigger source-backed self-inspection',()=>{
 for(const text of [
  'Why does Reality not see its existing authorization and verification engine?',
  'Investigate the drifting ROI visual that already exists',
  'How can Reality inspect its own source repository?',
  'Reality should see everything it can do and improve',
 ])assert.equal(needsRealityCapabilityInspection(text),true,text);
 assert.equal(needsRealityCapabilityInspection('What is 5 plus 7?'),false);
 assert.equal(needsRealityCapabilityInspection('Yes please',[{
  role:'user',text:'Investigate existing drift and ROI source'
 }]),true);
 assert.equal(needsRealityCapabilityInspection('Yes please',[{
  role:'assistant',text:'I propose another verification engine'
 }]),false,'an old model assertion is not current owner intent');
});

test('read-only pinned repository tree actually identifies existing ROI/drift components',async()=>{
 const result=await readRealitySelfVisibilityForChat(base);
 assert.equal(result.length,1);
 const x=result[0];
 assert.equal(x.event_kind,'reality_pinned_provider_source_capability_inventory');
 assert.equal(x.source_kind,'GITHUB_PINNED_DEPLOYMENT_SOURCE_TREE_READBACK');
 assert.equal(x.source_ref,'https://github.com/maloney2323/Reality/tree/'+sha);
 assert(x.relevant_existing_source_paths.some(p=>p.includes('drift')));
 assert(x.relevant_existing_source_paths.some(p=>p.includes('roi')));
 assert(x.relevant_existing_source_paths.some(p=>p.includes('self-audit')));
 assert.match(x.summary,/existing|EXISTING/i);
 assert.equal(x.installed_capability_proven_by_source_tree,false);
 assert.equal(x.execution_authorized,false);
 assert.equal(x.installation_authorized,false);
 assert.equal(x.production_changed,false);
});

test('live owner audit remains separate from source code presence and proof',async()=>{
 const result=await readRealitySelfVisibilityForChat({...base,
  readSource:async()=>({sha,tree_sha:tree,files:paths}),
  readAudit:async()=>({
   verified_at:'2026-11-15T14:00:00.000Z',
   active_owner_shift_count:1,historical_settlements:1,
   installation_authorized:false,full_shift_automation_proven:false,
   capabilities:Array.from({length:10},(_,i)=>({
    id:i===0?'central_genuine_capability_engine':'known_capability_'+i,
    evidence_ref:'src/reality-genuine-capability-engine-v1.js',
    proof_level:'SOURCE_IMPLEMENTED_RUNTIME_UNVERIFIED',
    can_claim_live:false
   }))
  })
 });
 assert.equal(result.length,2);
 assert.equal(result[1].event_kind,'reality_owner_scoped_existing_capability_audit');
 assert.equal(result[1].capabilities[0].can_claim_live,false);
 assert.equal(result[1].full_shift_automation_proven,false);
 assert.equal(result[1].execution_authorized,false);
});

test('slow audit does not conceal a verified source inventory',async()=>{
 const result=await readRealitySelfVisibilityForChat({...base,
  readSource:async()=>({sha,tree_sha:tree,files:paths}),
  readAudit:async()=>new Promise(()=>{})
 });
 assert.equal(result.length,1);
 assert.equal(result[0].source_kind,'GITHUB_PINNED_DEPLOYMENT_SOURCE_TREE_READBACK');
});

test('unavailable repo or owner audit is UNKNOWN, not missing capability or permission',async()=>{
 const result=await readRealitySelfVisibilityForChat({...base,
  readSource:async()=>{throw Error('provider outage')},
  readAudit:async()=>{throw Error('owner read unavailable')}
 });
 assert.equal(result.length,1);
 assert.equal(result[0].epistemic_status,
  'MODEL_OPERATING_PLAYBOOK_ONLY_LIVE_SOURCE_UNAVAILABLE');
 assert.match(result[0].summary,/UNKNOWN|Do not infer/i);
 assert.equal(result[0].installation_authorized,false);
});

test('wrong owner project or production cannot request repository inspection',async()=>{
 let called=0;
 for(const change of [
  {env:{...env,VERCEL_ENV:'production'}},
  {env:{...env,VERCEL_GIT_COMMIT_SHA:'bad'}},
  {db:{...db,url:'https://foreign.supabase.co'}},
  {session:{...session,user_id:'',config:session.config}},
 ]){
  const result=await readRealitySelfVisibilityForChat({...base,...change,
   readSource:async()=>{called++}
  });
  assert.equal(result.length,0);
 }
 assert.equal(called,0);
});

test('model receives self visibility in both Chat lanes, not solely if employee shift succeeds',()=>{
 const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const api=file('api/reality/personal-chat.js');
 const gateway=file('src/reality-model-gateway-v0.1.js');
 const self=file('src/reality-chat-self-visibility-v1.js');
 assert.match(api,/id:'self_visibility'/);
 assert.match(api,/self_visibility:selfVisibilityObservations/);
 assert.match(api,/\.\.\.selfVisibilityObservations/);
 assert.match(api,/currentObservations:observations,reconciledOriginals/);
 assert.match(api,/makeOwnerUniverseReadModel\(\{\s*observations:ownerCurrentUniverseObservations,reconciledOriginals/);
 assert.match(api,/makeOwnerUniverseReadModel\(\{observations\}\)/);
 assert.match(api,/\.\.\.\(ctx\.values\.self_visibility\|\|\[\]\)/);
 assert.match(api,/verifiedUniverseObservations:ownerUniverse\.observations/);
 assert.match(api,/connected_world_observations:ownerUniverse\.observations/);
 assert.match(gateway,/REALITY SELF-VISIBILITY AND SELF-CORRECTION CONTRACT/);
 assert.match(gateway,/INSPECT -> TEST -> RECONNECT\/REPAIR -> VERIFY/);
 assert.doesNotMatch(self,/createGitHubBranch|writeGitHubFile|installation_authorized:true/);
 assert.match(self,/source_kind:'GITHUB_PINNED_DEPLOYMENT_SOURCE_TREE_READBACK'/);
});

test('a separately verified same-original final receipt supersedes stale admission in Chat ONLY',()=>{
 const completedWork='work:'+'f'.repeat(32),unsettled='work:'+'e'.repeat(32);
 const raw={status:'OWNER_SCOPED_ORIGINAL_WORK_INDEPENDENT_READBACK',
  current_shift_id:null,observed_unfinished_count:2,
  jobs:[
   {original_work_id:completedWork,phase:'SOURCE_ADMITTED',
    independently_settled:false,requires_independent_completion_verification:true},
   {original_work_id:unsettled,phase:'SOURCE_ADMITTED',
    independently_settled:false,requires_independent_completion_verification:true}
  ]};
 const terminal={event_kind:'verified_original_job_temporal_projection',
  source_kind:'AUTHENTICATED_OWNER_SCOPED_EXISTING_CONTINUITY_AND_ORIGINAL_DB_READBACK',
  original_work_id:completedWork,original_job_completed:true,
  independent_original_settlement_verified:true,
  original_final_receipt_id:'681ce4ab-4dd0-47cf-963b-dc65087468fc',
  production_changed:false};
 const projected=reconcileOwnerOriginalStatesForChat({
  ownerOriginalWork:raw,finalObservations:[terminal]
 });
 assert.equal(raw.jobs[0].independently_settled,false,'historical source untouched');
 assert.equal(projected.original_admission_unfinished_count,2);
 assert.equal(projected.effectively_unsettled_original_count,1);
 assert.equal(projected.jobs[0].independently_settled,true);
 assert.equal(projected.jobs[0].source_admission_phase,'SOURCE_ADMITTED');
 assert.equal(projected.jobs[1].independently_settled,false);
 assert.equal(projected.source_projection_disagreements.length,1);
 assert.equal(projected.work_execution_authorized,false);
 assert.equal(projected.installation_authorized,false);
});
test('unverified assistant settlement claims or another original never close a job',()=>{
 const target='work:'+'e'.repeat(32);
 const readback={status:'OWNER_SCOPED_ORIGINAL_WORK_INDEPENDENT_READBACK',
  observed_unfinished_count:1,jobs:[{original_work_id:target,
   phase:'SOURCE_ADMITTED',independently_settled:false}]};
 for(const forged of [
  {event_kind:'owner_independent_original_job_final_receipt',
   source_kind:'MODEL_PROPOSAL',
   original_work_id:target,original_job_completed:true,
   independent_settlement_event_id:'681ce4ab-4dd0-47cf-963b-dc65087468fc',
   production_changed:false},
  {event_kind:'verified_original_job_temporal_projection',
   source_kind:'AUTHENTICATED_OWNER_SCOPED_EXISTING_CONTINUITY_AND_ORIGINAL_DB_READBACK',
   original_work_id:'work:'+'f'.repeat(32),
   independent_original_settlement_verified:true,
   original_job_completed:true,
   original_final_receipt_id:'681ce4ab-4dd0-47cf-963b-dc65087468fc',
   production_changed:false}
 ]){
  const x=reconcileOwnerOriginalStatesForChat({
   ownerOriginalWork:readback,finalObservations:[forged]});
  assert.equal(x.effectively_unsettled_original_count,1);
  assert.equal(x.source_projection_disagreements.length,0);
 }
});
