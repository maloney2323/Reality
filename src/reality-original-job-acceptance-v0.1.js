// Exact original-work (#143) acceptance evidence, NOT job closure.
// Sources: authenticated original Continuity, independent GitHub run
// readback, historical failing test source, and current passing commit source.
// This does not authorize or invoke a new GitHub write or deploy.
import {inspectAuthenticatedOriginalJobRecoveryLoop}
 from './reality-real-recovery-coordinator-v0.1.js';
// Source verification for public GitHub evidence must not depend on the
// separate write-capable REALITY_GITHUB_TOKEN used for issue/PR actions.
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {validUuid} from './reality-private-chat-store-v0.1.js';
export const PERSONAL_REPAIR_ACCEPTANCE_VERSION='reality-personal-repair-acceptance-v0.1';
const REPO='maloney2323/Reality';
const ORIGINAL_WORK='work:24cda9611404e9bcb47909976067605c';
const ORIGINAL_FAIL_MERGE='c8f0b861e1fac6cda7826aed9f36a2666d124eda';
const TEST_PATH='test/reality-personal-discovered-work-handoff-v0.1.test.js';
const TITLE='Reality recurring work: repair repeated Reality Governed Execution Engine v0.1 failures';
const fail=c=>{throw Error(c)};
const PUBLIC_GITHUB_API='https://api.github.com';
const ROOT='/repos/'+REPO;
// The acceptance operation is a strictly read-only, bounded public-source
// verifier; it cannot browse arbitrary GitHub repositories or touch issue/PR
// writes. Historical/current source refs are exact SHA-40, never branch labels.
export async function getPublicOriginalRepairEvidence(path,{fetchImpl=fetch}={}){
 const sourcePrefix=ROOT+'/contents/'+TEST_PATH+'?ref=';
 const allowed=path===ROOT+'/issues/143'||
   (typeof path==='string'&&path.startsWith(sourcePrefix)&&
    /^[a-f0-9]{40}$/.test(path.slice(sourcePrefix.length)));
 if(!allowed)fail('ACCEPTANCE_PUBLIC_READ_PATH_OUT_OF_SCOPE');
 const response=await fetchImpl(PUBLIC_GITHUB_API+path,{
  method:'GET',
  headers:{
   Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28',
   'User-Agent':'Reality-Original-Repair-Acceptance-ReadOnly',
  },
 });
 if(!response?.ok)fail('ACCEPTANCE_GITHUB_PUBLIC_READBACK_UNAVAILABLE');
 let data;
 try{data=await response.json()}
 catch{fail('ACCEPTANCE_GITHUB_PUBLIC_JSON_INVALID')}
 if(!data||typeof data!=='object'||Array.isArray(data))
  fail('ACCEPTANCE_GITHUB_PUBLIC_EVIDENCE_INVALID');
 return data;
}

