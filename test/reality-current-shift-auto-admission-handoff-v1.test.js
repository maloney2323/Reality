import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {admitCurrentShiftInvestigatedSourceWithFrozenProof}
 from '../src/reality-current-shift-auto-admission-handoff-v1.js';

const shift='9460cfff-937a-4105-9093-2e41ab39a950',
 owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const source='https://github.com/maloney2323/Reality/issues/185';
const testPath='test/reality-frozen-regressions/reality-current-shift-auto-admission-v1.test.js';
const sha1=x=>createHash('sha1').update('blob '+x.length+'\0').update(x).digest('hex');
const bytes=readFileSync(new URL('../'+testPath,import.meta.url));
const blob={path:testPath,encoding:'base64',content:bytes.toString('base64'),
 sha:sha1(bytes),size:bytes.length};
const red={
 id:5432154321,name:'Reality current shift governed auto-admission frozen contract',
 path:'.github/workflows/reality-current-shift-auto-admission-proof.yml',
 head_branch:'reality/native263-temporal-chat-proof-20261113',
 head_repository:{full_name:'maloney2323/Reality'},
 status:'completed',conclusion:'failure',head_sha:'a'.repeat(40),
 html_url:'https://github.com/maloney2323/Reality/actions/runs/5432154321',
 created_at:new Date().toISOString()
};
const jobs={jobs:[{run_id:red.id,name:'current-shift-frozen-acceptance',
 conclusion:'failure',steps:[
  {name:'Run actions/checkout@v4',conclusion:'success'},
  {name:'Run actions/setup-node@v4',conclusion:'success'},
  {name:'Frozen current shift auto-admission acceptance',conclusion:'failure'}
 ]}]};
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 shift_id:shift,owner_id:owner,plan_fingerprint:'sha256:'+'d'.repeat(64),
 jobs:[{source_ref:source,source_step_index:3,
  original_kind:'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL',
  original_work_id:null,phase:'NOT_ADMITTED',
  source_proof_sha256:'sha256:'+'a'.repeat(64),
  independent_source_proof_verified:true},
  {source_ref:'https://github.com/maloney2323/Reality/issues/263'},
  {source_ref:'https://github.com/maloney2323/Reality/pull/57'},
  {source_ref:'https://github.com/maloney2323/Reality/issues/62'}]
};
const receipts={status:'WEEKLY_ASSIGNED_SOURCE_INVESTIGATIONS_ALREADY_INSPECTED',
 source_receipts:[{source_ref:source,issue_number:185,employee:'Riley',
  investigation_status:'CURRENT_SOURCE_INSPECTED_EXACT_TASK_REQUIRES_TEST',
  provider_evidence_sha256:'sha256:'+'f'.repeat(64),
  investigation_receipt_ref:'supabase:weekly_employee_investigation_receipts_v1:'+
   'e84de330-6b52-43ae-873d-c11893bed74c'}]
};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)};
function provider(bad=false){
 const calls=[];
 const fetchImpl=async url=>{
  calls.push(url);
  let value;
  if(url.includes('/actions/runs?'))value={workflow_runs:[red]};
  else if(url.endsWith('/actions/runs/'+red.id))value=red;
  else if(url.includes('/actions/runs/'+red.id+'/jobs?'))value=jobs;
  else if(url.includes('/contents/'+testPath+'?ref='))value=bad?
   {...blob,content:'YmFk'}:blob;
  else throw Error('Unexpected provider URL '+url);
  return {ok:true,json:async()=>value};
 };
 return {fetchImpl,calls};
}
test('signed worker independently verifies actual CI and frozen test bytes then auto-admits one exact original',async()=>{
 const p=provider();let admissions=0;
 const result=await admitCurrentShiftInvestigatedSourceWithFrozenProof({
  db:{strictSecrets:true,project:'hvkfreoagbrphwghjajw'},
  graph,investigations:receipts,env,
  fetchImpl:p.fetchImpl,
  callRpc:async(db,name,args)=>{
   assert.equal(name,'reality_admit_current_shift_verified_repair_v1');
   assert.equal(args.p_source_ref,source);
   assert.equal(args.p_frozen_failure_run_id,red.id);
   assert.equal(args.p_frozen_test_sha256,
    createHash('sha256').update(bytes).digest('hex'));
   assert.equal(args.p_failure_source_sha,red.head_sha);
   admissions++;
   return {status:'EXACT_OWNER_SHIFT_REPAIR_ORIGINAL_ADMITTED',
    shift_id:shift,owner_id:owner,source_ref:source,
    original_work_id:'work:'+'c'.repeat(32),
    original_job_completed:false,installation_authorized:false,
    production_changed:false};
  }
 });
 assert.equal(admissions,1);
 assert.equal(result.original_job_admitted,true);
 assert.equal(result.new_shift_created,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.production_changed,false);
 assert.equal(result.independent_frozen_red_provider_url,red.html_url);
 assert.equal(p.calls.length,5);
});
test('no unverified, forged or mutable CI source can admit original',async()=>{
 let attempted=0;
 const p=provider(true);
 await assert.rejects(()=>admitCurrentShiftInvestigatedSourceWithFrozenProof({
  db:{strictSecrets:true,project:'hvkfreoagbrphwghjajw'},
  graph,investigations:receipts,env,
  fetchImpl:p.fetchImpl,
  callRpc:async()=>{attempted++;throw Error('FORBIDDEN');}
 }),/SHIFT_AUTO_ADMISSION_/);
 assert.equal(attempted,0);
 const missing=await admitCurrentShiftInvestigatedSourceWithFrozenProof({
  db:{strictSecrets:true,project:'hvkfreoagbrphwghjajw'},
  graph:{...graph,jobs:graph.jobs.map((x,i)=>i===0?{
   ...x,phase:'SETTLED',original_work_id:'work:'+'c'.repeat(32),
   original_kind:'REAL_ENGINEERING_REPAIR_ORIGINAL'}:x)},
  investigations:receipts,env,fetchImpl:async()=>{throw Error('NO FETCH')},
  callRpc:async()=>{throw Error('NO DB')}
 });
 assert.equal(missing.status,'NO_NEW_QUALIFIABLE_CURRENT_SHIFT_SOURCE');
 assert.equal(missing.original_job_admitted,false);
});
test('worker calls the independent service-only bridge under exact existing shift, never authorizes install',()=>{
 const s=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 const db=readFileSync(new URL(
  '../supabase/migrations/20261113_current_shift_qualified_original_auto_admission_v1.sql',
  import.meta.url),'utf8');
 assert.match(s,/await admitCurrentShiftInvestigatedSourceWithFrozenProof\(/);
 assert.match(s,/current_shift_verified_auto_admission:shiftVerifiedAutoAdmission/);
 assert.match(db,/SHIFT_VERIFIED_REPAIR_REAL_INVESTIGATION_REQUIRED/);
 assert.match(db,/SHIFT_VERIFIED_REPAIR_PREVIOUSLY_SETTLED_NO_REPLAY/);
 assert.match(db,/EXACT_OWNER_SHIFT_REPAIR_ORIGINAL_ADMITTED/);
 assert.match(db,/on conflict\(shift_id,issue_number\) do nothing/);
 assert.doesNotMatch(s,/authorize_employee_completion_shift_v1\(/);
});
