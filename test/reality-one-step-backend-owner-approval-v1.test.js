import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../api/reality/personal-real-repair-install.js',import.meta.url),'utf8');
const start=source.indexOf("if(b.intent==='OWNER_AUTHORIZE_PREPARE_AND_QUEUE_EXACT_REPAIR')");
const end=source.indexOf("if(b.intent==='OWNER_APPROVE_EXACT_INSTALL')",start);
const segment=source.slice(start,end);
test('one authenticated command is exact, explicit, same-origin and POST-only',()=>{
 assert.ok(start>0&&end>start);
 assert.match(source,/if\(req.method!=='POST'\)/);
 assert.match(source,/assertSameOrigin\(req\)/);
 assert.match(source,/authenticatedChatSession\(req,res\)/);
 assert.match(segment,/Object\.keys\(b\)\.sort\(\)\.join\(','\)/);
 assert.match(segment,/I_AUTHORIZE_THIS_EXACT_ISOLATED_REPAIR_AND_ORIGINAL_JOB_CONTINUATION/);
 assert.match(segment,/candidate_artifact_hash/);
});
test('preflight and independent checkpoint occur before atomic owner approval',()=>{
 const steps=[
  'verifyApprovedBackgroundReadiness()',
  'prepareVerifiedOwnerRepairCandidate({',
  "ready.status!=='EXACT_CANDIDATE_AWAITING_SIGNED_OWNER_INSTALL_APPROVAL'",
  'ready.independent_readback_verified!==true',
  'service.ownerApproveAndQueue({',
 ];
 let previous=-1;
 for(const step of steps){
  const index=segment.indexOf(step);
  assert.ok(index>previous,'ordered boundary required: '+step);
  previous=index;
 }
 assert.match(segment,/expectedArtifactHash:b.candidate_artifact_hash/);
 assert.match(segment,/expectedCheckpointHash:ready.constitutional_checkpoint_hash/);
 assert.doesNotMatch(segment,/ownerApproveAndInstall/);
 assert.doesNotMatch(segment,/continueAfterInstall/);
 assert.match(segment,/original_job_completed:false,production_changed:false/);
});
