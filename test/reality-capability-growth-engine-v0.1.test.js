import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyBlock, createCapabilityContract, createCapabilityGap, createGrowthProposal,
  evaluateAcquisitionAuthority, createGrowthRun, transitionGrowthRun, buildResumeToken,
  verifyCapabilityAndOriginalWork, createVerifiedRegistration, buildDefaultAcquisitionPolicy
} from '../src/reality-capability-growth-engine-v0.1.js';

const policy = buildDefaultAcquisitionPolicy();

test('only MISSING_CAPABILITY enters growth loop', () => {
  assert.equal(classifyBlock({ reason:'permission denied' }), 'INSUFFICIENT_AUTHORITY');
  assert.equal(classifyBlock({ reason:'timeout' }), 'TRANSIENT_FAILURE');
  assert.equal(classifyBlock({ reason:'unsupported file type', evidence:{capability_missing:true} }), 'MISSING_CAPABILITY');
  assert.throws(() => createCapabilityGap({workItemId:'w1',blockedStepId:'s1',gapType:'INSUFFICIENT_AUTHORITY',capabilityId:'x'}), /ONLY_MISSING_CAPABILITY/);
});

test('capability contract cannot register before independent verification', () => {
  const c = createCapabilityContract({
    capabilityId:'document.test.extract',
    description:'Extracts a deterministic test document',
    inputSchema:'string',
    outputSchema:'string',
    verificationSuite:['known-input','malformed-input'],
    status:'UNVERIFIED'
  });
  assert.throws(() => createVerifiedRegistration({contract:c,verification:{verified:false},sourceRef:'x',verificationRef:'y'}), /INDEPENDENT_CAPABILITY_VERIFICATION_REQUIRED/);
});

test('bounded proposal rejects governance and security files', () => {
  const c = createCapabilityContract({
    capabilityId:'document.test.extract', description:'x', inputSchema:'string', outputSchema:'string',
    verificationSuite:['known-input']
  });
  const gap = createCapabilityGap({workItemId:'w1',blockedStepId:'s1',gapType:'MISSING_CAPABILITY',capabilityId:c.capability_id,evidence:['e1']});
  assert.throws(() => createGrowthProposal({gap,contract:c,allowedFiles:['src/reality-constitution.js']}), /FORBIDDEN_FILE_SCOPE/);
});

test('policy can automatically authorize only predeclared leaf acquisition', () => {
  const c = createCapabilityContract({
    capabilityId:'document.test.extract', description:'x', inputSchema:'string', outputSchema:'string',
    verificationSuite:['known-input']
  });
  const gap = createCapabilityGap({workItemId:'w1',blockedStepId:'s1',gapType:'MISSING_CAPABILITY',capabilityId:c.capability_id,evidence:['e1']});
  const proposal = createGrowthProposal({gap,contract:c,allowedFiles:['src/capabilities/document-test-extract.js','test/capabilities/document-test-extract.test.js']});
  assert.equal(evaluateAcquisitionAuthority({proposal,policy}).allowed,true);
});

test('human-required acquisition escalates instead of self-authorizing', () => {
  const c = createCapabilityContract({
    capabilityId:'external.crm.lookup', description:'x', inputSchema:'string', outputSchema:'object',
    verificationSuite:['readback']
  });
  const gap = createCapabilityGap({workItemId:'w2',blockedStepId:'s2',gapType:'MISSING_CAPABILITY',capabilityId:c.capability_id,evidence:['e2']});
  const proposal = createGrowthProposal({gap,contract:c,allowedFiles:['src/capabilities/crm.js'],acquisitionActions:['new_external_service']});
  const decision = evaluateAcquisitionAuthority({proposal,policy});
  assert.equal(decision.allowed,false); assert.equal(decision.reason,'HUMAN_AUTHORIZATION_REQUIRED');
});

test('capability and original work must both verify', () => {
  const good = verifyCapabilityAndOriginalWork({
    capabilityTests:[{name:'known-input',passed:true},{name:'malformed-input',passed:true}],
    originalWorkTest:{passed:true}, authoritySatisfied:true
  });
  assert.equal(good.verified,true);
  const bad = verifyCapabilityAndOriginalWork({
    capabilityTests:[{name:'known-input',passed:true}],
    originalWorkTest:{passed:false}, authoritySatisfied:true
  });
  assert.equal(bad.verified,false);
});

test('resume token preserves original work continuity', () => {
  const c = {capability_id:'document.test.extract',version:'0.1.0',status:'VERIFIED'};
  const gap = {work_item_id:'w1',blocked_step_id:'s1',diagnosis:'unsupported file',required_capability:c.capability_id};
  const token = buildResumeToken({gap,capability:c,originalInputs:{file:'fixture.pdf'},completedSteps:['capture'],continuationStep:'extract'});
  assert.equal(token.work_item_id,'w1'); assert.equal(token.blocked_step_id,'s1'); assert.deepEqual(token.completed_steps,['capture']);
});

test('forbidden acquisition never passes authority gate', () => {
  const c = createCapabilityContract({capabilityId:'x.y',description:'x',inputSchema:'x',outputSchema:'y',verificationSuite:['x']});
  const gap = createCapabilityGap({workItemId:'w3',blockedStepId:'s3',gapType:'MISSING_CAPABILITY',capabilityId:c.capability_id});
  assert.throws(() => createGrowthProposal({gap,contract:c,allowedFiles:['src/capabilities/x.js'],acquisitionActions:['modify_governance']}), /FORBIDDEN_ACQUISITION_ACTION/);
});

test('growth run can progress to resumed without rewriting policy', () => {
  const c = createCapabilityContract({capabilityId:'x.y',description:'x',inputSchema:'x',outputSchema:'y',verificationSuite:['x']});
  const gap = createCapabilityGap({workItemId:'w4',blockedStepId:'s4',gapType:'MISSING_CAPABILITY',capabilityId:c.capability_id});
  const proposal = createGrowthProposal({gap,contract:c,allowedFiles:['src/capabilities/x.js'],continuationStep:'continue'});
  let run=createGrowthRun({gap,proposal});
  run=transitionGrowthRun(run,'AUTHORIZED',{reason:'policy'});
  run=transitionGrowthRun(run,'ACQUISITION_RUNNING');
  run=transitionGrowthRun(run,'VERIFYING');
  run=transitionGrowthRun(run,'VERIFIED');
  run=transitionGrowthRun(run,'REGISTERED');
  run=transitionGrowthRun(run,'RESUMING');
  run=transitionGrowthRun(run,'RESUMED');
  assert.equal(run.state,'RESUMED');
  assert.equal(run.events[0].state,'PROPOSAL_CREATED');
});
