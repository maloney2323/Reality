// Exact owner-initiated isolated self-repair demonstration.
// Uses Reality's ORIGINAL governed executor twice: patch then same-original
// job resume. Model output is data (bounded arithmetic policy), never code.
// Temporary source is local /tmp only; no GitHub/Stripe/production changes.
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {outputText} from '../../src/reality-riley-native-model-draft-v1.js';
import {continueGovernedOperationalSelfRepair}
 from '../../src/reality-governed-operational-self-repair-v1.js';
export const maxDuration=60;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
const digest=v=>'sha256:'+createHash('sha256').update(v).digest('hex');
const originalConfig=Object.freeze({operation:'add',operand:1});
const cases=Object.freeze([[5,10],[7,14],[13,26]]);
const parseConfig=x=>{
 if(!x||Array.isArray(x)||typeof x!=='object'||
  Object.keys(x).sort().join(',')!=='operand,operation'||
  !['add','multiply'].includes(x.operation)||
  !Number.isSafeInteger(x.operand)||x.operand<0||x.operand>20)
  throw Error('ISOLATED_DEMO_MODEL_CANDIDATE_NOT_SCHEMA_BOUND');
 return Object.freeze({operation:x.operation,operand:x.operand});
};
const calculate=(x,c)=>c.operation==='add'?x+c.operand:x*c.operand;
const passes=c=>cases.every(([input,expected])=>calculate(input,c)===expected);
const readConfig=async target=>parseConfig(JSON.parse(await readFile(target,'utf8')));
function matchWarrant(w,owner){
 if(w?.status!=='OWNER_EXACT_ISOLATED_REPAIR_WARRANT_ACTIVE'||
   w.owner_id!==owner||!UUID.test(w.warrant_id||'')||
   !/^work:[a-f0-9]{32}$/.test(w.original_work_id||'')||
   w.scope!=='ISOLATED_NONCONSEQUENTIAL_INTERNAL_REPAIR'||
   w.owner_approved!==true||w.revoked!==false||
   w.demo_only!==true||w.installation_authorized!==false||
   w.production_changed!==false||
   JSON.stringify(w.allowed_steps)!==JSON.stringify(['repair','resume']))
  throw Error('ISOLATED_DEMO_OWNER_WARRANT_READBACK_UNVERIFIED');
 return w;
}
async function askRealityToRepair({env,work,source,failedObservation,fetchImpl}){
 const apiKey=String(env.REALITY_STANDALONE_OPENAI_API_KEY||
  env.OPENAI_API_KEY||'');
 const model=String(env.REALITY_OPENAI_MODEL||'gpt-4.1-mini');
 if(apiKey.length<20||!/^[A-Za-z0-9][A-Za-z0-9._-]{2,70}$/.test(model))
  throw Error('ISOLATED_DEMO_MODEL_PROVIDER_UNAVAILABLE');
 const schema={
  type:'object',additionalProperties:false,
  properties:{
   operation:{type:'string',enum:['add','multiply']},
   operand:{type:'integer',minimum:0,maximum:20}
  },required:['operation','operand']
 };
 const prompt={
  original_work_id:work,
  current_isolated_config:source,
  observation:failedObservation,
  expected_examples:cases.map(([input,expected])=>({input,expected})),
  task:'Propose the smallest JSON config change that fixes ALL examples. This is a disposable arithmetic fixture. Return JSON data only, no code or side effects.'
 };
 const res=await fetchImpl('https://api.openai.com/v1/responses',{
  method:'POST',cache:'no-store',redirect:'error',
  headers:{authorization:'Bearer '+apiKey,'content-type':'application/json'},
  body:JSON.stringify({
   model,store:false,tool_choice:'none',max_output_tokens:250,
   text:{format:{type:'json_schema',name:'isolated_demo_repair_candidate',
    strict:true,schema}},
   input:[
    {role:'system',content:[{type:'input_text',
     text:'You are Reality engineering. Produce a candidate data patch only. The trusted isolated verifier independently validates it. Never request tools, installs or authority.'}]},
    {role:'user',content:[{type:'input_text',text:JSON.stringify(prompt)}]}
   ]
  }),
  signal:AbortSignal.timeout(17000)
 });
 if(!res.ok)throw Error('ISOLATED_DEMO_MODEL_PROVIDER_REJECTED');
 const v=await res.json().catch(()=>null);
 if(v?.status!=='completed'||
   !/^resp_[A-Za-z0-9_-]{4,160}$/.test(v.id||''))
  throw Error('ISOLATED_DEMO_MODEL_RESPONSE_UNVERIFIED');
 let proposed;
 try{proposed=parseConfig(JSON.parse(outputText(v)));}
 catch{throw Error('ISOLATED_DEMO_MODEL_CANDIDATE_UNVERIFIED');}
 return Object.freeze({proposed,model_response_id:v.id});
}
/** Testable server-only execution function: no browser data or callbacks. */
export async function runIsolatedOwnerRepairDemo({
 ownerId,grant,db,env=process.env,
 fetchImpl=fetch,call=shiftRpc,model=askRealityToRepair
}={}){
 const owner=ownerId,work=grant?.original_work_id;
 if(!UUID.test(owner||'')||db?.strictSecrets!==true||
   env.VERCEL_ENV!=='preview'||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   !work||typeof call!=='function'||typeof model!=='function')
  throw Error('ISOLATED_DEMO_TRUSTED_SERVER_PREVIEW_REQUIRED');
 matchWarrant(grant,owner);
 const dir=await mkdtemp(path.join(tmpdir(),'reality-owner-repair-demo-'));
 const target=path.join(dir,'isolated-original-work-config.json');
 let failureEvidenceCache=null;
 let candidate=null,failureReceiptId=null,
  candidateReceiptId=null,resumedReceiptId=null,
  modelResponseId=null;
 try{
  await writeFile(target,JSON.stringify(originalConfig));
  const result=await continueGovernedOperationalSelfRepair({
   original:{
    status:'ORIGINAL_OWNER_WORK_AUTHORIZED',
    owner_id:owner,original_work_id:work,
    execution_authorized:true,nonconsequential:true,
    settled:false,production_changed:false
   },
   warrant:grant,
   observeFrozenFailure:async()=>{
    const c=await readConfig(target);
    if(passes(c))throw Error('ISOLATED_DEMO_FAULT_NOT_REPRODUCED');
    const observation={source_sha256:digest(JSON.stringify(c)),
     examples:cases.map(([input,expected])=>({
      input,expected,observed:calculate(input,c)
     }))};
    failureReceiptId=randomUUID();
    failureEvidenceCache=digest(JSON.stringify(observation));
    return Object.freeze({
     status:'CURRENT_ORIGINAL_FAILURE_REPRODUCED',
     owner_id:owner,original_work_id:work,
     independent:true,verified:false,
     frozen_test_failed:true,
     evidence_sha256:failureEvidenceCache,
     receipt_id:failureReceiptId,
     external_action_performed:false,
     provider_effect_may_have_occurred:false
    });
   },
   independentlyTestCandidate:async proof=>{
    const before=await readConfig(target);
    const x=await model({
     env,work,source:before,fetchImpl,
     failedObservation:{
      evidence_sha256:proof.failure_evidence_sha256,
      receipt_id:proof.failure_receipt_id
     }
    });
    candidate=parseConfig(x.proposed);
    modelResponseId=x.model_response_id;
    if(!/^resp_[A-Za-z0-9_-]{4,160}$/.test(modelResponseId||'')||
      !passes(candidate)||
      digest(JSON.stringify(before))===digest(JSON.stringify(candidate)))
     throw Error('ISOLATED_DEMO_INDEPENDENT_CANDIDATE_GREEN_REQUIRED');
    candidateReceiptId=randomUUID();
    return Object.freeze({
     status:'INDEPENDENT_CANDIDATE_RED_TO_GREEN_VERIFIED',
     owner_id:owner,original_work_id:work,
     failure_receipt_id:proof.failure_receipt_id,
     candidate_sha256:digest(JSON.stringify(candidate)),
     candidate_test_sha256:digest(JSON.stringify(cases)),
     independent:true,
     receipt_id:candidateReceiptId,
     external_action_performed:false,production_changed:false
    });
   },
   loadRepairAdapter:async input=>{
    if(!candidate||digest(JSON.stringify(candidate))!==input.candidate.candidate_sha256)
     throw Error('ISOLATED_DEMO_TRUSTED_ARTIFACT_CHANGED');
    return {
     candidate_sha256:input.candidate.candidate_sha256,
     original_work_id:work,
     workItem:{
      work_item_id:work,workflow_id:'workflow:'+work,
      connector:null,operation:'isolated_repair',consequential:false
     },
     authorization:{authorization_id:grant.warrant_id,authorized:true},
     connector:{execute:async()=>{
      await writeFile(target,JSON.stringify(candidate));
      return {providerExecutionId:'isolated-internal-policy-change',
       observation:{candidate_sha256:input.candidate.candidate_sha256}};
     }},
     independentVerifier:{verify:async()=>{
      const observed=await readConfig(target);
      return {
       verified:passes(observed)&&
        digest(JSON.stringify(observed))===input.candidate.candidate_sha256,
       independent:true,basis:'independent isolated file readback',
       observedState:{digest:digest(JSON.stringify(observed)),
        examples:cases.map(([x])=>calculate(x,observed))}
      };
     }}
    };
   },
   loadOriginalResumeAdapter:async()=>{
    return {
     original_work_id:work,
     workItem:{
      work_item_id:work,workflow_id:'workflow:'+work,
      connector:null,operation:'read',consequential:false
     },
     authorization:{authorization_id:grant.warrant_id,authorized:true},
     connector:{execute:async()=>{
      const observed=await readConfig(target);
      return {providerExecutionId:'isolated-original-work-resume',
       observation:{examples:cases.map(([x])=>calculate(x,observed))}};
     }},
     independentVerifier:{verify:async()=>{
      const observed=await readConfig(target);
      return {
       verified:passes(observed),independent:true,
       basis:'same original independent source reread',
       observedState:{source_sha256:digest(JSON.stringify(observed)),
        outputs:cases.map(([x])=>calculate(x,observed))}
      };
     }}
    };
   },
   independentlyResumeOriginal:async input=>{
    if(input.original_execution?.status!=='VERIFIED'||
     input.original_execution.verification?.independent!==true)
     throw Error('ISOLATED_DEMO_ORIGINAL_EXECUTION_NOT_VERIFIED');
    resumedReceiptId=randomUUID();
    return {
     status:'SAME_ORIGINAL_JOB_INDEPENDENTLY_RESUMED',
     owner_id:owner,original_work_id:work,
     candidate_sha256:input.candidate_sha256,
     original_execution_authorized:true,
     independent:true,verified:true,
     external_action_performed:false,
     receipt_id:resumedReceiptId,
     evidence_sha256:digest(JSON.stringify(input.original_execution.verification))
    };
   },
   settleOriginal:async data=>{
    if(data.warrant_id!==grant.warrant_id||
     data.failure_receipt_id!==failureReceiptId||
     data.candidate_receipt_id!==candidateReceiptId||
     data.resumed_receipt_id!==resumedReceiptId||
     !SHA.test(data.candidate_sha256||'')||
     !/^resp_[A-Za-z0-9_-]{4,160}$/.test(modelResponseId||''))
     throw Error('ISOLATED_DEMO_ORIGINAL_FINAL_PROOF_MISMATCH');
    const finalHash=digest(JSON.stringify({
     owner,work,warrant_id:grant.warrant_id,
     failure_receipt_id:failureReceiptId,
     candidate_receipt_id:candidateReceiptId,
     resumed_receipt_id:resumedReceiptId,
     candidate_sha256:data.candidate_sha256,
     model_response_id:modelResponseId
    }));
    const durable=await call(db,'reality_settle_one_isolated_self_repair_demo_v1',{
     p_owner_id:owner,p_warrant_id:grant.warrant_id,
     p_original_work_id:work,
     p_failure_hash:failureEvidenceCache,
     p_candidate_hash:data.candidate_sha256,
     p_resumed_hash:digest(JSON.stringify(data.original_resumption||resumedReceiptId)),
     p_final_receipt_sha256:finalHash,
     p_model_response_id:modelResponseId
    },{fetchImpl});
    if(durable?.status!=='EXACT_ORIGINAL_ISOLATED_SELF_REPAIR_VERIFIED'||
       durable.owner_id!==owner||durable.original_work_id!==work||
       durable.warrant_id!==grant.warrant_id||
       durable.final_receipt_sha256!==finalHash||
       durable.independently_verified!==true||
       durable.production_changed!==false||
       durable.external_action_performed!==false||
       durable.demo_only!==true)
     throw Error('ISOLATED_DEMO_DURABLE_READBACK_UNVERIFIED');
    return {...durable,failure_receipt_id:failureReceiptId,
     resumed_receipt_id:resumedReceiptId};
   }
  });
  return Object.freeze({...result,
   demo_only:true,customer_job_completed:false,
   model_response_id:modelResponseId});
 }finally{
  await rm(dir,{recursive:true,force:true});
 }
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))
  return res.status(405).setHeader('Allow','GET, POST').json({
   ok:false,error:'ISOLATED_DEMO_METHOD_NOT_ALLOWED'});
 if(process.env.VERCEL_ENV!=='preview')
  return res.status(403).json({ok:false,error:'ISOLATED_DEMO_PREVIEW_ONLY'});
 let db=null,owner=null,grant=null;
 try{
  privateChatConfig();
  if(req.method==='POST'){
   if(!req.headers?.origin)throw Error('ISOLATED_DEMO_ORIGIN_REQUIRED');
   assertSameOrigin(req);
   if(!/^application\/json(?:;|$)/i.test(req.headers?.['content-type']||'')||
      !req.body||Array.isArray(req.body)||
      Object.keys(req.body).join(',')!=='action'||
      req.body.action!=='RUN_ONE_ISOLATED_SELF_REPAIR_DEMO')
    return res.status(400).json({ok:false,error:'ISOLATED_DEMO_EXPLICIT_OWNER_ACTION_REQUIRED'});
  }
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'ISOLATED_DEMO_SIGN_IN_REQUIRED'});
  owner=session.user_id;db=shiftDatabase(process.env);
  if(!db?.strictSecrets||
    db.url!==session.config?.url||
    db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   throw Error('ISOLATED_DEMO_OWNER_DATABASE_UNVERIFIED');
  if(req.method==='GET'){
   const read=await shiftRpc(db,'reality_read_owner_isolated_self_repair_demo_v1',{
    p_owner_id:owner
   });
   if(read?.owner_id!==owner||read.owner_scope_verified!==true||
      read.demo_only!==true||read.customer_job_completed!==false||
      read.installation_authorized!==false||
      read.production_changed!==false)
    throw Error('ISOLATED_DEMO_OWNER_READBACK_NOT_VERIFIED');
   return res.status(200).json({ok:true,...read});
  }
  grant=await shiftRpc(db,'reality_authorize_one_isolated_self_repair_demo_v1',{
   p_owner_id:owner
  });
  if(grant?.status==='ISOLATED_DEMO_DAILY_OWNER_LIMIT_REACHED')
   return res.status(429).json({ok:false,error:'ISOLATED_DEMO_DAILY_LIMIT_REACHED',
    next_action:'The two daily isolated demonstration attempts have been used. No additional authorization or repair was performed.',
    production_changed:false});
  matchWarrant(grant,owner);
  const result=await runIsolatedOwnerRepairDemo({ownerId:owner,grant,db});
  if(result.status!=='EXACT_ORIGINAL_ISOLATED_SELF_REPAIR_VERIFIED'||
    result.independent_final_receipt_verified!==true||
    result.production_changed!==false)
   throw Error('ISOLATED_DEMO_NO_VERIFIED_FINAL_RECEIPT');
  const read=await shiftRpc(db,'reality_read_owner_isolated_self_repair_demo_v1',{
   p_owner_id:owner
  });
  if(read?.phase!=='VERIFIED'||read.final_receipt_sha256!==result.final_receipt_sha256||
    read.owner_id!==owner)
   throw Error('ISOLATED_DEMO_POST_SETTLEMENT_READBACK_UNVERIFIED');
  return res.status(200).json({ok:true,...result,
   next_action:'Isolated demo passed. A live business repair still requires a real, independently reproduced failure and its existing owner-authorized original-job warrant.'});
 }catch(e){
  if(db&&grant?.warrant_id&&owner){
   try{await shiftRpc(db,'reality_fail_one_isolated_self_repair_demo_v1',{
    p_owner_id:owner,p_warrant_id:grant.warrant_id,
    p_error_code:'ISOLATED_DEMO_UNVERIFIED_EXECUTION'
   });}catch{}
  }
  return res.status(503).json({ok:false,
   error:'ISOLATED_DEMO_INDEPENDENT_PROOF_OR_PROVIDER_UNAVAILABLE',
   next_action:'Reality could not verify this isolated repair. The attempt is fenced. Check the owner-scoped receipt; no production repair was authorized.',
   production_changed:false,installation_authorized:false,
   customer_job_completed:false});
 }
}
