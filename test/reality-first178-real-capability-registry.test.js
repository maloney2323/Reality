import test from 'node:test';
import assert from 'node:assert/strict';
import {createOriginal178CapabilityRegistry}
 from '../src/reality-first178-real-capability-registry-v0.1.js';
const owner='11111111-1111-4111-8111-111111111111';
const original='work:9b9578b3c65427589c4c6da68fe0fc87';
const artifact='a'.repeat(64),commit='b'.repeat(40);
const approval='supabase:owner-approval:22222222-2222-4222-8222-222222222222';
const receipt='33333333-3333-4333-8333-333333333333';
const basis=()=>({db:{strictSecrets:true,
 secretKey:'a-test-service-key-not-a-real-credential',
 url:'https://reality-unit-test.supabase.co'},
 ownerId:owner,originalWorkId:original,artifactHash:artifact,
 approvalRef:approval,verifiedGoalId:'goal:verified',
 worldlineId:'worldline:verified'});
const installed={original_work_id:original,artifact_hash:artifact,
 installed_commit_sha:commit,installation_authority_ref:approval,
 production_changed:false};
const acceptance={verified:true,installed_commit_sha:commit,
 original_work_id:original,provider_run_id:1234,provider_frozen_job_id:9876};
test('owner-approved capability is an actual registry write independently read back',async()=>{
 let saved=null,posts=0,reads=0;
 const fetchImpl=async(url,req)=>{
  if(req.method==='GET'){
   reads++;
   return {ok:true,json:async()=>saved?[saved]:[]};
  }
  assert.equal(req.method,'POST');posts++;
  saved=JSON.parse(req.body);
  return {ok:true};
 };
 const registry=createOriginal178CapabilityRegistry({...basis(),fetchImpl});
 const result=await registry.admitted({installed,acceptance,
  approvalCheckpointReceiptId:receipt});
 assert.equal(result.verified,true);
 assert.equal(result.original_job_completed,false);
 assert.equal(posts,1);
 assert.ok(reads>=2);
 assert.equal(saved.admitted_event_id,receipt);
 assert.equal(saved.verification_basis.original_work_id,original);
 assert.equal((await registry.verify({evidenceHash:result.evidence_hash})).verified,true);
 await registry.admitted({installed,acceptance,approvalCheckpointReceiptId:receipt});
 assert.equal(posts,1,'same exact registration does not write again');
});
test('forged CI pass never authorizes DB mutation',async()=>{
 let mutated=false;
 const registry=createOriginal178CapabilityRegistry({...basis(),
  fetchImpl:async()=>{mutated=true;throw Error('unexpected')}});
 await assert.rejects(registry.admitted({
  installed,acceptance:{...acceptance,verified:false},
  approvalCheckpointReceiptId:receipt}),/INSTALLED_SOURCE_AND_APPROVAL_NOT_VERIFIED/);
 assert.equal(mutated,false);
});
test('a successful HTTP write with mismatched DB readback is not registration',async()=>{
 let calls=0;
 const registry=createOriginal178CapabilityRegistry({...basis(),
  fetchImpl:async(_u,req)=>{
   if(req.method==='POST')return {ok:true};
   calls++;
   return {ok:true,json:async()=>calls===1?[]:[{
    capability_id:registry.registryId,capability_version:'f'.repeat(64),
    status:'ACTIVE',admitted_event_id:receipt,verification_basis:{},
    procedure:{}}]};
  }});
 await assert.rejects(registry.admitted({installed,acceptance,
  approvalCheckpointReceiptId:receipt}),/INDEPENDENT_REGISTRATION_READBACK_MISMATCH/);
});
