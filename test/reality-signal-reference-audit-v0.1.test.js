import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createInterpretationReceipt,verifyInterpretationReceipt,
  canonicalSha256} from '../src/reality-signal-interpretation-v0.2.js';

const reference=JSON.parse(readFileSync(
  new URL('../benchmarks/signal-cleaner-reference-audit-v0.1.json',import.meta.url),'utf8'));
const when='2026-10-22T12:00:00.000Z';
const digest=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
test('reference cases are distinct and expressly NOT independent gold',()=>{
  assert.equal(reference.annotation_status,'PROVISIONAL_UNREVIEWED');
  assert.equal(reference.cases.length,28);
  assert.equal(new Set(reference.cases.map(c=>c.id)).size,reference.cases.length);
  assert.ok(reference.cases.every(c=>c.message && c.required_types?.length));
});
test('produce measurable semantic misses without truth or authority promotion',()=>{
  const rows=[];
  for(const c of reference.cases){
    const receipt=createInterpretationReceipt({message:c.message,observedAt:when,
      source:{origin_kind:'DOCUMENT',channel:'SYNTHETIC_BENCHMARK',
        continuity_root_id:'benchmark:construction:'+c.id}});
    const verified=verifyInterpretationReceipt({receipt,message:c.message});
    assert.equal(verified.status,'INTEGRITY_VERIFIED');
    assert.equal(verified.semantic_truth_established,false);
    assert.equal(verified.authority_granted,false);
    assert.equal(receipt.scope.trust_level,'UNVERIFIED');
    assert.ok(receipt.signals.every(s=>s.authority_granted===false &&
      s.data_only===true && s.epistemic_status==='OBSERVED_UNVERIFIED'));
    const types=receipt.signals.map(s=>s.signal_type);
    const missing=c.required_types.filter(t=>!types.includes(t));
    const forbidden=(c.forbidden_types||[]).filter(t=>types.includes(t));
    const undersegmented=types.length<(c.min_signals||1);
    const missing_negation=c.must_have_negated===true &&
      !receipt.signals.some(s=>s.polarity==='NEGATED');
    rows.push({id:c.id,critical:!!c.critical,missing_required_types:missing,
      forbidden_type_hits:forbidden,undersegmented,missing_negation,
      observed_candidate_types:types,receipt_hash:receipt.integrity.receipt_sha256,
      passed:!missing.length&&!forbidden.length&&!undersegmented&&!missing_negation});
  }
  const met={
    total:rows.length,met_provisional_requirements:rows.filter(x=>x.passed).length,
    missing_any_required_type:rows.filter(x=>x.missing_required_types.length).length,
    unexpected_forbidden_types:rows.filter(x=>x.forbidden_type_hits.length).length,
    undersegmented:rows.filter(x=>x.undersegmented).length,
    missed_negation:rows.filter(x=>x.missing_negation).length,
    critical_total:rows.filter(x=>x.critical).length,
    critical_met:rows.filter(x=>x.critical&&x.passed).length
  };
  const report={
    report_version:'reality.signal-cleaner-reference-audit.v0.1',
    evaluation_status:'PROVISIONAL_UNREVIEWED_NOT_AN_ACCURACY_BENCHMARK',
    reference_sha256:canonicalSha256(reference),
    metrics:met,
    lanes:{signal_cleaner_component:'PROVISIONAL_EVALUATED',
      native_model:'NOT_RUN',model_plus_cleaner:'NOT_RUN',model_plus_reality:'NOT_RUN'},
    independently_adjudicated:false,external_models_invoked:false,
    production_validated:false,report_rows:rows
  };
  console.log('REALITY_SIGNAL_REFERENCE_AUDIT_JSON='+JSON.stringify(report));
  assert.equal(rows.length,28);
  assert.ok(rows.every(x=>x.receipt_hash.startsWith('sha256:')));
  assert.equal(digest(rows).startsWith('sha256:'),true);
});
