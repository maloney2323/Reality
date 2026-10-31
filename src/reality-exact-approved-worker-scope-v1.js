// GitHub OIDC-leased worker-only original-work and current-goal readback.
// A previously signed owner approval is already checked by the atomic lease.
// The worker never needs the private interactive chat goal-signing key.
// No synthetic goal can be accepted: every read makes a fresh service-only
// comparison against the database's exact owner, goal epoch and source event.
import {readExactModelRepairEvidence}
 from './reality-real-verified-repair-readback-v1.0.js';
const PROJECT='hvkfreoagbrphwghjajw';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const fail=x=>{throw Error('REALITY_APPROVED_WORKER_SCOPE_'+x)};
export async function createExactApprovedWorkerScope({
 env,request,lease,fetchImpl=fetch,
 readCandidate=readExactModelRepairEvidence,
}={}){
 if(!UUID.test(lease?.reservation_id)||!UUID.test(lease?.lease_id)||
    !UUID.test(lease?.owner_id)||!UUID.test(lease?.conversation_id)||
    !WORK.test(lease?.original_work_id)||!HASH.test(lease?.candidate_hash)||
    lease.reservation_id!==request?.reservation_id||
    lease.original_work_id!==request.original_work_id||
    lease.candidate_hash!==request.candidate_hash||
    lease.install_branch!==request.install_branch||
    lease.issue_number!==request.issue_number||
    env?.VERCEL_ENV!=='preview'||
    env?.REALITY_PERSONAL_CHAT_SUPABASE_URL!==
     'https://'+PROJECT+'.supabase.co'||
    String(env?.SUPABASE_SERVICE_ROLE_KEY||'').length<30)
  fail('EXACT_SIGNED_LEASE_REQUIRED');
 const rpcUrl=env.REALITY_PERSONAL_CHAT_SUPABASE_URL+
  '/rest/v1/rpc/reality_read_exact_approved_worker_scope_v1';
 const getScope=async()=>{
  const r=await fetchImpl(rpcUrl,{
   method:'POST',cache:'no-store',redirect:'error',headers:{
    apikey:env.SUPABASE_SERVICE_ROLE_KEY,
    authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,
    'content-type':'application/json',accept:'application/json',
   },body:JSON.stringify({
    p_reservation_id:lease.reservation_id,p_lease_id:lease.lease_id,
    p_install_branch:lease.install_branch,
   }),
  });
  if(!r.ok)fail('FRESH_OWNER_GOAL_SCOPE_RPC_UNAVAILABLE');
  const s=await r.json().catch(()=>null);
  if(s?.status!=='CURRENT_OWNER_GOAL_AND_WORK_VERIFIED'||
     s.reservation_id!==lease.reservation_id||
     s.lease_id!==lease.lease_id||
     s.owner_id!==lease.owner_id||
     s.conversation_id!==lease.conversation_id||
     s.original_work_id!==lease.original_work_id||
     s.issue_number!==lease.issue_number||
     s.install_branch!==lease.install_branch||
     s.candidate_hash!==lease.candidate_hash||
     !UUID.test(s.original_work_event_id)||
     !UUID.test(s.goal_transition_event_id)||
     !String(s.goal_id||'').startsWith('user-goal:')||
     !SHA.test(s.review_commit_sha)||
     !HASH.test(s.frozen_test_sha256)||
     !Number.isSafeInteger(s.original_failed_run_id)||
     s.original_failed_run_id<1||
     s.production_changed!==false||
     s.installation_performed!==false||
     s.settlement_recorded!==false)
   fail('FRESH_OWNER_GOAL_SCOPE_MISMATCH');
  return s;
 };
 // Independent GitHub provider re-verification is still required, even though
 // the candidate hash was already consented to. This is NOT an authority mint.
 const first=await getScope();
 const candidate=await readCandidate({
  issueNumber:lease.issue_number,env,
  sourceCommitSha:first.review_commit_sha,
 });
 if(candidate?.independently_verified!==true||
    candidate.issue_number!==lease.issue_number||
    candidate.candidate_artifact_sha256!==lease.candidate_hash||
    candidate.original_failed_run_id!==first.original_failed_run_id||
    candidate.frozen_test_sha256!==first.frozen_test_sha256||
    !SHA.test(candidate.original_source_sha)||
    candidate.original_job_completed!==false||
    candidate.installation_authorized!==false)
  fail('INDEPENDENT_CANDIDATE_OR_ORIGINAL_MISMATCH');
 const recheck=async()=>{
  const fresh=await getScope();
  if(fresh.goal_id!==first.goal_id||
     fresh.goal_transition_event_id!==first.goal_transition_event_id||
     fresh.original_work_event_id!==first.original_work_event_id||
     fresh.review_commit_sha!==first.review_commit_sha||
     fresh.frozen_test_sha256!==first.frozen_test_sha256)
   fail('GOAL_OR_ORIGINAL_WORK_RECONCILIATION_CHANGED');
  return fresh;
 };
 return Object.freeze({
  listWork:async()=>{
   const fresh=await recheck();
   return {jobs:[{
    original_work_id:lease.original_work_id,
    conversation_id:lease.conversation_id,
    issue_number:lease.issue_number,
    issue_url:'https://github.com/maloney2323/Reality/issues/'+lease.issue_number,
    state:'REAL_SOURCE_BACKED_REPAIR_PENDING',
    goal_still_current:true,job_completed:false,
    source_receipt_id:fresh.original_work_event_id,
    original_provider_failed_run_id:fresh.original_failed_run_id,
    original_source_sha:candidate.original_source_sha,
    frozen_test_path:'test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js',
    frozen_test_sha256:fresh.frozen_test_sha256,
   }]};
  },
  readGoal:async ({conversationId})=>{
   const fresh=await recheck();
   if(conversationId!==lease.conversation_id)
    fail('ORIGINAL_CONVERSATION_CHANGED');
   return {
    principal_id:lease.owner_id,conversation_id:lease.conversation_id,
    state:{active_goal_id:fresh.goal_id,active_goal:{
     goal_id:fresh.goal_id,status:'ACTIVE',user_confirmed:true,
     last_transition_receipt_id:fresh.goal_transition_event_id,
    }},
   };
  },
  readCandidate:async ({issueNumber})=>{
   await recheck();
   if(issueNumber!==lease.issue_number)fail('ORIGINAL_ISSUE_CHANGED');
   return candidate;
  },
 });
}
