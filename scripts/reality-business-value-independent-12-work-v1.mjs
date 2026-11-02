// Separate independent GitHub worker rechecks all twelve completed diagnostic
// outputs against live provider readbacks before accepting any business receipt.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const e=process.env,R='maloney2323/Reality',fail=x=>{throw Error('REALITY_INDEPENDENT_OPERATIONS_'+x)};
const hash=x=>createHash('sha256').update(x).digest('hex');
if(e.GITHUB_ACTIONS!=='true'||e.GITHUB_REPOSITORY!==R||
 e.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
 !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA||'')||!e.GITHUB_TOKEN)
 fail('ISOLATED_PROVIDER_SCOPE');
const manifest=JSON.parse(readFileSync('work/reality-12-real-operational-deliverables.json','utf8'));
if(manifest.schema!=='reality-business-value-12-real-work-deliverables-v1'||
 manifest.signed_run_id!==Number(e.GITHUB_RUN_ID)||
 manifest.repository_sha!==e.GITHUB_SHA||
 manifest.items?.length!==12||manifest.operational_diagnostic_deliverables!==12||
 new Set(manifest.items.map(x=>x.work_id)).size!==12||
 manifest.actual_original_customer_jobs_completed!==0||
 manifest.external_changes!==0||manifest.production_changed!==false)
 fail('UNTRUSTED_DIAGNOSTIC_WORK_RECEIPTS');
async function gh(path){
 const r=await fetch('https://api.github.com/repos/'+R+path,{cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+e.GITHUB_TOKEN,accept:'application/vnd.github+json',
 'x-github-api-version':'2022-11-28'}});
 if(!r.ok)fail('READBACK_'+r.status);
 return r.json();
}
let reconciled=0,changed=0;const verified=[];
const start=Date.now();
for(const item of manifest.items){
 const [kind,idstr]=item.work_id.replace(/^real-ops:/,'').split(':');
 const number=Number(idstr);
 const source=await gh('/'+(kind==='pr'?'pulls/':'issues/')+number);
 const p='work/deliverables/'+kind+'-'+number+'.md';
 const bytes=readFileSync(p);
 if(source.html_url!==item.source_url||
 source.state!=='open'||item.diagnostic_deliverable_completed!==true||
 item.original_owner_job_completed!==false||
 item.installation_authorized!==false||
 item.production_changed!==false||
 hash(bytes)!==item.report_sha256||!bytes.toString().includes(item.actionable_next_work))
 fail('UNVERIFIED_WORK_OUTPUT_'+item.work_id);
 const providerUpdated=source.updated_at!==item.source_updated_at||
 hash(String(source.body||''))!==item.source_body_sha256||
 (kind==='pr'&&source.head.sha!==item.provider_head_sha);
 if(providerUpdated)changed++;
 reconciled++;
 verified.push({work_id:item.work_id,provider_url:source.html_url,
  receipt_hash:item.report_sha256,provider_changed_since_first_worker:!!providerUpdated,
  result:'INDEPENDENT_ACTIONABLE_DIAGNOSTIC_VERIFIED',
  original_customer_job_completed:false});
}
if(reconciled!==12)fail('NOT_ALL_TWELVE_RECONCILED');
const proof={
 schema:'reality-business-value-independent-12-work-reconciliation-v1',
 signed_run_id:Number(e.GITHUB_RUN_ID),
 repository_sha:e.GITHUB_SHA,
 independently_verified_deliverables:reconciled,
 changed_source_alerts:changed,
 original_customer_jobs_completed:0,
 independently_verified_run_time_ms:Date.now()-start,
 first_worker_run_time_ms:manifest.elapsed_ms,
 measured_reviewer_baseline_minutes:null,
 measured_hours_returned:null,
 measured_dollars_saved:null,
 production_changed:false,
 verified
};
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-12-work-independent-readback.json',
 JSON.stringify(proof,null,2)+'\n');
console.log('REALITY_BUSINESS_VALUE_TWELVE_INDEPENDENT_WORK_PRODUCTS',JSON.stringify({
 verified:reconciled,changed_provider_sources:changed,
 first_worker_ms:manifest.elapsed_ms,verification_ms:proof.independently_verified_run_time_ms,
 actual_original_customer_jobs_completed:0,production_changed:false}));
