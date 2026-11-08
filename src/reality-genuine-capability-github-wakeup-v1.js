// Durable source-bound trigger: wake the full isolated capability workflow, NOT installation.
// A trusted Reality server sends this only AFTER Universe + service-role
// atomic gap queue independently confirm the original customer job.
const REPO='maloney2323/Reality';
const BRANCH='feature/reality-general-capability-engine-20261101';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const PROOF=/^sha256:[a-f0-9]{64}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9]\d*$/;
const fail=x=>{throw Error('GENUINE_WAKE_DISPATCH_'+x)};
export async function dispatchGenuineCapabilityWake({
 trigger_id,source_event_id,original_work_id,env=process.env,
 shift_id=null,source_ref=null,source_proof_sha256=null,db=null,
 fetchImpl=fetch,
}={}){
 if(env.VERCEL_ENV!=='preview'||
   env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF!=='hvkfreoagbrphwghjajw'||
   !UUID.test(trigger_id)||!UUID.test(source_event_id)||
   !WORK.test(original_work_id))
  fail('EXACT_PREVIEW_TRIGGER_REQUIRED');
 // Shift-owned wake delivery uses Reality's EXISTING independently scoped
 // Supabase capability broker. Vercel never needs a second GitHub PAT.
 // The broker performs another service-role owner/goal/shift/source proof
 // readback, writes an idempotent trigger, and verifies the provider bytes.
 // This path cannot approve an installation or count a worker execution.
 const shiftTransport=db!==null||shift_id!==null||
  source_ref!==null||source_proof_sha256!==null;
 if(shiftTransport){
  if(!db||db.project!=='hvkfreoagbrphwghjajw'||
     db.url!=='https://hvkfreoagbrphwghjajw.supabase.co'||
     typeof db.secretKey!=='string'||db.secretKey.length<24||
     !UUID.test(shift_id||'')||!ISSUE.test(source_ref||'')||
     !PROOF.test(source_proof_sha256||''))
   fail('TRUSTED_ORIGINAL_SHIFT_BROKER_SCOPE_REQUIRED');
  let response;
  try {
   response=await fetchImpl(
    db.url+'/functions/v1/reality-employee-capability-wake-broker-v1',{
     method:'POST',redirect:'error',cache:'no-store',
     headers:{apikey:db.secretKey,
      authorization:'Bearer '+db.secretKey,
      'content-type':'application/json'},
     body:JSON.stringify({shift_id,original_work_id,trigger_id,
      source_ref,source_proof_sha256}),
     signal:AbortSignal.timeout(18000)
    });
  }catch {
   fail('BROKER_DELIVERY_EFFECT_UNCERTAIN_NO_REPLAY');
  }
  const observed=await response?.json().catch(()=>null);
  if(!response?.ok||
     observed?.ok!==true||
     observed?.status!=='EXISTING_CAPABILITY_WAKE_TRANSPORT_CONFIRMED'||
     typeof observed.existing_idempotent_delivery!=='boolean'||
     observed.worker_acknowledged!==false||
     observed.installation_authorized!==false||
     observed.original_job_completed!==false||
     observed.production_changed!==false||
     observed.no_new_job_created!==true)
   fail('INDEPENDENT_BROKER_DELIVERY_READBACK_REQUIRED');
  return Object.freeze({
   dispatched:true,existing:observed.existing_idempotent_delivery,
   trigger_id,source_event_id,original_work_id,
   worker_execution_acknowledged:false,
   installation_authorized:false,original_job_completed:false,
   production_changed:false
  });
 }
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
