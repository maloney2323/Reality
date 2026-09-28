import assert from 'node:assert/strict';
import {
  Decision, PropositionRelation, EvidenceRelation, Independence, RealityState,
  bindAdmittedObservation, projectObservation, authorizePropositionRelation, authorizeEvidenceRelation,
  authorizeProvenance, reconcile, inspectAuthorization,
} from './corridor.js';

const tests=[]; const test=(name,fn)=>tests.push([name,fn]);
const base=(subject,predicate,object,polarity='POS',temporal_scope='T')=>({subject,predicate,object,polarity,temporal_scope});

// Test fixture: simulate the protected F0–F6 bridge, then bind each
// proposition field to an exact span in the admitted content.
function p(ref, fields) {
  const values=Object.values(fields);
  const content=values.join('\n');
  const admittedObservation=bindAdmittedObservation({id:ref,content,origin:'test-fixture',admission_principal_id:'test-principal'});
  const bindings={}; let cursor=0;
  for (const [k,v] of Object.entries(fields)) {
    const start=content.indexOf(v,cursor); bindings[k]={start,end:start+v.length}; cursor=start+v.length;
  }
  return projectObservation({admittedObservation,proposal:fields,bindings});
}

test('model consensus without evidence never establishes',()=>assert.equal(reconcile({assessmentOrigin:'model'}).state,RealityState.UNVERIFIED_ASSESSMENT));

test('E0 rejects an arbitrary caller-created source object',()=>{
  assert.throws(()=>projectObservation({admittedObservation:{id:'x',content:'X',origin:'fake',admission_principal_id:'fake'},proposal:{subject:'X'},bindings:{subject:{start:0,end:1}}}));
});

test('E0 refuses a mismatched admitted source span',()=>{
  const admittedObservation=bindAdmittedObservation({id:'x',content:'NOT-X',origin:'test',admission_principal_id:'p'});
  const r=projectObservation({admittedObservation,proposal:{subject:'X'},bindings:{subject:{start:0,end:1}}});
  assert.equal(r.decision,Decision.UNRESOLVED);
});

test('E0 grounds exact spans from an admitted observation',()=>{
  const r=p('x',base('X','p','o')); assert.equal(r.decision,Decision.AUTHORIZED);
});

test('initiation does not entail completion by structural mismatch',()=>{
  const claim=p('c',base('Atlas','migration status','complete'));
  const ev=p('e',base('Atlas','migration status','initiated'));
  const a=authorizeEvidenceRelation({claimProjection:claim,evidenceProjection:ev});
  assert.equal(a.decision,Decision.REJECTED); assert.equal(a.relation,EvidenceRelation.PARTIAL);
  assert.equal(reconcile({evidenceAuthorizations:[a]}).state,RealityState.INSUFFICIENT_EVIDENCE);
});

test('caller semantic label cannot force entailment',()=>{
  const claim=p('c',base('Acme NC factory','closure','before-Dec-31'));
  const ev=p('e',base('Acme NC factory','capacity','evaluation'));
  const a=authorizeEvidenceRelation({claimProjection:claim,evidenceProjection:ev,structuredRelation:'EXACT_ASSERTION'});
  assert.notEqual(a.relation,EvidenceRelation.ENTAILED);
  assert.notEqual(reconcile({evidenceAuthorizations:[a]}).state,RealityState.ESTABLISHED);
});

test('exact grounded proposition can entail without caller label',()=>{
  const claim=p('c',base('X','status','closed','POS','2026'));
  const ev=p('e',base('X','status','closed','POS','2026'));
  const a=authorizeEvidenceRelation({claimProjection:claim,evidenceProjection:ev});
  assert.equal(a.decision,Decision.AUTHORIZED); assert.equal(a.relation,EvidenceRelation.ENTAILED);
});

