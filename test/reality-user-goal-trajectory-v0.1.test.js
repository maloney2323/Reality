import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {buildCognitionContinuityHandoff,projectUserGoalTrajectory} from '../src/reality-cognition-continuity-handoff-v0.1.js';
import {buildCanonicalEpistemicFrame} from '../src/reality-canonical-epistemic-frame-v0.1.js';
import {reviewRealityAnswer} from '../src/reality-semantic-review-v0.1.js';
const time='2026-10-25T17:40:00.000Z';
const history=[
 {role:'user',text:'Our main goal is to finish a construction estimate for the homeowner. Keep that as the active project.',source_ref:'original:user:1'},
 {role:'assistant',text:'We can finish the estimate after confirming materials.',source_ref:'assistant:2'},
 {role:'user',text:'Briefly check how many scanners are in inventory, then return to the estimate.',source_ref:'user:detour:3'},
 {role:'assistant',text:'We can count the barcode scanners. Our next major work is still the homeowner estimate.',source_ref:'assistant:4'},
 {role:'user',text:'Now return to the original estimate. Show what remains unfinished.',source_ref:'user:return:5'},
 {role:'assistant',text:'We could build a social-media campaign first.',source_ref:'assistant:6'},
];
function setup(message='What remains to finish the estimate?'){
 const signal=buildGovernedChatSignal({message,observedAt:time});
 const handoff=buildCognitionContinuityHandoff({
  governedSignal:signal,verifiedConversationTurns:history,latestMessage:message,
 });
 const frame=buildCanonicalEpistemicFrame({
  governedSignal:signal,conversationContinuity:handoff,
  continuityRootId:'test:intent-root',observedAt:time,
 });
 return {signal,handoff,frame};
}
async function evaluate({message,prior=history,answer,trajectoryFactory}){
 const signal=buildGovernedChatSignal({message,observedAt:time});
 const handoff=buildCognitionContinuityHandoff({
  governedSignal:signal,verifiedConversationTurns:prior,latestMessage:message,
 });
 let captured=null;
 const fake=async(_url,opts)=>{
  const req=JSON.parse(opts.body);
  captured=JSON.parse(req.input[1].content[0].text);
  const goal=trajectoryFactory(handoff.user_goal_trajectory);
  return new Response(JSON.stringify({id:'trajectory:offline',
   output_text:JSON.stringify({
    addresses_current_request:true,issues:[],claims:[],actions:[],
    provenance_checks:(captured.conversation_evidence?.candidates||[]).map(x=>({
     source_ref:x.source_ref,clause_id:x.clause_id,relation:'NOT_MENTIONED',
     answer_quote:'',verified_source_ref:'',reason:'Not referred to in response.',
    })),
    goal_trajectory_review:goal,
   }),
  }),{status:200});
 };
 const review=await reviewRealityAnswer({
  currentUserMessage:message,modelAnswer:answer,priorTurns:prior,
  userGoalTrajectory:handoff.user_goal_trajectory,
  conversationEvidence:handoff.conversation_evidence,
  model:'fixture',apiKey:'fixture-no-provider',fetchImpl:fake,
 });
 return {review:review.review,captured,trajectory:handoff.user_goal_trajectory};
}
test('foundation persists original user objective, user detour and observed assistant replies separately',()=>{
 const {handoff,frame}=setup();
 const t=handoff.user_goal_trajectory;
 assert.equal(t.original_user_goal_candidate.source_ref,'original:user:1');
 assert.equal(t.recent_user_directions.length,3);
 assert.equal(t.recent_assistant_behavior.length,3);
 assert.equal(t.recent_assistant_behavior.at(-1).source_ref,'assistant:6');
 assert.equal(t.assistant_topic_shift_is_not_user_authorization,true);
 assert.equal(frame.user_goal_trajectory.original_user_goal_candidate.text,
   history[0].text);
 assert.equal(frame.user_goal_trajectory.external_truth_established,false);
 assert.equal(frame.user_goal_trajectory.semantic_goal_alignment_not_yet_adjudicated,true);
});
test('goal drift detected when assistant pursues its own campaign instead of the resumed user goal',async()=>{
 const message='What remains to finish the estimate?';
 const answer='First we should launch a daily social-media campaign and postpone the estimate.';
 const {review,captured}=await evaluate({message,answer,
  trajectoryFactory:t=>({
   goal_source_ref:t.current_user_direction.source_ref,
   user_direction:'USER_RETURNED_TO_OBJECTIVE',
   answer_alignment:'ASSISTANT_DRIFTED_OFF_OBJECTIVE',
   answer_quote:'launch a daily social-media campaign',
   reason:'The user returned to the estimate, while the assistant shifted to its own advertising goal.',
  }),
 });
 assert.equal(captured.user_goal_trajectory.original_user_goal_candidate.source_ref,'original:user:1');
 assert.ok(captured.user_goal_trajectory.recent_assistant_behavior.some(x=>x.source_ref==='assistant:6'));
 assert.equal(review.goal_trajectory_review.answer_alignment,'ASSISTANT_DRIFTED_OFF_OBJECTIVE');
 assert.ok(review.issues.some(x=>x.kind==='WRONG_TASK'&&
  x.quote==='launch a daily social-media campaign'));
 assert.equal(review.independent_semantic_adjudication,false);
});
test('explicit user-directed change of task is not drift simply for departing the original goal',async()=>{
 const msg='Switch priorities: help me prepare a shipping checklist, not the estimate.';
 const answer='Here is a shipping checklist: verify the consignee and the delivery window.';
 const {review}=await evaluate({message:msg,answer,
  trajectoryFactory:t=>({
   goal_source_ref:t.current_user_direction.source_ref,
   user_direction:'USER_AUTHORIZED_PIVOT',
   answer_alignment:'ON_USER_DIRECTED_OBJECTIVE',
   answer_quote:'',
   reason:'The user explicitly changed the immediate objective to a shipping checklist.',
  }),
 });
 assert.equal(review.issues.length,0);
 assert.equal(review.goal_trajectory_review.user_direction,'USER_AUTHORIZED_PIVOT');
 assert.equal(review.goal_trajectory_review.answer_alignment,'ON_USER_DIRECTED_OBJECTIVE');
});
test('temporary user detour is allowed without erasing earlier objective',async()=>{
 const msg='Before the estimate, please count the scanners. Then we will return to the estimate.';
 const answer='Check the scanner stock count and record the shortage before continuing the estimate.';
 const {review,trajectory}=await evaluate({message:msg,answer,
  trajectoryFactory:t=>({
   goal_source_ref:t.current_user_direction.source_ref,
   user_direction:'USER_AUTHORIZED_DETOUR',
   answer_alignment:'ON_USER_DIRECTED_OBJECTIVE',
   answer_quote:'',
   reason:'The requested temporary inventory task was authorized by the user.',
  }),
 });
 assert.equal(review.issues.length,0);
 assert.equal(trajectory.original_user_goal_candidate.source_ref,'original:user:1');
});
test('assistant cannot claim invented source reference as user authorization',async()=>{
 const msg='Return to the homeowner estimate.';
 const answer='Let us work on ad campaigns instead.';
 const {review}=await evaluate({message:msg,answer,
  trajectoryFactory:()=>({
   goal_source_ref:'assistant:2',
   user_direction:'USER_AUTHORIZED_PIVOT',
   answer_alignment:'ASSISTANT_DRIFTED_OFF_OBJECTIVE',
   answer_quote:'ad campaigns',
   reason:'Assistant proposes campaigns.',
  }),
 });
 assert.equal(review.goal_trajectory_review.status,'INVALID_OR_UNANCHORED_GOAL_ASSESSMENT');
 assert.equal(review.issues.filter(x=>x.kind==='WRONG_TASK').length,0);
 assert.ok(review.unassessed_claims.some(x=>x.reason==='GOAL_TRAJECTORY_REVIEW_UNANCHORED'));
});
test('unsupported semantic verdict cannot become a false zero drift measurement',async()=>{
 const message='Can we finish the homeowner estimate?';
 const signal=buildGovernedChatSignal({message,observedAt:time});
 const t=projectUserGoalTrajectory({verifiedConversationTurns:history,
  currentUserMessage:message,currentUserSourceRef:signal.packet.packet_id});
 assert.equal(t.semantic_goal_alignment_not_yet_adjudicated,true);
 assert.equal(t.historical_user_goals_may_be_completed_or_superseded,true);
});
