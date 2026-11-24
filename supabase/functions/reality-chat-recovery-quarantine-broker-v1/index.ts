// Reality's existing signed worker -> privileged GitHub quarantine transport.
// Source: existing capability queue SIGNED_CHAT_DEVELOPMENT_RECOVERY ONLY.
// No new owner Chat instruction, new shift, running install, or final receipt.
const REPO='maloney2323/Reality';
const BASE='https://api.github.com/repos/'+REPO;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const PATH=/^(?:src\/[A-Za-z0-9_./-]+\.js|api\/reality\/[A-Za-z0-9_./-]+\.js|reality-[A-Za-z0-9_.-]+\.(?:js|css)|index\.html)$/;
const BRANCH=/^(?:repair|reality)\/[A-Za-z0-9/_-]{10,160}$/;
const allowed=new Set([
 'reality_read_next_signed_chat_recovery_publish_v1',
 'reality_fence_signed_chat_recovery_publish_v1',
 'reality_record_signed_chat_recovery_quarantine_v1'
]);
const safe=(status,more={},statusCode=200)=>new Response(JSON.stringify({
 status,source_installed:false,feature_acceptance_verified:false,
 independent_ci_verified:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 new_shift_started:false,...more
}),{status:statusCode,headers:{'content-type':'application/json','cache-control':'no-store'}});
const error=x=>{throw Error('SIGNED_CHAT_RECOVERY_QUARANTINE_'+x)};
async function rpc(url,key,name,args={}){
 if(!allowed.has(name))error('RPC_NOT_ALLOWLISTED');
 const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',
  redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000),
  headers:{apikey:key,authorization:'Bearer '+key,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(args)});
 if(!r.ok)error('DATABASE_TRANSITION_UNVERIFIED');
 const d=await r.json().catch(()=>null);
 if(!d||typeof d!=='object'||Array.isArray(d))
  error('DATABASE_RECEIPT_INVALID');
 return d;
}
async function gh(token,path,method='GET',obj=null){
 const r=await fetch(BASE+path,{method,redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(14000),
  headers:{authorization:'Bearer '+token,
   accept:'application/vnd.github+json',
   'content-type':'application/json',
   'user-agent':'Reality-signed-recovery-quarantine-broker',
   'x-github-api-version':'2022-11-28'},
  ...(obj==null?{}:{body:JSON.stringify(obj)})});
 return {ok:r.ok,status:r.status,data:await r.json().catch(()=>null)};
}
// The broker (not a standalone model or worker) alone can identify its
// installed GitHub credential. GET only; never attempt to prove write authority
// by issuing another POST to an unsettled provider.
async function githubCredentialReadback(token){
 const headers={authorization:'Bearer '+token,
  accept:'application/vnd.github+json','x-github-api-version':'2022-11-28',
  'user-agent':'Reality-fenced-provider-credential-readback'};
 async function get(path){
  try{
   const r=await fetch('https://api.github.com/'+path,{
    method:'GET',cache:'no-store',redirect:'error',
    signal:AbortSignal.timeout(9000),headers});
   return {status:r.status,data:r.ok?await r.json().catch(()=>null):null,
    scopes:r.headers.get('x-oauth-scopes')||''};
  }catch{return {status:null,data:null,scopes:''}}
 }
 const [user,installation,rules]=await Promise.all([
  get('user'),get('installation/repositories'),
  get('repos/'+REPO+'/rulesets?includes_parents=true')
 ]);
 const installationHasRepo=installation.status===200&&
  Array.isArray(installation.data?.repositories)&&
  installation.data.repositories.some(x=>x?.full_name===REPO);
 const login=user.status===200&&typeof user.data?.login==='string'&&
  /^[A-Za-z0-9-]{1,39}$/.test(user.data.login)?user.data.login:null;
 const actorKind=login?'USER_ACCESS_TOKEN':
   installationHasRepo?'GITHUB_APP_INSTALLATION_TOKEN':
   'TOKEN_ACTOR_NOT_INDEPENDENTLY_RESOLVED';
 const repoScope=user.status===200&&
  user.scopes.split(',').map(x=>x.trim()).some(x=>x==='repo'||x==='public_repo');
 return {
  schema:'reality-broker-read-only-credential-provenance-v1',
  repository:REPO,credential_kind:actorKind,
  github_actor_login:login,
  github_actor_user_http_status:user.status,
  installation_repository_access_verified:installationHasRepo,
  installation_repository_http_status:installation.status,
  classic_repo_scope_observed:repoScope,
  oauth_scopes_header_available:!!user.scopes,
  rulesets_read_http_status:rules.status,
  ruleset_count:rules.status===200&&Array.isArray(rules.data)?
   rules.data.length:null,
  contents_write_effectively_tested:false,
  exact_ref_write_authorized:false,provider_effect_replayed:false,
  action:'VERIFY_EXACT_BROKER_CONTENTS_WRITE_OR_REQUEST_OWNER_PROVIDER_CORRECTION'
 };
}
const bytes=x=>new TextEncoder().encode(x);
const b64=x=>btoa(Array.from(x,(b)=>String.fromCharCode(b)).join(''));
const un64=s=>{
 try{return Uint8Array.from(atob(String(s||'').replace(/\s/g,'')),c=>c.charCodeAt(0))}
 catch{return null}
};
async function gitBlob(b){
 const h=bytes('blob '+b.length+'\0'),all=new Uint8Array(h.length+b.length);
 all.set(h);all.set(b,h.length);
 const d=await crypto.subtle.digest('SHA-1',all);
 return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function valid(s){
 const c=s?.candidate;
 return s?.status==='SIGNED_CHAT_RECOVERY_QUARANTINE_CANDIDATE_READ'&&
  UUID.test(s.trigger_id||'')&&UUID.test(s.owner_id||'')&&
  UUID.test(s.message_id||'')&&WORK.test(s.original_work_id||'')&&
  HASH.test(s.blocker_receipt_sha256||'')&&
  HASH.test(s.spec_sha256||'')&&
  /^[a-f0-9]{64}$/.test(s.source_sha256||'')&&
  s.source_ref==='supabase:reality_chat_messages:'+s.message_id&&
  ['SIGNED_CHAT_RECOVERY_TARGET_REVIEWED',
   'SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'].includes(s.phase)&&
  HASH.test(s.target_review_receipt_sha256||'')&&
  s.independent_target_review_verified===true&&
  Number.isSafeInteger(s.quarantine_epoch)&&s.quarantine_epoch>=0&&s.quarantine_epoch<=9&&
  Number.isSafeInteger(s.feature_epoch)&&s.feature_epoch>=0&&s.feature_epoch<=4&&
  (s.phase==='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'||s.syntax_verified===true)&&
  SHA.test(s.release_sha||'')&&
  s.installation_authorized===false&&s.original_job_completed===false&&
  s.production_changed===false&&s.new_shift_started===false&&
  c&&typeof c==='object'&&!Array.isArray(c)&&
  c.original_work_id===s.original_work_id&&
  c.spec_sha256===s.spec_sha256&&
  c.blocker_receipt_sha256===s.blocker_receipt_sha256&&
  HASH.test(c.candidate_sha256||'')&&
  c.base_sha===s.release_sha&&
  SHA.test(c.source_blob_sha||'')&&
  PATH.test(c.target_path||'')&&
  !c.target_path.includes('..')&&!c.target_path.includes('//')&&
  !c.target_path.includes('/.env')&&!c.target_path.includes('/secrets')&&
  !c.target_path.includes('/credentials')&&
  typeof c.find==='string'&&c.find.length>=20&&c.find.length<=12000&&
  typeof c.replace==='string'&&c.replace.length>=20&&c.replace.length<=16000&&
  c.replace!==c.find&&
  typeof c.reason==='string'&&c.reason.length>=10&&c.reason.length<=1800&&
  c.installation_authorized===false&&c.original_job_completed===false&&
  c.production_changed===false;
}
const loc=s=>({
 branch:'reality/chat-recovery/'+s.trigger_id+(s.feature_epoch>0?'-feature-r'+s.feature_epoch:'')+(s.quarantine_epoch>0?'-syntax-r'+s.quarantine_epoch:''),
 artifact:'evidence/reality-chat-recovery/'+s.trigger_id+'.json'
});
const evidence=s=>JSON.stringify({
 version:'reality-signed-chat-recovery-quarantined-candidate-v1',
 trigger_id:s.trigger_id,original_work_id:s.original_work_id,
 signed_source_ref:s.source_ref,source_sha256:s.source_sha256,
 blocker_receipt_sha256:s.blocker_receipt_sha256,
 recovery_spec_sha256:s.spec_sha256,
 independent_target_review_verified:true,
 target_review_receipt_sha256:s.target_review_receipt_sha256,
 candidate_sha256:s.candidate.candidate_sha256,
 source_base_commit_sha:s.release_sha,
 candidate:s.candidate,source_installed:false,
 independent_ci_verified:false,feature_acceptance_verified:false,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,new_shift_started:false
},null,2)+'\n';
async function prepare(s,token,base){
 const baseRef=await gh(token,'/git/ref/heads/'+base);
 if(!baseRef.ok||(s.phase!=='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'&&baseRef.data?.object?.sha!==s.release_sha))
  return null;
 const original=await gh(token,'/contents/'+s.candidate.target_path+'?ref='+s.release_sha);
 const raw=un64(original.data?.content);
 if(!original.ok||original.data?.encoding!=='base64'||raw==null||
  original.data?.sha!==s.candidate.source_blob_sha||
  await gitBlob(raw)!==s.candidate.source_blob_sha)return null;
 let source;
 try{source=new TextDecoder('utf-8',{fatal:true}).decode(raw)}catch{return null}
 if(source.includes('\0'))return null;
 const at=source.indexOf(s.candidate.find);
 if(at<0||source.indexOf(s.candidate.find,at+1)>=0)return null;
 const next=source.slice(0,at)+s.candidate.replace+
  source.slice(at+s.candidate.find.length);
 const nextBytes=bytes(next);
 if(next===source||next.includes('\0')||nextBytes.length>280000)return null;
 return {code:nextBytes,blob:await gitBlob(nextBytes)};
}
async function existing(s,token,base,expected){
 const {branch,artifact}=loc(s);
 const [ref,file,target,prs]=await Promise.all([
  gh(token,'/git/ref/heads/'+branch),
  gh(token,'/contents/'+artifact+'?ref='+encodeURIComponent(branch)),
  gh(token,'/contents/'+s.candidate.target_path+'?ref='+encodeURIComponent(branch)),
  gh(token,'/pulls?state=all&head='+encodeURIComponent('maloney2323:'+branch)+'&per_page=100')
 ]);
 if(!ref.ok||!SHA.test(ref.data?.object?.sha||'')||
  !file.ok||!target.ok||!prs.ok||!Array.isArray(prs.data))return null;
 const artifactBytes=bytes(evidence(s));
 if(file.data?.sha!==await gitBlob(artifactBytes)||
  b64(un64(file.data?.content)||new Uint8Array())!==b64(artifactBytes)||
  target.data?.sha!==expected.blob||
  b64(un64(target.data?.content)||new Uint8Array())!==b64(expected.code))
  return null;
 const commit=ref.data.object.sha;
 const head=await gh(token,'/commits/'+commit);
 if(!head.ok||head.data?.parents?.length!==1||head.data?.files?.length!==1||
  head.data.files[0]?.filename!==artifact||
  head.data.files[0]?.status!=='added')return null;
 const sourceCommit=head.data.parents[0].sha;
 const source=await gh(token,'/commits/'+sourceCommit);
 if(!source.ok||source.data?.parents?.length!==1||
  source.data.parents[0]?.sha!==s.release_sha||
  source.data.files?.length!==1||
  source.data.files[0]?.filename!==s.candidate.target_path||
  source.data.files[0]?.status!=='modified')return null;
 const candidates=prs.data.filter(p=>p?.head?.ref===branch&&
  p.head.sha===commit&&p.head.repo?.full_name===REPO&&
  p.base?.ref===base&&p.base.repo?.full_name===REPO&&
  p.draft===true&&p.merged===false&&
  Number.isSafeInteger(p.number)&&p.number>0);
 if(candidates.length!==1)return null;
 return {commit,sourceCommit,pr:candidates[0].number,
  blob:await gitBlob(artifactBytes),sourceBlob:expected.blob};
}
async function stage(s,db,key,token,base){
 const {branch,artifact}=loc(s);
 const prepared=await prepare(s,token,base);
 if(!prepared)return safe('RECOVERY_BASE_SOURCE_OR_PREVIEW_DRIFT');
 if(s.phase==='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'){
  // Unknown provider effects must never be retried. Only independent GET
  // reconstruction can settle an existing fenced write.
  const read=await existing(s,token,base,prepared);
  if(!read){
   // GET-only observation with the exact broker credential. A missing ref
   // never settles an earlier ambiguous provider write or grants a replay.
   const observed=await Promise.all([
    gh(token,'/git/ref/heads/'+branch),
    gh(token,'')
   ]).catch(()=>null);
   const refStatus=observed?.[0]?.status;
   const permission=observed?.[1]?.ok===true?
    observed[1].data?.permissions?.push:null;
   const exactPermission=typeof permission==='boolean'?permission:null;
   const diagnosis=refStatus===404?
    (exactPermission===false?'GITHUB_BROKER_PUSH_PERMISSION_MISSING':
     exactPermission===true?'GITHUB_REF_NOT_OBSERVED_PUSH_PERMISSION_PRESENT':
      'GITHUB_REF_NOT_OBSERVED_PERMISSION_UNKNOWN'):
    refStatus===200?'GITHUB_REF_PRESENT_ARTIFACT_NOT_VERIFIED':
    'GITHUB_READBACK_NOT_VERIFIED';
   const credential=await githubCredentialReadback(token);
   return safe('RECOVERY_FENCED_PROVIDER_EFFECT_UNVERIFIED_NO_REPLAY',{
    broker_read_only_diagnosis:diagnosis,
    provider_ref_http_status:Number.isInteger(refStatus)?refStatus:null,
    broker_push_permission_verified:exactPermission,
    broker_credential_readback:credential,
    read_only_observation:true,provider_effect_settled:false,
    write_replay_authorized:false
   });
  }
  return record(s,db,key,read);
 }
 const before=await gh(token,'/git/ref/heads/'+branch);
 if(before.status!==404)
  return safe('RECOVERY_PREVIOUS_BRANCH_UNVERIFIED_NO_REPLAY');
 const fence=await rpc(db,key,'reality_fence_signed_chat_recovery_publish_v1',{
  p_trigger_id:s.trigger_id,p_candidate_sha256:s.candidate.candidate_sha256
 });
 if(fence.status!=='SIGNED_CHAT_RECOVERY_QUARANTINE_EFFECT_FENCED'||
    fence.original_work_id!==s.original_work_id||
    fence.candidate_sha256!==s.candidate.candidate_sha256)
  error('PREWRITE_FENCE_UNVERIFIED');
 const b=await gh(token,'/git/refs','POST',{
  ref:'refs/heads/'+branch,sha:s.release_sha
 });
 if(b.status!==201||b.data?.object?.sha!==s.release_sha)
  return safe('RECOVERY_GITHUB_BRANCH_EFFECT_UNKNOWN_NO_REPLAY',{
   broker_read_only_diagnosis:b.status===401||b.status===403?
    'GITHUB_BRANCH_CREATE_PROVIDER_AUTH_REJECTED':
    b.status===422?'GITHUB_BRANCH_CREATE_REF_CONFLICT_UNVERIFIED':
    'GITHUB_BRANCH_CREATE_EFFECT_UNKNOWN',
   provider_write_http_status:Number.isInteger(b.status)?b.status:null,
   provider_effect_settled:false,write_replay_authorized:false
  });
 const code=await gh(token,'/contents/'+s.candidate.target_path,'PUT',{
  message:'Reality quarantined capability code '+s.trigger_id,
  branch,sha:s.candidate.source_blob_sha,content:b64(prepared.code)
 });
 if(code.status!==200||!SHA.test(code.data?.commit?.sha||'')||
  code.data?.content?.sha!==prepared.blob)
  return safe('RECOVERY_CODE_WRITE_EFFECT_UNKNOWN_NO_REPLAY');
 const written=await gh(token,'/contents/'+artifact,'PUT',{
  message:'Reality signed recovery source and spec evidence '+s.trigger_id,
  branch,content:b64(bytes(evidence(s)))
 });
 if(written.status!==201||!SHA.test(written.data?.commit?.sha||''))
  return safe('RECOVERY_QUARANTINE_ARTIFACT_EFFECT_UNKNOWN_NO_REPLAY');
 const open=await gh(token,'/pulls','POST',{
  title:'Reality recovery quarantine · '+s.original_work_id.slice(5,13),
  head:branch,base,draft:true,
  body:'AUTONOMOUS SIGNED ORIGINAL RECOVERY CANDIDATE — quarantined only.\n'+
   'Original: '+s.original_work_id+'\n'+
   'Blocker receipt: '+s.blocker_receipt_sha256+'\n'+
   'Frozen capability spec: '+s.spec_sha256+'\n'+
   'Model code UNTRUSTED. Independent full-goal functional acceptance, '+
   'compatible installer, exact owner approval and separate outcome proof all remain REQUIRED. '+
   'No installation, production effects or job settlement.'
 });
 if(open.status!==201||!Number.isSafeInteger(open.data?.number))
  return safe('RECOVERY_DRAFT_PR_EFFECT_UNKNOWN_NO_REPLAY');
 const checked=await existing(s,token,base,prepared);
 if(!checked||checked.pr!==open.data.number||
    checked.commit!==written.data.commit.sha)
  return safe('RECOVERY_QUARANTINE_PROVIDER_READBACK_UNVERIFIED_NO_REPLAY');
 return record(s,db,key,checked);
}
async function record(s,db,key,v){
 const r=await rpc(db,key,'reality_record_signed_chat_recovery_quarantine_v1',{
  p_trigger_id:s.trigger_id,p_candidate_sha256:s.candidate.candidate_sha256,
  p_commit_sha:v.commit,p_source_commit_sha:v.sourceCommit,
  p_branch:loc(s).branch,p_pr_number:v.pr,
  p_artifact_blob_sha:v.blob,p_source_blob_sha:v.sourceBlob
 });
 if(r.status!=='SIGNED_CHAT_RECOVERY_QUARANTINE_PROVIDER_RECEIPTED'||
  r.original_work_id!==s.original_work_id||
  !HASH.test(r.receipt_sha256||'')||
  r.artifact_commit_sha!==v.commit||
  r.source_commit_sha!==v.sourceCommit||
  r.original_job_completed!==false||r.installation_authorized!==false||
  r.production_changed!==false||r.source_installed!==false)
  error('DURABLE_QUARANTINE_RECEIPT_UNVERIFIED');
 return safe(r.status,{
  original_work_id:s.original_work_id,trigger_id:s.trigger_id,
  quarantine_receipt_sha256:r.receipt_sha256,
  artifact_commit_sha:v.commit,pr_url:r.pr_url,
  provider_readback_verified:true
 });
}
Deno.serve(async request=>{
 try{
  if(request.method!=='POST'||
   request.headers.get('content-type')!=='application/json')
   return safe('SIGNED_RECOVERY_POST_ONLY',{},405);
  let b;try{b=await request.json()}catch{return safe('RECOVERY_REQUEST_INVALID',{},400)}
  if(!b||Object.keys(b).sort().join(',')!=='action,base_branch,base_sha'||
    b.action!=='stage_signed_chat_recovery_quarantine'||
    !BRANCH.test(b.base_branch||'')||!SHA.test(b.base_sha||'')||
    b.base_branch.includes('..')||b.base_branch.includes('//')||
    b.base_branch.startsWith('reality/chat-recovery/')||
    b.base_branch.startsWith('reality/chat-development/')||
    b.base_branch.startsWith('reality/riley/'))
   return safe('SIGNED_RECOVERY_EXACT_PREVIEW_RELEASE_REQUIRED',{},400);
  const secret=request.headers.get('apikey')||'';
  if(secret.length<24||
     request.headers.get('authorization')!=='Bearer '+secret)
   return safe('SIGNED_RECOVERY_SERVICE_BOUNDARY_REQUIRED',{},403);
  const url=Deno.env.get('SUPABASE_URL')||'';
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||
    !parsed.hostname.endsWith('.supabase.co')||
    parsed.pathname!=='/'||parsed.search||parsed.hash)
   return safe('SIGNED_RECOVERY_PROJECT_BOUNDARY_REQUIRED',{},403);
  const q=await rpc(parsed.origin,secret,
    'reality_read_next_signed_chat_recovery_publish_v1');
  if(q.status==='NO_SIGNED_CHAT_RECOVERY_QUARANTINE_CANDIDATE')
   return safe(q.status);
  if(!valid(q)||(q.phase!=='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'&&q.release_sha!==b.base_sha))
   return safe('SIGNED_RECOVERY_SPEC_SOURCE_OR_DEPLOYMENT_DRIFT');
  const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
  if(token.length<24)
   return safe('SIGNED_RECOVERY_GITHUB_PROVIDER_PERMISSION_MISSING');
  return await stage(q,parsed.origin,secret,token,b.base_branch);
 }catch(e){
  const msg=String(e instanceof Error?e.message:'');
  return safe(/^SIGNED_CHAT_RECOVERY_QUARANTINE_[A-Z0-9_]{4,110}$/.test(msg)?
    msg:'SIGNED_RECOVERY_QUARANTINE_PROVIDER_UNVERIFIED_NO_REPLAY',{},503);
 }
});
