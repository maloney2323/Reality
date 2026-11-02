// Governed holdout v2: correct the invalid v1 positive fixture against the\n// historically owner-approved verifier; original frozen test stays unchanged.\n// Independent hidden acceptance for a proposed execution-receipt capability.
// This is a test of source-only proposals, not a customer settlement receipt.
// Frozen original test lives elsewhere and is never modified.
import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyRealityCompletion} from '../src/reality-extensions/reality-general-execution-receipt.mjs';
const WORK='work:'+'f'.repeat(32),OWNER='44444444-4444-4444-8444-444444444444';
const HASH='a'.repeat(64),COMMIT='b'.repeat(40),GOAL='verified:user:goal';
const good=()=>({
 owner_id:OWNER,goal_id:GOAL,original_work_id:WORK,artifact_hash:HASH,
 signed_owner_approval:{verified:true,consumed_once:true,owner_id:OWNER,
  original_work_id:WORK,artifact_hash:HASH,
  origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',reservation_ref:'supabase:owner:single-use:1'},
 sandbox:{independently_verified:true,artifact_hash:HASH,frozen_regression_passed:true,
  governance_preserved:true},
 installation:{independent_provider_readback:true,original_work_id:WORK,
  artifact_hash:HASH,installed_commit_sha:COMMIT,
  production_changed:false,installed_branch:'feature/reality-verified-repair'},
 resumption:{independent_provider_readback:true,real_execution_observed:true,
  original_work_id:WORK,installed_commit_sha:COMMIT,
  executor_run_ref:'github:actions:run:77:job:88',outcome:'SUCCEEDED'},
 settlement:{durable_settlement_readback:true,independent_outcome_verified:true,
  original_work_id:WORK,artifact_hash:HASH,installed_commit_sha:COMMIT,
  receipt_ref:'supabase:universe_events:55555555-5555-4555-8555-555555555555'}
});
const unverified=x=>assert.notEqual(verifyRealityCompletion(x)?.verified,true);
test('independent different but valid original job is independently accepted',()=>{
 const x=verifyRealityCompletion(good());
 assert.equal(x.verified,true);
 assert.equal(x.status,'VERIFIED_SETTLED');
});
test('incomplete source scope and absent corroborated fields are never completed',()=>{
 for(const field of ['signed_owner_approval','sandbox','installation','resumption','settlement']){
  const x=good();delete x[field];unverified(x);
 }
});
test('owner approval alone or model completion claim never implies settlement',()=>{
 const x=good();x.settlement={verified:true};x.completed=true;x.model_says_complete=true;unverified(x);
});
test('cross-owner replay and cross-artifact approval are rejected',()=>{
 for(const delta of [
  {owner_id:'attacker'},
  {artifact_hash:'d'.repeat(64)},
  {signed_owner_approval:{...good().signed_owner_approval,owner_id:'attacker'}},
  {signed_owner_approval:{...good().signed_owner_approval,artifact_hash:'0'.repeat(64)}}
 ])unverified({...good(),...delta});
});
test('foreign exact work substitution is rejected throughout the chain',()=>{
 const other='work:'+'e'.repeat(32);
 for(const key of ['signed_owner_approval','installation','resumption','settlement']){
  const x=good();x[key]={...x[key],original_work_id:other};unverified(x);
 }
});
test('independent install commit cannot silently drift across execution and settlement',()=>{
 const other='c'.repeat(40);
 for(const key of ['resumption','settlement']){
  const x=good();x[key]={...x[key],installed_commit_sha:other};unverified(x);
 }
});
test('approved artifact cannot be silently swapped by sandbox or installed source',()=>{
 for(const key of ['sandbox','installation','settlement']){
  const x=good();x[key]={...x[key],artifact_hash:'d'.repeat(64)};unverified(x);
 }
});
test('fake provenance or missing independently observed execution is not verified',()=>{
 for(const field of [
  ['signed_owner_approval',{...good().signed_owner_approval,origin:'AI_APPROVED'}],
  ['signed_owner_approval',{...good().signed_owner_approval,consumed_once:false}],
  ['installation',{...good().installation,independent_provider_readback:false}],
  ['resumption',{...good().resumption,real_execution_observed:false}],
  ['settlement',{...good().settlement,independent_outcome_verified:false}],
 ]){
  const x=good();x[field[0]]=field[1];unverified(x);
 }
});
test('production promotion cannot be disguised as an isolated installation',()=>{
 const x=good();x.installation.production_changed=true;unverified(x);
});
test('null, empty and malformed inputs never produce verified settlement',()=>{
 for(const input of [null,{},[],false,'complete',3,{owner_id:OWNER},[good()]])
  try {unverified(input)} catch(e) {assert.ok(e instanceof Error)}
});

test('unverified goal scope or a non-owner-scoped approval receipt fails closed',()=>{
 for(const x of [
  {...good(),goal_id:'goal:current'},
  {...good(),signed_owner_approval:{...good().signed_owner_approval,
   reservation_ref:'supabase:auth:single-use:1'}},
  {...good(),signed_owner_approval:{...good().signed_owner_approval,
   reservation_ref:'supabase:fake:receipt'}},
 ]){
  assert.notEqual(verifyRealityCompletion(x)?.verified,true);
 }
});
