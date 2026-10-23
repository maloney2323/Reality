import test from 'node:test';
import assert from 'node:assert/strict';
import {createStandaloneConversationScope,STANDALONE_HISTORY_PROVENANCE} from '../src/reality-standalone-auth-v0.1.js';
import {createUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {TWELVE_TURN_SCRIPT,buildTwelveTurnComparison,getAuthenticatedTwelveTurnComparison}
 from '../src/reality-12turn-comparison-v0.1.js';
import {assessIntelligenceSpineV1} from '../src/reality-intelligence-spine-v1.0.js';
import {realityJudgeTurn} from '../src/reality-native-judge-v1.0.js';
const user='e83340ec-4266-4c95-a6cd-929bc58b445e';
const scope=createStandaloneConversationScope({userId:user,conversationId:'suite-12'});
function row(kind,id,time,payload,extra={}){
 return createUniverseEntry({
  entry_id:id,continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
  event_kind:kind,epistemic_kind:'OBSERVATION',assertion_time:time,effective_time:time,
  source_ref:'test:evidence',payload,evidence_references:[],
  provenance:{source:STANDALONE_HISTORY_PROVENANCE,authenticated_user_id:user},...extra,
 });
}
function sample(count=12,{injected=false}={}){
 const msgs=[],diag=[],commits=[];
 for(let i=0;i<count;i++){
  const prompt=TWELVE_TURN_SCRIPT[i].prompt,tid='benchmark-'+i,sec=String(i).padStart(2,'0');
  const base='2026-10-23T19:'+sec+':';
  const u=row('AUTHENTICATED_CONVERSATION_MESSAGE','user-'+i,base+'00.000Z',
   {role:'user',text:prompt,turn_id:tid,principal_id:user});
  const a=row('AUTHENTICATED_CONVERSATION_MESSAGE','assistant-'+i,base+'05.000Z',
   {role:'assistant',text:i===1?"I'll send it now.":'I will preserve the facts and ask first.',
    display_text:i===1?"I'll send it now.\nReality integrity notice: possible conflict.":'I will preserve the facts and ask first.',
    turn_id:tid,principal_id:user});
  msgs.push(u,a);
  const flagged=injected&&i===1;
  diag.push(row('CONTINUITY_STATE_TRANSITION','continuity-'+i,base+'04.000Z',{
   continuity_state:'ACTIVE',signal_handoff_entry_id:'cleaner-'+i,
   cleaner_verification:{status:'VERIFIED'},
   integrity_spine:{checkpoints:['SIGNAL_CLEANER','UNIVERSE','CONTINUITY','COGNITION'].map(stage=>({
    stage,checkpoint_hash:'sha256:synthetic-'+stage,independent_truth_verdict:'NOT_PERFORMED'
   }))},
   model_output_integrity:{status:'NO_TRUSTED_REFERENCE',findings:[]},
   conversation_drift:{status:flagged?'CANDIDATE_FLAGGED':'LIMITED_NO_FLAG',
    findings:flagged?[{classification:'CONVERSATIONAL_PRECONDITION_DRIFT',
      original_user_text:TWELVE_TURN_SCRIPT[0].prompt}]:[]},
   conversation_trajectory:{status:'LIMITED_REPLAY_NO_FLAG',findings:[]},
  }));
  commits.push(row('REALITY_CAUSAL_TURN_RECEIPT','commit-'+i,base+'06.000Z',
   {phase:'COMMITTED',user_message_entry_id:u.entry_id,
    assistant_message_entry_id:a.entry_id}));
 }
 return{msgs,diag,commits};
}
test('12 turns reconstruct scoped raw model, published text, four checkpoint traces and one flagged candidate',()=>{
 const {msgs,diag,commits}=sample(12,{injected:true});
 const out=buildTwelveTurnComparison({scope,messageEntries:msgs,continuityEntries:diag,commitEntries:commits,observedConditions:1});
 assert.equal(out.turn_count,12);
 assert.equal(out.verified_commits,12);
 assert.equal(out.completed_pre_registered_benchmark,true);
 assert.equal(out.checkpointed_turns,12);
 assert.equal(out.detector_candidate_findings,1);
 assert.equal(out.turns_with_flags,1);
 assert.equal(out.published_replies_with_integrity_notices,1);
 assert.equal(out.turns[1].drift_status,'CANDIDATE_FLAGGED');
 assert.equal(out.turns[1].detector_findings[0].classification,'CONVERSATIONAL_PRECONDITION_DRIFT');
 assert.notEqual(out.turns[1].raw_model_output,out.turns[1].reality_published_reply);
 assert.equal(out.turns[0].script_id,'T01');
 assert.equal(out.turns[11].script_id,'T12');
 assert.match(out.comparison_receipt_hash,/^sha256:[0-9a-f]{64}$/);
});
test('pre-registered benchmark completion fails when answer receipt or original script mismatches',()=>{
 const {msgs,diag,commits}=sample(12);
 const noLast=buildTwelveTurnComparison({scope,messageEntries:msgs,continuityEntries:diag,commitEntries:commits.slice(0,11)});
 assert.equal(noLast.verified_commits,11);assert.equal(noLast.completed_pre_registered_benchmark,false);
 const edited=sample(12);
 const changed=edited.msgs.map(x=>x.entry_id==='user-3'
  ?{...x,payload:{...x.payload,text:'another user prompt'}}:x);
 const spoof=buildTwelveTurnComparison({scope,messageEntries:changed,continuityEntries:diag,commitEntries:commits});
 assert.equal(spoof.completed_pre_registered_benchmark,false);
 assert.equal(spoof.turns[3].prescribed_prompt_matches,false);
});
test('no fake zero drift or hallucination, even if all turns committed and no flags present',()=>{
 const {msgs,diag,commits}=sample();
 const out=buildTwelveTurnComparison({scope,messageEntries:msgs,continuityEntries:diag,commitEntries:commits});
 assert.equal(out.hallucination_rate_underlying,null);
 assert.equal(out.hallucination_rate_reality,null);
 assert.equal(out.drift_rate_underlying,null);
 assert.equal(out.drift_rate_reality,null);
 assert.equal(out.detector_recall,null);
 assert.equal(out.independent_model_only_baseline_available,false);
 assert.equal(out.independent_adjudication_performed,false);
 assert.equal(out.truth_oracle_sample_count,0);
});
test('incomplete 7-turn run remains inspectable and is never labeled complete',()=>{
 const {msgs,diag,commits}=sample(7);
 const out=buildTwelveTurnComparison({scope,messageEntries:msgs,continuityEntries:diag,commitEntries:commits});
 assert.equal(out.turn_count,7);assert.equal(out.verified_commits,7);
 assert.equal(out.completed_pre_registered_benchmark,false);
 assert.equal(out.turns.length,7);
});
test('read-only authenticated evidence fetch groups scoped message, diagnostic and commitment streams',async()=>{
 const env={SUPABASE_URL:'https://reality-example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY:'sb_publishable_public_example',
  REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',REALITY_STANDALONE_CHAT_ENABLED:'true',
  REALITY_STANDALONE_EXPECTED_PROJECT_REF:'reality-example',
  REALITY_UNIVERSE_PERSISTENCE_URL:'https://reality-example.supabase.co',
  REALITY_UNIVERSE_PERSISTENCE_KEY:'sb_secret_TEST_ONLY_NOT_REAL_abcdefgh123456789',
  REALITY_STANDALONE_OPENAI_API_KEY:'sk-TEST_ONLY_NOT_REAL_abcdefgh123456789',
  REALITY_OPENAI_MODEL:'gpt-4.1-mini',VERCEL_ENV:'preview',
  REALITY_STANDALONE_OBLIGATION_OBSERVATION_ENABLED:'false'};
 const {msgs,diag,commits}=sample(12);
 const seen=[];
 const r=await getAuthenticatedTwelveTurnComparison({
  method:'GET',headers:{authorization:'Bearer signed-session-test-token-12345'},
  query:{conversation_id:'suite-12',thought_id:'personal'},
 },{
  env,fetchImpl:async(url)=>{assert.match(url,/\/auth\/v1\/user$/);
   return{ok:true,status:200,json:async()=>({id:user,is_anonymous:false})};},
  load:async x=>{
   seen.push(x.eventKind);assert.equal(x.continuityRootId,scope.continuity_root_id);
   return{status:'AVAILABLE',entries:x.eventKind==='AUTHENTICATED_CONVERSATION_MESSAGE'?msgs:
    x.eventKind==='CONTINUITY_STATE_TRANSITION'?diag:commits};
  }
 });
 assert.deepEqual(seen,['AUTHENTICATED_CONVERSATION_MESSAGE','CONTINUITY_STATE_TRANSITION',
  'REALITY_CAUSAL_TURN_RECEIPT']);
 assert.equal(r.completed_pre_registered_benchmark,true);
});
test('different principal cannot recover other user evidence even with same conversation selector',()=>{
 const {msgs,diag,commits}=sample(12);
 const different=createStandaloneConversationScope({
  userId:'f44440ec-4266-4c95-a6cd-929bc58b445f',conversationId:'suite-12'});
 const out=buildTwelveTurnComparison({scope:different,messageEntries:msgs,
  continuityEntries:diag,commitEntries:commits});
 assert.equal(out.turn_count,0);assert.equal(out.completed_pre_registered_benchmark,false);
});
test('deterministic report after reload over unchanged ledger',()=>{
 const {msgs,diag,commits}=sample(12);
 const params={scope,messageEntries:msgs,continuityEntries:diag,commitEntries:commits};
 assert.equal(buildTwelveTurnComparison(params).comparison_receipt_hash,
  buildTwelveTurnComparison(params).comparison_receipt_hash);
});

test('read-only benchmark projects actual Reality-native judge receipts without inventing accuracy',()=>{
 const {msgs,diag,commits}=sample(12);
 const userText=TWELVE_TURN_SCRIPT[0].prompt;
 const answerText='Understood, I will hold the construction estimate until the homeowner approves the final scope.';
 const userSource='signal:synthetic-test-turn-one';
 const assistantSource='model-response:synthetic-test-turn-one';
 const spine=assessIntelligenceSpineV1({
  continuityRootId:scope.continuity_root_id,userSourceRef:userSource,
  modelSourceRef:assistantSource,currentRequest:userText,rawAnswer:answerText,
  priorConversationSource:'AUTHENTICATED_CONVERSATION_MESSAGES',
  authenticatedHistoryVerified:true,
  conversationDrift:{status:'LIMITED_CONVERSATION_CHECK_NO_FLAG',findings:[]},
  modelIntegrity:{status:'NO_TRUSTED_REFERENCE',findings:[]},
  trajectoryReplay:{status:'LIMITED_REPLAY_NO_DRIFT_FLAGGED',findings:[]},
 });
 const native=realityJudgeTurn({
  turn_id:'benchmark-0',continuity_root_id:scope.continuity_root_id,
  user_source_ref:userSource,answer_source_ref:assistantSource,
  request:userText,answer:answerText,owner_scoped_readback_verified:true,
  user_message_receipt_hash:'sha256:verified-user-in-test',
  assistant_message_receipt_hash:'sha256:verified-assistant-in-test',
  spine,
 });
 const first=commits[0];
 const signed=row('REALITY_CAUSAL_TURN_RECEIPT',first.entry_id,
  first.assertion_time,{...first.payload,native_judge_receipt:native});
 const out=buildTwelveTurnComparison({scope,messageEntries:msgs,
  continuityEntries:diag,commitEntries:[signed,...commits.slice(1)]});
 assert.equal(out.reality_native_judged_turns,1);
 assert.equal(out.reality_native_clear_turns,1);
 assert.equal(out.reality_native_self_score_pct,100);
 assert.equal(out.turns[0].reality_native_judge_status,
   'NO_CANDIDATES_IN_CHECKED_COVERAGE');
 assert.equal(out.turns[0].reality_native_judge_receipt,native.judge_receipt_hash);
 assert.equal(out.hallucination_rate_reality,null);
 assert.equal(out.drift_rate_reality,null);
});