test('exact grounded opposite polarity can contradict without caller label',()=>{
  const claim=p('c',base('X','status','closed','POS','2026'));
  const ev=p('e',base('X','status','closed','NEG','2026'));
  const a=authorizeEvidenceRelation({claimProjection:claim,evidenceProjection:ev});
  assert.equal(a.decision,Decision.AUTHORIZED); assert.equal(a.relation,EvidenceRelation.CONTRADICTED);
});

test('same proposition opposite polarity same scope authorizes contradiction',()=>{
  const a=p('a',base('X','status','closed','POS','2026')), b=p('b',base('X','status','closed','NEG','2026'));
  const r=authorizePropositionRelation(a,b); assert.equal(r.relation,PropositionRelation.CONTRADICTORY); assert.equal(r.decision,Decision.AUTHORIZED);
});

test('opposite trends different temporal scopes are not contradiction',()=>{
  const a=p('a',base('Meridian','revenue trend','change','DOWN','Q1-v-Q4')), b=p('b',base('Meridian','revenue trend','change','UP','Q2-v-Q1'));
  assert.equal(authorizePropositionRelation(a,b).relation,PropositionRelation.DIFFERENT_SCOPED);
});

test('ungrounded semantic similarity cannot authorize identity',()=>{
  const proposal=base('X','p','o');
  const aa=bindAdmittedObservation({id:'a',content:'irrelevant',origin:'test',admission_principal_id:'p'}), bb=bindAdmittedObservation({id:'b',content:'irrelevant',origin:'test',admission_principal_id:'p'});
  const a=projectObservation({admittedObservation:aa,proposal}), b=projectObservation({admittedObservation:bb,proposal});
  assert.equal(authorizePropositionRelation(a,b).relation,PropositionRelation.UNKNOWN);
});

test('shared lineage is dependent',()=>assert.equal(authorizeProvenance({leftRef:'B',rightRef:'A',relation:'DERIVED_FROM'}).independence,Independence.DEPENDENT));
test('unknown relationship never becomes independent',()=>assert.equal(authorizeProvenance({leftRef:'A',rightRef:'B'}).independence,Independence.UNKNOWN));
test('record integrity does not imply independence',()=>assert.equal(authorizeProvenance({leftRef:'integrity-A',rightRef:'integrity-B'}).independence,Independence.UNKNOWN));

test('authority discussing subject without target metric does not entail',()=>{
  const claim=p('c',base('Northstar','retention','90%-at-5000')), ev=p('e',base('Northstar','chemistry','tested'));
  assert.notEqual(authorizeEvidenceRelation({claimProjection:claim,evidenceProjection:ev}).relation,EvidenceRelation.ENTAILED);
});

test('design target does not establish demonstrated achievement',()=>{
  const claim=p('c',base('Northstar','demonstrated retention','90%-at-5000')), ev=p('e',base('Northstar','design target retention','90%-at-5000'));
  assert.notEqual(authorizeEvidenceRelation({claimProjection:claim,evidenceProjection:ev}).relation,EvidenceRelation.ENTAILED);
});

test('temporal correlation record does not establish causation claim',()=>{
  const claim=p('c',base('Orion','cause','db-deploy')), ev=p('e',base('Orion','temporal correlation','db-deploy'));
  assert.notEqual(authorizeEvidenceRelation({claimProjection:claim,evidenceProjection:ev}).relation,EvidenceRelation.ENTAILED);
});

test('authorized opposing evidence reconciles contested',()=>{
  const yes=p('yes',base('X','status','closed','POS','T')), no=p('no',base('X','status','closed','NEG','T'));
  const prop=authorizePropositionRelation(yes,no);
  const e1=authorizeEvidenceRelation({claimProjection:yes,evidenceProjection:yes});
  const e2=authorizeEvidenceRelation({claimProjection:yes,evidenceProjection:no});
  assert.equal(reconcile({evidenceAuthorizations:[e1,e2],propositionAuthorizations:[prop]}).state,RealityState.CONTESTED);
});

