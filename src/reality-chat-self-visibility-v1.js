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
});
const relevant=text=>/\b(reality|itself|own|existing|already|your|system|capability|engine|authorization|verification|governance|drift|roi|inspection|architecture|source|code|self)\b/i.test(text||'')&&
 /\b(capabilit|authorization|verification|govern|existing|already|architect|inspect|engine|system|source|code|roi|drift|self|ability|abilities|upgrade|what can|what do you have)\b/i.test(text||'');
export function needsRealityCapabilityInspection(message,priorTurns=[]){
 if(typeof message!=='string'||!message.trim())return false;
 if(relevant(message))return true;
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
  inspection:['self-inspect','self-audit','system-access','capability-operating','registry'],
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
export async function readRealitySelfVisibilityForChat({
 session,message,priorTurns=[],env=process.env,db=null,
 fetchImpl=fetch,callRpc=shiftRpc,
 readSource=sourceManifest,readAudit=ownerAudit
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
 const [source,audit]=await Promise.all([
  bounded(sourcePending),bounded(auditPending)
 ]);
 const observations=[];
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
    ' This self-inspection does NOT authorize changes.',
   capabilities:audit.capabilities,
   owner_active_shift_count:audit.active_owner_shift_count,
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
