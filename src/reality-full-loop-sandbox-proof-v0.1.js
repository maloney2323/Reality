// Full-loop composition across Reality's *existing* foundational contracts:
// observation -> work discovery -> missing capability -> sandbox acquisition ->
// authority -> attempted work -> correction -> outcome read-back -> independent
// sandbox reconstruction -> verified learning -> Universe update -> continuation.
//
// This is an isolated EXECUTABLE SANDBOX proof. It does not send customer
// messages, acquire LLM-generated code, merge into production, or establish
// a real-world outcome / customer savings.
import crypto from 'node:crypto';
import {discoverWork,qualifyWorkCandidate} from './reality-work-discovery-foundation-v1.0.js';
import {
  detectCapabilityGap,confirmCapabilityGap,createSandboxExperiment,
  authorizeSandboxExperiment,validateSandboxResult,
} from './reality-autonomous-capability-loop-v1.0.js';
import {
  createSandboxFollowUpProposal,createSandboxAuthorization,
  buildSandboxScope,canExecuteSandboxFollowUp,executeSandboxFollowUp,
  createSandboxStore,
} from './reality-sandbox-governed-work-world-v0.1.js';
import {runClosedLoopObjective} from './reality-closed-loop-runtime-v0.1.js';

export const FULL_LOOP_SANDBOX_PROOF_VERSION='reality-full-loop-sandbox-proof-v0.1';
const stable=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(stable):
  Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const SCOPE='work:sandbox';
