// Reality construction pilot: source-preserving intake + deterministic read model.
// No model, external business system, customer contact, source authentication
// or completion claim. Scenario records are synthetic until independently linked.
import {createHash} from 'node:crypto';
import {createOperationalSituation,validateOperationalSituation}
 from './operational-situation-v1.0.js';

export const CONSTRUCTION_MESSY_PILOT_VERSION='reality-construction-messy-signal-pilot-v1.0';
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'
 ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const sha=x=>'sha256:'+createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const txt=x=>typeof x==='string'&&x.trim().length>0;
const fail=x=>{throw Error(x)};
const day=x=>Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const field=x=>String(x||'').slice(0,180);
const keyOf=c=>JSON.stringify([c.entity_ref,c.state_key]);
const list=x=>Array.isArray(x)?x:[];

export function reconcileConstructionWorkday({
 worldId,projectId,signals=[],requests=[],asOf,
}={}){
 if(!txt(worldId)||!txt(projectId)||!day(asOf)||
  !Array.isArray(signals)||signals.length>80||
  !Array.isArray(requests)||requests.length>30)
  fail('CONSTRUCTION_PILOT_INPUTS_INVALID');
 const now=Date.parse(asOf);
 const byId=new Map(),claims=new Map(),evidence=[],ignored=[],issues=[];
 const ordered=signals.slice().sort((a,b)=>
  Date.parse(a.received_at)-Date.parse(b.received_at)||
  String(a.signal_id).localeCompare(String(b.signal_id)));
 for(const s of ordered){
  if(!txt(s?.signal_id)||!txt(s?.project_id)||!txt(s?.source_ref)||
   !txt(s?.channel)||!txt(s?.body)||!day(s.received_at)||
   s.body.length>4000||!Array.isArray(s.claims)||s.claims.length>12)
   fail('CONSTRUCTION_SIGNAL_INVALID');
  if(Date.parse(s.received_at)>now){ignored.push({signal_id:s.signal_id,
    reason:'FUTURE_SIGNAL_NOT_ADMISSIBLE'});continue;}
  if(s.project_id!==projectId){ignored.push({signal_id:s.signal_id,
    reason:'OTHER_PROJECT_EXCLUDED'});continue;}
  const digest=sha(s);
  if(byId.has(s.signal_id)){
   if(byId.get(s.signal_id)!==digest)
    fail('CONSTRUCTION_SIGNAL_IDENTITY_COLLISION');
   ignored.push({signal_id:s.signal_id,reason:'IDENTICAL_REPLAY'});
   continue;
  }
  byId.set(s.signal_id,digest);
  const receipt={signal_id:s.signal_id,source_ref:s.source_ref,
   channel:s.channel,received_at:day(s.received_at),
   original_body_hash:sha(s.body),full_signal_hash:digest,
   source_authentication:'NOT_ESTABLISHED',
   observed_fact_not_proven:true};
  evidence.push(receipt);
  for(const c of s.claims){
   if(!txt(c?.entity_ref)||!txt(c?.state_key)||
    !['OBSERVED_REPORT','CLAIMED_APPROVAL','REQUESTED_ACTION','SOURCE_RECORD'].includes(c?.report_kind)||
    !['STRING','NUMBER','BOOLEAN'].includes(c?.value_type)||
    (c.value_type==='NUMBER'&&(!Number.isFinite(c.value)))||
    (c.value_type==='STRING'&&(!txt(c.value)||c.value.length>200))||
    (c.value_type==='BOOLEAN'&&typeof c.value!=='boolean'))
    fail('CONSTRUCTION_STRUCTURED_REPORT_INVALID');
   const k=keyOf(c),old=claims.get(k)||[];
   old.push({entity_ref:c.entity_ref,state_key:c.state_key,
    value:c.value,value_type:c.value_type,report_kind:c.report_kind,
    source_ref:s.source_ref,signal_id:s.signal_id,source_hash:digest,
    received_at:day(s.received_at),source_authenticated:false});
   claims.set(k,old);
  }
 }
 const facts=[],conflicts=[];
 for(const [k,rows] of [...claims.entries()].sort(([a],[b])=>a.localeCompare(b))){
  const unique=new Set(rows.map(r=>sha([r.value_type,r.value])));
  const classification=unique.size>1?'CONTRADICTORY_REPORTS':
   rows.some(r=>r.report_kind==='CLAIMED_APPROVAL')?
    'AUTHORITY_CLAIM_UNVERIFIED':'REPORTED_NOT_INDEPENDENTLY_VERIFIED';
  const group={entity_ref:rows[0].entity_ref,state_key:rows[0].state_key,
   status:classification,
   candidate_values:[...new Map(rows.map(r=>[sha([r.value_type,r.value]),r.value])).values()],
   source_receipts:rows.map(r=>r.signal_id),source_authentication_verified:false,
   truth_established:false,material_action_authorized:false};
  if(unique.size>1)conflicts.push(group);
  else facts.push(group);
 }
 const created=[];
 for(const req of requests){
  if(!txt(req?.request_id)||!txt(req?.summary)||!txt(req?.project_id)||
    !['PREPARE_DRAFT','SEND','PURCHASE','SCHEDULE','UPDATE_LEDGER','FILE_PERMIT'].includes(req?.operation))
   fail('CONSTRUCTION_WORK_REQUEST_INVALID');
  if(req.project_id!==projectId){
   ignored.push({request_id:req.request_id,reason:'OTHER_PROJECT_EXCLUDED'});continue;
  }
  const risk=req.operation==='PREPARE_DRAFT'?'PREPARATION_ONLY':
   'CONSEQUENTIAL_EFFECT_NOT_AUTHORIZED';
  const relevant=Array.isArray(req.related_keys)?req.related_keys:[];
  const unresolved=conflicts.filter(c=>relevant.includes(c.state_key));
  const missing=Array.isArray(req.prerequisites)?req.prerequisites.map(p=>{
   const rows=claims.get(JSON.stringify([p.entity_ref,p.state_key]))||[];
   const matches=rows.filter(x=>x.value===p.required_value);
   return matches.length&&p.requires_independent_source!==false
     ?{state_key:p.state_key,status:'REPORTED_NOT_AUTHENTICATED',source_receipts:matches.map(x=>x.signal_id)}
     :{state_key:p.state_key,status:matches.length?'SOURCE_AUTHENTICATION_REQUIRED':'REQUIRED_EVIDENCE_MISSING',
       source_receipts:matches.map(x=>x.signal_id)};
  }):[];
  const situation=createOperationalSituation({
   situationId:'construction:'+sha([worldId,projectId,req.request_id]).slice(7,31),
   observedTrigger:{description:req.summary,source:'SYNTHETIC_WORKDAY_REQUEST',
    provenance:{request_id:req.request_id,project_id:projectId}},
   consequence:{description:'Unapproved work can cause customer, cost or schedule damage',
    materiality:'REVIEW_REQUIRED'},
   desiredOutcome:'Prepare source-backed options; execute only after scoped verified approval',
   owner:'construction:pilot-owner',
   evidence:relevant.flatMap(k=>[...claims.values()].flat().filter(c=>c.state_key===k)
    .map(c=>c.signal_id)).filter((x,i,a)=>a.indexOf(x)===i),
   missingEvidence:missing.map(x=>x.state_key),
   uncertainty:{state:'UNRESOLVED',known_unknowns:unresolved.map(c=>c.state_key)},
   authority:{status:'UNVERIFIED',required_decision_maker:'AUTHENTICATED_AUTHORIZED_OWNER',
    authorization_ref:null},
   action:{proposed:req.operation,approval_ref:null},
   observedAt:asOf,
  });
  if(!validateOperationalSituation(situation).valid)fail('CONSTRUCTION_SITUATION_INVALID');
  created.push({request_id:req.request_id,summary:req.summary,operation:req.operation,
   project_id:projectId,
   status:req.operation==='PREPARE_DRAFT'?'DRAFT_ELIGIBLE_REVIEW_REQUIRED':'EXTERNAL_ACTION_BLOCKED',
   candidate_action:req.operation,
   blockers:[...unresolved.map(x=>({kind:'SOURCE_CONFLICT',key:x.state_key})),
    ...missing.map(x=>({kind:'PRECONDITION_UNVERIFIED',key:x.state_key})),
    ...(risk==='CONSEQUENTIAL_EFFECT_NOT_AUTHORIZED'?
      [{kind:'EXTERNAL_AUTHORITY_NOT_VERIFIED',key:req.operation}]:[])],
   situation_id:situation.situation_id,situation_state:situation.state,
   source_receipts:situation.evidence,external_action_executed:false,
   verified_cost_savings_usd:null,verified_hours_saved:null});
 }
 const body={version:CONSTRUCTION_MESSY_PILOT_VERSION,
  world_id:worldId,project_id:projectId,as_of:day(asOf),
  test_basis:'SYNTHETIC_PREVIEW_INPUTS_NOT_LIVE_CONTRACTOR_RECORDS',
  ingested_signal_count:evidence.length,
  ignored_signals:ignored,ingestion_receipts:evidence,
  contradictory_report_count:conflicts.length,conflicts,reported_claim_groups:facts,
  work_items:created,external_actions_performed:0,
  pending_authority_checks:created.filter(x=>x.status==='EXTERNAL_ACTION_BLOCKED').length,
  verified_customer_time_saved_hours:null,verified_revenue_protected_usd:null,
  reliability_claim:'BOUNDED_SOURCE_RECONCILIATION_ONLY_NOT_SEMANTIC_TRUTH_OR_REAL_AUTOMATION',
 };
 return Object.freeze({...body,receipt_hash:sha(body)});
}
