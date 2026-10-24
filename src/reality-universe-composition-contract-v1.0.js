// Reality Universe composition and governance V1.
// Scope: deterministic, read-only sandbox *contracts*. Not a production
// planner, human approval, actual source proof, code-signing, or superintelligence.
// This module refuses graph cycles, provenance leaks and unsupported claims.
// Uncalibrated likelihood is an unknown, NOT a synthetic certainty score.
import {createHash} from 'node:crypto';
import {createUniverseEntry,validateUniverseEntry} from './reality-universe-persistence-contract-v1.0.js';

export const COMPOSITION_CONTRACT_VERSION='reality-universe-composition-v1.0';
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'
 ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const hash=x=>'sha256:'+createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const err=s=>{throw Error(s)};
const iso=x=>Number.isFinite(Date.parse(x))?new Date(x).toISOString():err('COMPOSITION_TIME_INVALID');
const scopeOf=x=>{
 if(!x||!nonempty(x.continuity_root_id)||!nonempty(x.worldline_id)||
  !nonempty(x.owner_user_id)||!nonempty(x.work_item_id)||
  !x.as_of)err('COMPOSITION_SCOPE_REQUIRED');
 return {continuity_root_id:x.continuity_root_id,worldline_id:x.worldline_id,
  owner_user_id:x.owner_user_id,work_item_id:x.work_item_id,as_of:iso(x.as_of)};
};
const sameScope=(a,b)=>['continuity_root_id','worldline_id',
 'owner_user_id','work_item_id'].every(k=>a?.[k]===b?.[k]);
const sameEntryScope=(e,s)=>e?.continuity_root_id===s.continuity_root_id&&
 e?.worldline_id===s.worldline_id&&
 e?.provenance?.owner_user_id===s.owner_user_id&&
 e?.provenance?.work_item_id===s.work_item_id;
