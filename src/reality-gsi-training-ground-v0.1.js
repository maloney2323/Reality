import crypto from 'node:crypto';

export const GSI_TRAINING_GROUND_VERSION = 'reality-gsi-training-ground-v1.0';
export const LEARNING_STATES = Object.freeze(['BASELINE_FROZEN','EPISODE_CAPTURED','LEARNING_PROPOSED','SANDBOX_RUNNING','EVALUATING','VERIFIED','REJECTED','PROMOTION_PENDING','PROMOTED']);
export const TRAINING_GROUND_INVARIANTS = Object.freeze({
  governance_kernel_immutable:true, authority_not_derived_from_capability:true,
  model_output_not_truth:true, model_output_not_authority:true, training_example_not_ground_truth:true,
  sandbox_cannot_write_production_graph:true, hidden_evaluation_is_not_exposed_to_learner:true,
  promotion_requires_independent_verification:true, promotion_requires_regression_pass:true,
  promotion_requires_measured_generalization:true, failed_candidate_cannot_promote:true,
  learner_provider_is_replaceable:true, benchmark_contract_is_immutable:true,
  evaluation_identity_is_sealed:true, contamination_is_rejected:true,
  baseline_is_reproducible:true, learning_lineage_is_complete:true
});
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function digest(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function req(v,c){if(typeof v!=='string'||!v.trim())throw new Error(c);}
function arr(v,c){if(!Array.isArray(v)||!v.length)throw new Error(c);}

export function createLearnerAdapter({learnerId,provider='replaceable',version='unknown',capabilities=[],observe,reason,propose,explain,learn}={}){
  req(learnerId,'LEARNER_ID_REQUIRED');req(provider,'LEARNER_PROVIDER_REQUIRED');
  for(const [n,fn] of Object.entries({observe,reason,propose,explain}))if(typeof fn!=='function')throw new Error(`LEARNER_${n.toUpperCase()}_REQUIRED`);
  return Object.freeze({adapter_version:'reality-learner-adapter-v1.0',learner_id:learnerId,provider,version,capabilities:clone(capabilities),observe,reason,propose,explain,learn:typeof learn==='function'?learn:null});
}
export function createBenchmarkContract({benchmarkVersion,visibleCaseIds,hiddenCaseIds,metrics=[],rules=[],seed}={}){
  req(benchmarkVersion,'BENCHMARK_VERSION_REQUIRED');arr(visibleCaseIds,'VISIBLE_CASE_IDS_REQUIRED');arr(hiddenCaseIds,'HIDDEN_CASE_IDS_REQUIRED');req(seed,'BENCHMARK_SEED_REQUIRED');
  const c={benchmark_version:benchmarkVersion,visible_case_ids:[...visibleCaseIds],hidden_case_ids:[...hiddenCaseIds],metrics:clone(metrics),rules:clone(rules),seed};
  return Object.freeze({...c,contract_hash:digest(c)});
}
export function freezeBaseline({learner,benchmarkVersion,cases,hiddenCaseIds=[],governanceKernelHash,baselineResults,evaluationContract={},seed}={}){
  if(!learner?.learner_id)throw new Error('LEARNER_REQUIRED');req(benchmarkVersion,'BENCHMARK_VERSION_REQUIRED');arr(cases,'VISIBLE_BASELINE_CASES_REQUIRED');req(governanceKernelHash,'GOVERNANCE_KERNEL_HASH_REQUIRED');if(!baselineResults)throw new Error('BASELINE_RESULTS_REQUIRED');req(seed,'BASELINE_SEED_REQUIRED');
  const ids=cases.map(x=>x.id).filter(Boolean);const visible=new Set(ids);if(hiddenCaseIds.some(id=>visible.has(id)))throw new Error('HIDDEN_CASE_ID_COLLISION');
  const contract=createBenchmarkContract({benchmarkVersion,visibleCaseIds:[...visible],hiddenCaseIds,metrics:evaluationContract.metrics||[],rules:evaluationContract.rules||[],seed});
  const b={training_ground_version:GSI_TRAINING_GROUND_VERSION,learner_id:learner.learner_id,learner_provider:learner.provider,learner_version:learner.version,benchmark_version:benchmarkVersion,visible_case_ids:[...visible],hidden_case_ids:[...hiddenCaseIds],governance_kernel_hash:governanceKernelHash,benchmark_contract_hash:contract.contract_hash,seed,results:clone(baselineResults)};
  return Object.freeze({...b,baseline_id:`baseline:${digest(b)}`,baseline_hash:digest(b),state:'BASELINE_FROZEN'});
}
export function createTrainingEpisode({episodeId,task,evidence=[],worldState={},expectedOutcomeContract={},verificationContract={},authority={status:'NOT_AUTHORIZED'},episodeType='GOVERNED_OPERATION',contaminationRefs=[]}={}){
  req(episodeId,'EPISODE_ID_REQUIRED');req(task,'EPISODE_TASK_REQUIRED');arr(evidence,'EPISODE_EVIDENCE_REQUIRED');
  const e={episode_version:'reality-governed-training-episode-v1.0',episode_id:episodeId,task,evidence:clone(evidence),world_state:clone(worldState),expected_outcome_contract:clone(expectedOutcomeContract),verification_contract:clone(verificationContract),authority:clone(authority),learner_authority:'NONE',episode_type:episodeType,contamination_refs:[...contaminationRefs],created_at:new Date().toISOString()};
  return Object.freeze({...e,episode_hash:digest(e),state:'EPISODE_CAPTURED'});
}
export function createLearningSignal({signalId,episodeId,sourceObservations=[],verifiedOutcome,corrections=[],failureSignals=[],capabilityDelta={},independentVerifierRef}={}){
  req(signalId,'LEARNING_SIGNAL_ID_REQUIRED');req(episodeId,'LEARNING_SIGNAL_EPISODE_REQUIRED');if(verifiedOutcome?.status!=='VERIFIED')throw new Error('LEARNING_SIGNAL_REQUIRES_VERIFIED_OUTCOME');arr(sourceObservations,'LEARNING_SIGNAL_OBSERVATIONS_REQUIRED');req(independentVerifierRef,'LEARNING_SIGNAL_VERIFIER_REQUIRED');
  const s={signal_version:'reality-governed-learning-signal-v1.0',signal_id:signalId,episode_id:episodeId,source_observations:clone(sourceObservations),verified_outcome:clone(verifiedOutcome),corrections:clone(corrections),failure_signals:clone(failureSignals),capability_delta:clone(capabilityDelta),independent_verifier_ref:independentVerifierRef,truth_status:'EVIDENCE_GROUNDED'};
  return Object.freeze({...s,signal_hash:digest(s)});
}
export function runSandboxLearning({baseline,episode,learner,learningSignal,candidate,governanceKernelHash,trainingCorpusRefs=[]}={}){
  if(baseline?.state!=='BASELINE_FROZEN')throw new Error('BASELINE_NOT_FROZEN');if(episode?.state!=='EPISODE_CAPTURED')throw new Error('EPISODE_NOT_CAPTURED');if(!learner?.learner_id)throw new Error('LEARNER_REQUIRED');if(learningSignal?.episode_id!==episode.episode_id)throw new Error('LEARNING_SIGNAL_EPISODE_MISMATCH');if(!learningSignal?.signal_hash)throw new Error('LEARNING_SIGNAL_REQUIRED');if(governanceKernelHash!==baseline.governance_kernel_hash)throw new Error('GOVERNANCE_KERNEL_HASH_MISMATCH');if(candidate?.modifies_governance===true||candidate?.modifies_authority===true)throw new Error('LEARNER_GOVERNANCE_OR_AUTHORITY_MODIFICATION_FORBIDDEN');
  const episodeEvidenceIds=(episode.evidence||[]).flatMap((x)=>[x?.id,x?.evidence_id,x?.observation_id,x?.ref].filter(Boolean).map(String));
  const signalObservationIds=(learningSignal.source_observations||[]).map((x)=>typeof x==='string'?x:(x?.id||x?.observation_id||x?.ref)).filter(Boolean).map(String);
  const ids=[...trainingCorpusRefs,...(episode.contamination_refs||[])];
  if(new Set(ids).size!==ids.length)throw new Error('TRAINING_CORPUS_CONTAMINATION');
  const trainingSet=new Set(trainingCorpusRefs.map(String));
  if(episodeEvidenceIds.some((id)=>trainingSet.has(id))||signalObservationIds.some((id)=>trainingSet.has(id)))throw new Error('TRAINING_CORPUS_CONTAMINATION');
  const c={candidate_id:candidate?.candidate_id||`candidate:${digest({baseline:baseline.baseline_id,signal:learningSignal.signal_hash})}`,parent_baseline_id:baseline.baseline_id,parent_learner_version:learner.version,learning_signal_hash:learningSignal.signal_hash,strategy:candidate?.strategy||'APPLY_VERIFIED_LEARNING_SIGNAL',training_corpus_refs:[...trainingCorpusRefs],production_graph_write_permitted:false,governance_kernel_hash:governanceKernelHash,authority_scope:'NONE',sandbox_worldline:candidate?.sandbox_worldline||`sandbox:${digest(learningSignal.signal_hash)}`};
  return Object.freeze({state:'SANDBOX_RUNNING',candidate:c,sandbox_constraints:{production_graph_write_permitted:false,governance_kernel_mutable:false,authority_grant_permitted:false,hidden_evaluation_access:false},candidate_hash:digest(c)});
}
function delta(a,b,k){return Number(a?.[k]??0)-Number(b?.[k]??0);}
export function independentlyEvaluateCandidate({baseline,candidate,candidateResults,hiddenResults,independentVerifier,regressionResults,governanceKernelHash,benchmarkContractHash,heldoutCaseIds=[],trainingCaseIds=[]}={}){
  if(baseline?.state!=='BASELINE_FROZEN')throw new Error('BASELINE_NOT_FROZEN');if(!candidate?.candidate_id)throw new Error('CANDIDATE_REQUIRED');if(!candidateResults||!hiddenResults)throw new Error('EVALUATION_RESULTS_REQUIRED');if(typeof independentVerifier!=='function')throw new Error('INDEPENDENT_VERIFIER_REQUIRED');if(governanceKernelHash!==baseline.governance_kernel_hash)throw new Error('GOVERNANCE_KERNEL_CHANGED');if(benchmarkContractHash!==baseline.benchmark_contract_hash)throw new Error('BENCHMARK_CONTRACT_CHANGED');if(!heldoutCaseIds.length)throw new Error('HELDOUT_CASES_REQUIRED');if(heldoutCaseIds.some(id=>trainingCaseIds.includes(id)))throw new Error('EVALUATION_CONTAMINATION');
  const verification=independentVerifier({baseline:clone(baseline),candidate:clone(candidate),candidate_results:clone(candidateResults),hidden_results:clone(hiddenResults),regression_results:clone(regressionResults),heldout_case_ids:[...heldoutCaseIds]});
  const generalizationDelta=delta(hiddenResults,baseline.results.hidden,'quality');const capabilityDelta=delta(candidateResults,baseline.results.visible,'quality');
  const regressionPassed=regressionResults?.passed===true;const independentPassed=verification?.passed===true;const generalizationPassed=generalizationDelta>0;const governancePreserved=verification?.governance_preserved===true;
  const verdict=independentPassed&&regressionPassed&&generalizationPassed&&governancePreserved?'VERIFIED':'REJECTED';
  return Object.freeze({state:'EVALUATING',verdict,metrics:{capability_delta:capabilityDelta,hidden_generalization_delta:generalizationDelta,regression_passed:regressionPassed,independently_verified:independentPassed,governance_preserved:governancePreserved},verification:clone(verification),evidence:{baseline_id:baseline.baseline_id,candidate_id:candidate.candidate_id,candidate_hash:candidate.candidate_hash,governance_kernel_hash:baseline.governance_kernel_hash,benchmark_contract_hash:baseline.benchmark_contract_hash,heldout_case_ids:[...heldoutCaseIds]}});
}
export function createTrainingManifest({baseline,benchmarkContract,episodes=[],learningSignals=[],candidateRefs=[],hiddenEvaluationRef,governanceKernelHash}={}){
  if(baseline?.state!=='BASELINE_FROZEN')throw new Error('BASELINE_NOT_FROZEN');if(benchmarkContract?.contract_hash!==baseline.benchmark_contract_hash)throw new Error('BENCHMARK_CONTRACT_MISMATCH');req(hiddenEvaluationRef,'HIDDEN_EVALUATION_REF_REQUIRED');if(governanceKernelHash!==baseline.governance_kernel_hash)throw new Error('GOVERNANCE_KERNEL_CHANGED');
  const manifest={manifest_version:'reality-gsi-training-manifest-v1.0',baseline_id:baseline.baseline_id,benchmark_contract_hash:benchmarkContract.contract_hash,episode_ids:episodes.map(e=>e.episode_id),learning_signal_ids:learningSignals.map(s=>s.signal_id),candidate_refs:[...candidateRefs],hidden_evaluation_ref:hiddenEvaluationRef,governance_kernel_hash:governanceKernelHash};
  return Object.freeze({...manifest,manifest_hash:digest(manifest)});
}
export function promoteLearningCandidate({evaluation,promotionAuthority,promotionRef}={}){
  if(evaluation?.verdict!=='VERIFIED')throw new Error('CANDIDATE_NOT_VERIFIED');if(promotionAuthority?.approved!==true)throw new Error('PROMOTION_AUTHORIZATION_REQUIRED');req(promotionRef,'PROMOTION_REF_REQUIRED');
  return Object.freeze({state:'PROMOTED',promotion_ref:promotionRef,approved_by:promotionAuthority.authorized_by||'explicit_promotion_authority',candidate_id:evaluation.evidence.candidate_id,baseline_id:evaluation.evidence.baseline_id,learning_commit:{verified_outcome:true,hidden_generalization_verified:evaluation.metrics.hidden_generalization_delta>0,regression_verified:evaluation.metrics.regression_passed,governance_preserved:evaluation.metrics.governance_preserved},promotion_hash:digest({candidate_id:evaluation.evidence.candidate_id,promotionRef,governance_kernel_hash:evaluation.evidence.governance_kernel_hash})});
}
