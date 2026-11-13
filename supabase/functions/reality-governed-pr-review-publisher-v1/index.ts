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
 if(!/^reality_(?:claim_authorized_riley_pr_review_v1|mark_authorized_riley_pr_publish_v1|settle_authorized_riley_pr_review_v1)$/.test(name))
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
 for(let page=1;page<=5;page++){
  const comments=await gh('/issues/57/comments?per_page=100&page='+page,token);
  if(!Array.isArray(comments)||comments.length>100)
   fail('GITHUB_COMMENT_COVERAGE_INVALID');
  for(const comment of comments){
   if(typeof comment?.body==='string'&&comment.body.includes(marker)){
    if(found!==null)fail('MULTIPLE_PROVIDER_EFFECTS_RECONCILIATION_REQUIRED');
    found=comment;
   }
  }
  if(comments.length<100)return found;
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
Deno.serve(async req=>{
 try{
  if(req.method!=='POST')return respond('SERVICE_POST_REQUIRED',false,405);
  if(req.headers.get('content-type')!=='application/json')
   return respond('SERVICE_JSON_REQUIRED',false,415);
  const raw=await req.text();
  if(raw!=='{"version":1}')return respond('EXACT_VERSION_ONLY_REQUEST_REQUIRED',false,400);
  // Bearer is existing Reality service's Supabase credential. It is tested
  // *against the service-role-only DB claim* before ANY GitHub operation.
  // No browser or anonymous token can pass the DB role gate.
  const key=req.headers.get('apikey')||'';
  if(key.length<25||req.headers.get('authorization')!=='Bearer '+key)
   return respond('REALITY_SERVICE_CREDENTIAL_REQUIRED',false,403);
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
  const prior=await findExisting(c,token);
  if(prior!==null){
   if(c.phase!=='PUBLISHING')
    // Existing matching effect discovered before new publish intent:
    // stop; never attribute a foreign or uncertain effect to this job.
    return respond('PREEXISTING_PROVIDER_EFFECT_REQUIRES_RECONCILIATION',false,409);
   return settle(c,prior,token,key);
  }
  if(c.phase==='PUBLISHING')
   return respond('PUBLISHING_WITH_UNKNOWN_EFFECT_READBACK_ONLY',true,200);
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
  // No retry after uncertain provider effects. Subsequent runs only GET.
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
