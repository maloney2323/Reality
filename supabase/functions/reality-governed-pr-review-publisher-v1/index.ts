// Reality governed GitHub provider capability: ONE already owner-authorized
// Riley+Taylor PR review, bound to original work + unchanged GitHub PR head.
// Reality, not OpenAI or any virtual employee, holds provider credentials.
// No install/production write, no new shift/job, no model-granted authority.
// Legacy standalone worker token is deliberately NOT used here.
const PROJECT='hvkfreoagbrphwghjajw';
const REPO='maloney2323/Reality';
const ROOT='https://api.github.com/repos/'+REPO;
const ORIGINAL='work:94fc872f8ba9062f968920c59218c3ca';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const SOURCE='https://github.com/'+REPO+'/pull/57';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const RESULT={installation_authorized:false,original_job_completed:false,
 production_changed:false,new_shift_created:false,code_installed:false};
const fail=(code:string):never=>{throw Error('PR57_BROKER_'+code)};
const respond=(status:string,ok=false,code=200,extras:Record<string,unknown>={})=>
 new Response(JSON.stringify({ok,status,...RESULT,...extras}),{status:code,
  headers:{'content-type':'application/json','cache-control':'no-store',
   'x-content-type-options':'nosniff'}});
const digest=async(bytes:string)=>{
 const out=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bytes));
 return 'sha256:'+Array.from(new Uint8Array(out)).map(x=>x.toString(16).padStart(2,'0')).join('');
};
async function rpc(name:string,payload:Record<string,unknown>,key:string){
 if(!/^reality_(?:claim_authorized_riley_pr_review_v1|mark_authorized_riley_pr_publish_v1|settle_authorized_riley_pr_review_v1|rearm_authorized_riley_pr_publish_v1|rearm_authorized_riley_pr_post_403_v1|read_current_shift_execution_graph_v1|read_owner_native_reviewed_patch_v1|claim_native263_contents_canary_v1|record_native263_contents_canary_v1)$/.test(name))
  fail('RPC_OUT_OF_SCOPE');
 const r=await fetch('https://'+PROJECT+'.supabase.co/rest/v1/rpc/'+name,{
  method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000),
  headers:{apikey:key,authorization:'Bearer '+key,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(payload)});
 if(!r.ok)fail('OWNER_SHIFT_SERVICE_AUTH_OR_LEDGER_REJECTED');
 const data=await r.json().catch(()=>null);
 if(!data||typeof data!=='object'||Array.isArray(data))
  fail('DURABLE_PROVIDER_RECEIPT_INVALID');
 return data;
}
async function gh(path:string,token:string,method='GET',body:unknown=undefined){
 if(!/^\/(?:pulls\/57|issues\/57\/comments\?per_page=100&page=[1-5]|issues\/57\/comments|issues\/comments\/[1-9]\d*)$/.test(path))
  fail('GITHUB_RESOURCE_OUT_OF_SCOPE');
 if(!['GET','POST'].includes(method)||method==='POST'&&path!=='/issues/57/comments')
  fail('GITHUB_METHOD_OUT_OF_SCOPE');
 const r=await fetch(ROOT+path,{
  method,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000),
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'content-type':'application/json','x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Owner-Governed-PR57-Provider-v1'},
  body:body===undefined?undefined:JSON.stringify(body)});
 if(!r.ok){
  // A received HTTP rejection is not the same as a network timeout or
  // unknown effect. Preserve its safe category for future original jobs.
  // Never emit tokens, request body, GitHub response body or review text.
  if(method==='POST'){
   const rejected=[400,401,403,404,422,429].includes(r.status);
   if(rejected){
    console.warn('REALITY_PR57_POST_HTTP_REJECTED',r.status);
    fail('GITHUB_POST_HTTP_REJECTED_'+r.status);
   }
   console.warn('REALITY_PR57_POST_HTTP_UNCERTAIN',r.status);
   fail('GITHUB_POST_HTTP_UNCERTAIN_'+
    (Number.isInteger(r.status)?r.status:'UNKNOWN'));
  }
  fail(r.status===401||r.status===403?
   'GITHUB_BROKER_PERMISSION_OR_TOKEN_REJECTED':
   'GITHUB_PROVIDER_EFFECT_OR_READBACK_UNVERIFIED');
 }
 const data=await r.json().catch(()=>null);
 if(!data||typeof data!=='object')fail('GITHUB_PROVIDER_JSON_INVALID');
 return data;
}
async function findExisting(c:any,token:string){
 const marker='<!-- reality-riley-original:'+ORIGINAL+' -->';
 let found:any=null;
 const fingerprints:string[]=[];
 for(let page=1;page<=5;page++){
  const comments=await gh('/issues/57/comments?per_page=100&page='+page,token);
  if(!Array.isArray(comments)||comments.length>100)
   fail('GITHUB_COMMENT_COVERAGE_INVALID');
  for(const comment of comments){
   if(!Number.isSafeInteger(comment?.id)||comment.id<1||
      typeof comment.body!=='string'||
      comment.issue_url!==ROOT+'/issues/57')
    fail('GITHUB_COMMENT_PROVIDER_IDENTITY_UNVERIFIED');
   // Authenticated provider observations without exposing other comments.
   fingerprints.push(String(comment.id)+':'+await digest(comment.body));
   if(comment.body.includes(marker)){
    if(found!==null)fail('MULTIPLE_PROVIDER_EFFECTS_RECONCILIATION_REQUIRED');
    found=comment;
   }
  }
  if(comments.length<100){
   return {found,comment_count:fingerprints.length,
    comments_scan_sha256:await digest(JSON.stringify({
     original_work_id:ORIGINAL,source_ref:SOURCE,
     comment_fingerprints:fingerprints}))};
  }
 }
 fail('GITHUB_COMMENT_COVERAGE_INCOMPLETE');
}
async function verifyExactProvider(c:any,token:string){
 const p=await gh('/pulls/57',token);
 if(p?.number!==57||p?.html_url!==SOURCE||p?.state!=='open'||
    p?.draft===true||!SHA.test(p?.head?.sha||'')||
    p.head.sha!==c.source_head_sha||p.changed_files!==2)
  fail('PR57_HEAD_OR_APPROVED_SOURCE_DRIFT');
 return p;
}
function validateClaim(c:any){
 if(c?.status!=='EXACT_OWNER_AUTHORIZED_PR_REVIEW_CLAIMED'||
    c.shift_id!==SHIFT||c.original_work_id!==ORIGINAL||
    c.source_ref!==SOURCE||!UUID.test(c.owner_id||'')||
    !UUID.test(c.claim_id||'')||!HASH.test(c.source_proof_sha256||'')||
    !SHA.test(c.source_head_sha||'')||
    !['PREPARED','PUBLISHING'].includes(c.phase)||
    typeof c.review_body!=='string'||
    c.review_body.length<400||c.review_body.length>4100||
    !c.review_body.includes('<!-- reality-riley-original:'+ORIGINAL+' -->')||
    !HASH.test(c.review_digest||'')||
    c.installation_authorized!==false||c.production_changed!==false)
  fail('EXACT_PREPARED_OWNER_REVIEW_SCOPE_NOT_VERIFIED');
}
async function settle(c:any,observed:any,token:string,key:string){
 if(!Number.isSafeInteger(observed?.id)||observed.id<1)
  fail('GITHUB_PROVIDER_COMMENT_ID_UNVERIFIED');
 const proof=await gh('/issues/comments/'+observed.id,token);
 const url='https://github.com/'+REPO+'/pull/57#issuecomment-'+observed.id;
 const alt='https://github.com/'+REPO+'/issues/57#issuecomment-'+observed.id;
 if(proof.id!==observed.id||proof.issue_url!==ROOT+'/issues/57'||
    ![url,alt].includes(proof.html_url)||
    proof.body!==c.review_body||await digest(proof.body)!==c.review_digest)
  fail('INDEPENDENT_COMMENT_PROVIDER_IDENTITY_CHANGED');
 await verifyExactProvider(c,token);
 const receipt=await rpc('reality_settle_authorized_riley_pr_review_v1',{
  p_original_work_id:ORIGINAL,p_claim_id:c.claim_id,
  p_comment_id:proof.id,p_comment_url:proof.html_url,
  p_independent_body_sha256:c.review_digest,
  p_head_sha:c.source_head_sha},key);
 if(receipt.status!=='EXACT_PR_REVIEW_ORIGINAL_INDEPENDENTLY_SETTLED'||
   receipt.original_work_id!==ORIGINAL||
   receipt.original_job_completed!==true||
   receipt.independent_provider_readback_verified!==true||
   receipt.installation_authorized!==false||
   receipt.production_changed!==false||
   !/^supabase:riley_pr_review_originals_v1:[a-f0-9-]{36}$/.test(
     receipt.settlement_receipt_ref||''))
  fail('DURABLE_INDEPENDENT_ORIGINAL_SETTLEMENT_NOT_CONFIRMED');
 return respond('EXACT_GOVERNED_PR_REVIEW_PROVIDER_SETTLED',true,200,{
  original_work_id:ORIGINAL,shift_id:SHIFT,original_job_completed:true,
  independent_provider_readback_verified:true,
  provider_comment_url:proof.html_url,
  settlement_receipt_ref:receipt.settlement_receipt_ref
 });
}

