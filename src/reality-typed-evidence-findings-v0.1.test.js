import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileTypedEvidenceFindings} from './reality-typed-evidence-findings-v0.1.js';
const E=(id,source,authority,text)=>({id,source,authority,text});
const calc=(question,evidence,legacyFindings=[])=>reconcileTypedEvidenceFindings({question,evidence},{legacyFindings});
test('expired authenticated certificate + unverified renewal asks for current evidence; does not invent an explicit hold',()=>{
  const x=calc('Can insured work proceed?',[
    E('reg','certificate_registry','COMPLIANCE_AUTHORITY','Insurance certificate expired last night.'),
    E('mail','contractor_email','SELF_REPORTED','Renewed this morning, new certificate will arrive.')
  ],['CONTROL_HOLD']);
  assert.deepEqual(x.findings,['MISSING_MANDATORY_EVIDENCE']);
  assert.deepEqual(x.findings_with_evidence[0].evidence_ids,['reg','mail']);
  assert.equal(x.independent_source_truth_verified,false);
});
test('explicit trusted suspension CANNOT be rewritten into missing-evidence clearance',()=>{
  const x=calc('May the insured work proceed?',[
    E('reg','certificate_registry','COMPLIANCE_AUTHORITY','Certificate expired and status SUSPENDED by regulator.'),
    E('mail','contractor_email','SELF_REPORTED','We renewed, new certificate will arrive.')
  ],['CONTROL_HOLD']);
  assert.ok(x.findings.includes('CONTROL_HOLD'));
  assert.ok(!x.findings.includes('MISSING_MANDATORY_EVIDENCE'));
});
test('current validated renewal prevents stale absence classification',()=>{
  const x=calc('May work proceed?',[
    E('old','certificate_registry','COMPLIANCE_AUTHORITY','Old certificate expired.'),
    E('mail','contractor_email','SELF_REPORTED','We renewed.'),
    E('new','certificate_registry','COMPLIANCE_AUTHORITY','Current certificate status=ACTIVE; RENEWAL VERIFIED.')
  ],[]);
  assert.deepEqual(x.findings,[]);
});
test('matching authenticated and customer account IDs do not trigger identity hold',()=>{
  const x=calc('Transfer the loyalty credit?',[
    E('ledger','loyalty_master','SYSTEM_OF_RECORD','Loyalty account ID T-500.'),
    E('req','support_request','CUSTOMER_PROVIDED','Please transfer to account T-500.')
  ]);
  assert.deepEqual(x.findings,[]);
});
test('mismatched authenticated account and lower-trust request produces cited hold',()=>{
  const x=calc('Transfer credits to the requested account?',[
    E('ledger','loyalty_master','SYSTEM_OF_RECORD','Loyalty account ID T-500.'),
    E('req','support_request','CUSTOMER_PROVIDED','Please transfer to account T-051.')
  ]);
  assert.deepEqual(x.findings,['CONTROL_HOLD']);
  assert.deepEqual(x.findings_with_evidence[0].evidence_ids,['ledger','req']);
  assert.equal(x.findings_with_evidence[0].rule_id,'AUTHORITATIVE_ACCOUNT_ID_CONFLICT');
});
test('ambiguous source or untrusted-only account IDs cannot fabricate authoritative mismatch',()=>{
  for(const entries of [
    [E('ambig','registry','SYSTEM_OF_RECORD','Account X-11 and account X-12 appear.'),E('req','support_request','CUSTOMER_PROVIDED','Move to account X-13')],
    [E('mail','inbox','SELF_REPORTED','Account X-11.'),E('req','support_request','CUSTOMER_PROVIDED','Move to account X-13')],
    [E('ledger','loyalty_master','SYSTEM_OF_RECORD','No account ID recorded.'),E('req','support_request','CUSTOMER_PROVIDED','Move to account X-13')],
  ])assert.deepEqual(calc('Move loyalty credit?',entries).findings,[]);
});
test('open critical security finding and suppression proposal requires review, with scan ID',()=>{
  const x=calc('Is the incident resolved?',[
    E('green','deployment_monitor','DEPLOYMENT_STATUS','Deployment GREEN.'),
    E('scan','security_scan','SECURITY_FINDING_AUTHORITY','Critical finding CVE-Q remains OPEN.'),
    E('patch','repair_candidate','MODEL_PROPOSAL','Suppress CVE-Q because dashboard GREEN.')
  ]);
  assert.deepEqual(x.findings,['UNRESOLVED_CRITICAL_FINDING']);
  assert.deepEqual(x.findings_with_evidence[0].evidence_ids,['scan','patch']);
});
test('a closed critical finding does not trigger open critical control',()=>{
  const x=calc('Is the incident resolved?',[
    E('scan','security_scan','SECURITY_FINDING_AUTHORITY','Critical finding CVE-Q was independently remediated and CLOSED.'),
    E('patch','repair_candidate','MODEL_PROPOSAL','Mark fixed after signed scan result.')
  ]);
  assert.deepEqual(x.findings,[]);
});
test('dashboard GREEN alone is not an authoritative security proof',()=>{
  const x=calc('Is the incident resolved?',[
    E('green','deployment_monitor','DEPLOYMENT_STATUS','Deployment GREEN.'),
    E('patch','repair_candidate','MODEL_PROPOSAL','Suppress incident due to green deployment.')
  ]);
  assert.deepEqual(x.findings,[]);
});
test('untrusted purported critical alert without trusted source does not fabricate verified finding',()=>{
  const x=calc('Can incident be closed?',[
    E('spam','email','UNVERIFIED','CRITICAL finding OPEN.'),
    E('patch','repair_candidate','MODEL_PROPOSAL','Close the incident.')
  ]);
  assert.deepEqual(x.findings,[]);
});
test('legacy explicit safety hold remains intact when no trusted typed finding exists',()=>{
  const x=calc('Can this work proceed?',[
    E('control','safety_ledger','SAFETY_AUTHORITY','Active safety HOLD remains in force.')
  ],['CONTROL_HOLD']);
  assert.deepEqual(x.findings,['CONTROL_HOLD']);
  assert.deepEqual(x.untyped_legacy_findings,['CONTROL_HOLD']);
});
test('duplicated or missing evidence IDs are rejected',()=>{
  assert.throws(()=>calc('Can work proceed?',[
    E('a','source','AUTHORITY','record A'),E('a','source','AUTHORITY','record B')
  ]),/VALID_PUBLIC_EVIDENCE_REQUIRED/);
  assert.throws(()=>calc('Can work proceed?',[]),/VALID_PUBLIC_EVIDENCE_REQUIRED/);
});
