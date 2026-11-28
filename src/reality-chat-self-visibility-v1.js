// Reality's existing self-audit + existing GitHub read transport, composed
// into a fast, read-only Chat context. This is NOT a new capability engine.
// Source existence, owner-scoped runtime evidence and actual execution proof
// are distinct. Never obtain credentials from the model or allow a write.
import {assertShiftReadback,shiftRpc}
 from './reality-governed-shift-boundary-v1.js';
import {buildRealityEvidenceGroundedSelfAudit}
 from './reality-evidence-grounded-self-audit-v1.js';
import {buildRealityCapabilityOperatingContext}
 from './reality-capability-operating-context-v1.js';

const SHA=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const GITHUB='https://api.github.com/repos/maloney2323/Reality';
const TOPICS=Object.freeze({
 governance:/\b(govern|authoriz|approv|permission|constitution|control|policy)\w*/i,
 verification:/\b(verif|proof|receipt|settlement|acceptance|test)\w*/i,
 capability:/\b(capabilit|upgrade|engine|self.repair|automation)\w*/i,
 roi:/\b(roi|return on investment|value|saving|labor|econom|cost)\w*/i,
 drift:/\b(drift|continuity|memory|context|integrity|grounding)\w*/i,
 employee:/\b(employee|shift|workforce|staff|workday|job)\w*/i,
 inspection:/\b(self.inspec|self.audit|self.aware|introspec|architect|repo|source|system|see everything|see itself)\w*/i,
 universe:/\b(universe|worldline|world model|underlying llm|memory|knowledge graph)\b/i,
});
const relevant=text=>/\b(reality|itself|own|existing|already|your|system|capability|engine|authorization|verification|governance|drift|roi|inspection|architecture|source|code|self|universe|underlying|memory|context)\b/i.test(text||'')&&
 /\b(capabilit|authorization|verification|govern|existing|already|architect|inspect|engine|system|source|code|roi|drift|self|ability|abilities|upgrade|improve|universe|underlying|memory|context|what can|what do you have)\b|see everything|see itself|what it can do/i.test(text||'');
