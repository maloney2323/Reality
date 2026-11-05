// Signed evidence-only closure for original #201. Never claims or executes work.
import {mkdirSync,writeFileSync} from 'node:fs';
const env=process.env;
const WORK='work:bf17f1716f7c9550680d761e64f8b591';
const SHA40=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function fail(code){throw Error('REALITY_SIGNED_HISTORICAL_NO_WORK_'+code)}
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
 env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
 !SHA40.test(env.GITHUB_SHA||'')||
 !env.ACTIONS_ID_TOKEN_REQUEST_URL||!env.ACTIONS_ID_TOKEN_REQUEST_TOKEN||
 typeof env.GH_TOKEN!=='string'||env.GH_TOKEN.length<20)
 fail('PINNED_GITHUB_OIDC_WORKER_REQUIRED');
const oidcUrl=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
oidcUrl.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
const oidc=await fetch(oidcUrl,{cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
if(!oidc.ok)fail('GITHUB_OIDC_UNAVAILABLE');
const jwt=(await oidc.json()).value;
if(typeof jwt!=='string'||jwt.length<300)fail('GITHUB_IDENTITY_UNVERIFIED');
const b=await fetch('https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
 method:'POST',cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
  'x-reality-github-provider-token':env.GH_TOKEN},
 body:JSON.stringify({action:'historical_no_work_final_record',
  scope:{original_work_id:WORK,repository_sha:env.GITHUB_SHA}})});
const result=await b.json().catch(()=>null);
const receipt=result?.receipt;
if(!b.ok||result?.ok!==true||
 result?.status!=='HISTORICAL_NO_NEW_WORK_FINAL_RECEIPT_VERIFIED'||
 !UUID.test(receipt?.receipt_id||'')||
 receipt?.status!=='HISTORICAL_OBJECTIVE_SATISFIED_NO_NEW_EXECUTION'||
 receipt?.original_work_id!==WORK||
 receipt?.previous_repairing_original_work_id!=='work:d90acd41ed1b1116ee74086846d61d42'||
 receipt?.previous_reconciliation_target_work_id!=='work:31bf26a5459f5c2d3039da69c39783c8'||
 receipt?.previous_original_universe_event_id!=='dfe99dea-62b4-41de-8f94-97ad06c54131'||
 receipt?.previous_target_universe_event_id!=='fdbe18d3-ab21-471f-981d-b83ded8286ee'||
 !/^[a-f0-9]{64}$/.test(receipt?.previous_original_event_content_hash||'')||
 !/^[a-f0-9]{64}$/.test(receipt?.previous_target_event_content_hash||'')||
 receipt?.independent_database_readback!==true||
 receipt?.unresolved_reconciliation_targets!==0||
 receipt?.original_job_completed!==false||
 receipt?.original_execution_replayed!==false||
 receipt?.new_execution_claim_consumed!==false||
 receipt?.new_universe_settlement_written!==false||
 receipt?.installation_replay_authorized!==false||
 receipt?.measured_roi_claimed!==false||
 receipt?.production_changed!==false||
 result?.signed_worker_run_id!==Number(env.GITHUB_RUN_ID)||
 result?.original_execution_replayed!==false||
 result?.new_universe_settlement_written!==false||
 result?.production_changed!==false)
 fail('FINAL_DISPOSITION_NOT_INDEPENDENTLY_VERIFIED_'+String(result?.error||'DENIED').slice(0,70));
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-201-historical-no-work-final-disposition.json',
 JSON.stringify({schema:'reality-201-historical-no-work-final-disposition-v1',
  status:receipt.status,receipt,verified_by_signed_run_id:Number(env.GITHUB_RUN_ID),
  no_new_work:true,production_changed:false},null,2)+'\n');
console.log('REALITY_201_HISTORICAL_NO_NEW_WORK_FINAL_RECEIPT_VERIFIED',
 JSON.stringify({original_work_id:WORK,receipt_id:receipt.receipt_id,
  historical_universe_events:[receipt.previous_original_universe_event_id,
   receipt.previous_target_universe_event_id],
  original_job_reexecuted:false,new_settlement_written:false,
  independent_database_readback:true,production_changed:false}));
