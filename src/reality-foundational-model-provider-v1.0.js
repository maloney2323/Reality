// Replaceable Reality model-generation adapter. Secrets never reach a candidate,
// sandbox, or artifact. Every response remains a proposal until independently
// verified by the constitutional build and sandbox layer.
import {validateFoundationalCandidate}
 from './reality-foundational-build-loop-v1.0.js';
const fail=x=>{throw Error(x)};
const outputText=b=>typeof b?.output_text==='string'&&b.output_text.trim()?b.output_text:
 (b?.output||[]).flatMap(x=>x?.content||[]).filter(x=>x?.type==='output_text')
 .map(x=>x.text||'').join('');
export function createFoundationalModelGenerator({
 model,apiKey,fetchImpl=fetch,endpoint='https://api.openai.com/v1/responses'
}={}){
 if(typeof model!=='string'||!/^[a-zA-Z0-9._-]{3,100}$/.test(model))
  fail('FOUNDATION_MODEL_ID_REQUIRED');
 if(typeof apiKey!=='string'||apiKey.length<10)
  fail('FOUNDATION_MODEL_KEY_REQUIRED');
 if(endpoint!=='https://api.openai.com/v1/responses')
  fail('FOUNDATION_UNTRUSTED_MODEL_ENDPOINT');
 return async({ticket,attempt,previous_candidate,verified_feedback,execution_authority})=>{
  if(execution_authority!==false||!Number.isInteger(attempt)||
   attempt<1||attempt>ticket.max_attempts)
   fail('FOUNDATION_MODEL_AUTHORITY_OR_ATTEMPT_INVALID');
  if(attempt>1&&(!previous_candidate||
   verified_feedback?.kind!=='INDEPENDENT_SANDBOX_FAILURE'||
   !verified_feedback.attestation_ref))
   fail('FOUNDATION_REPAIR_REQUIRES_INDEPENDENT_FAILURE');
  const task={task:'Propose source and tests for a verified missing capability. Return JSON only with exact ticket_hash and original_work_id. Do not claim installation or completed work.',
   scope:{ticket_hash:ticket.ticket_hash,original_work_id:ticket.original_work_id,
    goal_id:ticket.goal_id,
    gap_receipt_ref:ticket.confirmed_gap_receipt_ref,
    frozen_suite_ref:ticket.frozen_regression_manifest_ref,
    base_sha:ticket.repository_base_sha},
   allowed_roots:ticket.allowed_source_roots,
   attempt,previous_candidate:previous_candidate||null,
   independently_verified_failure:verified_feedback||null};
  const response=await fetchImpl(endpoint,{method:'POST',
   headers:{authorization:'Bearer '+apiKey,'content-type':'application/json'},
   body:JSON.stringify({model,max_output_tokens:11000,
    text:{format:{type:'json_object'}},
    input:[
     {role:'system',content:[{type:'input_text',text:'You are a Reality replaceable coding model. Generated source is a proposal and cannot authorize itself. Do not edit security, auth or governance core.'}]},
     {role:'user',content:[{type:'input_text',text:JSON.stringify(task)}]},
    ],
   }),
  });
  if(!response?.ok)fail('FOUNDATION_MODEL_PROVIDER_UNAVAILABLE');
  const body=await response.json();
  const raw=outputText(body);
  if(!raw||raw.length>290000)fail('FOUNDATION_MODEL_RESPONSE_EMPTY_OR_OVERSIZE');
  let candidate;try{candidate=JSON.parse(raw)}catch{fail('FOUNDATION_MODEL_RESPONSE_NOT_JSON')}
  return validateFoundationalCandidate(ticket,{...candidate,model_response_id:body.id||null});
 };
}