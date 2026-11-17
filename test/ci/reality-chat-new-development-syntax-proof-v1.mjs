// Independent GitHub Actions source-patch acceptance. No model content is
// imported or run; no credentials or installation APIs are available.
// The only PR file permitted is an inert evidence JSON proposal.
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const SHA=/^[a-f0-9]{40}$/;
const ID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const PATH=/^(?:src\/[A-Za-z0-9_./-]+\.js|api\/reality\/[A-Za-z0-9_./-]+\.js|reality-[A-Za-z0-9_.-]+\.(?:js|css)|index\.html)$/;
const fail=code=>{throw Error('CHAT_NEW_DEV_CI_'+code)};
const {BASE_SHA,HEAD_SHA,PR_HEAD_BRANCH}=process.env;
if(!SHA.test(BASE_SHA||'')||!SHA.test(HEAD_SHA||'')||
 !/^reality\/chat-development\/[a-f0-9-]{36}$/.test(PR_HEAD_BRANCH||''))
 fail('EXACT_GITHUB_PR_SOURCE_REQUIRED');
const changed=execFileSync('git',['diff','--name-only',BASE_SHA,HEAD_SHA],{
 encoding:'utf8',maxBuffer:400000}).trim().split('\n').filter(Boolean);
if(changed.length!==1||!/^evidence\/reality-chat-development\/[a-f0-9-]{36}\.json$/.test(changed[0]))
 fail('ONLY_INERT_DRAFT_EVIDENCE_PERMITTED');
const artifact=JSON.parse(readFileSync(changed[0],'utf8'));
const path=artifact.candidate?.target_path;
const a=artifact.candidate;
const uuid=changed[0].split('/').at(-1).replace('.json','');
if(!ID.test(uuid)||artifact.message_id!==uuid||
 PR_HEAD_BRANCH!=='reality/chat-development/'+uuid||
 artifact.version!=='reality-chat-new-development-candidate-v1'||
 !WORK.test(artifact.original_work_id||'')||
 !SHA.test(artifact.base_sha||'')||
 !PATH.test(path||'')||path.includes('..')||path.includes('//')||
 !SHA.test(a?.source_blob_sha||'')||
 !SHA.test(a?.base_sha||'')||a.base_sha!==artifact.base_sha||
 typeof a.find!=='string'||a.find.length<20||a.find.length>12000||
 typeof a.replace!=='string'||a.replace.length<20||a.replace.length>16000||
 a.replace===a.find||
 typeof a.reason!=='string'||a.reason.length<10||a.reason.length>1800||
 artifact.installation_authorized!==false||
 artifact.original_job_completed!==false||
 artifact.production_changed!==false||
 artifact.feature_acceptance_verified!==false)
 fail('INERT_DRAFT_OR_ORIGINAL_IDENTITY_INVALID');
const parent=execFileSync('git',['rev-list','--parents','-n','1',HEAD_SHA],{
 encoding:'utf8'}).trim().split(' ');
if(parent.length!==2||parent[1]!==artifact.base_sha)
 fail('CANDIDATE_PARENT_SOURCE_CHANGED');
const blob=execFileSync('git',['show',artifact.base_sha+':'+path],{
 maxBuffer:350000});
if(blob.length<100||blob.length>250000)
 fail('SOURCE_BYTES_UNBOUNDED');
const gitSha=createHash('sha1').update('blob '+blob.length+'\0')
 .update(blob).digest('hex');
if(gitSha!==a.source_blob_sha)fail('MODEL_DRAFT_SOURCE_BLOB_CHANGED');
const original=blob.toString('utf8');
const at=original.indexOf(a.find);
if(at<0||original.indexOf(a.find,at+1)!==-1)
 fail('PATCH_FIND_NOT_UNIQUE_IN_TRUSTED_SOURCE');
const next=original.slice(0,at)+a.replace+
 original.slice(at+a.find.length);
if(next===original||Buffer.byteLength(next,'utf8')>280000||
 next.includes('\0'))
 fail('MODEL_GENERATED_SOURCE_INVALID');
if(path.endsWith('.js')){
 const folder=mkdtempSync(join(tmpdir(),'reality-chat-dev-syntax-'));
 const filename=join(folder,'proposal.mjs');
 try{
  writeFileSync(filename,next,{mode:0o600});
  execFileSync(process.execPath,['--check',filename],{
   timeout:12000,stdio:'pipe',maxBuffer:30000});
 }finally{rmSync(folder,{recursive:true,force:true})}
}else{
 if(next.length<100||next.includes('\0'))fail('NON_JS_SOURCE_UNVERIFIED');
}
console.log('INDEPENDENT_CHAT_NEW_DEVELOPMENT_SOURCE_AND_SYNTAX_ACCEPTED');
console.log(JSON.stringify({
 original_work_id:artifact.original_work_id,head_sha:HEAD_SHA,
 source_blob_verified:true,model_code_executed:false,
 source_installed:false,feature_acceptance_verified:false,
 installation_authorized:false,production_changed:false
}));
