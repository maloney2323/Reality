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
async function api(path,githubToken?:string|null){
 const r=await fetch('https://api.github.com/repos/'+REPO+path,{
  redirect:'error',cache:'no-store',headers:{
   accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-genuine-auto-admit-v1',
   ...(githubToken?{authorization:'Bearer '+githubToken}:{})}});
 if(r.status===404)return null;
 if(!r.ok)deny('GITHUB_READBACK_UNAVAILABLE');
 return r.json();
}
async function verify(jwt,commit,githubToken?:string|null){
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
 const run=await api('/actions/runs/'+c.run_id,githubToken);
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
  console.warn('REALITY_QUALIFICATION_DATABASE_ERROR_CLASS',
   String(result?.code||'UNKNOWN').slice(0,24),
   String(path).split('?')[0].slice(0,100));
  const safeCode=String(result?.message||'').match(/(?:GENUINE_AUTO|QUALIFICATION)_[A-Z0-9_]{4,100}/)?.[0];
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
 const queued=[],alreadyClaimed=[],skippedSettled=[],unbound=[];
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
  if(matching.length===0){
   // An absent owner-bound work event is NOT an execution/installation warrant.
   // Preserve the source-backed discovery for authenticated owner adoption.
   const pinned=await providerSource(signal.test_path,report.repository_sha);
   if(await hash(pinned)!==signal.frozen_sha256)
    deny('UNBOUND_FROZEN_BYTES_UNVERIFIED');
   const missing=await api('/contents/'+signal.candidate_module_path+
     '?ref='+report.repository_sha);
   if(missing!==null)deny('UNBOUND_MODULE_NOT_MISSING');
   const record=await database('rpc/reality_record_genuine_unbound_discovery_v1',{
    method:'POST',body:{
     p_test_path:signal.test_path,
     p_missing_module_path:signal.candidate_module_path,
     p_frozen_sha256:signal.frozen_sha256,
     p_repository_sha:report.repository_sha
    }});
   if(record?.status!=='AWAITING_OWNER_WORK_BINDING'||
      record.frozen_sha256!==signal.frozen_sha256||
      record.frozen_test_path!==signal.test_path||
      record.missing_module_path!==signal.candidate_module_path||
      record.owner_authorized!==false||
      record.installation_authorized!==false||
      record.original_job_completed!==false||
      record.production_changed!==false)
    deny('UNBOUND_DISCOVERY_DURABLE_READBACK_FAILED');
   unbound.push(record);
   continue;
  }
  if(matching.length>1)deny('UNIQUE_ORIGINAL_CUSTOMER_BINDING_REQUIRED');
  const original=matching[0];
  // A successfully settled isolated customer job is authoritative durable state,
  // even while its historical frozen test remains red on the base branch.
  const last=await database('rpc/reality_read_genuine_original_scope_v2',{
   method:'POST',body:{}});
  if(last?.original_work_id===original.payload.original_work_id&&
     last?.phase==='SETTLED_ISOLATED'&&
     last?.continuation_state==='SETTLED_ISOLATED'){
   skippedSettled.push(original.payload.original_work_id);
   continue;
  }
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
       'FROZEN_REPRODUCED_AWAITING_CANDIDATE',
       'AWAITING_OWNER_APPROVAL'].includes(receipt.phase)||
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
       'FROZEN_REPRODUCED_AWAITING_CANDIDATE',
       'AWAITING_OWNER_APPROVAL'].includes(receipt?.phase)?'PHASE':null,
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
 return {queued,alreadyClaimed,skippedSettled,unbound};
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

