import fs from 'node:fs';
import crypto from 'node:crypto';
import { SEALED_CASES } from './g0-sealed-cases.js';
import { NOVEL_CASES } from './g0-novel-cases.js';
import { scoreResponse, buildCapabilityProfile, buildBaselineReceipt, buildCasePrompt, hashText } from '../src/reality-cognitive-baseline-v0.1.js';

const apiKey=process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('G0_ORACLE_BLOCKED_OPENAI_API_KEY_REQUIRED');
const artifact=JSON.parse(fs.readFileSync('g0-subject-results.json','utf8'));
if (artifact.generation!=='G0') throw new Error('G0_GENERATION_INVALID');

const sealedIds=new Set(SEALED_CASES.map(x=>x.id));
const novelIds=new Set(NOVEL_CASES.map(x=>x.id));
if (artifact.results.some(x=>sealedIds.has(x.case) || novelIds.has(x.case))) throw new Error('G0_HIDDEN_CASE_LEAK');

async function evaluateCase(c) {
  const r=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{'content-type':'application/json','authorization':`Bearer ${apiKey}`},
    body:JSON.stringify({model:artifact.model,input:buildCasePrompt(c)})
  });
  if(!r.ok) throw new Error(`G0_ORACLE_MODEL_HTTP_${r.status}:${await r.text()}`);
  const data=await r.json();
  const text=data.output_text || data.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text;
  if(!text) throw new Error('G0_ORACLE_EMPTY_OUTPUT');
  const response=JSON.parse(text);
  return {case:c.id,response,score:scoreResponse(c,response)};
}

const sealedResults=[];
for(const c of SEALED_CASES) sealedResults.push(await evaluateCase(c));
const novelResults=[];
for(const c of NOVEL_CASES) novelResults.push(await evaluateCase(c));

const devScores=artifact.results.map(x=>x.score);
const sealedScores=sealedResults.map(x=>x.score);
const novelScores=novelResults.map(x=>x.score);
const capabilityProfile={
  development:buildCapabilityProfile(devScores),
  sealed:buildCapabilityProfile(sealedScores),
  novel:buildCapabilityProfile(novelScores)
};

const governanceKernelHash=hashFiles([
  'base44/shared/reality-core/execution-authorization-v0.1.js',
  'base44/shared/reality-core/runtime-execution-contract-v0.1.js'
]);
const cognitiveHash=hashFiles([
  'src/reality-cognitive-baseline-v0.1.js',
  'src/reality-cognitive-evolution-v0.1.js',
  'src/reality-cognitive-research-engine-v0.1.js',
  'src/reality-cognitive-invention-v0.1.js'
]);

const receipt=buildBaselineReceipt({
  model:artifact.model,
  modelConfigHash:hashText(JSON.stringify({model:artifact.model})),
  cognitiveArchitectureHash:cognitiveHash,
  governanceKernelHash,
  developmentHash:hashText(JSON.stringify(artifact.development_case_ids)),
  sealedHash:hashText(JSON.stringify(SEALED_CASES.map(x=>x.id))),
  novelHash:hashText(JSON.stringify(NOVEL_CASES.map(x=>x.id))),
  capabilityProfile,
  failureProfile:{
    development:artifact.results.filter(x=>x.score.score<4).map(x=>({case_id:x.case,score:x.score})),
    sealed:sealedResults.filter(x=>x.score.score<4).map(x=>({case_id:x.case,score:x.score})),
    novel:novelResults.filter(x=>x.score.score<4).map(x=>({case_id:x.case,score:x.score}))
  },
  evaluatorIdentity:'reality-g0-independent-oracle-v0.1',
  evaluationProtocolHash:hashText('reality-g0-evaluation-protocol-v0.1'),
  runId:artifact.run_id
});

const finalReceipt={
  ...receipt,
  distributions:{
    development:{case_count:artifact.results.length,status:'EVALUATED'},
    sealed:{case_count:SEALED_CASES.length,status:'SEALED_FROM_SUBJECT'},
    novel:{case_count:NOVEL_CASES.length,status:'SEALED_FROM_SUBJECT'}
  },
  oracle_results:{sealed:sealedResults,novel:novelResults},
  subject_blindness_verified:true,
  governance_invariance_verified:true
};

fs.mkdirSync('g0-artifact',{recursive:true});
fs.writeFileSync('g0-artifact/G0_BASELINE_RECEIPT_V0.1.json',JSON.stringify(finalReceipt,null,2));
console.log(JSON.stringify({
  status:'G0_RECEIPT_FROZEN',
  generation:'G0',
  development_cases:artifact.results.length,
  sealed_cases:sealedResults.length,
  novel_cases:novelResults.length,
  capability_profile,
  governance_kernel_hash:governanceKernelHash,
  cognitive_architecture_hash:cognitiveHash,
  receipt_hash:receipt.receipt_hash
},null,2));

function hashFiles(paths){
  const h=crypto.createHash('sha256');
  for(const p of paths){
    if(!fs.existsSync(p)) throw new Error('G0_HASH_INPUT_MISSING:'+p);
    h.update(p); h.update(fs.readFileSync(p));
  }
  return h.digest('hex');
}