// READ-ONLY native existing-code installation preflight. This proves source,
// tested candidate and exact preview target under the SAME signed shift; no
// executable GitHub write, deployment, owner approval or settlement is implied.
const NATIVE_ORIGINAL='work:873a6e74fd14c6beacc9042dd8021dfc';
const NATIVE_ISSUE='https://github.com/'+REPO+'/issues/263';
const NATIVE_PR='https://github.com/'+REPO+'/pull/268';
const NATIVE_PATH='src/reality-riley-service-original-runtime-v1.js';
const NATIVE_BRANCH='reality/isolated-openai-governance-gateway-20261108';
const NATIVE_TARGET_BLOB_SHA='aaf22a1f69a2c3e91e18641cf1ef40d16a563bc0';
const NATIVE_SOURCE_SHA='sha256:2969a5ea2c0ea27446be73c4840d762e669872b3e1a2351524d6a3cc8d9554b4';
const NATIVE_CANDIDATE_SHA='e44ee294f21c73803a2bcdb5a9cb487f0f80fc85';
const NATIVE_CANDIDATE_BYTES_SHA='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48';
async function nativeGithubRead(path:string,token:string){
 // Scope ALL paths before substituting any provenance supplied by a provider.
 if(![
  '/pulls/268','/git/ref/heads/'+NATIVE_BRANCH,
  '/contents/'+NATIVE_PATH+'?ref='+NATIVE_CANDIDATE_SHA,
  '/actions/runs/42525028367'
 ].includes(path)&&
 !(/^\/contents\/src\/reality-riley-service-original-runtime-v1\.js\?ref=[a-f0-9]{40}$/.test(path)))
  fail('NATIVE_PREVIEW_GITHUB_READ_RESOURCE_OUT_OF_SCOPE');
 const response=await fetch(ROOT+path,{
  method:'GET',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000),
  headers:{authorization:'Bearer '+token,
   accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Native263-Governed-ReadOnly-Install-Preflight'}
 });
 if(!response.ok)fail('NATIVE_PREVIEW_GITHUB_READBACK_UNAVAILABLE');
 const obj=await response.json().catch(()=>null);
 if(!obj||typeof obj!=='object'||Array.isArray(obj))
  fail('NATIVE_PREVIEW_GITHUB_OBJECT_INVALID');
 return obj;
}
function nativeDecodeBlob(blob:any){
 if(blob?.path!==NATIVE_PATH||blob.encoding!=='base64'||
  !SHA.test(blob.sha||'')||
  !Number.isInteger(blob.size)||blob.size<1||blob.size>40000||
  typeof blob.content!=='string')fail('NATIVE_GITHUB_FILE_METADATA_INVALID');
 const encoded=blob.content.replace(/\s/g,'');
 if(!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)||encoded.length>60000)
  fail('NATIVE_GITHUB_FILE_ENCODING_INVALID');
 let binary:string;try{binary=atob(encoded)}catch{
  fail('NATIVE_GITHUB_FILE_BASE64_INVALID');
 }
 const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
 if(bytes.length!==blob.size)fail('NATIVE_GITHUB_FILE_SIZE_CHANGED');
 return bytes;
}
async function nativeBlobSha(bytes:Uint8Array){
 const prefix=new TextEncoder().encode('blob '+bytes.length+'\0');
 const all=new Uint8Array(prefix.length+bytes.length);
 all.set(prefix);all.set(bytes,prefix.length);
 const out=await crypto.subtle.digest('SHA-1',all);
 return Array.from(new Uint8Array(out)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function nativeInstallPreflight(serviceKey:string){
 const graph=await rpc('reality_read_current_shift_execution_graph_v1',{},serviceKey);
 if(graph?.status!=='OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'||
    graph.shift_id!==SHIFT||graph.installation_authorized!==false||
    graph.production_changed!==false||
    graph.execution_scope_from_owner_warrant_only!==true||
    graph.completion_bound!==true||
    !UUID.test(graph.owner_id||'')||
    !Array.isArray(graph.jobs)||graph.jobs.length!==4)
   fail('NATIVE_FROZEN_OWNER_SHIFT_REQUIRED');
 const matching=graph.jobs.filter((j:any)=>j.original_work_id===NATIVE_ORIGINAL);
 if(matching.length!==1||
    matching[0].source_ref!==NATIVE_ISSUE||
    matching[0].phase!=='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'||
    matching[0].source_proof_sha256!==NATIVE_SOURCE_SHA||
    matching[0].independent_source_proof_verified!==true||
    matching[0].capability_installation_authorized!==false)
   fail('NATIVE_EXACT_ORIGINAL_NOT_READY_FOR_PREFLIGHT');
 const patch=await rpc('reality_read_owner_native_reviewed_patch_v1',{
  p_owner_id:graph.owner_id,p_shift_id:graph.shift_id},serviceKey);
 if(patch?.status!=='EXACT_NATIVE_ENGINEERING_PATCH_INDEPENDENTLY_TESTED_REVIEW_ONLY'||
    patch.owner_id!==graph.owner_id||patch.shift_id!==SHIFT||
    patch.original_work_id!==NATIVE_ORIGINAL||patch.source_ref!==NATIVE_ISSUE||
    patch.source_file_path!==NATIVE_PATH||
    patch.source_proof_sha256!==NATIVE_SOURCE_SHA||
    patch.candidate_commit_sha!==NATIVE_CANDIDATE_SHA||
    patch.candidate_artifact_sha256!==NATIVE_CANDIDATE_BYTES_SHA||
    patch.independent_passing_run_id!==42525028367||
    patch.provenance!=='CHATGPT_REVIEWED_ENGINEERING_PATCH_AFTER_REJECTED_MODEL_DRAFT'||
    patch.owner_approval_ready!==false||
    patch.native_install_to_settlement_accepted!==false||
    patch.installation_authorized!==false||
    patch.original_job_completed!==false||patch.production_changed!==false)
   fail('NATIVE_REVIEWED_CANDIDATE_DURABLE_EVIDENCE_MISMATCH');
 const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
 if(token.length<25)fail('NATIVE_GITHUB_SOURCE_READ_CREDENTIAL_MISSING');
 const [pr,branch,source,run]=await Promise.all([
  nativeGithubRead('/pulls/268',token),
  nativeGithubRead('/git/ref/heads/'+NATIVE_BRANCH,token),
  nativeGithubRead('/contents/'+NATIVE_PATH+'?ref='+NATIVE_CANDIDATE_SHA,token),
  nativeGithubRead('/actions/runs/42525028367',token)
 ]);
 if(pr.number!==268||pr.html_url!==NATIVE_PR||pr.state!=='open'||
    pr.head?.sha!==NATIVE_CANDIDATE_SHA||
    pr.base?.ref!==NATIVE_BRANCH||
    !SHA.test(branch?.object?.sha||'')||
    branch.ref!=='refs/heads/'+NATIVE_BRANCH||
    run.id!==42525028367||run.status!=='completed'||
    run.conclusion!=='success'||run.head_sha!==NATIVE_CANDIDATE_SHA)
   fail('NATIVE_SOURCE_PR_CI_OR_TARGET_BRANCH_CHANGED');
 const sourceBytes=nativeDecodeBlob(source);
 if(await nativeBlobSha(sourceBytes)!==source.sha||
    await digest(new TextDecoder('utf-8',{fatal:true}).decode(sourceBytes))!==NATIVE_CANDIDATE_BYTES_SHA)
   fail('NATIVE_FROZEN_CANDIDATE_SOURCE_BYTES_MISMATCH');
 const target=await nativeGithubRead(
  '/contents/'+NATIVE_PATH+'?ref='+branch.object.sha,token);
 const targetBytes=nativeDecodeBlob(target);
 if(target.sha!==NATIVE_TARGET_BLOB_SHA||
    await nativeBlobSha(targetBytes)!==target.sha||
    target.sha===source.sha)
   fail('NATIVE_PREVIEW_EXISTING_FILE_BASELINE_DRIFT');
 return respond('NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED',true,200,{
  source:'INDEPENDENT_REALITY_PROVIDER_AND_FROZEN_OWNER_LEDGER',
  original_work_id:NATIVE_ORIGINAL,shift_id:SHIFT,
  source_ref:NATIVE_ISSUE,preview_branch:NATIVE_BRANCH,
  preview_baseline_commit_sha:branch.object.sha,
  preview_existing_file_blob_sha:target.sha,
  candidate_commit_sha:NATIVE_CANDIDATE_SHA,
  candidate_file_blob_sha:source.sha,
  candidate_artifact_sha256:NATIVE_CANDIDATE_BYTES_SHA,
  independent_ci_run_id:42525028367,
  exact_existing_file_update_required:true,
  source_and_frozen_tests_verified:true,
  code_write_permission_verified:false,
  native_approval_bridge_verified:false,
  preview_deployment_automation_verified:false,
  post_install_same_original_settlement_verified:false,
  owner_approval_ready:false,
  next_governed_action:'VERIFY_OWNER_APPROVAL_AND_EXACT_NATIVE_EXISTING_FILE_INSTALL'
 });
}


// An inert, non-installing one-use GitHub Contents write canary.
// This is NOT the native repair installer. It tests only the exact existing
// Reality-broker token against a disposable canary branch and new evidence
// file. No owner approval is consumed, and the #263 file is never modified.
const CANARY_BRANCH='reality/isolated-install-transport-canary-20261112';
const CANARY_BASE='dd628609639e37f85c5151986d4f5eb691bddf03';
const CANARY_FILE='evidence/native263-broker-contents-write-canary-20261112.json';
const CANARY_BODY=JSON.stringify({
 kind:'REALITY_NATIVE263_BROKER_CONTENTS_TRANSPORT_PROBE_V1',
 original_work_id:NATIVE_ORIGINAL,branch:CANARY_BRANCH,
 source_path_modified:false,capability_installed:false,
 owner_installation_approval_consumed:false,
 original_job_completed:false,production_changed:false
})+'\n';
async function canaryGitHub(token:string,method:string,path:string,body?:unknown){
 const ref='/git/ref/heads/'+CANARY_BRANCH;
 const file='/contents/'+CANARY_FILE+'?ref='+encodeURIComponent(CANARY_BRANCH);
 const fileWrite='/contents/'+CANARY_FILE;
 if(!(
   method==='GET'&&(path===ref||path===file)||
   method==='PUT'&&path===fileWrite
 ))fail('CANARY_GITHUB_RESOURCE_OR_METHOD_OUT_OF_SCOPE');
 let result:Response;
 try{
  result=await fetch(ROOT+path,{method,cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(12000),
   headers:{authorization:'Bearer '+token,
    accept:'application/vnd.github+json',
    'content-type':'application/json',
    'x-github-api-version':'2022-11-28',
    'user-agent':'Reality-Native263-Inert-Contents-Canary'},
   body:body===undefined?undefined:JSON.stringify(body)});
 }catch{fail('CANARY_GITHUB_PROVIDER_NETWORK_EFFECT_UNVERIFIED')}
 if(method==='GET'&&result.status===404&&path===file)
  return {status:404,missing:true,data:null};
 let data:any=null;try{data=await result.json()}catch{/*not used for rejected response*/}
 if(!result.ok&&method==='GET')fail('CANARY_GITHUB_READ_UNVERIFIED');
 return {status:result.status,missing:false,data};
}
async function native263ContentsCanary(key:string){
 // First independently verify Reality's frozen original/PR268/baseline.
 const source=await nativeInstallPreflight(key);
 const sourceProof=await source.json().catch(()=>null);
 if(!source.ok||sourceProof?.status!==
    'NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED'||
    sourceProof.owner_approval_ready!==false||
    sourceProof.installation_authorized!==false)
  return respond('NATIVE263_CONTENTS_CANARY_SOURCE_PREFLIGHT_BLOCKED',false,409);
 // Durable service-role CLAIM prevents a second write even if the first
 // PUT times out or the edge function crashes. No client-selected scope.
 const claim=await rpc('reality_claim_native263_contents_canary_v1',{},key);
 if(claim?.status!=='ONE_INERT_CANARY_WRITE_PROBE_CLAIMED'){
  if(claim?.status!=='ALREADY_CLAIMED_OR_RECORDED_NEVER_REPOST'||
    claim.original_work_id!==NATIVE_ORIGINAL||claim.shift_id!==SHIFT)
   fail('CANARY_DURABLE_CLAIM_READBACK_INVALID');
  return respond(claim.result_status==='WRITE_READBACK_VERIFIED'?
   'NATIVE263_CONTENTS_WRITE_TRANSPORT_VERIFIED':
   claim.result_status==='GITHUB_HTTP_403_FORBIDDEN'?
    'NATIVE263_GITHUB_CONTENTS_WRITE_HTTP_403':
    'NATIVE263_CONTENTS_CANARY_ALREADY_FENCED_NO_REPLAY',true,200,{
     shift_id:SHIFT,original_work_id:NATIVE_ORIGINAL,
     canary_state:claim.state,provider_http_status:claim.github_http_status,
     provider_commit_sha:claim.provider_commit_sha,
     canary_write_verified:claim.result_status==='WRITE_READBACK_VERIFIED',
     source_code_installed:false,code_write_permission_verification_only:true
    });
 }
 if(claim.original_work_id!==NATIVE_ORIGINAL||claim.shift_id!==SHIFT||
    claim.installation_authorized!==false||claim.production_changed!==false||
    claim.original_job_completed!==false)
  fail('CANARY_DURABLE_OWNER_SCOPE_MISMATCH');
 async function finish(result_status:string,http_status:number|null=null,
  commit_sha:string|null=null,blob_sha:string|null=null){
  const ledger=await rpc('reality_record_native263_contents_canary_v1',{
   p_result_status:result_status,p_http_status:http_status,
   p_commit_sha:commit_sha,p_blob_sha:blob_sha},key);
  if(ledger.status!=='NATIVE263_INERT_PROVIDER_WRITE_RESULT_RECORDED'||
     ledger.original_work_id!==NATIVE_ORIGINAL||ledger.shift_id!==SHIFT||
     ledger.result_status!==result_status||
     ledger.installation_authorized!==false||
     ledger.production_changed!==false||ledger.original_job_completed!==false)
   fail('CANARY_FINAL_PROVIDER_LEDGER_READBACK_MISMATCH');
  return respond(result_status==='WRITE_READBACK_VERIFIED'?
   'NATIVE263_CONTENTS_WRITE_TRANSPORT_VERIFIED':
   result_status==='GITHUB_HTTP_403_FORBIDDEN'?
    'NATIVE263_GITHUB_CONTENTS_WRITE_HTTP_403':
    result_status==='GITHUB_HTTP_401_UNAUTHORIZED'?
     'NATIVE263_GITHUB_CONTENTS_WRITE_HTTP_401':
     'NATIVE263_CONTENTS_WRITE_PROBE_BLOCKED_NO_REPLAY',true,200,{
    shift_id:SHIFT,original_work_id:NATIVE_ORIGINAL,
    canary_state:ledger.state,provider_http_status:ledger.github_http_status,
    provider_commit_sha:ledger.provider_commit_sha,
    canary_write_verified:result_status==='WRITE_READBACK_VERIFIED',
    source_code_installed:false,code_write_permission_verification_only:true
   });
 }
 const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
 if(token.length<25)return await finish('BROKER_CREDENTIAL_MISSING');
 let ref,absence;
 try{
  ref=await canaryGitHub(token,'GET','/git/ref/heads/'+CANARY_BRANCH);
  absence=await canaryGitHub(token,'GET','/contents/'+CANARY_FILE+
   '?ref='+encodeURIComponent(CANARY_BRANCH));
 }catch{return await finish('GITHUB_READ_UNVERIFIED')}
 if(ref?.data?.ref!=='refs/heads/'+CANARY_BRANCH||
    ref?.data?.object?.sha!==CANARY_BASE)
  return await finish('PRECONDITION_SOURCE_DRIFT');
 if(absence?.status!==404||absence?.missing!==true)
  return await finish('CANARY_PREEXISTING_UNATTRIBUTED');
 // Validate branch head again before the single create-only PUT.
 let justBefore;
 try{justBefore=await canaryGitHub(token,'GET','/git/ref/heads/'+CANARY_BRANCH)}
 catch{return await finish('GITHUB_READ_UNVERIFIED')}
 if(justBefore?.data?.object?.sha!==CANARY_BASE)
  return await finish('PRECONDITION_SOURCE_DRIFT');
 let result;
 try{
  result=await canaryGitHub(token,'PUT','/contents/'+CANARY_FILE,{
   message:'test: Reality broker one-time inert GitHub Contents-write canary',
   branch:CANARY_BRANCH,content:btoa(CANARY_BODY)
  });
 }catch{
  // Unknown provider effect is permanently fenced; no repeated PUT.
  return await finish('PROVIDER_EFFECT_UNVERIFIED');
 }
 if(result.status!==201){
  if(result.status===403)return await finish('GITHUB_HTTP_403_FORBIDDEN',403);
  if(result.status===401)return await finish('GITHUB_HTTP_401_UNAUTHORIZED',401);
  if(result.status===409)return await finish('GITHUB_HTTP_409_CONFLICT',409);
  return await finish('GITHUB_HTTP_OTHER_REJECTED',result.status);
 }
 const commit=result.data?.commit?.sha;
 const blob=result.data?.content?.sha;
 if(!SHA.test(commit||'')||!SHA.test(blob||''))
  return await finish('PROVIDER_EFFECT_UNVERIFIED');
 let readback,nowRef;
 try{
  [readback,nowRef]=await Promise.all([
   canaryGitHub(token,'GET','/contents/'+CANARY_FILE+'?ref='+
    encodeURIComponent(CANARY_BRANCH)),
   canaryGitHub(token,'GET','/git/ref/heads/'+CANARY_BRANCH)
  ]);
 }catch{return await finish('PROVIDER_EFFECT_UNVERIFIED')}
 const actual=readback?.data;
 if(readback.status!==200||actual?.path!==CANARY_FILE||
    actual?.sha!==blob||actual?.encoding!=='base64'||
    nowRef?.data?.object?.sha!==commit||
    typeof actual.content!=='string')
  return await finish('PROVIDER_EFFECT_UNVERIFIED');
 let decoded;try{decoded=atob(actual.content.replace(/\s/g,''))}
 catch{return await finish('PROVIDER_EFFECT_UNVERIFIED')}
 if(decoded!==CANARY_BODY||
    await nativeBlobSha(new TextEncoder().encode(CANARY_BODY))!==blob)
  return await finish('PROVIDER_EFFECT_UNVERIFIED');
 return await finish('WRITE_READBACK_VERIFIED',201,commit,blob);
}

Deno.serve(async req=>{
 try{
  if(req.method!=='POST')return respond('SERVICE_POST_REQUIRED',false,405);
  if(req.headers.get('content-type')!=='application/json')
   return respond('SERVICE_JSON_REQUIRED',false,415);
  const raw=await req.text();
  if(raw!=='{"version":1}'&&raw!=='{"version":2,"action":"native_263_install_preflight"}'&&
     raw!=='{"version":3,"action":"native_263_contents_canary"}')
   return respond('EXACT_VERSION_ONLY_REQUEST_REQUIRED',false,400);
  // Bearer is existing Reality service's Supabase credential. It is tested
  // *against the service-role-only DB claim* before ANY GitHub operation.
  // No browser or anonymous token can pass the DB role gate.
  const key=req.headers.get('apikey')||'';
  if(key.length<25||req.headers.get('authorization')!=='Bearer '+key)
   return respond('REALITY_SERVICE_CREDENTIAL_REQUIRED',false,403);
  if(raw==='{"version":2,"action":"native_263_install_preflight"}')
   return await nativeInstallPreflight(key);
  if(raw==='{"version":3,"action":"native_263_contents_canary"}')
   return await native263ContentsCanary(key);
  const c=await rpc('reality_claim_authorized_riley_pr_review_v1',{},key);
  if(c?.status==='EXACT_PR_REVIEW_ORIGINAL_INDEPENDENTLY_SETTLED')
   return respond('EXISTING_ORIGINAL_SETTLED_NO_PROVIDER_REPLAY',true,200);
  if(c?.status!=='EXACT_OWNER_AUTHORIZED_PR_REVIEW_CLAIMED')
   return respond('NO_EXACT_AUTHORIZED_PREPARED_REVIEW',true,200);
  validateClaim(c);
  if(await digest(c.review_body)!==c.review_digest)
   fail('PERSISTED_MODEL_REVIEW_CHECKSUM_MISMATCH');
  // A scoped GitHub secret is held by the Reality broker, never the model.
  const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
  if(token.length<25)return respond('BROKER_GITHUB_WRITER_NOT_CONFIGURED',true,200,{
   original_work_id:ORIGINAL,shift_id:SHIFT,credentials_present:false
  });
  await verifyExactProvider(c,token);
  const initial=await findExisting(c,token);
  if(initial.found!==null){
   if(c.phase!=='PUBLISHING')
    // Existing matching effect discovered before a new publish intent:
    // stop; never attribute a foreign or uncertain effect to this job.
    return respond('PREEXISTING_PROVIDER_EFFECT_REQUIRES_RECONCILIATION',false,409);
   return settle(c,initial.found,token,key);
  }
  if(c.phase==='PUBLISHING'){
   // A stale, uncertain prior POST may be recovered ONCE, but only after
   // complete authenticated GitHub readback, unchanged frozen bytes/head,
   // a 20-minute holdoff, and an atomic service-only Reality ledger fence.
   const witness={
    p_original_work_id:ORIGINAL,p_claim_id:c.claim_id,
    p_head_sha:c.source_head_sha,p_review_digest:c.review_digest,
    p_provider_comment_scan_sha256:initial.comments_scan_sha256,
    p_provider_comment_count:initial.comment_count
   };
   let reset=await rpc('reality_rearm_authorized_riley_pr_publish_v1',
    witness,key);
   let permissionRecovery=false;
   if(reset?.status==='PR_REVIEW_RECOVERY_NOT_ARMABLE_PRESERVE_FENCE'){
    // The original single recovery was already consumed. A SECOND
    // bounded chance is only possible if Reality's durable wake readback
    // explicitly proves a definite GitHub HTTP 403 on that SAME original.
    // The service-role DB rechecks that evidence, shift, claim, exact
    // frozen bytes and provider scan before an atomic one-time re-arm.
    reset=await rpc('reality_rearm_authorized_riley_pr_post_403_v1',
     witness,key);
    permissionRecovery=true;
   }
   if(![
    'EXACT_PR_REVIEW_ONE_RECOVERY_ARMED',
    'EXACT_PR57_ONE_PERMISSION_REMEDIATION_ARMED'
   ].includes(reset?.status||''))
    return respond(reset?.status==='PR_REVIEW_RECOVERY_HOLDOFF_ACTIVE_NO_REPLAY'?
     'PR_REVIEW_RECOVERY_HOLDOFF_ACTIVE_NO_REPLAY':
     reset?.status==='PR57_POST403_REMEDIATION_HOLDOFF_NO_REPLAY'?
      'PR57_POST403_REMEDIATION_HOLDOFF_NO_REPLAY':
      'PUBLISHING_WITH_UNKNOWN_EFFECT_READBACK_ONLY',true,200);
   if(reset.original_work_id!==ORIGINAL||reset.claim_id!==c.claim_id||
      reset.shift_id!==SHIFT||reset.review_digest!==c.review_digest||
      reset.source_head_sha!==c.source_head_sha||
      reset.comment_scan_sha256!==initial.comments_scan_sha256||
      reset.original_job_completed!==false||
      reset.installation_authorized!==false||reset.production_changed!==false)
    fail('RECOVERY_FENCE_READBACK_UNVERIFIED');
   if(permissionRecovery?
     reset.status!=='EXACT_PR57_ONE_PERMISSION_REMEDIATION_ARMED'||
      reset.publish_permission_remediation_count!==1:
     reset.status!=='EXACT_PR_REVIEW_ONE_RECOVERY_ARMED'||
      reset.publish_recovery_count!==1)
    fail('RECOVERY_MODE_OR_ONE_USE_COUNTER_CHANGED');
   c.phase='PREPARED'; // same claim, original and frozen model bytes
  }
  // A second provider GET closes the gap between recovery re-arm and effect.
  const justBeforeIntent=await findExisting(c,token);
  if(justBeforeIntent.found!==null){
   // A late prior effect appeared: preserve it; NEVER submit new POST.
   const reconciled=await rpc('reality_mark_authorized_riley_pr_publish_v1',{
    p_original_work_id:ORIGINAL,p_claim_id:c.claim_id
   },key);
   if(reconciled.status!=='PR_REVIEW_PUBLISH_INTENT_DURABLY_RECORDED'||
      reconciled.review_digest!==c.review_digest)
    fail('LATE_PROVIDER_EFFECT_RECOVERY_FENCE_UNVERIFIED');
   return settle(c,justBeforeIntent.found,token,key);
  }
  // One database transition PREPARED -> PUBLISHING before the sole POST.
  const marked=await rpc('reality_mark_authorized_riley_pr_publish_v1',{
   p_original_work_id:ORIGINAL,p_claim_id:c.claim_id},key);
  if(marked.status!=='PR_REVIEW_PUBLISH_INTENT_DURABLY_RECORDED'||
     marked.original_work_id!==ORIGINAL||
     marked.review_digest!==c.review_digest||
     marked.installation_authorized!==false||
     marked.original_job_completed!==false||
     marked.production_changed!==false)
   fail('ONE_TIME_PROVIDER_WRITE_FENCE_NOT_RECORDED');
  await verifyExactProvider(c,token);
  // Final independent GET before POST: a delayed prior provider effect
  // must be reconciled, not duplicated.
  const finalScan=await findExisting(c,token);
  if(finalScan.found!==null)return settle(c,finalScan.found,token,key);
  // One finite recovery attempt, never repeated after a new uncertain POST.
  let created;
  try{created=await gh('/issues/57/comments',token,'POST',{body:c.review_body})}
  catch(e){
   const raw=e instanceof Error?e.message:'UNKNOWN';
   const definite=/^PR57_BROKER_GITHUB_POST_HTTP_REJECTED_(?:400|401|403|404|422|429)$/.exec(raw);
   if(definite){
    // The POST returned an explicit rejection; there is no published
    // effect claimed. Keep the durable fence until a separate verified
    // recovery protocol authorizes any retry. Never retry here.
    return respond('GITHUB_POST_DEFINITIVELY_REJECTED_HTTP_'+
     raw.slice(-3)+'_FENCE_PRESERVED',false,424,{
      original_work_id:ORIGINAL,shift_id:SHIFT
     });
   }
   return respond('POST_UNCERTAIN_RECONCILE_BY_READBACK_ONLY',false,503);
  }
  return await settle(c,created,token,key);
 }catch(e){
  const raw=e instanceof Error?e.message:'UNKNOWN';
  const status=/^PR57_BROKER_[A-Z0-9_]{4,110}$/.test(raw)?
    raw.slice('PR57_BROKER_'.length):'PROVIDER_OR_SCOPE_UNVERIFIED';
  // Never leak broker secrets, prepared review body, or provider response.
  return respond(status,false,503);
 }
});
