import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requalifyOneFencedSignedChatProvider}
 from '../src/reality-signed-fenced-provider-requalification-v1.js';

const UUID='1ea734e3-d46c-46be-957b-9f5410cf765d';
const WORK='work:d135a3649035a7360b44f9ef3903533a';
const SHA='a'.repeat(40);
const NEW='b'.repeat(40);
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:NEW,
 VERCEL_GIT_COMMIT_REF:'repair/pinned-preview-20261122',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'fixture-project'};
const db={strictSecrets:true,project:'fixture-project',secretKey:'fixture-credential'};
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const run='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const originalBranch='reality/chat-recovery/'+UUID+'-syntax-r3';
const scope={
 status:'SIGNED_CHAT_RECOVERY_QUARANTINE_CANDIDATE_READ',
 phase:'SIGNED_CHAT_RECOVERY_PUBLISH_FENCED',trigger_id:UUID,
 original_work_id:WORK,message_id:'db1d42a9-759f-4d4c-8a62-b819c16393f1',
 source_ref:'supabase:reality_chat_messages:db1d42a9-759f-4d4c-8a62-b819c16393f1',
 candidate:{candidate_sha256:'sha256:'+'1'.repeat(64),base_sha:SHA},
 spec_sha256:'sha256:'+'2'.repeat(64),release_sha:SHA,
 quarantine_epoch:3,feature_epoch:0,
 installation_authorized:false,original_job_completed:false,production_changed:false
};
function fixture({refStatus=404,releaseSha=NEW,scoped=scope}={}){
 const calls=[],reads=[];
 const call=async(_db,name,params)=>{
  calls.push({name,params});
  if(name==='reality_read_next_signed_chat_recovery_publish_v1')return scoped;
  if(name==='reality_requalify_fenced_signed_chat_provider_v1')
   return {status:'SIGNED_FENCED_PROVIDER_NEW_RELEASE_SAME_ORIGINAL_SPEC_FROZEN',
    trigger_id:UUID,original_work_id:WORK,
    previous_candidate_sha256:scope.candidate.candidate_sha256,
    previous_branch:originalBranch,
    new_branch:'reality/chat-recovery/'+UUID+'-syntax-r4',
    new_spec_sha256:'sha256:'+'3'.repeat(64),
    independent_requalification_receipt_sha256:'sha256:'+'4'.repeat(64),
    full_goal_feature_accepted:false,installation_authorized:false,
    original_job_completed:false,production_changed:false,new_shift_started:false};
  throw Error('UNKNOWN_RPC_'+name);
 };
 const fetchImpl=async(url,opt)=>{
  reads.push({url,method:opt.method});
  assert.equal(opt.method,'GET');
  if(url==='https://api.github.com/repos/maloney2323/Reality')
   return {status:200,ok:true,json:async()=>({full_name:'maloney2323/Reality',private:false})};
  if(url.endsWith('/git/ref/heads/'+originalBranch))
   return {status:refStatus,ok:refStatus===200,json:async()=>({})};
  if(url.endsWith('/git/ref/heads/'+env.VERCEL_GIT_COMMIT_REF))
   return {status:200,ok:true,json:async()=>({ref:'refs/heads/'+env.VERCEL_GIT_COMMIT_REF,object:{sha:releaseSha}})};
  if(url.endsWith('/commits/'+SHA))
   return {status:200,ok:true,json:async()=>({sha:SHA})};
  throw Error('UNEXPECTED_GITHUB_GET_'+url);
 };
 return {calls,reads,call,fetchImpl};
}
test('independent read-only GitHub ref review requalifies same original once on new source',async()=>{
 const f=fixture();
 const r=await requalifyOneFencedSignedChatProvider({db,env,shiftId:shift,workerRunId:run,
  call:f.call,fetchImpl:f.fetchImpl});
 assert.equal(r.status,'SIGNED_FENCED_PROVIDER_NEW_RELEASE_SAME_ORIGINAL_SPEC_FROZEN');
 assert.equal(r.original_work_id,WORK);
 assert.equal(r.prior_fenced_branch,originalBranch);
 assert.equal(r.new_branch,'reality/chat-recovery/'+UUID+'-syntax-r4');
 assert.equal(r.old_provider_write_replayed,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.original_job_completed,false);
 assert.deepEqual(f.calls.map(x=>x.name),[
  'reality_read_next_signed_chat_recovery_publish_v1',
  'reality_requalify_fenced_signed_chat_provider_v1'
 ]);
 assert.equal(f.calls[1].params.p_shift_id,shift);
 assert.equal(f.calls[1].params.p_worker_run_id,run);
 assert.equal(f.calls[1].params.p_current_release_sha,NEW);
 assert.equal(f.calls[1].params.p_original_branch,originalBranch);
 assert.equal(f.calls[1].params.p_independent_ref_status,404);
 assert.equal(f.reads.length,4);
 assert.ok(f.reads.every(x=>x.method==='GET'));
});
test('same old release or observed original ref cannot requalify',async()=>{
 for(const [f,e] of [
  [fixture({refStatus:200}),env],
  [fixture({releaseSha:SHA}),env],
  [fixture(),{...env,VERCEL_GIT_COMMIT_SHA:SHA}]
 ]){
  const r=await requalifyOneFencedSignedChatProvider({db,env:e,
   shiftId:shift,workerRunId:run,call:f.call,fetchImpl:f.fetchImpl});
  assert.notEqual(r.status,'SIGNED_FENCED_PROVIDER_NEW_RELEASE_SAME_ORIGINAL_SPEC_FROZEN');
  assert.equal(f.calls.length,1);
 }
});
test('provider requalification has exact original and signed active shift gates',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261122165000_requalify_fenced_provider_new_release_v1.sql',
  import.meta.url),'utf8');
 for(const check of [
  "current_user<>'service_role'",
  "run.run_id=p_worker_run_id and run.status='STARTED'",
  "warrant.state='ACTIVE'",
  "w.shift_id=p_shift_id",
  "w.message_sha256=q.source_sha256",
  "w.development->>'original_work_id'=q.original_work_id",
  "and phase='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'",
  "and quarantine_receipt_sha256 is null",
  "recovery_spec->>'provider_requalification_epoch' is null",
  "p_public_repo_status<>200",
  "p_independent_ref_status<>404",
  "distinct h.content::jsonb->'signed_chat_review_incident_observation'->>'worker_run_id'",
  "v_broker_count<2",
  "SIGNED_GOVERNED_TRANSITION_STALLED",
  "p_old_release_sha=p_current_release_sha",
  "previous_fenced_candidate_sha256",
  "syntax_revision_epoch',v_epoch+1",
  "qualified_candidate=null",
  "phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN'",
  "new_shift_started',false",
  "installation_authorized',false",
  "original_job_completed',false",
  "production_changed',false"
 ])assert.ok(sql.includes(check),check);
 assert.doesNotMatch(sql,/security definer|update\s+public\.reality_chat_messages|insert\s+into\s+reality_internal\.governed_employee_shifts_v1/i);
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const requal=worker.indexOf("requalifyOneFencedSignedChatProvider({");
 const quarantine=worker.indexOf("stageNextSignedChatRecoveryQuarantine({");
 assert.ok(requal>0&&quarantine>requal);
});
