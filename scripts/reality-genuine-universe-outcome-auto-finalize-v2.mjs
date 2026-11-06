// Signed, unattended one-pass settlement repair + idempotence proof.
// Allows only pinned-branch push or OIDC-authenticated workflow_dispatch.
// No claimed original execution or installation is replayed.
import {mkdirSync,writeFileSync} from 'node:fs';
const e=process.env,fail=x=>{throw Error('REALITY_UNIVERSE_AUTO_FINALIZE_'+x)};
const REPO='maloney2323/Reality';
const BRANCH='refs/heads/feature/reality-general-capability-engine-20261101';
if(e.GITHUB_ACTIONS!=='true'||!['push','workflow_dispatch'].includes(e.GITHUB_EVENT_NAME)||
 e.GITHUB_REPOSITORY!==REPO||e.GITHUB_REF!==BRANCH||
 !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA||'')||
 !e.GH_TOKEN||!e.ACTIONS_ID_TOKEN_REQUEST_URL||!e.ACTIONS_ID_TOKEN_REQUEST_TOKEN)
 fail('SIGNED_ISOLATED_WORKFLOW_REQUIRED');
async function request(){
 const u=new URL(e.ACTIONS_ID_TOKEN_REQUEST_URL);
 u.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
 const r=await fetch(u,{cache:'no-store',redirect:'error',headers:{
  authorization:'Bearer '+e.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
 if(!r.ok)fail('OIDC_UNAVAILABLE');
 const jwt=(await r.json()).value;
 if(typeof jwt!=='string'||jwt.length<300)fail('OIDC_INVALID');
 const response=await fetch('https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
  method:'POST',redirect:'error',cache:'no-store',
  headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
   'x-reality-github-provider-token':e.GH_TOKEN},
  body:JSON.stringify({action:'universe_outcome_reconcile',scope:{repository_sha:e.GITHUB_SHA}})});
 const out=await response.json().catch(()=>null);
 if(!response.ok||out?.ok!==true)fail('SIGNED_BROKER_'+String(out?.error||response.status).slice(0,100));
 if(out.status!=='SETTLED_OUTCOMES_RECONCILED'||
 out.repository_sha!==e.GITHUB_SHA||
 out.signed_run_id!==Number(e.GITHUB_RUN_ID)||
 out.receipt?.status!=='ALL_SETTLED_OUTCOMES_VERIFIED'||
 out.production_changed!==false||out.production_release_authorized!==false||
 out.snapshot?.unreconciled_settlements!==0||
 out.snapshot?.settled_original_jobs!==out.snapshot?.verified_universe_settlements||
 out.snapshot?.settled_original_jobs!==out.snapshot?.independent_provider_verified_settlements||
 out.snapshot?.production_release_authorized!==false)
 fail('INDEPENDENT_DATABASE_READBACK_FAILED');
 return out;
}
const first=await request();
const replay=await request();
if(replay.receipt.newly_reconciled!==0||
 replay.receipt.already_verified!==first.snapshot.settled_original_jobs||
 replay.snapshot.verified_universe_settlements!==first.snapshot.verified_universe_settlements)
 fail('REPEAT_NOT_IDEMPOTENT');
const proof={
 schema:'reality-signed-automatic-original-universe-outcome-v2',
 source:'SIGNED_GITHUB_OIDC_SERVICE_ROLE_TRANSACTION_AND_SECOND_READBACK',
 github_run_id:Number(e.GITHUB_RUN_ID),repository_sha:e.GITHUB_SHA,
 newly_reconciled:first.receipt.newly_reconciled,
 already_verified:first.receipt.already_verified,
 idempotent_replay_new_events:replay.receipt.newly_reconciled,
 settled_original_jobs:first.snapshot.settled_original_jobs,
 provider_verified:first.snapshot.independent_provider_verified_settlements,
 independently_verified_universe_events:first.snapshot.verified_universe_settlements,
 unreconciled:first.snapshot.unreconciled_settlements,
 full_probation_complete:false,production_release_authorized:false,production_changed:false};
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-all-settled-universe-outcomes.json',JSON.stringify(proof,null,2)+'\n');
console.log('REALITY_AUTOMATIC_UNIVERSE_OUTCOME_VERIFIED',JSON.stringify(proof));
