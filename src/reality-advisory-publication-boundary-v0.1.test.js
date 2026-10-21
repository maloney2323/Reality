import test from 'node:test';
import assert from 'node:assert/strict';
import {assessUnverifiedInformationalAdvisory,publishUnverifiedInformationalAdvisory}
  from './reality-advisory-publication-boundary-v0.1.js';
const packet={work_item_id:'SYNTHETIC-DEVELOPMENT-1',
  question:'Can the claim be finalized with the required signed certificate missing?',
  evidence:[{id:'paperwork',source:'claim_registry',authority:'SYSTEM_OF_RECORD',
    text:'Required signed certificate not received.'}]};
const candidate={
  disposition:'REQUEST_EVIDENCE',evidence_ids:['paperwork'],
  reasoning:'The registry has no certificate.',uncertainty_acknowledged:true,claims_authority:false
};
test('unclassified non-enabling advice is visible but never certified',()=>{
  const r=publishUnverifiedInformationalAdvisory({publicPacket:packet,candidateDecision:candidate});
  assert.equal(r.status,'UNVERIFIED_ADVISORY_READY_NOT_VERIFIED_OUTCOME');
  assert.equal(r.publication.disposition,'REQUEST_EVIDENCE');
  assert.equal(r.publication.policy_verification_status,'NO_CONTROL_CLASSIFICATION');
  assert.equal(r.publication.authorization_to_act,false);
  assert.equal(r.publication.original_task_completed,false);
  assert.equal(r.assessment_receipt.policy_signature_verified,false);
  assert.equal(r.assessment_receipt.independent_source_truth_verified,false);
});
test('unknown policy does NOT permit ALLOW',()=>{
  const r=publishUnverifiedInformationalAdvisory({publicPacket:packet,
    candidateDecision:{...candidate,disposition:'ALLOW'}});
  assert.equal(r.publication,null);
  assert.equal(r.assessment_receipt.reason,'AFFIRMATIVE_PERMISSION_REQUIRES_VERIFIED_AUTHORITY');
});
test('actual classified control cannot bypass signed control path through advisory',()=>{
  for(const f of ['INTEGRITY_FAILURE','SECURITY_POLICY_BYPASS','CONTROL_HOLD']){
    const r=publishUnverifiedInformationalAdvisory({publicPacket:packet,
      candidateDecision:candidate,classifiedControlFindings:[f]});
    assert.equal(r.publication,null);
    assert.equal(r.assessment_receipt.reason,'CLASSIFIED_CONTROL_REQUIRES_SIGNED_POLICY_GATE');
  }
});
test('untrusted source cannot claim execution authority or completed work',()=>{
  for(const c of [
    {...candidate,claims_authority:true},
    {...candidate,uncertainty_acknowledged:false},
    {...candidate,evidence_ids:['invented']},
    {...candidate,evidence_ids:['paperwork','paperwork']},
    {...candidate,reasoning:''},
    {...candidate,disposition:'TRANSFER_FUNDS'},
  ]){
    const r=publishUnverifiedInformationalAdvisory({publicPacket:packet,candidateDecision:c});
    assert.equal(r.publication,null);
    assert.equal(r.assessment_receipt.publication_permitted,false);
  }
});
test('the evidence packet must have unique authenticated reference IDs',()=>{
  assert.throws(()=>assessUnverifiedInformationalAdvisory({
    publicPacket:{...packet,evidence:[...packet.evidence,...packet.evidence]},
    candidateDecision:candidate
  }),/DUPLICATE_EVIDENCE_ID/);
});
test('a safe informational block cannot be misrepresented as executed',()=>{
  const r=publishUnverifiedInformationalAdvisory({publicPacket:packet,
    candidateDecision:{...candidate,disposition:'BLOCK'}});
  assert.equal(r.publication.disposition,'BLOCK');
  assert.equal(r.publication.external_action_executed,false);
  assert.equal(r.publication.original_task_completed,false);
  assert.equal(r.publication.requires_independent_source_review,true);
});
test('unclassified proposed escalation never claims verified human handoff',()=>{
  const r=publishUnverifiedInformationalAdvisory({publicPacket:packet,
    candidateDecision:{...candidate,disposition:'ESCALATE'}});
  assert.equal(r.publication.disposition,'ESCALATE');
  assert.equal(r.publication.human_handoff_completed,false);
});


test('direct unverified advisory cannot release forged completion narrative',()=>{
  const r=publishUnverifiedInformationalAdvisory({
    publicPacket:packet,
    candidateDecision:{...candidate,reasoning:'I have already wired the customer funds.'}
  });
  assert.equal(r.publication,null);
  assert.equal(r.assessment_receipt.reason,'UNSAFE_MODEL_STATEMENT_OR_SECRET');
});
