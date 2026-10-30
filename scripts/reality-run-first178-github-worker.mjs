// Run the EXISTING Reality #178 constitutional worker inside a GitHub Actions
// runner. Never create a new job, authorize installation or claim settlement.
// workflow_dispatch is an operator execution trigger; the persisted original
// customer authorization is independently re-verified before consuming work.
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {dispatchFirst178ApprovedOriginal}
 from '../api/reality/personal-first-upgrade-178-dispatch.js';

const WORK='work:9b9578b3c65427589c4c6da68fe0fc87';
const BRANCH='feature/first178-live-single-claim-execution-20261029';
const PROJECT='hvkfreoagbrphwghjajw';
const stop=code=>{throw Error('REALITY_FIRST178_GITHUB_WORKER_'+code)};
export function verifyGitHubFirst178Run(env,actualCheckoutSha){
 if(env.GITHUB_ACTIONS!=='true'||
    env.GITHUB_EVENT_NAME!=='workflow_dispatch'||
    env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
    env.GITHUB_REF!=='refs/heads/'+BRANCH||
    !/^[a-f0-9]{40}$/.test(String(env.GITHUB_SHA||''))||
    env.GITHUB_SHA!==actualCheckoutSha)
  stop('EXACT_WORKFLOW_REPOSITORY_BRANCH_COMMIT_REQUIRED');
 if(env.REALITY_FIRST178_EXECUTOR!=='GITHUB_ACTIONS'||
    env.VERCEL_ENV!=='preview'||
    env.VERCEL_GIT_COMMIT_REF!==BRANCH||
    env.VERCEL_GIT_COMMIT_SHA!==env.GITHUB_SHA||
    env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF!==PROJECT||
    env.REALITY_RELIABILITY_BENCHMARK_PROJECT_REF!==PROJECT||
    env.REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF!==PROJECT||
    env.REALITY_PERSONAL_CHAT_SUPABASE_URL!=='https://'+PROJECT+'.supabase.co'||
    env.REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL!==
     'https://'+PROJECT+'.supabase.co'||
    env.REALITY_CONTINUOUS_RELIABILITY_ENABLED!=='true'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  stop('ISOLATED_PREVIEW_DATABASE_AND_AUTH_CONTEXT_REQUIRED');
 const missing=[
  ['SUPABASE_SERVICE_ROLE_KEY',env.SUPABASE_SECRET_KEY],
  ['OPENAI_API_KEY',env.REALITY_STANDALONE_OPENAI_API_KEY],
  ['VERCEL_TOKEN',env.VERCEL_TOKEN],
  ['VERCEL_TEAM_ID',env.VERCEL_TEAM_ID],
  ['VERCEL_PROJECT_ID',env.VERCEL_PROJECT_ID],
  ['REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY',
   env.REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY],
  ['REALITY_CHAT_RECEIPT_HMAC_KEY',
   env.REALITY_CHAT_RECEIPT_HMAC_KEY],
  ['GITHUB_TOKEN',env.REALITY_FIRST178_GITHUB_READ_TOKEN],
 ].filter(([,v])=>typeof v!=='string'||v.length<18)
  .map(([name])=>name);
 if(missing.length)stop('REQUIRED_GITHUB_SECRETS_MISSING_'+missing.join('_'));
 if(!env.REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY.startsWith('sb_publishable_')||
    env.VERCEL_PROJECT_ID!=='prj_5A3b0WG9IuvzyEUBw9tD9v8jcha8')
  stop('PREVIEW_SUPABASE_OR_VERCEL_PROJECT_NOT_EXACT');
 if(!String(env.REALITY_SEMANTIC_REVIEW_MODEL||'').trim())
  stop('MODEL_NOT_SET');
 return Object.freeze({validated:true,original_work_id:WORK,
  original_job_preserved:true,installation_authorized:false});
}
export async function runGitHubFirst178Recovery({
 env=process.env,checkoutSha,dispatch=dispatchFirst178ApprovedOriginal,
}={}){
 verifyGitHubFirst178Run(env,checkoutSha);
 // The privileged DB function mints a single-use delegation for the
 // already-authorized original #178. A failed/uncertain worker run must not
 // mint another delegation or silently reset its exhausted attempt ledger.
 const result=await dispatch({env});
 if(result?.verified_server_dispatch!==true||
    result.original_work_id!==WORK||
    result.original_job_completed!==false||
    result.installed!==false||
    result.production_changed!==false)
  stop('INDEPENDENT_SOURCE_BOUND_DISPATCH_RESULT_REQUIRED');
 if(result.status!=='AWAITING_OWNER_APPROVAL'){
  // ESCALATED/UNRESOLVED is NOT a successful upgrade.
  // Never print credentials, model outputs, or a forged completion receipt.
  stop('NO_PASSING_APPROVABLE_CANDIDATE_'+
   String(result.status||'UNRESOLVED').replace(/[^A-Z0-9_]/g,'_'));
 }
 return Object.freeze({status:result.status,original_work_id:WORK,
  queue_id:result.queue_id,
  checkpoint_receipt_id:result.checkpoint_receipt_id,
  approval_1_required:true,installation_authorized:false,
  original_job_completed:false,production_changed:false});
}

const direct=process.argv[1]&&
 new URL('file://'+process.argv[1]).href===import.meta.url;
if(direct){
 try{
  const checkoutSha=execFileSync('git',['rev-parse','HEAD'],{
   encoding:'utf8'}).trim();
  const r=await runGitHubFirst178Recovery({checkoutSha});
  // GitHub logs are an operator progress surface, not a settlement receipt.
  console.log(JSON.stringify({status:r.status,original_work_id:WORK,
   checkpoint_receipt_id:r.checkpoint_receipt_id,
   approval_1_required:true,installation_authorized:false,
   original_job_completed:false}));
 }catch(e){
  const message=String(e?.message||'UNKNOWN');
  console.error(/^REALITY_FIRST178_GITHUB_WORKER_[A-Z0-9_]+$/.test(message)?
   message:'REALITY_FIRST178_GITHUB_WORKER_EXECUTION_FAILED_RECONCILE_DURABLE_RECEIPT');
  process.exitCode=1;
 }
}