async function prepareExactlyApprovedPreviewInstall(runSha:string,runId:number,githubToken:string){
 const item=await database('rpc/reality_read_approved_genuine_preview_v1',{
  method:'POST',body:{}});
 if(item?.status==='NO_APPROVED_WORK')return {
  status:'NO_APPROVED_WORK',installation_verified:false,
  original_job_completed:false,production_changed:false};
 const q=item?.candidate,approval=item?.approval,receipt=item?.qualification;
 if(item?.status!=='OWNER_APPROVED_CAPABILITY_FOUND'||
    item.phase!=='AWAITING_OWNER_APPROVAL'||
    item.target_environment!=='ISOLATED_PREVIEW'||
    item.production_changed!==false||
    !UUID.test(item.trigger_id)||!UUID.test(item.gap_event_id)||
    !UUID.test(item.approval_id)||!UUID.test(item.owner_id)||
    !WORK.test(item.original_work_id)||
    !SHA64.test(item.artifact_sha256)||
    !q||!Array.isArray(q.files)||
    q.files.length<2||q.files.length>12||
    q.original_work_id!==item.original_work_id||
    q.artifact_sha256!==item.artifact_sha256||
    approval?.approval_origin!=='AUTHENTICATED_OWNER_EXPLICIT_ACTION'||
    approval?.approval_id!==item.approval_id||
    approval?.artifact_sha256!==item.artifact_sha256||
    approval?.source_installation_completed!==false||
    approval?.original_job_completed!==false||
    receipt?.artifact_sha256!==item.artifact_sha256||
    receipt?.status!=='AWAITING_OWNER_APPROVAL'||
    receipt?.installation_authorized!==false)
   deny('EXACT_OWNER_APPROVED_CANDIDATE_NOT_VERIFIED');
 const entries=q.files as Array<Record<string,unknown>>;
 const unique=new Set();
 for(const file of entries){
  const path=String(file.path||'');
  if(!/^(?:src\/reality-extensions\/[a-zA-Z0-9._/-]+\.mjs|test\/reality-extensions\/[a-zA-Z0-9._/-]+\.test\.(?:js|mjs))$/.test(path)||
    path.includes('..')||path.includes('//')||
    typeof file.content!=='string'||file.content.length<1||
    file.content.length>70000||unique.has(path))
    deny('OWNER_APPROVED_EXTENSION_PATH_INVALID');
  unique.add(path);
 }
 if(!entries.some(f=>String(f.path).startsWith('src/'))||
    !entries.some(f=>String(f.path).startsWith('test/')))
  deny('APPROVED_SOURCE_AND_TESTS_REQUIRED');
 const computed=await hash(JSON.stringify(stable([...entries]
  .sort((a,b)=>String(a.path).localeCompare(String(b.path)))
  .map(f=>({path:f.path,content:f.content})))));
 if(computed!==item.artifact_sha256)
  deny('APPROVED_MODEL_BYTES_HASH_MISMATCH');
 for(const file of entries){
  if(await api('/contents/'+String(file.path)+'?ref='+runSha,githubToken)!==null)
   deny('MODEL_GENERATED_SOURCE_WOULD_OVERWRITE_EXISTING_FILE');
 }
 return {status:'OWNER_APPROVED_CANDIDATE_READY_FOR_ISOLATED_INSTALL',
   signed_run_id:runId,source_repository_sha:runSha,
   original_work_id:item.original_work_id,trigger_id:item.trigger_id,
   gap_event_id:item.gap_event_id,approval_id:item.approval_id,
   owner_id:item.owner_id,artifact_sha256:item.artifact_sha256,
   qualification_receipt:receipt,approval_receipt:approval,
   candidate:q,target_environment:'ISOLATED_PREVIEW',
   installation_verified:false,original_job_completed:false,
   production_changed:false};
}

