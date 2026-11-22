import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parseOnlyModule,compareFrozenCandidateSyntax,reproduceFrozenBoundaryFailure,independentlyVerifySignedRecoverySyntax}
 from '../src/reality-signed-chat-recovery-syntax-verifier-v1.js';
const uuid=n=>'11111111-2222-4333-8444-'+String(n).padStart(12,'0');
const hash='sha256:'+'a'.repeat(64), sha='b'.repeat(40);
const work='work:'+'c'.repeat(32), target='src/recovery-fixture.js';
const baseline='export function validateClaim(){\n return true;\n}\n';
const find=' return true;\n',bad=' return true;\n}\n';
const bytes=Buffer.from(baseline),blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const flags={installation_authorized:false,original_job_completed:false,production_changed:false};
const db={strictSecrets:true,project:'fixture'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'fixture',VERCEL_GIT_COMMIT_SHA:sha};
const q={status:'SIGNED_CHAT_RECOVERY_QUARANTINE_CANDIDATE_READ',trigger_id:uuid(1),original_work_id:work,
 target_review_receipt_sha256:hash,independent_target_review_verified:true,phase:'SIGNED_CHAT_RECOVERY_PUBLISH_FENCED',
 spec_sha256:hash,release_sha:sha,...flags,candidate:{original_work_id:work,spec_sha256:hash,candidate_sha256:hash,
 base_sha:sha,source_blob_sha:blob,target_path:target,find,replace:bad}};
