import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL(
 '../supabase/functions/reality-governed-general-original-recovery-installer-v1/index.ts',
 import.meta.url),'utf8');
const migration=readFileSync(new URL(
 '../supabase/migrations/20261116_exact_fenced_original_recovery_publication_v1.sql',
 import.meta.url),'utf8');
const main=source.slice(source.indexOf('function validScope('),
 source.indexOf('Deno.serve('));
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const BRANCH=/^reality\/[A-Za-z0-9/_-]{10,135}$/;
const FILE=/^src\/[A-Za-z0-9/_-]+[.]js$/;
const parent='a'.repeat(40);
const post='b'.repeat(40);
const approval='11111111-1111-4111-8111-111111111111';
const publication='22222222-2222-4222-8222-222222222222';
const shift='33333333-3333-4333-8333-333333333333';
const attempt='44444444-4444-4444-8444-444444444444';
function scope(phase='OWNER_APPROVED'){
 return {
 status:'EXACT_RECOVERY_PUBLICATION_CURRENT_OWNER_SCOPE',
 recovery_publication_id:publication,original_work_id:'work:45206a326ddf406b1c083a819da24aaa',
 attempt_id:attempt,shift_id:shift,owner_approval_id:approval,
 phase,target_branch:'reality/chat-resilient-signed-response-20261114',
 target_path:'src/reality-riley-service-original-runtime-v1.js',
 expected_parent_commit_sha:parent,
 expected_preinstall_blob_sha:'c'.repeat(40),
 expected_installed_blob_sha:'d'.repeat(40),
 candidate_commit_sha:'e'.repeat(40),
 candidate_artifact_sha256:'sha256:'+'f'.repeat(64),
 write_authorized:phase==='OWNER_APPROVED',
 original_job_completed:false,production_changed:false};
}
function harness({putStatus=200,drift=false}={}){
 let branchHead=drift?'9'.repeat(40):parent;
 const calls=[];
 const safe=(status,more={})=>({status,source_installed:false,
  original_job_completed:false,production_changed:false,...more});
 const fail=s=>{throw Error('RECOVERY_ORIGINAL_'+s)};
 const checked=async(_token,_path,ref)=>{
  calls.push({type:'source',ref});
  if(ref===post||ref==='9'.repeat(40))
   return {blob:'d'.repeat(40),digest:'sha256:'+'f'.repeat(64)};
  if(ref==='e'.repeat(40))
   return {blob:'d'.repeat(40),digest:'sha256:'+'f'.repeat(64),bytes:Uint8Array.from([1,2,3])};
  return {blob:'c'.repeat(40),digest:'sha256:'+'0'.repeat(64),bytes:Uint8Array.from([0])};
 };
 const head=async()=>{calls.push({type:'head'});return branchHead;};
 const gh=async(_token,path,method,body)=>{
  calls.push({type:'github',path,method,body});
  if(method==='PUT'){
   if(putStatus===200)branchHead=post;
   return {ok:putStatus===200,status:putStatus,
    data:putStatus===200?{
     commit:{sha:post},content:{sha:'d'.repeat(40)}}:{}};
  }
  if(path==='/commits/'+post)
   return {ok:true,status:200,
    data:{parents:[{sha:parent}],
     files:[{filename:'src/reality-riley-service-original-runtime-v1.js',status:'modified'}]}};
  throw Error('unexpected GitHub endpoint '+path);
 };
 const rpc=async(_base,_key,name)=>{
  calls.push({type:'rpc',name});
  if(name==='reality_claim_general_original_recovery_publication_v1')
   return {status:'ONE_EXACT_RECOVERY_PUBLICATION_WRITE_FENCED',
    recovery_publication_id:publication,original_work_id:scope().original_work_id,
    attempt_id:attempt,owner_approval_id:approval,
    expected_parent_commit_sha:parent,
    expected_preinstall_blob_sha:'c'.repeat(40),
    expected_installed_blob_sha:'d'.repeat(40),
    candidate_artifact_sha256:'sha256:'+'f'.repeat(64),
    target_branch:scope().target_branch,target_path:scope().target_path,
    write_authorized:true,original_job_completed:false,production_changed:false};
  if(name==='reality_record_general_original_recovery_published_v1')
   return {status:'RECOVERY_ORIGINAL_SOURCE_INSTALLED_IN_SAME_JOB',
    original_work_id:scope().original_work_id,installed_commit_sha:post,
    source_installed:true,original_job_completed:false,production_changed:false,
    next_gate:'INDEPENDENT_SAME_ORIGINAL_POSTINSTALL_ACCEPTANCE_AND_SETTLEMENT'};
  throw Error('unexpected RPC '+name);
 };
 const {validScope,execute,reconcile}=Function(
  'SHA','HASH','WORK','UUID','BRANCH','FILE','safe','fail',
  'checked','head','gh','rpc','encode',
  main+'\nreturn {validScope,execute,reconcile};')(
  SHA,HASH,WORK,UUID,BRANCH,FILE,safe,fail,
  checked,head,gh,rpc,()=> 'frozen-base64');
 return {calls,validScope,execute,reconcile};
}
test('signed same-original recovery grant requires immutable frozen fields',()=>{
 const h=harness();
 assert.equal(h.validScope(scope()),true);
 const s=scope();delete s.owner_approval_id;
 assert.equal(h.validScope(s),false);
 s.owner_approval_id=approval;s.expected_parent_commit_sha='';
 assert.equal(h.validScope(s),false);
});
test('one exact approved recovery safely writes one file once and records only installation',async()=>{
 const h=harness(),result=await h.execute('token','base','key',scope());
 assert.equal(result.status,'RECOVERY_ORIGINAL_SOURCE_INSTALLED_IN_SAME_JOB');
 assert.equal(result.source_installed,true);
 assert.equal(result.original_job_completed,false);
 const writes=h.calls.filter(c=>c.type==='github'&&c.method==='PUT');
 assert.equal(writes.length,1);
 assert.equal(writes[0].body.sha,'c'.repeat(40));
 assert.equal(writes[0].body.branch,scope().target_branch);
 assert.equal(writes[0].body.content,'frozen-base64');
 assert.deepEqual(h.calls.filter(c=>c.type==='rpc').map(c=>c.name),[
  'reality_claim_general_original_recovery_publication_v1',
  'reality_record_general_original_recovery_published_v1']);
});
test('provider uncertainty stays fenced without any retry or claimed final receipt',async()=>{
 const h=harness({putStatus:503});
 const r=await h.execute('token','base','key',scope());
 assert.equal(r.status,'RECOVERY_PROVIDER_COMMIT_RESPONSE_UNVERIFIED_NO_REPLAY');
 assert.equal(r.original_job_completed,false);
 assert.equal(h.calls.filter(c=>c.type==='github'&&c.method==='PUT').length,1);
 assert.equal(h.calls.filter(c=>c.type==='rpc'&&c.name.includes('record')).length,0);
});
test('after durable write fence all wakes remain GET-only, including unchanged parent',async()=>{
 const h=harness();
 const r=await h.execute('token','base','key',scope('RECOVERY_WRITE_FENCED'));
 assert.equal(r.status,'RECOVERY_WRITE_FENCED_ORIGINAL_HEAD_UNCHANGED_NO_RETRY');
 assert.equal(h.calls.filter(c=>c.type==='github'&&c.method!=='GET').length,0);
 assert.equal(h.calls.filter(c=>c.type==='rpc').length,0);
});
test('drifted parent prohibits a write and a lease',async()=>{
 const h=harness({drift:true});
 const r=await h.execute('token','base','key',scope());
 assert.equal(r.status,'RECOVERY_SOURCE_BASELINE_CHANGED_NO_WRITE');
 assert.equal(h.calls.filter(c=>c.type==='github').length,0);
 assert.equal(h.calls.filter(c=>c.type==='rpc').length,0);
});
test('migration fences additional authority to a signed exact owner decision',()=>{
 assert.match(migration,/SECURITY DEFINER SET search_path=''/);
 assert.match(migration,/auth\.uid\(\)/);
 assert.match(migration,/p_intent<>'OWNER_APPROVE_ONE_EXACT_FENCED_ORIGINAL_RECOVERY_PUBLICATION'/);
 assert.match(migration,/phase='RECOVERY_WRITE_FENCED'/);
 assert.match(migration,/phase='READY_FOR_EXACT_RECOVERY_APPROVAL'/);
 assert.match(migration,/independent_recovery_test_run_id/);
 assert.match(migration,/reality_record_general_original_installed_source_v1/);
 assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.reality_owner_approve_general_original_recovery_v1/);
 assert.doesNotMatch(source,/force:true/);
 assert.doesNotMatch(source,/\/git\/refs\/heads\/.*'PATCH'/);
});
