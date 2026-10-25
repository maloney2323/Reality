// Isolated DB continuity check across three FRESH Node processes.
// Writes ONLY the dedicated Reality benchmark Supabase project.
// No model calls, no production DB, no external customer actions.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {startContinuityRuntime} from '../src/reality-continuity-spine-runtime-v0.1.js';
import {readGroundedEvidence,recordSourceAttestedEvidence} from '../src/reality-reliability-evidence-v0.1.js';

const mode=process.argv[2],project='hvkfreoagbrphwghjajw';
assert.ok(['seed','supersede','verify'].includes(mode),'MODE_REQUIRED');
const e=process.env;
if(e.REALITY_RELIABILITY_BENCHMARK_PROJECT_REF!==project||
 e.REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF!==project||
 e.REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL!=='https://'+project+'.supabase.co'||
 e.VERCEL_ENV!=='preview'||e.REALITY_CONTINUOUS_RELIABILITY_ENABLED!=='true'||
 e.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||!e.REALITY_UNIVERSE_PERSISTENCE_KEY)
 throw Error('ISOLATED_BENCHMARK_DB_SCOPE_OR_CREDENTIAL_MISSING');
if(!/^[0-9]+$/.test(e.GITHUB_RUN_ID||''))throw Error('BENCHMARK_RUN_ID_REQUIRED');
const root='isobench:github-ci-restart:'+e.GITHUB_RUN_ID;
const world='isobench:reality-github-events',worldline='isobench:workflows';
const now=()=>new Date().toISOString();
const hash=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
async function currentSource(which) {
 const id=which==='seed'?40164102484:40164146058;
 const expect=which==='seed'?'failure':'success';
 const res=await fetch('https://api.github.com/repos/maloney2323/Reality/actions/runs/'+id,{
  headers:{authorization:'Bearer '+e.GITHUB_TOKEN,accept:'application/vnd.github+json'},
  signal:AbortSignal.timeout(16000),
 });
 if(!res.ok)throw Error('GITHUB_SOURCE_HTTP_'+res.status);
 const v=await res.json();
 assert.equal(v.conclusion,expect,'REAL_PROVIDER_STATE_CHANGED');
 assert.equal(v.status,'completed');
 return {id,status:expect.toUpperCase(),updated_at:v.updated_at,
  head_sha:v.head_sha,url:v.html_url};
}
async function runtime() {
 return startContinuityRuntime({
  continuityRootSource:root,worldlineSource:worldline,
  subjectId:'isobench:continuity-restart',observedAt:now(),
  signal:buildGovernedChatSignal({
   message:'Retrieve verified workflow status across independent processes.',
   observedAt:now(),
  }),
 });
}
async function history(r){
 const h=await r.readback();return {
  rows:h,grounded:readGroundedEvidence(h,{worldId:world}),
 };
}
if(mode==='seed'){
 const src=await currentSource('seed'),r=await runtime();
 assert.equal(r.status,'PERSISTED');
 const receipt=await recordSourceAttestedEvidence({
  continuityRuntime:r,worldId:world,sourceKind:'CONNECTED_PROVIDER_READBACK',
  sourceRef:src.url,sourceDigest:hash(src),observedAt:now(),
  facts:[{key:'older_run_conclusion',value:src.status},
         {key:'current_pair_conclusion',value:src.status},
         {key:'older_run_source_time',value:src.updated_at}],
 });
 assert.equal(receipt.verified_readback,true);
 console.log('REAL_DB_RESTART_PROBE '+JSON.stringify({
  step:'SEED',current:'FAILURE',readback:true,
  execution:false,production_db:false,
 }));
}else if(mode==='supersede'){
 const src=await currentSource('supersede'),r=await runtime();
 assert.ok(r.prior_event_count>0,'NO_REHYDRATION_ON_SECOND_PROCESS');
 const before=await history(r),previous=before.grounded.facts.find(
  f=>f.key==='current_pair_conclusion');
 assert.equal(previous?.value,'FAILURE');
 assert.ok(previous.evidence_ref);
 const receipt=await recordSourceAttestedEvidence({
  continuityRuntime:r,worldId:world,sourceKind:'CONNECTED_PROVIDER_READBACK',
  sourceRef:src.url,sourceDigest:hash(src),observedAt:now(),
  facts:[{key:'newer_run_conclusion',value:src.status},
         {key:'current_pair_conclusion',value:src.status,
          supersedes_evidence_ref:previous.evidence_ref},
         {key:'newer_run_source_time',value:src.updated_at}],
 });
 assert.equal(receipt.verified_readback,true);
 const after=await history(r);
 assert.equal(after.grounded.facts.find(f=>f.key==='current_pair_conclusion')?.value,'SUCCESS');
 console.log('REAL_DB_RESTART_PROBE '+JSON.stringify({
  step:'SUPERSEDE',current:'SUCCESS',prior_event_count:r.prior_event_count,
  previous_still_stored:after.rows.some(x=>x.event_id===previous.evidence_ref),
  production_db:false,execution:false,
 }));
}else{
 const r=await runtime();
 assert.ok(r.prior_event_count>0,'NO_REHYDRATION_ON_THIRD_PROCESS');
 const data=await history(r);
 const facts=new Map(data.grounded.facts.map(x=>[x.key,x]));
 assert.equal(facts.get('older_run_conclusion')?.value,'FAILURE');
 assert.equal(facts.get('newer_run_conclusion')?.value,'SUCCESS');
 assert.equal(facts.get('current_pair_conclusion')?.value,'SUCCESS');
 for(const state of ['FAILURE','SUCCESS']){
  assert.ok(data.rows.some(x=>x.payload?.event_type==='SOURCE_ATTESTED_EVIDENCE'&&
   x.payload?.facts?.some(f=>f.key==='current_pair_conclusion'&&f.value===state)));
 }
 console.log('REAL_DB_RESTART_PROBE '+JSON.stringify({
  step:'VERIFY_THIRD_PROCESS',current:'SUCCESS',previous:'FAILURE',
  prior_event_count:r.prior_event_count,history_preserved:true,
  production_db:false,execution:false,paid_model_calls:0,
 }));
}
