// Read-only owner-scoped Past / Present / operational-Future communication
// derived from the EXISTING original-job and Continuity settlement readback.
// Never writes a new memory/receipt, dispatches work or grants approval.
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';

const OWNER='85eeae0b-2988-43c4-b20c-590fb51da70d';
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const ARTIFACT='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48';
const SOURCE='e44ee294f21c73803a2bcdb5a9cb487f0f80fc85';
const INSTALLED='de45ee4c557339b19aa1f320aba1cd5fba301dbb';
const ISSUE='https://github.com/maloney2323/Reality/issues/263';
const BRANCH='reality/isolated-openai-governance-gateway-20261108';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;

// No lexical relevance gate. The completed original is read as verified
// owner operational memory, whether the user says "the job", "it", "two sixty
// three" or changes topics. Cognition decides conversational relevance; the
// source readback only decides what facts are true.

export function projectNative263OwnerTemporalBrief(c,{ownerId,now=new Date()}={}){
 if(!UUID.test(ownerId||'')||ownerId!==OWNER||
  c?.status!=='NATIVE263_ORIGINAL_POSTINSTALL_READONLY_CONTEXT'||
  c.owner_id!==ownerId||c.original_work_id!==WORK||c.shift_id!==SHIFT||
  c.source_ref!==ISSUE||c.target_branch!==BRANCH||
  c.candidate_artifact_sha256!==ARTIFACT||
  c.candidate_commit_sha!==SOURCE||
  c.frozen_verifier_run_id!==42525028367||
  c.production_changed!==false||!(now instanceof Date)||
  !Number.isFinite(now.getTime()))
  throw Error('NATIVE263_OWNER_TEMPORAL_SOURCE_UNVERIFIED');
 const settled=c.state==='ORIGINAL_SETTLED'&&
  c.original_phase==='SETTLED'&&c.original_installed===true&&
  c.installed_commit_sha===INSTALLED&&
  UUID.test(c.original_final_receipt_id||'')&&
  UUID.test(c.approval_receipt_id||'')&&
  Number.isFinite(Date.parse(c.owner_approved_at||''));
 const installed=c.state==='SOURCE_INSTALLED'&&
  c.original_phase==='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'&&
  c.installed_commit_sha===INSTALLED&&
  !c.original_final_receipt_id&&UUID.test(c.approval_receipt_id||'');
 if(!settled&&!installed)
  throw Error('NATIVE263_TEMPORAL_ORIGINAL_STATE_NOT_PROVEN');
 const past='Past — The owner authorized a bounded Riley + Taylor job, the exact repair for issue #263 was independently tested, one installation approval was recorded on '+c.owner_approved_at+
  ', and the frozen repair was installed in the isolated preview.';
 const present=settled?
  'Present — The SAME original job #263 has been independently settled as complete. The durable final receipt ID is '+c.original_final_receipt_id+
  '; the installed SHA is '+INSTALLED+'. No new installation or approval is needed.':
  'Present — The source is installed, but the original-job final settlement is NOT yet independently recorded. Installation is not completion.';
 const future=settled?
  'Operational future — No more actions or owner approval are due for this completed original. Reality may explain the evidence or evaluate a NEW separately authorized objective; measured human labor or monetary ROI is still unknown. This is a next-step implication, not a prediction of future work.':
  'Operational future — The existing signed worker must independently verify the frozen deployment and separate original acceptance evidence, then record one final receipt. Do not request a second approval or shift. This is expected work, not a completed fact.';
 const summary='REALITY TRUSTED ORIGINAL-JOB PAST/PRESENT/FUTURE BRIEFING: '+past+
  ' '+present+' '+future+
  ' This source is an owner-scoped existing database readback, NOT model memory, fictional employee thought, a new ledger event, or permission to execute. Current employee shift status is separate from this one original job. Do not claim the whole shift completed or calculate unmeasured ROI.';
 return Object.freeze({
  entry_id:'reality:original-temporal:'+WORK+':'+(settled?c.original_final_receipt_id:'pending'),
  event_kind:'verified_original_job_temporal_projection',
  source_kind:'AUTHENTICATED_OWNER_SCOPED_EXISTING_CONTINUITY_AND_ORIGINAL_DB_READBACK',
  source_ref:ISSUE,original_work_id:WORK,shift_id:SHIFT,
  assertion_time:now.toISOString(),
  epistemic_status:settled?'INDEPENDENT_ORIGINAL_SETTLEMENT_PROVEN':'SOURCE_INSTALLED_SETTLEMENT_PENDING',
  past,present,operational_future:future,summary,
  approval_receipt_id:c.approval_receipt_id,
  original_final_receipt_id:settled?c.original_final_receipt_id:null,
  original_job_completed:settled,independent_original_settlement_verified:settled,
  exact_install_sha:INSTALLED,
  human_labor_saved_minutes:null,verified_cash_savings_usd:null,
  installation_authorized_by_this_read:false,
  new_job_started:false,external_execution_authorized:false,
  production_changed:false
 });
}

