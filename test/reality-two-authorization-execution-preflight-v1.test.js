import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessTwoAuthorizationExecutionPreflight as preflight}
 from '../src/reality-two-authorization-execution-preflight-v1.js';
const HASH='a'.repeat(64);
const base=(capability_id='reality-general-execution-receipt')=>({
 original_work_id:'work:'+'b'.repeat(32),phase:'AWAITING_OWNER_APPROVAL',
 capability_id,approval:null,
 source_paths:[
  'src/reality-extensions/'+capability_id+'.mjs',
  'test/reality-extensions/'+capability_id+'.test.js',
 ],
 qualification:{status:'AWAITING_OWNER_APPROVAL',artifact_sha256:HASH,
  installation_authorized:false,original_job_completed:false},
});
test('new #188 capability cannot consume the second owner consent until its resume/settle protocol exists',()=>{
 const r=preflight(base());
 assert.equal(r.approval_gate_open,false);
 assert.equal(r.status,'EXACT_INSTALL_TO_SETTLEMENT_PROTOCOL_MISSING');
 assert.equal(r.two_authorizations_only,true);
 assert.equal(r.original_job_completed,false);
});
test('existing explicit protocols pass static eligibility, never promise live completion',()=>{
 for(const name of ['reality-ci-failure-evidence','reality-continuity-settlement-reconciler']){
  const x=base(name);
  if(name==='reality-continuity-settlement-reconciler'){
    x.qualification.real_provider_holdout_verified=true;
    x.qualification.real_provider_holdout_artifact_sha256=HASH;
  }
  const r=preflight(x);
  assert.equal(r.approval_gate_open,true);
  assert.equal(r.live_completion_guaranteed,false);
  assert.equal(r.scope,'EXACT_ISOLATED_INSTALL_ONLY');
  assert.equal(r.two_authorizations_only,true);
 }
});
test('approval gate fails closed on modified exact artifact, missing holdout or forged phase',()=>{
 const cases=[
 {...base(),phase:'SETTLED_ISOLATED'},
 {...base(),approval:{approval_id:'unexpected'}},
 {...base(),qualification:{...base().qualification,artifact_sha256:'forged'}},
 {...base(),source_paths:['src/reality-extensions/reality-ci-failure-evidence.mjs']},
 {...base('reality-continuity-settlement-reconciler')},
 {...base('reality-ci-failure-evidence'),source_paths:[
    'src/reality-extensions/reality-ci-failure-evidence.mjs',
    'test/reality-extensions/not-matching.test.js']},
 ];
 for(const e of cases)assert.equal(preflight(e).approval_gate_open,false);
});
test('both the authenticated owner approval endpoint and home screen block the dead-end second authorization',()=>{
 const api=readFileSync('api/reality/personal-qualified-capability-approve.js','utf8');
 const home=readFileSync('index.html','utf8');
 const read=readFileSync('api/reality/personal-qualified-capabilities.js','utf8');
 const before=api.indexOf('const preflight=assessTwoAuthorizationExecutionPreflight');
 const mutation=api.indexOf("'/rest/v1/rpc/reality_owner_approve_qualified_preview_v1'");
 assert.ok(before>0&&mutation>before);
 assert.match(api,/EXACT_FULL_LOOP_EXECUTION_PATH_NOT_READY/);
 assert.match(api,/if\(preflight\.approval_gate_open!==true\)/);
 assert.match(home,/verified&&!approved&&finalPathReady/);
 assert.match(home,/full_loop_preflight\?\.approval_gate_open!==true/);
 assert.match(read,/full_loop_preflight:assessTwoAuthorizationExecutionPreflight\(entry\)/);
 assert.match(home,/Approval is locked:/);
});