export function needsRealityCapabilityInspection(message,priorTurns=[]){
 if(typeof message!=='string'||!message.trim())return false;
 if(relevant(message)||/\b(shift|original work|original job|worker|release|recovery|continuation|full loop|autonomous|investigation|independent review)\b/i.test(message))return true;
 // A short "yes please" may refer to a prior explicit inspection request.
 if(!/^(?:yes|sure|go ahead|please|okay|ok)(?:[,.! ]+.{0,55})?$/i.test(message.trim()))
  return false;
 return Array.isArray(priorTurns)&&priorTurns.slice(-6).some(x=>
  x?.role==='user'&&relevant(String(x.text||'')));
}
const nowIso=()=>new Date().toISOString();
function choosePaths(paths,topicText){
 const topics=Object.entries(TOPICS).filter(([,rx])=>rx.test(topicText))
  .map(([name])=>name);
 const active=topics.length?topics:['governance','verification','capability'];
 // Any architectural self-question must also surface the existing
 // self-inspection and owner audit implementation, not only topic matches.
 if(!active.includes('inspection'))active.push('inspection');
 const labels={
  governance:['govern','authoriz','approv','constitution'],
  verification:['verif','receipt','test','settlement','acceptance'],
  capability:['capability','self-repair','self-improvement','engine'],
  roi:['roi','value','labor','econom'],
  drift:['drift','continuity','integrity','ground'],
  employee:['shift','employee','workday','workforce'],
  inspection:['self-inspect','self-audit','system-access','capability-operating','registry','universe'],
  universe:['universe','continuity','world','cognition','memory'],
 };
 const ranked=paths.map(path=>{
  const low=path.toLowerCase();
  const relevance=active.reduce((n,topic)=>n+
   labels[topic].reduce((v,fragment)=>v+(low.includes(fragment)?7:0),0),0);
  return {path,score:relevance+
   (low.startsWith('src/')?2:0)+(low.startsWith('api/reality/')?1:0)};
 }).filter(p=>p.score>2).sort((a,b)=>b.score-a.score||
  a.path.localeCompare(b.path)).slice(0,18);
 return {topics:active,paths:ranked.map(p=>p.path)};
}
const repoCache=new Map();
async function githubGet(path,{fetchImpl,token}){
 const r=await fetchImpl(GITHUB+path,{
  method:'GET',redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(1450),
  headers:{accept:'application/vnd.github+json',
   'user-agent':'Reality-signed-self-inspection-read-only',
   'x-github-api-version':'2022-11-28',
   ...(typeof token==='string'&&token.length>=20?
    {authorization:'Bearer '+token}:{})}
 });
 if(!r?.ok)throw Error('SELF_VISIBILITY_GITHUB_READ_UNAVAILABLE');
 const body=await r.json();
 if(!body||typeof body!=='object'||Array.isArray(body))
  throw Error('SELF_VISIBILITY_GITHUB_RESPONSE_UNVERIFIED');
 return body;
}
async function sourceManifest({sha,env,fetchImpl}){
 const cached=repoCache.get(sha);
 if(cached&&cached.expires>Date.now())return cached.value;
 const token=env.REALITY_GITHUB_TOKEN||env.GITHUB_TOKEN||'';
 const c=await githubGet('/git/commits/'+sha,{fetchImpl,token});
 if(c.sha!==sha||!SHA.test(c.tree?.sha||''))
  throw Error('SELF_VISIBILITY_PINNED_GIT_COMMIT_UNVERIFIED');
 const tree=await githubGet('/git/trees/'+c.tree.sha+'?recursive=1',{fetchImpl,token});
 if(tree.sha!==c.tree.sha||tree.truncated!==false||
   !Array.isArray(tree.tree)||tree.tree.length>12000)
  throw Error('SELF_VISIBILITY_COMPLETE_GIT_TREE_UNVERIFIED');
 const files=tree.tree.filter(x=>x?.type==='blob'&&
  typeof x.path==='string'&&
  /^(src\/|api\/reality\/|test\/)/.test(x.path)&&
  /\.(?:js|css|mjs)$/.test(x.path)&&
  SHA.test(x.sha||'')).map(x=>x.path);
 const value=Object.freeze({sha,tree_sha:tree.sha,files:Object.freeze(files)});
 if(repoCache.size>8)repoCache.clear();
 repoCache.set(sha,{value,expires:Date.now()+45000});
 return value;
}
async function ownerAudit({session,db,env,callRpc,fetchImpl}){
 if(!UUID.test(session?.user_id||'')||!db?.strictSecrets||
    db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  return null;
 const [shifts,loop]=await Promise.all([
  callRpc(db,'reality_read_owner_employee_shifts_v1',{
   p_owner_id:session.user_id},{fetchImpl}),
  callRpc(db,'reality_read_owner_genuine_loop_v1',{
   p_owner_id:session.user_id},{fetchImpl})
 ]);
 const snapshot=assertShiftReadback(shifts);
 const audit=buildRealityEvidenceGroundedSelfAudit({
  shiftReadback:snapshot,ownerLoopReadback:loop,
  sourceVerifiedAt:nowIso(),
  previewGithubWriteConfigured:typeof env.REALITY_GITHUB_TOKEN==='string'&&
   env.REALITY_GITHUB_TOKEN.length>=25,
  previewVercelDeployConfigured:
   typeof env.REALITY_NATIVE_VERCEL_DEPLOY_TOKEN==='string'&&
   env.REALITY_NATIVE_VERCEL_DEPLOY_TOKEN.length>=25
 });
 return Object.freeze({
  verified_at:audit.observed_at,
  active_owner_shift_count:audit.exact_current_owner_shift_count,
  historical_settlements:audit.historical_settled_originals_in_owner_readback,
  capabilities:audit.capabilities.map(x=>({
   id:x.id,evidence_ref:x.evidence_ref,
   proof_level:x.proof_level,can_claim_live:x.can_claim_live
  })),
  full_shift_automation_proven:audit.full_shift_automation_proven,
  installation_authorized:false,
 });
}
// Read the SAME current authority, original identity and independent receipts
// that drive the governed worker. This is neither a capability catalog nor a
// grant. Current exact receipts supersede older source-only descriptions.
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
export function projectCurrentContinuitySelfVisibility(value,ownerId){
 if(value?.status!=='OWNER_CURRENT_CONTINUITY_SELF_VISIBILITY_READ_ONLY'||
  value.owner_id!==ownerId||value.owner_scope_verified!==true||value.read_only!==true||
  value.execution_authorized!==false||value.installation_authorized!==false||value.production_changed!==false||
  !Number.isFinite(Date.parse(value.observed_at||''))||
  !Number.isSafeInteger(value.active_shift_count)||value.active_shift_count<0||
  !Number.isSafeInteger(value.unverified_guard_count)||value.unverified_guard_count<0||
  !Array.isArray(value.obligations)||value.obligations.length>144)return null;
 const entries=[];
 for(const ob of value.obligations){
  if(!UUID.test(ob?.shift_id||'')||!WORK.test(ob.original_work_id||'')||
   !UUID.test(ob.continuity_root_id||'')||!HASH.test(ob.continuity_head_sha256||'')||
   !HASH.test(ob.guard_receipt_sha256||'')||!HASH.test(ob.qualifier_receipt_sha256||'')||
   !Number.isSafeInteger(ob.continuity_revision)||ob.continuity_revision<1||
   typeof ob.source_ref!=='string'||ob.source_ref.length<8||ob.source_ref.length>2048||
   ob.existing_shift_authorized!==true||ob.read_only!==true||ob.execution_authorized!==false||
   ob.installation_authorized!==false||ob.production_changed!==false||
   !Array.isArray(ob.unresolved_proof_gates)||!Array.isArray(ob.current_events)||ob.current_events.length>8)return null;
  const i=ob.verified_investigation;
  const r=ob.verified_independent_review;
  const a=ob.active_release_observation;
  if(i!==null&&(!UUID.test(i?.incident_id||'')||!UUID.test(i?.investigation_worker_run_id||'')||
   !HASH.test(i?.investigation_receipt_sha256||'')||!HASH.test(i?.suspension_receipt_sha256||'')))return null;
  if(r!==null&&(!i||!HASH.test(r?.receipt_sha256||'')||
   r.investigation_receipt_sha256!==i.investigation_receipt_sha256||
   r.investigation_worker_run_id!==i.investigation_worker_run_id||
   !UUID.test(r.review_worker_run_id||'')||r.review_worker_run_id===i.investigation_worker_run_id||
   r.original_work_id!==ob.original_work_id||r.continuity_head_sha256!==ob.continuity_head_sha256||
   r.continuity_revision!==ob.continuity_revision||r.execution_authorized!==false||
   r.replay_authorized!==false||r.original_job_completed!==false||r.production_changed!==false))return null;
  if(a!==null&&(!SHA.test(a?.release_sha||'')||!HASH.test(a?.approval_receipt_sha256||'')||
   !Number.isFinite(Date.parse(a?.alias_observed_at||''))))return null;
  const currentNext=String(ob.operational_next_action||'UNKNOWN');
  const summary='Current verified Continuity: original '+ob.original_work_id+' ('+ob.source_ref+
   '), revision '+ob.continuity_revision+', existing shift '+ob.shift_id+
   ' is authorized under '+ob.warrant_mode+'. '+
   (a?'Latest independently recorded release alias observation: '+a.release_sha+
    ', approval '+a.approval_receipt_sha256+'. This is recorded activation evidence, not a fresh provider alias probe. ':'Release activation evidence unavailable. ')+
   (i?'Autonomous investigation VERIFIED LIVE, signed run '+i.investigation_worker_run_id+
    ', investigation receipt '+i.investigation_receipt_sha256+'. ':'No exact current investigation proof returned; do not infer absence. ')+
   (r?'Distinct independent review VERIFIED LIVE, receipt '+r.receipt_sha256+
    ', '+r.review_status+'. Not proof of repair. ':'No verified independent review returned for this current head. ')+
   'Current governed next action: '+currentNext+'. Unresolved gates: '+ob.unresolved_proof_gates.join(', ')+
   '. Evidence reads grant no new authority; do not request another shift start for covered work.';
  entries.push(Object.freeze({
   entry_id:'reality:current-continuity:'+ob.original_work_id+':'+ob.continuity_head_sha256,
   event_kind:'reality_current_verified_operational_self_visibility',
   source_kind:'OWNER_SCOPED_CANONICAL_CONTINUITY_AND_SIGNED_RECEIPT_READBACK',
   source_ref:'reality:employee-shift:'+ob.shift_id,
   assertion_time:value.observed_at,epistemic_status:'CURRENT_CANONICAL_OPERATIONAL_EVIDENCE',
   summary,original_work_id:ob.original_work_id,active_owner_shift_id:ob.shift_id,
   owner_shift_authorization_recorded:true,continuity_revision:ob.continuity_revision,
   continuity_head_sha256:ob.continuity_head_sha256,
   current_operational_facts:ob,
   autonomous_investigation_verified_live:i!==null,independent_review_verified_live:r!==null,
   next_governed_action:currentNext,execution_authorized:false,installation_authorized:false,production_changed:false
  }));
 }
 return Object.freeze({observed_at:value.observed_at,active_shift_count:value.active_shift_count,
  unverified_guard_count:value.unverified_guard_count,observations:entries});
}
export async function readCurrentContinuitySelfVisibility({session,db,env=process.env,callRpc=shiftRpc,fetchImpl=fetch}={}){
 if(!UUID.test(session?.user_id||'')||!db?.strictSecrets||db.url!==session?.config?.url||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||env.VERCEL_ENV!=='preview')return null;
 try{
  const v=await callRpc(db,'reality_read_owner_current_continuity_self_visibility_v1',
   {p_owner_id:session.user_id},{fetchImpl,timeoutMs:4500});
  return projectCurrentContinuitySelfVisibility(v,session.user_id);
 }catch{return null}
}
export async function readRealitySelfVisibilityForChat({
 session,message,priorTurns=[],env=process.env,db=null,
 fetchImpl=fetch,callRpc=shiftRpc,
 readSource=sourceManifest,readAudit=ownerAudit,readCurrent=readCurrentContinuitySelfVisibility
}={}){
 if(!needsRealityCapabilityInspection(message,priorTurns)||
   env.VERCEL_ENV!=='preview'||!SHA.test(env.VERCEL_GIT_COMMIT_SHA||'')||
   !UUID.test(session?.user_id||'')||
   !db?.strictSecrets||db.url!==session?.config?.url||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  return [];
 const sourcePending=Promise.resolve().then(()=>readSource({
  sha:env.VERCEL_GIT_COMMIT_SHA,env,fetchImpl})).catch(()=>null);
 const auditPending=Promise.resolve().then(()=>readAudit({
  session,db,env,callRpc,fetchImpl})).catch(()=>null);
 // Read-only context cannot hold ordinary Chat hostage if the GitHub
 // provider or owner audit is slow. The best verified result wins.
 const bounded=p=>Promise.race([p,new Promise(resolve=>
  setTimeout(()=>resolve(null),1750))]);
 // Independent budgets: a slow owner audit does not conceal an already
 // verified GitHub source tree, and vice versa.
 const [source,audit,current]=await Promise.all([
  bounded(sourcePending),bounded(auditPending),
  Promise.resolve().then(()=>readCurrent({session,db,env,callRpc,fetchImpl})).catch(()=>null)
 ]);
 const observations=[...(current?.observations||[])];
 if(source?.sha===env.VERCEL_GIT_COMMIT_SHA&&
    SHA.test(source.tree_sha||'')&&Array.isArray(source.files)&&
    source.files.length<=12000){
  const prior=Array.isArray(priorTurns)?priorTurns.slice(-5)
   .filter(x=>x.role==='user').map(x=>String(x.text||'').slice(0,500)).join(' '):'';
  const selected=choosePaths(source.files,(message||'')+' '+prior);
  observations.push(Object.freeze({
   entry_id:'reality:source-self-visibility:'+source.sha,
   event_kind:'reality_pinned_provider_source_capability_inventory',
   source_kind:'GITHUB_PINNED_DEPLOYMENT_SOURCE_TREE_READBACK',
   source_ref:'https://github.com/maloney2323/Reality/tree/'+source.sha,
   assertion_time:nowIso(),
   epistemic_status:'SOURCE_PATHS_VERIFIED_RUNTIME_EFFECTS_NOT_INFERRED',
   summary:'Reality source inspection: exact currently deployed commit '+source.sha+
    '. Repository tree contains '+source.files.length+
    ' inspectable source/test files. Relevant EXISTING components: '+
    (selected.paths.length?selected.paths.join(' | '):'no matching file paths')+
    '. Source presence is NOT independent proof of runtime availability or completed work.'+
    ' Investigate existing implementations before proposing a NEW engine.',
   relevant_existing_source_paths:selected.paths,
   topics:selected.topics,
   installed_capability_proven_by_source_tree:false,
   current_operational_readback_status:current?'OWNER_SCOPED_READBACK_AVAILABLE':'UNKNOWN_CURRENT_OPERATIONAL_READBACK_UNAVAILABLE',
   execution_authorized:false,installation_authorized:false,
   production_changed:false
  }));
 }
 if(audit?.capabilities&&Array.isArray(audit.capabilities)&&
   audit.capabilities.length===10&&
   audit.installation_authorized===false){
  observations.push(Object.freeze({
   entry_id:'reality:verified-self-audit:'+audit.verified_at,
   event_kind:'reality_owner_scoped_existing_capability_audit',
   source_kind:'AUTHENTICATED_OWNER_SHIFT_AND_CAPABILITY_LEDGER',
   source_ref:'reality:self-audit:owner-readback',
   assertion_time:audit.verified_at,
   epistemic_status:'OWNER_SCOPED_CURRENT_CAPABILITY_EVIDENCE',
   summary:'Existing Reality self-audit capability statuses (do not invent missing systems): '+
    audit.capabilities.map(x=>x.id+'='+x.proof_level).join(' | ')+
    '. Current owner shift count '+audit.active_owner_shift_count+
    '. Source, connection, running work and independent settlement are distinct.'+
    ' This legacy inventory is not the current operational verdict; exact current Continuity receipts take precedence over its coarse capability descriptions.'+
    ' This self-inspection does NOT authorize changes.',
   capabilities:audit.capabilities,
   owner_active_shift_count:audit.active_owner_shift_count,
   current_operational_readback_status:current?'OWNER_SCOPED_READBACK_AVAILABLE':'UNKNOWN_CURRENT_OPERATIONAL_READBACK_UNAVAILABLE',
   full_shift_automation_proven:audit.full_shift_automation_proven,
   execution_authorized:false,installation_authorized:false,
   production_changed:false
  }));
 }
 if(!observations.length){
  const manifest=buildRealityCapabilityOperatingContext();
  observations.push(Object.freeze({
   entry_id:'reality:self-visibility:implementation-only',
   event_kind:'reality_runtime_self_capability_visibility_unavailable',
   source_kind:'DEPLOYED_FOUNDATION_CAPABILITY_OPERATING_CONTEXT',
   source_ref:'src/reality-capability-operating-context-v1.js',
   assertion_time:nowIso(),
   epistemic_status:'MODEL_OPERATING_PLAYBOOK_ONLY_LIVE_SOURCE_UNAVAILABLE',
   summary:'Current GitHub tree and owner capability audit were not verified within the fast read budget. '+
    'Known implementation categories: '+manifest.known_components.map(x=>x.id+'='+x.status).join(' | ')+
    '. Do not infer a capability is ABSENT from a failed source read. '+
    'Do not recommend another authorization engine merely because an existing provider could not be inspected.',
   execution_authorized:false,installation_authorized:false,
   production_changed:false
  }));
 }
 return observations;
}

// The present operational read must not depend on the optional capability
// inventory's topic filter. Share one existing RPC read with that inventory.
export async function readOperationalSelfVisibilityForChat({
 readCurrent=readCurrentContinuitySelfVisibility,...args
}={}){
 const pending=Promise.resolve().then(()=>readCurrent(args)).catch(()=>null);
 const [current,inventory]=await Promise.all([
  pending,readRealitySelfVisibilityForChat({...args,readCurrent:()=>pending}).catch(()=>[])
 ]);
 return Object.freeze({current,observations:[
  ...(current?.observations||[]),
  ...inventory.filter(x=>x.event_kind!=='reality_current_verified_operational_self_visibility')
 ]});
}

// Projection of the existing owner-scoped ledger and verifier. No new state,
// query, work admission or authority. Historical jobs remain individually scoped.
export function projectChatOperationalHorizon({visibility=null,settlements=[]}={}){
 const c=visibility?.current;
 const available=!!c&&Number.isFinite(Date.parse(c.observed_at||''))&&
  Number.isSafeInteger(c.active_shift_count)&&c.active_shift_count>=0&&
  Number.isSafeInteger(c.unverified_guard_count)&&c.unverified_guard_count>=0&&
  Array.isArray(c.observations);
 const entries=available?c.observations.filter(e=>
  e.event_kind==='reality_current_verified_operational_self_visibility'&&
  e.source_kind==='OWNER_SCOPED_CANONICAL_CONTINUITY_AND_SIGNED_RECEIPT_READBACK'&&
  e.execution_authorized===false&&e.installation_authorized===false&&
  e.production_changed===false&&e.current_operational_facts).slice(0,12):[];
 const obligations=entries.map(e=>{
  const o=e.current_operational_facts;
  const events=o.current_events.map(x=>({
   ...x,interpretation:x.state==='SHADOW_STALE'?'SUPERSEDED_HISTORICAL_EVENT':
    x.state==='SHADOW_OBSERVED'?'OBSERVATION_ACCEPTED_NOT_ORIGINAL_SETTLEMENT':
    x.worker_status==='COMPLETED'?'WORKER_FINISHED_EVIDENCE_NOT_ACCEPTED':
    x.worker_status==='FAILED'?'WORKER_FAILURE_RECORDED':
    x.worker_status==='STARTED'?'START_RECORDED_CURRENT_ACTIVITY_UNVERIFIED':
    'NO_COMPLETED_WORKER_RECEIPT'
  }));
  return {...o,current_events:events.filter(x=>x.state!=='SHADOW_STALE'),
   superseded_events:events.filter(x=>x.state==='SHADOW_STALE')};
 });
 const past=settlements.filter(e=>
  e?.event_kind==='owner_independent_original_job_final_receipt'&&
  e.source_kind==='SERVICE_VERIFIED_OWNER_SCOPED_EXISTING_FINAL_RECEIPT_LEDGER'&&
  e.original_job_completed===true&&e.production_changed===false&&
  WORK.test(e.original_work_id||'')&&UUID.test(e.independent_settlement_event_id||'')&&
  SHA.test(e.installed_commit_sha||'')&&Number.isFinite(Date.parse(e.assertion_time||''))
 ).slice(0,5).map(e=>({original_work_id:e.original_work_id,verified_at:e.assertion_time,
  installed_commit_sha:e.installed_commit_sha,receipt_id:e.independent_settlement_event_id,
  shift_membership_not_inferred:true}));
 return Object.freeze({
  schema:'reality-chat-operational-time-horizon-v1',
  past:{independent_original_settlements:past,not_current_shift_completion:true,
   source_status:past.length?'VERIFIED_RECEIPTS_AVAILABLE':'NO_VERIFIED_RECEIPT_RETURNED'},
  present:{status:!available?'CURRENT_READBACK_UNKNOWN':
    c.unverified_guard_count>0||entries.length!==c.observations.length?
     'CURRENT_READBACK_PARTIAL':'CURRENT_READBACK_VERIFIED',
   observed_at:available?c.observed_at:null,
   active_shift_count:available?c.active_shift_count:null,
   unverified_guard_count:available?c.unverified_guard_count:null,obligations,
   missing_evidence_is_unknown_not_absence:true},
  future:{status:available?'EVIDENCE_SCOPED_NEXT_ACTIONS':'CURRENT_EVIDENCE_REQUIRED',
   obligations:obligations.map(o=>({original_work_id:o.original_work_id,
    shift_id:o.shift_id,revision:o.continuity_revision,
    next_action:o.operational_next_action,qualifier_next_action:o.qualifier_next_action,
    pending_signals:o.current_events.filter(e=>e.state==='SHADOW_PENDING'),
    unresolved_proof_gates:o.unresolved_proof_gates})),
   next_action_is_not_execution_authority:true},
  read_only:true,execution_authorized:false,installation_authorized:false,production_changed:false
 });
}

// Composition of already-existing, independently scoped owner readbacks.
 // An admitted source record is not automatically a current-state verdict:
 // a terminal, exact-original independent receipt supersedes that earlier
 // phase for conversational understanding only. No database write is made.
export function reconcileOwnerOriginalStatesForChat({
 ownerOriginalWork,finalObservations=[]
}={}){
 if(ownerOriginalWork?.status!=='OWNER_SCOPED_ORIGINAL_WORK_INDEPENDENT_READBACK'||
    !Array.isArray(ownerOriginalWork.jobs)||ownerOriginalWork.jobs.length>12)
  return null;
 const finals=new Map();
 for(const e of Array.isArray(finalObservations)?finalObservations.slice(0,35):[]){
  if(!/^work:[a-f0-9]{32}$/.test(e?.original_work_id||'')||
     e?.production_changed!==false)continue;
  const native=e.event_kind==='verified_original_job_temporal_projection'&&
    e.source_kind==='AUTHENTICATED_OWNER_SCOPED_EXISTING_CONTINUITY_AND_ORIGINAL_DB_READBACK'&&
    e.independent_original_settlement_verified===true&&
    e.original_job_completed===true&&UUID.test(e.original_final_receipt_id||'');
  const owner=e.event_kind==='owner_independent_original_job_final_receipt'&&
    e.source_kind==='SERVICE_VERIFIED_OWNER_SCOPED_EXISTING_FINAL_RECEIPT_LEDGER'&&
    e.original_job_completed===true&&
    UUID.test(e.independent_settlement_event_id||'');
  if(native||owner)finals.set(e.original_work_id,{
   receipt_ref:native?'supabase:original-final:'+e.original_final_receipt_id:
    e.source_ref,
   settlement_observed_at:e.assertion_time||null
  });
 }
 const contradictions=[];
 const jobs=ownerOriginalWork.jobs.map(j=>{
  const proof=finals.get(j.original_work_id);
  if(!proof||j.independently_settled===true)return j;
  contradictions.push({
   original_work_id:j.original_work_id,
   source_admission_phase:j.phase,
   verified_final_receipt_ref:proof.receipt_ref,
   issue:'PRE_SETTLEMENT_SOURCE_PROJECTION_DISAGREES_WITH_TERMINAL_RECEIPT'
  });
  return {
   ...j,source_admission_phase:j.phase,
   effective_conversational_phase:'INDEPENDENTLY_SETTLED_WITH_TERMINAL_RECEIPT',
   independently_settled:true,
   original_final_receipt_ref:proof.receipt_ref,
   requires_independent_completion_verification:false
  };
 });
 const remaining=jobs.filter(j=>j.independently_settled!==true).length;
 return Object.freeze({
  status:'READ_ONLY_OWNER_CROSS_LEDGER_RECONCILIATION',
  source_readback_status:ownerOriginalWork.status,
  current_shift_id:ownerOriginalWork.current_shift_id,
  jobs,original_admission_unfinished_count:ownerOriginalWork.observed_unfinished_count,
  effectively_unsettled_original_count:remaining,
  source_projection_disagreements:contradictions,
  precedence:'EXACT_ORIGINAL_INDEPENDENT_FINAL_RECEIPT_OVER_EARLIER_SOURCE_ADMISSION',
  no_final_receipt_inference_from_missing_source:true,
  work_execution_authorized:false,installation_authorized:false,
  production_changed:false
 });
}
