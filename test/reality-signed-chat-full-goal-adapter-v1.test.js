import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
import {advanceSignedChatFullGoalAcceptance,selectSignedChatGoalRun,signedChatFunctionalVerdict,verifiedPreviewProviderEvidence,signedChatPreviewBranch,
 SIGNED_CHAT_GOAL_WORKFLOW,SIGNED_CHAT_GOAL_SUITE,SIGNED_CHAT_GOAL_NAME} from '../src/reality-signed-chat-full-goal-acceptance-v1.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const id=n=>'11111111-2222-4333-8444-'+String(n).padStart(12,'0');
const sha=n=>String(n).repeat(40),hash=n=>'sha256:'+String(n).repeat(64);
const repo='maloney2323/Reality',root='https://api.github.com/repos/'+repo;
const branch='repair/isolated-feature-acceptance-fixture',base=sha(1),head=sha(2),sourceCommit=sha(3);
const candidateBranch='reality/chat-recovery/'+id(1)+'-syntax-r1';
const flags={installation_authorized:false,original_job_completed:false,production_changed:false,new_shift_started:false};
const db={strictSecrets:true,project:'fixture',url:'https://fixture.supabase.co',secretKey:'fixture-not-a-real-key'};
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch,VERCEL_GIT_COMMIT_SHA:base,REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
function file(path,src){const b=Buffer.from(src),blob=createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
 return {path,encoding:'base64',size:b.length,content:b.toString('base64'),sha:blob};}
const path='src/fixture.js',old=file(path,'export const a=1;'),candidate=file(path,'export const a=2;');
const workflow=file(SIGNED_CHAT_GOAL_WORKFLOW,'frozen workflow'),suite=file(SIGNED_CHAT_GOAL_SUITE,'frozen functional test');
const c={...flags,status:'SIGNED_CHAT_FULL_GOAL_ACCEPTANCE_ELIGIBLE',source_family:'SIGNED_CHAT_DEVELOPMENT_RECOVERY',attempt_id:id(1),owner_id:id(2),
 shift_id:id(3),worker_run_id:id(4),source_message_id:id(5),source_ref:'supabase:reality_chat_messages:'+id(5),
 original_work_id:'work:'+'a'.repeat(32),base_sha:base,candidate_commit_sha:head,source_commit_sha:sourceCommit,
 expected_preinstall_blob_sha:old.sha,expected_installed_blob_sha:candidate.sha,candidate_sha256:hash(4),
 candidate_artifact_sha256:'sha256:'+createHash('sha256').update(Buffer.from(candidate.content,'base64')).digest('hex'),
 quarantine_receipt_sha256:hash(5),target_path:path,candidate_branch:candidateBranch,candidate_pr_number:12};
const run=(event,n=1,conclusion='success')=>({id:12000+n,head_sha:head,head_branch:candidateBranch,event,
 name:SIGNED_CHAT_GOAL_NAME,path:SIGNED_CHAT_GOAL_WORKFLOW,status:'completed',conclusion,html_url:'https://github.com/'+repo+'/actions/runs/'+(12000+n)});
const job=(r,conclusion='success',stepConclusion=conclusion)=>({id:22000+r.id,run_id:r.id,name:'independent-chat-full-goal',status:'completed',conclusion,
 steps:['Checkout exact candidate or installed commit','Verify exact source identity','Prepare isolated Node runtime',
  'Independently execute full-goal functional contract without secrets or network','Confirm acceptance grants no installation or completion authority']
 .map((name,i)=>({name,conclusion:i===3?stepConclusion:i===4&&conclusion==='failure'?'skipped':'success'}))});
