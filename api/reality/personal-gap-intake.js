// Reality upgrade category intake: owner-only read of persisted source evidence.
// Connects market assessment, provider-audit, candidate handoff, genuine queue,
// and separately verified settled work. Never creates/qualifies/installs work.
import {authenticatedChatSession,privateChatConfig}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {qualifyUnboundSourceBatch}
 from '../../src/reality-owner-unbound-capability-qualification-v1.js';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const KINDS=new Set(['RESEARCH_OPPORTUNITY','CI_FAILURE_INVESTIGATION',
 'INDEPENDENTLY_TESTED_CANDIDATE','GOVERNED_ORIGINAL_JOB_GAP']);
const STAGES=new Set(['INSPECTED_NEEDS_INDEPENDENT_GAP_TEST',
 'OBSERVED_PROVIDER_FAILURE_ROOT_CAUSE_UNKNOWN',
 'TESTED_AWAITING_FRESH_OWNER_WORK_BINDING',
 'PENDING_FROZEN_REPRODUCTION','LEASED_FOR_INDEPENDENT_REPRODUCTION',
 'FROZEN_REPRODUCED_AWAITING_CANDIDATE',
 'AWAITING_OWNER_APPROVAL','AWAITING_INSTALLATION_APPROVAL']);
export const maxDuration=30;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  if(req.method!=='GET')
   return res.status(405).setHeader('Allow','GET')
    .json({ok:false,error:'CATEGORY_INTAKE_READ_ONLY'});
  if(Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'CATEGORY_INTAKE_NO_CLIENT_SCOPE'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'CATEGORY_INTAKE_PREVIEW_ONLY'});
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const db=resolveReliabilityBenchmarkDb();
  if(!db?.strictSecrets||!db.secretKey||db.url!==session.config.url||
   db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   db.project!=='hvkfreoagbrphwghjajw')
   throw Error('CATEGORY_INTAKE_ISOLATED_SCOPE_REQUIRED');
  const response=await fetch(db.url+'/rest/v1/rpc/reality_read_owner_capability_gap_feed_v1',{
   method:'POST',cache:'no-store',redirect:'error',headers:{
    apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    accept:'application/json','content-type':'application/json'},
   body:JSON.stringify({p_owner_id:session.user_id})
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok||payload?.ok!==true||
   payload.status!=='OWNER_GAP_INTAKE_RECONCILED'||
   payload.owner_id!==session.user_id||
   payload.source_basis!=='PERSISTED_OWNER_EVIDENCE_NO_PROVIDER_LIVE_REFRESH'||
   payload.read_only!==true||
   payload.installation_authorized!==false||
   payload.work_started!==false||
   payload.production_changed!==false||
   !Array.isArray(payload.items)||payload.items.length>30||
   !Array.isArray(payload.settled_history)||payload.settled_history.length>12||
   !payload.counts||typeof payload.counts!=='object'||
   payload.counts.current_candidates!==payload.items.length||
   payload.counts.historical_completed!==payload.settled_history.length||
   !['research_assessed','provider_failures_to_investigate',
     'independently_tested_candidates','governed_active_queue',
     'verified_current_gaps'].every(key=>Number.isSafeInteger(payload.counts[key])&&
     payload.counts[key]>=0&&payload.counts[key]<=30)||
   payload.items.some(x=>!KINDS.has(x.kind)||!STAGES.has(x.stage)||
    !/^(?:research|ci|candidate|queue):[a-f0-9-]{32,64}$/.test(x.key||'')||
    typeof x.title!=='string'||x.title.length<5||x.title.length>220||
    typeof x.next_proof!=='string'||x.next_proof.length<20||
    !Array.isArray(x.pros)||!Array.isArray(x.cons)||
    !Number.isSafeInteger(x.priority)||x.priority<0||x.priority>10||
    x.installation_authorized!==false||x.executable_job!==false||
    x.verified_missing_capability!==true&&x.verified_missing_capability!==false||
    x.verified_missing_capability===true&&x.kind!=='GOVERNED_ORIGINAL_JOB_GAP'||
    typeof x.source_url==='string'&&!(
     /^https:\/\//.test(x.source_url)&&!/[\s<>]/.test(x.source_url))||
    x.source_url!=null&&typeof x.source_url!=='string')||
   new Set(payload.items.map(x=>x.key)).size!==payload.items.length||
   payload.settled_history.some(x=>x.stage!=='SETTLED_ISOLATED'||
    x.historical_settlement_verified!==true||
    x.new_installation_authorized!==false||
    x.verified_missing_capability!==false||
    !/^[a-f0-9]{40}$/.test(x.source_commit||''))||
   payload.counts.verified_current_gaps!==
    payload.items.filter(x=>x.verified_missing_capability===true).length)
   throw Error('CATEGORY_INTAKE_READBACK_INCONSISTENT');
  // Independently source-pinned research-derived defect proofs have their
  // own read-only owner receipt. A frozen RED->GREEN candidate does NOT
  // change the original-job queue or grant installation rights.
  const receiptResponse=await fetch(db.url+
   '/rest/v1/rpc/reality_read_owner_market_repair_proofs_v1',{
   method:'POST',cache:'no-store',redirect:'error',headers:{
    apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    accept:'application/json','content-type':'application/json'},
   body:JSON.stringify({p_owner_id:session.user_id})
  });
  const proofs=await receiptResponse.json().catch(()=>null);
  if(!receiptResponse.ok||proofs?.ok!==true||
    proofs.status!=='SOURCE_PINNED_BUDGET_REPAIR_CANDIDATE_READBACK'||
    proofs.owner_id!==session.user_id||proofs.read_only!==true||
    proofs.installation_authorized!==false||
    proofs.production_changed!==false||
    !Array.isArray(proofs.items)||proofs.items.length>4||
    proofs.items.some(p=>p.status!=='FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED'||
      p.proof_kind!=='EXISTING_CAPABILITY_IMPLEMENTATION_DEFECT'||
      !/^research:[a-f0-9]{64}$/.test(p.key||'')||
      !SHA.test(p.frozen_test_sha256)||!SHA.test(p.finding_fingerprint)||
      !/^[a-f0-9]{40}$/.test(p.baseline_commit_sha||'')||
      !/^[a-f0-9]{40}$/.test(p.repair_commit_sha||'')||
      !Number.isSafeInteger(p.baseline_run_id)||p.baseline_run_id<1||
      !Number.isSafeInteger(p.green_run_id)||p.green_run_id<1||
      !Number.isSafeInteger(p.pull_request_number)||p.pull_request_number<1||
      !Number.isInteger(p.independent_red_assertion_failures)||
      p.independent_red_assertion_failures<1||
      !Number.isInteger(p.independent_green_assertion_passes)||
      p.independent_green_assertion_passes<1||
      p.owner_install_authorized!==false||
      p.fresh_original_work_verified!==false||
      p.installed!==false||p.production_changed!==false||
      p.candidate_created_by!=='ASSISTANT_AUTHORED_IN_ISOLATED_FEATURE_BRANCH'||
      typeof p.corrected_behavior!=='string'||
      typeof p.proven_defect_scope!=='string'||
      typeof p.remaining_unproven!=='string'||
      !payload.items.some(item=>item.key===p.key&&
       item.kind==='RESEARCH_OPPORTUNITY'&&
       item.verified_missing_capability===false))||
    new Set(proofs.items.map(p=>p.key)).size!==proofs.items.length)
   throw Error('CATEGORY_INTAKE_REPAIR_PROOFS_UNVERIFIED');

  const proofMap=new Map(proofs.items.map(p=>[p.key,p]));
  const merged=payload.items.map(item=>{
   const proof=proofMap.get(item.key);
   return proof?{...item,
    stage:'IMPLEMENTATION_DEFECT_REPRODUCED_REPAIR_TESTED_OWNER_REVIEW',
    priority:0,
    next_proof:'Owner review of exact candidate and original-job binding; independently verify isolated installation and original-job final settlement before calling it complete.',
    repair_proof:proof,
    // A real implementation defect is narrower than a missing executable
    // original-customer-job capability, so keep separate classifications.
    verified_missing_capability:false,
    candidate_independently_tested:true,
    owner_approval_needed:true,
    installation_authorized:false,executable_job:false}:item;
  });
  // Previously hidden signed frozen discoveries are reviewable evidence,
  // not owner-authorized jobs. Independently re-check the pinned test bytes
  // and the current isolated preview extension before showing readiness.
  // Failure to read this optional source must NOT erase the proven old feed.
  let unboundItems=[],unboundCoverage='SOURCE_REVIEW_UNAVAILABLE';
  try{
   const response=await fetch(db.url+
     '/rest/v1/rpc/reality_read_owner_unbound_capability_sources_v1',{
    method:'POST',cache:'no-store',redirect:'error',
    headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
     accept:'application/json','content-type':'application/json'},
    body:JSON.stringify({p_owner_id:session.user_id})
   });
   const source=await response.json().catch(()=>null);
   if(!response.ok||
      source?.status!=='OWNER_UNBOUND_SOURCE_OBSERVATIONS_READ_ONLY'||
      source.source_basis!=='PERSISTED_SIGNED_DISCOVERY_NOT_EXECUTABLE'||
      source.owner_goal_present!==true||
      source.coverage_complete!==true||
      source.source_reverified_now!==false||
      source.owner_authorized_new_job!==false||
      source.verified_missing_capability!==false||
      source.read_only!==true||
      source.installation_authorized!==false||
      source.original_job_completed!==false||
      source.production_changed!==false||
      !Array.isArray(source.observations)||source.observations.length>8)
    throw Error('UNBOUND_SOURCE_OWNER_SCOPE_NOT_VERIFIED');
   unboundItems=await qualifyUnboundSourceBatch(source.observations,{
    currentCommit:process.env.VERCEL_GIT_COMMIT_SHA,
    githubToken:process.env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||null
   });
   if(unboundItems.some(x=>x.kind!=='UNBOUND_FROZEN_DISCOVERY'||
      x.installation_authorized!==false||
      x.verified_missing_capability!==false||
      x.owner_authorized_new_job!==false||
      x.executable_job!==false||x.production_changed!==false||
      x.candidate_independently_tested!==false||
      !/^unbound:[a-f0-9]{64}$/.test(x.key)||!Number.isSafeInteger(x.priority)||
      !Array.isArray(x.pros)||!Array.isArray(x.cons))||
      unboundItems.length+merged.length>30||
      new Set([...merged,...unboundItems].map(x=>x.key)).size!==
       merged.length+unboundItems.length)
    throw Error('UNBOUND_SOURCE_CLASSIFICATION_UNTRUSTED');
   unboundCoverage=unboundItems.every(x=>x.source_check_completed)?
      'ALL_UNBOUND_SOURCES_REOBSERVED':
      'PARTIAL_UNBOUND_SOURCE_REOBSERVATION';
  }catch{
   unboundItems=[];
  }
  const items=[...merged,...unboundItems];
  // Strictly bound to authenticated server session; no browser role or
  // model instruction can change eligibility, findings, or work authority.
  return res.status(200).json({
   ok:true,status:payload.status,
   counts:{...payload.counts,
    current_candidates:items.length,
    frozen_source_discoveries:unboundItems.length,
    current_source_absence_confirmed:unboundItems.filter(x=>
      x.verified_current_source_absence===true).length,
    verified_implementation_defects:proofs.items.length,
    independently_tested_research_repairs:proofs.items.length},
   items,settled_history:payload.settled_history,
   source_basis:payload.source_basis,
   unbound_source_coverage:unboundCoverage,
   read_only:true,installation_authorized:false,
   work_started:false,production_changed:false});
 }catch(error){
  console.warn('REALITY_GAP_CATEGORY_INTAKE_UNAVAILABLE',
   String(error?.message||'').startsWith('CATEGORY_INTAKE_')?
    'READBACK_OR_CONFIG':'PROVIDER_OR_AUTH');
  return res.status(503).json({
   ok:false,error:'CATEGORY_INTAKE_UNAVAILABLE',
   read_only:true,installation_authorized:false,
   work_started:false,production_changed:false});
 }
}