async function recordIndependentlyMonitoredInstall(
 install:Record<string,unknown>,monitor:Record<string,unknown>,
 sha:string,runId:number,githubToken:string){
 if(install?.schema!=='reality-owner-approved-preview-source-install-v1'||
  monitor?.schema!=='reality-independent-installed-preview-activation-v1'||
  !SHA40.test(String(install?.source_sha||''))||
  install?.source_sha!==monitor?.source_sha||
  monitor?.independent_runner_sha!==sha||
  !/^[1-9][0-9]{7,17}$/.test(String(install?.installer_run_id||''))||
  monitor?.independent_run_id!==String(runId)||
  monitor?.installed_commit_sha!==install.installed_commit_sha||
  monitor?.install_branch!==install.installed_branch||
  monitor?.approval_id!==install.approval_id||
  monitor?.original_work_id!==install.original_work_id||
  monitor?.artifact_sha256!==install.artifact_sha256||
  install?.source_installation_verified!==true||
  install?.approval_origin!=='AUTHENTICATED_OWNER_EXPLICIT_ACTION'||
  install?.production_changed!==false||
  monitor?.production_changed!==false||
  monitor?.original_job_settled!==false||
  monitor?.all_passed!==true||
  monitor?.probation_status!=='ACTIVE'||
  monitor?.probation_live_business_executions!==0||
  monitor?.probation_isolated_monitoring_executions!==5||
  !UUID.test(String(install.approval_id||''))||
  !UUID.test(String(install.original_trigger_id||''))||
  !WORK.test(String(install.original_work_id||''))||
  !SHA64.test(String(install.artifact_sha256||''))||
  !SHA40.test(String(install.installed_commit_sha||''))||
  !/^feature\/reality-qualified-install-[a-f0-9]{12}$/.test(
    String(install.installed_branch||''))||
  !Array.isArray(install.file_sha256)||
  install.file_sha256.length<2||install.file_sha256.length>12||
  !Array.isArray(monitor.observations)||
  monitor.observations.length!==5)
  deny('INDEPENDENT_INSTALL_ACTIVATION_EVIDENCE_INVALID');
 let total=0;
 for(const observation of monitor.observations as Array<Record<string,unknown>>){
  if(observation.exit_code!==0||
   !(Number(observation.tests)>=44)||
   observation.tests!==observation.passed||
   observation.failed!==0||
   observation.sandbox_network_disabled!==true||
   observation.executor_privileges_dropped!==true||
   !SHA64.test(String(observation.output_hash_sha256||'')))
   deny('INDEPENDENT_PROBATION_ASSERTION_FAILED');
  total+=Number(observation.passed);
 }
 const original=await api('/actions/runs/'+install.installer_run_id,githubToken);
 if(original?.id!==Number(install.installer_run_id)||
   original.head_sha!==install.source_sha||
   original.head_repository?.full_name!==REPO||
   original.path!==WORKFLOW)
  deny('HISTORICAL_SIGNED_INSTALL_RUN_UNVERIFIED');
 const installJobs=await api('/actions/runs/'+install.installer_run_id+'/jobs?per_page=100',githubToken);
 const monitorJobs=await api('/actions/runs/'+runId+'/jobs?per_page=100',githubToken);
 const monitorJobName=String(runId)===String(install.installer_run_id)?
  'monitor_owner_approved_preview':'recover_consumed_preview_install';
 if(!Array.isArray(installJobs?.jobs)||!Array.isArray(monitorJobs?.jobs)||
  !installJobs.jobs.some((j:Record<string,unknown>)=>
   j.name==='activate_owner_approved_preview'&&
   j.status==='completed'&&j.conclusion==='success')||
  !monitorJobs.jobs.some((j:Record<string,unknown>)=>
   j.name===monitorJobName&&
   j.status==='completed'&&j.conclusion==='success'))
  deny('PROVIDER_INSTALL_MONITOR_JOBS_NOT_INDEPENDENTLY_COMPLETE');
 const ref=await api('/git/ref/heads/'+install.installed_branch,githubToken);
 if(ref?.object?.sha!==install.installed_commit_sha)
  deny('INSTALLED_BRANCH_PROVIDER_COMMIT_CHANGED');
 for(const source of install.file_sha256 as Array<Record<string,unknown>>){
  const path=String(source.path||'');
  if(!/^(?:src\/reality-extensions\/[A-Za-z0-9._/-]+\.mjs|test\/reality-extensions\/[A-Za-z0-9._/-]+\.test\.(?:js|mjs))$/.test(path)||
   path.includes('..')||!SHA64.test(String(source.sha256||'')))
   deny('INSTALLED_SOURCE_PATH_OR_HASH_INVALID');
  const found=await api('/contents/'+path+'?ref='+install.installed_commit_sha,githubToken);
  if(found?.path!==path||found.encoding!=='base64'||
   typeof found.content!=='string')
   deny('INDEPENDENT_INSTALLED_PROVIDER_FILE_MISSING');
  const bytes=Uint8Array.from(atob(found.content.replace(/\s/g,'')),x=>x.charCodeAt(0));
  if(await hash(bytes)!==source.sha256)
   deny('INDEPENDENT_INSTALLED_PROVIDER_BYTES_CHANGED');
 }
 const proof={
  original_work_id:install.original_work_id,
  approval_id:install.approval_id,
  artifact_sha256:install.artifact_sha256,
  installer_run_id:String(install.installer_run_id),
  installed_branch:install.installed_branch,
  installed_commit_sha:install.installed_commit_sha,
  independent_run_id:String(runId),
  independent_verified:true,
  original_frozen_acceptance_passed:true,
  isolation_network_disabled:true,
  monitored_executions:5,
  passed_assertions:total,
  failed_assertions:0,
  observations:monitor.observations,
  production_changed:false,
  original_job_completed:false,
 };
 const recorded=await database('rpc/reality_record_genuine_preview_activation_v1',{
  method:'POST',body:{p_trigger_id:install.original_trigger_id,
   p_approval_id:install.approval_id,p_proof:proof}});
 if(recorded?.status!=='ISOLATED_INSTALLED_PROBATION'||
  recorded?.original_work_id!==install.original_work_id||
  recorded?.installed_commit_sha!==install.installed_commit_sha||
  recorded?.monitored_executions!==5||
  recorded?.original_job_completed!==false||
  recorded?.settlement_verified!==false)
  deny('DURABLE_INSTALLED_PROBATION_READBACK_FAILED');
 return recorded;
}

async function prepareConsumedOwnerInstallationRecovery(
 currentSha:string,currentRunId:number,githubToken:string){
 const r=await database('rpc/reality_read_consumed_genuine_preview_recovery_v1',{
  method:'POST',body:{}});
 if(r?.status==='NO_CONSUMED_INSTALL_AWAITING_RECONCILIATION')
  return {status:'NO_CONSUMED_INSTALL_AWAITING_RECONCILIATION',
   original_job_completed:false,production_changed:false};
 if(r?.status!=='CONSUMED_APPROVAL_RECOVERY_REQUIRED'||
   !WORK.test(r.original_work_id)||!UUID.test(r.trigger_id)||
   !UUID.test(r.approval_id)||!SHA64.test(r.artifact_sha256)||
   !SHA40.test(r.installer_source_sha)||
   !/^[1-9][0-9]{7,17}$/.test(String(r.installer_run_id||''))||
   r.target_environment!=='ISOLATED_PREVIEW'||
   r.production_changed!==false||r.original_job_completed!==false)
  deny('CONSUMED_APPROVAL_RECOVERY_UNTRUSTED');
 const oldRun=await api('/actions/runs/'+r.installer_run_id,githubToken);
 if(oldRun?.id!==Number(r.installer_run_id)||
  oldRun.head_sha!==r.installer_source_sha||
  oldRun.head_repository?.full_name!==REPO||
  oldRun.path!==WORKFLOW)
  deny('ORIGINAL_SIGNED_INSTALL_RUN_MISMATCH');
 const jobs=await api('/actions/runs/'+r.installer_run_id+'/jobs?per_page=100',githubToken);
 if(!Array.isArray(jobs?.jobs)||!
  jobs.jobs.some((j:Record<string,unknown>)=>j.name==='activate_owner_approved_preview'&&
   j.status==='completed'&&j.conclusion==='success'))
  deny('ORIGINAL_INSTALL_PROVIDER_JOB_NOT_SUCCESSFUL');
 const branch='feature/reality-qualified-install-'+r.artifact_sha256.slice(0,12);
 const ref=await api('/git/ref/heads/'+branch,githubToken);
 if(!SHA40.test(ref?.object?.sha))
  deny('ORIGINAL_ISOLATED_INSTALL_BRANCH_NOT_FOUND');
 return {status:'CONSUMED_APPROVAL_READY_FOR_INDEPENDENT_RECOVERY',
   original_work_id:r.original_work_id,trigger_id:r.trigger_id,
   approval_id:r.approval_id,artifact_sha256:r.artifact_sha256,
   installer_run_id:String(r.installer_run_id),
   installer_source_sha:r.installer_source_sha,
   installed_branch:branch,installed_commit_sha:ref.object.sha,
   recovery_run_id:String(currentRunId),recovery_source_sha:currentSha,
   installation_replay_authorized:false,
   original_job_completed:false,production_changed:false};
}

