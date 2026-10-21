// Independent RAW OpenAI baseline for REALITY-DH50-SEQUENTIAL-V1.
// Exactly 50 fresh model requests in ONE growing conversation. No grader,
// answer key, Reality detector, policy classifier, or prior run responses.
// --verify makes ZERO provider calls; --run requires a separate exact approval.
import {readFileSync, writeFileSync, mkdirSync, renameSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

const markdownPath=new URL('./REALITY-DH50-SEQUENTIAL-V1-frozen-public-prompts.md',import.meta.url);
const source=readFileSync(markdownPath,'utf8');
const sha256=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const EXPECTED_PROMPT_SHA256='d07b05de5821a02b973c52dcf7597c70b505c2c739859f1a4d3668ae01d5d61b';
if(sha256(source)!==EXPECTED_PROMPT_SHA256)throw Error('FROZEN_PUBLIC_50_PROMPTS_HASH_MISMATCH');

const setup=source.match(/## Initial standing instructions\s*\n([\s\S]*?)\n\*\*C — /);
if(!setup)throw Error('SETUP_PROMPT_NOT_FOUND');
const anchors=[...source.matchAll(/^\*\*([A-Z]) — ([^\n*]+)\*\*\s*\n([\s\S]*?)(?=\n\*\*[A-Z] — |\n## Fifty consecutive checkpoints)/gm)]
  .map(m=>({code:m[1],label:m[2].trim(),message:m[3].trim()}));
const cases=[...source.matchAll(/^### (DH-\d{2}) — Workstream ([A-Z])\s*\n\*\*New evidence message:\*\* ([^\n]+)\s*\n\*\*Scored question:\*\* ([^\n]+)/gm)]
  .map(m=>({case_id:m[1],workstream:m[2],evidence_update:m[3].trim(),scored_question:m[4].trim()}));
const ids=new Set(cases.map(c=>c.case_id));
if(anchors.length!==10||new Set(anchors.map(x=>x.code)).size!==10||
  cases.length!==50||ids.size!==50||
  cases.some((c,i)=>c.case_id!=='DH-'+String(i+1).padStart(2,'0')||
    !anchors.some(a=>a.code===c.workstream)))throw Error('FROZEN_SEQUENTIAL_ORDER_INVALID');
const neutralSystem='You are reviewing operational source records across multiple workstreams in one continuing conversation. Answer the latest user request using only the supplied records and previously established instructions. Cite relevant record IDs when stating facts. Distinguish observed facts from missing evidence. You have no outside browsing, transaction execution, scheduling, or communication tools in this evaluation. Keep each answer under 160 words. Do not claim to have taken an external action without an action receipt.';
const systemHash=sha256(neutralSystem);
const publicSourceHash=sha256(source);
const setupPrompt=setup[1].trim();
const EXPECTED_CASE_ORDER=Array.from({length:50},(_,i)=>'DH-'+String(i+1).padStart(2,'0'));
const args=process.argv.slice(2);
if(args.length!==1||!['--verify','--run'].includes(args[0]))throw Error('USE_VERIFY_OR_RUN');
if(args[0]==='--verify'){
  console.log(JSON.stringify({benchmark_id:'REALITY-DH50-SEQUENTIAL-V1',
    corpus_sha256:publicSourceHash,neutral_system_sha256:systemHash,
    anchors:anchors.length,case_count:cases.length,case_order:EXPECTED_CASE_ORDER,
    model_key_used:false,model_requests:0,oracle_present:false}));
  process.exit(0);
}
if(process.env.DH50_EXACT_APPROVAL!=='YES_FIFTY_FRESH_OPENAI_CALLS')throw Error('EXACT_APPROVAL_MISSING');
const key=process.env.OPENAI_API_KEY;
if(!key||key.length<18)throw Error('PROVIDER_KEY_MISSING_NO_PAID_CALLS');
const maxCalls=Number(process.env.DH50_MAX_PROVIDER_CALLS);
if(maxCalls!==50)throw Error('EXACT_50_PROVIDER_CALL_CAP_REQUIRED');
const model='gpt-6-astra';
const history=[
  {role:'system',content:neutralSystem},
  {role:'user',content:setupPrompt},
  ...anchors.map(a=>({role:'user',content:a.message})),
];
const destination=process.env.DH50_RESULT_PATH||'artifacts/dh50/openai-baseline-raw-fifty.json';
const record={
  benchmark_id:'REALITY-DH50-SEQUENTIAL-V1',
  run_id:randomUUID(),
  lane:'RAW_OPENAI_MODEL_NO_REALITY',
  source_frozen_prompts_sha256:publicSourceHash,
  neutral_system_sha256:systemHash,
  model,reasoning_effort:'max',max_output_tokens:8192,
  exact_case_order:EXPECTED_CASE_ORDER,
  input_context_policy:'ONE_GROWING_UNTRUNCATED_CONVERSATION',
  scorer_has_no_runtime_access:true,
  oracle_has_no_runtime_access:true,
  auto_retries:0,
  reality_architecture_intervention:false,
  externally_executed_actions:false,
  run_started_at:new Date().toISOString(),
  records:[],completed:false,
};
function writeRecord(){
  mkdirSync(dirname(destination),{recursive:true});
  const temp=destination+'.tmp';
  writeFileSync(temp,JSON.stringify(record,null,2),{mode:0o600});
  renameSync(temp,destination);
}
writeRecord();
let providerCalls=0;
for(const item of cases){
  history.push({role:'user',content:item.evidence_update});
  history.push({role:'user',content:item.scored_question});
  const inputSnapshot=history.map(x=>({...x}));
  const inputHash=sha256(inputSnapshot);
  const reqBody={
    model, reasoning:{effort:'max'},max_output_tokens:8192,store:false,
    input:inputSnapshot
  };
  const row={
    checkpoint:item.case_id,workstream:item.workstream,
    model_request_number:providerCalls+1,
    context_message_count:history.length,
    context_json_byte_length:Buffer.byteLength(JSON.stringify(inputSnapshot)),
    context_sha256:inputHash,
    request_sha256:sha256(reqBody),
    attempted_at:new Date().toISOString(),
    provider_response_id:null,provider_model:null,
    provider_http_status:null,provider_status:null,usage:null,
    response_text:null,response_sha256:null,provider_payload_sha256:null,
    error_code:null,error_details:null,
    no_external_actions:true,
    grader_not_run:true
  };
  try{
    if(providerCalls>=maxCalls)throw Error('PROVIDER_CALL_CAP_EXCEEDED');
    providerCalls++;
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify(reqBody),signal:AbortSignal.timeout(180000)
    });
    row.provider_http_status=response.status;
    const wire=await response.text();
    if(!response.ok){
      row.error_code='OPENAI_HTTP_'+response.status;
      row.error_details=wire.slice(0,600);
    }else{
      const payload=JSON.parse(wire);
      row.provider_response_id=payload.id??null;
      row.provider_model=payload.model??null;
      row.provider_status=payload.status??null;
      row.provider_payload_sha256=sha256(payload);
      row.usage=payload.usage??null;
      const message=(payload.output??[]).flatMap(e=>e.content??[])
        .filter(c=>c.type==='output_text').map(c=>c.text||'').join('');
      if(payload.status!=='completed'||!message.trim()){
        row.error_code=payload.status==='completed'?'EMPTY_PROVIDER_TEXT':'PROVIDER_'+String(payload.status);
      }else{
        row.response_text=message;
        row.response_sha256=sha256(message);
        history.push({role:'assistant',content:message});
      }
    }
  }catch(err){
    row.error_code='PROVIDER_REQUEST_EXCEPTION';
    row.error_details=String(err?.message??err).slice(0,600);
  }
  row.recorded_at=new Date().toISOString();
  row.record_sha256=sha256({...row,record_sha256:undefined});
  record.records.push(row);
  record.provider_calls_attempted=providerCalls;
  writeRecord();
  console.log(JSON.stringify({checkpoint:row.checkpoint,attempted:providerCalls,
    model_response_received:Boolean(row.response_text),error_code:row.error_code}));
}
record.completed=record.records.length===50&&record.records.every(r=>r.response_text!==null);
record.run_completed_at=new Date().toISOString();
record.summary={
  expected:50,attempted:providerCalls,recorded:record.records.length,
  responses_received:record.records.filter(r=>r.response_text).length,
  failed_or_unresolved:record.records.filter(r=>!r.response_text).length,
  score_out_of_50:null,
  scoring_not_performed_in_runner:true,
  total_input_tokens:record.records.reduce((s,r)=>s+(r.usage?.input_tokens||0),0),
  total_output_tokens:record.records.reduce((s,r)=>s+(r.usage?.output_tokens||0),0),
};
record.archive_sha256=sha256({...record,archive_sha256:undefined});
writeRecord();
console.log(JSON.stringify({run_id:record.run_id,
  summary:record.summary,complete:record.completed,
  receipt_sha256:record.archive_sha256,artifact_path:destination,
  note:'FRESH_50_CALL_RAW_OPENAI_BASELINE_NOT_GRADED_NO_ORACLE_WAS_IN_PROVIDER_INPUT'}));
if(providerCalls!==50||record.records.length!==50||!record.completed)process.exitCode=1;
