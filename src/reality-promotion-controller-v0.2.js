export const PROMOTION_STATES=Object.freeze(['candidate','sandbox','verified_candidate','shadow','canary','limited','general','degraded','quarantined','deprecated','retired']);
export function authorizePromotion({evaluation,independentVerification,constitution,promotion}={}) {
  if(evaluation?.passed!==true) return {approved:false,reason:'EVALUATION_FAILED'};
  if(independentVerification?.verified!==true) return {approved:false,reason:'INDEPENDENT_VERIFICATION_REQUIRED'};
  if(!constitution?.immutable_rules?.requireRollback) return {approved:false,reason:'CONSTITUTION_ROLLBACK_RULE_MISSING'};
  if(promotion?.approved!==true) return {approved:false,reason:'PROMOTION_AUTHORIZATION_REQUIRED'};
  return {approved:true,state:'shadow',promotion_ref:promotion.promotion_ref,rollback_version:promotion.rollbackVersion,review_date:promotion.reviewDate||null};
}
export function advancePromotion({currentState,evidence,thresholds={}}={}) {
  const order=['shadow','canary','limited','general']; const i=order.indexOf(currentState); if(i<0) throw new Error('PROMOTION_STATE_INVALID');
  if(evidence?.passed!==true) return {state:currentState,action:'HOLD'};
  if(Number(evidence.observedBenefit||0)<Number(thresholds.minimumBenefit??0)) return {state:currentState,action:'HOLD'};
  return {state:order[Math.min(i+1,order.length-1)],action:'ADVANCE'};
}
export function lifecycleAction({capability,observations={}}={}) {
  if(observations.safetyIncident===true) return {state:'quarantined',action:'ROLLBACK'};
  if(observations.degraded===true) return {state:'degraded',action:'REVALIDATE'};
  if(observations.superseded===true) return {state:'deprecated',action:'RETIRE_AFTER_MIGRATION'};
  return {state:capability?.status||'verified',action:'MONITOR'};
}
