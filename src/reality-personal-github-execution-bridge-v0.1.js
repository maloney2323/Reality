// Independent provider readback for a SINGLE, exact, authorized issue creation.
// Never accepts arbitrary GitHub paths, repositories, HTTP methods, or labels.
import {githubGet,githubWrite} from './reality-connector-github-v1.0.js';

export const PERSONAL_GITHUB_EXECUTION_BRIDGE_VERSION='reality-personal-github-execution-bridge-v0.1';
const REPO='maloney2323/Reality',ROOT='/repos/'+REPO;
export function assertExactMaintainerIssue(item){
 if(item?.connector!=='github'||item.operation!=='create_issue'||
  item?.inputs?.repository!==REPO||item.consequential!==true||
  !/^work:[a-f0-9]{32}$/.test(String(item.work_item_id||''))||
  item.workflow_id!=='workflow:'+item.work_item_id||
  typeof item.inputs.title!=='string'||!item.inputs.title.startsWith('Reality recurring work: repair repeated ')||
  item.inputs.title.length>200||
  typeof item.inputs.body!=='string'||item.inputs.body.length>10000||
  !item.inputs.body.includes('<!-- Reality recurring work -->')||
  !item.inputs.body.includes('### Evidence')||
  !item.inputs.body.includes('### Required work'))
  throw Error('PERSONAL_GITHUB_DISPATCH_NOT_EXACT_SCOPED_ISSUE');
 return item;
}
// Read-only credential probe. Confirms the PAT is authenticated as the
// intended repository owner and can read GitHub issues. GitHub write
// permission is proven only by a separately authorized actual POST.
export async function verifyPersonalGithubIssueToken({get=githubGet}={}){
 const owner=await get('/user');
 if(owner?.login!=='maloney2323')
  throw Error('PERSONAL_GITHUB_CREDENTIAL_OWNER_UNVERIFIED');
 const issues=await get(ROOT+'/issues?state=open&per_page=1');
 if(!Array.isArray(issues))
  throw Error('PERSONAL_GITHUB_CREDENTIAL_ISSUES_READ_UNVERIFIED');
 return Object.freeze({
  credential_identity_verified:true,
  repository_issues_read_verified:true,
  github_issue_write_permission_not_yet_proven:true,
  external_action_performed:false,
 });
}
// Actual Vercel Preview token, read-only metadata inspection.
// This cannot establish Issues WRITE permission. Never use a POST to
// diagnose credentials; external action requires separate owner approval.
export async function inspectPreviewGithubRepositoryAccessReadOnly({get=githubGet}={}){
 const [owner,repository,issues]=await Promise.all([
  get('/user'),get(ROOT),get(ROOT+'/issues?state=open&per_page=1'),
 ]);
 if(owner?.login!=='maloney2323'||repository?.full_name!==REPO||
  !Array.isArray(issues))
  throw Error('PERSONAL_GITHUB_READ_ONLY_PROBE_SCOPE_NOT_VERIFIED');
 const flags=Object.freeze({
  principal_verified:true,
  repository_metadata_verified:true,
  issues_read_verified:true,
  repository_archived:repository.archived===true,
  issues_feature_enabled:repository.has_issues===true,
  external_action_performed:false,
  github_issue_write_permission_not_yet_proven:true,
 });
 return flags;
}
export async function checkForExistingMaintainerIssue(item,{get=githubGet}={}){
 assertExactMaintainerIssue(item);
 // Do not add a duplicate tracking issue when one with the same exact
 // approved title already exists. List is a safety preflight, not a proof
 // of global exactly-once across newly approved policies.
 const issues=await get(ROOT+'/issues?state=open&per_page=100');
 if(!Array.isArray(issues))throw Error('PERSONAL_GITHUB_EXISTING_ISSUES_READBACK_REQUIRED');
 const duplicate=issues.find(x=>!x.pull_request&&x.title===item.inputs.title);
 if(duplicate)throw Error('PERSONAL_GITHUB_TRACKING_ISSUE_ALREADY_EXISTS_REVIEW_FIRST');
 return Object.freeze({checked:true,repository:REPO,open_issues_sampled:issues.length,
  no_duplicate_in_page:true});
}
// Historical read-only reconciliation. A matching GitHub issue proves ONLY
// that the provider currently contains a matching item. It does not prove
// which earlier uncertain POST created it, and never releases the lease.
export async function inspectMatchingGithubIssueReadOnly({
 workItem,get=githubGet,maxPages=5,
}={}){
 assertExactMaintainerIssue(workItem);
 if(!Number.isInteger(maxPages)||maxPages<1||maxPages>5)
  throw Error('PERSONAL_GITHUB_RECONCILIATION_PAGE_LIMIT_INVALID');
 const candidates=[];let pages=0,complete=false,scanned=0;
 for(let page=1;page<=maxPages;page++){
  const issues=await get(ROOT+'/issues?state=all&per_page=100&page='+page);
  if(!Array.isArray(issues))
   throw Error('PERSONAL_GITHUB_RECONCILIATION_ISSUE_LIST_INVALID');
  pages++;scanned+=issues.length;
  for(const issue of issues){
   if(!issue?.pull_request&&issue?.title===workItem.inputs.title&&
      issue?.body===workItem.inputs.body&&Number.isSafeInteger(issue.number)&&issue.number>0)
    candidates.push({number:issue.number,id:issue.id});
  }
  if(issues.length<100){complete=true;break;}
 }
 if(!complete)return Object.freeze({
  status:'INCOMPLETE_PROVIDER_ISSUE_HISTORY',
  pages,scanned,matching_issues:[],
  verified_provider_effect:false,causal_attribution_proven:false,
  external_action_performed:false,no_automatic_retry:true,
 });
 const matches=[];
 for(const match of candidates){
  const observed=await get(ROOT+'/issues/'+match.number);
  const exact=observed?.id===match.id&&
   observed?.number===match.number&&!observed?.pull_request&&
   observed?.title===workItem.inputs.title&&
   observed?.body===workItem.inputs.body&&
   ['open','closed'].includes(observed?.state)&&
   observed?.html_url==='https://github.com/'+REPO+'/issues/'+match.number;
  if(exact)matches.push(Object.freeze({
   number:match.number,url:observed.html_url,
   created_at:typeof observed.created_at==='string'?observed.created_at:null,
   state:observed.state,
  }));
 }
 return Object.freeze({
  status:matches.length===0?'NO_EXACT_MATCH_OBSERVED':
   matches.length===1?'EXACT_MATCH_OBSERVED_ATTRIBUTION_UNPROVEN':
    'MULTIPLE_EXACT_MATCHES_ATTRIBUTION_UNPROVEN',
  pages,scanned,matching_issues:matches,
  verified_provider_effect:false,causal_attribution_proven:false,
  external_action_performed:false,no_automatic_retry:true,
 });
}
export function createPersonalGithubIssueBridge({get=githubGet,write=githubWrite}={}){
 return Object.freeze({
  connector:Object.freeze({async execute({workItem}){
   assertExactMaintainerIssue(workItem);
   const issue=await write(ROOT+'/issues','POST',{
    title:workItem.inputs.title,body:workItem.inputs.body,
   });
   if(!Number.isSafeInteger(issue?.number)||issue.number<1||
    typeof issue?.id!=='number'||issue.id<1)
    throw Error('PERSONAL_GITHUB_PROVIDER_CREATE_RESPONSE_UNCERTAIN');
   return Object.freeze({
    providerExecutionId:String(issue.id),
    observation:Object.freeze({provider:'github',number:issue.number,
     claimed_url:issue.html_url||null}),
   });
  }}),
  independentVerifier:Object.freeze({async verify({workItem,providerResult}){
   assertExactMaintainerIssue(workItem);
   const number=providerResult?.observation?.number;
   if(!Number.isSafeInteger(number)||number<1)
    throw Error('PERSONAL_GITHUB_PROVIDER_ID_MISSING');
   // Fresh, separate authenticated GET: never treat the POST response as
   // evidence that the issue exists with the exact approved contents.
   const observed=await get(ROOT+'/issues/'+number);
   const good=observed?.number===number&&
    observed?.id>0&&String(observed.id)===providerResult.providerExecutionId&&
    observed?.title===workItem.inputs.title&&
    observed?.body===workItem.inputs.body&&
    observed?.state==='open'&&
    observed?.html_url==='https://github.com/'+REPO+'/issues/'+number&&
    !observed.pull_request;
   return Object.freeze({
    verification_id:'github-issue-readback:'+number,
    verified:good,independent:true,
    basis:'fresh-separate-github-provider-get-exact-title-and-body',
    observedState:Object.freeze({repository:REPO,issue_number:number,
     issue_url:observed?.html_url||null,verified:good}),
    mismatch:good?null:'GITHUB_ISSUE_FRESH_READBACK_CONTENT_OR_SCOPE_MISMATCH',
   });
  }})
 });
}
