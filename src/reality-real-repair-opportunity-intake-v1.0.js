// Reality discovers genuinely missing source from original FAILED GitHub
// evidence, then a signed-in owner confirms it into the SAME verified personal
// Continuity goal. The AI cannot create goals or owner approval. This stage
// authorizes investigation only: never install, pay, publish or settle.
import {createHash} from 'node:crypto';
import {validUuid,listPrivateConversations} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
import {observeRealityIssueFailure}
 from './reality-general-provider-failure-observer-v1.0.js';
import {registerOriginalJobCapabilityAutoTrigger}
 from './reality-governed-auto-trigger-v1.0.js';
import {assertOwnerOriginalIssueIdentity}
 from './reality-original-repair-worker-handoff-v1.0.js';
const fail=x=>{throw Error('REALITY_REAL_REPAIR_'+x)};
const ROOT='https://api.github.com/repos/maloney2323/Reality/';
const hash=x=>createHash('sha256').update(x).digest('hex');
const WORK=/^work:[a-f0-9]{32}$/;
const SOURCE=/src\/reality-extensions\/[a-z0-9._/-]+\.mjs/g;
const FROZEN=/test\/reality-frozen-regressions\/[a-z0-9._/-]+\.test\.js/g;
function headers(token){return {
 accept:'application/vnd.github+json',
 'user-agent':'Reality-real-customer-repair-intake-v1',
 'x-github-api-version':'2022-11-28',
 ...(typeof token==='string'&&token.length>20?{authorization:'Bearer '+token}:{})}};
