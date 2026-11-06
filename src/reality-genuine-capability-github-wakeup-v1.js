// Durable source-bound trigger: wake the full isolated capability workflow, NOT installation.
// A trusted Reality server sends this only AFTER Universe + service-role
// atomic gap queue independently confirm the original customer job.
const REPO='maloney2323/Reality';
const BRANCH='feature/reality-general-capability-engine-20261101';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const fail=x=>{throw Error('GENUINE_WAKE_DISPATCH_'+x)};
export async function dispatchGenuineCapabilityWake({
 trigger_id,source_event_id,original_work_id,env=process.env,
 fetchImpl=fetch,
}={}){
 if(env.VERCEL_ENV!=='preview'||
   env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF!=='hvkfreoagbrphwghjajw'||
   !UUID.test(trigger_id)||!UUID.test(source_event_id)||
   !WORK.test(original_work_id))
  fail('EXACT_PREVIEW_TRIGGER_REQUIRED');
 const token=String(env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||'');
 if(token.length<25)fail('SERVER_GITHUB_WRITE_CREDENTIAL_REQUIRED');
 async function github(path,{method='GET',body}={}){
  const r=await fetchImpl('https://api.github.com/repos/'+REPO+path,{
   method,redirect:'error',cache:'no-store',headers:{
    authorization:'Bearer '+token,accept:'application/vnd.github+json',
    'content-type':'application/json','user-agent':'Reality-genuine-capability-wake-v1',
    'x-github-api-version':'2022-11-28'},
   body:body===undefined?undefined:JSON.stringify(body),
  });
  const data=await r.json().catch(()=>null);
  if(!r.ok)throw Object.assign(Error('GENUINE_WAKE_DISPATCH_GITHUB_'+r.status),{
   status:r.status});
  return data;
 }
 const item={trigger_id,source_event_id,original_work_id};
 const data=JSON.stringify(item,null,2)+'\n';
 const path='reality-genuine-triggers/'+trigger_id+'.json';
 const branch=await github('/git/ref/heads/'+BRANCH);
 const head=branch?.object?.sha;
 if(!SHA.test(head))fail('PINNED_WORKER_BRANCH_READBACK_REQUIRED');
 let earlier=null;
 try{earlier=await github('/contents/'+path+'?ref='+encodeURIComponent(BRANCH))}
 catch(e){if(e.status!==404)throw e}
 if(earlier){
  const observed=Buffer.from(String(earlier.content||'').replace(/\s/g,''),'base64').toString('utf8');
  if(earlier.path!==path||observed!==data)fail('EXISTING_WAKE_DIFFERENT_SOURCE');
  return Object.freeze({
   dispatched:true,existing:true,
   trigger_id,original_work_id,source_event_id,
   worker_ref_sha:head,installation_authorized:false,production_changed:false,
  });
 }
 const created=await github('/contents/'+path,{method:'PUT',body:{
  message:'Reality: independently verified missing capability wake '+trigger_id,
  branch:BRANCH,content:Buffer.from(data,'utf8').toString('base64'),
 }});
 if(!SHA.test(created?.commit?.sha)||
  created?.content?.path!==path)
  fail('GITHUB_TRIGGER_COMMIT_NOT_CONFIRMED');
 const after=await github('/contents/'+path+'?ref='+encodeURIComponent(BRANCH));
 const decoded=Buffer.from(String(after?.content||'').replace(/\s/g,''),'base64').toString('utf8');
 if(after?.path!==path||decoded!==data)
  fail('GITHUB_TRIGGER_BYTES_CHANGED');
 return Object.freeze({
  dispatched:true,existing:false,
  trigger_id,source_event_id,original_work_id,
  worker_commit_sha:created.commit.sha,
  worker_workflow_url:'https://github.com/'+REPO+
   '/actions/workflows/reality-genuine-capability-auto-trigger-v1.yml',
  installation_authorized:false,original_job_completed:false,
  production_changed:false,
 });
}
