import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {attestCurrentRileyCandidate263}
 from '../src/reality-riley-current-shift-candidate-verifier-v2.js';

const owner='11111111-2222-4333-8444-555555555555';
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const priorShift='21dff8db-6f46-444d-a149-ab15f1caf8fe';
const work='work:873a6e74fd14c6beacc9042dd8021dfc';
const priorWork='work:f2a5b8ecdd048cfa102cbb20c5fa2e86';
const source='https://github.com/maloney2323/Reality/issues/263';
const digest='sha256:'+'2'.repeat(64);
const db={strictSecrets:true,project:'previewdb',url:'https://previewdb.supabase.co',
 secretKey:'preview-only-fake-secret'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'previewdb'};
const suffix=work.slice(5,17);
const branch='reality/riley/repair-263-'+suffix;
const proofPath='reality-riley-proof/repair-263-'+suffix+'.json';
const codePath='src/reality-riley-service-original-runtime-v1.js';
const candidateSha='b'.repeat(40),testedSha='a'.repeat(40);
const hex=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const code=Buffer.from('export const stableSourceRepair = true;\n');
const receipt={
 version:'reality-riley-real-original-existing-file-model-repair-proof-v1',
 status:'MODEL_WRITTEN_REPAIR_FROZEN_AND_EXISTING_CHECKS_PASSED',
 shift_id:shift,original_work_id:work,issue_url:source,
 shift_source_proof_sha256:digest,request_commit_sha:testedSha,
 owner_installation_authorized:false,original_job_completed:false,
 production_changed:false,independent_baseline_reproduced:true,
 independent_frozen_passed:true,independent_existing_tests_passed:true,
 independent_candidate_syntax_passed:true,model_response_id:'resp_verified_model_sample',
 workflow_run_id:42470000000,original_failing_run_id:42469999999,
 changed_files:[codePath],candidate_source_sha256:hex(code)
};
const blob=(path,b)=>({path,encoding:'base64',size:b.length,
 content:b.toString('base64'),sha:gitBlob(b)});
