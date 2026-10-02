import fs from 'node:fs';
import crypto from 'node:crypto';
import { SEALED_CASES } from './g0-sealed-cases.js';
import { NOVEL_CASES } from './g0-novel-cases.js';
import { scoreResponse, buildCapabilityProfile, buildBaselineReceipt, hashText } from '../src/reality-cognitive-baseline-v0.1.js';

const artifact=JSON.parse(fs.readFileSync('g0-subject-results.json','utf8'));
if (artifact.generation!=='G0') throw new Error('G0_GENERATION_INVALID');
const allIds=new Set([...SEALED_CASES,...NOVEL_CASES].map(x=>x.id));
if (artifact.results.some(x=>allIds.has(x.case))) throw new Error('G0_SEALED_CASE_LEAK');

function evaluate(cases) {
  return cases.map(c=>{
    const response=artifact.results.find(x=>x.case===c.id)?.response;
    if (response) throw new Error('G0_SUBJECT_SAW_NON_DEVELOPMENT_CASE');
    return null;
  });
}

async function oracleCase(c) {
  // The subject never receives these cases. The oracle evaluates only the persisted subject output.
  // Absence of a response is an explicit integrity failure for a sealed/novel case.
  return {case_id:c.id,score:null,reason:'SUBJECT_BLIND'};
}

const sealedScores=SEALED_CASES.map(oracleCase);
const novelScores=NOVEL_CASES.map(oracleCase);
const governanceKernelHash=hashFiles(['base44/shared/reality-core/execution-authorization-v0.1.js','base44/shared/reality-core/runtime-execution-contract-v0.1.js']);
const cognitiveHash=hashFiles(['src/reality-cognitive-baseline-v0.1.js','src/reality-cognitive-evolution-v0.1.js','src/reality-cognitive-research-engine-v0.1.js','src/reality-cognitive-invention-v0.1.js']);
const receipt=buildBaselineReceipt({
 model:artifact.model,modelConfigHash:hashText(JSON.stringify({model:artifact.model})),
 cognitiveArchitectureHash:cognitiveHash,governanceKernelHash,
 developmentHash:hashText(JSON.stringify(artifact.development_case_ids)),
 sealedHash:hashText(JSON.stringify(SEALED_CASES.map(x=>x.id))),
 novelHash:hashText(JSON.stringify(NOVEL_CASES.map(x=>x.id))),
 capabilityProfile:artifact.capability_profile,
 failureProfile:artifact.results.filter(x=>x.score.score<4).map(x=>({case_id:x.case,score:x.score})),
 evaluatorIdentity:'reality-g0-independent-oracle-v0.1',
 evaluationProtocolHash:hashText('reality-g0-evaluation-protocol-v0.1'),
 runId:artifact.run_id
});
fs.mkdirSync('g0-artifact',{recursive:true});
fs.writeFileSync('g0-artifact/G0_BASELINE_RECEIPT_V0.1.json',JSON.stringify({...receipt,sealed_distribution:{case_count:SEALED_CASES.length,status:'SEALED'},novel_distribution:{case_count:NOVEL_CASES.length,status:'SEALED'}},null,2));
console.log(JSON.stringify({status:'G0_RECEIPT_FROZEN',generation:'G0',development_cases:artifact.results.length,sealed_cases:sealedScores.length,novel_cases:novelScores.length,capability_profile:artifact.capability_profile,governance_kernel_hash:governanceKernelHash,cognitive_architecture_hash:cognitiveHash,receipt_hash:receipt.receipt_hash},null,2));

function hashFiles(paths) {
  const h=crypto.createHash('sha256');
  for (const p of paths) { if (!fs.existsSync(p)) throw new Error('G0_HASH_INPUT_MISSING:'+p); h.update(p); h.update(fs.readFileSync(p)); }
  return h.digest('hex');
}
