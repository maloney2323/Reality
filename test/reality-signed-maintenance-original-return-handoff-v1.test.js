import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceVerifiedMaintenanceOriginalHandoff}
 from '../src/reality-signed-maintenance-original-return-handoff-v1.js';

const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const worker='d5555555-2222-4333-8444-555555555555';
const original='work:315562fe1bd66b30a48bb9be4f1d162a';
const validEnv={
 VERCEL_ENV:'preview',REALITY_MAINTENANCE_EXECUTOR_CONNECTED:'true',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'
};
const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw',
 url:'https://hvkfreoagbrphwghjajw.supabase.co',secretKey:'s'.repeat(35)};
const runCase='RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED';
const requalify='REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI';
const lineage='VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI';
const trigger={
 status:'SIGNED_MAINTENANCE_GOVERNED_TRIGGER_READY',
 trigger_source:'CANONICAL_CONTINUITY_SPINE',
 owner_id:owner,shift_id:shift,
 continuity_root_id:'36f0ad48-f391-549f-8622-66cd493977e7',
 continuity_event_id:'4abf203a-8959-5674-9ae3-a9092dfd2c62',
 original_work_id:original,next_action:runCase,same_original_work_due:true,
 owner_action_required:false,installer_dispatch_permitted:false,
 installer_reconcile_only:false,independent_postinstall_due:false,
 execution_authorized_by_trigger:false,
 original_job_completed:false,new_shift_started:false,production_changed:false
};
const gate={
 owner_id:owner,shift_id:shift,original_work_id:original,
 status:'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE',read_only:true,
 warrant_mode:'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS',
 next_action:runCase,original_job_completed:false,
 installation_authorized:false,production_changed:false
};
function harness({t=trigger,g=gate,env=validEnv,result={
 status:'SIGNED_MAINTENANCE_CASE_CI_DISPATCHED',
 original_job_completed:false,installation_authorized:false,
 production_changed:false,new_shift_started:false
}}={}){
 const calls=[];
 const call=async(d,operation,args)=>{
  calls.push(['gate',operation,args]);
  return g;
 };
 const executeCaseCi=async props=>{
  calls.push(['case-ci',props.shiftId,props.workerRunId]);
  return result;
 };
 const executeSourceRequalification=async props=>{
  calls.push(['source-requalification',props.shiftId,props.workerRunId]);
  return result;
 };
 return {calls,run:()=>advanceVerifiedMaintenanceOriginalHandoff({
  trigger:t,db,env,shiftId:shift,workerRunId:worker,call,
  executeCaseCi,executeSourceRequalification,fetchImpl:async()=>({})
 })};
}
test('verified Continuity returns through a fresh service readback into EXISTING case-CI executor',async()=>{
 const h=harness();
 const out=await h.run();
 assert.equal(out.status,'SIGNED_MAINTENANCE_ORIGINAL_RETURN_DELIVERED');
 assert.equal(out.executor_invoked,true);
 assert.equal(out.original_job_completed,false);
 assert.equal(out.original_job_settled,false);
 assert.equal(out.installation_authorized,false);
 assert.equal(h.calls[0][1],'reality_read_same_original_postmaintenance_gate_v1');
 assert.deepEqual(h.calls[0][2],{p_shift_id:shift});
 assert.deepEqual(h.calls[1],['case-ci',shift,worker]);
 assert.equal(h.calls.length,2);
 assert.equal(out.continuity_event_id,trigger.continuity_event_id);
});
test('a changed-source original routes to existing requalification, not the installer',async()=>{
 const h=harness({t:{...trigger,next_action:requalify},
  g:{...gate,next_action:requalify}});
 const out=await h.run();
 assert.equal(out.status,'SIGNED_MAINTENANCE_ORIGINAL_RETURN_DELIVERED');
 assert.equal(h.calls[1][0],'source-requalification');
 assert.equal(h.calls.length,2);
});
test('missing canonical owner-business original is a preserved evidence blocker, not executable work',async()=>{
 const h=harness({t:{...trigger,next_action:lineage},
  g:{...gate,next_action:lineage}});
 const out=await h.run();
 assert.equal(out.status,'CANONICAL_OWNER_BUSINESS_ORIGINAL_EVIDENCE_REQUIRED');
 assert.equal(out.executor_invoked,false);
 assert.equal(out.original_job_completed,false);
 assert.equal(h.calls.length,1);
});
test('no verified due event means zero database calls and zero execution',async()=>{
 const h=harness({t:{...trigger,same_original_work_due:false}});
 const out=await h.run();
 assert.equal(out.executor_invoked,false);
 assert.equal(h.calls.length,0);
});
test('forged or insufficient return receipts fail closed BEFORE service gate',async()=>{
 const variants=[
 {...trigger,status:'SIGNED_MAINTENANCE_TRIGGER_BLOCKED'},
 {...trigger,owner_action_required:true},
 {...trigger,installer_dispatch_permitted:true},
 {...trigger,execution_authorized_by_trigger:true},
 {...trigger,original_job_completed:true},
 {...trigger,continuity_event_id:'bad'},
 {...trigger,original_work_id:'work:'+'f'.repeat(32),shift_id:'bad'},
 {...trigger,next_action:'INSTALL_PRODUCTION'},
 {...trigger,trigger_source:'LLM_TEXT'}
 ];
 for(const t of variants){
  const h=harness({t});
  const out=await h.run();
  assert.equal(out.executor_invoked,false);
  assert.equal(h.calls.length,0);
 }
});
test('fresh service gate catches owner, original, source/action and authority drift',async()=>{
 const variants=[
 {...gate,owner_id:'11111111-2222-4333-8444-555555555555'},
 {...gate,original_work_id:'work:'+'f'.repeat(32)},
 {...gate,next_action:requalify},
 {...gate,installation_authorized:true},
 {...gate,read_only:false},
 {...gate,warrant_mode:'UNSIGNED'},
 {...gate,original_job_completed:true}
 ];
 for(const g of variants){
  const h=harness({g});
  const out=await h.run();
  assert.equal(out.status,'SIGNED_MAINTENANCE_ORIGINAL_RETURN_CURRENT_GATE_DRIFT');
  assert.equal(out.executor_invoked,false);
  assert.equal(h.calls.length,1);
 }
});
test('executor is never entered in production or without existing registered capability',async()=>{
 for(const env of [{...validEnv,VERCEL_ENV:'production'},
   {...validEnv,REALITY_MAINTENANCE_EXECUTOR_CONNECTED:'false'}]){
  const h=harness({env});const out=await h.run();
  assert.equal(out.executor_invoked,false);
  assert.equal(h.calls.length,0);
 }
});
test('unexpected settlement or installation claim from delegated executor cannot be reported as a successful handoff',async()=>{
 const h=harness({result:{status:'VERIFIED',original_job_completed:true,
  installation_authorized:false,production_changed:false,new_shift_started:false}});
 await assert.rejects(h.run(),/SIGNED_MAINTENANCE_RETURN_EXECUTOR_RECEIPT_UNVERIFIED/);
});
test('actual worker consumes BOTH immediate and later durable return triggers, without a second shift or installer',()=>{
 const s=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 const a=s.indexOf('const signedMaintenanceReturnTrigger=');
 const b=s.indexOf("workerStage='SIGNED_MAINTENANCE_GOVERNED_ORIGINAL_RETURN_HANDOFF'");
 const c=s.indexOf('const signedMaintenanceOriginalReturnDispatch=');
 const d=s.indexOf("workerStage='GOVERNED_CONTINUITY_VERIFIED_EVIDENCE_CLASSIFICATION'");
 assert.ok(a>=0&&b>a&&c>b&&d>c);
 assert.match(s,/signedMaintenanceReturnTrigger.same_original_work_due===true/);
 assert.match(s,/signedMaintenanceReturnTrigger:signedMaintenanceGovernedTrigger/);
 assert.match(s,/executeCaseCi:executeOneRegisteredMaintenanceCiWake/);
 assert.match(s,/executeSourceRequalification:executeOneRegisteredMaintenanceAction/);
 assert.match(s,/signed_maintenance_original_return_dispatch:signedMaintenanceOriginalReturnDispatch/);
});
