// Read-only operational work catalog, scoped to ONE GitHub repository.
// Findings are evidence-backed observations and opportunities. They are NOT
// actionable grants, verified defects, or estimates of realized time return.
import crypto from 'node:crypto';
import {runRealityStewardshipPass,readStewardshipGitHub} from './reality-stewardship-pass-v1.0.js';
import {prioritizeEvidenceBackedFindings,VALUE_ASSESSMENT_VERSION} from './reality-work-value-assessment-v0.1.js';
const API='https://api.github.com';
const BASE='https://github.com/maloney2323/Reality';
const paths=Object.freeze({
 issues:'/repos/maloney2323/Reality/issues?state=open&per_page=100',
 commits:'/repos/maloney2323/Reality/commits?per_page=30',
 pulls:'/repos/maloney2323/Reality/pulls?state=open&per_page=100',
});
// Fixed, explicit resource bounds. When a provider has more entries than these
// limits, keep observed work and expose PARTIAL coverage; never claim a full scan.
const PROVIDER_PAGE_SIZE=100;
const PROVIDER_MAX_PAGES=5;
const CATALOG_MAX_VISIBLE_FINDINGS=1200;
const safeString=(v,max=220)=>String(v||'').slice(0,max);
const id=(type,v)=>'catalog:'+crypto.createHash('sha256').update(type+':'+v).digest('hex').slice(0,32);
const category=(label,defaultCategory)=>{
 const s=safeString(label,400).toLowerCase();
 // A capability gap found during a real job is an improvement opportunity,
 // even if its issue/PR title also contains "repair" or "failure". This is
 // classification only; finding titles and CI links never prove business gain.
 if(/\b(?:self[-\s]?repair|self[-\s]?improvement|capability gap|missing capability|capability upgrade|capability improvement|operational weakness)\b/.test(s))
  return 'upgrades';
 if(/customer|client|support|feedback/.test(s))return 'customer';
 if(/security|vulnerab|permission|authority|governance|guard|access|auth/.test(s))return 'security';
 if(/\bfix\b|bug|repair|broken|defect|correct/.test(s))return 'bugs';
 if(/regression|benchmark|reliab|drift|hallucin|stability|failure|preflight|outage/.test(s))return 'reliability';
 if(/integrat|vercel|deploy|connector|supabase|login|ci\/cd/.test(s))return 'integrations';
 if(/upgrade|improv|refactor|enhanc|hardening|optimiz/.test(s))return 'upgrades';
 if(/\bfeat\b|new feature|capability|add |implement/.test(s))return 'features';
 if(/automation|autonomous|time saved|shift|recurring/.test(s))return 'automation';
 if(/research|explore|investigat|study|benchmark analysis/.test(s))return 'research';
 return defaultCategory;
};
function ghURL(value,kind){
 const url=String(value||'');
 const patterns={
 issue:/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/\d+$/,
 pr:/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/\d+$/,
 commit:/^https:\/\/github\.com\/maloney2323\/Reality\/commit\/[a-f0-9]{40}$/,
 };
 return patterns[kind]?.test(url)?url:null;
}
export async function fetchCatalogGitHub(kind,{env=process.env,fetchImpl=fetch}={}){
 if(!Object.hasOwn(paths,kind))throw Error('CATALOG_PROVIDER_PATH_DENIED');
 if(env.VERCEL_ENV!=='preview')
  throw Error('CATALOG_PREVIEW_READ_ONLY_ONLY');
 const paginated=kind==='issues'||kind==='pulls';
 const pages=paginated?PROVIDER_MAX_PAGES:1;
 const observed=[];
 let complete=false,scanned=0;
 for(let page=1;page<=pages;page++){
  // Never follow arbitrary GitHub Link headers or client-supplied URLs.
  // Only construct narrowly allowlisted public read paths for this repository.
  const providerPath=paths[kind]+(paginated?'&page='+page:'');
  let body;
  try{
   const response=await fetchImpl(API+providerPath,{
    method:'GET',cache:'no-store',redirect:'error',
    headers:{Accept:'application/vnd.github+json',
     'User-Agent':'Reality-ReadOnly-Work-Catalog',
     'X-GitHub-Api-Version':'2022-11-28'},
   });
   if(!response.ok)throw Error('CATALOG_GITHUB_READ_'+response.status);
   body=await response.json().catch(()=>null);
   if(!Array.isArray(body)||body.length>(paginated?PROVIDER_PAGE_SIZE:30))
    throw Error('CATALOG_GITHUB_ARRAY_INVALID');
  }catch(err){
   // Preserve independently observed first pages, but mark incomplete.
   // Never silently claim checked when a later provider read fails.
   if(scanned===0||!paginated)throw err;
   break;
  }
  observed.push(...body);scanned++;
  if(!paginated||body.length<PROVIDER_PAGE_SIZE){
   complete=true;break;
  }
 }
 // Commits are an explicitly bounded recency context, never a census of
 // historical defects. "complete" here describes the requested scan window.
 Object.defineProperty(observed,'source_scan',{enumerable:false,
  value:Object.freeze({
   kind,scope:paginated?'OPEN_PROVIDER_RECORDS':'RECENT_CHANGE_CONTEXT_ONLY',
   pages_scanned:scanned,items_fetched:observed.length,
   complete:complete && paginated,
   reached_safe_page_limit:paginated&&!complete,
   query_scope_fully_reconciled:paginated&&complete,
   recent_history_is_not_outstanding_work:kind==='commits'
  })
 });
 return observed;
}

