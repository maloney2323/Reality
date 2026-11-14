import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const broker=readFileSync(new URL(
 '../supabase/functions/reality-riley-auto-corrective-ci-v1/index.ts',
 import.meta.url),'utf8');
const priorDeno=globalThis.Deno;
globalThis.Deno={serve:()=>{}};
const {stageOrObserve,validClaim}=await import('data:text/javascript;base64,'+
 Buffer.from(broker+'\nexport {stageOrObserve,validClaim};').toString('base64'));
globalThis.Deno=priorDeno;
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const DB='https://hvkfreoagbrphwghjajw.supabase.co/rest/v1/rpc/';
const WORK='work:'+'a'.repeat(32);
const SOURCE='src/reality-riley-service-original-runtime-v1.js';
const WORKFLOW='.github/workflows/reality-riley-auto-corrective-candidate-proof.yml';
const BASE='reality/test-independent-recovery-preview';
const BASESHA='b'.repeat(40),HEAD='a'.repeat(40);
const ATTEMPT='11111111-2222-4333-8444-555555555555',SHIFT='22222222-3333-4444-8555-666666666666';
const BRANCH='reality/riley/auto-corrective-'+WORK.slice(5)+'-a2';
const find='const handoff = outcome.capability_response ? "valid" : "missing";';
const replace='const handoff = outcome.capability_response && typeof outcome.capability_response === "object" ? "valid" : "missing";';
const before='// immutable, independently verified owner original\n'+
  '// source proof and scoped same-original tool handoff\n'.repeat(6)+find+'\n';
const after=before.replace(find,replace);
const sha=text=>{const bytes=Buffer.from(text);return createHash('sha1')
 .update('blob '+bytes.length+'\0').update(bytes).digest('hex')};
const hash=text=>'sha256:'+createHash('sha256').update(text).digest('hex');
const b64=text=>Buffer.from(text).toString('base64');
const file=(text,path)=>({path,encoding:'base64',size:Buffer.byteLength(text),
 content:b64(text),sha:sha(text)});
const claim={status:'SAME_ORIGINAL_RECOVERY_CANDIDATE_READY_FOR_CI',
 attempt_id:ATTEMPT,attempt_number:2,attempt_phase:'MODEL_PATCH_RECORDED',
 original_work_id:WORK,owner_id:'85eeae0b-2988-43c4-b20c-590fb51da70d',
 shift_id:SHIFT,source_ref:'https://github.com/maloney2323/Reality/issues/87',
 source_path:SOURCE,source_blob_sha:sha(before),source_commit_sha:BASESHA,
 source_proof_sha256:'sha256:'+'e'.repeat(64),
 model_response_id:'resp_repair_test_v2_001',
 proposed_sha256:hash(after),find,replace,
 installation_authorized:false,original_job_completed:false,
 production_changed:false};
const RUNID=43622000001;
const RUN={id:RUNID,head_sha:HEAD,head_branch:BRANCH,
 event:'push',name:'Reality independently tested auto-corrective candidate',
 path:WORKFLOW,status:'completed',conclusion:'failure',
 html_url:'https://github.com/maloney2323/Reality/actions/runs/'+RUNID};
const JOBS={jobs:[{id:132456350176,run_id:RUNID,
 name:'independent-corrective-frozen',status:'completed',conclusion:'failure',
 steps:[
  {name:'Exact candidate source syntax',conclusion:'success'},
  {name:'Independent original-job continuity and governed handoff acceptance',
   conclusion:'failure'}
 ]}]};
const PR={number:301,state:'open',draft:true,
 head:{sha:HEAD,ref:BRANCH,repo:{full_name:'maloney2323/Reality'}},
 base:{ref:BASE,repo:{full_name:'maloney2323/Reality'}}};
