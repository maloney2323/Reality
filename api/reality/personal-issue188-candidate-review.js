// Authenticated, preview-only, READ-ONLY candidate review.
// Never rewrites an already settled original job and never exposes an
// approval button for a candidate not qualified into an owner's new work.
import {authenticatedChatSession,privateChatConfig}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
const REPO='maloney2323/Reality';
const ID=41533824456;
const HISTORICAL='work:1eecc0d71b21492e0cfdd527f9c257f3';
const SOURCE='45d26806d0e192d6fdecd177464d13af2ab3b98a70070b8fd268a2f05bedee64';
const PROPOSAL_ARCHIVE='sha256:de6318fcc6a9619aff9b946991c2ed5ace12f1a6a8d5745f77d4676c6c04cc59';
const VERIFIER_ARCHIVE='sha256:9367575b9f3eb7b23f70d4f8443310814675362e3f2ab2a1b3d81a09946385e0';
async function provider(path){
 const response=await fetch('https://api.github.com/repos/'+REPO+path,{
  method:'GET',cache:'no-store',redirect:'error',headers:{
   accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-independent-owner-uninstalled-proposal-review-v1'}});
 if(!response.ok)throw Error('PROVIDER_PROPOSAL_READBACK_FAILED');
 return response.json();
}
export const maxDuration=45;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET'||Object.keys(req.query||{}).length)
   return res.status(405).json({ok:false,error:'REVIEW_ONLY_NO_CLIENT_SCOPE'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const db=resolveReliabilityBenchmarkDb();
  if(process.env.VERCEL_ENV!=='preview'||
   process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF!=='hvkfreoagbrphwghjajw'||
   !db?.strictSecrets||!db.secretKey||
   db.url!==session.config.url||db.project!=='hvkfreoagbrphwghjajw')
   throw Error('ISOLATED_OWNER_REVIEW_PROJECT_MISMATCH');
  const [run,artifacts,old]=await Promise.all([
   provider('/actions/runs/'+ID),
   provider('/actions/runs/'+ID+'/artifacts?per_page=30'),
   fetch(db.url+'/rest/v1/rpc/reality_read_owner_genuine_loop_v1',{
    method:'POST',cache:'no-store',redirect:'error',headers:{
     apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
     'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({p_owner_id:session.user_id})})
  ]);
  if(!old.ok)throw Error('OWNER_UNIVERSE_READBACK_UNAVAILABLE');
  const owner=await old.json();
  if(run.id!==ID||run.status!=='completed'||run.conclusion!=='success'||
    run.head_repository?.full_name!==REPO||
    run.head_branch!=='feature/reality-general-capability-engine-20261101'||
    !Array.isArray(artifacts.artifacts)||
    !artifacts.artifacts.some(a=>a.name==='reality-188-corrected-model-review-'+ID&&
      a.digest===PROPOSAL_ARCHIVE&&!a.expired)||
    !artifacts.artifacts.some(a=>a.name==='reality-188-owner-hardened-independent-acceptance-'+ID&&
      a.digest===VERIFIER_ARCHIVE&&!a.expired)||
    owner?.status!=='OWNER_GOVERNED_LOOP_READBACK'||!Array.isArray(owner.jobs)||
    owner.jobs.length>12||
    owner.jobs.some(x=>x.original_work_id===HISTORICAL&&
      x.phase!=='SETTLED_ISOLATED'&&x.phase!=='SETTLED'))
   throw Error('PROPOSAL_OR_HISTORICAL_GUARD_READBACK_FAILED');
  const all=owner.jobs.filter(x=>x.capability_id==='reality-general-execution-receipt');
  const active=all.filter(x=>x.phase==='AWAITING_OWNER_APPROVAL'&&x.candidate_verified===true);
  // Even with an existing qualified *different* candidate, this specific
  // uninstalled proposal is not automatically bound to it.
  return res.status(200).json({
   ok:true,status:'HARDENED_SOURCE_VERIFIED_NOT_OWNER_WORK_BOUND',
   proposal_title:'Independent execution-receipt verification upgrade',
   issue_number:188,previous_owner_work_id:HISTORICAL,
   previous_owner_work_already_settled:true,
   source_sha256:SOURCE,independent_run_id:ID,
   independent_run_url:'https://github.com/'+REPO+'/actions/runs/'+ID,
   draft_review_url:'https://github.com/'+REPO+'/pull/202',
   independent_tests_passed:23,
   security_regressions_remaining:0,
   installed:false,qualified_for_owner_installation:false,
   owner_approval_issued:false,new_original_work_id:null,
   new_owner_work_binding_required:true,
   next_step:'CONFIRM_NEW_FOLLOWON_OWNER_WORK_AND_QUALIFY_EXACT_ARTIFACT',
   existing_qualified_other_candidates:active.length,
   external_action_performed:false,original_job_completed_by_this_review:false,
   production_changed:false
  });
 }catch{
  return res.status(503).json({ok:false,
   error:'EXACT_PROPOSAL_OWNER_REVIEW_NOT_INDEPENDENTLY_AVAILABLE',
   owner_approval_issued:false,installation_performed:false,
   original_job_completed:false,production_changed:false});
 }
}
