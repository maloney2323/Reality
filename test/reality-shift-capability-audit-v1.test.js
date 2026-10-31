import test from 'node:test';
import assert from 'node:assert/strict';
import {buildShiftCapabilityAudit} from '../src/reality-shift-capability-audit-v1.js';
const required=[
 'src/reality-constitution.js','src/reality-capability-gap-detector-v0.1.js',
 'src/reality-governed-cognitive-loop-v0.1.js',
 'src/reality-intelligence-orchestrator-v0.1.js','src/reality-ekr-v0.2.js',
 'src/reality-governed-system-access-v0.1.js'];
const sha='a'.repeat(40);
const source=paths=>({provider:'github',repository:{full_name:'maloney2323/Reality'},
 source:{ref:'feature/first178-live-single-claim-execution-20261029',commit_sha:sha},
 tree:{truncated:false,paths:paths.map((path,i)=>({path,sha:String(i)}))}});
test('read-only shift audit retains exact source and never grants installation',()=>{
 const audit=buildShiftCapabilityAudit({repositoryObservation:source(required)});
 assert.equal(audit.commit_sha,sha);
 assert.equal(audit.state,'EVIDENCE_CANDIDATES_ONLY');
 assert.equal(audit.can_install,false);assert.equal(audit.can_settle,false);
 assert.equal(audit.independently_verified_behavior,false);
 assert.equal(audit.observed_gaps.some(g=>g.gap_id==='GITHUB_RUNTIME_WRITE_AUTHORITY_MISSING'),false);
 assert.equal(audit.observed_gaps.some(g=>g.gap_id==='VERCEL_READ_CAPABILITY_MISSING'),false);
 assert.equal(audit.observed_gaps.some(g=>g.gap_id==='DISCOVERY_SNAPSHOT_BASELINE_MISSING'),true);
});
test('previous durable snapshot allows real diff rather than repeated baseline',()=>{
 const previous={commit_sha:'b'.repeat(40),tree:{paths:source(required).tree.paths}};
 const audit=buildShiftCapabilityAudit({repositoryObservation:source(required.slice(1)),previousSnapshot:previous});
 assert.equal(audit.comparison.comparison_status,'CHANGED');
 assert.ok(audit.observed_gaps.some(g=>g.gap_id==='SELF_MODEL_COMPONENT_MISSING'));
 assert.equal(audit.observed_gaps.some(g=>g.gap_id==='DISCOVERY_SNAPSHOT_BASELINE_MISSING'),false);
});
test('rejects truncated, unpinned and foreign source before any claim',()=>{
 assert.throws(()=>buildShiftCapabilityAudit({repositoryObservation:{...source(required),tree:{paths:[],truncated:true}}}),/COMPLETE_PROVIDER_TREE/);
 assert.throws(()=>buildShiftCapabilityAudit({repositoryObservation:{...source(required),source:{commit_sha:'main'}}}),/COMPLETE_PROVIDER_TREE/);
 assert.throws(()=>buildShiftCapabilityAudit({repositoryObservation:{...source(required),repository:{full_name:'other/repo'}}}),/COMPLETE_PROVIDER_TREE/);
});
