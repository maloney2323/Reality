// Read-only operational work catalog, scoped to ONE GitHub repository.
// Findings are evidence-backed observations and opportunities. They are NOT
// actionable grants, verified defects, or estimates of realized time return.
import crypto from 'node:crypto';
import {runRealityStewardshipPass,readStewardshipGitHub} from './reality-stewardship-pass-v1.0.js';
import {prioritizeEvidenceBackedFindings,VALUE_ASSESSMENT_VERSION} from './reality-work-value-assessment-v0.1.js';
const API='https://api.github.com';
const BASE='https://github.com/maloney2323/Reality';
const paths=Object.freeze({
 issues:'/repos/maloney2323/Reality/issues?state=open&per_page=30',
 commits:'/repos/maloney2323/Reality/commits?per_page=30',
 pulls:'/repos/maloney2323/Reality/pulls?state=open&per_page=30',
});
const safeString=(v,max=220)=>String(v||'').slice(0,max);
const id=(type,v)=>'catalog:'+crypto.createHash('sha256').update(type+':'+v).digest('hex').slice(0,32);
const category=(label,defaultCategory)=>{
 const s=safeString(label,400).toLowerCase();
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
 const response=await fetchImpl(API+paths[kind],{
  method:'GET',headers:{Accept:'application/vnd.github+json',
   'User-Agent':'Reality-ReadOnly-Work-Catalog','X-GitHub-Api-Version':'2022-11-28'},
 });
 if(!response.ok)throw Error('CATALOG_GITHUB_READ_'+response.status);
 const body=await response.json().catch(()=>null);
 if(!Array.isArray(body))throw Error('CATALOG_GITHUB_ARRAY_INVALID');
 return body;
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
 if(issues){
  coverage.issues='checked';
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
  coverage.pull_requests='checked';
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
 const groups=Object.fromEntries([
  'customer','bugs','upgrades','features','reliability','integrations',
  'security','operations','research','automation',
 ].map(k=>[k,ranked.filter(w=>w.category===k).length]));
 return Object.freeze({
  version:'reality-work-catalog-v0.1',
  status:failures.length?'PARTIAL':'OBSERVED',
  observed_at:new Date().toISOString(),
  source_coverage:coverage,source_failures:failures,
  counts:groups,items:ranked.slice(0,90),
  ranking_version:VALUE_ASSESSMENT_VERSION,
  ranked_by:'EVIDENCE_BASED_TRIAGE_ONLY_NOT_VERIFIED_BUSINESS_IMPACT',
  total_findings:findings.length,
  authority:'NONE_GRANTED',execution_enabled:false,credit_metering_verified:false,
  description:'Read-only source observations and review opportunities. Findings are not automatically verified defects or executable business jobs.',
 });
}
