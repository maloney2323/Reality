// Convert verified authenticated goal+action admission into ONE durable
// reservation. NO external provider action is dispatched in this service.
// Atomic claim rereads the epoch under the same lock as user chat/goal changes.
import { prepareAuthenticatedPersonalExecution }
 from './reality-personal-execution-admission-service-v0.1.js';
import { createSingleUseExecutionReservationStore }
 from './reality-single-use-execution-reservation-v0.1.js';

export const PERSONAL_EXECUTION_RESERVATION_SERVICE_VERSION='reality-personal-execution-reservation-service-v0.1';

export async function reserveAuthenticatedPersonalExecution({
 session,conversationId,workItem,groundingProof,env=process.env,
 prepare=prepareAuthenticatedPersonalExecution,
 storeFactory=createSingleUseExecutionReservationStore,
}={}){
 const prepared=await prepare({
  session,conversationId,workItem,groundingProof,env,
 });
 if(prepared.status!=='GOAL_AND_ACTION_ADMITTED_PENDING_EXECUTION_LEASE'||
    !prepared.internal?.serverFreshGoalAdmission)
  throw Error('EXECUTION_RESERVATION_ADMISSION_NOT_VALIDATED');
 const admission=prepared.internal.serverFreshGoalAdmission;
 const store=storeFactory({session,conversationId,env});
 // A revision mismatch means that another command or user message was
 // admitted between earlier goal projection and the reservation snapshot.
 const epoch=await store.readEpoch();
 if(epoch.goal_revision!==admission.goal_revision||
    epoch.goal_transition_event_id!==admission.goal_transition_receipt_id)
  throw Error('EXECUTION_RESERVATION_GOAL_EPOCH_MISMATCH');
 const reservation=await store.claim({
  policyId:prepared.action_policy_id,
  workFingerprint:prepared.work_item_fingerprint,
  goalId:prepared.goal_id,
  expectedGoalRevision:epoch.goal_revision,
  expectedGoalEventId:epoch.goal_transition_event_id,
  expectedUserMessageRevision:epoch.user_message_revision,
  expectedLatestUserRequestId:epoch.latest_user_request_id,
 });
 return Object.freeze({
  status:'SINGLE_USE_RESERVED_PENDING_DISPATCH',
  goal_id:prepared.goal_id,
  action_policy_id:prepared.action_policy_id,
  work_item_fingerprint:prepared.work_item_fingerprint,
  reservation_id:reservation.reservation_id,
  user_message_revision:epoch.user_message_revision,
  latest_user_request_id:epoch.latest_user_request_id,
  execution_authorized:false,
  external_action_performed:false,
  reservation_claimed_once:true,
  // Never expose server admission or server DB store in HTTP responses.
  internal:{...prepared.internal,store,reservation},
 });
}
