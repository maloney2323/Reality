// Reality's customer operations: 12 actual owner-work research deliverables.
// Each distinct output is a real issue/PR diagnostic artifact, NOT a completed
// implementation or permission to merge, close or install.
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const e=process.env,R='maloney2323/Reality';
const die=x=>{throw Error('REALITY_CUSTOMER_DELIVERABLE_'+x)};
const hash=x=>createHash('sha256').update(x).digest('hex');
if(e.GITHUB_ACTIONS!=='true'||e.GITHUB_REPOSITORY!==R||
 e.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
 !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA||'')||!e.GITHUB_TOKEN||
 !/^[1-9][0-9]{7,17}$/.test(e.GITHUB_RUN_ID||''))die('ISOLATED_RUN_REQUIRED');
async function gh(path){
 const r=await fetch('https://api.github.com/repos/'+R+path,{cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+e.GITHUB_TOKEN,accept:'application/vnd.github+json',
 'x-github-api-version':'2022-11-28','user-agent':'Reality-operational-work-value-v1'}});
 if(!r.ok)die('PROVIDER_'+r.status+'_'+path.slice(0,60));
 return r.json();
}
const jobs=[
 {kind:'issue',id:201,next:'Reconcile the open issue with signed settlement and Universe outcome; owner decides closure'},
 {kind:'issue',id:188,next:'Independently verify real missing capability and review uninstalled candidate; installation needs owner'},
 {kind:'issue',id:185,next:'Verify live full-loop UI and exact owner approval, not a simulated completion'},
 {kind:'issue',id:178,next:'Check original work history, escalation and status before any retry'},
 {kind:'issue',id:143,next:'Compare historical failures to actual later provider repairs; avoid duplicates'},
 {kind:'issue',id:62,next:'Determine whether unlinked commit has documented source and authorized follow-up'},
 {kind:'pr',id:199,next:'Review engine contracts, latest head and candidate acceptance before owner decision'},
 {kind:'pr',id:197,next:'Review signed owner-approved repair worker and source-pinned acceptance'},
 {kind:'pr',id:196,next:'Verify Repair Chat usability and continuity without altering production'},
 {kind:'pr',id:195,next:'Verify auto-wake path and authorization boundaries, then seek owner merge decision'},
 {kind:'pr',id:194,next:'Review original-job model correction and worker settlement without fabricated approvals'},
 {kind:'pr',id:193,next:'Verify source-bound auto-trigger dispatch and avoid duplicated work IDs'}
];
const started=Date.now(),items=[];
mkdirSync('artifact/out/deliverables',{recursive:true});
for(const task of jobs){
 const t=Date.now(),kind=task.kind,id=task.id;
 const source=await gh('/'+(kind==='pr'?'pulls/':'issues/')+id);
 if(source.number!==id||source.state!=='open'||
 source.html_url!=='https://github.com/'+R+'/'+(kind==='pr'?'pull/':'issues/')+id||
 (kind==='pr'&&(!source.draft||!/^[a-f0-9]{40}$/.test(source.head?.sha)))||
 (kind==='issue'&&source.pull_request))
 die('SOURCE_TAMPERED_OR_ALREADY_RESOLVED_'+id);
 const body=String(source.body||''),actualSourceHash=hash(body);
 const details=kind==='pr'?await gh('/pulls/'+id+'/files?per_page=100&page=1'):[];
 if(!Array.isArray(details))die('PR_FILE_EVIDENCE_MISSING');
 const paths=details.map(x=>({path:x.filename,status:x.status,changes:x.changes})).slice(0,100);
 const risk=kind==='pr'?'MERGE_REQUIRES_OWNER':'ISSUE_CLOSE_REQUIRES_OWNER';
 const lines=[
  '# Reality actionable business-work deliverable '+kind+' #'+id,
  '',
  'Verified source: '+source.html_url,
  'Verified current title: '+String(source.title||'').replace(/[\r\n]+/g,' ').slice(0,200),
  'Observed updated_at: '+source.updated_at,
  'Immutable description digest: '+actualSourceHash,
  'Source work category: '+kind,
  'Source status: '+source.state,
  ...(kind==='pr'?[
   'Actual PR head SHA: '+source.head.sha,
   'Base branch: '+source.base.ref,
   'Changed files observed: '+paths.length,
   ...paths.slice(0,30).map(x=>'File: '+x.path+' ('+x.status+', '+x.changes+' lines changed)')]:[]),
  '',
  'Recommended exact next work: '+task.next,
  'Acceptance evidence: re-read the exact provider source, current CI and owner authorization before consequential action.',
  'Governance: '+risk+'. Source diagnostic only; no closed issue, new installation, merge or external customer operation.',
  ''
 ];
 const report=lines.join('\n');
 const path='artifact/out/deliverables/'+kind+'-'+id+'.md';
 writeFileSync(path,report);
 items.push({
  work_id:'real-ops:'+kind+':'+id,source_url:source.html_url,
  source_kind:kind,source_title:source.title,source_state:source.state,
  source_updated_at:source.updated_at,source_body_sha256:actualSourceHash,
  provider_head_sha:kind==='pr'?source.head.sha:null,
  changed_files:paths,report_path:path,report_sha256:hash(report),
  actionable_next_work:task.next,elapsed_ms:Date.now()-t,
  diagnostic_deliverable_completed:true,
  original_owner_job_completed:false,
  installation_authorized:false,production_changed:false
 });
}
if(items.length!==12||new Set(items.map(x=>x.work_id)).size!==12||
 items.some(x=>x.original_owner_job_completed!==false))
 die('DISTINCT_TWELVE_WORK_ITEMS_NOT_VERIFIED');
const manifest={
 schema:'reality-business-value-12-real-work-deliverables-v1',
 signed_run_id:Number(e.GITHUB_RUN_ID),repository_sha:e.GITHUB_SHA,
 operational_diagnostic_deliverables:items.length,
 elapsed_ms:Date.now()-started,
 items,actual_original_customer_jobs_completed:0,
 external_changes:0,owner_installation_approvals:0,production_changed:false,
 verified_dollars_saved:null,measured_human_baseline_minutes:null
};
writeFileSync('artifact/out/reality-12-real-operational-deliverables.json',JSON.stringify(manifest,null,2)+'\n');
console.log('REALITY_TWELVE_REAL_CUSTOMER_WORK_OUTPUTS',JSON.stringify({
 items:12,elapsed_ms:manifest.elapsed_ms,
 original_owner_jobs_completed:0,production_changed:false,
 per_work_ms:items.map(x=>({id:x.work_id,elapsed_ms:x.elapsed_ms}))}));
