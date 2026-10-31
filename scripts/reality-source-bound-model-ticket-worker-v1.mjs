// Claims ONE previously owner-confirmed and independently dispatched source gap.
// A public GitHub request file never supplies owner, goal or coding authority.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const fail=x=>{throw Error('REALITY_SOURCE_BOUND_MODEL_'+x)};
const WORKER='feature/reality-closed-loop-worker-20261031';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export function validateSourceBoundGenerationEvidence(request,receipt){
 if(!UUID.test(request?.queue_id)||!WORK.test(request?.original_work_id)||
  !Number.isSafeInteger(request.issue_number)||request.issue_number<1||
  Object.keys(request).sort().join(',')!==
   'issue_number,original_work_id,queue_id,schema'||
  request.schema!=='reality-isolated-build-request-v1'||
  receipt?.status!=='EXACT_SOURCE_BOUND_GENERATION_ADMITTED'||
  receipt.queue_id!==request.queue_id||
  receipt.original_work_id!==request.original_work_id||
  receipt.issue_number!==request.issue_number||
  !UUID.test(receipt.claim_id)||!SHA.test(receipt.baseline_source_sha)||
  !HASH.test(receipt.frozen_test_sha256)||
  !Number.isSafeInteger(receipt.failed_run_id)||receipt.failed_run_id<1||
  !/^src\/reality-extensions\/[a-z0-9._/-]+\.mjs$/.test(receipt.expected_source_path)||
  !/^test\/reality-frozen-regressions\/[a-z0-9._/-]+\.test\.js$/.test(receipt.frozen_test_path)||
  [receipt.expected_source_path,receipt.frozen_test_path].some(p=>
   p.includes('//')||p.split('/').includes('..'))||
  receipt.installation_authorized!==false||
  receipt.job_completed!==false||receipt.production_changed!==false)
  fail('INDEPENDENT_OWNER_WORK_PROVIDER_RECEIPT_INVALID');
 return Object.freeze({
  schema:'reality-source-verified-repair-job-v1',
  issue_number:receipt.issue_number,original_work_id:receipt.original_work_id,
  queue_id:receipt.queue_id,claim_id:receipt.claim_id,
  failed_run_id:receipt.failed_run_id,
  baseline_source_sha:receipt.baseline_source_sha,
  frozen_test_path:receipt.frozen_test_path,
  frozen_test_sha256:receipt.frozen_test_sha256,
  expected_source_path:receipt.expected_source_path,
  authorizing_scope:'ALREADY_CLAIMED_OWNER_SOURCE_BOUND_MODEL_AND_ISOLATED_TEST_ONLY',
  installation_authorized:false,original_job_completed:false,
  production_changed:false,
 });
}
export async function prepareOriginalModelTicket({
 env=process.env,checkoutSha,changed,request,fetchImpl=fetch,
}={}){
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
  env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
  env.GITHUB_REF!=='refs/heads/'+WORKER||
  env.GITHUB_SHA!==checkoutSha||!SHA.test(checkoutSha)||
  env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
  env.REALITY_PERSONAL_CHAT_SUPABASE_URL!==
   'https://hvkfreoagbrphwghjajw.supabase.co'||
  !Array.isArray(changed)||changed.length!==1||
  changed[0]!=='reality-requests/'+request.queue_id+'.json'||
  typeof env.SUPABASE_SERVICE_ROLE_KEY!=='string'||
  env.SUPABASE_SERVICE_ROLE_KEY.length<30)
  fail('PINNED_ISOLATED_GITHUB_WORKER_REQUIRED');
 if(!UUID.test(request.queue_id)||!WORK.test(request.original_work_id))
  fail('UNTRUSTED_REQUEST_SCOPE_INVALID');
 const body={
  p_queue_id:request.queue_id,p_original_work_id:request.original_work_id,
  p_github_sha:checkoutSha,p_request_path:changed[0],
 };
 let data=null;
 // Server commits the request SHA to the queue just after the GitHub push.
 // Retry ONLY the unchanged atomic claim; do not create another queue.
 for(let attempt=0;attempt<8;attempt++){
  const response=await fetchImpl(env.REALITY_PERSONAL_CHAT_SUPABASE_URL+
   '/rest/v1/rpc/reality_claim_source_bound_generation_v1',{
   method:'POST',redirect:'error',cache:'no-store',
   headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,
    authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,
    'content-type':'application/json',accept:'application/json'},
   body:JSON.stringify(body),
  });
  const candidate=await response.json().catch(()=>null);
  if(response.ok){data=candidate;break}
  if(attempt===7)fail('PREEXISTING_OWNER_QUEUE_NOT_ATOMICALLY_CLAIMABLE');
  await new Promise(r=>setTimeout(r,1500));
 }
 return validateSourceBoundGenerationEvidence(request,data);
}
async function main(){
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const changed=execFileSync('git',['diff','--name-only','HEAD^','HEAD'],
  {encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 if(changed.length!==1||!/^reality-requests\/[a-f0-9-]{36}\.json$/.test(changed[0]))
  fail('ONE_EXISTING_WORK_REQUEST_REQUIRED');
 const request=JSON.parse(readFileSync(changed[0],'utf8'));
 const ticket=await prepareOriginalModelTicket({
  env:process.env,checkoutSha:sha,changed,request});
 mkdirSync('reality-worker-result',{recursive:true});
 writeFileSync('reality-worker-result/ticket.json',JSON.stringify(ticket,null,2)+'\n');
 console.log('REALITY_TRUSTED_MODEL_TICKET',JSON.stringify({
  queue_id:ticket.queue_id,original_work_id:ticket.original_work_id,
  original_provider_run_id:ticket.failed_run_id,
  baseline_source_sha:ticket.baseline_source_sha,
  installation_authorized:false,job_completed:false}));
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 try{await main()}catch(e){
  const code=String(e?.message||'');
  console.error(/^REALITY_SOURCE_BOUND_MODEL_[A-Z0-9_]+$/.test(code)?
   code:'REALITY_SOURCE_BOUND_MODEL_TRUSTED_PROVIDER_UNAVAILABLE');
  process.exitCode=1;
 }
}