function fixture({failed=false,wrongBlob=false,wrongRelease=false,wrongSuite=false,badTransport=false,missingIntegration=false}={}){
 const push=run('push',1,failed?'failure':'success'),pr=run('pull_request',2);
 const requests=[],writes=[];
 const ok=d=>({ok:true,json:async()=>d});
 return {requests,writes,db,env:wrongRelease?{...env,VERCEL_GIT_COMMIT_SHA:sha(7)}:env,shiftId:c.shift_id,workerRunId:c.worker_run_id,
  call:async(_db,rpc,args)=>{
   if(rpc==='reality_read_signed_chat_goal_acceptance_scope_v1'){assert.equal(args.p_shift_id,c.shift_id);return c;}
   assert.equal(rpc,'reality_record_signed_chat_goal_acceptance_v1');writes.push(args);
   assert.equal(args.p_attempt_id,c.attempt_id);assert.equal(args.p_worker_run_id,c.worker_run_id);
   assert.equal(args.p_proof.candidate_sha256,c.candidate_sha256);
   assert.equal(args.p_proof.original_work_id,c.original_work_id);assert.equal(args.p_proof.installation_authorized,false);
   assert.equal(args.p_proof.original_job_completed,false);assert.equal(args.p_proof.isolation,'DOCKER_NETWORK_NONE_READONLY_NO_SECRETS');
   assert.equal(args.p_proof.workflow_blob_sha,workflow.sha);assert.equal(args.p_proof.functional_suite_blob_sha,suite.sha);
   if(failed){assert.equal(args.p_proof.verdict,'FEATURE_TEST_FAILED');assert.equal(args.p_proof.independent_transport_verified,undefined);}
   else {assert.equal(args.p_proof.verdict,'FUNCTIONAL_ACCEPTANCE_PASSED');assert.equal(args.p_proof.target_branch,branch);
    assert.equal(args.p_proof.integration_run_id,pr.id);assert.equal(args.p_proof.functional_run_id,push.id);assert.equal(args.p_proof.independent_transport_verified,true);}
   return {...flags,status:failed?'SIGNED_CHAT_FULL_GOAL_FAILURE_RECOMPILED_SAME_ORIGINAL':'SIGNED_CHAT_FULL_GOAL_FUNCTIONALLY_QUALIFIED_EXACT_OWNER_REVIEW_READY',
    original_work_id:c.original_work_id,receipt_sha256:hash(6),owner_approval_ready:!failed,universe_original_event_id:failed?null:id(6)};
  },
  fetchImpl:async(url,opts)=>{
   assert.ok(url.startsWith(root+'/'));assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');
   assert.equal(opts.headers.authorization,undefined);requests.push(url);
   const u=url.slice(root.length);
   if(u==='/pulls/12')return ok({state:'open',draft:true,merged:false,head:{repo:{full_name:repo},sha:head,ref:candidateBranch},base:{repo:{full_name:repo},ref:branch}});
   if(u==='/commits/'+sourceCommit)return ok({sha:sourceCommit,parents:[{sha:base}],files:[{filename:path,status:'modified'}]});
   if(u==='/commits/'+head)return ok({sha:head,parents:[{sha:sourceCommit}],files:[{filename:'evidence/reality-chat-recovery/'+c.attempt_id+'.json',status:'added'}]});
   if(u==='/git/ref/heads/'+candidateBranch)return ok({object:{sha:head}});
   if(u==='/git/ref/heads/'+branch)return ok({ref:'refs/heads/'+branch,object:{sha:base}});
   if(u==='/actions/runs?head_sha='+head+'&per_page=100')return ok({workflow_runs:missingIntegration?[push]:[push,pr]});
   if(u==='/actions/runs/'+push.id)return ok(push);
   if(u==='/actions/runs/'+pr.id)return ok(pr);
   if(u==='/actions/runs/'+push.id+'/jobs?per_page=100')return ok({jobs:[job(push,failed?'failure':'success')]});
   if(u==='/actions/runs/'+pr.id+'/jobs?per_page=100')return ok({jobs:[job(pr)]});
   if(u==='/contents/'+path+'?ref='+base)return ok(old);
   if(u==='/contents/'+path+'?ref='+head)return ok(wrongBlob?old:candidate);
   if(u.startsWith('/contents/'+SIGNED_CHAT_GOAL_WORKFLOW+'?ref='))return ok(workflow);
   if(u.startsWith('/contents/'+SIGNED_CHAT_GOAL_SUITE+'?ref='))return ok(wrongSuite&&u.endsWith(head)?file(SIGNED_CHAT_GOAL_SUITE,'different test'):suite);
   if(u==='/commits/'+base+'/status')return ok({sha:base,statuses:[{context:'Vercel',state:'success',target_url:'https://vercel.com/team/reality/deployment123',id:3}]});
   if(u==='/commits/'+base+'/check-runs?per_page=100')return ok({check_runs:badTransport?[]:[{head_sha:base,name:'Vercel Preview Comments',status:'completed',conclusion:'success',app:{slug:'vercel',id:5},id:4}]});
   assert.fail('Unexpected provider request '+u);
  }};
}
test('two distinct pinned provider functional runs and current preview permit exact review only',async()=>{
 const f=fixture(),r=await advanceSignedChatFullGoalAcceptance(f);
 assert.equal(r.status,'SIGNED_CHAT_FULL_GOAL_FUNCTIONALLY_QUALIFIED_EXACT_OWNER_REVIEW_READY');
 assert.equal(r.owner_approval_ready,true);assert.equal(r.original_job_completed,false);assert.equal(r.installation_authorized,false);
 assert.equal(f.writes.length,1);
});
test('verified functional failure becomes a distinct same-original revision and never an install decision',async()=>{
 const f=fixture({failed:true}),r=await advanceSignedChatFullGoalAcceptance(f);
 assert.equal(r.status,'SIGNED_CHAT_FULL_GOAL_FAILURE_RECOMPILED_SAME_ORIGINAL');
 assert.equal(r.owner_approval_ready,false);assert.equal(r.original_job_completed,false);assert.equal(r.installation_authorized,false);
 assert.equal(f.writes.length,1);
});
test('wrong artifact, changed tests, missing exact integration, drifted preview or missing provider deployment cannot qualify',async()=>{
 for(const variant of [{wrongBlob:true},{wrongSuite:true},{wrongRelease:true},{badTransport:true},{missingIntegration:true}]){
  const f=fixture(variant),r=await advanceSignedChatFullGoalAcceptance(f);
  assert.equal(f.writes.length,0);assert.equal(r.installation_authorized,false);assert.notEqual(r.owner_approval_ready,true);
 }
 const f=fixture();const r=await advanceSignedChatFullGoalAcceptance({...f,env:{...f.env,VERCEL_ENV:'production'}});
 assert.equal(f.requests.length,0);assert.equal(f.writes.length,0);assert.equal(r.installation_authorized,false);
});
test('provider failure before actual functional execution is not negative feature evidence',()=>{
 const a=run('push',1,'failure');
 const j=job(a,'failure');j.steps[2].conclusion='failure';assert.equal(signedChatFunctionalVerdict(a,[j]),null);
 assert.equal(selectSignedChatGoalRun([a,a],head,candidateBranch,'push'),null);
 assert.equal(selectSignedChatGoalRun([a],base,candidateBranch,'push'),null);
 assert.equal(verifiedPreviewProviderEvidence({sha:base,statuses:[]},{check_runs:[]},base),null);
 assert.equal(signedChatPreviewBranch('main'),false);assert.equal(signedChatPreviewBranch(candidateBranch),false);
});
test('real worker boundary admits only exact new RPCs; previous parse verifier is no longer disconnected',async()=>{
 for(const name of ['reality_read_next_signed_chat_recovery_publish_v1','reality_record_signed_chat_recovery_syntax_v1',
  'reality_read_signed_chat_goal_acceptance_scope_v1','reality_record_signed_chat_goal_acceptance_v1',
  'reality_read_signed_chat_general_install_card_v1','reality_owner_approve_signed_chat_general_install_v1']){
  const d=await shiftRpc(db,name,{},{fetchImpl:async(url,opts)=>{
   assert.equal(url,db.url+'/rest/v1/rpc/'+name);assert.equal(opts.method,'POST');
   return {ok:true,json:async()=>({status:'fixture'})};}});assert.equal(d.status,'fixture');
 }
 await assert.rejects(shiftRpc(db,'reality_arbitrary_untrusted_model_write_v1',{},{}),/SHIFT_RPC_NOT_ALLOWLISTED/);
});
test('existing original review, authenticated owner approval, same installer and independent Universe settlement are connected',()=>{
 const sql=read('../supabase/migrations/20261122030100_signed_chat_full_goal_install_adapter_v1.sql');
 const worker=read('../api/reality/governed-employee-shift-worker.js');
 const install=read('../supabase/functions/reality-governed-general-original-installer-v1/index.ts');
 const settle=read('../supabase/functions/reality-governed-general-original-postinstall-verifier-v1/index.ts');
 const approve=read('../api/reality/generalized-owner-install-approval.js');
 const review=read('../api/reality/generalized-original-install-review.js');
 const wf=read('../'+SIGNED_CHAT_GOAL_WORKFLOW);
 for(const text of ['signed_chat_goal_context_v1','signed_chat_install_scope_v1','AUTHENTICATED_OWNER_EXPLICIT_ACTION','approval_sha256',
  'prior_feature_attempts','prior_feature_failure_receipt_sha256','SIGNED_GOAL_INSTALL_PREVIEW_HEAD_CHANGED_NO_WRITE',
  'SIGNED_CHAT_FULL_GOAL_FUNCTIONALLY_QUALIFIED_EXACT_OWNER_REVIEW_READY','append_signed_chat_original_event_v1',
  'public.reality_continuity_canonical_json_v1','reality_verified_original_work_settlement_v2','universe_outcome_event_id',
  'EXISTING_SIGNED_CHAT_ORIGINAL_AWAITING_EXACT_INSTALL_APPROVAL','PRESENT_EXISTING_EXACT_OWNER_INSTALL_CARD_IN_REALITY_CHAT'])assert.ok(sql.includes(text),text);
 assert.doesNotMatch(sql,/security definer/i);
 assert.match(worker,/advanceSignedChatFullGoalAcceptance/);
 assert.match(install,/reality_claim_signed_chat_install_v1/);assert.match(install,/force:false/);
 assert.match(settle,/reality_record_signed_chat_goal_settlement_v1/);assert.match(settle,/SIGNED_CHAT_FROZEN_GOAL_CONTRACT_OR_DISTINCT_PROVIDER_RUN_DRIFT/);
 assert.match(approve,/assertSameOrigin\(req\)/);assert.match(approve,/reality_owner_approve_signed_chat_general_install_v1/);
 assert.match(review,/reality_read_signed_chat_general_install_card_v1/);
 assert.ok(wf.includes('--network none --read-only --cap-drop ALL --security-opt no-new-privileges'));
 assert.ok(wf.includes('persist-credentials: false'));assert.doesNotMatch(wf,/secrets\./);
});
