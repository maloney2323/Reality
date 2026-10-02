import fs from 'node:fs';
import crypto from 'node:crypto';
import { G0_VERSION, buildCasePrompt, scoreResponse, buildCapabilityProfile, hashText } from '../src/reality-cognitive-baseline-v0.1.js';
import { DEVELOPMENT_CASES } from './g0-development-cases.js';

const required = process.env.OPENAI_API_KEY;
if (!required) throw new Error('G0_BLOCKED_OPENAI_API_KEY_REQUIRED');

const model = process.env.G0_MODEL || 'gpt-5.6';
const runId = process.env.GITHUB_RUN_ID || crypto.randomUUID();

async function callModel(c) {
  const body = { model, input: buildCasePrompt(c) };
  const r = await fetch('https://api.openai.com/v1/responses', {
    method:'POST', headers:{'content-type':'application/json','authorization':`Bearer ${required}`}, body:JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`G0_MODEL_HTTP_${r.status}:${await r.text()}`);
  const data = await r.json();
  const text = data.output_text || data.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text;
  if (!text) throw new Error('G0_MODEL_EMPTY_OUTPUT');
  return JSON.parse(text);
}

const results=[];
for (const c of DEVELOPMENT_CASES) {
  const response=await callModel(c);
  results.push({case:c.id,response,score:scoreResponse(c,response)});
}

const scores=results.map(x=>x.score);
const capability=buildCapabilityProfile(scores);
const payload={g0_version:G0_VERSION,generation:'G0',run_id:runId,model,development_case_ids:DEVELOPMENT_CASES.map(x=>x.id),results,capability_profile:capability};
fs.mkdirSync('g0-artifact',{recursive:true});
fs.writeFileSync('g0-artifact/g0-subject-results.json',JSON.stringify(payload,null,2));
fs.writeFileSync('g0-artifact/g0-subject-results.sha256',hashText(JSON.stringify(payload)));
console.log(JSON.stringify({status:'SUBJECT_COMPLETE',generation:'G0',model,development_cases:DEVELOPMENT_CASES.length,capability_profile:capability},null,2));
