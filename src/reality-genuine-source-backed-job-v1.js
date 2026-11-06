// Trusted, source-backed original-job adapter for the GENUINE engine.
// Loads one currently authorized unfinished job from private Continuity.
// Independent GitHub API readback is a read-only investigation, never an
// action to install a model-generated capability or retry an external write.
import {createHash} from 'node:crypto';
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';

const WORK=/^work:[a-f0-9]{32}$/;
const SHA40=/^[a-f0-9]{40}$/,SHA64=/^[a-f0-9]{64}$/;
const FILE=/^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/;
const MODULE=/^src\/reality-extensions\/[a-z0-9._-]+\.mjs$/;
const REPO='maloney2323/Reality';
const api='https://api.github.com/repos/'+REPO;
const fail=x=>{throw Error('GENUINE_SOURCE_JOB_'+x)};
async function getJson(fetchImpl,url,{allowMissing=false}={}){
 const r=await fetchImpl(url,{method:'GET',redirect:'error',cache:'no-store',
  headers:{accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-original-source-backed-work-v1'}});
 if(allowMissing&&r.status===404)return null;
 if(!r.ok)fail('INDEPENDENT_GITHUB_READBACK_UNAVAILABLE');
 return r.json();
}
function scopePayload(e,work,session,conversation,goal){
 const p=e?.payload||{};
 return e?.entity_type==='reality_original_source_backed_repair_work'&&
  e.event_kind==='OBSERVATION'&&e.epistemic_status==='VERIFIED'&&
  p.version==='reality-original-source-backed-repair-v1'&&
  p.original_work_id===work&&p.owner_id===session.user_id&&
  p.owner_authorized_investigation===true&&
  p.owner_authorized_installation===false&&
  p.original_job_completed===false&&p.production_changed===false&&
  p.original_goal_id===goal.state.active_goal_id&&
  p.goal_transition_receipt_ref===goal.state.active_goal.last_transition_receipt_id&&
  e.provenance?.principal_id===session.user_id&&
  e.provenance?.conversation_id===conversation&&
  SHA40.test(p.original_source_sha)&&SHA64.test(p.frozen_test_sha256)&&
  FILE.test(p.frozen_test_path)&&MODULE.test(p.source_path)&&
  Number.isSafeInteger(Number(p.original_provider_failed_run_id))&&
  Number.isSafeInteger(Number(p.original_provider_failed_job_id))&&
  validUuid(e.event_id);
}
export function createGenuineSourceBackedJobAdapters({
 session,conversationId,env=process.env,fetchImpl=fetch,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||
    typeof fetchImpl!=='function'||typeof readGoal!=='function'||
    typeof createPersistence!=='function'||env.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  fail('EXACT_AUTHENTICATED_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||
  db.url!==session?.config?.url||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('EXACT_ISOLATED_DATABASE_REQUIRED');
 const store=createPersistence({...db});
 const context=async work=>{
  if(!WORK.test(work))fail('ORIGINAL_WORK_ID_INVALID');
  const goal=await readGoal({session,conversationId,env});
  if(goal?.principal_id!==session.user_id||
    goal?.conversation_id!==conversationId||
    goal?.persisted_source!=='ISOLATED_CONTINUITY_VERIFIED_READBACK'||
    goal?.state?.active_goal?.status!=='ACTIVE'||
    goal.state.active_goal.user_confirmed!==true||
    goal.state.active_goal_id!==goal.state.active_goal.goal_id||
    !validUuid(goal.state.active_goal.last_transition_receipt_id))
   fail('CURRENT_EXPLICIT_OWNER_GOAL_REQUIRED');
  const events=orderContinuityHistory(await store.reconstruct({
   continuityRootId:goal.scope.root,worldlineId:goal.scope.worldline,
  }));
  const sources=events.filter(e=>scopePayload(e,work,session,conversationId,goal));
  if(sources.length!==1)fail('UNIQUE_OWNER_SOURCE_BACKED_UNFINISHED_JOB_REQUIRED');
  if(events.some(e=>e.epistemic_status==='VERIFIED'&&
   e.payload?.original_work_id===work&&
   (e.payload?.original_job_completed===true||
    e.payload?.constitutional_phase==='SETTLED'||
    (e.entity_type==='reality_generic_verified_original_work_outcome'&&
      e.payload?.independent_outcome_verified===true&&
      e.payload?.outcome==='SUCCEEDED'))))
   fail('ORIGINAL_JOB_ALREADY_SETTLED_NO_REPLAY');
  return {source:sources[0],goal};
 };
 async function reobserve(e,work){
  const p=e.payload;
  const run=await getJson(fetchImpl,api+'/actions/runs/'+
   p.original_provider_failed_run_id);
  if(run?.id!==Number(p.original_provider_failed_run_id)||
   run?.head_sha!==p.original_source_sha||
   run?.head_repository?.full_name!==REPO||
   run?.status!=='completed'||run?.conclusion!=='failure')
   fail('ORIGINAL_PROVIDER_RUN_NOT_VERIFIED');
  const jobs=await getJson(fetchImpl,api+'/actions/runs/'+
   p.original_provider_failed_run_id+'/jobs?per_page=100');
  if(!Array.isArray(jobs?.jobs)||!jobs.jobs.some(j=>
   j.id===Number(p.original_provider_failed_job_id)&&
   j.run_id===run.id&&j.head_sha===run.head_sha&&
   j.conclusion==='failure'&&
   j.steps?.some(s=>s.conclusion==='failure')))
   fail('ORIGINAL_FAILED_PROVIDER_JOB_NOT_VERIFIED');
  const file=await getJson(fetchImpl,api+'/contents/'+
   p.frozen_test_path+'?ref='+run.head_sha);
  if(file?.path!==p.frozen_test_path||
   file.encoding!=='base64'||typeof file.content!=='string')
   fail('FROZEN_PROVIDER_SUITE_SOURCE_REQUIRED');
  const frozen=Buffer.from(file.content.replace(/\s/g,''),'base64');
  if(createHash('sha256').update(frozen).digest('hex')!==p.frozen_test_sha256)
   fail('FROZEN_ORIGINAL_SUITE_HASH_MISMATCH');
  const installed=await getJson(fetchImpl,api+'/contents/'+p.source_path+
   '?ref='+run.head_sha,{allowMissing:true});
  if(installed!==null)fail('HISTORICAL_SOURCE_CAPABILITY_NOT_ABSENT');
  // Historical failed CI is not enough: reobserve this DEPLOYED isolated
  // preview commit to reject capabilities already installed since then.
  const currentSha=String(env.VERCEL_GIT_COMMIT_SHA||'');
  if(!SHA40.test(currentSha))fail('CURRENT_PREVIEW_COMMIT_REQUIRED');
  const currentSuite=await getJson(fetchImpl,api+'/contents/'+
   p.frozen_test_path+'?ref='+currentSha);
  if(currentSuite?.path!==p.frozen_test_path||
     currentSuite.encoding!=='base64'||
     typeof currentSuite.content!=='string'||
     createHash('sha256').update(Buffer.from(
       currentSuite.content.replace(/\s/g,''),'base64')).digest('hex')!==
       p.frozen_test_sha256)
   fail('CURRENT_PREVIEW_FROZEN_SUITE_CHANGED');
  const currentCapability=await getJson(fetchImpl,api+'/contents/'+
   p.source_path+'?ref='+currentSha,{allowMissing:true});
  if(currentCapability!==null)fail('CURRENT_PREVIEW_CAPABILITY_ALREADY_PRESENT');
  const cap=p.source_path.split('/').at(-1).replace(/\.mjs$/,'');
  return Object.freeze({
   verified:false,independent:true,independently_verified:true,
   original_work_id:work,
   evidence_kind:'OBSERVED_FAILURE',blocker_class:'MISSING_INSTRUMENT',
   capability_id:cap,
   source_ref:'https://github.com/'+REPO+'/actions/runs/'+run.id,
   verification_suite_ref:'github:frozen-regression:sha256:'+p.frozen_test_sha256,
   external_action_performed:false,
   provider_effect_may_have_occurred:false,no_automatic_retry:false,
  });
 }
 return Object.freeze({
  async loadAuthorizedInternalJob({original_work_id,owner_id,conversation_id,read_only}){
   if(owner_id!==session.user_id||conversation_id!==conversationId||
    read_only!==true)fail('ORIGINAL_OWNER_SCOPE_CHANGED');
   const {source}=await context(original_work_id);
   const work=original_work_id;
   return Object.freeze({
    original_work_id:work,owner_id:session.user_id,
    conversation_id:conversationId,original_job_settled:false,
    execution_previously_completed:false,goal_still_authorized:true,
    work_item:Object.freeze({
     work_item_id:work,workflow_id:'workflow:'+work,
     action:'Independently reconcile missing capability on existing customer job',
     connector:null,operation:'read',consequential:false,
    }),
    authorization:Object.freeze({
     authorization_id:'continuity:'+source.event_id,
     authorized:false,
    }),
    // This read-only provider call never writes a GitHub issue or code.
    connector:Object.freeze({execute:async()=>({
     providerExecutionId:'github:actions:run:'+
      source.payload.original_provider_failed_run_id,
     observation:{historical_failure_verified:true},
    })}),
    independent_verifier:Object.freeze({verify:async()=>reobserve(source,work)}),
    original_source_event_id:source.event_id,
   });
  },
  makeProviderReadback(job){
   return async ({original_work_id,capability_id,source_ref,read_only}={})=>{
    if(read_only!==true||original_work_id!==job.original_work_id)
     fail('READONLY_ORIGINAL_WORK_SCOPE_REQUIRED');
    const {source}=await context(job.original_work_id);
    if(source.event_id!==job.original_source_event_id)
     fail('ORIGINAL_SOURCE_EVENT_CHANGED');
    const observed=await reobserve(source,job.original_work_id);
    if(observed.capability_id!==capability_id||
     observed.source_ref!==source_ref)
     fail('PROVIDER_FAILURE_CHANGED');
    return observed;
   };
  },
 });
}
