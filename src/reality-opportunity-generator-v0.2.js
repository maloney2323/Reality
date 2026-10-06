import crypto from 'node:crypto';
export const OPPORTUNITY_GENERATOR_VERSION='reality-opportunity-generator-v0.2';
function digest(v){return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')}
function add(out,type,x){if(!x?.id) return; out.push({id:`opportunity:${type}:${x.id}`,type,subject:x.id,basisRefs:x.evidenceRefs||x.basisRefs||[],expectedObjectiveGain:Number(x.expectedObjectiveGain??x.impact??0),uncertaintyReduction:Number(x.uncertaintyReduction??0),estimatedCost:Number(x.estimatedCost??1),safetyRisk:Number(x.safetyRisk??0),verificationDifficulty:Number(x.verificationDifficulty??0),reversibility:Number(x.reversibility??1),leverage:Number(x.leverage??0),objectiveRelevance:Number(x.objectiveRelevance??1),description:x.description||type})}
export function generateEvolutionOpportunities({failures=[],friction=[],verificationWeaknesses=[],bottlenecks=[],externalGaps=[],stagnation=[],capabilities=[]}={}) {
  const out=[]; failures.forEach(x=>add(out,'OBSERVED_FAILURE',x)); friction.forEach(x=>add(out,'REPEATED_FRICTION',x)); verificationWeaknesses.forEach(x=>add(out,'VERIFICATION_WEAKNESS',x)); bottlenecks.forEach(x=>add(out,'BOTTLENECK',x)); externalGaps.forEach(x=>add(out,'EXTERNAL_GAP',x)); stagnation.forEach(x=>add(out,'STAGNATION',x));
  for(const c of capabilities) if(c.failureRate>0.2||c.uncertainty>0.5) add(out,'CAPABILITY_STABILIZATION',{...c,id:c.id,expectedObjectiveGain:c.importance||0,estimatedCost:c.improvementCost,safetyRisk:c.safetyRisk,verificationDifficulty:c.verificationDifficulty,leverage:c.leverage||0});
  return out.map(x=>({...x,opportunityHash:`opportunity:${digest(x)}`}));
}
