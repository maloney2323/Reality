import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {continuityTextContract,continuityProviderTextSchema}
 from '../src/reality-shift-continuity-auto-investigation-v1.js';
import {verifiedFormatEvidence,qualifyVerifiedInvestigationRemediation}
 from '../src/reality-shift-investigation-remediation-v1.js';
const id=n=>'11111111-2222-4333-8444-'+String(n).padStart(12,'0');
const hash='sha256:'+'a'.repeat(64), sha='b'.repeat(40);
const flags={execution_authorized:false,installation_authorized:false,original_job_completed:false,production_changed:false};
const db={strictSecrets:true,project:'fixture'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'fixture',
 REALITY_GITHUB_TOKEN:'fixture-not-a-real-token',VERCEL_GIT_COMMIT_SHA:sha,VERCEL_GIT_COMMIT_REF:'preview-fixture'};
const failedAt='2026-01-01T00:00:00Z',later='2026-01-01T01:00:00Z';
const scope={status:'EXHAUSTED_FORMAT_INVESTIGATION_REMEDIATION_SCOPE',
 owner_id:id(1),shift_id:id(2),incident_id:id(3),worker_run_id:id(4),
 kind:'SIGNED_CHAT_RECOVERY_REVIEW_STALLED',investigation_attempts:3,
 evidence_sha256:hash,failure_history_sha256:hash,last_failure:{failed_at:failedAt,
 failure_reason:'MODEL_TEXT_BOUNDS_UNVERIFIED',validation_evidence:{
 schema:'reality-continuity-text-validation-v1',violations:[
 {field:'resume_acceptance_condition',min:30,max:300,length:313,reason:'ABOVE_MAX'}]}},...flags};
const run={id:101,head_sha:sha,head_branch:env.VERCEL_GIT_COMMIT_REF,event:'push',
 status:'completed',conclusion:'success',path:'.github/workflows/reality-continuity-format-remediation.yml',
 repository:{full_name:'maloney2323/Reality'},run_started_at:later,updated_at:later};
const job={id:102,run_id:run.id,head_sha:sha,name:'verify-format-contract',status:'completed',
 conclusion:'success',steps:[{name:'Verify bounds and unchanged authority',conclusion:'success'}]};
