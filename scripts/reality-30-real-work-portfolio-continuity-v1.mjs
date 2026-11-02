// Evidence-only Reality portfolio: 30 actual source-backed REVIEW tasks from
// live open GitHub pull requests and issues. No impersonated owner consent,
// install, merge, issue-write, or customer-job settlement.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const E=process.env,R='maloney2323/Reality';
const die=x=>{throw Error('REALITY_PORTFOLIO_'+x)};
const SHA=/^[a-f0-9]{40}$/,mode=process.argv[2];
if(E.GITHUB_ACTIONS!=='true'||E.GITHUB_REPOSITORY!==R||
 E.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
 !SHA.test(E.GITHUB_SHA||'')||
 !/^[1-9][0-9]{7,17}$/.test(E.GITHUB_RUN_ID||'')||
 !['first','resume'].includes(mode)||!E.GITHUB_TOKEN)die('EXACT_ISOLATED_WORKFLOW_REQUIRED');
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const hash=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
async function gh(path){
 const r=await fetch('https://api.github.com/repos/'+R+path,{redirect:'error',cache:'no-store',
  headers:{accept:'application/vnd.github+json',authorization:'Bearer '+E.GITHUB_TOKEN,
  'x-github-api-version':'2022-11-28','user-agent':'Reality-portfolio-readonly-audit-v1'}});
 if(!r.ok)die('GITHUB_SOURCE_READBACK_'+r.status);
 return r.json();
}
const key=item=>item.kind+':'+item.number;
const classify=(item,detail)=>{
 const text=(String(detail.title||'')+'\n'+String(detail.body||'')).slice(0,20000);
 const domain=/approval|authoriz|owner|consent|install/i.test(text.slice(0,260))?'OWNER_GOVERNANCE':
 /continuity|ledger|settlement|reconcil|receipt|integrity/i.test(text.slice(0,260))?'CONTINUITY_SETTLEMENT':
 /capability|upgrade|self.repair|missing|worker/i.test(text.slice(0,260))?'CAPABILITY_AND_WORKER':
 /UI|home|chat|UX/i.test(text.slice(0,260))?'PRODUCT_UI':'GENERAL_ENGINEERING';
 const gap=/missing capability|capability gap|ERR_MODULE_NOT_FOUND|lacks a reusable|missing (?:an? )?(?:extension|module|ability)/i.test(text);
 const anchored=/frozen|ERR_MODULE_NOT_FOUND|actions\/runs\/\d+|source.?bound|verified|independent/i.test(text);
 // These are signals to investigate. They NEVER assert a verified gap.
 return {category:domain,
   capability_gap_signal:gap&&anchored?'SUSPECTED_REQUIRES_INDEPENDENT_REPRODUCTION':'NOT_ESTABLISHED',
   work_disposition:item.kind==='pr'?'DRAFT_OWNER_REVIEW_ONLY':'OPEN_ISSUE_TRIAGE_ONLY',
   owner_approval_verified:false,
   new_capability_installed:false,original_job_completed:false,
   production_changed:false};
};
async function observe(item){
 const detail=await gh((item.kind==='pr'?'/pulls/':'/issues/')+item.number);
 const realNumber=Number(detail.number);
 const expectedUrl='https://github.com/'+R+'/'+(item.kind==='pr'?'pull/':'issues/')+item.number;
 if(realNumber!==item.number||detail.html_url!==expectedUrl||detail.state!=='open'||
    (item.kind==='pr'&&(!detail.draft||!SHA.test(detail.head?.sha)||detail.base?.repo?.full_name!==R))||
    (item.kind==='issue'&&detail.pull_request))die('SOURCE_TYPE_OR_STATE_CHANGED_'+key(item));
 const classification=classify(item,detail);
 return {
  job_id:'review:'+key(item),source_kind:item.kind,source_number:item.number,
  source_url:detail.html_url,source_title:detail.title,
  observed_updated_at:detail.updated_at,
  snapshot_updated_at:item.updated_at,
  source_moved_since_selection:detail.updated_at!==item.updated_at||
     item.kind==='pr'&&detail.head.sha!==item.head_sha,
  provider_head_sha:item.kind==='pr'?detail.head.sha:null,
  provider_base_ref:item.kind==='pr'?detail.base.ref:null,
  ...classification
 };
}
function append(state,caseReceipt){
 if(state.cases.some(x=>x.job_id===caseReceipt.job_id))die('DUPLICATE_REVIEW_WORK_ID');
 const previous=state.last_hash;
 const event={...caseReceipt,sequence:state.cases.length+1,
  previous_hash:previous,run_id:Number(E.GITHUB_RUN_ID),
  source_repository_sha:E.GITHUB_SHA};
 const receipt_hash=hash(event);
 state.cases.push({...event,receipt_hash});
 state.last_hash=receipt_hash;
}
function validate(state){
 if(state.schema!=='reality-source-backed-30-work-portfolio-v1'||
    state.run_id!==Number(E.GITHUB_RUN_ID)||state.repository_sha!==E.GITHUB_SHA||
    state.manifest.length!==30||state.manifest.filter(x=>x.kind==='pr').length!==24||
    state.manifest.filter(x=>x.kind==='issue').length!==6||
    new Set(state.manifest.map(key)).size!==30||
    state.manifest_hash!==hash(state.manifest)||
    !Array.isArray(state.cases)||state.cases.length>30)
   die('MANIFEST_OR_AUTHORITY_INVALID');
 let last='0'.repeat(64);
 for(let i=0;i<state.cases.length;i++){
  const row=state.cases[i],{receipt_hash,...fields}=row;
  if(row.sequence!==i+1||row.previous_hash!==last||
      hash(fields)!==receipt_hash||!state.manifest.some(x=>key(x)===''+row.job_id.slice(7))||
      row.owner_approval_verified!==false||row.new_capability_installed!==false||
      row.original_job_completed!==false||row.production_changed!==false)
    die('CHECKPOINT_CHAIN_OR_COMPLETION_CLAIM_INVALID_AT_'+(i+1));
  last=receipt_hash;
 }
 if(last!==state.last_hash)die('LAST_CHECKPOINT_HASH_MISMATCH');
}
mkdirSync('artifact/out',{recursive:true});
if(mode==='first'){
 const [prs,p1,p2]=await Promise.all([
   gh('/pulls?state=open&per_page=50&page=1'),
   gh('/issues?state=open&per_page=100&page=1'),
   gh('/issues?state=open&per_page=100&page=2')]);
 const p=prs.filter(x=>x.draft&&x.state==='open'&&SHA.test(x.head?.sha)).slice(0,24)
 .map(x=>({kind:'pr',number:x.number,updated_at:x.updated_at,head_sha:x.head.sha}));
 const issues=[...p1,...p2].filter(x=>!x.pull_request&&x.state==='open')
   .sort((a,b)=>b.number-a.number).slice(0,6)
   .map(x=>({kind:'issue',number:x.number,updated_at:x.updated_at}));
 if(p.length!==24||issues.length!==6)die('NOT_ENOUGH_DISTINCT_REAL_REVIEW_SOURCES');
 const manifest=[];
 for(let i=0;i<24;i++){
  manifest.push(p[i]);
  if(i%4===3)manifest.push(issues[Math.floor(i/4)]);
 }
 const state={schema:'reality-source-backed-30-work-portfolio-v1',
  run_id:Number(E.GITHUB_RUN_ID),repository_sha:E.GITHUB_SHA,
  phase:'FIRST_15_SOURCE_REVIEWS_SAVED',manifest,manifest_hash:hash(manifest),
  last_hash:'0'.repeat(64),cases:[]};
 for(const source of manifest.slice(0,15))append(state,await observe(source));
 validate(state);
 if(state.cases.length!==15)die('FIRST_HALF_NOT_COMMITTED');
 writeFileSync('artifact/out/reality-portfolio-halfway.json',JSON.stringify(state,null,2)+'\n');
 console.log('REALITY_MULTIWORK_FIRST_WORKER_CHECKPOINT_SAVED',JSON.stringify({
  run_id:state.run_id,distinct_source_jobs:state.manifest.length,completed_readonly_reviews:15,
  checkpoint_hash:state.last_hash,production_changed:false}));
}else{
 const state=JSON.parse(readFileSync('artifact/in/reality-portfolio-halfway.json','utf8'));
 validate(state);
 if(state.cases.length!==15||state.phase!=='FIRST_15_SOURCE_REVIEWS_SAVED')
   die('CROSS_WORKER_CONTINUITY_CHECKPOINT_MISSING');
 const halfway=state.last_hash,priorCaseIds=state.cases.map(x=>x.job_id);
 // New GitHub Actions worker independently verifies all initial source refs.
 // Any concurrent edit is a temporal discrepancy, NOT a fabricated capability gap.
 let sourceMoved=0;
 for(const first of state.cases){
  const reread=await observe({kind:first.source_kind,number:first.source_number,
    updated_at:first.observed_updated_at,head_sha:first.provider_head_sha});
  if(reread.observed_updated_at!==first.observed_updated_at||
     reread.provider_head_sha!==first.provider_head_sha)sourceMoved++;
 }
 for(const source of state.manifest.slice(15))append(state,await observe(source));
 state.phase='THIRTY_READONLY_REVIEWS_COMPLETED';
 validate(state);
 if(state.cases.length!==30||
    state.cases.slice(0,15).some((x,i)=>x.job_id!==priorCaseIds[i])||
    state.cases[15].previous_hash!==halfway||
    new Set(state.cases.map(x=>x.job_id)).size!==30)
   die('SECOND_WORKER_SAME_PORTFOLIO_OR_CHAIN_FAILED');
 const statuses=Object.fromEntries([...new Set(state.cases.map(x=>x.work_disposition))].map(
   n=>[n,state.cases.filter(x=>x.work_disposition===n).length]));
 const gapSignals=state.cases.filter(x=>x.capability_gap_signal==='SUSPECTED_REQUIRES_INDEPENDENT_REPRODUCTION');
 const report={
  schema:'reality-independent-30-real-work-review-batch-v1',
  run_id:state.run_id,repository_sha:state.repository_sha,
  exact_distinct_review_jobs:state.cases.length,
  real_pull_request_review_tasks:24,real_open_issue_triage_tasks:6,
  processed_by_separate_github_workers:2,
  phase_one_durable_artifact_verified:true,inter_worker_checkpoint_hash:halfway,
  resumed_from_same_checkpoint:true,
  duplicate_review_work_ids:0,
  temporal_source_changes_on_prior_cases:sourceMoved,
  potential_capability_gap_cases:gapSignals.map(x=>({job_id:x.job_id,source_url:x.source_url,
    category:x.category,verification_status:x.capability_gap_signal})),
  verified_new_capability_gaps:0,
  work_status_counts:statuses,
  final_chain_hash:state.last_hash,
  authorization_granted_by_this_test:false,
  external_actions_executed:0,
  owner_approval_forged:0,
  original_customer_jobs_settled_by_this_batch:0,
  production_changed:false,
  proof_scope:'READ_ONLY_DISCOVERY_REVIEW_NOT_AUTHORIZED_EXECUTION',
  cases:state.cases.map(x=>({job_id:x.job_id,source_url:x.source_url,source_title:x.source_title,
    category:x.category,work_disposition:x.work_disposition,
    capability_gap_signal:x.capability_gap_signal,
    source_moved_since_selection:x.source_moved_since_selection,
    receipt_hash:x.receipt_hash,previous_hash:x.previous_hash}))
 };
 writeFileSync('artifact/out/reality-30-work-batch-readonly-receipt.json',JSON.stringify(report,null,2)+'\n');
 console.log('REALITY_30_AUTHENTIC_SOURCE_BACKED_WORK_REVIEWS_RECONCILED',JSON.stringify({
  run_id:report.run_id,real_jobs:30,pr_reviews:24,issue_triage:6,
  potential_capability_gap_cases:gapSignals.length,
  verified_new_capability_gaps:0,source_moved:sourceMoved,
  checkpoint_hash:halfway,final_chain_hash:state.last_hash,
  no_duplicate_receipts:true,production_changed:false,
  external_actions_executed:0}));
}
