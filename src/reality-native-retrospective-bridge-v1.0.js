// Reality-native retrospective link. No separate judge, no model calls.
// It maps the existing, owner-scoped Continuity replay finding to the original
// signed COMMITTED turn receipt, then reuses the SAME Reality native judge.
// A later candidate is NOT an independently proved model error.
import {createHash} from 'node:crypto';
import {validateUniverseEntry} from './reality-universe-persistence-contract-v1.0.js';
import {auditRealityJudgments,REALITY_NATIVE_JUDGE_VERSION}
 from './reality-native-judge-v1.0.js';

export const REALITY_RETROSPECTIVE_BRIDGE_VERSION='reality-native-retrospective-bridge-v1.0';
const hash=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=x=>{throw Error(x)};
const txt=x=>typeof x==='string'&&x.trim().length>0;

export function buildCommittedNativeRetrospectiveAudit({
 scope,currentJudgment,cognitionEntry,historicalCommitEntries=[],
}={}){
 if(!txt(scope?.continuity_root_id)||!txt(scope?.worldline_id)||
    currentJudgment?.version!==REALITY_NATIVE_JUDGE_VERSION||
    currentJudgment.continuity_root_id!==scope.continuity_root_id||
    cognitionEntry?.continuity_root_id!==scope.continuity_root_id||
    cognitionEntry?.worldline_id!==scope.worldline_id)
   fail('RETROSPECTIVE_SCOPE_OR_CURRENT_JUDGE_INVALID');
 validateUniverseEntry(cognitionEntry);
 if(!Array.isArray(historicalCommitEntries)||historicalCommitEntries.length>80)
   fail('RETROSPECTIVE_BOUNDED_READBACK_REQUIRED');
 const replay=cognitionEntry.payload?.conversation_trajectory?.findings||[];
 if(!Array.isArray(replay))fail('RETROSPECTIVE_REPLAY_INVALID');
 const bySource=new Map(),prior=[],observed=new Set();
 for(const entry of historicalCommitEntries){
  validateUniverseEntry(entry);
  if(entry.continuity_root_id!==scope.continuity_root_id||
     entry.worldline_id!==scope.worldline_id||
     entry.event_kind!=='REALITY_CAUSAL_TURN_RECEIPT')
   fail('RETROSPECTIVE_CROSS_SCOPE_COMMIT');
  if(entry.payload?.phase!=='COMMITTED')continue;
  const judge=entry.payload.native_judge_receipt;
  if(!judge)continue; // Old commits without a native judge cannot be rated.
  if(judge.version!==REALITY_NATIVE_JUDGE_VERSION||
     judge.continuity_root_id!==scope.continuity_root_id||
     !txt(entry.payload.assistant_message_entry_id)||
     observed.has(judge.turn_id))fail('RETROSPECTIVE_HISTORICAL_JUDGE_INVALID');
  observed.add(judge.turn_id);
  prior.push({judge,assertedAt:entry.assertion_time});
  bySource.set('reality:universe:'+entry.payload.assistant_message_entry_id,judge);
 }
 prior.sort((a,b)=>Date.parse(a.assertedAt)-Date.parse(b.assertedAt)||
    a.judge.turn_id.localeCompare(b.judge.turn_id));
 const judgments=[...prior.map(x=>x.judge),currentJudgment];
 const newFindings=[],unresolved=[];
 for(const finding of replay){
  if(finding?.classification!=='CONVERSATIONAL_RETROSPECTIVE_DRIFT')continue;
  const origin=bySource.get(finding.origin_turn_ref);
  if(!origin){
   unresolved.push({issue_id:String(finding.issue_id||'unknown'),
    reason:'ORIGINAL_JUDGE_RECEIPT_NOT_PRESENT_IN_BOUNDED_READBACK'});
   continue;
  }
  if(finding.origin_turn_ref==='reality:universe:'+currentJudgment.answer_source_ref)
   fail('RETROSPECTIVE_SELF_ORIGIN_INVALID');
  newFindings.push({
   original_answer_source_ref:origin.answer_source_ref,
   continuity_root_id:scope.continuity_root_id,
   discovery_turn_id:currentJudgment.turn_id,
   // The original real-time detector calls this PRECONDITION_DRIFT.
   // The retrospective wrapper must not manufacture a missed detection by
   // comparing two differently named classifications.
   classification:'CONVERSATIONAL_PRECONDITION_DRIFT',
   audit_receipt_hash:hash([cognitionEntry.ledger_entry_hash,
    finding.issue_id,origin.judge_receipt_hash]),
  });
 }
 const report=auditRealityJudgments({judgments,replayFindings:newFindings});
 const out={
  version:REALITY_RETROSPECTIVE_BRIDGE_VERSION,
  status:newFindings.length?'RETROSPECTIVE_CANDIDATES_LINKED':
    unresolved.length?'RETROSPECTIVE_ORIGINS_NOT_VERIFIED':
    'NO_LINKED_RETROSPECTIVE_CANDIDATES',
  cognition_ledger_hash:cognitionEntry.ledger_entry_hash,
  current_native_judge_receipt:currentJudgment.judge_receipt_hash,
  bounded_prior_judge_count:prior.length,
  unresolved_origin_count:unresolved.length,
  unresolved_origins:unresolved,
  report,
  independent_truth_verification:'NOT_PERFORMED',
  actual_missed_error_rate:null,
  retrospective_detection_is_conclusive:false,
 };
 return Object.freeze({...out,bridge_receipt_hash:hash(out)});
}
