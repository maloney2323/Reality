// Submit an inert, no-secret wake-up to Reality's dedicated Actions branch.
// A wake-up does not authorize installation. Supabase must already contain
// one explicit signed-owner exact-artifact approval and a durable queued job.
const REPO='maloney2323/Reality';
const WORKER='feature/reality-background-continuation-20261031';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const fail=x=>{throw Error('REALITY_APPROVED_DISPATCH_'+x)};
async function github(path,{method='GET',token,body,fetchImpl=fetch}){
 const r=await fetchImpl('https://api.github.com/repos/'+REPO+path,{
  method,redirect:'error',cache:'no-store',headers:{
   accept:'application/vnd.github+json',
   authorization:'Bearer '+token,
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-owner-approved-background-v1',
   'content-type':'application/json'},
  body:body===undefined?undefined:JSON.stringify(body),
 });
 const j=await r.json().catch(()=>null);
 if(!r.ok)fail('PROVIDER_HTTP_'+r.status);
 return j;
}
export async function dispatchApprovedBackgroundRepair({
 reservationId,originalWorkId,candidateHash,issueNumber,
 installBranch,attemptNumber=0,env=process.env,fetchImpl=fetch,
}={}){
 if(!Number.isInteger(attemptNumber)||attemptNumber<0||attemptNumber>24)
  fail('BOUNDED_RETRY_REQUIRED');
 if(env.VERCEL_ENV!=='preview'||!UUID.test(reservationId)||
    !WORK.test(originalWorkId)||!HASH.test(candidateHash)||
    !Number.isSafeInteger(issueNumber)||issueNumber<1||issueNumber>100000||
    !/^feature\/reality-[a-z0-9][a-z0-9/-]{5,105}$/.test(
     String(installBranch||''))||installBranch.includes('..')||
    installBranch===WORKER)
  fail('EXACT_ISOLATED_OWNER_APPROVED_SCOPE_REQUIRED');
 const token=String(env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||'');
 if(token.length<25)fail('GITHUB_DISPATCH_CREDENTIAL_UNAVAILABLE');
 const payload={reservation_id:reservationId,original_work_id:originalWorkId,
  candidate_hash:candidateHash,issue_number:issueNumber,
  install_branch:installBranch};
 const path='reality-approved-continuations/'+reservationId+
  (attemptNumber===0?'':'-retry-'+attemptNumber)+'.json';
 const api=(p,opts={})=>github(p,{token,fetchImpl,...opts});
 const ref=await api('/git/ref/heads/'+WORKER);
 const before=ref?.object?.sha;
 if(!SHA.test(before))fail('ISOLATED_WORKER_REF_UNVERIFIED');
 let prior;
 try{prior=await api('/contents/'+path+'?ref='+encodeURIComponent(WORKER))}
 catch(e){
  if(e.message!=='REALITY_APPROVED_DISPATCH_PROVIDER_HTTP_404')throw e;
  prior=null;
 }
 if(prior){
  const read=Buffer.from(String(prior.content||'').replace(/\s/g,''),'base64').toString('utf8');
  if(prior.path!==path||read!==JSON.stringify(payload,null,2)+'\n')
   fail('PRIOR_WAKEUP_DIFFERENT_APPROVAL');
  return Object.freeze({dispatched:true,existing:true,
   worker_branch:WORKER,request_path:path,
   provider_ref_sha:before,installation_authorized_only_by_owner:true,
   production_changed:false});
 }
 const base=await api('/git/commits/'+before);
 if(!SHA.test(base?.tree?.sha))fail('WORKER_BASE_TREE_NOT_VERIFIED');
 const blob=await api('/git/blobs',{method:'POST',
  body:{content:JSON.stringify(payload,null,2)+'\n',encoding:'utf-8'}});
 if(!SHA.test(blob?.sha))fail('WORKER_REQUEST_BLOB_UNVERIFIED');
 const tree=await api('/git/trees',{method:'POST',body:{
  base_tree:base.tree.sha,tree:[{path,mode:'100644',type:'blob',sha:blob.sha}]}});
 if(!SHA.test(tree?.sha))fail('WORKER_REQUEST_TREE_UNVERIFIED');
 const commit=await api('/git/commits',{method:'POST',body:{
  message:'Reality: wake owner-approved exact background continuation '+reservationId,
  tree:tree.sha,parents:[before]}});
 if(!SHA.test(commit?.sha))fail('WORKER_WAKE_COMMIT_UNVERIFIED');
 await api('/git/refs/heads/'+WORKER,{method:'PATCH',
  body:{sha:commit.sha,force:false}});
 const after=await api('/git/ref/heads/'+WORKER);
 if(after?.object?.sha!==commit.sha)
  fail('WORKER_WAKE_BRANCH_READBACK_FAILED');
 return Object.freeze({dispatched:true,existing:false,
  worker_branch:WORKER,worker_commit_sha:commit.sha,
  worker_workflow_url:'https://github.com/'+REPO+
   '/actions/workflows/reality-approved-repair-background-v1.yml',
  request_path:path,installation_authorized_only_by_owner:true,
  production_changed:false});
}
