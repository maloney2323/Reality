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
