// Protected broker for Reality Chat's NEW development source candidate.
// Vercel's signed service worker proposes code. This broker validates the
// frozen source, then writes its exact bounded patch into an ISOLATED draft
// GitHub PR alongside independent evidence. No merge, preview installation,
// production change, model-code execution, shift or settlement is permitted.
// A separate CI checks source identity and syntax before owner review.
const REPO='maloney2323/Reality';
const GH='https://api.github.com/repos/'+REPO;
const FLOW='.github/workflows/reality-chat-new-development-candidate-v1.yml';
const FLOW_NAME='Reality signed Chat new development isolated source acceptance';
const STEP='Independently validate staged source candidate and syntax';
const SHA=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const PATH=/^(?:src\/[A-Za-z0-9_./-]+\.js|api\/reality\/[A-Za-z0-9_./-]+\.js|reality-[A-Za-z0-9_.-]+\.(?:js|css)|index\.html)$/;
// A signed repair/* preview can ONLY reconcile an already staged immutable
// candidate's independent CI. Source staging stays limited to reality/*.
const BRANCH=/^(?:reality|repair)\/[A-Za-z0-9/_-]{10,160}$/;
const SOURCE_STAGING_BRANCH=/^reality\/[A-Za-z0-9/_-]{10,160}$/;
const allowed=new Set([
 'reality_read_next_chat_new_development_candidate_v2',
 'reality_fence_chat_new_development_publish_v1',
 'reality_record_chat_new_development_candidate_v1',
 'reality_record_chat_new_development_ci_v1'
]);
const bodySafe=(status,extra={},statusCode=200)=>new Response(JSON.stringify({
 status,source_installed:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 new_shift_started:false,feature_acceptance_verified:false,...extra
}),{status:statusCode,headers:{'content-type':'application/json',
 'cache-control':'no-store','x-content-type-options':'nosniff'}});
