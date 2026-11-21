import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 projectOwnerIncidentChatBriefing,
 readOwnerOperationalIncidentChatBriefing,
 incidentChatUniverseObservations
} from '../src/reality-owner-operational-incident-chat-v1.js';
const owner='11111111-2222-4333-8444-555555555555';
const incident='18c97597-e845-4810-94c4-30ed9edb7a3c';
const receipt='sha256:'+'a'.repeat(64);
const original={
 incident_id:incident,phase:'OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX',
 error_summary:'ERROR: GAP_FEED_OWNER_SERVICE_ROLE_REQUIRED',
 failure_count:8,last_observed_at:'2026-11-17T12:23:00Z',
 assigned_employee:'Taylor',independent_reviewer:'Quinn',
 investigation_scope:'Read source-backed scheduler logs and reproduce in isolated tests.',
 independent_test_requirement:'Independently check the signed worker and recovery receipt.',
 scheduler_dispatched_after_failure:true,operational_continuity_verified:true,
 operational_recovery_receipt_sha256:receipt,
 operational_recovery_attribution:'EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED',
 autonomous_self_repair_proven:false,
 independently_verified_repaired:false
};
const base={
 status:'OWNER_SIGNED_WORKER_RECOVERY_EVIDENCE_READ_ONLY',
 owner_id:owner,owner_scope_verified:true,read_only:true,
 execution_authorized_by_read:false,installation_authorized:false,
 production_changed:false,scheduler_dispatch_success_not_worker_proof:true,
 autonomous_self_repair_proven:false,
 incident_count:1,incidents:[original],
 next_action:'No further repair of historical error. Monitor for recurrence.',
 last_scheduler_status:'succeeded'
};
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Reality Chat automatically describes a historical operational error with accurate external-fix attribution',()=>{
 const x=projectOwnerIncidentChatBriefing({ownerId:owner,source:base});
 assert.equal(x.status,'OWNER_OPERATIONAL_INCIDENT_CHAT_BRIEFING_READ_ONLY');
 assert.equal(x.count,1);
 const i=x.items[0];
 assert.equal(i.source_ref,'reality:operational-incident:'+incident);
 assert.equal(i.assigned_employee,'Taylor');
 assert.equal(i.independent_reviewer,'Quinn');
 assert.equal(i.operational_continuity_verified,true);
 assert.equal(i.operational_recovery_receipt_sha256,receipt);
 assert.equal(i.self_repair_completed,false);
 assert.equal(i.customer_notified,false);
 assert.equal(i.original_job_authorized_by_chat,false);
 assert.match(i.outcome,/externally applied correction/);
 assert.match(i.next_action,/recurrence/);
 const observations=incidentChatUniverseObservations(x);
 assert.equal(observations.length,1);
 assert.equal(observations[0].self_repair_proven,false);
 assert.equal(observations[0].source_ref,i.source_ref);
});
test('a live or stalled failure remains visible with an honest next action, never a repair claim',()=>{
 for(const phase of ['DETECTED','LEASED_FOR_INVESTIGATION',
  'EMPLOYEE_INVESTIGATION_SCHEDULED','BLOCKED_NEEDS_EVIDENCE']){
  const src={...base,incidents:[{
   ...original,phase,operational_continuity_verified:false,
   operational_recovery_receipt_sha256:null,
   operational_recovery_attribution:null
  }]};
  const x=projectOwnerIncidentChatBriefing({ownerId:owner,source:src});
  assert.equal(x.items[0].self_repair_completed,false);
  assert.equal(x.items[0].operational_continuity_verified,false);
  assert.match(x.items[0].next_action,/independent|investigat|evidence/i);
 }
});
test('owner mismatch and forged successes fail closed, never become owner Chat evidence',()=>{
 const forgeries=[
  {...base,owner_id:'00000000-0000-4000-8000-000000000000'},
  {...base,execution_authorized_by_read:true},
  {...base,incident_count:2},
  {...base,autonomous_self_repair_proven:true},
  {...base,incidents:[{...original,autonomous_self_repair_proven:true}]},
  {...base,incidents:[{...original,operational_recovery_receipt_sha256:null}]},
  {...base,incidents:[{...original,operational_recovery_attribution:'AUTONOMOUS'}]},
  {...base,incidents:[{...original,phase:'DETECTED'}]}
 ];
 for(const source of forgeries)
  assert.throws(()=>projectOwnerIncidentChatBriefing({ownerId:owner,source}),
   /OPERATIONAL_CHAT_OWNER_INCIDENT_PROOF_REQUIRED/);
 assert.deepEqual(incidentChatUniverseObservations(null),[]);
});
test('source comes only from owner-scoped service-role readback, not client-provided incident or customer data',async()=>{
 const prior=process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF;
 process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF='isolated-test';
 let seen=0;
 try{
  const db={strictSecrets:true,url:'https://db.example.test',project:'isolated-test'};
  const session={user_id:owner,config:{url:'https://db.example.test'}};
  const call=async(_db,fn,params)=>{
   assert.equal(fn,'reality_read_owner_worker_recovery_status_v1');
   assert.deepEqual(params,{p_owner_id:owner});seen++;
   return base;
  };
  const x=await readOwnerOperationalIncidentChatBriefing({db,session,call});
  assert.equal(seen,1);
  assert.equal(x.owner_chat_only,true);
  await assert.rejects(readOwnerOperationalIncidentChatBriefing({
   db,session:{...session,user_id:'bad-user'},call
  }),/OPERATIONAL_CHAT_OWNER_INCIDENT_PROOF_REQUIRED/);
  assert.equal(seen,1);
 }finally{
  if(prior===undefined)delete process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF;
  else process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF=prior;
 }
});
test('the existing Chat GET, model cognition and on-screen owner briefing all use the same incident ledger',()=>{
 const api=read('api/reality/personal-chat.js');
 const ui=read('reality-chat-operational-incident-briefing-v1.js');
 const html=read('index.html');
 assert.match(api,/incident_readback/);
 assert.match(api,/readOwnerOperationalIncidentChatBriefing/);
 assert.match(api,/incidentChatUniverseObservations/);
 assert.match(api,/owner_operational_incidents/);
 assert.match(api,/operational_incidents_readback:context.values.operational_incidents/);
 assert.match(api,/execution_authorized_by_chat:false/);
 assert.match(ui,/What/);
 assert.match(ui,/Discuss this in Chat/);
 assert.match(ui,/customer_notified!==false/);
 assert.match(ui,/self_repair_completed!==false/);
 assert.match(ui,/window.setInterval/);
 assert.match(html,/reality-chat-operational-incident-briefing-v1.js/);
 assert.doesNotMatch(ui,/privateSend\.click\(/);
});