test('provider constraints derive from every existing field; reject all one-off bounds violations',()=>{
 for(const guided of [false,true]){
  const schema=continuityProviderTextSchema(guided);
  for(const {field,min,max} of continuityTextContract(guided)){
   assert.ok(schema[field].pattern);
   const re=new RegExp(schema[field].pattern);
   for(const n of [min,max])assert.equal(re.test('x'.repeat(n)),true,field);
   for(const n of [min-1,max+1,max+13])assert.equal(re.test('x'.repeat(n)),false,field);
  }
 }
 assert.equal(verifiedFormatEvidence(scope),true);
 for(const p of [{reason:'OUTER_WHITESPACE'},{length:299},{max:999},{field:'unknown'}]){
  const invalid=structuredClone(scope);Object.assign(invalid.last_failure.validation_evidence.violations[0],p);
  assert.equal(verifiedFormatEvidence(invalid),false);
 }
});
test('independent exact release CI proof unlocks only existing one-use investigation',async()=>{
 const seen=[];
 const result=await qualifyVerifiedInvestigationRemediation({db,env,shiftId:scope.shift_id,workerRunId:scope.worker_run_id,
  call:async(_db,method,args)=>{
   seen.push(method);
   if(method==='reality_read_shift_investigation_remediation_scope_v1')return scope;
   assert.equal(method,'reality_record_shift_investigation_remediation_v1');
   assert.equal(args.p_incident_id,scope.incident_id);
   assert.equal(args.p_failure_history_sha256,hash);
   assert.equal(args.p_provider_proof.head_sha,sha);
   return {status:'ONE_VERIFIED_FORMAT_REMEDIATION_INQUIRY_READY',owner_id:scope.owner_id,
    incident_id:scope.incident_id,shift_id:scope.shift_id,remediation_release_commit:sha,
    remediation_ci_run_id:run.id,remediation_receipt_sha256:hash,investigation_attempts:3,...flags};
  },fetchImpl:async url=>({ok:true,json:async()=>url.includes('/jobs?')?{jobs:[job]}:{workflow_runs:[run]}})});
 assert.equal(result.one_use_inquiry_only,true);
 for(const k of Object.keys(flags))assert.equal(result[k],false);
 assert.equal(seen.length,2);
});
test('wrong release, failed CI, old run, wrong job, missing scope and unproved cause do not unlock retry',async()=>{
 for(const variant of [
  {r:{...run,head_sha:'c'.repeat(40)}},{r:{...run,conclusion:'failure'}},
  {r:{...run,run_started_at:failedAt}},{j:{...job,conclusion:'failure'}},
  {j:{...job,steps:[]}},{s:{...scope,execution_authorized:true}},
  {s:{...scope,investigation_attempts:4}},{s:{...scope,last_failure:{failure_reason:'MODEL_PROVIDER_TIMEOUT'}}}
 ]){
  let recorded=false;
  const result=await qualifyVerifiedInvestigationRemediation({db,env,shiftId:scope.shift_id,workerRunId:scope.worker_run_id,
   call:async(_db,method)=>{if(method.includes('record_'))recorded=true;return variant.s||scope;},
   fetchImpl:async url=>({ok:true,json:async()=>url.includes('/jobs?')?{jobs:[variant.j||job]}:{workflow_runs:[variant.r||run]}})});
  assert.equal(recorded,false);assert.equal(result.execution_authorized,false);
 }
});
test('same ledger, signed wake, immutable attempts and no authority grants',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261122021030_shift_investigation_verified_remediation_v1.sql',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 for(const v of ['investigation_attempts=3','remediation_used_at is null','r.started_at',
  'failure_history_sha256','for update','one_use_inquiry_only','p_worker_run_id',
  'grant execute on function public.reality_record_shift_investigation_remediation_v1'])assert.ok(sql.includes(v),v);
 assert.doesNotMatch(sql,/security definer|set investigation_attempts\s*=|installation_authorized',true|insert into reality_internal\.governed_employee_original_claims/);
 const normal=worker.indexOf("workerStage='SOURCE_BACKED_SHIFT_CONTINUITY_SELF_OBSERVATION'");
 const remediation=worker.indexOf('await qualifyVerifiedInvestigationRemediation');
 const inquiry=worker.indexOf('await investigateOneSignedShiftContinuityIncident',normal);
 assert.ok(remediation>0&&normal>remediation&&inquiry>normal);
 const exact=worker.slice(worker.indexOf('if(suspensionInvestigationWake){'),worker.indexOf('// Continuous, standing EVIDENCE qualification intake'));
 assert.match(exact,/suspensionEventId:governedWakeScope.event_id/);
 assert.match(exact,/SUSPENSION_INVESTIGATION_RELEASE_WITNESS_UNVERIFIED/);
});

