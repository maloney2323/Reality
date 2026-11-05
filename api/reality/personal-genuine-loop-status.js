// Owner-authenticated, READ-ONLY status for the genuine capability loop.
// Never accepts job IDs, approval, or execution commands from a browser.
// Service RPC re-derives ownership from the original VERIFIED Universe event.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
export const maxDuration=45;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET')return res.status(405).json({
   ok:false,error:'GENUINE_LOOP_READ_ONLY_GET_REQUIRED'});
  if(Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'GENUINE_LOOP_CLIENT_SCOPE_REJECTED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const env=process.env;
  const db=resolveReliabilityBenchmarkDb(env);
  if(env.VERCEL_ENV!=='preview'||!UUID.test(session.user_id)||
     !db?.strictSecrets||!db.secretKey||
     db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
     db.url!==session.config?.url)
   return res.status(403).json({ok:false,error:'GENUINE_LOOP_OWNER_SCOPE_NOT_VERIFIED'});
  const response=await fetch(db.url+'/rest/v1/rpc/reality_read_owner_genuine_loop_v1',{
   method:'POST',redirect:'error',cache:'no-store',
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    accept:'application/json','content-type':'application/json'},
   body:JSON.stringify({p_owner_id:session.user_id})
  });
  const v=await response.json().catch(()=>null);
  if(!response.ok||v?.status!=='OWNER_GOVERNED_LOOP_READBACK'||
     !Array.isArray(v.jobs)||v.jobs.length>12||
     v.owner_installation_authorized_by_read!==false||
     v.external_action_performed!==false||v.production_changed!==false||
     v.jobs.some(j=>!WORK.test(j.original_work_id)||
      !UUID.test(j.trigger_id)||
      typeof j.phase!=='string'||j.phase.length>80||
      typeof j.candidate_verified!=='boolean'||
      typeof j.owner_install_approved!=='boolean'||
      (j.independently_settled!=null&&
       typeof j.independently_settled!=='boolean')||
      j.environment!=='ISOLATED_PREVIEW'))
   return res.status(503).json({ok:false,error:'GENUINE_LOOP_INDEPENDENT_READBACK_UNAVAILABLE'});
  const finalResponse=await fetch(db.url+
    '/rest/v1/rpc/reality_read_owner_final_receipts_v1',{
    method:'POST',redirect:'error',cache:'no-store',
    headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
     accept:'application/json','content-type':'application/json'},
    body:JSON.stringify({p_owner_id:session.user_id})});
  const final=await finalResponse.json().catch(()=>null);
  if(!finalResponse.ok||final?.status!=='INDEPENDENT_FINAL_RECEIPT_READBACK'||
     !Array.isArray(final.receipts)||final.receipts.length>12||
     final.does_not_authorize_actions!==true||
     final.receipts.some(r=>
       r.status!=='FULL_LOOP_INDEPENDENTLY_VERIFIED'||
       !WORK.test(r.original_work_id)||
       !/^[a-f0-9]{64}$/.test(r.artifact_sha256||'')||
       !/^[a-f0-9]{40}$/.test(r.installed_commit_sha||'')||
       !UUID.test(r.settlement_event_id)||
       !/^sha256:[a-f0-9]{64}$/.test(r.verifier_artifact_digest||'')||
       !Number.isSafeInteger(r.provider_run_id)||r.provider_run_id<1||
       r.production_changed!==false))
   return res.status(503).json({ok:false,error:'FINAL_RECEIPT_TRUSTED_OWNER_READBACK_UNAVAILABLE'});
  // A signed owner approval can outlive the historical deficit it was
  // intended to repair. Check the exact owner-bound trigger through the
  // service-only reconciliation readback. Never infer that this NEW
  // original job settled from a PREVIOUS job's verified Universe event.
  const historical=new Map();
  const candidates=v.jobs.filter(j=>
   j.capability_id==='reality-continuity-settlement-reconciler'&&
   j.phase==='ISOLATED_INSTALLED_PROBATION'&&
   j.owner_install_approved===true&&
   j.isolated_installed===true&&
   j.independently_settled!==true).slice(0,3);
  for(const job of candidates){
   try{
    const r=await fetch(db.url+
      '/rest/v1/rpc/reality_read_genuine_reconciliation_target_v1',{
       method:'POST',redirect:'error',cache:'no-store',
       headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
        accept:'application/json','content-type':'application/json'},
       body:JSON.stringify({p_repairing_trigger_id:job.trigger_id}),
      });
    if(!r.ok)continue;
    const proof=await r.json().catch(()=>null);
    if(proof?.status==='RECONCILIATION_ALREADY_SATISFIED_BY_VERIFIED_UNIVERSE'&&
      proof.repairing_original_work_id===job.original_work_id&&
      WORK.test(proof.previous_repairing_original_work_id)&&
      WORK.test(proof.previous_reconciliation_target_work_id)&&
      UUID.test(proof.previous_original_universe_event_id)&&
      UUID.test(proof.previous_target_universe_event_id)&&
      proof.independent_database_readback===true&&
      proof.unresolved_reconciliation_targets===0&&
      proof.new_reconciliation_proposed===false&&
      proof.original_job_completed===false&&
      proof.production_changed===false)
     historical.set(job.original_work_id,{
      status:'HISTORICAL_RECONCILIATION_ALREADY_VERIFIED_NO_NEW_EFFECT',
      previous_repairing_original_work_id:proof.previous_repairing_original_work_id,
      previous_reconciliation_target_work_id:proof.previous_reconciliation_target_work_id,
      previous_original_universe_event_id:proof.previous_original_universe_event_id,
      previous_target_universe_event_id:proof.previous_target_universe_event_id,
      independent_database_readback:true,current_job_settled:false,
      new_execution_authorized:false,production_changed:false});
   }catch{/* Fail closed: missing readback never produces a completion claim. */}
  }
  // The final no-new-work disposition is a DIFFERENT kind of terminal
  // receipt from a settled customer job. Read it from the restricted RPC,
  // only for original work already independently scoped to this owner.
  const noWorkDispositions=new Map();
  const noWorkJob=v.jobs.find(j=>
   j.original_work_id==='work:bf17f1716f7c9550680d761e64f8b591'&&
   j.capability_id==='reality-continuity-settlement-reconciler'&&
   j.owner_install_approved===true&&j.independently_settled!==true);
  if(noWorkJob){
   try{
    const response=await fetch(db.url+
     '/rest/v1/rpc/reality_read_genuine_historical_no_work_v1',{
      method:'POST',redirect:'error',cache:'no-store',
      headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
       accept:'application/json','content-type':'application/json'},
      body:JSON.stringify({p_work:noWorkJob.original_work_id})
     });
    if(response.ok){
     const proof=await response.json().catch(()=>null);
     if(proof?.status==='HISTORICAL_OBJECTIVE_SATISFIED_NO_NEW_EXECUTION'&&
       proof.original_work_id===noWorkJob.original_work_id&&
       UUID.test(proof.receipt_id)&&
       UUID.test(proof.original_work_event_id)&&
       UUID.test(proof.previous_original_universe_event_id)&&
       UUID.test(proof.previous_target_universe_event_id)&&
       proof.previous_original_universe_event_id!==
        proof.previous_target_universe_event_id&&
       /^[a-f0-9]{64}$/.test(proof.previous_original_event_content_hash||'')&&
       /^[a-f0-9]{64}$/.test(proof.previous_target_event_content_hash||'')&&
       /^[a-f0-9]{40}$/.test(proof.signed_repository_sha||'')&&
       Number.isSafeInteger(proof.signed_github_run_id)&&
       proof.signed_github_run_id>0&&
       proof.independent_database_readback===true&&
       proof.unresolved_reconciliation_targets===0&&
       proof.original_job_completed===false&&
       proof.original_execution_replayed===false&&
       proof.new_execution_claim_consumed===false&&
       proof.new_universe_settlement_written===false&&
       proof.measured_roi_claimed===false&&
       proof.installation_replay_authorized===false&&
       proof.production_changed===false)
       noWorkDispositions.set(noWorkJob.original_work_id,{
        status:proof.status,
        receipt_id:proof.receipt_id,
        recorded_at:proof.recorded_at,
        signed_github_run_id:proof.signed_github_run_id,
        previous_original_universe_event_id:proof.previous_original_universe_event_id,
        previous_target_universe_event_id:proof.previous_target_universe_event_id,
        independent_database_readback:true,
        original_job_completed:false,
        original_execution_replayed:false,
        new_universe_settlement_written:false,
        new_execution_claim_consumed:false,
        measured_roi_claimed:false,
        installation_replay_authorized:false,
        production_changed:false});
    }
   }catch{/* Unavailable verification keeps the job pending, never closed. */}
  }
  const jobs=v.jobs.map(j=>{
    const receipt=final.receipts.find(r=>r.original_work_id===j.original_work_id);
    return {...j,
      historical_reconciliation:historical.get(j.original_work_id)||null,
      historical_no_work_final_disposition:noWorkDispositions.get(j.original_work_id)||null,
      terminal_no_new_work_verified:noWorkDispositions.has(j.original_work_id),
      owner_install_approved:j.owner_install_approved===true,
      candidate_verified:j.candidate_verified===true,
      independently_settled:j.independently_settled===true,
      isolated_installed:j.isolated_installed===true,
      universe_settlement_verified:j.universe_settlement_verified===true||
        (j.capability_id==='reality-general-execution-receipt'&&
         j.independently_settled===true&&Boolean(receipt)),
      full_loop_independently_verified:
        j.capability_id==='reality-general-execution-receipt'&&
        j.independently_settled===true&&Boolean(receipt)};
  });
  return res.status(200).json({ok:true,...v,jobs,
   independent_final_receipts:final.receipts,
   full_loop_proof_not_inferred_from_settlement:true});
 }catch{
  return res.status(503).json({
   ok:false,error:'GENUINE_LOOP_TRUSTED_STATUS_UNAVAILABLE',
   original_job_completed:false,production_changed:false});
 }
}
