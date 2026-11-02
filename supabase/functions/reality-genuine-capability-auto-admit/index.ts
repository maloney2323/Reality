// Signed GitHub Actions discovery -> independent provider readback ->
// owner-authorized original Continuity append -> existing atomic genuine queue.
// Never grants installation, execution, model trust, or customer settlement.
// This endpoint is NOT authenticated by a user or a GitHub issue body.
// It verifies the GitHub-issued OIDC signature and immutable workflow identity.
const PROJECT='hvkfreoagbrphwghjajw';
const REPO='maloney2323/Reality';
const BRANCH='refs/heads/feature/reality-general-capability-engine-20261101';
const WORKFLOW='.github/workflows/reality-genuine-capability-auto-trigger-v1.yml';
const AUDIENCE='reality-genuine-capability-auto-admit-v1';
const REF=REPO+'/'+WORKFLOW+'@'+BRANCH;
const SHA40=/^[a-f0-9]{40}$/;
const SHA64=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const TEST=/^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/;
const MODULE=/^src\/reality-extensions\/[a-z0-9._-]+\.mjs$/;
const WORK=/^work:[a-f0-9]{32}$/;
const respond=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json','cache-control':'no-store',
 'x-content-type-options':'nosniff'}});
const deny=code=>{throw Error('AUTO_ADMIT_'+code)};
function decode64(s){
 if(!/^[A-Za-z0-9_-]{1,10000}$/.test(s))deny('BASE64URL_INVALID');
 const normalized=s.replace(/-/g,'+').replace(/_/g,'/');
 return Uint8Array.from(atob(normalized+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
}
function jsonPart(s){
 const v=JSON.parse(new TextDecoder().decode(decode64(s)));
 if(!v||Array.isArray(v)||typeof v!=='object')deny('TOKEN_PART_NOT_OBJECT');
 return v;
}
async function hash(bytes){
 const b=typeof bytes==='string'?new TextEncoder().encode(bytes):bytes;
 const output=new Uint8Array(await crypto.subtle.digest('SHA-256',b));
 return [...output].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function uuid(text){
 const bits=new Uint8Array(await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(text)));
 bits[6]=(bits[6]&15)|80;bits[8]=(bits[8]&63)|128;
 const s=[...bits.slice(0,16)].map(x=>x.toString(16).padStart(2,'0')).join('');
 return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+
  s.slice(16,20)+'-'+s.slice(20);
}
function stable(v){
 return v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(stable):
  Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
}
const digest=async v=>hash(JSON.stringify(stable(v)));
async function api(path){
 const r=await fetch('https://api.github.com/repos/'+REPO+path,{
  redirect:'error',cache:'no-store',headers:{
   accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-genuine-auto-admit-v1'}});
 if(r.status===404)return null;
 if(!r.ok)deny('GITHUB_READBACK_UNAVAILABLE');
 return r.json();
}
async function verify(jwt,commit){
 if(typeof jwt!=='string'||jwt.length<300||jwt.length>9000)
  deny('SIGNED_IDENTITY_INVALID');
 const p=jwt.split('.');
 if(p.length!==3)deny('JWT_FORMAT');
 const h=jsonPart(p[0]),c=jsonPart(p[1]),now=Math.floor(Date.now()/1000);
 if(h.alg!=='RS256'||typeof h.kid!=='string'||
  c.iss!=='https://token.actions.githubusercontent.com'||
  c.aud!==AUDIENCE||c.repository!==REPO||
  c.repository_owner!=='maloney2323'||
  String(c.repository_id)!=='1388852445'||
  c.workflow_ref!==REF||c.ref!==BRANCH||c.ref_type!=='branch'||
  c.event_name!=='push'||c.sha!==commit||!SHA40.test(commit)||
  !/^[1-9][0-9]{0,17}$/.test(String(c.run_id||''))||
  typeof c.exp!=='number'||typeof c.iat!=='number'||
  typeof c.nbf!=='number'||c.exp<now-30||c.nbf>now+30||
  c.iat>now+30||c.exp-c.iat>900)
  deny('EXACT_SIGNED_GITHUB_WORKFLOW_REQUIRED');
 const jwks=await fetch('https://token.actions.githubusercontent.com/.well-known/jwks',
  {redirect:'error',cache:'no-store'});
 if(!jwks.ok)deny('SIGNING_JWKS_UNAVAILABLE');
 const keys=(await jwks.json()).keys;
 const found=(Array.isArray(keys)?keys:[]).filter(k=>
  k.kid===h.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&
  (!k.use||k.use==='sig'));
 if(found.length!==1)deny('SIGNER_NOT_UNIQUE');
 const key=await crypto.subtle.importKey('jwk',found[0],
  {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const good=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,
  decode64(p[2]),new TextEncoder().encode(p[0]+'.'+p[1]));
 if(!good)deny('SIGNATURE_FAILED');
 const run=await api('/actions/runs/'+c.run_id);
 if(run?.id!==Number(c.run_id)||run.head_sha!==commit||
  run.event!=='push'||run.path!==WORKFLOW||
  run.head_branch!==BRANCH.slice('refs/heads/'.length)||
  run.head_repository?.full_name!==REPO)
  deny('GITHUB_WORKFLOW_PROVIDER_READBACK_MISMATCH');
 return run;
}
function credentials(){
 const url=Deno.env.get('SUPABASE_URL');
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(url!=='https://'+PROJECT+'.supabase.co'||!key||key.length<30)
  deny('ISOLATED_SERVICE_DATABASE_UNAVAILABLE');
 return {url,key};
}
async function database(path,{method='GET',body}={}){
 const {url,key}=credentials();
 const response=await fetch(url+'/rest/v1/'+path,{
  method,redirect:'error',cache:'no-store',
  headers:{apikey:key,authorization:'Bearer '+key,
   accept:'application/json','content-type':'application/json',
   ...(method==='POST'?{Prefer:'return=representation'}:{})},
  body:body===undefined?undefined:JSON.stringify(body)});
 const result=await response.json().catch(()=>null);
 if(!response.ok){
  const safeCode=String(result?.message||'').match(/GENUINE_AUTO_[A-Z_]{4,100}/)?.[0];
  if(safeCode)throw Error(safeCode);
  deny('DATABASE_'+response.status+'_UNAVAILABLE');
 }
 return result;
}
async function providerSource(path,sha){
 const found=await api('/contents/'+path+'?ref='+sha);
 if(!found||found.path!==path||found.encoding!=='base64'||
  typeof found.content!=='string')deny('PINNED_TEST_SOURCE_UNVERIFIED');
 const bytes=Uint8Array.from(atob(found.content.replace(/\s/g,'')),
  x=>x.charCodeAt(0));
 return bytes;
}
async function readChain(root,worldline){
 const byId=new Map(),children=new Set();
 for(let offset=0;offset<=4000;offset+=400){
  const page=await database('universe_events?'+
   new URLSearchParams({continuity_root_id:'eq.'+root,
    worldline_id:'eq.'+worldline,
    select:'event_id,parent_event_id,lineage_hash,entity_type,epistemic_status,payload',
    order:'created_at.asc,event_id.asc',limit:'400',offset:String(offset)}));
  if(!Array.isArray(page))deny('CHAIN_PAGE_UNVERIFIED');
  for(const row of page){
   if(!UUID.test(row.event_id)||!SHA64.test(row.lineage_hash)||
      byId.has(row.event_id))deny('CHAIN_EVENT_INVALID');
   byId.set(row.event_id,row);
   if(row.parent_event_id)children.add(row.parent_event_id);
  }
  if(page.length<400)break;
  if(offset===4000)deny('CHAIN_BOUND_EXHAUSTED');
 }
 if(!byId.size||[...children].some(id=>!byId.has(id)))
  deny('CHAIN_UNVERIFIED');
 const tips=[...byId.values()].filter(e=>!children.has(e.event_id));
 if(tips.length!==1)deny('CHAIN_NOT_LINEAR');
 return {tip:tips[0],events:[...byId.values()]};
}
async function verifyOriginal(original,signal,commit){
 const p=original?.payload||{};
 if(original.entity_type!=='reality_original_source_backed_repair_work'||
  original.epistemic_status!=='VERIFIED'||
  !UUID.test(original.event_id)||!UUID.test(p.owner_id)||
  !UUID.test(original.provenance?.conversation_id)||
  original.provenance?.principal_id!==p.owner_id||
  p.owner_authorized_investigation!==true||
  p.owner_authorized_installation!==false||
  p.original_job_completed!==false||p.production_changed!==false||
  !WORK.test(p.original_work_id)||!TEST.test(p.frozen_test_path)||
  !MODULE.test(p.source_path)||!SHA64.test(p.frozen_test_sha256)||
  !SHA40.test(p.original_source_sha)||
  p.frozen_test_path!==signal.test_path||
  p.source_path!==signal.candidate_module_path||
  p.frozen_test_sha256!==signal.frozen_sha256)
  deny('OWNER_SOURCE_SCOPE_NOT_MATCHED');
 const failed=await api('/actions/runs/'+p.original_provider_failed_run_id);
 if(failed?.id!==Number(p.original_provider_failed_run_id)||
  failed.head_sha!==p.original_source_sha||
  failed.head_repository?.full_name!==REPO||
  failed.status!=='completed'||failed.conclusion!=='failure')
  deny('HISTORICAL_FAILED_RUN_UNVERIFIED');
 const jobs=await api('/actions/runs/'+failed.id+'/jobs?per_page=100');
 if(!Array.isArray(jobs?.jobs)||!jobs.jobs.some(j=>
   j.id===Number(p.original_provider_failed_job_id)&&
   j.run_id===failed.id&&j.head_sha===failed.head_sha&&
   j.conclusion==='failure'&&j.steps?.some(s=>s.conclusion==='failure')))
  deny('FAILED_PROVIDER_JOB_UNVERIFIED');
 const [historic,current]=await Promise.all([
  providerSource(p.frozen_test_path,p.original_source_sha),
  providerSource(p.frozen_test_path,commit)]);
 if(await hash(historic)!==p.frozen_test_sha256||
    await hash(current)!==p.frozen_test_sha256)
  deny('FROZEN_SOURCE_SHA_DRIFT');
 if(await api('/contents/'+p.source_path+'?ref='+p.original_source_sha)!==null||
    await api('/contents/'+p.source_path+'?ref='+commit)!==null)
  deny('MISSING_CAPABILITY_ALREADY_EXISTS');
 return true;
}
async function appendGap(original,signal){
 const p=original.payload,root=original.continuity_root_id,
  worldline=original.worldline_id;
 const source_ref='https://github.com/'+REPO+'/actions/runs/'+
  p.original_provider_failed_run_id;
 const cap=p.source_path.split('/').at(-1).replace(/\.mjs$/,'');
 const observed={
  original_work_id:p.original_work_id,evidence_kind:'OBSERVED_FAILURE',
  blocker_class:'MISSING_INSTRUMENT',capability_id:cap,source_ref,
  verification_suite_ref:'github:frozen-regression:sha256:'+
   p.frozen_test_sha256,
  independently_verified:true,external_action_performed:false,
  provider_effect_may_have_occurred:false,no_automatic_retry:false,
 };
 const failureHash=await digest(observed);
 let chain=await readChain(root,worldline);
 const existing=chain.events.filter(e=>
  e.entity_type==='reality_genuine_capability_gap_v1'&&
  e.epistemic_status==='VERIFIED'&&
  e.payload?.owner_id===p.owner_id&&
  e.payload?.original_work_id===p.original_work_id&&
  e.payload?.provider_failure_hash===failureHash&&
  e.payload?.original_work_event_id===original.event_id&&
  e.payload?.installation_authorized===false&&
  e.payload?.original_job_completed===false);
 if(existing.length>1)deny('DUPLICATE_GENUINE_GAP');
 if(existing.length===1)return existing[0].event_id;
 const conv=original.provenance.conversation_id;
 const receipt='execution:github-provider-observation:'+
  p.original_provider_failed_run_id;
 const id=await uuid('genuine-capability-gap:'+p.owner_id+':'+
  conv+':'+p.original_work_id+':'+receipt+':'+failureHash);
 const payload={
  version:'reality_genuine_capability_gap_v1',
  owner_id:p.owner_id,conversation_id:conv,
  goal_id:p.original_goal_id,original_work_id:p.original_work_id,
  original_work_event_id:original.event_id,
  goal_transition_event_id:p.goal_transition_receipt_ref,
  source_ref,verification_suite_ref:observed.verification_suite_ref,
  capability_id:cap,provider_failure_hash:failureHash,
  original_execution_receipt:receipt,
  value_passport:{qualification_status:'EVIDENCE_ONLY_VALUE_NOT_MEASURED',
   verified_savings:false,original_work_id:p.original_work_id},
  evidence_kind:'OBSERVED_FAILURE',blocker_class:'MISSING_INSTRUMENT',
  independently_verified:true,external_action_performed:false,
  provider_effect_may_have_occurred:false,installation_authorized:false,
  original_job_completed:false,production_changed:false,
 };
 for(let attempt=0;attempt<3;attempt++){
  const tip=chain.tip,now=new Date().toISOString();
  const provenance={source:'reality-genuine-capability-auto-admit-v1',
   principal_id:p.owner_id,conversation_id:conv};
  const entityId=await uuid(p.original_work_id);
  const refs=[original.event_id];
  const line=await digest({
   spine_version:'reality-continuity-spine-v2.1',
   continuity_root_id:root,worldline_id:worldline,
   parent_event_id:tip.event_id,prior_lineage_hash:tip.lineage_hash,
   stage:'OBSERVATION',entity_id:entityId,evidence_refs:refs,
   transformation_receipt_id:null,effective_time:now,assertion_time:now,
   epistemic_status:'VERIFIED',payload,provenance,
  });
  const record={
   event_id:id,event_kind:'OBSERVATION',
   entity_type:'reality_genuine_capability_gap_v1',
   entity_id:entityId,continuity_root_id:root,worldline_id:worldline,
   parent_event_id:tip.event_id,effective_time:now,assertion_time:now,
   epistemic_status:'VERIFIED',payload,evidence_refs:refs,
   provenance:{...provenance,continuity_spine:{
    version:'reality-continuity-spine-v2.1',
    prior_lineage_hash:tip.lineage_hash,transformation_receipt_id:null,
    source_event_id:null,source_entity_id:null,
    source_continuity_root_id:null,source_worldline_id:null,
   }},
   content_hash:await digest(payload),lineage_hash:line,
  };
  try{
   const added=await database('rpc/reality_commit_auto_genuine_gap_v1',{
    method:'POST',body:{p_original_event_id:original.event_id,
     p_node:record}});
   if(added.gap_event_id!==id||
     added.original_work_id!==p.original_work_id)
    deny('PERSISTED_NODE_READBACK_MISMATCH');
   const confirm=await database('universe_events?'+
    new URLSearchParams({event_id:'eq.'+id,select:'event_id,lineage_hash,payload'}));
   if(!Array.isArray(confirm)||confirm.length!==1||
      confirm[0].lineage_hash!==line||
      JSON.stringify(stable(confirm[0].payload))!==JSON.stringify(stable(payload)))
    deny('POST_WRITE_LINEAGE_READBACK_FAILED');
   return id;
  }catch(error){
   if(String(error?.message||'')!=='GENUINE_AUTO_CHAIN_HEAD_MOVED'||
      attempt===2)throw error;
   chain=await readChain(root,worldline);
  }
 }
 deny('APPEND_EXHAUSTED');
}
async function admit(report){
 const all=await database('universe_events?'+new URLSearchParams({
  entity_type:'eq.reality_original_source_backed_repair_work',
  epistemic_status:'eq.VERIFIED',
  select:'*',order:'created_at.desc',limit:'200'}));
 if(!Array.isArray(all)||all.length===200)deny('ORIGINAL_SOURCE_DISCOVERY_COVERAGE_LIMIT');
 const queued=[],alreadyClaimed=[],skippedSettled=[];
 for(const signal of report.findings){
  if(signal.kind!=='UNVERIFIED_MISSING_CAPABILITY_CANDIDATE'||
     !TEST.test(signal.test_path)||!MODULE.test(signal.candidate_module_path)||
     !SHA64.test(signal.frozen_sha256)||
     signal.repository_sha!==report.repository_sha||
     signal.queued_in_governed_capability_queue!==false||
     signal.owner_approval_granted!==false||
     signal.installation_authorized!==false||
     signal.original_job_completed!==false)
   deny('CI_CANDIDATE_NOT_SOURCE_BOUND');
  const matching=all.filter(e=>
   e.payload?.frozen_test_path===signal.test_path&&
   e.payload?.source_path===signal.candidate_module_path&&
   e.payload?.frozen_test_sha256===signal.frozen_sha256);
  if(matching.length!==1)deny('UNIQUE_ORIGINAL_CUSTOMER_BINDING_REQUIRED');
  const original=matching[0];
  // A frozen test can remain red long after Reality independently settled
  // its ORIGINAL work on another authorized path. Never reopen or requeue it.
  const scoped=await readChain(original.continuity_root_id,
   original.worldline_id);
  const settled=scoped.events.some(e=>
   e.epistemic_status==='VERIFIED'&&
   e.payload?.original_work_id===original.payload.original_work_id&&
   (e.payload?.original_job_completed===true||
    e.payload?.constitutional_phase==='SETTLED'));
  if(settled){
   skippedSettled.push(original.payload.original_work_id);
   continue;
  }
  await verifyOriginal(original,signal,report.repository_sha);
  const gapId=await appendGap(original,signal);
  const receipt=await database('rpc/reality_enqueue_genuine_capability_gap_v1',{
   method:'POST',body:{p_gap_event_id:gapId}});
  if(receipt?.source_event_id!==gapId||
     receipt.original_work_id!==original.payload.original_work_id||
     !['PENDING_FROZEN_REPRODUCTION',
       'LEASED_FOR_INDEPENDENT_REPRODUCTION',
       'EVIDENCE_RECONCILIATION_REQUIRED',
       'FROZEN_REPRODUCED_AWAITING_CANDIDATE'].includes(receipt.phase)||
     receipt.installation_authorized!==false||
     receipt.original_job_completed!==false||
     receipt.new_customer_job_created!==false||
     !UUID.test(receipt.trigger_id))
   {
    // Emit only fixed diagnostic field names (no owner ids, tokens or body).
    const wrong=[
     receipt?.source_event_id!==gapId?'EVENT_ID':null,
     receipt?.original_work_id!==original.payload.original_work_id?'WORK_ID':null,
     !['PENDING_FROZEN_REPRODUCTION',
       'LEASED_FOR_INDEPENDENT_REPRODUCTION',
       'EVIDENCE_RECONCILIATION_REQUIRED',
       'FROZEN_REPRODUCED_AWAITING_CANDIDATE'].includes(receipt?.phase)?'PHASE':null,
     receipt?.installation_authorized!==false?'INSTALL_BOUNDARY':null,
     receipt?.original_job_completed!==false?'COMPLETION_BOUNDARY':null,
     receipt?.new_customer_job_created!==false?'NEW_JOB_BOUNDARY':null,
     !UUID.test(receipt?.trigger_id)?'TRIGGER':null,
    ].filter(Boolean);
    console.warn('REALITY_QUEUE_READBACK_RECONCILIATION',wrong.join(','));
    deny('ATOMIC_QUEUE_READBACK_MISMATCH');
   }
  // Repeated CI runs may observe a consumed one-time lease. Only newly
  // pending rows may reach the worker claim stage; never issue a second
  // claim for a leased, reconciled, or already-reproduced original job.
  const item={original_work_id:receipt.original_work_id,
   source_event_id:gapId,trigger_id:receipt.trigger_id,
   queue_phase:receipt.phase};
  if(receipt.phase==='PENDING_FROZEN_REPRODUCTION')queued.push(item);
  else alreadyClaimed.push(item);
 }
 return {queued,alreadyClaimed,skippedSettled};
}
// Only the signed exact CI workflow may claim a source-bound, red frozen test.
// The original owner and goal are resolved from private Continuity by service
// RPC, not from the GitHub request. The response is not an execution token.
async function claimFrozenOriginal(request:Record<string,unknown>,runId:number){
 const trigger=String(request.trigger_id||''),gap=String(request.source_event_id||'');
 const work=String(request.original_work_id||'');
 const frozenPath=String(request.frozen_test_path||'');
 const missing=String(request.candidate_module_path||'');
 const sha=String(request.frozen_test_sha256||'');
 if(!UUID.test(trigger)||!UUID.test(gap)||!WORK.test(work)||
    !TEST.test(frozenPath)||!MODULE.test(missing)||!SHA64.test(sha)||
    request.reproduced_failure!==true||
    request.exit_code===0||!Number.isInteger(request.exit_code)||
    !SHA64.test(String(request.output_sha256||''))||
    request.installation_authorized!==false||
    request.external_action_performed!==false)
  deny('SIGNED_RED_REPRODUCTION_FIELDS_INVALID');
 const scoped=await database('rpc/reality_read_genuine_capability_wake_v1',{
  method:'POST',body:{p_trigger_id:trigger,p_source_event_id:gap}});
 if(scoped?.original_work_id!==work||
   scoped?.phase!=='PENDING_FROZEN_REPRODUCTION'||
   scoped?.source_event_id!==gap||
   scoped?.owner_goal_current!==true||
   scoped?.source_readback_verified!==true||
   scoped?.installation_authorized!==false||
   scoped?.original_job_completed!==false)
  deny('CURRENT_GOVERNED_QUEUE_UNVERIFIED');
 const events=await database('universe_events?'+new URLSearchParams({
  event_id:'eq.'+gap,select:'event_id,payload,continuity_root_id,worldline_id'}));
 if(!Array.isArray(events)||events.length!==1||
   events[0].payload?.original_work_id!==work)
  deny('GAP_SOURCE_EVENT_UNVERIFIED');
 const sources=await database('universe_events?'+new URLSearchParams({
  event_id:'eq.'+events[0].payload.original_work_event_id,
  select:'event_id,entity_type,epistemic_status,payload'}));
 const source=sources?.[0];
 if(!Array.isArray(sources)||sources.length!==1||
    source?.entity_type!=='reality_original_source_backed_repair_work'||
    source?.epistemic_status!=='VERIFIED'||
    source?.payload?.original_work_id!==work||
    source.payload.frozen_test_path!==frozenPath||
    source.payload.source_path!==missing||
    source.payload.frozen_test_sha256!==sha||
    source.payload.original_job_completed!==false||
    source.payload.owner_authorized_investigation!==true||
    source.payload.owner_authorized_installation!==false)
  deny('FROZEN_ORIGINAL_SOURCE_CHANGED');
 const content=await providerSource(frozenPath,String(request.repository_sha));
 if(await hash(content)!==sha||
    await api('/contents/'+missing+'?ref='+request.repository_sha)!==null)
  deny('FROZEN_TEST_OR_CAPABILITY_CHANGED');
 const claimed=await database('rpc/reality_claim_genuine_capability_gap_v1',{
  method:'POST',body:{p_trigger_id:trigger,p_gap_event_id:gap}});
 if(claimed?.trigger_id!==trigger||
    claimed?.source_event_id!==gap||
    claimed?.original_work_id!==work||
    claimed?.phase!=='LEASED_FOR_INDEPENDENT_REPRODUCTION'||
    claimed?.installation_authorized!==false||
    claimed?.original_job_completed!==false||
    !UUID.test(claimed?.claim_id))
  deny('ATOMIC_CLAIM_NOT_VERIFIED');
 return {status:'ORIGINAL_FROZEN_FAILURE_CLAIMED',claim_id:claimed.claim_id,
  source_event_id:gap,trigger_id:trigger,original_work_id:work,
  original_work_event_id:source.event_id,
  original_goal_id:source.payload.original_goal_id,
  goal_transition_receipt_ref:source.payload.goal_transition_receipt_ref,
  owner_id:claimed.owner_id,conversation_id:claimed.conversation_id,
  capability_id:claimed.capability_id,frozen_test_path:frozenPath,
  frozen_test_sha256:sha,source_path:missing,
  repository_sha:request.repository_sha,
  independent_runner_ref:'github:actions:run:'+runId,
  model_generated:false,installation_authorized:false,
  original_job_completed:false,production_changed:false};
}

async function reconcileFrozenOriginal(proof:Record<string,unknown>,runId:number){
 const trigger=String(proof?.trigger_id||''),gap=String(proof?.gap_event_id||'');
 const work=String(proof?.original_work_id||'');
 const frozen=String(proof?.frozen_test_path||'');
 const missing=String(proof?.candidate_source_path||'');
 const frozenHash=String(proof?.frozen_sha256||'');
 const sha=String(proof?.runner_sha||'');
 if(!UUID.test(trigger)||!UUID.test(gap)||!WORK.test(work)||
  !TEST.test(frozen)||!MODULE.test(missing)||!SHA64.test(frozenHash)||
  !SHA40.test(sha)||!SHA64.test(String(proof?.output_sha256||''))||
  proof?.status!=='ORIGINAL_FROZEN_REPRODUCED_RED'||
  proof?.installer_authorized!==false||proof?.production_changed!==false||
  proof?.model_generated!==false||proof?.network_disabled!==true||
  !Number.isInteger(proof?.exit_code)||Number(proof.exit_code)<1)
  deny('FROZEN_REPROOF_UNTRUSTED');
 const q=await database('rpc/reality_read_genuine_worker_claim_v1',{
  method:'POST',body:{p_trigger_id:trigger,p_gap_event_id:gap}});
 if(q?.gap_event_id!==gap||q?.original_work_id!==work||
    !UUID.test(q?.claim_id)||
    !['LEASED_FOR_INDEPENDENT_REPRODUCTION',
      'FROZEN_REPRODUCED_AWAITING_CANDIDATE'].includes(q?.phase))
  deny('CLAIM_ORIGINAL_MISMATCH');
 const orig=await database('universe_events?'+new URLSearchParams({
  event_id:'eq.'+q.original_work_event_id,select:'event_id,payload'}));
 if(!Array.isArray(orig)||orig.length!==1||
  orig[0].payload?.frozen_test_path!==frozen||
  orig[0].payload?.frozen_test_sha256!==frozenHash||
  orig[0].payload?.source_path!==missing||
  orig[0].payload?.original_work_id!==work)
  deny('FROZEN_SOURCE_ORIGINAL_MISMATCH');
 if(await hash(await providerSource(frozen,sha))!==frozenHash||
    await api('/contents/'+missing+'?ref='+sha)!==null)
  deny('PINNED_SOURCE_OR_CAPABILITY_DRIFT');
 const receipt={
  trigger_id:trigger,claim_id:q.claim_id,gap_event_id:gap,
  original_work_id:work,frozen_test_path:frozen,
  frozen_sha256:frozenHash,candidate_source_path:missing,
  status:'ORIGINAL_FROZEN_REPRODUCED_RED',
  exit_code:String(proof.exit_code),
  output_sha256:String(proof.output_sha256),
  github_run_id:String(runId),runner_sha:sha,
  installer_authorized:false,production_changed:false,
  model_generated:false,network_disabled:true,
 };
 const result=await database('rpc/reality_reconcile_genuine_frozen_v1',{
  method:'POST',body:{p_trigger_id:trigger,p_gap_id:gap,p_receipt:receipt}});
 if(result?.phase!=='FROZEN_REPRODUCED_AWAITING_CANDIDATE'||
    result.original_work_id!==work||result.claim_id!==q.claim_id)
  deny('REPRODUCTION_DURABLE_READBACK_INVALID');
 return {status:'FROZEN_REPRODUCED_AWAITING_CANDIDATE',
  original_work_id:work,trigger_id:trigger,gap_event_id:gap,
  original_work_event_id:q.original_work_event_id,
  claim_id:q.claim_id,frozen_test_path:frozen,frozen_sha256:frozenHash,
  candidate_source_path:missing,repository_sha:sha,
  original_goal_id:orig[0].payload.original_goal_id,
  goal_transition_receipt_ref:orig[0].payload.goal_transition_receipt_ref,
  owner_id:q.owner_id,
  model_generated:false,installation_authorized:false,
  original_job_completed:false,production_changed:false};
}

async function prepareFrozenGeneration(input:Record<string,unknown>){
 const trigger=String(input.trigger_id||''),gapId=String(input.gap_event_id||'');
 const sha=String(input.repository_sha||'');
 if(!UUID.test(trigger)||!UUID.test(gapId)||!SHA40.test(sha))
  deny('GENERATION_PINNED_SCOPE_REQUIRED');
 const q=await database('rpc/reality_read_genuine_worker_claim_v1',{
  method:'POST',body:{p_trigger_id:trigger,p_gap_event_id:gapId}});
 if(q?.phase!=='FROZEN_REPRODUCED_AWAITING_CANDIDATE'||
    !UUID.test(q?.claim_id)||q.gap_event_id!==gapId)
  deny('DURABLE_FROZEN_REPRODUCTION_NOT_VERIFIED');
 const originals=await database('universe_events?'+new URLSearchParams({
  event_id:'eq.'+q.original_work_event_id,select:'*'}));
 const gaps=await database('universe_events?'+new URLSearchParams({
  event_id:'eq.'+gapId,select:'*'}));
 const o=originals?.[0],g=gaps?.[0],p=o?.payload;
 if(!Array.isArray(originals)||originals.length!==1||
    !Array.isArray(gaps)||gaps.length!==1||
    o.entity_type!=='reality_original_source_backed_repair_work'||
    o.epistemic_status!=='VERIFIED'||
    g.entity_type!=='reality_genuine_capability_gap_v1'||
    g.epistemic_status!=='VERIFIED'||
    p?.owner_id!==q.owner_id||
    p?.original_work_id!==q.original_work_id||
    p?.owner_authorized_investigation!==true||
    p?.owner_authorized_installation!==false||
    p?.original_job_completed!==false||
    g.payload?.installation_authorized!==false||
    g.payload?.original_job_completed!==false||
    g.payload?.independently_verified!==true||
    g.payload?.original_work_id!==q.original_work_id||
    g.payload?.original_work_event_id!==o.event_id||
    g.continuity_root_id!==o.continuity_root_id||
    g.worldline_id!==o.worldline_id||
    g.payload?.goal_transition_event_id!==p.goal_transition_receipt_ref||
    !TEST.test(p.frozen_test_path)||!MODULE.test(p.source_path)||
    !SHA64.test(p.frozen_test_sha256)||
    !SHA64.test(g.payload?.provider_failure_hash)||
    g.payload?.verification_suite_ref!==
     'github:frozen-regression:sha256:'+p.frozen_test_sha256)
  deny('ORIGINAL_OWNER_GAP_DRIFT');
 if(await hash(await providerSource(p.frozen_test_path,sha))!==
    p.frozen_test_sha256||
    await api('/contents/'+p.source_path+'?ref='+sha)!==null)
  deny('FROZEN_GENERATION_SOURCE_STALE');
 return {status:'VERIFIED_FROZEN_READY_FOR_MODEL',
  trigger_id:trigger,gap_event_id:gapId,claim_id:q.claim_id,
  original_work_id:q.original_work_id,
  owner_id:q.owner_id,goal_id:p.original_goal_id,
  goal_transition_receipt_ref:p.goal_transition_receipt_ref,
  continuity_root_id:o.continuity_root_id,
  worldline_id:o.worldline_id,
  confirmed_gap_evidence_hash:g.payload.provider_failure_hash,
  frozen_test_path:p.frozen_test_path,
  frozen_sha256:p.frozen_test_sha256,
  source_entrypoint:p.source_path,
  repository_sha:sha,installation_authorized:false,
  original_job_completed:false,production_changed:false};
}

async function qualifyVerifiedCandidate(proposal:Record<string,unknown>,
 proof:Record<string,unknown>,runId:number,sha:string){
 const ticket=proposal?.ticket as Record<string,unknown>;
 const candidate=proposal?.candidate as Record<string,unknown>;
 if(proposal?.source!=='REAL_OPENAI_MODEL_GENERATION'||
    proposal?.installation_authorized!==false||
    proposal?.original_job_completed!==false||
    !ticket||!candidate||!SHA64.test(String(ticket.ticket_hash||''))||
    !SHA64.test(String(candidate.artifact_sha256||''))||
    candidate.ticket_hash!==ticket.ticket_hash||
    candidate.original_work_id!==ticket.original_work_id||
    !Array.isArray(candidate.files)||candidate.files.length<2||
    candidate.files.length>16||
    candidate.installed!==false||candidate.authority_granted!==false||
    ticket.repository_base_sha!==sha||
    proof?.runner_git_sha!==sha||
    proof?.workflow_run_id!==String(runId)||
    proof?.original_work_id!==ticket.original_work_id||
    proof?.ticket_hash!==ticket.ticket_hash||
    proof?.artifact_sha256!==candidate.artifact_sha256||
    proof?.model_response_id!==candidate.model_response_id||
    proof?.frozen_suite_sha256!==ticket.frozen_regression_sha256||
    proof?.passed!==true||
    proof?.runner_isolation!=='DOCKER_NETWORK_NONE_READONLY_NO_SECRETS'||
    proof?.installation_authorized!==false||
    proof?.original_job_completed!==false||
    proof?.production_changed!==false)
  deny('MODEL_CANDIDATE_OR_SANDBOX_NOT_VERIFIED');
 const files=candidate.files as Array<Record<string,unknown>>;
 const names=new Set();
 for(const file of files){
  const path=String(file.path||''),content=file.content;
  if(!/^(?:src\/reality-extensions\/|test\/reality-extensions\/)[A-Za-z0-9._/-]{3,220}$/.test(path)||
   path.includes('..')||names.has(path)||
   typeof content!=='string'||content.length<1||content.length>70000)
    deny('GENERATED_FILES_OUTSIDE_SAFE_EXTENSION_ROOT');
  names.add(path);
 }
 const sorted=[...files].sort((a,b)=>
  String(a.path).localeCompare(String(b.path)));
 const computed=await hash(JSON.stringify(stable(sorted.map(f=>({
  path:f.path,content:f.content
 })))));
 if(computed!==candidate.artifact_sha256)
  deny('MODEL_PROPOSAL_BYTES_DIFFER_FROM_VERIFIED_HASH');
 const frozen=proof.frozen_result as Record<string,unknown>;
 const made=proof.candidate_result as Record<string,unknown>;
 if(!frozen||!made||
    frozen.exit_code!==0||made.exit_code!==0||
    !(Number(frozen.tests)>0&&Number(made.tests)>0)||
    frozen.pass!==frozen.tests||made.pass!==made.tests||
    frozen.fail!==0||made.fail!==0)
  deny('INDEPENDENT_ACCEPTANCE_COUNTS_NOT_ALL_GREEN');
 const jobs=await api('/actions/runs/'+runId+'/jobs?per_page=100');
 if(!Array.isArray(jobs?.jobs)||
    jobs.jobs.filter((j:Record<string,unknown>)=>
     j.name==='verify_missing_capability'&&j.status==='completed'&&
     j.conclusion==='success').length!==1)
  deny('PROVIDER_VERIFICATION_JOB_NOT_SUCCESSFUL');
 const matching=await database('universe_events?'+new URLSearchParams({
  entity_type:'eq.reality_genuine_capability_gap_v1',
  select:'event_id,payload',
  limit:'200'}));
 const gap=matching?.find((e:Record<string,unknown>)=>
  (e.payload as Record<string,unknown>)?.original_work_id===ticket.original_work_id &&
  (e.payload as Record<string,unknown>)?.provider_failure_hash===
    ticket.confirmed_gap_evidence_hash);
 if(!gap||!UUID.test(gap.event_id))deny('ORIGINAL_VERIFIED_GAP_NOT_FOUND');
 const q=await database('rpc/reality_read_genuine_worker_claim_v1',{
  method:'POST',body:{p_trigger_id:proof.trigger_id,
   p_gap_event_id:gap.event_id}});
 if(q?.original_work_id!==ticket.original_work_id||
    q?.phase!=='FROZEN_REPRODUCED_AWAITING_CANDIDATE'||
    q?.claim_id!==proof.claim_id)
  deny('EXACT_FROZEN_CLAIM_CHANGED');
 const record={
  original_work_id:ticket.original_work_id,
  ticket_hash:ticket.ticket_hash,
  artifact_sha256:candidate.artifact_sha256,
  model_response_id:candidate.model_response_id,
  files:sorted,
 };
 const receipt=await database('rpc/reality_qualify_genuine_candidate_v1',{
  method:'POST',body:{p_trigger_id:proof.trigger_id,
   p_gap_event_id:gap.event_id,p_candidate:record,p_proof:proof}});
 if(receipt?.status!=='AWAITING_OWNER_APPROVAL'||
   receipt.original_work_id!==ticket.original_work_id||
   receipt.artifact_sha256!==candidate.artifact_sha256||
   receipt.installation_authorized!==false||
   receipt.original_job_completed!==false)
  deny('DURABLE_QUALIFICATION_RECONCILIATION_REQUIRED');
 return receipt;
}
Deno.serve(async request=>{
 try{
  if(request.method!=='POST'||
    !/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))
   return respond({ok:false,error:'METHOD_OR_CONTENT_TYPE_REQUIRED'},405);
  const bearer=request.headers.get('authorization')?.match(
   /^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
  if(!bearer)return respond({ok:false,error:'SIGNED_GITHUB_OIDC_REQUIRED'},401);
  const raw=await request.text();
  if(raw.length>290000)deny('REQUEST_TOO_LARGE');
  const input=JSON.parse(raw);
  if(input?.action==='qualify'&&
    SHA40.test(input?.proof?.runner_git_sha||'')){
   if(Object.keys(input).sort().join(',')!=='action,proof,proposal')
    deny('QUALIFICATION_ENVELOPE_INVALID');
   const run=await verify(bearer,input.proof.runner_git_sha);
   const receipt=await qualifyVerifiedCandidate(
     input.proposal,input.proof,run.id,input.proof.runner_git_sha);
   return respond({ok:true,...receipt});
  }
  if(input?.action==='prepare'&&SHA40.test(input?.scope?.repository_sha||'')){
   if(Object.keys(input).sort().join(',')!=='action,scope')
    deny('GENERATION_SCOPE_FIELDS_INVALID');
   await verify(bearer,input.scope.repository_sha);
   return respond({ok:true,...await prepareFrozenGeneration(input.scope)});
  }
  if(input?.action==='reconcile'&&SHA40.test(input?.proof?.runner_sha||'')){
   if(Object.keys(input).sort().join(',')!=='action,proof')
    deny('RECONCILIATION_ENVELOPE_INVALID');
   const verifiedRun=await verify(bearer,input.proof.runner_sha);
   const receipt=await reconcileFrozenOriginal(input.proof,verifiedRun.id);
   return respond({ok:true,...receipt});
  }
  if(input?.action==='claim'&&input?.proof?.repository_sha&&
   SHA40.test(input.proof.repository_sha)){
   if(Object.keys(input).sort().join(',')!=='action,proof')
    deny('CLAIM_ENVELOPE_FIELDS_INVALID');
   const verifiedRun=await verify(bearer,input.proof.repository_sha);
   const receipt=await claimFrozenOriginal(input.proof,verifiedRun.id);
   return respond({ok:true,...receipt});
  }
  if(raw.length>9500)deny('STANDARD_REQUEST_TOO_LARGE');
  if(!input||Array.isArray(input)||typeof input!=='object'||
   Object.keys(input).sort().join(',')!=='action,report'||
   input.action!=='admit'||input.report?.schema!==
    'reality-genuine-auto-trigger-observation-v1'||
   input.report.source!=='GITHUB_CI_ACTUAL_FROZEN_TEST_EXIT'||
   !SHA40.test(input.report.repository_sha)||
   !Array.isArray(input.report.findings)||
   input.report.findings.length<1||input.report.findings.length>30||
   input.report.installation_authorized!==false||
   input.report.original_job_completed!==false)
   deny('EXACT_SIGNED_CI_OBSERVATION_REQUIRED');
  const run=await verify(bearer,input.report.repository_sha);
  const {queued,alreadyClaimed,skippedSettled}=await admit(input.report);
  if(queued.length+alreadyClaimed.length+skippedSettled.length!==
     input.report.findings.length)
   deny('DETECTION_DISPOSITION_INCOMPLETE');
  return respond({ok:true,
   status:'GENUINE_ORIGINAL_GAPS_RECONCILED',
   signed_github_run_id:run.id,
   observed_candidate_count:input.report.findings.length,
   verified_queue_count:queued.length,
   verified_already_claimed_count:alreadyClaimed.length,
   previously_claimed:alreadyClaimed,
   verified_already_settled_count:skippedSettled.length,
   verified_original_count:queued.length,queued,
   installation_authorized:false,original_job_completed:false,
   production_changed:false});
 }catch(error){
  const safe=String(error?.message||'');
  const code=/^AUTO_ADMIT_[A-Z0-9_]{3,120}$/.test(safe)?safe:
   /^GENUINE_AUTO_[A-Z0-9_]{3,120}$/.test(safe)?safe:
   'AUTO_ADMIT_UNVERIFIED_PROVIDER_OR_DATABASE';
  console.warn('REALITY_GENUINE_AUTO_ADMISSION_REFUSED',code);
  return respond({ok:false,error:code,installation_authorized:false,
   original_job_completed:false,production_changed:false},403);
 }
});