// The proactive opening is a deterministic projection of an authenticated,
// exact-owner, independently settled original; it does not create a chat turn.
export function verifiedNative263OpeningMessage(brief){
 if(brief?.original_job_completed!==true||
  brief.independent_original_settlement_verified!==true||
  !UUID.test(brief.original_final_receipt_id||'')||
  brief.exact_install_sha!==INSTALLED||
  brief.production_changed!==false||
  brief.new_job_started!==false||
  brief.verified_cash_savings_usd!==null)
  throw Error('NATIVE263_OPENING_MUST_HAVE_INDEPENDENT_FINAL_RECEIPT');
 return 'Reality · Verified work completed. Original job #263 is independently settled. '+
  'Past: A source-backed repair was tested and you approved its exact installation once. '+
  'Present: The repair is installed in Reality\'s isolated preview and its original-job acceptance passed. '+
  'The independent settlement receipt is '+brief.original_final_receipt_id+
  '. The installed commit is '+INSTALLED+
  '. Production was not changed. '+
  'Operational future: This job requires no new approval or restart. '+
  'My next useful step is to explain the evidence and evaluate the business value. '+
  'Actual labor time and financial savings have not been measured yet. '+
  'What would you like to know about the work or its receipt?';
}

// Safe, complete response schema for the original owner's pre-existing Chat
// GET route. Pure function so exact settled-state projection is testable
// without a browser session or making any model/provider calls.
export function buildNative263SettledOwnerCard(c,{ownerId,now=new Date()}={}){
 const brief=projectNative263OwnerTemporalBrief(c,{ownerId,now});
 if(brief.original_job_completed!==true||
  c.target_path!=='src/reality-riley-service-original-runtime-v1.js'||
  c.expected_installed_blob_sha!=='dda8e71d44cca6745312bcbd000089d5a0b01d54'||
  c.original_final_receipt_id!==brief.original_final_receipt_id||
  c.production_changed!==false)
  throw Error('NATIVE263_FINAL_ORIGINAL_OWNER_READBACK_MISMATCH');
 return Object.freeze({
  ok:true,status:'EXACT_OWNER_NATIVE263_INSTALLATION_APPROVAL_CARD',
  original_work_id:WORK,shift_id:SHIFT,owner_id:ownerId,
  source_ref:c.source_ref,target_branch:c.target_branch,
  source_file:c.target_path,artifact_sha256:c.candidate_artifact_sha256,
  candidate_commit_sha:c.candidate_commit_sha,
  verified_frozen_ci_run_id:c.frozen_verifier_run_id,
  approval_state:c.state,owner_approval_ready:false,
  installation_authorized:true,installation_completed:true,
  original_job_completed:true,
  independently_verified_final_original_receipt_id:brief.original_final_receipt_id,
  installed_commit_sha:c.installed_commit_sha,
  owner_approved_at:c.owner_approved_at,
  source_write_verified:true,
  automatic_preview_deploy_verified:true,
  same_original_continuation_and_receipt_verified:true,
  opening_message:verifiedNative263OpeningMessage(brief),
  next_step:'ORIGINAL_INDEPENDENTLY_SETTLED_NO_NEW_APPROVAL_OR_RESTART',
  production_changed:false,no_third_confirmation:true
 });
}

export async function readVerifiedNative263TemporalForChat({
 session,message,env=process.env,db=resolveReliabilityBenchmarkDb(env),
 fetchImpl=fetch,rpc=shiftRpc,now=new Date()
}={}){
 if(env.VERCEL_ENV!=='preview'||
  session?.user_id!==OWNER||db?.strictSecrets!==true||
  db.project!=='hvkfreoagbrphwghjajw'||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  db.url!==session?.config?.url||!db.secretKey)return [];
 try{
  const c=await rpc(db,'reality_read_native263_postinstall_context_v1',{}, {fetchImpl});
  return [projectNative263OwnerTemporalBrief(c,{ownerId:session.user_id,now})];
 }catch{
  // A missing/stale owner readback cannot become model certainty.
  return [];
 }
}