function newHistory(){
  const receipts=[];
  const append=(step,detail={})=>{
    const previous=receipts.at(-1)||null;
    const data={step,detail,prior_hash:previous?.hash||null};
    const receipt=Object.freeze({...data,hash:sha(data)});
    receipts.push(receipt);return receipt;
  };
  return {append,all:()=>Object.freeze(receipts.slice())};
}
export function verifyFullLoopProofReceipts(receipts){
  if(!Array.isArray(receipts)||!receipts.length) return false;
  let previous=null;
  for(const item of receipts){
    if(item.prior_hash!==previous)return false;
    if(sha({step:item.step,detail:item.detail,prior_hash:item.prior_hash})!==item.hash)return false;
    previous=item.hash;
  }
  return true;
}
export async function runFullLoopSandboxProof({
  principal='sandbox-owner',
  ownerApproval=true,
  injectFailure=true,
  denyIndependentReadback=false,
}={}){
  const ledger=newHistory(),store=createSandboxStore(),universe=new Map();
  const at=new Date().toISOString();
  // These observations are deliberately synthetic. Work is found without a
  // prompt requesting the particular task, but not from a real connector.
  const work=qualifyWorkCandidate(discoverWork({now:at,observations:[
    {observation_id:'synthetic-observation:1',work_key:'customer-follow-up-review',
      kind:'RECURRING_OPERATION',objective:'Prepare a customer follow-up task',
      occurred_at:new Date(Date.now()-2*86400000).toISOString(),
      evidence_refs:['sandbox-observation:1'],recurring_work:true},
    {observation_id:'synthetic-observation:2',work_key:'customer-follow-up-review',
      kind:'RECURRING_OPERATION',objective:'Prepare a customer follow-up task',
      occurred_at:new Date(Date.now()-86400000).toISOString(),
      evidence_refs:['sandbox-observation:2'],recurring_work:true},
  ]})[0]);
  if(work.state!=='QUALIFIED')throw Error('FULL_LOOP_WORK_NOT_QUALIFIED');
  ledger.append('WORK_DISCOVERED',{work_id:work.work_id,evidence_refs:work.evidence_refs});
  const proposal=createSandboxFollowUpProposal({
    principal,operationId:'full-loop:'+work.work_id,
    title:'Review customer follow-up for approval',
    description:'Isolated benchmark only: do not send a message.',
  });
  // Initial attempt cannot execute without authority. Exactly the same
  // proposal / task / work identity MUST survive capability acquisition.
  store.recordProposal(proposal);
  const first=canExecuteSandboxFollowUp({proposal,authorization:null});
  if(first.allowed)throw Error('FULL_LOOP_UNAUTHORIZED_ATTEMPT_WAS_ALLOWED');
  ledger.append('ORIGINAL_WORK_BLOCKED',{
    original_work_id:work.work_id,original_operation_id:proposal.operation_id,
    reason:first.reason,
  });
  if(!ownerApproval){
    ledger.append('APPROVAL_NEEDED',{work_id:work.work_id});
    return Object.freeze({
      status:'AWAITING_OWNER_APPROVAL',verified_full_loop:false,
      work_id:work.work_id,original_attempt_blocked:true,
      externally_consequential_actions:0,real_customer_operations:0,
      steps:ledger.all(),ledger_verified:verifyFullLoopProofReceipts(ledger.all()),
    });
  }
  // Confirm the missing bounded sandbox capability using observed failure.
  const gap=detectCapabilityGap({
    consequence:{gap:'MISSING_CAPABILITY',subject:'sandbox_follow_up_executor'},
    workItem:{id:work.work_id,continuity_root_id:'root:'+work.work_id,
      worldline_id:SCOPE},
    capabilities:[],
  });
  const confirmed=confirmCapabilityGap(gap,{
    historicalFailureRefs:[ledger.all().at(-1).hash],
    inputSchema:{proposal_id:'string',authorized_scope:'exact'},
    outputSchema:{task_id:'string',state:'CREATED_IN_SANDBOX'},
    verificationSuiteRef:'test/reality-full-loop-sandbox-proof-v0.1.test.js',
  });
  ledger.append('CAPABILITY_GAP_CONFIRMED',{gap_id:confirmed.gap_id,
    original_work_id:confirmed.work_item_id});
  const experiment=createSandboxExperiment({
    confirmedGap:confirmed,primaryWorldlineId:SCOPE,
  });
  const authorizedExperiment=authorizeSandboxExperiment(experiment,{
    authorizationRef:'sandbox-fixture-owner-authorization',
    authorizedBy:principal,
  });
  // Capability acquisition is *registration of the existing tested sandbox
  // executor*. No claim of model-generated code synthesis or deploy/merge.
  const preflightStore=createSandboxStore();
  const preflightProposal=createSandboxFollowUpProposal({
    principal,operationId:'preflight:'+work.work_id,
    title:'Isolated capability preflight',
  });
  preflightStore.recordProposal(preflightProposal);
  const preflightAuth=createSandboxAuthorization({
    proposal:preflightProposal,approvedBy:principal,
    scope:buildSandboxScope(preflightProposal),
  });
  preflightStore.recordAuthorization(preflightProposal,preflightAuth);
  const preflight=executeSandboxFollowUp({
    proposal:preflightProposal,authorization:preflightAuth,store:preflightStore,
  });
  const preflightReadback=preflightStore.reconstruct()[preflightProposal.task.task_id];
  const isolatedProof=preflight.status==='SUCCEEDED'&&
    preflightReadback?.state==='COMPLETED' &&
    preflightReadback.last_outcome_event_id===preflight.outcome_event?.event_id;
  if(!isolatedProof)throw Error('FULL_LOOP_CAPABILITY_PREFLIGHT_READBACK_FAILED');
  const verifiedExperiment=validateSandboxResult(authorizedExperiment,{
    synthesizedCapability:{kind:'EXISTING_SANDBOX_ADAPTER',code_generated:false},
    frozenRegression:{passed:isolatedProof,receipt_ref:preflight.outcome_event.event_id},
    isolatedVerification:{verified:isolatedProof,receipt_ref:preflightReadback.last_outcome_event_id},
    capabilitySignature:sha({module:'reality-sandbox-governed-work-world-v0.1',
      preflight_receipt:preflight.outcome_event.event_hash}),
  });
  ledger.append('SANDBOX_CAPABILITY_VERIFIED',{
    experiment_hash:verifiedExperiment.experiment_hash,
    isolated_readback_ref:preflight.outcome_event.event_id,
    production_merge_eligible:false,
  });
  // This bounded fixture grants only a same-principal sandbox operation.
  const authorization=createSandboxAuthorization({
    proposal,approvedBy:principal,scope:buildSandboxScope(proposal),
  });
  store.recordAuthorization(proposal,authorization);
  if(!canExecuteSandboxFollowUp({proposal,authorization}).allowed)
    throw Error('FULL_LOOP_ACTION_NOT_AUTHORIZED');
  const actionHash=sha({proposal_id:proposal.work_item_id,
    authorization_id:authorization.authorization_id});
  let independentOutcome=false;
  const closed=await runClosedLoopObjective({
    objective:{
      objectiveId:'objective:'+work.work_id,
      description:work.objective,
      worldId:SCOPE,continuityRootId:'root:'+work.work_id,
      worldlineId:SCOPE,
      successCriteria:['Same original task created in isolated sandbox and independently reconstructed'],
      evidenceRefs:work.evidence_refs,
    },
    capability:{
      detectGap:async()=>({
        gap_id:confirmed.gap_id,capability_id:confirmed.capability_id,
        evidence_refs:[ledger.all().find(r=>r.step==='ORIGINAL_WORK_BLOCKED').hash],
        reason:'Original work blocked before sandbox capability acquisition.',
      }),
      acquire:async()=>({
        acquisitionId:'acquired:'+verifiedExperiment.gap_id,
        artifactRefs:[verifiedExperiment.verification_hash],
        candidateCapabilityHash:verifiedExperiment.capability_signature,
      }),
      verify:async()=>({
        verificationId:'capability-verified:'+verifiedExperiment.gap_id,
        independent:isolatedProof,passed:isolatedProof,
        evidenceRefs:[preflight.outcome_event.event_id],
      }),
    },
    action:{prepare:async()=>({
      authorization_id:authorization.authorization_id,authorized_by:principal,
      action_hash:actionHash,scope:'sandbox_work:create_follow_up_task:'+proposal.work_item_id,
      expires_at:'2099-01-01T00:00:00Z',
    })},
    recursive:{run:async()=>{
      const result=executeSandboxFollowUp({proposal,authorization,store});
      ledger.append('ORIGINAL_WORK_RETRIED',{
        original_work_id:work.work_id,original_operation_id:proposal.operation_id,
        completed_in_sandbox:result.status==='SUCCEEDED',
        execution_receipt_id:result.outcome_event?.event_id||null,
      });
      if(result.status!=='SUCCEEDED')throw Error('FULL_LOOP_SANDBOX_EXECUTION_FAILED');
      const events=store.events(),reconstructed=store.reconstruct();
      const confirmedTask=reconstructed[proposal.task.task_id];
      const outcome=events.find(e=>e.event_id===result.outcome_event.event_id);
      const recon=events.find(e=>e.event_id===result.reconciliation_event.event_id);
      independentOutcome=!denyIndependentReadback&&
        confirmedTask?.state==='COMPLETED'&&
        confirmedTask?.last_outcome_event_id===outcome?.event_id&&
        outcome?.payload?.operation_id===proposal.operation_id&&
        recon?.payload?.state_after==='COMPLETED'&&
        verifyFullLoopProofReceipts(ledger.all());
      ledger.append('INDEPENDENT_SANDBOX_RECONSTRUCTION',{
        original_work_id:work.work_id,
        outcome_receipt_id:outcome?.event_id||null,
        verified:independentOutcome,
        evidence_type:'SEPARATE_SANDBOX_REPLAY_NOT_EXTERNAL_CUSTOMER_RECORD',
      });
      if(!independentOutcome)throw Error('FULL_LOOP_OUTCOME_NOT_INDEPENDENTLY_VERIFIED');
      // Only after independent sandbox readback may the ephemeral Universe
      // projection advance and the successor cognition accept it.
      const evidenceRef=recon.event_id;
      const updateId='universe-sandbox:'+work.work_id;
      const learningId='learning-sandbox:'+work.work_id;
      const stateId='state:'+work.work_id+':verified';
      universe.set(work.work_id,{state:'VERIFIED_SANDBOX_ONLY',
        task_id:proposal.task.task_id,receipt_id:evidenceRef,updated_state_id:stateId});
      return {
        executionReceipt:{
          execution_receipt_hash:outcome.event_hash,status:'SUCCEEDED',
          evidence_references:[outcome.event_id],
        },
        targetObservation:{
          observation_id:outcome.event_id,execution_receipt_hash:outcome.event_hash,
          evidence_references:[recon.event_id],result:'COMPLETED_IN_SANDBOX',
        },
        independentVerification:{
          verification_id:'sandbox-readback:'+recon.event_id,
          independent_source_ref:'isolated-sandbox-reconstruction:'+recon.event_id,
          target_observation_id:outcome.event_id,
          verified:true,evidence_references:[recon.event_id],
          result:'TASK_PERSISTED_IN_EPHEMERAL_SANDBOX',
        },
        learningDelta:{
          learning_delta_id:learningId,
          changed_claims:['Sandbox task creation succeeded with exact scoped owner authorization'],
          evidence_references:[recon.event_id],
        },
        universeUpdate:{
          universe_learning_update_id:updateId,universe_state_id:stateId,
        },
        nextCognitiveState:{cognitive_state_id:'resume:'+work.work_id},
      };
    }},
  }).catch(error=>{
    ledger.append('FAIL_CLOSED',{reason:String(error.message||'UNVERIFIED').slice(0,100)});
    return {state:'BLOCKED',error:Error(String(error.message||'UNVERIFIED')).message};
  });
  const projection=universe.get(work.work_id)||null;
  const realClosure=closed.state==='COGNITION_RESUMED'&&independentOutcome&&
    projection?.task_id===proposal.task.task_id &&
    projection?.state==='VERIFIED_SANDBOX_ONLY' &&
    closed.objective?.next_cognitive_state_id==='resume:'+work.work_id;
  ledger.append(realClosure?'CONTINUED_FROM_VERIFIED_UNIVERSE':'NOT_COMPLETED',{
    original_work_id:work.work_id,closed_loop_state:closed.state,
    resumed_from_verified_projection:realClosure,
  });
  return Object.freeze({
    version:FULL_LOOP_SANDBOX_PROOF_VERSION,
    status:realClosure?'CLOSED_LOOP_VERIFIED_SANDBOX':'BLOCKED_UNVERIFIED',
    verified_full_loop:realClosure,
    original_work_id:work.work_id,
    same_original_task_retried:true,
    original_attempt_blocked:!first.allowed,
    capability_gap_detected:true,
    sandbox_capability_verified:true,
    authority_scope:'sandbox_only',
    proposed_correction_was_executed:realClosure,
    external_customer_outcome_verified:false,
    independent_sandbox_readback_verified:independentOutcome,
    ephemeral_universe_updated:realClosure,
    cognition_resumed:realClosure,
    generated_code_acquired:false,
    production_merge_eligible:false,
    externally_consequential_actions:0,
    real_customer_operations:0,
    simulated_saved_supervision_minutes:null,
    receipts:ledger.all(),
    receipt_chain_verified:verifyFullLoopProofReceipts(ledger.all()),
    objective_state:closed.state,
    continuation_projection:projection,
  });
}
