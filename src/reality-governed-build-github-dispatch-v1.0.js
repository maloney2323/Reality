// Strict owner-governed, preview-only GitHub Actions dispatch.
// The server writes ONLY one opaque, non-secret request JSON to a dedicated
// experimental worker branch. No model, PR, issue closure or production writes.
// Workflow on that branch executes no-secret read-only provider discovery.
export const GOVERNED_BUILD_GITHUB_DISPATCH_VERSION=
 'reality-governed-build-github-dispatch-v1.0';
const REPO='maloney2323/Reality';
const WORKER='reality/worker/foundational-build-queue-v1';
const BASE='/repos/'+REPO;
const fail=code=>{throw Object.assign(Error(code),{status:503})};
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
const WORK=/^work:[a-f0-9]{32}$/;
async function request(path,{token,method='GET',body,fetchImpl}={}){
 const res=await fetchImpl('https://api.github.com'+BASE+path,{
  method,redirect:'error',cache:'no-store',headers:{
   accept:'application/vnd.github+json',
   authorization:'Bearer '+token,
   'x-github-api-version':'2022-11-28',
   'content-type':'application/json',
   'user-agent':'Reality-isolated-discovery-dispatch-v1',
  },body:body===undefined?undefined:JSON.stringify(body),
 });
 const json=await res.json().catch(()=>null);
 if(!res.ok)fail('GOVERNED_BUILD_GITHUB_DISPATCH_HTTP_'+res.status);
 return json;
}
export async function dispatchGovernedBuildToIsolatedWorker({
 queue_id,original_work_id,issue_url,env=process.env,fetchImpl=fetch,
}={}){
 if(env.VERCEL_ENV!=='preview')fail('GOVERNED_BUILD_DISPATCH_PREVIEW_ONLY');
 if(!uuid(queue_id)||!WORK.test(String(original_work_id||'')))
  fail('GOVERNED_BUILD_DISPATCH_TICKET_INVALID');
 const m=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9][0-9]{0,5})$/.exec(String(issue_url||''));
 if(!m)fail('GOVERNED_BUILD_DISPATCH_ISSUE_NOT_GROUNDED');
 const token=String(env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||'');
 if(token.length<25)fail('GOVERNED_BUILD_DISPATCH_CREDENTIAL_UNAVAILABLE');
 const payload={schema:'reality-isolated-build-request-v1',queue_id,
  original_work_id,issue_number:Number(m[1])};
 const file='reality-requests/'+queue_id+'.json';
 const api=(p,opts={})=>request(p,{token,fetchImpl,...opts});
 const current=await api('/git/ref/heads/'+WORKER);
 const head=current?.object?.sha;
 if(!/^[a-f0-9]{40}$/.test(head))fail('GOVERNED_BUILD_WORKER_BRANCH_UNVERIFIED');
 // Idempotent: never alter or overwrite a previously submitted work ticket.
 const previous=await api('/contents/'+file+'?ref='+encodeURIComponent(WORKER))
  .catch(e=>String(e.message)==='GOVERNED_BUILD_GITHUB_DISPATCH_HTTP_404'?null:Promise.reject(e));
 if(previous){
  if(previous.path!==file||previous.type!=='file')
   fail('GOVERNED_BUILD_PRIOR_DISPATCH_IDENTITY_INVALID');
  return Object.freeze({dispatched:true,existing:true,
   worker_branch:WORKER,worker_sha:head,request_path:file});
 }
 const previousCommit=await api('/git/commits/'+head);
 const baseTree=previousCommit?.tree?.sha;
 if(!/^[a-f0-9]{40}$/.test(baseTree))fail('GOVERNED_BUILD_WORKER_BASE_TREE_UNVERIFIED');
 const blob=await api('/git/blobs',{method:'POST',body:{
  content:JSON.stringify(payload,null,2)+'\n',encoding:'utf-8',
 }});
 if(!/^[a-f0-9]{40}$/.test(blob?.sha))
  fail('GOVERNED_BUILD_REQUEST_BLOB_UNVERIFIED');
 const tree=await api('/git/trees',{method:'POST',body:{
  base_tree:baseTree,tree:[{path:file,mode:'100644',type:'blob',sha:blob.sha}],
 }});
 const commit=await api('/git/commits',{method:'POST',body:{
  message:'Reality governed discovery request '+queue_id+' (no model authority)',
  tree:tree?.sha,parents:[head],
 }});
 if(!/^[a-f0-9]{40}$/.test(commit?.sha))
  fail('GOVERNED_BUILD_WORKER_COMMIT_UNVERIFIED');
 await api('/git/refs/heads/'+WORKER,{method:'PATCH',body:{
  sha:commit.sha,force:false,
 }});
 const after=await api('/git/ref/heads/'+WORKER);
 if(after?.object?.sha!==commit.sha)
  fail('GOVERNED_BUILD_WORKER_DISPATCH_READBACK_FAILED');
 return Object.freeze({dispatched:true,existing:false,
  worker_branch:WORKER,worker_sha:commit.sha,request_path:file,
  workflow_runs_url:'https://github.com/'+REPO+'/actions/workflows/reality-governed-build-worker-v1.yml',
  external_effect:'ISOLATED_WORKER_BRANCH_REQUEST_ONLY',
  production_changed:false,installation_authorized:false,
 });
}
