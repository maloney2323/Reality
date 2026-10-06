export const OPPORTUNITY_RANKER_VERSION='reality-opportunity-ranker-v0.2';
export const PORTFOLIO_MODES=Object.freeze(['EXPLOIT','EXPLORE','DIAGNOSE','STABILIZE','RECOVER']);
function n(x,d=0){const v=Number(x);return Number.isFinite(v)?v:d}
export function scoreOpportunity(o,{objectiveGainWeight=1,leverageWeight=1,verificationWeight=1,reversibilityWeight=1,riskWeight=1,costWeight=1,complexityWeight=1,uncertaintyWeight=0.5}={}) {
  const benefit=n(o.expectedObjectiveGain)*n(o.objectiveRelevance,1)+n(o.leverage)*leverageWeight;
  const confidence=Math.max(0,1-n(o.verificationDifficulty)*verificationWeight*0.5);
  const upside=benefit*confidence*Math.max(0,n(o.reversibility,1)*reversibilityWeight);
  const denominator=1+n(o.estimatedCost)*costWeight+n(o.safetyRisk)*riskWeight+n(o.complexity,0)*complexityWeight;
  return Math.max(0,(upside+Math.max(0,n(o.uncertaintyReduction))*uncertaintyWeight)/denominator)*objectiveGainWeight;
}
export function rankOpportunities(opportunities,{objective={},budgets={},requiredEvidence=true}={}) {
  const scored=(opportunities||[]).map(o=>({...o,score:scoreOpportunity(o,budgets),eligible:(!requiredEvidence||(o.basisRefs||[]).length>0)&&n(o.expectedObjectiveGain)>0&&n(o.safetyRisk)<=n(budgets.riskBudget,1)&&n(o.verificationDifficulty)<1}));
  return scored.sort((a,b)=>b.score-a.score);
}
export function buildPortfolio(ranked,{modeWeights={EXPLOIT:.6,EXPLORE:.2,DIAGNOSE:.1,STABILIZE:.1},maxSize=4}={}) {
  const groups={EXPLOIT:[],EXPLORE:[],DIAGNOSE:[],STABILIZE:[],RECOVER:[]};
  for(const x of ranked){const mode=x.type==='STAGNATION'?'DIAGNOSE':x.type==='CAPABILITY_STABILIZATION'?'STABILIZE':x.safetyRisk>0.5?'RECOVER':x.leverage>0.5?'EXPLORE':'EXPLOIT';groups[mode].push({...x,mode})}
  const selected=[]; for(const mode of Object.keys(groups)){const quota=Math.max(0,Math.round(maxSize*n(modeWeights[mode],0))); if(quota) selected.push(...groups[mode].slice(0,quota))}
  if(!selected.length) selected.push(...ranked.slice(0,maxSize)); return selected.slice(0,maxSize);
}
export function selectNextEvolution({ranked,constitution,universeConsistent=true,evaluationFresh=true}={}) {
  if(!universeConsistent) return {action:'PAUSE',reason:'UNIVERSE_INCONSISTENT'};
  if(!evaluationFresh) return {action:'DIAGNOSE',reason:'EVALUATION_STALE'};
  const eligible=(ranked||[]).filter(x=>x.eligible&&x.score>0);
  if(!eligible.length) return {action:'PAUSE',reason:'NO_ELIGIBLE_OPPORTUNITY'};
  const top=eligible[0]; if(top.safetyRisk>constitution.risk_budget) return {action:'PAUSE',reason:'RISK_BUDGET_EXCEEDED'};
  return {action:'SANDBOX',opportunity:top};
}
