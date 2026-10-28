import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {issueUpgradeEvidenceWarrant,hashUpgradeEvidence}
 from '../src/reality-upgrade-evidence-warrant-v0.1.js';
import {fingerprintGovernedUpgradeCandidate}
 from '../src/reality-governed-github-upgrade-provider-v0.1.js';
import {prepareGovernedAutonomousUpgrade}
 from '../src/reality-governed-autonomous-upgrade-orchestrator-v0.1.js';
import {exactGovernedUpgradeWorkItem,dispatchAuthenticatedGovernedUpgradeDraft}
 from '../src/reality-governed-upgrade-execution-dispatch-v0.1.js';
import {executeAuthorizedWork}
 from '../src/reality-governed-execution-engine-v0.1.js';
import {createAuthorityPolicy,autoAuthorize,issueBoundExecutionApproval,
 fingerprintApprovedWorkItem}
 from '../src/reality-authority-v1.0.js';
import {bindWorkToAuthenticatedGoal}
 from '../src/reality-execution-goal-grounding-v0.1.js';
import {issuePersonalWorkGroundingProof}
 from '../src/reality-personal-work-grounding-proof-v0.1.js';
import {issueFreshGoalExecutionAdmission}
 from '../src/reality-fresh-goal-execution-admission-v0.1.js';

const REPO='maloney2323/Reality',ROOT='/repos/'+REPO,
 BASE='experiment/reality-live-durable-adversarial-20261025';
const work='work:24cda9611404e9bcb47909976067605c';
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const user=randomUUID(),conversationId=randomUUID();
const session={user_id:user,config:{url}};
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'unit-test-only-isolated-db-secret',
 REALITY_GITHUB_TOKEN:'unit-test-token-does-not-leave-process',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'unit-test-execution-signature-key-1234567890123456789012345'};
