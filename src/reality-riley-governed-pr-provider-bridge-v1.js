// Reality capability dispatch: authenticated service -> governed provider broker.
// Provider credentials remain exclusively in Reality's Supabase Edge broker.
// This module NEVER invokes GitHub or passes a GitHub token to the model.
export const GOVERNED_PR_PROVIDER_BRIDGE_VERSION='reality-governed-pr57-publisher-bridge-v1';
const ORIGINAL='work:94fc872f8ba9062f968920c59218c3ca';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const SOURCE='https://github.com/maloney2323/Reality/pull/57';
const ERROR=x=>{throw Error('REALITY_GOVERNED_PR_PROVIDER_'+x)};
const hold=(status,more={})=>Object.freeze({
 version:GOVERNED_PR_PROVIDER_BRIDGE_VERSION,status,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,...more
});
export async function executeExactlyPreparedRileyReviewViaReality({
 db,env=process.env,graph,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||!db?.secretKey||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   typeof fetchImpl!=='function')ERROR('ISOLATED_SERVICE_BOUNDARY_REQUIRED');
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||graph.shift_id!==SHIFT||
   graph.installation_authorized!==false||graph.production_changed!==false||
   !Array.isArray(graph.jobs))ERROR('VERIFIED_ORIGINAL_GRAPH_REQUIRED');
 const originals=graph.jobs.filter(j=>j.original_work_id===ORIGINAL&&
  j.source_ref===SOURCE&&j.original_kind==='REAL_PR_REVIEW_ORIGINAL'&&
  j.independent_source_proof_verified===true);
 if(originals.length!==1||!['PREPARED','PUBLISHING'].includes(originals[0].phase))
  return hold('NO_CURRENT_EXACT_PR57_REVIEW_READY');
 let r;
 try{r=await fetchImpl(db.url+'/functions/v1/reality-governed-pr-review-publisher-v1',{
  method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(14500),
  headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   'content-type':'application/json',accept:'application/json'},
  body:'{"version":1}'
 });}catch{
  return hold('GOVERNED_PR_PROVIDER_BROKER_UNREACHABLE');
 }
 let data;try{data=await r.json()}catch{
  return hold('GOVERNED_PR_PROVIDER_BROKER_RESPONSE_NOT_VERIFIED');
 }
 if(!data||typeof data!=='object'||Array.isArray(data)||
    data.installation_authorized!==false||data.production_changed!==false||
    data.new_shift_created!==false||data.code_installed!==false)
  ERROR('BROKER_MUST_FAIL_CLOSED');
 if(r.ok&&data.status==='EXACT_GOVERNED_PR_REVIEW_PROVIDER_SETTLED'){
  if(data.original_work_id!==ORIGINAL||data.shift_id!==SHIFT||
     data.original_job_completed!==true||
     data.independent_provider_readback_verified!==true||
     !/^supabase:riley_pr_review_originals_v1:[a-f0-9-]{36}$/.test(
      data.settlement_receipt_ref||'')||
     !/^https:\/\/github\.com\/maloney2323\/Reality\/(?:pull|issues)\/57#issuecomment-[1-9]\d*$/.test(
      data.provider_comment_url||''))
   ERROR('BROKER_SETTLEMENT_PROVIDER_OR_ORIGINAL_IDENTITY_INVALID');
  return Object.freeze({version:GOVERNED_PR_PROVIDER_BRIDGE_VERSION,
   status:'EXACT_PR_REVIEW_ORIGINAL_INDEPENDENTLY_SETTLED',
   original_work_id:ORIGINAL,source_ref:SOURCE,shift_id:SHIFT,
   provider_comment_url:data.provider_comment_url,
   settlement_receipt_ref:data.settlement_receipt_ref,
   independently_verified_original_receipt:true,
   original_job_completed:true,code_repair_completed:false,
   installation_authorized:false,production_changed:false,
   verified_human_hours_saved:null});
 }
 const allowed=new Set([
  'BROKER_GITHUB_WRITER_NOT_CONFIGURED',
  'NO_EXACT_AUTHORIZED_PREPARED_REVIEW',
  'EXISTING_ORIGINAL_SETTLED_NO_PROVIDER_REPLAY',
  'PUBLISHING_WITH_UNKNOWN_EFFECT_READBACK_ONLY',
  'PREEXISTING_PROVIDER_EFFECT_REQUIRES_RECONCILIATION',
  'POST_UNCERTAIN_RECONCILE_BY_READBACK_ONLY',
  'GITHUB_BROKER_PERMISSION_OR_TOKEN_REJECTED',
  'PR57_HEAD_OR_APPROVED_SOURCE_DRIFT'
 ]);
 const status=String(data.status||'');
 if(!allowed.has(status))return hold('GOVERNED_PR_PROVIDER_BROKER_BLOCKED');
 return hold(status,{existing_original:ORIGINAL});
}