export async function buildRealityWorkCatalog({
 steward=runRealityStewardshipPass,
 readCatalog=fetchCatalogGitHub,
}={}){
 const coverage={actions:'unavailable',pull_requests:'unavailable',
  issues:'unavailable',commits:'unavailable',
  customer_feedback:'not_connected',business_operations:'not_connected',
  external_research:'not_connected'};
 const findings=[];
 const failures=[];
 const sourceScans={};
 try{
  const s=await steward();
  coverage.actions='checked';coverage.pull_requests='checked';
  for(const w of s.work||[]){
   const urls=(w.evidence_refs||[]).filter(x=>typeof x==='string'&&
    x.startsWith(BASE+'/'));
   if(!urls.length)continue;
   findings.push({
    finding_id:id('steward',w.work_key),kind:'SYSTEM_MAINTENANCE',
    work_id:w.work_id,work_key:w.work_key,
    title:safeString(w.objective||w.work_key),
    category:category(w.objective,'reliability'),
    state:'DISCOVERED_REQUIRES_REVIEW',finding_type:'RECURRING_FAILURE',
    reason:'Evidence of repeated workflow failures. Do not assume the root cause is still unresolved or that previous attempts can be retried.',
    source:'github_actions',evidence_refs:urls.slice(0,12),
    execution_work_item:w.execution_work_item||null,
    authorization_required:w.authorization_required===true,
  });
  }
 }catch{failures.push('Actions or pull-request discovery unavailable');}
 const results=await Promise.allSettled([readCatalog('issues'),readCatalog('commits'),readCatalog('pulls')]);
 const [issues,commits,pulls]=results.map(x=>x.status==='fulfilled'?x.value:null);
 for(const [kind,entries] of [['issues',issues],['commits',commits],['pulls',pulls]]){
  if(!entries)continue;
  const details=entries.source_scan;
  sourceScans[kind]=details&&details.kind===kind?details:
   {kind,scope:kind==='commits'?'RECENT_CHANGE_CONTEXT_ONLY':
    'PROVIDER_RECORDS_WITHOUT_PAGINATION_METADATA',
    pages_scanned:null,items_fetched:entries.length,
    complete:kind!=='commits',reached_safe_page_limit:false,
    query_scope_fully_reconciled:kind!=='commits',
    recent_history_is_not_outstanding_work:kind==='commits'};
 }
 if(issues){
  coverage.issues=sourceScans.issues?.query_scope_fully_reconciled?
   'checked':'partial';
  if(coverage.issues==='partial')
   failures.push('GitHub open issues scanned only to bounded source limit');
  for(const issue of issues){
   if(issue.pull_request)continue;
   const url=ghURL(issue.html_url,'issue');
   if(!url||!Number.isSafeInteger(issue.number))continue;
   findings.push({
    finding_id:id('issue',issue.number),title:'Review open issue #'+issue.number+': '+safeString(issue.title),
    category:category(issue.title,'operations'),
    finding_type:'OPEN_ISSUE',state:'TRACKED_NEEDS_REVIEW',
    reason:'GitHub issue is open. Its completion, priority and business impact have not been independently established.',
    source:'github_issues',evidence_refs:[url],
    execution_work_item:null,authorization_required:false,
  });
  }
 }else failures.push('GitHub issues unavailable');
 if(pulls){
  coverage.pull_requests=sourceScans.pulls?.query_scope_fully_reconciled?
   'checked':'partial';
  if(coverage.pull_requests==='partial')
   failures.push('GitHub open pull requests scanned only to bounded source limit');
  for(const pr of pulls){
   const url=ghURL(pr.html_url,'pr');
   if(!url||!Number.isSafeInteger(pr.number))continue;
   findings.push({
    finding_id:id('pr',pr.number),
    title:'Review '+(pr.draft?'draft ':'')+'PR #'+pr.number+': '+safeString(pr.title),
    category:category(pr.title,'upgrades'),
    finding_type:'OPEN_PULL_REQUEST',state:pr.draft?'DRAFT_AWAITING_REVIEW':'OPEN_AWAITING_REVIEW',
    reason:'GitHub pull request is open. Code review, testing and merge authority remain separate. This is tracked work, not evidence of a deployed improvement.',
    source:'github_pull_requests',evidence_refs:[url],execution_work_item:null,
    authorization_required:false,
   });
  }
 }else failures.push('GitHub open pull requests unavailable');
 if(commits){
  coverage.commits='checked';
  let added=0;
  for(const commit of commits){
   if(added>=24)break;
   const url=ghURL(commit.html_url,'commit');
   const message=safeString(commit.commit?.message?.split('\n')[0],180);
   if(!url||!message||!/[a-f0-9]{40}/.test(String(commit.sha||'')))continue;
   const group=category(message,'upgrades');
   findings.push({
    finding_id:id('commit',commit.sha),
    title:'Review recent change: '+message,
    category:group,
    finding_type:'RECENT_CHANGE_TO_VERIFY',state:'OBSERVED_NOT_AN_OPEN_DEFECT',
    reason:'A repository commit exists. It is evidence of a change, NOT evidence of an outstanding bug or unfinished task. Review tests, release state and effect before promoting into actionable work.',
    source:'github_commits',evidence_refs:[url],
    execution_work_item:null,authorization_required:false,
  });added++;
  }
 }else failures.push('GitHub recent changes unavailable');
 const ranked=prioritizeEvidenceBackedFindings(findings);
 if(ranked.length>CATALOG_MAX_VISIBLE_FINDINGS)
  failures.push('Work Center display bound reached; more provider records exist');
 const groups=Object.fromEntries([
  'customer','bugs','upgrades','features','reliability','integrations',
  'security','operations','research','automation',
 ].map(k=>[k,ranked.filter(w=>w.category===k).length]));
 return Object.freeze({
  version:'reality-work-catalog-v0.1',
  status:failures.length?'PARTIAL':'OBSERVED',
  observed_at:new Date().toISOString(),
  source_coverage:coverage,source_scans:sourceScans,
  display_bound:CATALOG_MAX_VISIBLE_FINDINGS,
  source_failures:failures,
  counts:groups,items:ranked.slice(0,CATALOG_MAX_VISIBLE_FINDINGS),
  ranking_version:VALUE_ASSESSMENT_VERSION,
  ranked_by:'EVIDENCE_BASED_TRIAGE_ONLY_NOT_VERIFIED_BUSINESS_IMPACT',
  total_findings:findings.length,
  authority:'NONE_GRANTED',execution_enabled:false,credit_metering_verified:false,
  description:'Read-only source observations and review opportunities. GitHub issues and PRs are paginated to a bounded complete-open-record census when available; workflow failures remain a recent-window diagnostic and commits are contextual history. Findings are not automatically verified defects or executable business jobs.',
 });
}