function mock({runs=[RUN],pulls=[PR],badSource=false}={}){
 const original=globalThis.fetch;const calls=[];let existing=pulls;
 globalThis.fetch=async(url,opts={})=>{
  const route=url.startsWith(ROOT)?url.slice(ROOT.length):
   url.startsWith(DB)?url.slice(DB.length):null;
  calls.push({url,method:opts.method||'GET',body:opts.body});
  let value;
  if(url.startsWith(DB)){
   const payload=JSON.parse(opts.body||'{}');
   if(route==='reality_record_same_original_recovery_staging_v2'){
    assert.equal(payload.p_attempt_id,ATTEMPT);
    assert.equal(payload.p_candidate_branch,BRANCH);
    value={status:'SAME_ORIGINAL_RECOVERY_CANDIDATE_STAGED',
     attempt_id:ATTEMPT,original_work_id:WORK,shift_id:SHIFT,
     candidate_commit_sha:HEAD,independent_ci_verified:false,
     original_job_completed:false,installation_authorized:false,
     production_changed:false};
   }else if(route==='reality_record_same_original_recovery_ci_v2'){
    assert.equal(payload.p_attempt_id,ATTEMPT);
    assert.equal(payload.p_independent_run_id,RUNID);
    value={status:'SAME_ORIGINAL_RECOVERY_CI_FAILED_NEXT_EVIDENCE_BACKED_ATTEMPT_ELIGIBLE',
     attempt_id:ATTEMPT,original_work_id:WORK,shift_id:SHIFT,
     ci_conclusion:'failure',independent_ci_verified:true,
     original_job_completed:false,installation_authorized:false,
     production_changed:false};
   }else throw Error('UNEXPECTED_RPC '+route);
  }else if(route==='/git/ref/heads/'+BASE)
   value={ref:'refs/heads/'+BASE,object:{sha:BASESHA}};
  else if(route==='/git/ref/heads/'+BRANCH)
   value={ref:'refs/heads/'+BRANCH,object:{sha:HEAD}};
  else if(route?.startsWith('/contents/'+SOURCE+'?ref=')){
   const ref=decodeURIComponent(route.split('?ref=')[1]);
   value=file(ref===HEAD?after:(badSource?before+'tampered':before),SOURCE);
  }else if(route?.startsWith('/contents/'+WORKFLOW+'?ref='))
   value=file('persist-credentials: false\nindependent-corrective-frozen\nnode --test',WORKFLOW);
  else if(route?.startsWith('/actions/runs?branch='))
   value={workflow_runs:runs};
  else if(route==='/actions/runs?event=pull_request&per_page=100')
   value={workflow_runs:runs};
  else if(route?.startsWith('/pulls?state=open&head='))
   value=existing;
  else if(route==='/pulls'&&opts.method==='POST'){
   const body=JSON.parse(opts.body);
   assert.equal(body.head,BRANCH);assert.equal(body.base,BASE);
   assert.equal(body.draft,true);
   assert.match(body.body,/No installation/);
   existing=[PR];value=PR;
  }else if(route==='/actions/runs/'+RUNID)
   value=RUN;
  else if(route==='/actions/runs/'+RUNID+'/jobs?per_page=60')
   value=JOBS;
  else throw Error('UNEXPECTED_REMOTE '+route);
  return new Response(JSON.stringify(value),{status:200,
   headers:{'content-type':'application/json'}});
 };
 return {calls,restore:()=>{globalThis.fetch=original}};
}
test('governed v2 claim enforces a distinct typed attempt under unchanged owner scope',()=>{
 assert.doesNotThrow(()=>validClaim(claim,true));
 assert.throws(()=>validClaim({...claim,attempt_number:1},true),/EXACT_CURRENT_MODEL_SOURCE_AND_AUTHORITY_REQUIRED/);
 assert.throws(()=>validClaim({...claim,installation_authorized:true},true),/EXACT_CURRENT_MODEL_SOURCE_AND_AUTHORITY_REQUIRED/);
 assert.throws(()=>validClaim({...claim,status:'EXACT_SAME_SHIFT_CORRECTIVE_DRAFT_READY_FOR_CI'},true),/EXACT_CURRENT_MODEL_SOURCE_AND_AUTHORITY_REQUIRED/);
});
test('exact independently failed frozen CI records a durable failed attempt without installing',async()=>{
 const m=mock();
 try{
  const result=await (await stageOrObserve(claim,'token',BASE,BASESHA,'key',true)).json();
  assert.equal(result.status,'CORRECTIVE_CI_REJECTED_ORIGINAL_REMAINS_OPEN');
  assert.equal(result.attempt_id,ATTEMPT);
  assert.equal(result.independent_ci_verified,true);
  assert.equal(result.installation_authorized,false);
  assert.equal(result.original_job_completed,false);
  assert.equal(m.calls.filter(x=>x.url===DB+'reality_record_same_original_recovery_ci_v2').length,1);
  assert.equal(m.calls.filter(x=>x.method==='POST'&&x.url===ROOT+'/pulls').length,0);
 }finally{m.restore()}
});
test('no matching frozen CI creates only ONE isolated draft PR and waits for independent proof',async()=>{
 const m=mock({runs:[],pulls:[]});
 try{
  const result=await (await stageOrObserve(claim,'token',BASE,BASESHA,'key',true)).json();
  assert.equal(result.status,'CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI');
  assert.equal(result.independent_ci_verified,false);
  assert.equal(m.calls.filter(x=>x.method==='POST'&&x.url===ROOT+'/pulls').length,1);
  assert.equal(m.calls.some(x=>x.url===DB+'reality_record_same_original_recovery_ci_v2'),false);
 }finally{m.restore()}
});
test('tampered deployed source forbids staging and any CI receipt',async()=>{
 const m=mock({badSource:true});
 try{
  await assert.rejects(stageOrObserve(claim,'token',BASE,BASESHA,'key',true),
   /PREVIEW_SOURCE_FILE_CHANGED_REQUALIFICATION_REQUIRED/);
  assert.equal(m.calls.some(x=>x.url===DB+'reality_record_same_original_recovery_staging_v2'),false);
 }finally{m.restore()}
});
test('v2 uses service-only frozen original proof; never replaces v1 or grants client install authority',()=>{
 const migration=readFileSync(new URL('../supabase/migrations/20261114_same_original_recovery_ci_continuation_v2.sql',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const bridge=readFileSync(new URL('../src/reality-riley-auto-corrective-ci-bridge-v1.js',import.meta.url),'utf8');
 assert.match(migration,/riley_same_original_recovery_attempts_v2/);
 assert.match(migration,/r\.candidate_staged_commit_sha<>p_tested_commit_sha/);
 assert.match(migration,/reality_read_current_shift_execution_graph_v1/);
 assert.match(migration,/current_user<>'service_role'/);
 assert.doesNotMatch(migration,/grant execute[^;]*to authenticated/gi);
 assert.doesNotMatch(migration,/issues\/185|issues\/263/);
 assert.match(worker,/version:2/);
 assert.match(worker,/SAME_ORIGINAL_RECOVERY_CI_ELIGIBILITY/);
 assert.match(bridge,/version\}\)/);
 assert.match(broker,/reality_read_next_same_original_recovery_candidate_v2/);
 assert.match(broker,/prFailureRuns=recovery\?\[\]:/);
 assert.match(broker,/draft:true/);
 assert.match(broker,/reality_record_riley_auto_corrective_ci_v1/);
});