test('independent parser catches real duplicated brace, and never executes candidate code',()=>{
 assert.equal(parseOnlyModule('throw new Error("must not execute");'),'VALID_SYNTAX');
 assert.equal(parseOnlyModule('export function f(){} }'),'INVALID_SYNTAX');
 const proof=compareFrozenCandidateSyntax(baseline,find,bad);
 assert.equal(proof.candidate,'INVALID_SYNTAX');assert.equal(proof.candidate_executed,false);
 assert.equal(compareFrozenCandidateSyntax(baseline,find,' return false;\n').candidate,'VALID_SYNTAX');
 assert.equal(compareFrozenCandidateSyntax(baseline,'not present',bad),null);
 assert.equal(compareFrozenCandidateSyntax(baseline+baseline,find,bad),null);
 assert.equal(compareFrozenCandidateSyntax(baseline,find,bad,()=> 'PARSE_PROVIDER_UNAVAILABLE'),null);
});
test('same frozen source and actual signed worker record negative proof through existing ledger',async()=>{
 let calls=[];
 const result=await independentlyVerifySignedRecoverySyntax({db,env,shiftId:uuid(2),workerRunId:uuid(3),
  fetchImpl:async(url,options)=>{assert.match(url,/^https:\/\/api\.github\.com\/repos\/maloney2323\/Reality\/contents\//);
   assert.equal(options.method,'GET');assert.equal(options.headers.authorization,undefined);
   return {ok:true,json:async()=>({path:target,sha:blob,size:bytes.length,encoding:'base64',content:bytes.toString('base64')})}},
  call:async(_db,method,args)=>{calls.push(method);if(method.includes('read_next_'))return q;
   assert.equal(method,'reality_record_signed_chat_recovery_syntax_v1');
   assert.equal(args.p_candidate_sha256,hash);assert.equal(args.p_source_blob_sha,blob);
   assert.equal(args.p_proof.candidate,'INVALID_SYNTAX');assert.equal(args.p_proof.candidate_executed,false);
   return {status:'SIGNED_RECOVERY_INVALID_SYNTAX_SAME_ORIGINAL_RECOMPILED',
    original_work_id:work,trigger_id:q.trigger_id,syntax_receipt_sha256:hash,...flags};}});
 assert.equal(calls.length,2);assert.equal(result.status,'SIGNED_RECOVERY_INVALID_SYNTAX_SAME_ORIGINAL_RECOMPILED');
 assert.equal(result.full_goal_feature_accepted,false);assert.equal(result.installation_authorized,false);
});
test('modified source, production, unverified dependency and unavailable parser never write a proof',async()=>{
 for(const variant of ['blob','production','dependency','parser']){
  const result=await independentlyVerifySignedRecoverySyntax({db,env:variant==='production'?{...env,VERCEL_ENV:'production'}:env,
   shiftId:uuid(2),workerRunId:uuid(3),parse:variant==='parser'?()=> 'PARSE_PROVIDER_UNAVAILABLE':parseOnlyModule,
   call:async(_db,method)=>{assert.match(method,/read_next_/);return variant==='dependency'?{...q,independent_target_review_verified:false}:q;},
   fetchImpl:async()=>({ok:true,json:async()=>({path:target,sha:blob,size:bytes.length,encoding:'base64',
    content:variant==='blob'?Buffer.from('different bytes').toString('base64'):bytes.toString('base64')})})});
  assert.notEqual(result.status,'SIGNED_RECOVERY_INVALID_SYNTAX_SAME_ORIGINAL_RECOMPILED');
  assert.equal(result.installation_authorized,false);
 }
});
test('broker and ledger keep the old fenced candidate immutable and use a distinct quarantine reference',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261122025030_signed_chat_recovery_independent_parse_v1.sql',import.meta.url),'utf8');
 const broker=readFileSync(new URL('../supabase/functions/reality-chat-recovery-quarantine-broker-v1/index.ts',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 for(const token of ['prior_qualification_receipt','prior_provider_effect_not_replayed','prior_syntax_epoch',
  'syntax_revision_epoch','-syntax-r1','security invoker','w.state=\'ACTIVE\'','p_worker_run_id','target_review_receipt_sha256'])
  assert.ok(sql.includes(token),token);
 assert.ok(broker.includes("s.phase==='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'||s.syntax_verified===true"));
 assert.ok(broker.includes("s.quarantine_epoch>0?'-syntax-r'+s.quarantine_epoch:''"));
 assert.ok(broker.includes('RECOVERY_FENCED_PROVIDER_EFFECT_UNVERIFIED_NO_REPLAY'));
 assert.ok(worker.indexOf('await independentlyVerifySignedRecoverySyntax')<worker.indexOf('await stageNextSignedChatRecoveryQuarantine'));
 assert.doesNotMatch(sql,/security definer|installation_authorized',true|original_job_completed',true/);
});

test('exact splice-boundary reproduction changes only the independently proven anchor, not model replacement',()=>{
 const proof=reproduceFrozenBoundaryFailure(baseline,find,bad);
 assert.equal(proof.classification,'DUPLICATED_FROZEN_CLOSING_DELIMITER');
 assert.equal(proof.boundary_line,'}\n');
 assert.equal(proof.additional_source_lines,1);
 assert.equal(proof.candidate_executed,false);assert.equal(proof.functional_acceptance_verified,false);
 assert.notEqual(proof.original_candidate_sha256,proof.corrected_candidate_sha256);
 assert.equal(proof.unchanged_replacement_sha256,'sha256:'+createHash('sha256').update(bad).digest('hex'));
 assert.equal(reproduceFrozenBoundaryFailure(baseline,find,' return false;\n'),null);
 assert.equal(reproduceFrozenBoundaryFailure(baseline+baseline,find,bad),null);
 assert.equal(reproduceFrozenBoundaryFailure(baseline,find,' const x = ;\n}\n'),null);
 assert.equal(reproduceFrozenBoundaryFailure(baseline,find,' return true;\n }\n'),null);
 assert.equal(reproduceFrozenBoundaryFailure(baseline,find,bad,()=> 'PARSE_PROVIDER_UNAVAILABLE'),null);
});
test('exhausted same-original recovery becomes an evidence-bound incident, then distinct independent reproduction and recompile',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261122032000_signed_chat_exhausted_syntax_investigation_v1.sql',import.meta.url),'utf8');
 const investigator=readFileSync(new URL('../src/reality-shift-continuity-auto-investigation-v1.js',import.meta.url),'utf8');
 const compiler=readFileSync(new URL('../src/reality-chat-new-development-worker-v1.js',import.meta.url),'utf8');
 for(const term of ['signed_chat_syntax_exhaustion_evidence_v1','SIGNED_CHAT_RECOVERY_SYNTAX_STALLED',
  'source_evidence=reality_internal.signed_chat_syntax_exhaustion_evidence_v1',
  'prior_provider_effect_not_replayed','j.investigated_at<sh.started_at',
  'prior_proof->>\'proposed_sha256\'=proof->>\'proposed_sha256\'',
  'independent_boundary_reproduction','syntax_investigation_receipt_sha256',
  'SIGNED_RECOVERY_SYNTAX_INVESTIGATION_RECOMPILED_SAME_ORIGINAL','-syntax-r','rev+1',
  'candidate_executed','new_original_admitted', 'FOR UPDATE'.toLowerCase()])assert.ok(sql.includes(term),term);
 assert.match(investigator,/SIGNED_CHAT_RECOVERY_SYNTAX_STALLED/);
 assert.match(investigator,/Two independently parsed candidates failed/);
 assert.match(compiler,/syntax_investigation_receipt_sha256/);
 assert.match(compiler,/raw.choice.end_line\+1<=b/);
 assert.match(compiler,/expanded.replace===derived.replace/);
 assert.match(compiler,/parseOnlyModule\(expanded.proposed\)==='VALID_SYNTAX'/);
 assert.doesNotMatch(sql,/security definer|installation_authorized',true|original_job_completed',true/i);
});