async function provider(path,{token,fetchImpl=fetch,missingAllowed=false}={}){
 const res=await fetchImpl(ROOT+path,{method:'GET',redirect:'error',
  cache:'no-store',headers:headers(token)});
 if(res.status===404&&missingAllowed)return null;
 if(!res.ok)fail('GITHUB_PROVIDER_SOURCE_READBACK_'+res.status);
 return res.json();
}
function pathSafe(path,prefix){
 return typeof path==='string'&&path.startsWith(prefix)&&
  /^[a-z0-9._/-]+$/.test(path)&&!path.includes('//')&&
  !path.split('/').includes('..');
}
export async function verifyRealMissingRepairIssue({
 issueNumber,env=process.env,fetchImpl=fetch,
 observe=observeRealityIssueFailure,
}={}){
 if(!Number.isSafeInteger(issueNumber)||issueNumber<1||issueNumber>100000)
  fail('GITHUB_ISSUE_ID_REQUIRED');
 const token=env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||env.GITHUB_TOKEN||null;
 const issue=await provider('issues/'+issueNumber,{token,fetchImpl});
 if(issue.number!==issueNumber||issue.state!=='open'||issue.pull_request||
  issue.repository_url!==ROOT.slice(0,-1))
  fail('CURRENT_OPEN_REPAIR_ISSUE_REQUIRED');
 const body=String(issue.body||'');
 const sources=[...new Set(body.match(SOURCE)||[])];
 const tests=[...new Set(body.match(FROZEN)||[])];
 if(sources.length!==1||tests.length!==1||
  !pathSafe(sources[0],'src/reality-extensions/')||
  !pathSafe(tests[0],'test/reality-frozen-regressions/'))
  fail('ONE_FROZEN_MISSING_EXTENSION_REQUIRED');
 const originalWorkId='work:'+hash('reality:issue:'+issueNumber).slice(0,32);
 const evidence=await observe({issueNumber,originalWorkId,token,fetchImpl});
 if(evidence?.state!=='VERIFIED_FAILED_CI_AWAITING_FROZEN_REPRODUCTION'||
  evidence.independently_verified_provider_failure!==true||
  !/^[a-f0-9]{40}$/.test(evidence.source_sha||''))
  fail('ACTUAL_ORIGINAL_FAILED_PROVIDER_RUN_REQUIRED');
 const ref=encodeURIComponent(evidence.source_sha);
 const [originalFile,missingModule]=await Promise.all([
  provider('contents/'+tests[0]+'?ref='+ref,{token,fetchImpl}),
  provider('contents/'+sources[0]+'?ref='+ref,
   {token,fetchImpl,missingAllowed:true}),
 ]);
 if(originalFile?.encoding!=='base64'||!originalFile.content||missingModule!==null)
  fail('ACTUAL_SOURCE_GAP_NOT_ESTABLISHED');
 const bytes=Buffer.from(String(originalFile.content).replace(/\s/g,''),'base64').toString('utf8');
 if(!bytes.includes(sources[0].split('/').at(-1))||
  !bytes.includes('node:test')||
  bytes.length>80000)
  fail('ORIGINAL_FROZEN_ACCEPTANCE_DOES_NOT_TEST_EXTENSION');
 return Object.freeze({
  status:'SOURCE_PINNED_MISSING_EXTENSION_READY_FOR_OWNER_REVIEW',
  issue_number:issueNumber,issue_title:String(issue.title||'').slice(0,160),
  issue_url:'https://github.com/maloney2323/Reality/issues/'+issueNumber,
  original_provider_failed_run_id:evidence.run_id,
  original_provider_failed_job_id:evidence.failed_jobs?.[0]?.job_id||null,
  source_sha:evidence.source_sha,
  source_path:sources[0],frozen_test_path:tests[0],
  frozen_test_sha256:hash(bytes),
  actual_provider_failure_hash:evidence.source_evidence_sha256,
  original_work_id_for_provider_observation:originalWorkId,
  independently_verified:true,
  owner_goal_bound:false,installation_authorized:false,
  job_completed:false,production_changed:false,
 });
}
export async function discoverRealRepairOpportunities({
 env=process.env,fetchImpl=fetch,maxIssues=20,
 inspect=verifyRealMissingRepairIssue,
}={}){
 if(!Number.isInteger(maxIssues)||maxIssues<1||maxIssues>40)
  fail('BOUNDED_PROVIDER_DISCOVERY_REQUIRED');
 const token=env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||null;
 const issues=await provider('issues?state=open&per_page='+maxIssues,
  {token,fetchImpl});
 if(!Array.isArray(issues)||issues.length>maxIssues)
  fail('ISSUE_PROVIDER_PAGINATION_UNVERIFIED');
 const candidates=[];
 // Source links are nominations, not proof. Each selected issue is independently
 // checked against its real failing run AND pinned absent module.
 for(const x of issues.filter(i=>!i.pull_request&&
   String(i.body||'').includes('test/reality-frozen-regressions/')&&
   String(i.body||'').includes('src/reality-extensions/')).slice(0,8)){
  try{
   const checked=await inspect({issueNumber:x.number,env,fetchImpl});
   if(checked.independently_verified===true)candidates.push(checked);
  }catch{/* Unverified issue never becomes authorized work */ }
 }
 return Object.freeze({
  status:'INDEPENDENT_SOURCE_BACKED_REPAIR_OPPORTUNITIES',
  opportunities:candidates,examined:issues.length,
  owner_installation_authorized:false,external_action_performed:false,
 });
}
export async function authorizeExistingRealRepairWork({
 session,conversationId,issueNumber,expectedFailedRunId,
 expectedSourceSha,env=process.env,
 discoverIssue=verifyRealMissingRepairIssue,
 listConversations=listPrivateConversations,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
 enqueueAutoTrigger=registerOriginalJobCapabilityAutoTrigger,
 checkOwnerOriginalIdentity=assertOwnerOriginalIssueIdentity,
}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||
  env.VERCEL_ENV!=='preview'||
  env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  fail('AUTHENTICATED_OWNER_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session?.config?.url||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('TRUSTED_OWNER_DATABASE_REQUIRED');
 const own=await listConversations(session);
 if(!Array.isArray(own)||!own.some(c=>c?.conversation_id===conversationId))
  fail('EXISTING_OWNER_CONVERSATION_REQUIRED');
 const evidence=await discoverIssue({issueNumber,env});
 if(evidence.independently_verified!==true||
  evidence.original_provider_failed_run_id!==expectedFailedRunId||
  evidence.source_sha!==expectedSourceSha)
  fail('ISSUE_CHANGED_SINCE_OWNER_REVIEW');
 const goal=await readGoal({session,conversationId,env});
 if(goal.principal_id!==session.user_id||
  goal.conversation_id!==conversationId||
  goal.persisted_source!=='ISOLATED_CONTINUITY_VERIFIED_READBACK'||
  goal.state?.active_goal?.status!=='ACTIVE'||
  goal.state.active_goal.user_confirmed!==true||
  goal.state.active_goal_id!==goal.state.active_goal.goal_id||
  !validUuid(goal.state.active_goal.last_transition_receipt_id))
  fail('AUTHORITATIVE_OWNER_GOAL_REQUIRED');
 const g=goal.state.active_goal,spine=createContinuitySpine({
  continuityRootId:goal.scope.root,worldlineId:goal.scope.worldline,
  subjectId:session.user_id,
 });
 if(spine.continuity_root_id!==goal.state.continuity_root_id)
  fail('SOURCE_GOAL_CANONICAL_SCOPE_CHANGED');
 const workId='work:'+hash(JSON.stringify(['reality-existing-issue-repair-v1',
  session.user_id,conversationId,issueNumber,evidence.source_sha,
  g.last_transition_receipt_id])).slice(0,32);
 if(!WORK.test(workId))fail('ORIGINAL_WORK_ID_INVALID');
 // An issue's earlier authorized customer job retains its original work ID.
 // Stop BEFORE creating any new Continuity event when one exists elsewhere.
 if(env.REALITY_GOVERNED_AUTO_TRIGGER_ENABLED==='true')
  await checkOwnerOriginalIdentity({
   session,issueNumber,expectedOriginalWorkId:workId,env,
  });
 const receiptId=continuityUuidFromSource(
  'reality:owner-reviewed:existing-issue:'+session.user_id+':'+workId);
 const payload={
  version:'reality-original-source-backed-repair-v1',
  owner_id:session.user_id,original_work_id:workId,
  original_goal_id:g.goal_id,goal_id:g.goal_id,
  goal_transition_receipt_ref:g.last_transition_receipt_id,
  issue_number:issueNumber,issue_url:evidence.issue_url,
  original_provider_failed_run_id:evidence.original_provider_failed_run_id,
  original_provider_failed_job_id:evidence.original_provider_failed_job_id,
  original_source_sha:evidence.source_sha,source_path:evidence.source_path,
  frozen_test_path:evidence.frozen_test_path,
  frozen_test_sha256:evidence.frozen_test_sha256,
  provider_failure_evidence_hash:evidence.actual_provider_failure_hash,
  owner_authorized_investigation:true,
  owner_authorized_installation:false,
  original_job_completed:false,production_changed:false,
 };
 const store=createPersistence({...db});
 const fetchHistory=()=>store.reconstruct({
  continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id});
 const history=orderContinuityHistory(await fetchHistory());
 if(!history.some(x=>x.event_id===g.last_transition_receipt_id))
  fail('OWNER_GOAL_SOURCE_EVENT_NOT_IN_CONTINUITY');
 const prev=history.filter(x=>x.event_id===receiptId);
 if(prev.length>1)fail('DUPLICATE_OWNER_REPAIR_WORK');
 if(!prev.length){
  const tail=history.at(-1);
  if(!tail?.event_id||!tail?.lineage_hash)
   fail('CANONICAL_CONTINUITY_TAIL_MISSING');
  const now=new Date().toISOString();
  const node=appendContinuityNode({
   spine,stage:'OBSERVATION',entityId:workId,eventId:receiptId,
   parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
   effectiveTime:now,assertionTime:now,epistemicStatus:'VERIFIED',
   payload,evidenceRefs:[evidence.issue_url,
    'github:actions:run:'+evidence.original_provider_failed_run_id],
   provenance:{source:'reality-real-repair-opportunity-intake-v1',
    principal_id:session.user_id,conversation_id:conversationId},
  });
  await store.appendEvent({...node,
   entity_type:'reality_original_source_backed_repair_work'});
 }
 const checked=orderContinuityHistory(await fetchHistory()).filter(
  x=>x.event_id===receiptId);
 if(checked.length!==1||
  checked[0].entity_type!=='reality_original_source_backed_repair_work'||
  checked[0].payload?.original_work_id!==workId||
  checked[0].payload?.owner_id!==session.user_id||
  checked[0].payload?.frozen_test_sha256!==evidence.frozen_test_sha256||
  checked[0].payload?.goal_transition_receipt_ref!==g.last_transition_receipt_id)
  fail('OWNER_REPAIR_WORK_POST_WRITE_READBACK_FAILED');
 // A verified, owner-confirmed original-work event is sufficient to schedule
 // investigation. It is NOT authority to install, merge or retry a provider
 // action. This fires automatically from the original work registration, not
 // an extra Upgrades dashboard button.
 let autoTrigger=null;
 if(env.REALITY_GOVERNED_AUTO_TRIGGER_ENABLED==='true'){
  try{
   autoTrigger=await enqueueAutoTrigger({
    session,conversationId,originalWorkId:workId,
    originalWorkEventId:receiptId,
    goalTransitionEventId:g.last_transition_receipt_id,
    evidence,env,
   });
   if(autoTrigger.original_work_id!==workId||
      autoTrigger.installation_authorized!==false||
      autoTrigger.original_job_completed!==false)
    throw Error('AUTO_TRIGGER_RECEIPT_NOT_TRUSTED');
  }catch{
   // Original source remains committed. Never fake a trigger or create a
   // duplicate job on retry; an operator/worker must reconcile the source.
   autoTrigger={status:'TRIGGER_REGISTRATION_NEEDS_READBACK',
    original_work_id:workId,installation_authorized:false,
    original_job_completed:false};
  }
 }
 return Object.freeze({
  status:'REAL_OWNER_ORIGINAL_WORK_CONFIRMED',
  governed_auto_trigger:autoTrigger,
  original_work_id:workId,original_conversation_id:conversationId,
  source_receipt_id:receiptId,goal_id:g.goal_id,
  issue_url:evidence.issue_url,
  original_provider_failed_run_id:evidence.original_provider_failed_run_id,
  original_source_sha:evidence.source_sha,
  investigation_authorized:true,installation_authorized:false,
  original_job_completed:false,production_changed:false,
 });
}
