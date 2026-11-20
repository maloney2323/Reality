// The SAME privileged, independent postinstall verifier audits the exact
// owner-approved INTERNAL MAINTENANCE repair. It cannot authorize changes,
// does not execute GitHub writes, never settles an unrelated business original.
const PROJECT='hvkfreoagbrphwghjajw';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const BRANCH='reality/chat-direct-work-handoff-20261115';
const WORKFLOW='.github/workflows/reality-governed-general-postinstall-original-acceptance-v1.yml';
const NAME='Reality independently accepted governed original post-install';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const fail=(s:string):never=>{throw Error('SIGNED_MAINTENANCE_POSTINSTALL_'+s)};
const result=(status:string,extra:Record<string,unknown>={},http=200)=>
 new Response(JSON.stringify({status,...extra,
  repair_verified:false,original_job_completed:false,
  production_changed:false,new_shift_started:false}),
  {status:http,headers:{'content-type':'application/json','cache-control':'no-store'}});
async function rpc(base:string,key:string,name:string,args:Record<string,unknown>={}){
 if(!['reality_read_signed_maintenance_postinstall_scope_v1',
  'reality_record_signed_maintenance_independent_postinstall_v1'].includes(name))
  fail('SERVICE_RPC_NOT_ALLOWLISTED');
 const r=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',
  cache:'no-store',redirect:'error',signal:AbortSignal.timeout(11000),
  headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},
  body:JSON.stringify(args)});
 if(!r.ok)fail('EXACT_POSTINSTALL_DATABASE_UNAVAILABLE');
 const d=await r.json().catch(()=>null);
 if(!d||typeof d!=='object'||Array.isArray(d))
  fail('EXACT_POSTINSTALL_DATABASE_RECEIPT_INVALID');
 return d;
}
async function gh(token:string,path:string){
 const r=await fetch(ROOT+path,{method:'GET',cache:'no-store',
  redirect:'error',signal:AbortSignal.timeout(12000),
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Independent-Existing-Maintenance-Postinstall'}});
 if(!r.ok)fail('PROVIDER_GITHUB_READ_FAILED');
 const d=await r.json().catch(()=>null);
 if(!d||Array.isArray(d)||typeof d!=='object')fail('PROVIDER_GITHUB_RESPONSE_INVALID');
 return d;
}
async function source(token:string,path:string,commit:string){
 if(!/^src\/[a-z0-9_./-]+\.js$/.test(path)||path.includes('..')||!SHA.test(commit))
  fail('EXACT_SOURCE_PATH_UNVERIFIED');
 const d=await gh(token,'/contents/'+path+'?ref='+commit);
 if(d.path!==path||d.encoding!=='base64'||
  !SHA.test(d.sha||'')||!Number.isSafeInteger(d.size)||
  d.size<200||d.size>100000||typeof d.content!=='string')
  fail('INSTALLED_SOURCE_METADATA_UNVERIFIED');
 const bytes=Uint8Array.from(atob(d.content.replace(/\s/g,'')),x=>x.charCodeAt(0));
 const pre=new TextEncoder().encode('blob '+bytes.length+'\0');
 const all=new Uint8Array(pre.length+bytes.length);
 all.set(pre);all.set(bytes,pre.length);
 const h=await crypto.subtle.digest('SHA-1',all);
 const sha=Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('');
 if(bytes.length!==d.size||sha!==d.sha)fail('INSTALLED_BYTES_HASH_UNVERIFIED');
 return d.sha as string;
}
export async function independentlyAcceptInstalledMaintenance(base:string,key:string){
 try{
  if(base!=='https://'+PROJECT+'.supabase.co'||key.length<25)
   return result('SIGNED_MAINTENANCE_POSTINSTALL_ISOLATED_SERVICE_REQUIRED',{},503);
  const s=await rpc(base,key,'reality_read_signed_maintenance_postinstall_scope_v1');
  if(s.status==='NO_OWNER_APPROVED_MAINTENANCE_POSTINSTALL_ACCEPTANCE_DUE'&&
   s.original_job_completed===false&&s.production_changed===false)
   return result(s.status);
  if(s.status!=='EXACT_SIGNED_MAINTENANCE_INDEPENDENT_POSTINSTALL_DUE'||
   !UUID.test(s.owner_id||'')||!UUID.test(s.shift_id||'')||
   !UUID.test(s.maintenance_id||'')||
   !SHA.test(s.expected_parent_sha||'')||
   !SHA.test(s.installed_commit_sha||'')||
   !SHA.test(s.candidate_source_blob_sha||'')||
   !HASH.test(s.case_ci_receipt_sha256||'')||
   !HASH.test(s.approval_receipt_sha256||'')||
   !HASH.test(s.target_review_receipt_sha256||'')||
   s.target_branch!==BRANCH||
   !/^src\/[a-z0-9_./-]+\.js$/.test(s.source_path||'')||
   s.original_job_completed!==false||s.production_changed!==false)
   fail('SIGNED_ORIGINAL_AND_APPROVAL_SCOPE_UNVERIFIED');
  const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
  if(token.length<25)
   return result('SIGNED_MAINTENANCE_POSTINSTALL_GITHUB_CREDENTIAL_UNAVAILABLE',{},503);
  const [ref,installed,commit,checks,runs,providerStatus]=await Promise.all([
   gh(token,'/git/ref/heads/'+BRANCH),
   source(token,s.source_path,s.installed_commit_sha),
   gh(token,'/commits/'+s.installed_commit_sha),
   gh(token,'/commits/'+s.installed_commit_sha+'/check-runs?per_page=100'),
   gh(token,'/actions/runs?head_sha='+s.installed_commit_sha+'&event=push&per_page=100'),
   gh(token,'/commits/'+s.installed_commit_sha+'/status')
  ]);
  if(ref.ref!=='refs/heads/'+BRANCH||
   ref.object?.sha!==s.installed_commit_sha||
   installed!==s.candidate_source_blob_sha||
   commit.sha!==s.installed_commit_sha||
   commit.parents?.length!==1||
   commit.parents[0]?.sha!==s.expected_parent_sha||
   !Array.isArray(commit.files)||commit.files.length!==1||
   commit.files[0]?.filename!==s.source_path||
   commit.files[0]?.status!=='modified')
   return result('SIGNED_MAINTENANCE_POSTINSTALL_INSTALLED_COMMIT_OR_SOURCE_DRIFT');
  const eligible=(runs.workflow_runs||[]).filter((x:any)=>
   x.head_sha===s.installed_commit_sha&&x.head_branch===BRANCH&&
   x.name===NAME&&x.path?.split('@')[0]===WORKFLOW&&
   x.event==='push'&&x.status==='completed'&&
   x.conclusion==='success'&&Number.isSafeInteger(x.id)&&x.id>10000&&
   x.html_url==='https://github.com/maloney2323/Reality/actions/runs/'+x.id);
  const vercel=(checks.check_runs||[]).filter((x:any)=>
   x.head_sha===s.installed_commit_sha&&x.app?.slug==='vercel'&&
   x.status==='completed'&&x.conclusion==='success'&&
   Number.isSafeInteger(x.id)&&x.id>10000);
  // "Vercel Preview Comments" alone is NOT deployment proof: require
  // the separate Vercel GitHub deployment commit status on the same SHA.
  const ready=providerStatus?.state==='success'&&
   Array.isArray(providerStatus.statuses)&&
   providerStatus.statuses.some((x:any)=>
    x.context==='Vercel'&&x.state==='success'&&
    /^https:\/\/vercel\.com\/[a-zA-Z0-9_-]+\/reality\/[a-zA-Z0-9_-]{10,100}$/.test(x.target_url||''));
  if(eligible.length!==1||vercel.length<1||!ready)
   return result('SIGNED_MAINTENANCE_POSTINSTALL_WAITING_FOR_INDEPENDENT_CI_AND_PREVIEW');
  const run=eligible[0];
  const jobs=await gh(token,'/actions/runs/'+run.id+'/jobs?per_page=100');
  const required=[
   'Verify isolated preview commit and source tree identity',
   'Independently accept original-job runtime and governed handoff',
   'Independently verify same-original frozen-CI and recovery safeguards',
   'Independently regress self-inquiry recovery without new authority',
   'Confirm no upgrade installation or customer settlement from CI'
  ];
  const job=(jobs.jobs||[]).filter((j:any)=>
   j.run_id===run.id&&j.name==='independent-original-acceptance'&&
   j.status==='completed'&&j.conclusion==='success'&&
   Array.isArray(j.steps)&&required.every(name=>
    j.steps.some((p:any)=>p.name===name&&p.conclusion==='success')));
  if(job.length!==1)
   return result('SIGNED_MAINTENANCE_POSTINSTALL_CI_STEPS_UNVERIFIED');
  // Independent run and Vercel app evidence are source-bound to the SAME
  // installed commit. Recording is the first ledger mutation by this reviewer.
  const saved=await rpc(base,key,'reality_record_signed_maintenance_independent_postinstall_v1',{
   p_maintenance_id:s.maintenance_id,
   p_installed_commit_sha:s.installed_commit_sha,
   p_verified_source_blob_sha:installed,
   p_github_acceptance_run_id:run.id,
   p_vercel_check_id:vercel[0].id});
  if(saved.status!=='SAME_SIGNED_SHIFT_INTERNAL_MAINTENANCE_INDEPENDENTLY_VERIFIED'||
   saved.maintenance_id!==s.maintenance_id||
   saved.shift_id!==s.shift_id||
   saved.installed_commit_sha!==s.installed_commit_sha||
   saved.github_acceptance_run_id!==run.id||
   saved.vercel_check_id!==vercel[0].id||
   !HASH.test(saved.independent_postinstall_receipt_sha256||'')||
   saved.repair_verified!==true||
   saved.original_job_completed!==false||
   saved.production_changed!==false||saved.new_shift_started!==false)
   fail('DURABLE_INDEPENDENT_REPAIR_RECEIPT_UNVERIFIED');
  return result(saved.status,{
   maintenance_id:s.maintenance_id,shift_id:s.shift_id,
   installed_commit_sha:s.installed_commit_sha,
   independent_postinstall_receipt_sha256:saved.independent_postinstall_receipt_sha256,
   github_acceptance_run_id:run.id,vercel_check_id:vercel[0].id,
   repair_verified:true,
   next_action:'CONTINUE_SAME_ORIGINAL_SHIFT_WITHOUT_NEW_APPROVAL'
  });
 }catch(e){
  const x=e instanceof Error?e.message:'';
  return result(/^SIGNED_MAINTENANCE_POSTINSTALL_[A-Z0-9_]+$/.test(x)?
   x:'SIGNED_MAINTENANCE_POSTINSTALL_PROVIDER_OR_SCOPE_UNVERIFIED',{},503);
 }
}
