import { discoverWork, qualifyWorkCandidate, rankWorkForMoney } from './reality-work-discovery-foundation-v1.0.js';

export const CAPABILITY_GAP_DETECTOR_VERSION = 'reality-capability-gap-detector-v1.0';

const list=v=>Array.isArray(v)?v.filter(Boolean):[];
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;

export function detectCapabilityGaps({
 observations=[],
 failureThreshold=0.25,
 minimumObservations=3,
 existingCapabilities=[],
}= {}){
 if(!Array.isArray(observations))throw new Error('OBSERVATIONS_REQUIRED');
 const groups=new Map();
 for(const o of observations){
  const capability=o?.capability||o?.required_capability;
  if(!capability)continue;
  const arr=groups.get(capability)||[];
  arr.push(o); groups.set(capability,arr);
 }
 const gaps=[];
 for(const [capability,items] of groups){
  if(items.length<minimumObservations)continue;
  const failures=items.filter(i=>i.outcome==='FAIL'||i.passed===false);
  const failureRate=failures.length/items.length;
  if(failureRate<failureThreshold)continue;
  const quality=items.map(i=>Number(i.quality_score)).filter(Number.isFinite);
  if(existingCapabilities.some(c=>(c?.id||c?.name)===capability))continue;
  gaps.push({
   gap_id:`GAP-${capability}-${items.length}`,
   detector_version:CAPABILITY_GAP_DETECTOR_VERSION,
   capability, observation_count:items.length,
   failure_count:failures.length, failure_rate:failureRate,
   mean_quality_score:quality.length?mean(quality):null,
   evidence_refs:items.map(i=>i.evidence_ref).filter(Boolean),
   observed_failure_modes:[...new Set(failures.map(i=>i.failure_mode).filter(Boolean))],
   recurring_work:discoverWork({observations:items}).filter(w=>w.recurring),
   status:'CANDIDATE'
  });
 }
 return gaps.sort((a,b)=>b.failure_rate-a.failure_rate);
}

export function discoverAutonomousWork({
 observations=[],
 existingWork=[],
 minimumRecurrences=2,
 minRevenue=0,
}= {}){
 const work=discoverWork({observations,existingWork,minimumRecurrences});
 return work
  .map(w=>qualifyWorkCandidate(w))
  .map(w=>rankWorkForMoney(w))
  .sort((a,b)=>(b.money_priority_score||0)-(a.money_priority_score||0));
}

export function createResearchProblemFromGap({gap,objective,constraints=[]}={}){
 if(!gap?.gap_id)throw new Error('CAPABILITY_GAP_REQUIRED');
 if(!objective)throw new Error('RESEARCH_OBJECTIVE_REQUIRED');
 return {
  research_problem_id:`RP-${gap.gap_id}`,
  capability_gap:gap.capability,
  evidence:list(gap.evidence_refs),
  failure_history:list(gap.observed_failure_modes),
  recurring_work:list(gap.recurring_work),
  constraints:list(constraints),
  objective,state:'OPEN',hypotheses:[],experiments:[],candidate_genomes:[],resolution:null
 };
}