Object.assign(process.env,env);
const shaA='a'.repeat(40),shaB='b'.repeat(40);
function fixture(){
 const originalWorkItem={id:work,continuity_root_id:'continuity:original',
  worldline_id:'worldline:original',status:'BLOCKED'};
 const verifiedExperiment={state:'SANDBOX_VERIFIED',work_item_id:work,
  continuity_root_id:originalWorkItem.continuity_root_id,
  worldline_id:originalWorkItem.worldline_id,
  capability_id:'extension.schedule-notifier',gap_id:'gap:verified',
  verification_hash:'d'.repeat(64),capability_signature:'signature:sandbox-verified',
  production_graph_write_permitted:false,
  ephemeral_worldline_id:'worldline:ephemeral:'+'f'.repeat(32),
  frozen_historical_failure_refs:['https://github.com/maloney2323/Reality/actions/runs/1'],
  capability_contract:{verification_suite_ref:'node-test:scheduling'},
  verification_bundle:{
   frozen_regression:{passed:true},isolated_verification:{verified:true},
   capability_signature:'signature:sandbox-verified',
   synthesized_capability:{files:[{
    path:'src/reality-extensions/schedule-notifier.js',
    content:"export function notify(){return 'verified';}\n",mode:'100644',
   }]},
  },
 };
 verifiedExperiment.experiment_hash='e'.repeat(64);
 verifiedExperiment.verification_bundle.experiment_hash=verifiedExperiment.experiment_hash;
 verifiedExperiment.synthesized_capability=
  verifiedExperiment.verification_bundle.synthesized_capability;
 verifiedExperiment.verification_hash=hashUpgradeEvidence(verifiedExperiment.verification_bundle);
 const verifierReceipt={status:'INDEPENDENT_SANDBOX_VERIFIED',work_item_id:work,
  experiment_hash:verifiedExperiment.experiment_hash,
  verification_hash:verifiedExperiment.verification_hash,
  candidate_sha256:fingerprintGovernedUpgradeCandidate(verifiedExperiment.synthesized_capability.files),
  frozen_regression_sha256:hashUpgradeEvidence(verifiedExperiment.verification_bundle.frozen_regression),
  holdout:{passed:true,case_count:2,result_sha256:'9'.repeat(64)},
  isolation:{production_write_permitted:false,secrets_accessible:false},
  verifier_run_ref:'github:reality-upgrade-test:synthetic'};
 const checkpointId='00000000-0000-4000-8000-000000000333';
 const goalRevision='goal-receipt:test';
 const warrant=issueUpgradeEvidenceWarrant({
  experiment:verifiedExperiment,originalWorkItem,
  ownerId:user,conversationId,blockedCheckpointId:checkpointId,
  goalRevision,baseCommitSha:shaA,verifierReceipt,env,
 });
 const plan=prepareGovernedAutonomousUpgrade({originalWorkItem,verifiedExperiment});
 const workItem=exactGovernedUpgradeWorkItem(plan,{warrant});
 return {originalWorkItem,verifiedExperiment,plan,workItem,warrant,
  verifierReceipt,checkpointId,goalRevision};
}
function fakeGitHub({tamperPr=false,failWrite=false,missingWorkflow=false,badWorkflow=false}={}){
 const ciYaml=['name: Governed',
  'on:',
  '  push:',
  '    paths:',
  "      - 'src/reality-extensions/**'",
  "      - 'test/reality-extensions/**'",
  '  pull_request:',
  '    paths:',
  "      - 'src/reality-extensions/**'",
  "      - 'test/reality-extensions/**'",
  'jobs:',
  '  verify:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - run: echo verified',
 ].join('\n')+'\n';
 const workflow=badWorkflow?
  ciYaml.replaceAll("'src/reality-extensions/**'","'src/other/**'"):ciYaml;
 const workflowBytes=Buffer.from(workflow);
 const workflowBlobSha=createHash('sha1')
  .update('blob '+workflowBytes.length+'\0').update(workflowBytes).digest('hex');
 const ciPaths=[
  '.github/workflows/reality-governed-autonomous-upgrade-v01.yml',
  '.github/workflows/reality-governed-execution-engine-v0.1.yml',
 ];
 const state={branch:null,head:shaA,files:new Map(),pr:null,writes:[],gets:0};
 const get=async path=>{
  state.gets++;
  if(path===ROOT+'/git/ref/heads/'+BASE)
   return {ref:'refs/heads/'+BASE,object:{sha:shaA}};
  if(path===ROOT+'/git/ref/heads/'+state.branch)
   return {ref:'refs/heads/'+state.branch,object:{sha:state.head}};
  if(path===ROOT+'/git/commits/'+shaA)
   return {sha:shaA,tree:{sha:'e'.repeat(40)}};
  if(path===ROOT+'/git/trees/'+'e'.repeat(40)+'?recursive=1')
   return {sha:'e'.repeat(40),truncated:false,tree:missingWorkflow?[
    {path:ciPaths[1],type:'blob',mode:'100644',sha:workflowBlobSha}
   ]:ciPaths.map(path=>({path,type:'blob',mode:'100644',sha:workflowBlobSha}))};
  if(path===ROOT+'/git/blobs/'+workflowBlobSha)
   return {sha:workflowBlobSha,encoding:'base64',size:workflowBytes.length,
    content:workflowBytes.toString('base64')};
  if(path.startsWith(ROOT+'/contents/')){
   const p=path.slice((ROOT+'/contents/').length).split('?')[0];
   if(!state.files.has(p)){const e=Error('GITHUB_CONNECTOR_404');e.status=404;throw e;}
   return {type:'file',path:p,encoding:'base64',sha:'blob',
    content:Buffer.from(state.files.get(p),'utf8').toString('base64')};
  }
  if(state.pr&&path===ROOT+'/pulls/'+state.pr.number){
   return {...state.pr,head:{ref:state.branch,sha:tamperPr?'c'.repeat(40):shaB},
    base:{ref:BASE},draft:true,merged:false};
  }
  throw Error('UNEXPECTED_GET '+path);
 };
 const write=async(path,method,body)=>{
  state.writes.push({path,method,body});
  if(failWrite)throw Error('NETWORK_UNCERTAIN');
  if(path===ROOT+'/git/refs'&&method==='POST'){
   state.branch=body.ref.slice('refs/heads/'.length);
   return {ref:body.ref,object:{sha:shaA}};
  }
  if(path.startsWith(ROOT+'/contents/')&&method==='PUT'){
   const p=path.slice((ROOT+'/contents/').length);
   state.files.set(p,Buffer.from(body.content,'base64').toString('utf8'));
   state.head=shaB;
   return {content:{path:p},commit:{sha:shaB}};
  }
  if(path===ROOT+'/pulls'&&method==='POST'){
   state.pr={number:1501,html_url:'https://github.com/'+REPO+'/pull/1501'};
   return state.pr;
  }
  throw Error('UNEXPECTED_WRITE '+path);
 };
 return {state,get,write};
}
function admittedReservation({stateOut}={}){
 let consumed=false,settled=null,claimed=0;
 const reserve=async({session:userSession,conversationId:conv,workItem,groundingProof})=>{
  assert.equal(userSession.user_id,user);assert.equal(conv,conversationId);
  assert.deepEqual(groundingProof,{from:'signed-in-presented-fresh-work'});
  const fp=fingerprintApprovedWorkItem(workItem);
  const policy=createAuthorityPolicy({principalId:user,mode:'auto',scopes:[{
   connector:workItem.connector,operation:workItem.operation,
   resource:REPO,work_item_id:workItem.work_item_id,
   work_item_fingerprint:fp,
  }],approvedBy:user});
  const authorization=autoAuthorize({policy,workItem});
  const proof=issueBoundExecutionApproval({policy,workItem,authorization,
   principalId:user});
  const freshState={principal_id:user,continuity_root_id:'continuity:original',
   world_id:'world:original',
   authority_source:'AUTHENTICATED_RLS_USER_GOAL_COMMAND_AND_LEDGER_READBACK',
   transition_count:1,assistant_can_mutate_goals:false,
   semantic_reviewer_can_mutate_goals:false,external_execution_authorized:false,
   active_goal_id:'goal:test',active_goal:{
    goal_id:'goal:test',status:'ACTIVE',user_confirmed:true,
    external_execution_authorized:false,
    source_user_message_ref:'supabase:reality_chat_messages:verified-user-request',
    last_transition_receipt_id:'goal-receipt:test',
   },recent_transition_receipts:[{event_id:'goal-receipt:test',
    confirmed_by_user:true,principal_id:user}]};
  const binding=bindWorkToAuthenticatedGoal({workItem,
   authoritativeState:freshState,serverVerifiedPrincipalId:user});
  assert.equal(binding.status,'BOUND_FOR_FRESHNESS_CHECK');
  const signed=issuePersonalWorkGroundingProof({
   binding,principalId:user,conversationId,env});
  const boundPolicy={...policy,goal_binding:{
   version:'reality-personal-action-authority-v0.1',
   user_confirmation:'APPROVE_THIS_EXACT_WORK_ITEM',
   principal_id:user,conversation_id:conversationId,
   goal_id:binding.goal_id,goal_revision:binding.goal_revision,
   goal_transition_receipt_id:binding.goal_transition_receipt_id,
   continuity_root_id:binding.continuity_root_id,world_id:binding.world_id,
   goal_source_user_message_ref:binding.goal_source_user_message_ref,
   work_item_fingerprint:binding.work_item_fingerprint,
  }};
  const admission=issueFreshGoalExecutionAdmission({
   workItem,groundingProof:signed,latestAuthoritativeState:freshState,
   principalId:user,conversationId,policy:boundPolicy,
   authorization,serverApprovalProof:proof,env,
  });
  const reservationId='00000000-0000-4000-8000-000000000222';
  const store={
   async begin({reservationId:id}){
    if(id!==reservationId||consumed)throw Error('EXECUTION_ALREADY_CONSUMED');
    consumed=true;return {status:'DISPATCHING',reservation_id:id,
     single_use_claim_consumed:true};
   },
   async settle({reservationId:id,outcome}){
    if(id!==reservationId||!consumed)throw Error('NO_VALID_SETTLEMENT');
    settled=outcome;return {status:outcome,reservation_id:id};
   },
  };
  claimed++;
  return {status:'SINGLE_USE_RESERVED_PENDING_DISPATCH',
   action_policy_id:policy.policy_id,work_item_fingerprint:fp,
   reservation_id:reservationId,internal:{authorization,
    serverApprovalProof:proof,serverFreshGoalAdmission:admission,
    reservation:{status:'RESERVED_NOT_DISPATCHED',
     reservation_id:reservationId,principal_id:user,conversation_id:conversationId,
     policy_id:policy.policy_id,work_fingerprint:fp},
    store}};
 };
 return {reserve,results:()=>({claimed,consumed,settled})};
}
function args({mock=fakeGitHub(),source=fixture(),reservation=admittedReservation()}={}){
 return {session,conversationId,originalWorkId:work,
  expectedCandidateHash:source.plan.verified_candidate_hash,
  groundingProof:{from:'signed-in-presented-fresh-work'},
  executionConfirmation:'EXECUTE_ONE_EXACT_VERIFIED_UPGRADE_DRAFT_PR',
  env,loadTrustedUpgrade:async()=>({
   ...source,owner_id:user,conversation_id:conversationId,
   persisted_and_reobserved:true,
   verified_not_authorized:true,external_action_authorized:false,
   original_job_completed:false,goal_revision:source.goalRevision,
   blocked_checkpoint_receipt_id:source.checkpointId,
   evidence_warrant:source.warrant,evidence_warrant_id:source.warrant.warrant_id,
  }),
  reserve:reservation.reserve,execute:executeAuthorizedWork,
  providerGet:mock.get,providerWrite:mock.write,
  mock,reservation};
}
test('real governed execution engine consumes DB-style reservation, writes verified draft PR, settles once',async()=>{
 const a=args();
 let errorReason=null;
 a.execute=async options=>{
  const original=options.connector.execute;
  options.connector.execute=async(...args)=>{
   try{return await original(...args)}catch(error){errorReason=error?.message;throw error}
  };
  return executeAuthorizedWork(options);
 };
 const result=await dispatchAuthenticatedGovernedUpgradeDraft(a);
 assert.equal(errorReason,null,'Underlying test-provider failure: '+errorReason);
 assert.equal(result.status,'DRAFT_PR_VERIFIED_AND_RESERVATION_SETTLED',JSON.stringify(result));
 assert.equal(result.original_work_id,work);
 assert.equal(result.draft_pr_verified,true);
 assert.equal(result.github_pr_number,1501);
 assert.equal(result.capability_promoted,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.independent_post_pr_ci_verified,false);
 assert.equal(a.reservation.results().claimed,1);
 assert.equal(a.reservation.results().consumed,true);
 assert.equal(a.reservation.results().settled,'VERIFIED');
 assert.deepEqual(a.mock.state.writes.map(x=>x.method),['POST','PUT','POST']);
 assert.ok(a.mock.state.gets>=8);
});
test('missing required pinned-base CI prevents reservation and all GitHub writes',async()=>{
 for(const mock of [fakeGitHub({missingWorkflow:true}),fakeGitHub({badWorkflow:true})]){
  const a=args({mock});
  await assert.rejects(dispatchAuthenticatedGovernedUpgradeDraft(a),
   /UPGRADE_BASE_REQUIRED_CI_(WORKFLOW_UNAVAILABLE|TRIGGER_MISSING)/);
  assert.equal(a.reservation.results().claimed,0);
  assert.equal(a.mock.state.writes.length,0);
 }
});
test('missing explicit new execution confirmation and foreign signed-in identity fail before reservation',async()=>{
 const a=args();a.executionConfirmation='APPROVE_THIS_EXACT_WORK_ITEM';
 await assert.rejects(dispatchAuthenticatedGovernedUpgradeDraft(a),
  /UPGRADE_SIGNED_IN_EXACT_CONFIRMATION_AND_SOURCE_REQUIRED/);
 assert.equal(a.reservation.results().claimed,0);
 const b=args();b.session={...session,user_id:randomUUID()};
 await assert.rejects(dispatchAuthenticatedGovernedUpgradeDraft(b),
  /UPGRADE_OWNER_SCOPED_DURABLE_SOURCE_MISSING/);
 assert.equal(b.reservation.results().claimed,0);
});
test('changed candidate hash, wrong work ID or missing durable source fail closed before reserving',async()=>{
 const a=args();
 a.expectedCandidateHash='f'.repeat(64);
 await assert.rejects(dispatchAuthenticatedGovernedUpgradeDraft(a),
  /UPGRADE_PAYLOAD_TIED_WARRANT_INVALID_OR_EXPIRED/);
 assert.equal(a.reservation.results().claimed,0);
 const b=args();b.loadTrustedUpgrade=async()=>null;
 await assert.rejects(dispatchAuthenticatedGovernedUpgradeDraft(b),
  /UPGRADE_OWNER_SCOPED_DURABLE_SOURCE_MISSING/);
 const c=args();c.originalWorkId='work:'+'f'.repeat(32);
 await assert.rejects(dispatchAuthenticatedGovernedUpgradeDraft(c),
  /UPGRADE_OWNER_SCOPED_DURABLE_SOURCE_MISSING/);
});
test('provider false PR readback does not settle VERIFIED or claim completed job',async()=>{
 const a=args({mock:fakeGitHub({tamperPr:true})});
 const result=await dispatchAuthenticatedGovernedUpgradeDraft(a);
 assert.equal(result.status,'UNRESOLVED_NO_RETRY');
 assert.equal(result.original_job_completed,false);
 assert.equal(result.no_automatic_retry,true);
 assert.equal(a.reservation.results().consumed,true);
 assert.equal(a.reservation.results().settled,'UNCERTAIN');
});
test('ambiguous provider POST can never be retried under same reserved work',async()=>{
 const a=args({mock:fakeGitHub({failWrite:true})});
 const result=await dispatchAuthenticatedGovernedUpgradeDraft(a);
 assert.equal(result.status,'UNRESOLVED_NO_RETRY');
 assert.equal(result.no_automatic_retry,true);
 assert.equal(a.reservation.results().settled,'UNCERTAIN');
 assert.equal(a.mock.state.writes.length,1);
});
test('exact upgrade operation remains consequential and legacy broad route is disabled',async()=>{
 const a=fixture();
 const {classifyWorkItemExecutionEffect}=await import('../src/reality-governed-work-runtime-v0.1.js');
 assert.equal(classifyWorkItemExecutionEffect(a.workItem).status,'EXTERNAL_CONNECTOR_WRITE');
 const code=readFileSync(new URL('../api/reality/self-build.js',import.meta.url),'utf8');
 assert.match(code,/LEGACY_SELF_BUILD_DIRECT_WRITE_DISABLED/);
});