function state({current=true,phase='SOURCE_ADMITTED'}={}){
 const original={shift_id:shift,original_work_id:work,source_ref:source,
  source_proof_sha256:digest,phase,installation_authorized:false,
  original_job_completed:false,production_changed:false};
 const old={...original,shift_id:priorShift,original_work_id:priorWork,
  source_proof_sha256:'sha256:'+'e'.repeat(64)};
 const steps=Array.from({length:8},(_,i)=>({
  step_index:i+1,state:i===1?'SOURCE_CHECKED':i>=5?'AWAITING_EXACT_WORK':'QUEUED',
  source_ref:i===1?source:null,proof_sha256:i===1?digest:null
 }));
 const shiftRow={shift_id:shift,status:current?'AWAITING_EXACT_ORIGINAL_WORK':
  'ENDED_WITH_BLOCKED_WORK',planned_start_at:'2026-11-08T13:34:36Z',
  planned_end_at:current?'infinity':'2026-11-08T13:50:00Z',
  plan_fingerprint:'sha256:'+'d'.repeat(64),steps,
  closed_at:current?null:'2026-11-08T13:50:00Z'};
 return {
  original:{status:'OWNER_SCOPED_UNATTENDED_REPAIR_ORIGINAL_READBACK',
   jobs:[old,original],production_changed:false},
  shifts:{status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
   work_installation_authorized_by_read:false,
   verified_human_hours_saved:null,production_changed:false,
   shifts:[{...shiftRow,shift_id:priorShift,status:'ENDED_WITH_BLOCKED_WORK',
    planned_end_at:'2026-11-08T13:00:00Z',closed_at:'2026-11-08T13:00:00Z'},
    shiftRow]}
 };
}
function fixture({provider=null,current=true,receiptResult=null,phase='SOURCE_ADMITTED'}={}){
 const requests=[],rpcCalls=[];
 const s=state({current,phase});
 const callRpc=async(_db,name,args)=>{
  rpcCalls.push({name,args});
  if(name==='reality_read_owner_riley_repair_original_v1')return s.original;
  if(name==='reality_read_owner_employee_shifts_v1')return s.shifts;
  if(name==='reality_attest_riley_263_candidate_v2'){
   return receiptResult||{
    status:'EXACT_OWNER_SHIFT_CODE_CANDIDATE_INDEPENDENTLY_TESTED_AWAITING_INSTALL_APPROVAL',
    shift_id:shift,original_work_id:work,candidate_commit_sha:candidateSha,
    candidate_artifact_sha256:'sha256:'+hex(code),
    installation_authorized:false,original_job_completed:false,
    production_changed:false
   };
  }
  throw Error('FORBIDDEN_RPC_'+name);
 };
 const fetchImpl=async(url)=>{
  const path=new URL(url).pathname.replace('/repos/maloney2323/Reality','')+
   new URL(url).search;
  requests.push(path);
  if(provider===null)return {status:404,ok:false};
  const result=provider(path);
  if(result===null)return {status:404,ok:false};
  return {status:200,ok:true,json:async()=>result};
 };
 return {requests,rpcCalls,run:()=>attestCurrentRileyCandidate263({
  db,ownerId:owner,env,fetchImpl,callRpc})};
}
function goodProvider(path){
 if(path==='/git/ref/heads/'+branch)return {object:{sha:candidateSha}};
 if(path==='/git/commits/'+candidateSha)return {
  sha:candidateSha,parents:[{sha:testedSha}]};
 if(path==='/contents/'+proofPath+'?ref='+encodeURIComponent(branch))
  return blob(proofPath,Buffer.from(JSON.stringify(receipt)));
 if(path==='/contents/'+codePath+'?ref='+encodeURIComponent(branch)||
    path==='/contents/'+codePath+'?ref='+testedSha)
  return blob(codePath,code);
 if(path==='/actions/runs/'+receipt.workflow_run_id)return {
  id:receipt.workflow_run_id,status:'completed',conclusion:'success',
  name:'Reality · Riley unattended real-source repair candidate',
  head_sha:testedSha,
  html_url:'https://github.com/maloney2323/Reality/actions/runs/'+receipt.workflow_run_id};
 if(path==='/actions/runs/'+receipt.original_failing_run_id)return {
  id:receipt.original_failing_run_id,status:'completed',conclusion:'failure',
  head_sha:'c'.repeat(40)};
 throw Error('UNEXPECTED_PROVIDER_RESOURCE_'+path);
}
test('current owner shift is selected, old shift ignored, no branch means no candidate claimed',async()=>{
 const f=fixture();
 const out=await f.run();
 assert.equal(out.status,'RILEY_CURRENT_CANDIDATE_MODEL_WRITTEN_CANDIDATE_NOT_YET_STAGED');
 assert.deepEqual(f.requests,['/git/ref/heads/'+branch]);
 assert.equal(f.rpcCalls.some(x=>x.name==='reality_attest_riley_263_candidate_v2'),false);
 assert.equal(out.original_job_completed,false);
 assert.equal(out.installation_authorized,false);
});
test('ended shift never reads candidate files or produces attestation',async()=>{
 const f=fixture({current:false,provider:goodProvider});
 const out=await f.run();
 assert.equal(out.status,'RILEY_CURRENT_CANDIDATE_NO_AUTHORIZED_ACTIVE_SHIFT');
 assert.equal(f.requests.length,0);
 assert.equal(f.rpcCalls.filter(x=>x.name.includes('attest')).length,0);
});
test('current original source and TESTED source bytes both independently verified before a durable candidate receipt',async()=>{
 const f=fixture({provider:goodProvider});
 const result=await f.run();
 assert.equal(result.status,
  'EXACT_OWNER_SHIFT_CODE_CANDIDATE_INDEPENDENTLY_TESTED_AWAITING_INSTALL_APPROVAL');
 assert.equal(result.shift_id,shift);
 assert.equal(result.original_work_id,work);
 assert.equal(result.installation_authorized,false);
 const verified=f.rpcCalls.filter(x=>x.name==='reality_attest_riley_263_candidate_v2');
 assert.equal(verified.length,1);
 assert.equal(verified[0].args.p_candidate_commit_sha,candidateSha);
 assert.equal(verified[0].args.p_original_work_id,work);
 assert.equal(verified[0].args.p_candidate_source_sha256,'sha256:'+hex(code));
 assert.equal(f.requests.some(x=>x.includes(priorWork.slice(5,17))),false);
 assert.ok(f.requests.includes('/contents/'+codePath+'?ref='+testedSha));
});
test('candidate proof and test run must be for the SAME exact source bytes',async()=>{
 const f=fixture({provider:path=>{
  if(path==='/contents/'+codePath+'?ref='+testedSha)
   return blob(codePath,Buffer.from('export const maliciousDrift=true;'));
  return goodProvider(path);
 }});
 await assert.rejects(f.run(),/INDEPENDENT_TESTED_CANDIDATE_AND_FAILURE_EVIDENCE_REQUIRED/);
 assert.equal(f.rpcCalls.some(x=>x.name==='reality_attest_riley_263_candidate_v2'),false);
});
test('provider workflow failure cannot create a valid candidate',async()=>{
 const f=fixture({provider:path=>{
  if(path==='/actions/runs/'+receipt.workflow_run_id){
   return {...goodProvider(path),conclusion:'failure'};
  }
  return goodProvider(path);
 }});
 await assert.rejects(f.run(),/INDEPENDENT_TESTED_CANDIDATE_AND_FAILURE_EVIDENCE_REQUIRED/);
 assert.equal(f.rpcCalls.some(x=>x.name==='reality_attest_riley_263_candidate_v2'),false);
});
test('active candidate does not reuse historical proof, and browser cannot attest without service boundary',async()=>{
 const f=fixture({phase:'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'});
 const out=await f.run();
 assert.equal(out.status,'RILEY_CURRENT_CANDIDATE_EXACT_TESTED_CANDIDATE_AWAITING_OWNER_APPROVAL');
 assert.equal(f.requests.length,0);
 await assert.rejects(attestCurrentRileyCandidate263({
  db,ownerId:owner,env:{...env,VERCEL_ENV:'production'},
  fetchImpl:async()=>{throw Error('NO_NETWORK')},
  callRpc:async()=>{throw Error('NO_RPC')}
 }),/RILEY_CURRENT_CANDIDATE_OWNER_PREVIEW_SCOPE_REQUIRED/);
});
test('worker uses current-shift candidate verifier, not expired hardcoded work receipt',()=>{
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../supabase/migrations/20261108_current_riley_candidate_attestation_v2.sql',import.meta.url),'utf8');
 assert.match(worker,/attestCurrentRileyCandidate263/);
 assert.doesNotMatch(worker,/attestExactRileyCandidate263/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/t\.proof_sha256=j\.shift_source_proof_sha256/);
 assert.match(sql,/sh\.planned_end_at='infinity'/);
 assert.match(sql,/revoke all on function public\.reality_attest_riley_263_candidate_v2/);
 assert.doesNotMatch(sql,/e6a68e0bac2f8465da13b00fcc808eacba11ec1c0cfbd07497bdb5f7a95d09b6/);
});