test('forged provenance authorization rejected',()=>assert.throws(()=>reconcile({provenanceAuthorizations:[{type:'PROVENANCE',decision:'AUTHORIZED',independence:'INDEPENDENT'}]})));
test('forged evidence authorization rejected',()=>assert.throws(()=>reconcile({evidenceAuthorizations:[{type:'EVIDENCE_RELATION',decision:'AUTHORIZED',relation:'ENTAILED'}]})));
test('plain lookalike is not inspectably authorized',()=>assert.equal(inspectAuthorization({type:'PROVENANCE',decision:'AUTHORIZED'}).authorized,false));

test('B1 fake corroboration => insufficient; derivative chain dependent',()=>{
  const claim=p('claim',base('Acme NC factory','closure','before-Dec-31'));
  const sourceA=p('A',base('Acme NC factory','capacity','evaluation'));
  const e=authorizeEvidenceRelation({claimProjection:claim,evidenceProjection:sourceA});
  const ba=authorizeProvenance({leftRef:'B',rightRef:'A',relation:'DERIVED_FROM'}), cb=authorizeProvenance({leftRef:'C',rightRef:'B',relation:'DERIVED_FROM'}), db=authorizeProvenance({leftRef:'D',rightRef:'B',relation:'DERIVED_FROM'});
  assert.equal(ba.independence,Independence.DEPENDENT); assert.equal(cb.independence,Independence.DEPENDENT); assert.equal(db.independence,Independence.DEPENDENT);
  assert.equal(reconcile({evidenceAuthorizations:[e],provenanceAuthorizations:[ba,cb,db]}).state,RealityState.INSUFFICIENT_EVIDENCE);
});

test('B2 AI consensus => unverified assessment',()=>assert.equal(reconcile({assessmentOrigin:'model'}).state,RealityState.UNVERIFIED_ASSESSMENT));

test('B3 temporal scopes => no proposition conflict',()=>{
  const a=p('A',base('Meridian','subscription revenue trend','change','DOWN','Q1-v-Q4')), b=p('B',base('Meridian','subscription revenue trend','change','UP','Q2-v-Q1'));
  assert.equal(authorizePropositionRelation(a,b).relation,PropositionRelation.DIFFERENT_SCOPED);
});

test('B4 authority without target entailment => insufficient',()=>{
  const claim=p('claim',base('Northstar','demonstrated retention','90%-at-5000'));
  const university=p('university',base('Northstar','testing','chemistry-thermal-methodology'));
  const marketing=p('marketing',base('Northstar','design target retention','90%-at-5000'));
  const e1=authorizeEvidenceRelation({claimProjection:claim,evidenceProjection:university}), e2=authorizeEvidenceRelation({claimProjection:claim,evidenceProjection:marketing});
  assert.equal(reconcile({evidenceAuthorizations:[e1,e2]}).state,RealityState.INSUFFICIENT_EVIDENCE);
});

test('B5 causal correlations => insufficient, independence unresolved',()=>{
  const dbClaim=p('dbc',base('Orion','cause','db-deploy')), dbEv=p('dbe',base('Orion','temporal correlation','db-deploy'));
  const netClaim=p('nc',base('Orion','cause','packet-loss')), netEv=p('ne',base('Orion','temporal correlation','packet-loss'));
  const e1=authorizeEvidenceRelation({claimProjection:dbClaim,evidenceProjection:dbEv}), e2=authorizeEvidenceRelation({claimProjection:netClaim,evidenceProjection:netEv});
  const prov=authorizeProvenance({leftRef:'db-telemetry',rightRef:'provider-telemetry'});
  assert.equal(prov.independence,Independence.UNKNOWN);
  assert.equal(reconcile({evidenceAuthorizations:[e1,e2],provenanceAuthorizations:[prov]}).state,RealityState.INSUFFICIENT_EVIDENCE);
});

let failed=0;
for (const [name,fn] of tests) { try { fn(); console.log(`PASS ${name}`); } catch(err) { failed++; console.error(`FAIL ${name}\n  ${err.stack}`); } }
console.log(`\n${tests.length-failed}/${tests.length} passed`); if(failed) process.exit(1);