/** Governed continuation: installed preview only, never production. */
async function originalContinuationScope(token:string){
 const s=await database('rpc/reality_read_genuine_original_scope_v2',{method:'POST',body:{}});
 if(s?.status==='NO_ELIGIBLE_ORIGINAL')return null;
 if(s?.phase==='SETTLED_ISOLATED'&&s?.continuation_state==='SETTLED_ISOLATED')
  return {scope:s,original:{}};
 if(!UUID.test(s?.trigger_id)||!WORK.test(s?.original_work_id)||
    !SHA40.test(s?.installed_commit_sha)||!SHA64.test(s?.artifact_sha256)||
    s?.phase!=='ISOLATED_INSTALLED_PROBATION'||
    s?.target_environment!=='ISOLATED_PREVIEW'||
    s?.probation_status!=='ACTIVE'||!s?.consumed_at||
    !UUID.test(s?.approval_id)||!UUID.test(s?.original_work_event_id))
    deny('ORIGINAL_RESUME_INSTALLED_SCOPE_MISSING');
 const r=await database('universe_events?'+new URLSearchParams({
  event_id:'eq.'+s.original_work_event_id,
  select:'event_id,epistemic_status,payload'}));
 if(!Array.isArray(r)||r.length!==1||r[0].epistemic_status!=='VERIFIED')
  deny('ORIGINAL_RESUME_SOURCE_EVENT_NOT_VERIFIED');
 const orig=r[0].payload||{};
 if(orig.original_work_id!==s.original_work_id||
    orig.original_job_completed!==false||
    orig.production_changed!==false||
    orig.frozen_test_sha256?.match(SHA64)?.[0]!==orig.frozen_test_sha256||
    !SHA40.test(orig.original_source_sha)||
    !/^[1-9]\d{5,18}$/.test(String(orig.original_provider_failed_run_id))||
    !/^[1-9]\d{5,18}$/.test(String(orig.original_provider_failed_job_id)))
  deny('ORIGINAL_RESUME_UNCHANGED_CUSTOMER_SCOPE_REQUIRED');
 const ref=await api('/git/ref/heads/'+s.install_branch,token);
 if(ref?.object?.sha!==s.installed_commit_sha)
  deny('ORIGINAL_RESUME_INSTALLED_BRANCH_CHANGED');
 const installed=await api('/contents/'+orig.source_path+'?ref='+s.installed_commit_sha,token);
 if(installed?.encoding!=='base64'||typeof installed.content!=='string')
  deny('ORIGINAL_RESUME_SOURCE_NOT_INSTALLED');
 const first=await api('/contents/'+orig.source_path+'?ref='+orig.original_source_sha,token);
 if(first!==null)deny('ORIGINAL_RESUME_HISTORICAL_GAP_NOT_REAL');
 const source=await providerSource(orig.frozen_test_path,orig.original_source_sha);
 const nowTest=await providerSource(orig.frozen_test_path,s.installed_commit_sha);
 if(await hash(source)!==orig.frozen_test_sha256||
    await hash(nowTest)!==orig.frozen_test_sha256)
  deny('ORIGINAL_RESUME_FROZEN_SUITE_CHANGED');
 const old=await api('/actions/runs/'+orig.original_provider_failed_run_id,token);
 if(old?.head_sha!==orig.original_source_sha||old?.conclusion!=='failure'||
    old?.status!=='completed'||old?.head_repository?.full_name!==REPO)
  deny('ORIGINAL_RESUME_FAILURE_RUN_UNVERIFIED');
 const jobs=await api('/actions/runs/'+old.id+'/jobs?per_page=100',token);
 if(!Array.isArray(jobs?.jobs)||!jobs.jobs.some((j:Record<string,unknown>)=>
   j.id===Number(orig.original_provider_failed_job_id)&&j.conclusion==='failure'))
  deny('ORIGINAL_RESUME_FAILURE_JOB_UNVERIFIED');
 return {scope:s,original:orig};
}
async function continueOriginalPrepare(sha:string,run:number,token:string){
 const item=await originalContinuationScope(token);
 if(!item)return {status:'NO_ELIGIBLE_ORIGINAL'};
 const {scope:s,original:o}=item;
 if(s.continuation_state==='SETTLED_ISOLATED')
  return {status:'ALREADY_SETTLED'};
 if(s.continuation_state==='RESUMPTION_CLAIMED')
  return {status:'RESUMPTION_ALREADY_CLAIMED_NO_REPLAY'};
 const receipt=await database('rpc/reality_accept_genuine_original_v1',{
  method:'POST',body:{p_trigger_id:s.trigger_id,p_run_id:run,p_runner_sha:sha,
   p_proof:{installed_commit_sha:s.installed_commit_sha,
    provider_branch_verified:true,installed_bytes_verified:true,
    production_changed:false}}});
 if(receipt?.status!=='ACCEPTED_FOR_ISOLATED_RESUMPTION'||
    receipt?.original_work_id!==s.original_work_id||
    receipt?.installed_commit_sha!==s.installed_commit_sha||
    receipt?.full_probation_complete!==false||
    receipt?.original_job_completed!==false)
  deny('ORIGINAL_RESUME_ACCEPTANCE_READBACK_NOT_VERIFIED');
 return {status:'ACCEPTED_FOR_ISOLATED_RESUMPTION',acceptance_receipt:receipt,
  original_work_id:s.original_work_id,trigger_id:s.trigger_id,
  approval_id:s.approval_id,installed_commit_sha:s.installed_commit_sha,
  artifact_sha256:s.artifact_sha256,installed_branch:s.install_branch,
  original_source_sha:o.original_source_sha,
  original_failed_run_id:o.original_provider_failed_run_id,
  original_failed_job_id:o.original_provider_failed_job_id,
  frozen_test_path:o.frozen_test_path,frozen_test_sha256:o.frozen_test_sha256,
  source_path:o.source_path,
  owner_id:s.owner_id,goal_id:s.goal_id,
  full_probation_complete:false,production_changed:false,original_job_completed:false};
}
async function continueOriginalClaim(sha:string,run:number,token:string,trigger:string){
 if(!UUID.test(trigger))deny('ORIGINAL_RESUME_TRIGGER_INVALID');
 const item=await originalContinuationScope(token);
 if(!item||item.scope.trigger_id!==trigger||
    item.scope.continuation_state!=='ACCEPTED_FOR_ISOLATED_RESUMPTION')
  deny('ORIGINAL_RESUME_ACCEPTED_SCOPE_CHANGED');
 const receipt=await database('rpc/reality_claim_genuine_original_v1',{
  method:'POST',body:{p_trigger_id:trigger,p_run_id:run,p_runner_sha:sha}});
 if(receipt?.status!=='RESUMPTION_CLAIMED'||
    receipt?.original_work_id!==item.scope.original_work_id||
    receipt?.installed_commit_sha!==item.scope.installed_commit_sha||
    receipt?.original_job_completed!==false||
    receipt?.production_changed!==false)
  deny('ORIGINAL_RESUME_SINGLE_USE_READBACK_FAILED');
 return receipt;
}
async function continueOriginalSettle(sha:string,run:number,token:string,proof:Record<string,unknown>){
 const item=await originalContinuationScope(token);
 if(!item||item.scope.continuation_state!=='RESUMPTION_CLAIMED')
  deny('ORIGINAL_SETTLEMENT_CLAIMED_JOB_REQUIRED');
 const s=item.scope,o=item.original;
 if(proof?.schema!=='reality-original-job-execution-proof-v1'||
    proof.original_work_id!==s.original_work_id||
    proof.installed_commit_sha!==s.installed_commit_sha||
    proof.artifact_sha256!==s.artifact_sha256||
    proof.github_run_id!==String(run)||
    proof.classification!=='MISSING_CAPABILITY'||
    proof.original_provider_failure_verified!==true||
    proof.frozen_suite_passed!==true||
    proof.isolated_execution!==true||
    proof.production_changed!==false||
    !SHA64.test(String(proof.provider_outcome_digest||'')))
  deny('ORIGINAL_SETTLEMENT_EXECUTION_PROOF_INVALID');
 const jobs=await api('/actions/runs/'+run+'/jobs?per_page=100',token);
 const completed=(Array.isArray(jobs?.jobs)?jobs.jobs:[]).filter(
  (j:Record<string,unknown>)=>j.name==='resume_original_job'&&
    j.status==='completed'&&j.conclusion==='success'&&j.run_id===run);
 if(completed.length!==1||
    !completed[0].steps?.some((step:Record<string,unknown>)=>
      step.name==='Execute original frozen acceptance against installed source'&&
      step.conclusion==='success'))
  deny('ORIGINAL_SETTLEMENT_PROVIDER_JOB_NOT_SUCCESSFUL');
 const artifacts=await api('/actions/runs/'+run+'/artifacts?per_page=100',token);
 const saved=(artifacts?.artifacts||[]).filter((a:Record<string,unknown>)=>
    a.name==='reality-original-resumption-'+run&&!a.expired);
 if(saved.length!==1||!/^sha256:[a-f0-9]{64}$/.test(saved[0].digest||''))
  deny('ORIGINAL_SETTLEMENT_PROVIDER_ARTIFACT_NOT_VERIFIED');
 const receipt=await database('rpc/reality_settle_genuine_original_v1',{
  method:'POST',body:{p_trigger_id:s.trigger_id,p_run_id:run,p_proof:{
    original_work_id:s.original_work_id,installed_commit_sha:s.installed_commit_sha,
    artifact_sha256:s.artifact_sha256,github_run_id:String(run),
    provider_resume_job_success:true,provider_original_failure_verified:true,
    isolated_original_acceptance_passed:true,observed_classification:'MISSING_CAPABILITY',
    provider_outcome_digest:proof.provider_outcome_digest,production_changed:false}}});
 if(receipt?.status!=='SETTLED_ISOLATED'||
    receipt?.original_work_id!==s.original_work_id||
    receipt?.installed_commit_sha!==s.installed_commit_sha||
    receipt?.original_job_completed!==true||
    receipt?.independent_outcome_verified!==true||
    receipt?.full_probation_complete!==false||
    receipt?.production_changed!==false)
  deny('ORIGINAL_SETTLEMENT_DURABLE_READBACK_FAILED');
 const after=await database('rpc/reality_read_genuine_original_scope_v2',{method:'POST',body:{}});
 if(after?.original_work_id!==s.original_work_id||
    after?.phase!=='SETTLED_ISOLATED'||after?.continuation_state!=='SETTLED_ISOLATED')
  deny('ORIGINAL_SETTLEMENT_SECOND_DATABASE_READBACK_FAILED');
 return receipt;
}


