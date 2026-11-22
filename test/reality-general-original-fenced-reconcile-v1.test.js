import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const installer=readFileSync(new URL(
 '../supabase/functions/reality-governed-general-original-installer-v1/index.ts',
 import.meta.url),'utf8');
const helperSource=installer.slice(installer.indexOf('const CHAT_SOURCE='),
 installer.indexOf('\nconst fail=',installer.indexOf('const CHAT_SOURCE=')));
const scopeSource=installer.slice(installer.indexOf('function validScope(x){'),
 installer.indexOf('\nasync function reconcile(',installer.indexOf('function validScope(x){')));
const reconcileSource=installer.slice(installer.indexOf('async function reconcile('),
 installer.indexOf('\nDeno.serve(',installer.indexOf('async function reconcile(')));
const sha=/^[a-f0-9]{40}$/, hash=/^sha256:[a-f0-9]{64}$/,
 work=/^work:[a-f0-9]{32}$/,
 uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/,
 branch=/^reality\/[a-zA-Z0-9/_-]{10,135}$/,
 sourcePath=/^src\/[a-zA-Z0-9/_-]+\.js$/;
const validScope=Function('SHA','HASH','WORK','UUID','BRANCH','SOURCE',
 helperSource+'\n'+scopeSource+'\nreturn validScope;')(
 sha,hash,work,uuid,branch,sourcePath);
function scope(phase){
 return {status:'GENERAL_INSTALL_OWNER_APPROVED_SOURCE_SCOPE',
  phase,
  original_work_id:'work:45206a326ddf406b1c083a819da24aaa',
  attempt_id:'22222222-2222-4222-8222-222222222222',
  shift_id:'33333333-3333-4333-8333-333333333333',
  owner_id:'44444444-4444-4444-8444-444444444444',
  approval_receipt_id:'55555555-5555-4555-8555-555555555555',
  target_branch:'reality/chat-resilient-signed-response-20261114',
  target_path:'src/reality-riley-service-original-runtime-v1.js',
  candidate_commit_sha:'1'.repeat(40),
  expected_preinstall_blob_sha:'2'.repeat(40),
  expected_installed_blob_sha:'3'.repeat(40),
  candidate_artifact_sha256:'sha256:'+'4'.repeat(64),
  expected_parent_commit_sha:'5'.repeat(40),
  installation_authorized:true,original_job_completed:false,
  production_changed:false};
}
test('same-original approval can be staged without a parent but fenced installer cannot',()=>{
 const owner=scope('OWNER_APPROVED');
 delete owner.expected_parent_commit_sha;
 assert.equal(validScope(owner),true);
 const fenced=scope('INSTALL_INTENT_FENCED');
 delete fenced.expected_parent_commit_sha;
 assert.equal(validScope(fenced),false);
 assert.equal(validScope(scope('INSTALL_INTENT_FENCED')),true);
 assert.equal(validScope(scope('SOURCE_INSTALLED')),true);
 assert.equal(validScope(scope('DEPLOYMENT_VERIFIED')),true);
});
function harness(){
 const calls=[];
 const safe=(status,more={})=>({status,source_installed:false,
  original_job_completed:false,production_changed:false,...more});
 const fail=s=>{throw Error('GENERAL_ORIGINAL_INSTALL_'+s)};
 const gh=async(_token,path,method='GET')=>{
  calls.push(['github',path,method]);
  if(method!=='GET')throw Error('MUTATION_NOT_AUTHORIZED');
  if(path==='')return {ok:true,status:200,data:{permissions:{push:true}}};
  if(path.startsWith('/git/commits/'))
   return {ok:true,status:200,data:{tree:{sha:'6'.repeat(40)}}};
  if(path.startsWith('/git/blobs/'))
   return {ok:true,status:200,data:{sha:'3'.repeat(40)}};
  throw Error('unexpected GitHub path');
 };
 const checkedSource=async(_token,_path,ref)=>{
  calls.push(['source',ref,'GET']);
  return ref==='5'.repeat(40)?
   {blob:'2'.repeat(40),digest:'sha256:'+'7'.repeat(64)}:
   {blob:'3'.repeat(40),digest:'sha256:'+'4'.repeat(64)};
 };
 const digest=async(_kind,bytes)=>
  createHash('sha256').update(Buffer.from(bytes)).digest('hex');
 const rpc=async(_base,_key,name)=>{
  calls.push(['rpc',name,'POST']);
  if(name!=='reality_record_general_original_fenced_recovery_v1')
   throw Error('unapproved RPC');
  return {status:'GENERAL_ORIGINAL_FENCED_RECOVERY_OBSERVATION_DURABLE',
   original_work_id:scope('INSTALL_INTENT_FENCED').original_work_id,
   shift_id:scope('INSTALL_INTENT_FENCED').shift_id,
   phase:'READ_ONLY_DIAGNOSIS_RECORDED',
   installation_retried:false,original_job_completed:false,
   production_changed:false};
 };
 const run=Function('SHA','safe','fail','gh','checkedSource','digest',
  'rpc','TextEncoder',helperSource+'\n'+reconcileSource+'\nreturn reconcile;')(
  sha,safe,fail,gh,checkedSource,digest,rpc,TextEncoder);
 return {run,calls};
}
test('missing pinned parent is a hard error, never a false no-effect receipt',async()=>{
 const h=harness(),f=scope('INSTALL_INTENT_FENCED');
 delete f.expected_parent_commit_sha;
 await assert.rejects(()=>h.run('token','base','key',f,'5'.repeat(40)),
  /FENCED_EXPECTED_PARENT_COMMIT_SHA_NOT_VERIFIED/);
 assert.equal(h.calls.length,0);
});
test('matching parent produces durable read-only diagnosis and no GitHub ref retry',async()=>{
 const h=harness(),f=scope('INSTALL_INTENT_FENCED');
 const r=await h.run('token','base','key',f,f.expected_parent_commit_sha);
 assert.equal(r.status,'GENERAL_INSTALL_ALREADY_FENCED_NO_PROVIDER_EFFECT_CONFIRMED');
 assert.equal(r.original_job_completed,false);
 assert.equal(r.production_changed,false);
 assert.equal(h.calls.filter(x=>x[0]==='rpc').length,1);
 assert.equal(h.calls.filter(x=>x[0]==='github'&&x[2]!=='GET').length,0);
});