function trustedSource(response){
 if(response?.type!=='file'||response.encoding!=='base64'||
    typeof response.content!=='string'||response.content.length>180000)
  fail('ACCEPTANCE_GITHUB_SOURCE_READBACK_INVALID');
 const decoded=Buffer.from(response.content.replace(/\s+/g,''),'base64').toString('utf8');
 if(decoded.length<1000||decoded.length>135000)
  fail('ACCEPTANCE_GITHUB_SOURCE_CONTENT_BOUNDS');
 return decoded;
}
export function classifyOriginalRepairAcceptance({
 report,oldSource,newSource,issue,
}={}){
 if(report?.original_work_id!==ORIGINAL_WORK||
    report.original_job_completed!==false||
    report.action_authorized!==false||
    report.external_action_performed!==false||
    report.current_decision!=='RECHECK_ACCEPTANCE_NO_UPGRADE_NEEDED'||
    report.provider_status!=='LATER_SUCCESSFUL_CI_RUN_INDEPENDENTLY_OBSERVED'||
    !/^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/[1-9][0-9]*$/.test(
     String(report.provider_passing_run||''))||
    typeof oldSource!=='string'||typeof newSource!=='string'||
    issue?.number!==143||issue?.state!=='open'||
    issue?.title!==TITLE)
  fail('ACCEPTANCE_ORIGINAL_JOB_OR_EVIDENCE_UNVERIFIED');
 const begin="test('Home checks signed-in goal before preparing source work and never silently executes'";
 const oldAt=oldSource.indexOf(begin),nowAt=newSource.indexOf(begin);
 if(oldAt<0||nowAt<0)fail('ACCEPTANCE_SAME_TEST_CASE_NOT_FOUND');
 const oldTest=oldSource.slice(oldAt,oldAt+1450);
 const newTest=newSource.slice(nowAt,nowAt+1850);
 const oldUnscoped=oldTest.includes("const sign=html.indexOf(")&&
  oldTest.includes("const goal=html.indexOf(")&&
  oldTest.includes("const prepare=html.indexOf(")&&
  oldTest.includes('sign<goal&&goal<prepare&&prepare<consent&&consent<approval');
 const newScoped=newTest.includes('const guidedStart=html.indexOf(')&&
  newTest.includes('const guidedEnd=html.indexOf(')&&
  newTest.includes('const guided=html.slice(guidedStart,guidedEnd)')&&
  newTest.includes('const sign=guided.indexOf(')&&
  newTest.includes('const goal=guided.indexOf(')&&
  newTest.includes('const prepare=guided.indexOf(')&&
  newTest.includes('const approval=guided.indexOf(');
 if(!oldUnscoped||!newScoped)
  fail('ACCEPTANCE_HISTORICAL_TEST_CAUSE_OR_FIX_NOT_CONFIRMED');
 return Object.freeze({
  version:PERSONAL_REPAIR_ACCEPTANCE_VERSION,
  original_work_id:ORIGINAL_WORK,
  original_goal_id:report.original_goal_id,
  recovery_receipt_id:report.recovery_receipt_id,
  cause:'HISTORICAL_TEST_MATCHED_UNRELATED_PAGE_FLOW',
  fix:'TEST_SCOPED_TO_INTENDED_GUIDED_ATTENTION_HANDLER',
  historical_failing_source_commit:ORIGINAL_FAIL_MERGE,
  historical_failing_source_url:'https://github.com/'+REPO+'/commit/'+ORIGINAL_FAIL_MERGE,
  later_passing_run_url:report.provider_passing_run,
  source_correction_verified:true,
  provider_current_success_verified:true,
  root_cause_classification:'TEST_ASSERTION_SCOPE_NOT_RUNTIME_EXECUTOR_DEFECT',
  original_issue_state:'open',
  assessment:'EVIDENCE_SUPPORTS_CORRECTION_AWAITING_OWNER_ACCEPTANCE',
  full_original_job_completed:false,
  autonomously_generated_patch:false,
  owner_authorized_issue_closure:false,
  original_issue_closed:false,
  external_action_performed:false,
  action_authorized:false,
 });
}
export async function assessAuthenticatedOriginalRepair({
 session,conversationId,workId,env=process.env,
 inspect=inspectAuthenticatedOriginalJobRecoveryLoop,
 get=getPublicOriginalRepairEvidence,
}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||
    workId!==ORIGINAL_WORK||env.VERCEL_ENV!=='preview')
  fail('ACCEPTANCE_AUTHENTICATED_SAME_WORK_REQUIRED');
 const report=await inspect({session,conversationId,workId,env});
 if(report?.original_work_id!==ORIGINAL_WORK||
    report?.provider_status!=='LATER_SUCCESSFUL_CI_RUN_INDEPENDENTLY_OBSERVED')
  fail('ACCEPTANCE_LATER_PASS_NOT_INDEPENDENTLY_RECHECKED');
 // The source correction must exist in the exact commit that passed CI.
 // Never infer success from a branch name or a model-provided summary.
 const passedSha=String(report?.provider_passing_sha||'');
 if(!/^[a-f0-9]{40}$/.test(passedSha))
  fail('ACCEPTANCE_PROVEN_PASS_COMMIT_REQUIRED');
 const root='/repos/'+REPO;
 const [historical,current,issue]=await Promise.all([
  get(root+'/contents/'+TEST_PATH+'?ref='+ORIGINAL_FAIL_MERGE),
  get(root+'/contents/'+TEST_PATH+'?ref='+passedSha),
  get(root+'/issues/143'),
 ]);
 return Object.freeze({
  ...classifyOriginalRepairAcceptance({
   report,oldSource:trustedSource(historical),
   newSource:trustedSource(current),issue:{
    number:issue?.number,state:issue?.state,title:issue?.title,
   },
  }),
  independently_checked_fix_commit:passedSha,
 });
}
export async function saveAuthenticatedOriginalRepairAssessment({
 session,conversationId,workId,env=process.env,
 assess=assessAuthenticatedOriginalRepair,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 const proof=await assess({session,conversationId,workId,env});
 if(proof.original_work_id!==workId||
    proof.source_correction_verified!==true||
    proof.provider_current_success_verified!==true||
    proof.full_original_job_completed!==false||
    proof.action_authorized!==false||
    proof.external_action_performed!==false||
    !/^[a-f0-9]{40}$/.test(proof.independently_checked_fix_commit||''))
  fail('ACCEPTANCE_SOURCE_AND_EFFECT_CONTRACT_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||!db.secretKey||
    db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('ACCEPTANCE_OWNER_ISOLATED_CONTINUITY_REQUIRED');
 const goal=await readGoal({session,conversationId,env});
 if(goal?.principal_id!==session.user_id||
    goal?.conversation_id!==conversationId||
    goal?.state?.active_goal_id!==proof.original_goal_id)
  fail('ACCEPTANCE_ORIGINAL_GOAL_CHANGED');
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,
  worldlineId:goal.scope.worldline,
  subjectId:session.user_id,
 });
 if(spine.continuity_root_id!==goal.state.continuity_root_id)
  fail('ACCEPTANCE_CANONICAL_SCOPE_CHANGED');
 const store=createPersistence({...db});
 const read=()=>store.reconstruct({
  continuityRootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id,
 });
 const history=orderContinuityHistory(await read());
 const diagnosis=history.filter(e=>e.entity_type==='personal_recovery_diagnosis'&&
   e.payload?.original_work_id===workId&&
   e.payload?.original_job_completed===false&&
   e.payload?.recovery_receipt_id===proof.recovery_receipt_id);
 if(diagnosis.length!==1)
  fail('ACCEPTANCE_PRIOR_PERSISTED_DIAGNOSIS_REQUIRED');
 const id=continuityUuidFromSource(
  'personal-repair-source-acceptance:'+workId+':'+
  proof.independently_checked_fix_commit);
 const prior=history.filter(e=>e.event_id===id);
 if(prior.length>1)fail('ACCEPTANCE_CONFLICTING_RECEIPTS');
 if(prior.length){
  if(prior[0].entity_type!=='personal_recovery_acceptance_evidence'||
     prior[0].payload?.original_work_id!==workId||
     prior[0].payload?.full_original_job_completed!==false||
     prior[0].payload?.independently_checked_fix_commit!==proof.independently_checked_fix_commit)
   fail('ACCEPTANCE_PRIOR_RECEIPT_CONFLICT');
  return Object.freeze({...proof,acceptance_receipt_id:id,
   assessment_saved:true,already_recorded:true});
 }
 const tail=history.at(-1);
 if(!tail?.event_id||!tail?.lineage_hash)
  fail('ACCEPTANCE_CONTINUITY_TAIL_INVALID');
 const payload={...proof,
  diagnosis_receipt_id:diagnosis[0].event_id,
  owner_accepted:false,full_original_job_completed:false,
  original_issue_closed:false,external_action_authorized:false,
  external_action_performed:false,
 };
 const at=new Date().toISOString();
 const node=appendContinuityNode({
  spine,stage:'WORK',entityId:workId,eventId:id,
  parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
  assertionTime:at,effectiveTime:at,
  epistemicStatus:'CORROBORATED',
  evidenceRefs:[proof.historical_failing_source_url,
   proof.later_passing_run_url],
  payload,provenance:{source:PERSONAL_REPAIR_ACCEPTANCE_VERSION,
   principal_id:session.user_id,conversation_id:conversationId},
 });
 await store.appendEvent({...node,entity_type:'personal_recovery_acceptance_evidence'});
 const after=orderContinuityHistory(await read());
 const saved=after.find(e=>e.event_id===id);
 if(saved?.parent_event_id!==tail.event_id||
    saved?.payload?.original_work_id!==workId||
    saved?.payload?.full_original_job_completed!==false||
    saved?.payload?.diagnosis_receipt_id!==diagnosis[0].event_id)
  fail('ACCEPTANCE_DURABLE_RECEIPT_READBACK_FAILED');
 return Object.freeze({...proof,acceptance_receipt_id:id,
  assessment_saved:true,already_recorded:false});
}