async function attestSignedOwnerIssue(proof:Record<string,unknown>,sha:string,runId:number,token:string){
 const n=Number(proof?.issue_number),failedRun=Number(proof?.original_provider_failed_run_id);
 const failedJob=Number(proof?.original_provider_failed_job_id);
 if(!Number.isInteger(n)||n<1||n>100000||
  !Number.isSafeInteger(failedRun)||failedRun<10000||
  !Number.isSafeInteger(failedJob)||failedJob<10000||
  !SHA40.test(String(proof?.source_sha||''))||
  !SHA64.test(String(proof?.frozen_test_sha256||''))||
  !SHA64.test(String(proof?.actual_provider_failure_hash||''))||
  !TEST.test(String(proof?.frozen_test_path||''))||
  !MODULE.test(String(proof?.source_path||''))||
  proof?.independently_verified!==true||
  proof?.owner_goal_bound!==false||
  proof?.installation_authorized!==false||
  proof?.job_completed!==false||
  proof?.production_changed!==false)
  deny('OWNER_WITNESS_PINNED_PROVIDER_SCOPE_REQUIRED');
 const issue=await api('/issues/'+n,token);
 if(issue?.number!==n||issue.state!=='open'||issue.pull_request||
    issue.repository_url!=='https://api.github.com/repos/'+REPO)
   deny('OWNER_WITNESS_ISSUE_NOT_CURRENT');
 const txt=String(issue.body||'');
 const src=[...new Set(txt.match(/src\/reality-extensions\/[a-z0-9._/-]+\.mjs/g)||[])];
 const tests=[...new Set(txt.match(/test\/reality-frozen-regressions\/[a-z0-9._/-]+\.test\.js/g)||[])];
 if(src.length!==1||src[0]!==proof.source_path||tests.length!==1||
    tests[0]!==proof.frozen_test_path||
    !txt.includes('https://github.com/'+REPO+'/actions/runs/'+failedRun))
   deny('OWNER_WITNESS_ISSUE_PROVENANCE_CHANGED');
 const run=await api('/actions/runs/'+failedRun,token);
 if(run?.id!==failedRun||run.status!=='completed'||run.conclusion!=='failure'||
    run.head_sha!==proof.source_sha||run.head_repository?.full_name!==REPO||
    !['push','pull_request','workflow_dispatch'].includes(run.event))
   deny('OWNER_WITNESS_HISTORICAL_RUN_CHANGED');
 const listed=await api('/actions/runs/'+failedRun+'/jobs?per_page=100',token);
 const jobs=(Array.isArray(listed?.jobs)?listed.jobs:[]).filter(j=>
    j.run_id===failedRun&&j.head_sha===run.head_sha&&
    j.conclusion==='failure'&&Array.isArray(j.steps)&&
    j.steps.some(step=>step.conclusion==='failure'));
 if(!jobs.some(j=>j.id===failedJob))deny('OWNER_WITNESS_FAILED_JOB_CHANGED');
 const work='work:'+(await hash('reality:issue:'+n)).slice(0,32);
 const receipt={issue_number:n,original_work_id:work,run_id:failedRun,
   run_url:'https://github.com/'+REPO+'/actions/runs/'+failedRun,
   source_sha:run.head_sha,workflow_name:String(run.name||'').slice(0,160),
   failed_jobs:jobs.map(j=>({job_id:j.id,name:String(j.name||'').slice(0,120),
    failed_steps:j.steps.filter(step=>step.conclusion==='failure')
      .map(step=>String(step.name||'').slice(0,160)).slice(0,20)})).slice(0,12)};
 if(await hash(JSON.stringify(receipt))!==proof.actual_provider_failure_hash)
  deny('OWNER_WITNESS_ORIGINAL_PROVIDER_FAILURE_HASH_CHANGED');
 const test=await api('/contents/'+proof.frozen_test_path+'?ref='+run.head_sha,token);
 if(test?.encoding!=='base64'||test.path!==proof.frozen_test_path)
   deny('OWNER_WITNESS_TEST_SOURCE_NOT_VERIFIED');
 const bytes=Uint8Array.from(atob(String(test.content).replace(/\s/g,'')),c=>c.charCodeAt(0));
 if(bytes.length>80000||await hash(bytes)!==proof.frozen_test_sha256)
   deny('OWNER_WITNESS_FROZEN_BYTES_CHANGED');
 const testText=new TextDecoder().decode(bytes);
 if(!testText.includes(String(proof.source_path).split('/').at(-1))||
    !testText.includes('node:test'))
   deny('OWNER_WITNESS_FROZEN_ACCEPTANCE_NOT_SOURCE_BOUND');
 if(await api('/contents/'+proof.source_path+'?ref='+run.head_sha,token)!==null)
   deny('OWNER_WITNESS_MODULE_NOT_MISSING');
 const stored=await database('rpc/reality_record_genuine_owner_issue_witness_v1',
  {method:'POST',body:{p_proof:{
    schema:'reality-provider-verified-owner-issue-witness-v1',
    issue_number:n,issue_title:String(issue.title||'').slice(0,160),
    original_provider_failed_run_id:failedRun,original_provider_failed_job_id:failedJob,
    original_source_sha:run.head_sha,source_path:proof.source_path,
    frozen_test_path:proof.frozen_test_path,
    frozen_test_sha256:proof.frozen_test_sha256,
    actual_provider_failure_hash:proof.actual_provider_failure_hash,
    witness_repository_sha:sha,witness_run_id:runId,
    provider_readback_verified:true,owner_authorized:false,
    installation_authorized:false,production_changed:false
  }}});
 if(stored?.status!=='SIGNED_PROVIDER_WITNESS_PERSISTED'||
    stored.issue_number!==n||
    stored.owner_authorized!==false||stored.installation_authorized!==false)
  deny('OWNER_WITNESS_PERSISTENCE_NOT_VERIFIED');
 const read=await database('rpc/reality_read_genuine_owner_issue_witness_v1',
   {method:'POST',body:{p_issue_number:n}});
 if(read?.status!=='SOURCE_PINNED_MISSING_EXTENSION_READY_FOR_OWNER_REVIEW'||
    read.source_sha!==run.head_sha||
    read.frozen_test_sha256!==proof.frozen_test_sha256||
    read.actual_provider_failure_hash!==proof.actual_provider_failure_hash||
    read.original_provider_failed_job_id!==failedJob||
    read.owner_goal_bound!==false||read.installation_authorized!==false||
    read.job_completed!==false||read.production_changed!==false)
  deny('OWNER_WITNESS_INDEPENDENT_DATABASE_READBACK_FAILED');
 return {status:'SIGNED_PROVIDER_WITNESS_VERIFIED',issue_number:n,
    signed_witness_run_id:runId,original_provider_failed_run_id:failedRun,
    installation_authorized:false,production_changed:false};
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
  const ghProviderToken=request.headers.get('x-reality-github-provider-token');
  if((input?.action?.startsWith('installer_')||input?.action?.startsWith('original_')||input?.action==='owner_source_attest')&&
     (typeof ghProviderToken!=='string'||
      !/^[\x21-\x7e]{20,4000}$/.test(ghProviderToken)))
    deny('SIGNED_PROVIDER_GITHUB_READ_CREDENTIAL_REQUIRED');

  if(input?.action==='owner_source_attest'){
   if(Object.keys(input).sort().join(',')!=='action,proof,scope'||
      Object.keys(input.scope||{}).sort().join(',')!=='repository_sha'||
      !SHA40.test(input.scope.repository_sha))
    deny('OWNER_WITNESS_SIGNED_ENVELOPE_REQUIRED');
   const run=await verify(bearer,input.scope.repository_sha,ghProviderToken);
   const result=await attestSignedOwnerIssue(input.proof,input.scope.repository_sha,
      run.id,ghProviderToken);
   return respond({ok:true,...result});
  }
  if(['original_prepare','original_claim','original_settle'].includes(input?.action)&&
    SHA40.test(input?.scope?.repository_sha||'')){
   const names=Object.keys(input).sort().join(',');
   if((input.action==='original_prepare'||input.action==='original_claim')&&names!=='action,scope'||
      input.action==='original_settle'&&names!=='action,proof,scope')
    deny('ORIGINAL_CONTINUATION_ENVELOPE_INVALID');
   const verified=await verify(bearer,input.scope.repository_sha,ghProviderToken);
   const receipt=input.action==='original_prepare'?
     await continueOriginalPrepare(input.scope.repository_sha,verified.id,ghProviderToken):
     input.action==='original_claim'?
     await continueOriginalClaim(input.scope.repository_sha,verified.id,ghProviderToken,input.scope.trigger_id):
     await continueOriginalSettle(input.scope.repository_sha,verified.id,ghProviderToken,input.proof);
   return respond({ok:true,...receipt});
  }
  if(input?.action==='readiness_snapshot'&&
    SHA40.test(input?.scope?.repository_sha||'')){
   if(Object.keys(input).sort().join(',')!=='action,scope'||
      Object.keys(input.scope||{}).sort().join(',')!=='repository_sha')
    deny('READINESS_ENVELOPE_UNVERIFIED');
   const run=await verify(bearer,input.scope.repository_sha,ghProviderToken);
   const snapshot=await database('rpc/reality_genuine_production_readiness_snapshot_v1',{
      method:'POST',body:{}});
   if(snapshot?.schema!=='reality-independent-production-readiness-snapshot-v1'||
      snapshot.scope!=='ISOLATED_PROJECT_READ_ONLY'||
      snapshot.production_release_authorized!==false||
      snapshot.production_changed!==false||
      !Number.isInteger(snapshot.settled_original_jobs)||
      !Number.isInteger(snapshot.unreconciled_settlements)||
      !Number.isInteger(snapshot.unbound_capability_discoveries))
    deny('READINESS_INDEPENDENT_DATABASE_READBACK_FAILED');
   return respond({ok:true,status:'READINESS_EVIDENCE_VERIFIED',
     signed_run_id:run.id,repository_sha:input.scope.repository_sha,
     snapshot,production_release_authorized:false,production_changed:false});
  }
  if(input?.action==='installer_recover_prepare'&&
    SHA40.test(input?.scope?.repository_sha||'')){
   if(Object.keys(input).sort().join(',')!=='action,scope')
    deny('INSTALL_RECOVER_ENVELOPE_INVALID');
   const run=await verify(bearer,input.scope.repository_sha,ghProviderToken);
   const prepared=await prepareConsumedOwnerInstallationRecovery(
    input.scope.repository_sha,run.id,ghProviderToken);
   return respond({ok:true,...prepared});
  }
  if(input?.action==='installer_record_activation'&&
    SHA40.test(input?.scope?.repository_sha||'')){
   if(Object.keys(input).sort().join(',')!=='action,install,monitor,scope')
    deny('INSTALL_ACTIVATION_ENVELOPE_INVALID');
   const verified=await verify(bearer,input.scope.repository_sha,ghProviderToken);
   const receipt=await recordIndependentlyMonitoredInstall(
    input.install,input.monitor,input.scope.repository_sha,
    verified.id,ghProviderToken);
   return respond({ok:true,...receipt});
  }
  if(input?.action==='installer_prepare'&&
     SHA40.test(input?.scope?.repository_sha||'')){
   if(Object.keys(input).sort().join(',')!=='action,scope')
    deny('INSTALL_PREPARE_ENVELOPE_INVALID');
   const run=await verify(bearer,input.scope.repository_sha,ghProviderToken);
   return respond({ok:true,...await prepareExactlyApprovedPreviewInstall(
     input.scope.repository_sha,run.id,ghProviderToken)});
  }
  if(input?.action==='installer_reserve'&&
    SHA40.test(input?.scope?.repository_sha||'')){
   if(Object.keys(input).sort().join(',')!=='action,scope')
    deny('INSTALL_RESERVE_ENVELOPE_INVALID');
   const run=await verify(bearer,input.scope.repository_sha,ghProviderToken);
   const prepared=await prepareExactlyApprovedPreviewInstall(
     input.scope.repository_sha,run.id,ghProviderToken);
   if(prepared.status!=='OWNER_APPROVED_CANDIDATE_READY_FOR_ISOLATED_INSTALL'||
    prepared.trigger_id!==input.scope.trigger_id||
    prepared.approval_id!==input.scope.approval_id||
    prepared.artifact_sha256!==input.scope.artifact_sha256)
    deny('EXACT_PREAPPROVED_INSTALL_SCOPE_CHANGED');
   const reservation=await database('rpc/reality_reserve_approved_genuine_preview_v1',{
    method:'POST',body:{
     p_trigger_id:prepared.trigger_id,p_approval_id:prepared.approval_id,
     p_artifact_hash:prepared.artifact_sha256,
     p_runner_sha:input.scope.repository_sha,p_run_id:String(run.id)}});
   if(reservation?.status!=='AUTHORIZED_INSTALL_RESERVATION_CONSUMED_ONCE'||
      reservation?.original_work_id!==prepared.original_work_id||
      reservation?.approval_id!==prepared.approval_id||
      reservation?.artifact_sha256!==prepared.artifact_sha256||
      reservation?.installation_verified!==false||
      reservation?.production_changed!==false)
     deny('INSTALL_RESERVATION_READBACK_MISMATCH');
   return respond({ok:true,...reservation});
  }
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
  const {queued,alreadyClaimed,skippedSettled,unbound}=await admit(input.report);
  if(queued.length+alreadyClaimed.length+skippedSettled.length+unbound.length!==
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
   verified_awaiting_owner_binding_count:unbound.length,
   awaiting_owner_binding:unbound,
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