test('signed evidence warrant substitution is rejected before a reservation or provider write',async()=>{
 for(const mutate of [
  x=>({...x,evidence_warrant:{...x.evidence_warrant,signature:'0'.repeat(64)}}),
  x=>({...x,verifierReceipt:{...x.verifierReceipt,holdout:{
   ...x.verifierReceipt.holdout,result_sha256:'f'.repeat(64)}}}),
  x=>({...x,evidence_warrant:{...x.evidence_warrant,pinned_base_commit_sha:'f'.repeat(40)}}),
 ]){
  const a=args();
  const source=a.loadTrustedUpgrade;
  a.loadTrustedUpgrade=async()=>mutate(await source());
  await assert.rejects(dispatchAuthenticatedGovernedUpgradeDraft(a),
   /UPGRADE_PAYLOAD_TIED_WARRANT_INVALID_OR_EXPIRED/);
  assert.equal(a.reservation.results().claimed,0);
  assert.equal(a.mock.state.writes.length,0);
 }
});
test('changed goal revision invalidates a previously signed warrant',async()=>{
 const a=args();const source=a.loadTrustedUpgrade;
 a.loadTrustedUpgrade=async()=>({...await source(),goal_revision:'other-goal-revision'});
 await assert.rejects(dispatchAuthenticatedGovernedUpgradeDraft(a),
  /UPGRADE_PAYLOAD_TIED_WARRANT_INVALID_OR_EXPIRED/);
 assert.equal(a.reservation.results().claimed,0);
});
