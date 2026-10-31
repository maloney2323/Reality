// Reality's shared self-repair intelligence. All evidence here comes from the
// existing, independently verified constitutional journal or verified provider
// failure readback. This is a strategy service, NEVER a second work controller.
import {createHash} from 'node:crypto';
import {verifySelfImprovementJournal}
 from './reality-governed-self-improvement-spine-v1.0.js';

export const REALITY_SELF_REPAIR_STRATEGY_VERSION='reality-self-repair-strategy-v1.0';
const hash=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex');
const work=x=>typeof x==='string'&&/^work:[0-9a-f]{32}$/.test(x);
const clean=s=>String(s||'').replace(/[\u0000-\u001f]/g,' ').slice(0,160);
export function extractVerifiedFailureAssertions(output){
 const value=String(output||'').slice(0,22000);
 const names=[...value.matchAll(/^\s*not ok\s+\d+\s+-\s+([^\r\n]{1,140})/gm)]
  .map(x=>clean(x[1])).filter(Boolean);
 // Avoid promoting test stdout into execution instructions or authority.
 const expected=[...value.matchAll(/^\s*-\s+('?[\w._:-]{2,70}'?)/gm)]
  .slice(0,6).map(x=>clean(x[1]));
 const actual=[...value.matchAll(/^\s*\+\s+('?[\w._:-]{2,70}'?)/gm)]
  .slice(0,6).map(x=>clean(x[1]));
 return Object.freeze({failing_tests:[...new Set(names)].slice(0,12),
  expected_values:expected,actual_values:actual});
}
function tactics(names){
 const joined=names.join(' ').toLowerCase();
 const actions=[];
 if(/provenance|evidence|hash|attestation|source/.test(joined))
  actions.push('Separate INSUFFICIENT_EVIDENCE from MISSING_CAPABILITY: reject absent, incomplete and non-provider provenance BEFORE capability classification.');
 if(/foreign|repository|head sha|owner|goal|contamination|scope/.test(joined))
  actions.push('Compare every repository, owner, goal and run SHA to independently supplied expected scope; reject foreign evidence before any generation permission.');
 if(/supersed|stale|successful run|green/.test(joined))
  actions.push('Check chronological provider outcome and any superseding success BEFORE deciding that an older failed run requires a repair.');
 if(/approval|authorization|settlement|install/.test(joined))
  actions.push('Keep model proposals separate from owner approval, actual installation, resumption and settlement; demand distinct independent provider readbacks.');
 if(/syntax|import|module/.test(joined))
  actions.push('Check actual module exports, imports and syntax before running the frozen acceptance suite.');
 if(!actions.length)
  actions.push('Use failing frozen assertions to repair the implementation and independently retest negative as well as positive cases.');
 return actions;
}
function projection({originalWorkId,attemptCount,attemptLimit,failures,headHash}){
 if(!work(originalWorkId)||!Number.isInteger(attemptCount)||attemptCount<0||
  !Number.isInteger(attemptLimit)||attemptLimit<1||
  !Array.isArray(failures)||!failures.every(f=>
    f&&typeof f.evidence_ref==='string'&&f.evidence_ref.length>8&&
    typeof f.output==='string'))
  throw Error('REALITY_SELF_REPAIR_VERIFIED_PROVIDER_EVIDENCE_REQUIRED');
 const parsed=failures.map(f=>({ref:f.evidence_ref,
  ...extractVerifiedFailureAssertions(f.output)}));
 const count=new Map();
 for(const p of parsed)for(const name of p.failing_tests){
  count.set(name,(count.get(name)||0)+1);
 }
 const recurrent=[...count].filter(([,n])=>n>=2).map(([n])=>n).slice(0,10);
 const latest=parsed.at(-1)||{failing_tests:[],expected_values:[],actual_values:[]};
 const last=failures.at(-1);
 const all=[...new Set([...latest.failing_tests,...recurrent])].slice(0,12);
 const chronic=recurrent.length>0;
 const exhausted=attemptCount>=attemptLimit;
 const strategy=exhausted?'EVIDENCE_BOUND_REDESIGN_REQUIRED':
  chronic?'SYSTEMIC_VALIDATION_REDESIGN':'TARGETED_ASSERTION_REPAIR';
 const plan={
  version:REALITY_SELF_REPAIR_STRATEGY_VERSION,
  kind:'VERIFIED_SELF_REPAIR_STRATEGY',
  original_work_id:originalWorkId,
  source:'CONSTITUTIONAL_INDEPENDENT_PROVIDER_READBACK',
  checkpoint_hash:headHash||null,
  attempt_count:attemptCount,attempt_limit:attemptLimit,
  strategy,recurring_failures:recurrent,
  latest_failing_tests:latest.failing_tests,
  expected_values:latest.expected_values,actual_values:latest.actual_values,
  root_cause_hypotheses:tactics(all),
  evidence_refs:[...new Set(failures.map(f=>f.evidence_ref))].slice(-8),
  source_correction_recommended:true,
  model_may_propose:!exhausted,
  automatic_reexecution_permitted:!exhausted,
  installation_authorized:false,external_actions_authorized:false,
  original_job_completed:false,production_changed:false,
 };
 return Object.freeze({...plan,
  strategy_hash:hash({originalWorkId,headHash,strategy,
   tactics:plan.root_cause_hypotheses,refs:plan.evidence_refs}),
  discovered_work:Object.freeze({
   kind:'CAPABILITY_BUILD',category:'upgrades_and_improvements',
   original_work_id:originalWorkId,
   status:exhausted?'BLOCKED_REQUIRES_NEW_AUTHORITY':'REPAIR_PROPOSED',
   priority:'HIGH',
   evidence_refs:plan.evidence_refs,
   do_not_create_duplicate_original_work:true,
   execution_authorized:false,
  }),
 });
}
export function strategyFromConstitutionalJournal(state){
 verifySelfImprovementJournal(state);
 const failures=state.journal.filter(e=>
  e.kind==='SANDBOX_FAILED'&&
  e.body?.verified_by==='TRUSTED_PROVIDER_ADAPTER'&&
  typeof e.body?.diagnostics?.output==='string'&&
  typeof e.evidence_ref==='string').map(e=>({
   evidence_ref:e.evidence_ref,output:e.body.diagnostics.output,
  }));
 if(state.phase==='REPAIR_REQUIRED'&&failures.length<1)
  throw Error('REALITY_SELF_REPAIR_MISSING_INDEPENDENT_FAILURE');
 return projection({originalWorkId:state.scope.original_work_id,
  attemptCount:state.attempt_count,attemptLimit:state.attempt_limit,
  failures,headHash:state.head_hash});
}
export function strategyFromVerifiedFailureSummary({
 originalWorkId,attemptCount,attemptLimit,checkpointHash,
 evidenceRef,diagnostics,
}={}){
 if(typeof evidenceRef!=='string'||!evidenceRef.startsWith('vercel:provider-verified:')||
  typeof checkpointHash!=='string'||!(/^[a-f0-9]{64}$/).test(checkpointHash))
  throw Error('REALITY_SELF_REPAIR_INDEPENDENT_SUMMARY_NOT_VERIFIED');
 return projection({originalWorkId,attemptCount,attemptLimit,
  failures:[{evidence_ref:evidenceRef,output:diagnostics||''}],
  headHash:checkpointHash});
}