const fail=x=>{throw Error('CHAT_NEW_DEVELOPMENT_PROVIDER_'+x)};
async function rpc(url,secret,name,args={}){
 if(!allowed.has(name))fail('RPC_NOT_ALLOWLISTED');
 const r=await fetch(url+'/rest/v1/rpc/'+name,{
  method:'POST',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(9000),
  headers:{apikey:secret,authorization:'Bearer '+secret,
   accept:'application/json','content-type':'application/json'},
  body:JSON.stringify(args)});
 if(!r.ok)fail('SERVICE_RECONCILIATION_UNVERIFIED');
 const j=await r.json().catch(()=>null);
 if(!j||typeof j!=='object'||Array.isArray(j))
  fail('SERVICE_RECEIPT_MALFORMED');
 return j;
}
async function gh(token,path,method='GET',payload=null){
 const r=await fetch(GH+path,{
  method,cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(13500),
  headers:{authorization:'Bearer '+token,
   accept:'application/vnd.github+json',
   'content-type':'application/json',
   'user-agent':'Reality-chat-development-inert-proposal-broker',
   'x-github-api-version':'2022-11-28'},
  ...(payload===null?{}:{body:JSON.stringify(payload)})
 });
 const result=await r.json().catch(()=>null);
 return {ok:r.ok,status:r.status,data:result};
}
function cleanScope(s){
 const c=s?.candidate;
 return s?.status==='EXACT_SIGNED_CHAT_NEW_DEVELOPMENT_CANDIDATE'&&
  UUID.test(s.message_id||'')&&UUID.test(s.owner_id||'')&&
  UUID.test(s.request_id||'')&&UUID.test(s.conversation_id||'')&&
  /^[a-f0-9]{64}$/.test(s.source_sha256||'')&&
  WORK.test(s.original_work_id||'')&&
  ['DRAFT_GENERATED','PUBLISH_FENCED','CANDIDATE_STAGED'].includes(s.phase)&&
  SHA.test(s.release_sha||'')&&
  s.installation_authorized===false&&s.original_job_completed===false&&
  s.production_changed===false&&s.new_shift_started===false&&
  (s.phase==='CANDIDATE_STAGED'&&c==null||
   c&&typeof c==='object'&&!Array.isArray(c)&&
    c.base_sha===s.release_sha&&SHA.test(c.source_blob_sha||'')&&
    PATH.test(c.target_path||'')&&!c.target_path.includes('..')&&
    !c.target_path.includes('//')&&
    typeof c.find==='string'&&c.find.length>=20&&c.find.length<=12000&&
    typeof c.replace==='string'&&c.replace.length>=20&&c.replace.length<=16000&&
    typeof c.reason==='string'&&c.reason.length>=10&&c.reason.length<=1800&&
    c.find!==c.replace)&&
  /^sha256:[a-f0-9]{64}$/.test(s.evidence?.candidate_sha256||'');
}
const asBytes=x=>new TextEncoder().encode(x);
function b64(bytes){
 let out='';
 for(let i=0;i<bytes.length;i+=4096)
  out+=String.fromCharCode(...bytes.slice(i,i+4096));
 return btoa(out);
}
function decodeBase64(s){
 try{return atob(String(s||'').replace(/\s/g,''))}catch{return ''}
}
async function gitBlob(bytes){
 const header=asBytes('blob '+bytes.length+'\0');
 const all=new Uint8Array(header.length+bytes.length);
 all.set(header);all.set(bytes,header.length);
 const result=await crypto.subtle.digest('SHA-1',all);
 return [...new Uint8Array(result)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function branchAndArtifact(s){
 return {
  branch:'reality/chat-development/'+s.message_id,
  artifact:'evidence/reality-chat-development/'+s.message_id+'.json'
 };
}
function evidenceText(s){
 return JSON.stringify({
  version:'reality-chat-new-development-candidate-v1',
  message_id:s.message_id,
  original_work_id:s.original_work_id,
  base_sha:s.release_sha,
  candidate:s.candidate,
  source_message_sha256:s.source_sha256,
  candidate_sha256:s.evidence.candidate_sha256,
  installation_authorized:false,
  original_job_completed:false,
  production_changed:false,
  feature_acceptance_verified:false
 },null,2)+'\n';
}
function proposedSource(s,original){
 if(typeof original!=='string'||original.length<100||
    original.includes('\0'))return null;
 const find=s.candidate.find;
 const at=original.indexOf(find);
 if(at<0||original.indexOf(find,at+1)!==-1)return null;
 const updated=original.slice(0,at)+s.candidate.replace+
  original.slice(at+find.length);
 const bytes=asBytes(updated);
 if(updated===original||bytes.length>280000||updated.includes('\0'))
  return null;
 return {updated,bytes};
}
async function readExisting(s,token,base){
 const {branch,artifact}=branchAndArtifact(s),target=s.candidate.target_path;
 const [ref,file,source,prs]=await Promise.all([
  gh(token,'/git/ref/heads/'+branch),
  gh(token,'/contents/'+artifact+'?ref='+encodeURIComponent(branch)),
  gh(token,'/contents/'+target+'?ref='+encodeURIComponent(branch)),
  gh(token,'/pulls?state=all&head='+encodeURIComponent('maloney2323:'+branch)+'&per_page=100')
 ]);
 if(ref.status===404)return null;
 if(!ref.ok||!SHA.test(ref.data?.object?.sha||'')||
  !file.ok||!source.ok||!prs.ok||!Array.isArray(prs.data))
  return null;
 const head=await gh(token,'/commits/'+ref.data.object.sha);
 if(!head.ok||head.data?.sha!==ref.data.object.sha||
  !Array.isArray(head.data?.parents)||head.data.parents.length!==1||
  !Array.isArray(head.data?.files)||head.data.files.length!==1||
  head.data.files[0]?.filename!==artifact||
  head.data.files[0]?.status!=='added')return null;
 const commit=ref.data.object.sha;
 const text=evidenceText(s),bytes=asBytes(text),blob=await gitBlob(bytes);
 const fromProvider=decodeBase64(file.data.content);
 if(!fromProvider||file.data.sha!==blob||
  b64(bytes)!==btoa(fromProvider))return null;
 const parentSha=head.data.parents[0].sha;
 const parent=await gh(token,'/commits/'+parentSha);
 if(!parent.ok||!Array.isArray(parent.data?.parents)||
  parent.data.parents.length!==1||
  parent.data.parents[0]?.sha!==s.release_sha||
  !Array.isArray(parent.data?.files)||parent.data.files.length!==1||
  parent.data.files[0]?.filename!==target||
  parent.data.files[0]?.status!=='modified')return null;
 const original=await gh(token,'/contents/'+target+'?ref='+s.release_sha);
 if(!original.ok||original.data?.sha!==s.candidate.source_blob_sha)
  return null;
 let old='';
 try{old=new TextDecoder().decode(
  Uint8Array.from(decodeBase64(original.data.content),c=>c.charCodeAt(0)))}catch{return null}
 const proposal=proposedSource(s,old);
 if(!proposal)return null;
 const expected=await gitBlob(proposal.bytes);
 if(source.data.sha!==expected||source.data.encoding!=='base64'||
    source.data.content?.replace(/\s/g,'')!==b64(proposal.bytes))
  return null;
 const exact=prs.data.filter(p=>p.head?.ref===branch&&p.head?.sha===commit&&
  p.base?.ref===base&&p.head?.repo?.full_name===REPO&&
  p.base?.repo?.full_name===REPO&&p.draft===true&&
  Number.isSafeInteger(p.number)&&p.number>0);
 if(exact.length!==1)return null;
 return {commit,blob,pr:exact[0].number,source_commit:parentSha};
}
async function verifyPinnedSource(s,token,base){
 const head=await gh(token,'/git/ref/heads/'+base);
 const source=await gh(token,'/contents/'+s.candidate.target_path+
  '?ref='+s.release_sha);
 if(!head.ok||head.data?.object?.sha!==s.release_sha||
    !source.ok||source.data?.sha!==s.candidate.source_blob_sha||
    source.data?.encoding!=='base64'||
    typeof source.data?.content!=='string')return null;
 let original='';
 try{
  const raw=decodeBase64(source.data.content);
  original=new TextDecoder().decode(
   Uint8Array.from(raw,c=>c.charCodeAt(0)));
 }catch{return null}
 return proposedSource(s,original);
}

async function recordCandidate(s,db,secret,receipt){
 const {branch}=branchAndArtifact(s);
 const r=await rpc(db,secret,'reality_record_chat_new_development_candidate_v1',{
  p_message_id:s.message_id,p_original_work_id:s.original_work_id,
  p_commit_sha:receipt.commit,p_branch:branch,
  p_pr_number:receipt.pr,p_artifact_blob_sha:receipt.blob
 });
 if(r.status!=='NEW_CHAT_DEVELOPMENT_PROVIDER_CANDIDATE_STAGED'||
    r.original_work_id!==s.original_work_id||
    r.artifact_commit_sha!==receipt.commit||
    r.source_installed===true||
    r.installation_authorized!==false||
    r.original_job_completed!==false||
    r.production_changed!==false||r.new_shift_started!==false)
  fail('DURABLE_GITHUB_SOURCE_RECEIPT_UNVERIFIED');
 return bodySafe(r.status,{
  original_work_id:s.original_work_id,
  artifact_commit_sha:receipt.commit,pr_url:r.pr_url,
  model_generated:true,independent_ci_verified:false
 });
}
async function stage(s,db,secret,token,base){
 const {branch,artifact}=branchAndArtifact(s);
 const text=evidenceText(s),bytes=asBytes(text);
 if(bytes.length>43000)fail('INERT_PATCH_ARTIFACT_TOO_LARGE');
 if(s.phase==='PUBLISH_FENCED'){
  const prev=await readExisting(s,token,base);
  if(!prev)return bodySafe('CHAT_NEW_DEV_UNKNOWN_EFFECT_RECONCILIATION_ONLY');
  return recordCandidate(s,db,secret,prev);
 }
 const proposal=await verifyPinnedSource(s,token,base);
 if(!proposal)
  return bodySafe('CHAT_NEW_DEV_GIT_SOURCE_OR_PREVIEW_DRIFT');
 const prior=await gh(token,'/git/ref/heads/'+branch);
 if(prior.status!==404)
  return bodySafe('CHAT_NEW_DEV_PRIOR_BRANCH_REQUIRES_RECONCILIATION');
 const fenced=await rpc(db,secret,'reality_fence_chat_new_development_publish_v1',{
  p_message_id:s.message_id,p_candidate_sha256:s.evidence.candidate_sha256
 });
 if(fenced.status!=='EXACT_CHAT_DEVELOPMENT_PUBLISH_FENCED'||
  fenced.message_id!==s.message_id||
  fenced.original_work_id!==s.original_work_id||
  fenced.candidate_sha256!==s.evidence.candidate_sha256||
  fenced.installation_authorized!==false||
  fenced.production_changed!==false)
  fail('ONE_SHOT_OWNER_PROPOSAL_FENCE_MISMATCH');
 const created=await gh(token,'/git/refs','POST',{
  ref:'refs/heads/'+branch,sha:s.release_sha
 });
 if(created.status!==201||created.data?.ref!=='refs/heads/'+branch||
    created.data?.object?.sha!==s.release_sha)
  return bodySafe('CHAT_NEW_DEV_BRANCH_WRITE_EFFECT_UNVERIFIED');
 // Commit 1 writes ACTUAL bounded source code to the isolated proposal
 // branch, never to the base branch, production or a running deployment.
 const target=s.candidate.target_path;
 const stagedCode=await gh(token,'/contents/'+target,'PUT',{
  message:'Reality isolated source candidate '+s.message_id,
  branch,sha:s.candidate.source_blob_sha,content:b64(proposal.bytes)});
 const sourceCommit=stagedCode.data?.commit?.sha;
 const sourceBlob=await gitBlob(proposal.bytes);
 if(stagedCode.status!==200||!SHA.test(sourceCommit||'')||
    stagedCode.data?.content?.sha!==sourceBlob)
  return bodySafe('CHAT_NEW_DEV_SOURCE_WRITE_EFFECT_UNVERIFIED');
 // Commit 2 attaches immutable provenance to that exact code candidate.
 const written=await gh(token,'/contents/'+artifact,'PUT',{
  message:'Reality signed Chat source evidence '+s.message_id,
  branch,content:b64(bytes)});
 const commit=written.data?.commit?.sha;
 const blob=await gitBlob(bytes);
 if(written.status!==201||!SHA.test(commit||'')||
    written.data?.content?.sha!==blob)
  return bodySafe('CHAT_NEW_DEV_ARTIFACT_WRITE_EFFECT_UNVERIFIED');
 const [ref,file,sourceFile,commitRead,sourceCommitRead]=await Promise.all([
  gh(token,'/git/ref/heads/'+branch),
  gh(token,'/contents/'+artifact+'?ref='+encodeURIComponent(branch)),
  gh(token,'/contents/'+target+'?ref='+encodeURIComponent(branch)),
  gh(token,'/commits/'+commit),
  gh(token,'/commits/'+sourceCommit)
 ]);
 if(ref.data?.object?.sha!==commit||file.data?.sha!==blob||
  sourceFile.data?.sha!==sourceBlob||
  !Array.isArray(commitRead.data?.parents)||
  commitRead.data.parents.length!==1||
  commitRead.data.parents[0]?.sha!==sourceCommit||
  !Array.isArray(commitRead.data?.files)||
  commitRead.data.files.length!==1||
  commitRead.data.files[0]?.filename!==artifact||
  commitRead.data.files[0]?.status!=='added'||
  !Array.isArray(sourceCommitRead.data?.parents)||
  sourceCommitRead.data.parents.length!==1||
  sourceCommitRead.data.parents[0]?.sha!==s.release_sha||
  sourceCommitRead.data.files?.length!==1||
  sourceCommitRead.data.files[0]?.filename!==target||
  sourceCommitRead.data.files[0]?.status!=='modified')
  return bodySafe('CHAT_NEW_DEV_ARTIFACT_PROVIDER_READBACK_UNVERIFIED');
 const opened=await gh(token,'/pulls','POST',{
  title:'Reality Chat · isolated development '+s.original_work_id.slice(5,13),
  body:'Owner-authenticated new Chat development code proposal.\\n'+
   'Source: '+s.evidence.candidate_sha256+'\\n'+
   'Source patch staged in isolated draft PR; no installation or execution. Independent acceptance required.',
  head:branch,base,draft:true
 });
 if(!opened.ok||opened.status!==201||
    !Number.isSafeInteger(opened.data?.number)||opened.data.number<=0)
  return bodySafe('CHAT_NEW_DEV_PR_CREATE_EFFECT_UNVERIFIED');
 const check=await readExisting(s,token,base);
 if(!check||check.commit!==commit||check.blob!==blob||
    check.pr!==opened.data.number)
  return bodySafe('CHAT_NEW_DEV_PR_PROVIDER_READBACK_UNVERIFIED');
 return recordCandidate(s,db,secret,check);
}
// For an ALREADY-STAGED immutable source candidate, later preview releases
// may change. Reconcile GitHub CI against the original frozen source and
// recorded draft PR, not the current worker release. No source write here.
async function verifyCI(s,db,secret,token){
 const e=s.evidence;
 const commit=e.artifact_commit_sha,pr=e.pull_request_number;
 if(!SHA.test(commit||'')||!Number.isSafeInteger(pr)||pr<=0||
    !SHA.test(s.release_sha||'')||
    !SHA.test(e.artifact_blob_sha||'')||
    !SHA.test(e.source_blob_sha||'')||
    typeof e.target_path!=='string'||!PATH.test(e.target_path)||
    e.target_path.includes('..')||e.target_path.includes('//')||
    e.pr_url!=='https://github.com/'+REPO+'/pull/'+pr)
  return bodySafe('CHAT_NEW_DEV_PROVENANCE_NOT_FINAL');
 const prs=await gh(token,'/pulls/'+pr);
 if(!prs.ok||prs.data?.head?.sha!==commit||
    prs.data?.head?.ref!==branchAndArtifact(s).branch||
    prs.data?.head?.repo?.full_name!==REPO||
    prs.data?.base?.repo?.full_name!==REPO||
    prs.data?.draft!==true||prs.data?.merged!==false||
    !BRANCH.test(prs.data?.base?.ref||'')||
    prs.data.base.ref.includes('..')||
    prs.data.base.ref.startsWith('reality/chat-development/')||
    prs.data.base.ref.startsWith('reality/riley/'))
  return bodySafe('CHAT_NEW_DEV_CANDIDATE_PR_IDENTITY_DRIFT');
 // Re-read the immutable ORIGINAL candidate parent chain and artifact.
 // A successful CI on a changed/misidentified PR cannot settle this source.
 const artifact='evidence/reality-chat-development/'+s.message_id+'.json';
 const [head,proof,frozen]=await Promise.all([
  gh(token,'/commits/'+commit),
  gh(token,'/contents/'+artifact+'?ref='+commit),
  gh(token,'/contents/'+e.target_path+'?ref='+s.release_sha)
 ]);
 // The stored artifact commit's parent is itself the source-modification
 // commit. Some older evidence records omit source_commit_sha; resolve the
 // parent from GitHub, then independently read the source modification.
 if(!head.ok||head.data?.sha!==commit||
    head.data?.parents?.length!==1||
    head.data?.files?.length!==1||
    head.data.files[0]?.filename!==artifact||
    head.data.files[0]?.status!=='added'||
    !SHA.test(head.data.parents[0]?.sha||'')||
    !proof.ok||proof.data?.sha!==e.artifact_blob_sha||
    !frozen.ok||frozen.data?.sha!==e.source_blob_sha)
  return bodySafe('CHAT_NEW_DEV_FROZEN_CANDIDATE_SOURCE_PROOF_REQUIRED');
 const parent=head.data.parents[0].sha;
 const sourceRead=await gh(token,'/commits/'+parent);
 if(!sourceRead.ok||sourceRead.data?.sha!==parent||
    sourceRead.data?.parents?.length!==1||
    sourceRead.data.parents[0]?.sha!==s.release_sha||
    sourceRead.data.files?.length!==1||
    sourceRead.data.files[0]?.filename!==e.target_path||
    sourceRead.data.files[0]?.status!=='modified')
  return bodySafe('CHAT_NEW_DEV_FROZEN_CANDIDATE_PARENT_DRIFT');
 const runs=await gh(token,'/actions/runs?head_sha='+commit+
  '&event=pull_request&per_page=100');
 if(!runs.ok||!Array.isArray(runs.data?.workflow_runs))
  return bodySafe('CHAT_NEW_DEV_INDEPENDENT_CI_READ_UNVERIFIED');
 const accepted=runs.data.workflow_runs.filter(r=>
  r.name===FLOW_NAME&&r.event==='pull_request'&&
  r.path?.split('@')[0]===FLOW&&
  r.head_sha===commit&&r.head_branch===branchAndArtifact(s).branch&&
  r.status==='completed'&&r.conclusion==='success'&&
  Number.isSafeInteger(r.id)&&r.id>10000);
 if(accepted.length!==1)
  return bodySafe('CHAT_NEW_DEV_INDEPENDENT_SOURCE_CI_PENDING',{
   original_work_id:s.original_work_id,
   candidate_commit_sha:commit,pr_url:e.pr_url});
 const run=accepted[0],jobs=await gh(token,
  '/actions/runs/'+run.id+'/jobs?per_page=100');
 const checked=jobs.data?.jobs?.filter(j=>
  j.name==='independent-new-chat-development-source'&&
  j.status==='completed'&&j.conclusion==='success'&&
  ['Checkout exact PR candidate with no persisted credentials',
   'Set up sandbox Node for parsing only',
   STEP,
   'Confirm no code execution or installation receipt from this candidate']
   .every(t=>j.steps?.some(step=>step.name===t&&step.conclusion==='success')));
 if(!jobs.ok||checked?.length!==1)
  return bodySafe('CHAT_NEW_DEV_INDEPENDENT_CI_JOB_STEPS_UNVERIFIED');
 const receipt=await rpc(db,secret,'reality_record_chat_new_development_ci_v1',{
  p_message_id:s.message_id,p_commit_sha:commit,p_run_id:run.id
 });
 if(receipt.status!=='CHAT_DEVELOPMENT_INDEPENDENT_SOURCE_SYNTAX_CI_VERIFIED'||
  receipt.original_work_id!==s.original_work_id||
  receipt.artifact_commit_sha!==commit||receipt.ci_run_id!==run.id||
  receipt.ci_scope!=='SYNTAX_AND_SOURCE_IDENTITY_ONLY'||
  receipt.feature_acceptance_verified!==false||
  receipt.installation_authorized!==false||
  receipt.production_changed!==false)
  fail('INDEPENDENT_CI_DURABLE_RECEIPT_MISMATCH');
 return bodySafe(receipt.status,{
  original_work_id:s.original_work_id,
  artifact_commit_sha:commit,
  ci_run_id:run.id,ci_scope:receipt.ci_scope,
  independent_ci_verified:true,feature_acceptance_verified:false
 });
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||req.headers.get('content-type')!=='application/json')
   return bodySafe('SIGNED_CHAT_BUILD_SERVICE_POST_ONLY',{},405);
  let body;try{body=await req.json()}catch{return bodySafe('SIGNED_CHAT_BUILD_REQUEST_INVALID',{},400)}
  if(!body||Object.keys(body).sort().join(',')!=='action,base_branch,base_sha'||
    body.action!=='stage_or_verify_chat_new_development'||
    !SHA.test(body.base_sha||'')||!BRANCH.test(body.base_branch||'')||
    body.base_branch.includes('..')||body.base_branch.includes('//')||
    body.base_branch.startsWith('reality/chat-development/')||
    body.base_branch.startsWith('reality/riley/'))
   return bodySafe('EXACT_SIGNED_CHAT_BASE_PREVIEW_REQUIRED',{},400);
  const secret=req.headers.get('apikey')||'';
  if(secret.length<24||req.headers.get('authorization')!=='Bearer '+secret)
   return bodySafe('SERVICE_ROLE_BOUNDARY_REQUIRED',{},403);
  const url=Deno.env.get('SUPABASE_URL')||'';
  let project;try{project=new URL(url)}catch{return bodySafe('PROJECT_SCOPE_UNVERIFIED',{},503)}
  if(project.protocol!=='https:'||
     !project.hostname.endsWith('.supabase.co')||project.pathname!=='/'||
     project.search||project.hash)
   return bodySafe('PROJECT_SCOPE_UNVERIFIED',{},503);
  const s=await rpc(project.origin,secret,
   'reality_read_next_chat_new_development_candidate_v2');
  if(s.status==='NO_CURRENT_CHAT_NEW_DEVELOPMENT_CANDIDATE')
   return bodySafe(s.status);
  if(!cleanScope(s))
   return bodySafe('NEW_CHAT_DEVELOPMENT_SIGNED_SOURCE_DRIFT');
  // Release drift forbids ALL staging/writes. Only an already recorded
  // CANDIDATE_STAGED original may independently reconcile past GitHub CI.
  if(s.phase!=='CANDIDATE_STAGED'&&
     (!SOURCE_STAGING_BRANCH.test(body.base_branch)||
      s.release_sha!==body.base_sha))
   return bodySafe('NEW_CHAT_DEVELOPMENT_SIGNED_SOURCE_DRIFT');
  const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
  if(token.length<24)
   return bodySafe('NEW_CHAT_DEVELOPMENT_PROVIDER_WRITER_UNAVAILABLE');
  if(s.phase==='CANDIDATE_STAGED')
   return await verifyCI(s,project.origin,secret,token);
  return await stage(s,project.origin,secret,token,body.base_branch);
 }catch(e){
  const code=String(e instanceof Error?e.message:'');
  return bodySafe(/^CHAT_NEW_DEVELOPMENT_PROVIDER_[A-Z0-9_]{4,90}$/.test(code)?
   code:'NEW_CHAT_DEVELOPMENT_PROVIDER_OR_RECONCILIATION_UNVERIFIED',{},503);
 }
});
