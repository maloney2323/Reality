import test from 'node:test';
import assert from 'node:assert/strict';
import {createGeneralPreviewCapabilityRegistry} from '../src/reality-general-preview-capability-registry-v1.0.js';
const owner='11111111-1111-4111-8111-111111111111';
const original='work:'+'a'.repeat(32),artifact='b'.repeat(64),commit='c'.repeat(40);
const approvalId='22222222-2222-4222-8222-222222222222';
const worldline='33333333-3333-4333-8333-333333333333';
const scope={owner_id:owner,original_work_id:original,
 goal_id:'confirmed:owner:goal',worldline_id:worldline,target_environment:'ISOLATED_PREVIEW'};
const db={strictSecrets:true,secretKey:'nonreal-test-service-value',
 url:'https://reality-test.supabase.co'};
const installed={kind:'ISOLATED_GITHUB_SOURCE_INSTALLED',original_work_id:original,
 owner_id:owner,goal_id:scope.goal_id,artifact_hash:artifact,
 provider_bytes_readback_verified:true,production_changed:false,
 installed_commit_sha:commit,installed_branch:'feature/reality-generic-source',
 provider_source_files:['src/reality-extensions/fix.mjs','test/reality-extensions/fix.test.js']};
const acceptance={independent_provider_readback:true,
 original_frozen_tests_passed:true,governance_tests_passed:true,
 installed_commit_sha:commit,original_work_id:original,
 provider_run_id:444,provider_job_id:555,
 source_failure_evidence_sha256:'d'.repeat(64)};
const approval={kind:'PROMOTION_AUTHORIZED',original_work_id:original,
 owner_id:owner,goal_id:scope.goal_id,artifact_hash:artifact,
 consumed_once:true,approval_origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
 checkpoint_receipt_id:approvalId,reservation_ref:'supabase:trusted:reservation'};
function provider(){
 let saved=null,posts=0;
 const fetchImpl=async(url,req)=>{
  const path=new URL(url).pathname;
  if(req.method==='GET'&&path.endsWith('/universe_events'))
   return {ok:true,json:async()=>[{
    worldline_id:worldline,payload:{original_work_id:original,
     driver_state:{phase:'PROMOTION_AUTHORIZED',
      candidate:{artifact_hash:artifact},
      promotion_authorization:{consumed_once:true}}}}]};
  if(req.method==='GET')return {ok:true,json:async()=>saved?[saved]:[]};
  posts++;saved=JSON.parse(req.body);return {ok:true};
 };
 return {fetchImpl,posts:()=>posts};
}
test('general registry requires real owner checkpoint, frozen tests and independent source acceptance',async()=>{
 const p=provider();
 const registry=createGeneralPreviewCapabilityRegistry({db,scope,artifactHash:artifact,fetchImpl:p.fetchImpl});
 const got=await registry.recordAndReadback({installed,acceptance,approval});
 assert.equal(got.kind,'CAPABILITY_REGISTERED');
 assert.equal(got.verified,true);
 assert.equal(got.production_changed,false);
 assert.equal(got.original_job_completed,false);
 assert.equal(p.posts(),1);
 await registry.recordAndReadback({installed,acceptance,approval});
 assert.equal(p.posts(),1,'exact provider-backed registration is idempotent');
});
test('non-verifiable post-install acceptance cannot cause database mutation',async()=>{
 let calls=0;
 const registry=createGeneralPreviewCapabilityRegistry({db,scope,artifactHash:artifact,
  fetchImpl:async()=>{calls++;throw Error('unexpected mutation')}});
 await assert.rejects(registry.recordAndReadback({
  installed,acceptance:{...acceptance,original_frozen_tests_passed:false},approval}),
  /GENERAL_PREVIEW_REGISTRY_DISTINCT_APPROVAL_INSTALL_ACCEPTANCE_REQUIRED/);
 assert.equal(calls,0);
});