test('independent observation routes the frozen original through existing target review only',async()=>{
 const {independentlyReobserveStalledRecoveryReview}=await import('../src/reality-signed-chat-recovery-target-review-v1.js');
 const roots=['api/reality/governed-employee-shift-worker.js',
  'api/reality/generalized-original-install-review.js','api/reality/generalized-owner-install-approval.js'];
 const source={status:'SIGNED_CONTINUITY_SOURCE_PROBE_CLAIMED',...flags,
  owner_id:id(1),shift_id:id(2),incident_id:id(3),worker_run_id:id(4),probe_id:id(5),
  trigger_id:id(6),source_message_id:id(7),source_ref:'supabase:reality_chat_messages:'+id(7),
  original_work_id:'work:'+'f'.repeat(32),candidate_sha256:hash,base_sha:sha,
  target_path:'src/fixture.js',source_entrypoints:roots,investigation_receipt_sha256:hash,new_shift_started:false};
 for(const hit of [true,false,null]){
  const methods=[];
  const result=await independentlyReobserveStalledRecoveryReview({db,env,shiftId:id(2),workerRunId:id(4),
   callRpc:async(_db,method,args)=>{
    methods.push(method);if(method.includes('claim_'))return source;
    assert.equal(method,'reality_record_signed_continuity_review_probe_v1');
    assert.equal(args.p_trigger_id,id(6));assert.equal(args.p_worker_run_id,id(4));
    assert.equal(args.p_target_in_graph,hit);
    if(hit===null){assert.equal(args.p_tree_sha,null);assert.ok(args.p_failure_code);}
    return {status:hit===null?'SIGNED_CONTINUITY_SOURCE_PROBE_BLOCKED':hit?
     'SIGNED_CHAT_RECOVERY_INDEPENDENT_DEPENDENCY_TARGET_VERIFIED':
     'SIGNED_CHAT_RECOVERY_OFF_TARGET_REJECTED_WITH_RECEIPT',
     trigger_id:source.trigger_id,original_work_id:source.original_work_id,
     candidate_sha256:hash,target_review_receipt_sha256:hash,target_in_graph:hit,
     continuity_source_probe_verified:hit!==null,root_cause_verified:false,
     ...flags,new_shift_started:false};
   },readGraph:async()=>{if(hit===null)throw Error('PROVIDER_UNAVAILABLE');
    return {verified:true,tree_sha:sha,target_in_graph:hit,
     entrypoint_evidence:roots.map(path=>({path,blob_sha:sha}))};}});
  assert.equal(result.original_job_completed,false);
  assert.equal(result.installation_authorized,false);
  assert.equal(result.continuity_source_probe_verified===true,hit!==null);
  assert.equal(methods.length,2);
 }
 const sql=readFileSync(new URL('../supabase/migrations/20261122021230_signed_continuity_review_source_probe_v1.sql',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 for(const v of ['inc.investigated_at<r.started_at','inc.assigned_function_id<>inc.reviewer_function_id',
  'target_review_retry_count','reality_record_signed_chat_recovery_target_review_v1',
  'CONTINUITY_SOURCE_PROBE_ORIGINAL_SCOPE_CHANGED','SOURCE_PROBE_BLOCKED'])assert.ok(sql.includes(v),v);
 assert.doesNotMatch(sql,/security definer|installation_authorized',true|original_job_completed',true/);
 assert.ok(worker.indexOf('await independentlyReobserveStalledRecoveryReview')<worker.indexOf('await stageNextSignedChatRecoveryQuarantine'));
});

test('a distinct off-target revision restricts actual candidate choices to a fresh verified graph',async()=>{
 const {restrictRecoveryTargetsToVerifiedGraph}=await import('../src/reality-chat-new-development-worker-v1.js');
 const spec={target_selection_policy:'CURRENT_PINNED_ENTRYPOINT_GRAPH_ONLY',rejected_target_path:'src/rejected.js'};
 const candidates=['src/rejected.js','src/relevant.js','src/outside.js'].map(path=>({path}));
 const proof={verified:true,tree_sha:sha,source_paths:['src/rejected.js','src/relevant.js']};
 assert.deepEqual(restrictRecoveryTargetsToVerifiedGraph(candidates,proof,spec),[{path:'src/relevant.js'}]);
 assert.deepEqual(restrictRecoveryTargetsToVerifiedGraph(candidates,{...proof,verified:false},spec),[]);
 const sql=readFileSync(new URL('../supabase/migrations/20261122021430_recompile_independent_chat_target_rejection_v1.sql',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 for(const v of ["SIGNED_CHAT_RECOVERY_RELEVANCE_REJECTED","prior_review_epoch","prior_qualification_receipt","relevance_revision_count","CURRENT_PINNED_ENTRYPOINT_GRAPH_ONLY","prior.finished_at<sh.started_at","for update of g skip locked","SIGNED_CHAT_RECOVERY_SPEC_FROZEN"])assert.ok(sql.includes(v),v);
 assert.doesNotMatch(sql,/security definer|installation_authorized',true|original_job_completed',true/);
 assert.ok(worker.includes('reality_recompile_signed_rejected_chat_target_v1'));
});

test('public exact-CI readback is credential-free and never falls back to production authority',async()=>{
 const seen=[];
 const {REALITY_GITHUB_TOKEN,...publicEnv}=env;
 const result=await qualifyVerifiedInvestigationRemediation({db,env:publicEnv,shiftId:scope.shift_id,workerRunId:scope.worker_run_id,
  call:async(_db,method,args)=>{
   if(method.includes('read_'))return scope;
   assert.equal(method,'reality_record_shift_investigation_remediation_v1');
   assert.equal(args.p_provider_proof.head_sha,sha);
   assert.equal(args.p_failure_history_sha256,hash);
   return {status:'ONE_VERIFIED_FORMAT_REMEDIATION_INQUIRY_READY',owner_id:scope.owner_id,incident_id:scope.incident_id,shift_id:scope.shift_id,remediation_release_commit:sha,remediation_ci_run_id:run.id,remediation_receipt_sha256:hash,investigation_attempts:3,...flags};
  },fetchImpl:async(url,options)=>{
   assert.match(url,/^https:\/\/api\.github\.com\/repos\/maloney2323\/Reality\/actions\//);
   assert.equal(options.method,'GET');assert.equal(options.redirect,'error');
   assert.equal(options.headers.authorization,undefined);seen.push(url);
   return {ok:true,json:async()=>url.includes('/jobs?')?{jobs:[job]}:{workflow_runs:[run]}};
  }});
 assert.equal(seen.length,2);assert.equal(result.one_use_inquiry_only,true);
 for(const name of Object.keys(flags))assert.equal(result[name],false);
 for(const badEnv of [{...publicEnv,VERCEL_GIT_COMMIT_REF:''},{...publicEnv,VERCEL_ENV:'production'}]){
  const blocked=await qualifyVerifiedInvestigationRemediation({db,env:badEnv,shiftId:scope.shift_id,workerRunId:scope.worker_run_id,
   call:async(_db,method)=>{assert.ok(method.includes('read_'));return scope;},
   fetchImpl:async()=>{throw Error('Unexpected provider request');}});
  assert.notEqual(blocked.status,'ONE_VERIFIED_FORMAT_REMEDIATION_INQUIRY_READY');
 }
});
test('pinned original source readback needs no write credential; verifies bytes and fails closed',async()=>{
 const {createHash}=await import('node:crypto');
 const {readPinnedSignedRecoverySourceGraph}=await import('../src/reality-signed-chat-recovery-target-review-v1.js');
 const roots=['api/reality/governed-employee-shift-worker.js','api/reality/generalized-original-install-review.js','api/reality/generalized-owner-install-approval.js'];
 const source="import '../../src/fixture.js';\n// Pinned fixture source with a valid known direct dependency and exact bytes.";
 const bytes=Buffer.from(source,'utf8');
 const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 const target='src/fixture.js';
 let reads=0;
 const fetchImpl=async(url,options)=>{
  reads++;assert.equal(options.method,'GET');assert.equal(options.redirect,'error');
  assert.equal(options.headers.authorization,undefined);
  assert.match(url,/^https:\/\/api\.github\.com\/repos\/maloney2323\/Reality\//);
  const root=roots.find(x=>url.includes('/contents/'+x+'?ref='+sha));
  return {ok:true,json:async()=>root?{path:root,sha:blob,size:bytes.length,encoding:'base64',content:bytes.toString('base64')}:{sha,tree:{sha}}};
 };
 const proof=await readPinnedSignedRecoverySourceGraph({baseSha:sha,target,expectedRoots:roots,token:'',fetchImpl});
 assert.equal(proof.target_in_graph,true);assert.equal(proof.verified,true);assert.equal(reads,4);
 await assert.rejects(readPinnedSignedRecoverySourceGraph({baseSha:sha,target,expectedRoots:roots,token:'',fetchImpl:async()=>({ok:false})}),/PINNED_GITHUB_READ_UNVERIFIED/);
});
