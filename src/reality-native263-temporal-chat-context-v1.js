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

export const native263ConversationRelevant=message=>
 /\b263\b|\b(?:latest|last|recent|current)\s+(?:original\s+)?(?:repair|job|settlement|receipt)\b|\bpast\b.{0,70}\bpresent\b.{0,70}\bfuture\b/i.test(String(message||''));

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

export async function readVerifiedNative263TemporalForChat({
 session,message,env=process.env,db=resolveReliabilityBenchmarkDb(env),
 fetchImpl=fetch,rpc=shiftRpc,now=new Date()
}={}){
 if(!native263ConversationRelevant(message)||env.VERCEL_ENV!=='preview'||
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
