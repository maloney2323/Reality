import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('unsettled fenced effects are source-bound to same original, canonical candidate and parser',()=>{
 const sql=read('../supabase/migrations/20261122151000_governed_unsettled_transition_continuity_v1.sql');
 for(const exact of [
  "source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'",
  "phase='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'",
  "updated_at<clock_timestamp()-interval '90 seconds'",
  "quarantine_receipt_sha256 is null",
  "w.message_sha256=q.source_sha256",
  "w.development->>'phase'='CI_VERIFIED'",
  "w.development->>'original_work_id'=q.original_work_id",
  "candidate->>'candidate_sha256'",
  "(candidate-'candidate_sha256')::text",
  "q.qualification_receipt->'syntax_proof'->>'candidate' is distinct from 'VALID_SYNTAX'",
  "q.qualification_receipt->>'target_review_receipt_sha256'",
  "signed_chat_goal_shift_lineage_v1",
  "expected_quarantine_branch",
  "SIGNED_GOVERNED_TRANSITION_STALLED",
  "source_evidence=reality_internal.signed_chat_fenced_transition_evidence_v1",
  "on conflict(owner_id,shift_id,kind,evidence_key) do nothing",
  "provider_effect_known',false",
  "provider_effect_replayed',false",
  "investigation_only',true",
  "installation_authorized',false",
  "original_job_completed',false",
  "production_changed',false"
 ])assert.ok(sql.includes(exact),exact);
 assert.doesNotMatch(sql,/security definer|phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN'|phase='SIGNED_CHAT_RECOVERY_PUBLISH_RETRY'|grant execute.+authenticated/i);
});

test('fenced phase is observed in existing signed wake before same-worker investigator',()=>{
 const worker=read('../api/reality/governed-employee-shift-worker.js');
 const observer=worker.indexOf("reality_observe_signed_chat_review_incident_v1");
 const investigator=worker.indexOf("investigateOneSignedShiftContinuityIncident");
 assert.ok(observer>0&&investigator>0);
 const occurrence=worker.search(/(?:const|let) shiftContinuityInvestigation=/);
 assert.ok(occurrence>0&&observer<occurrence);
 const sql=read('../supabase/migrations/20261122151000_governed_unsettled_transition_continuity_v1.sql');
 assert.ok(sql.includes("p_worker_run_id")&&sql.includes("last_worker_status='WAKE_RECEIVED'"));
 assert.ok(sql.includes("r.status='STARTED'")||sql.includes("run.status='STARTED'"));
});

test('model investigator strictly validates transition scope and cannot replay unknown provider writes',()=>{
 const investigator=read('../src/reality-shift-continuity-auto-investigation-v1.js');
 for(const guard of [
  "claim.kind==='SIGNED_GOVERNED_TRANSITION_STALLED'",
  "schema!=='reality-source-bound-unsettled-transition-v1'",
  "expected_transition!=='QUARANTINE_PROVIDER_RECEIPTED'",
  "claim.source_evidence.source_claim_id!==claim.source_claim_id",
  "claim.source_evidence.provider_effect_known!==false",
  "claim.source_evidence.provider_effect_replayed!==false",
  "claim.source_evidence.installation_authorized!==false",
  "const fencedTransitionIncident=",
  "const chatReviewIncident=",
  "QUARANTINE_BRANCH_NOT_OBSERVED",
  "QUARANTINE_BRANCH_PRESENT_UNVERIFIED_ARTIFACT",
  "provider_status:Number.isInteger(r?.status)",
  "effect_settled:false,replay_authorized:false",
  "method:'GET'",
  "independent_unsettled_transition_readback:unsettledTransitionReadback",
  "Do not retry POST"
 ])assert.ok(investigator.includes(guard),guard);
 assert.match(investigator,/source_evidence:chatReviewIncident(?:\|\|finalLoopIncident)?\?claim\.source_evidence:null/);
 const broker=read('../supabase/functions/reality-chat-recovery-quarantine-broker-v1/index.ts');
 assert.ok(broker.includes("RECOVERY_FENCED_PROVIDER_EFFECT_UNVERIFIED_NO_REPLAY"));
 assert.ok(broker.includes("if(s.phase==='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED')"));
 assert.doesNotMatch(investigator,/method:'POST',.*?git\/refs/s);
});
