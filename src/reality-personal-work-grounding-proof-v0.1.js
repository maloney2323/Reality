// Signed transport for a candidate goal/work correlation. NOT action approval.
// It only lets a later authenticated request compare the exact same work
// against a NEW verified private Continuity readback.
import { createHmac,timingSafeEqual } from 'node:crypto';
import { EXECUTION_GOAL_GROUNDING_VERSION }
 from './reality-execution-goal-grounding-v0.1.js';
export const PERSONAL_WORK_GROUNDING_PROOF_VERSION='reality-personal-work-grounding-proof-v0.1';
const secret=(env)=>{const s=env.REALITY_CHAT_RECEIPT_HMAC_KEY;
 if(typeof s!=='string'||s.length<32)throw Error('GOAL_BINDING_PROOF_SECRET_REQUIRED');
 return s;
};
function canonical(v){
 if(v===null||typeof v!=='object')return v;
 if(Array.isArray(v))return v.map(canonical);
 return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));
}
const sign=(unsigned,env)=>createHmac('sha256',secret(env))
 .update('reality:goal-work-freshness-not-approval:v1:'+JSON.stringify(canonical(unsigned)))
 .digest('hex');
export function issuePersonalWorkGroundingProof({
 binding,conversationId,principalId,env=process.env,now=Date.now()
}={}){
 if(binding?.version!==EXECUTION_GOAL_GROUNDING_VERSION||
  binding.status!=='BOUND_FOR_FRESHNESS_CHECK'||
  binding.principal_id!==principalId||
  typeof conversationId!=='string'||!conversationId||
  !Number.isSafeInteger(now))
  throw Error('GOAL_BINDING_NOT_VERIFIED_FOR_PROOF');
 const data={
  version:PERSONAL_WORK_GROUNDING_PROOF_VERSION,
  binding,principal_id:principalId,conversation_id:conversationId,
  issued_at:new Date(now).toISOString(),
  expires_at:new Date(now+5*60*1000).toISOString(),
  grants_external_execution:false,
  approves_proposed_work:false,
 };
 return Object.freeze({...data,signature:sign(data,env)});
}
export function verifyPersonalWorkGroundingProof({
 proof,conversationId,principalId,env=process.env,now=Date.now(),
}={}){
 const reject=reason=>Object.freeze({status:'BLOCKED',reason});
 if(!proof||proof.version!==PERSONAL_WORK_GROUNDING_PROOF_VERSION||
  typeof proof.signature!=='string'||!/^[a-f0-9]{64}$/.test(proof.signature))
  return reject('GOAL_BINDING_PROOF_MISSING');
 const {signature,...data}=proof;
 const expected=Buffer.from(sign(data,env),'hex'),actual=Buffer.from(signature,'hex');
 if(!timingSafeEqual(expected,actual))
  return reject('GOAL_BINDING_PROOF_INVALID');
 if(data.principal_id!==principalId||data.conversation_id!==conversationId)
  return reject('GOAL_BINDING_PROOF_SCOPE_MISMATCH');
 const issued=Date.parse(data.issued_at),expires=Date.parse(data.expires_at);
 if(!Number.isSafeInteger(now)||!Number.isFinite(issued)||
  !Number.isFinite(expires)||issued>now+30000||
  expires<=now||expires-issued>300000||expires<=issued)
  return reject('GOAL_BINDING_PROOF_EXPIRED');
 if(data.grants_external_execution!==false||
    data.approves_proposed_work!==false||
    data.binding?.principal_id!==principalId)
  return reject('GOAL_BINDING_PROOF_NOT_NON_EXECUTING');
 return Object.freeze({status:'PROOF_VALID_FOR_FRESHNESS_ONLY',binding:data.binding,
  action_authorized:false});
}
