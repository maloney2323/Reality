import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseContinuityModelInvestigation,continuityTextContract}
 from '../src/reality-shift-continuity-auto-investigation-v1.js';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const roles=[
 {function_id:'software_engineering',employee_name:'Riley'},
 {function_id:'quality_security_reliability',employee_name:'Quinn'}
];
const valid={
 employee_function_id:'software_engineering',
 reviewer_function_id:'quality_security_reliability',
 diagnosis:'The source-backed fenced provider transition has no independently settled GitHub effect.',
 proposed_upgrade:'Reconcile the exact pinned GitHub ref and source credential with a read-only receipt.',
 independent_test_requirement:'Independently verify the pinned branch and registered credential; never repeat an uncertain write.',
 limitations:'No owner approval, GitHub write, new original, or installation is authorized.',
 blocker_class:'PROVIDER_EFFECT_UNKNOWN',
 next_governed_action:'RECONCILE_PROVIDER_EFFECT_WITHOUT_REPLAY',
 resume_acceptance_condition:'The original is eligible to continue only after independent provider-effect and owner-authority receipts settle the specific fence.'
};
const response=value=>({status:'completed',id:'resp_signed_fenced_case_12345',
 output_text:JSON.stringify(value)});
test('model format trailing whitespace is trimmed only on already schema-valid prose',()=>{
 const changed={...valid,
  resume_acceptance_condition:'Resume only with independently checked original and provider receipts.'.padEnd(299,'x')+' ',
  diagnosis:' '+valid.diagnosis+' \t'};
 assert.equal(changed.resume_acceptance_condition.length,300);
 const parsed=parseContinuityModelInvestigation(response(changed),roles,{guidedRecovery:true});
 assert.equal(parsed.resume_acceptance_condition.length,299);
 assert.equal(parsed.resume_acceptance_condition.endsWith(' '),false);
 assert.equal(parsed.diagnosis,valid.diagnosis);
 assert.equal(parsed.next_governed_action,valid.next_governed_action);
 assert.equal(parsed.assigned_employee,'Riley');
 assert.equal(parsed.independent_reviewer,'Quinn');
});
test('prose normalization does not change strict max/min, independent reviewer or authority gates',()=>{
 const failures=[
  {...valid,resume_acceptance_condition:'x'.repeat(301)},
  {...valid,resume_acceptance_condition:'  '},
  {...valid,diagnosis:'  short  '},
  {...valid,reviewer_function_id:valid.employee_function_id},
  {...valid,installation_authorized:true},
  {...valid,next_governed_action:'RETRY_GITHUB_POST_UNBOUNDED'}
 ];
 for(const candidate of failures)assert.throws(
  ()=>parseContinuityModelInvestigation(response(candidate),roles,{guidedRecovery:true}),
  /SHIFT_CONTINUITY_/,JSON.stringify(candidate));
 assert.equal(continuityTextContract(true).find(x=>x.field==='resume_acceptance_condition')?.max,300);
});
test('fenced incidents use stable signed operation identity, not a mutable verifier receipt',()=>{
 const migration=source('../supabase/migrations/20261122153500_stable_fenced_transition_incident_identity_v1.sql');
 const observer=source('../supabase/migrations/20261122151000_governed_unsettled_transition_continuity_v1.sql');
 assert.match(migration,/q\.qualification_receipt->>'syntax_receipt_sha256' is distinct from 'sha256:'/);
 assert.match(migration,/'syntax_verified',true/);
 assert.doesNotMatch(migration,/'syntax_receipt_sha256',q\.qualification_receipt->>'syntax_receipt_sha256'/);
 for(const field of ["'original_work_id'","'trigger_id'","'candidate_sha256'","'candidate_base_sha'",
   "'expected_quarantine_branch'","'fenced_at'","'spec_sha256'"])assert.ok(migration.includes(field),field);
 assert.ok(observer.includes("on conflict(owner_id,shift_id,kind,evidence_key) do nothing"));
 assert.ok(observer.includes("source_evidence=reality_internal.signed_chat_fenced_transition_evidence_v1"));
 assert.doesNotMatch(migration,/update\s+reality_internal\.genuine_capability_queue_v1|phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN'/i);
});
test('investigator provides frozen signed Chat source and actual read-only owner preflight to model',()=>{
 const investigator=source('../src/reality-shift-continuity-auto-investigation-v1.js');
 assert.ok(investigator.includes("claim.source_evidence?.source_ref"));
 assert.ok(investigator.includes("FROZEN_SIGNED_CHAT_LEDGER_REFERENCE_ONLY"));
 assert.ok(investigator.includes("independently_refreshed:false"));
 assert.ok(investigator.includes("github_provider_effect_verified:false"));
 assert.ok(investigator.includes("if(guidedRecovery&&(!chatReviewIncident||fencedTransitionIncident))"));
 assert.match(investigator,/source_evidence:chatReviewIncident(?:\|\|finalLoopIncident)?\?claim\.source_evidence:null/);
 assert.ok(investigator.includes("infrastructure_source_evidence:infrastructureIncident?claim.source_evidence:null"));
 assert.ok(investigator.includes("claim.source_evidence?.schema!=='reality-signed-infrastructure-incident-v1'"));
 assert.ok(investigator.includes("claim.source_evidence.owner_id!==claim.owner_id||claim.source_evidence.shift_id!==shiftId"));
 assert.ok(investigator.includes("provider_effect_known!==false"));
 assert.ok(investigator.includes("method:'GET'"));
});
