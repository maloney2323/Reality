import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(v).digest('hex');
const baseline=JSON.parse(readFileSync('finale-evidence/baseline.json','utf8'));
const experiment=JSON.parse(readFileSync('finale-evidence/experiment.json','utf8'));
if(baseline.real_red_test_exit===0||baseline.actual_failure!=='ERR_MODULE_NOT_FOUND'||
 experiment.state!=='SANDBOX_PROPOSED'||experiment.experiment_hash!==baseline.experiment_hash||
 experiment.work_item_id!==baseline.original_work_id||existsSync(baseline.missing_target))
 throw Error('MISSING_CAPABILITY_BASELINE_UNVERIFIED');
mkdirSync('finale-candidate',{recursive:true});
const proof={version:'reality-finale-model-generation-v1',
 original_work_id:baseline.original_work_id,experiment_hash:experiment.experiment_hash,
 model_generated:false,candidate_sha256:null,model_response_id:null,
 owner_authorized_install:false,original_job_completed:false,status:'PENDING'};
const save=()=>writeFileSync('finale-candidate/generation.json',JSON.stringify(proof,null,2)+'\n');
try{
 const model=process.env.REALITY_OPENAI_MODEL||'gpt-5.6-luna';
 const prompt=[
 'Return only a pure JavaScript ES module exporting function evaluateEstimateRelease(input).',
 'Input fields: estimate_id, homeowner_approved, approval_evidence_id, owner_reviewed.',
 'Reject nonobject input or an invalid estimate_id; valid ID regex is /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/.',
 'Return exactly {estimate_id,status,reason,external_action_authorized:false}.',
 'Strictly compare approval booleans to true. Evidence must match /^approval:[a-z0-9-]{8,64}$/.',
 'If no approval return HOLD HOMEOWNER_APPROVAL_MISSING.',
 'Else if no evidence return HOLD APPROVAL_EVIDENCE_MISSING.',
 'Else if no owner review return HOLD OWNER_REVIEW_REQUIRED.',
 'Else return READY_FOR_AUTHORIZATION SEPARATE_SEND_AUTHORIZATION_REQUIRED.',
 'Never authorize or send. No imports or external effects. No commentary or markdown.',
 ].join('\n');
 const resp=await fetch('https://api.openai.com/v1/responses',{
  method:'POST',headers:{authorization:'Bearer '+process.env.OPENAI_API_KEY,
   'content-type':'application/json'},
  body:JSON.stringify({model,max_output_tokens:1800,input:prompt}),signal:AbortSignal.timeout(70000)
 });
 const j=await resp.json(); proof.http_status=resp.status;proof.model=model;
 proof.model_response_id=j.id||null;
 if(!resp.ok)throw Error('MODEL_RESPONSE_HTTP_'+resp.status);
 const source=(j.output||[]).flatMap(z=>z.content||[])
   .filter(z=>z.type==='output_text').map(z=>z.text||'').join('').trim()+'\n';
 if(source.length<150||source.length>7500||
 !source.includes('export function evaluateEstimateRelease('))
 throw Error('UNTRUSTED_SOURCE_OUT_OF_BOUNDS');
 writeFileSync('finale-candidate/candidate.mjs',source);
 proof.model_generated=true;proof.candidate_sha256=hash(source);
 proof.status='MODEL_CANDIDATE_GENERATED_UNTRUSTED';
 save(); console.log(JSON.stringify(proof));
}catch(e){proof.status='MODEL_GENERATION_BLOCKED';proof.blocker=String(e.message).slice(0,150);
 save();console.error(JSON.stringify(proof));process.exitCode=1}