const TYPES=new Set(['STRING','NUMBER','BOOLEAN','REPORTS','GATE','INVENTORY','SCHEDULE']);
const port=x=>{
 if(!nonempty(x?.name)||!TYPES.has(x?.type))err('COMPOSITION_PORT_INVALID');
 return {name:x.name,type:x.type};
};
const refs=x=>Array.isArray(x)&&x.length&&x.every(nonempty);
const probability=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1;
function formIntegrity(form){
 if(!form||form.version!==COMPOSITION_CONTRACT_VERSION||
  !nonempty(form.form_id)||!nonempty(form.content_hash))
   err('COMPOSITION_FORM_INVALID');
 const {content_hash,...body}=form;
 if(hash(body)!==content_hash)err('COMPOSITION_FORM_HASH_MISMATCH');
 scopeOf(form.scope);
 if(!Array.isArray(form.inputs)||!form.output||!Array.isArray(form.parents))
   err('COMPOSITION_FORM_PORTS_REQUIRED');
 return form;
}
// The capability interface is content addressed. These are proposed
// capabilities, not automatically promoted/authorized Intelligence Forms.
export function defineAtomicForm({
 formId,scope,inputs,output,parents=[],competence,
 handlerId,epistemic,
}={}){
 const s=scopeOf(scope);
 if(!nonempty(formId)||!nonempty(competence)||!nonempty(handlerId)||
  !Array.isArray(inputs)||inputs.length>20||!Array.isArray(parents)||
  parents.length>20)err('COMPOSITION_FORM_FIELDS_INVALID');
 const ports=inputs.map(port),out=port(output);
 if(new Set(ports.map(p=>p.name)).size!==ports.length)
  err('COMPOSITION_DUPLICATE_PORT');
 const edges=parents.map(x=>{
  if(!nonempty(x?.parent_id)||!nonempty(x?.input_name))
   err('COMPOSITION_PARENT_INVALID');
  if(!ports.some(p=>p.name===x.input_name))
   err('COMPOSITION_EDGE_INPUT_INVALID');
  return {parent_id:x.parent_id,input_name:x.input_name};
 });
 if(new Set(edges.map(x=>x.input_name)).size!==edges.length)
  err('COMPOSITION_DUPLICATE_BINDING');
 if(!epistemic||!['CALIBRATED_EVENT_BOUNDS','UNKNOWN'].includes(epistemic.kind))
  err('COMPOSITION_EPISTEMIC_KIND_REQUIRED');
 const bounds=epistemic.kind==='CALIBRATED_EVENT_BOUNDS'
  &&probability(epistemic.lower)&&probability(epistemic.upper)
  &&epistemic.lower<=epistemic.upper&&refs(epistemic.calibration_receipts)
   ?{kind:epistemic.kind,lower:epistemic.lower,upper:epistemic.upper,
     calibration_receipts:[...epistemic.calibration_receipts]}
   :{kind:'UNKNOWN',lower:0,upper:1,calibration_receipts:[]};
 const body={version:COMPOSITION_CONTRACT_VERSION,form_id:formId,
  scope:s,kind:'ATOMIC_FORM_CONTRACT',competence,inputs:ports,output:out,
  parents:edges,handler_id:handlerId,epistemic:bounds,
  allowed_effects:[],state:'CANDIDATE',
  independently_verified_competence:false,
  production_authority_granted:false};
 return Object.freeze({...body,content_hash:hash(body)});
}
// Conservative Fréchet bounds for a conjunction; no independent-event
// assumption or multiplying model-reported confidence percentages.
// Requires genuine calibration for any inference at all. A joint lower
// bound is NOT substitute for signed scope or official inspection evidence.
export function propagateBoundedEpistemicInterval(forms){
 if(!Array.isArray(forms)||!forms.length)err('COMPOSITION_INTERVAL_FORMS_REQUIRED');
 forms.forEach(formIntegrity);
 if(forms.some(f=>f.epistemic.kind!=='CALIBRATED_EVENT_BOUNDS'))
  return Object.freeze({lower:0,upper:1,kind:'UNKNOWN_UNCALIBRATED',
   assumption:'NONE',usable_for_autonomous_authority:false});
 const n=forms.length;
 const lower=Math.max(0,forms.reduce((s,f)=>s+f.epistemic.lower,0)-(n-1));
 const upper=Math.min(...forms.map(f=>f.epistemic.upper));
 return Object.freeze({lower:Math.max(0,Number(lower.toFixed(12))),
  upper:Number(upper.toFixed(12)),
  kind:'FRECHET_CONJUNCTION_BOUNDS',
  assumption:'MARGINAL_EVENT_BOUNDS_ONLY_NO_INDEPENDENCE',
  usable_for_autonomous_authority:false});
}
export function compileFormDAG({forms,targetId,scope}={}){
 const trusted=scopeOf(scope);
 if(!Array.isArray(forms)||!forms.length||forms.length>128||!nonempty(targetId))
  err('COMPOSITION_GRAPH_REQUIRED');
 const map=new Map();
 for(const f of forms){
  formIntegrity(f);
  if(!sameScope(trusted,f.scope))err('COMPOSITION_SCOPE_MISMATCH');
  if(map.has(f.form_id))err('COMPOSITION_DUPLICATE_ID');
  map.set(f.form_id,f);
 }
 if(!map.has(targetId))err('COMPOSITION_TARGET_MISSING');
 const order=[],visited=new Set(),visiting=new Set();
 function dfs(id){
  if(visiting.has(id))err('COMPOSITION_CYCLE_REJECTED');
  if(visited.has(id))return;
  const f=map.get(id);if(!f)err('COMPOSITION_DEPENDENCY_MISSING');
  visiting.add(id);
  for(const edge of f.parents){
   const parent=map.get(edge.parent_id);
   if(!parent)err('COMPOSITION_DEPENDENCY_MISSING');
   const port=f.inputs.find(p=>p.name===edge.input_name);
   dfs(parent.form_id);
   if(port.type!==parent.output.type)err('COMPOSITION_TYPE_MISMATCH');
  }
  visiting.delete(id);visited.add(id);order.push(id);
 }
 dfs(targetId);
 const reachable=order.map(id=>map.get(id));
 const interval=propagateBoundedEpistemicInterval(reachable);
 const material={version:COMPOSITION_CONTRACT_VERSION,
  target_id:targetId,scope:trusted,ordered_form_ids:order,
  dependency_hashes:reachable.map(x=>x.content_hash),
  epistemic_interval:interval,
  status:'DRAFT_COMPOSITION_NOT_VERIFIED',
  allowed_effects:[],externally_authorized:false};
 return Object.freeze({...material,composition_id:'composition:'+hash(material).slice(7,39),
  manifest_hash:hash(material)});
}
function trustedBindings(plan,forms,input){
 const dict=new Map(forms.map(x=>[x.form_id,x]));
 const val=new Map();
 const freezeArg=x=>structuredClone(x);
 for(const id of plan.ordered_form_ids){
  const f=dict.get(id);const vals={};
  for(const p of f.inputs){
   const edge=f.parents.find(e=>e.input_name===p.name);
   if(edge)vals[p.name]=val.get(edge.parent_id);
   else if(Object.hasOwn(input,p.name))vals[p.name]=freezeArg(input[p.name]);
   else err('COMPOSITION_MISSING_TYPED_INPUT');
  }
  val.set(id,vals);
 }
 return val;
}
// No external tools, sends, database write or material effect adapter is
// provided by this runner. ONLY pre-registered, trusted, pure handlers should
// be passed. True isolation of arbitrary generated code requires a separate
// OS/container/WASM sandbox (not implemented here).
export async function runCompositionSandbox({
 plan,forms,scope,input,registeredHandlers,revocationEvents=[],
 validAt,knownAt,threshold=0.95,
}={}){
 const trusted=scopeOf(scope);
 if(!plan||plan.status!=='DRAFT_COMPOSITION_NOT_VERIFIED'||
  !sameScope(plan.scope,trusted)||
  !Array.isArray(registeredHandlers)||!Number.isFinite(threshold)||
  threshold<0||threshold>1)
  err('COMPOSITION_SANDBOX_INPUT_REQUIRED');
 const compiled=compileFormDAG({forms,targetId:plan.target_id,scope:trusted});
 if(compiled.manifest_hash!==plan.manifest_hash)err('COMPOSITION_PLAN_STALE');
 const revocations=computeRevocationClosure({
  forms,revocationEvents,scope:trusted,validAt,knownAt,
 });
 const compromised=plan.ordered_form_ids.filter(id=>revocations.suspended_ids.includes(id));
 if(compromised.length)
  return Object.freeze({status:'SUSPENDED_DEPENDENCY',
   affected_forms:compromised,reason:'TRANSITIVE_REVOCATION',
   executed_handlers:0,external_actions:0});
 const handlers=new Map(registeredHandlers.map(h=>[h.id,h]));
 const args=trustedBindings(plan,forms,input||{});
 const values=new Map(),trace=[];
 for(const id of plan.ordered_form_ids){
  const f=forms.find(x=>x.form_id===id),handler=handlers.get(f.handler_id);
  if(!handler||handler.trusted_pure_sandbox!==true||
   typeof handler.execute!=='function')
   err('COMPOSITION_TRUSTED_SANDBOX_HANDLER_REQUIRED');
  const vals=args.get(id);
  for(const edge of f.parents)vals[edge.input_name]=structuredClone(values.get(edge.parent_id));
  const result=await handler.execute(structuredClone(vals));
  if(!result||typeof result!=='object'||result.type!==f.output.type)
   err('COMPOSITION_OUTPUT_TYPE_VIOLATION');
  values.set(id,structuredClone(result.value));
  trace.push({id,handler_id:f.handler_id,output_hash:hash(result.value)});
 }
 const uncertainty=plan.epistemic_interval;
 return Object.freeze({
  status:'SANDBOX_COMPOSED_DRAFT_ONLY',
  target_id:plan.target_id,
  result:structuredClone(values.get(plan.target_id)),
  execution_trace:trace,
  epistemic_interval:uncertainty,
  permission_decision:uncertainty.kind==='UNKNOWN_UNCALIBRATED'||
   uncertainty.lower<threshold
    ?'EPISTEMIC_HUMAN_REVIEW_REQUIRED'
    :'EVIDENCE_AND_AUTHORIZATION_STILL_REQUIRED',
  valid_at:iso(validAt),known_at:iso(knownAt),
  externally_authorized:false,live_send_executed:false,
  customer_data_mutated:false,external_actions:0,
 });
}
export function createBitemporalGhostFork({
 entries,scope,validAt,knownAt,mutations=[],
}={}){
 const trusted=scopeOf(scope),v=iso(validAt),k=iso(knownAt);
 if(!Array.isArray(entries)||entries.length>1000||
  !Array.isArray(mutations)||mutations.length>30)
  err('GHOST_INVALID_INPUT');
 const source=entries.filter(e=>{
  validateUniverseEntry(e);
  return sameEntryScope(e,trusted)&&
   Date.parse(e.effective_time)<=Date.parse(v)&&
   Date.parse(e.assertion_time)<=Date.parse(k)&&
   e.event_kind==='OPERATIONAL_SNAPSHOT';
 }).sort((a,b)=>Date.parse(a.effective_time)-Date.parse(b.effective_time)||
  Date.parse(a.assertion_time)-Date.parse(b.assertion_time));
 if(!source.length)err('GHOST_NO_AS_OF_SNAPSHOT');
 const latest=source.at(-1);
 const state=structuredClone(latest.payload.state);
 if(!state||typeof state!=='object'||Array.isArray(state))
  err('GHOST_SOURCE_STATE_INVALID');
 const originalHash=hash(state);
 for(const mutation of mutations){
  if(!/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(mutation?.field))
   err('GHOST_MUTATION_NOT_ALLOWLISTED');
  if(typeof mutation.value==='function'||typeof mutation.value==='undefined')
   err('GHOST_MUTATION_INVALID_VALUE');
  // Mutations limited to *existing top-level fields*; never add new
  // asserted source facts or change immutable historical entries.
  if(!Object.hasOwn(state,mutation.field))err('GHOST_MUTATION_UNKNOWN_FIELD');
  state[mutation.field]=structuredClone(mutation.value);
 }
 return Object.freeze({
  mode:'HISTORICAL_COUNTERFACTUAL_SIMULATION',
  source_snapshot_entry_id:latest.entry_id,
  source_snapshot_hash:latest.ledger_entry_hash,
  valid_at:v,known_at:k,source_hash:originalHash,
  fork_hash:hash({source_hash:originalHash,mutations,state}),
  hypothetical_state:state,
  mutation_count:mutations.length,
  historical_entry_unchanged:true,
  live_tool_calls_allowed:false,authentic_outcome_observed:false,
 });
}
export function makeRevocationSignal({
 scope,formId,reason,validAt,knownAt,sourceReceipt,
}={}){
 const trusted=scopeOf(scope);
 if(!nonempty(formId)||!nonempty(reason)||!nonempty(sourceReceipt))
  err('REVOCATION_EVIDENCE_REQUIRED');
 return createUniverseEntry({
  entry_id:'revocation:'+hash([trusted,formId,reason,validAt,knownAt,sourceReceipt]).slice(7,39),
  continuity_root_id:trusted.continuity_root_id,worldline_id:trusted.worldline_id,
  event_kind:'CAPABILITY_REVOKED',epistemic_kind:'OBSERVATION',
  assertion_time:iso(knownAt),effective_time:iso(validAt),
  source_ref:'universe:independently-adjudicated-revocation',
  payload:{form_id:formId,reason,source_receipt:sourceReceipt,
   execution_authority_granted:false},
  evidence_references:[sourceReceipt],
  provenance:{source:COMPOSITION_CONTRACT_VERSION,
   owner_user_id:trusted.owner_user_id,work_item_id:trusted.work_item_id,
   authority:'NONE'},
 });
}
export function computeRevocationClosure({
 forms,revocationEvents=[],scope,validAt,knownAt,
}={}){
 const s=scopeOf(scope),v=Date.parse(iso(validAt)),k=Date.parse(iso(knownAt));
 if(!Array.isArray(forms)||!Array.isArray(revocationEvents))
  err('REVOCATION_GRAPH_REQUIRED');
 const map=new Map(forms.map(f=>{
  formIntegrity(f);if(!sameScope(s,f.scope))err('REVOCATION_SCOPE_MISMATCH');
  return [f.form_id,f];
 }));
 const revoked=new Set(),direct=[];
 for(const e of revocationEvents){
  validateUniverseEntry(e);
  if(e.event_kind!=='CAPABILITY_REVOKED')continue;
  if(!sameEntryScope(e,s))err('REVOCATION_FOREIGN_SCOPE_REJECTED');
  if(Date.parse(e.assertion_time)>k||Date.parse(e.effective_time)>v)continue;
  if(map.has(e.payload?.form_id)){
   revoked.add(e.payload.form_id);direct.push(e.payload.form_id);
  }
 }
 let changed=true;
 while(changed){
  changed=false;
  for(const f of map.values())
   if(!revoked.has(f.form_id)&&f.parents.some(p=>revoked.has(p.parent_id))){
    revoked.add(f.form_id);changed=true;
   }
 }
 return Object.freeze({direct_revoked_ids:[...new Set(direct)].sort(),
  suspended_ids:[...revoked].sort(),known_at:iso(knownAt),
  valid_at:iso(validAt),historical_entries_unchanged:true,
  ability_to_route_revoked_forms:false});
}
export function createCompositeFormCandidate({plan,proofRun,scope}={}){
 const trusted=scopeOf(scope);
 if(!plan||!proofRun||!sameScope(plan.scope,trusted)||
  proofRun.status!=='SANDBOX_COMPOSED_DRAFT_ONLY'||
  proofRun.target_id!==plan.target_id||
  proofRun.external_actions!==0)err('CRYSTALLIZATION_PROOF_INVALID');
 const basis={version:COMPOSITION_CONTRACT_VERSION,scope:trusted,
  parent_plan_id:plan.composition_id,
  parent_manifest_hash:plan.manifest_hash,
  dependency_hashes:[...plan.dependency_hashes],
  execution_receipt_hash:hash(proofRun.execution_trace),
  ephemeral_result_hash:hash(proofRun.result),
  state:'CANDIDATE_UNVERIFIED',
  independent_heldout_improvement:'NOT_MEASURED',
  independently_authorized_for_distribution:false,
  content_hash_is_not_signature:true,
  production_authority_granted:false,
 };
 return Object.freeze({...basis,
  candidate_form_id:'composite:'+hash(basis).slice(7,39),
  candidate_receipt_hash:hash(basis)});
}
export function calculateReasoningDelta({standalone,composed}={}){
 for(const item of [standalone,composed]){
  if(!item||item.independently_adjudicated!==true||
   !nonempty(item.assessment_receipt)||!Number.isInteger(item.cases)||
   item.cases<1||!Number.isInteger(item.correct)||item.correct<0||
   item.correct>item.cases||!Number.isInteger(item.invariant_violations)||
   item.invariant_violations<0||!Number.isInteger(item.false_facts)||
   item.false_facts<0||!Number.isInteger(item.tokens)||item.tokens<1||
   typeof item.latency_ms!=='number'||item.latency_ms<=0)
   return Object.freeze({status:'NOT_MEASURED_INDEPENDENTLY',
    operational_improvement_proven:false});
 }
 if(standalone.cases!==composed.cases)
  err('REASONING_DELTA_UNMATCHED_CASE_COUNT');
 const round=x=>Number(x.toFixed(6));
 return Object.freeze({status:'INDEPENDENTLY_ASSESSED_METRIC_DELTAS',
  sample_size:standalone.cases,
  accuracy_difference_pp:round(100*(composed.correct-standalone.correct)/composed.cases),
  change_in_invariant_violations:composed.invariant_violations-standalone.invariant_violations,
  change_in_unsupported_facts:composed.false_facts-standalone.false_facts,
  relative_total_tokens:round(composed.tokens/standalone.tokens),
  relative_total_latency:round(composed.latency_ms/standalone.latency_ms),
  composite_better_on_all_observed_dimensions:
   composed.correct>=standalone.correct&&
   composed.invariant_violations<=standalone.invariant_violations&&
   composed.false_facts<=standalone.false_facts&&
   composed.tokens<=standalone.tokens&&
   composed.latency_ms<=standalone.latency_ms&&
   (composed.correct>standalone.correct||
    composed.invariant_violations<standalone.invariant_violations||
    composed.false_facts<standalone.false_facts||
    composed.tokens<standalone.tokens||
    composed.latency_ms<standalone.latency_ms),
  superintelligence_proven:false,
 });
}
