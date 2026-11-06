// Owner-scoped, read-only conversation grounding for the tested repair
// from market finding #4. No customer language, model answer or old approval
// can authorize code installation here.
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const COMMIT=/^[a-f0-9]{40}$/;
const relevant=text=>/\b(reality|repair|upgrade|budget|evaluation|capabilit(?:y|ies)|install|approve|approval|proof|verified|risk|benefit|cost|chat|progress|frozen|pr|original job)\b/i.test(String(text||''));
export async function readVerifiedResearchUpgradeForChat({
 session,message,env=process.env,
 db=resolveReliabilityBenchmarkDb(env),fetchImpl=fetch
}={}){
 if(!relevant(message)||env.VERCEL_ENV!=='preview'||
   !UUID.test(session?.user_id)||
   !db?.strictSecrets||!db.secretKey||db.url!==session?.config?.url||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   db.project!=='hvkfreoagbrphwghjajw')return [];
 try{
  const response=await fetchImpl(db.url+
   '/rest/v1/rpc/reality_read_owner_market_repair_proofs_v1',{
   method:'POST',cache:'no-store',redirect:'error',headers:{
    apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json',accept:'application/json'},
   body:JSON.stringify({p_owner_id:session.user_id})});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true||
   data.status!=='SOURCE_PINNED_BUDGET_REPAIR_CANDIDATE_READBACK'||
   data.owner_id!==session.user_id||data.read_only!==true||
   data.installation_authorized!==false||data.production_changed!==false||
   !Array.isArray(data.items)||data.items.length>4)return [];
  const out=[];
  for(const p of data.items){
   if(p.status!=='FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED'||
    p.proof_kind!=='EXISTING_CAPABILITY_IMPLEMENTATION_DEFECT'||
    !SHA.test(p.finding_fingerprint)||!SHA.test(p.frozen_test_sha256)||
    !COMMIT.test(p.baseline_commit_sha)||!COMMIT.test(p.repair_commit_sha)||
    !Number.isSafeInteger(p.baseline_run_id)||p.baseline_run_id<1||
    !Number.isSafeInteger(p.green_run_id)||p.green_run_id<1||
    !Number.isSafeInteger(p.pull_request_number)||p.pull_request_number<1||
    p.installed!==false||p.owner_install_authorized!==false||
    p.fresh_original_work_verified!==false||p.production_changed!==false||
    typeof p.proven_defect_scope!=='string'||typeof p.corrected_behavior!=='string'||
    typeof p.remaining_unproven!=='string')return [];
   out.push(Object.freeze({
    entry_id:'research-repair:'+p.finding_fingerprint,
    event_kind:'source_verified_customer_repair_candidate',
    source_kind:'AUTHENTICATED_OWNER_SCOPED_FROZEN_RED_GREEN_RECEIPT',
    source_ref:'reality:owner-research-repair:'+p.receipt_id+':'+p.finding_fingerprint,
    assertion_time:p.observed_at,
    epistemic_status:'VERIFIED_IMPLEMENTATION_DEFECT_REPAIR_TESTED_NOT_INSTALL_ELIGIBLE',
    summary:'REALITY CUSTOMER UPGRADE #'+p.pull_request_number+
     ': One genuine implementation defect was independently reproduced and a separate repair candidate passed the unchanged frozen tests. Defect: '+
     p.proven_defect_scope.slice(0,400)+'. Candidate: '+
     p.corrected_behavior.slice(0,400)+
     '. Unproven: '+p.remaining_unproven.slice(0,450)+
     '. Owner installation is NOT authorized, no install occurred, and no fresh original customer work binding or settlement was verified. '+
     'Customer must NOT be sent to GitHub to approve. Discuss the evidence here in Reality Chat; only an authenticated in-chat human click on an independently qualified, full-loop-ready candidate may invoke the existing exact-artifact owner approval endpoint. '+
     'Ordinary conversation or an LLM answer cannot authorize installation.',
    red_run_id:p.baseline_run_id,green_run_id:p.green_run_id,
    frozen_test_sha256:p.frozen_test_sha256,
    candidate_commit_sha:p.repair_commit_sha,
    owner_approval_eligible:false,
    owner_install_authorized:false,
    installation_completed:false,
    original_job_completed:false,
    production_changed:false
   }));
  }
  return out;
 }catch{return []}
}
