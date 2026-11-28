import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stageVerifiedSignedOriginalLineagePacket,
 verifyOwnerOriginalLineagePacket}
 from '../src/reality-signed-original-lineage-packet-v1.js';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const work='work:315562fe1bd66b30a48bb9be4f1d162a';
const hash='sha256:'+'a'.repeat(64);
const p='https://github.com/maloney2323/Reality/pull/307';
const gate={
 status:'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE',
 next_action:'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
 canonical_owner_business_original_missing:true,
 case_specific_maintenance_ci_red_attested:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,read_only:true,
 shift_id:shift,owner_id:owner,original_work_id:work,
 source_ref:p,signed_external_review_receipt_sha256:hash,
 scoped_maintenance_case_ci_receipts:[]
};
const stage={
 status:'SIGNED_ORIGINAL_LINEAGE_EVIDENCE_PACKET_DURABLE',
 owner_id:owner,shift_id:shift,original_work_id:work,
 source_ref:p,source_claim_id:'418ee1f1-7d78-42d2-88e7-c3a2efc1cd0b',
 maintenance_id:'b7181e5b-a01c-4cb2-b191-10dea9dbe04f',
 packet_id:'a9c70bb0-dc74-4ef6-aec2-d3ab053eeaf8',evidence_sha256:hash,
 source_bound:true,customer_original_verified:false,
 original_claim_admitted:false,independent_final_receipt_verified:false,
 independent_review_required:true,read_only_for_execution:true,
 next_action:'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
 original_job_completed:false,installation_authorized:false,
 production_changed:false,new_shift_started:false
};
const read={
 ...stage,status:'SIGNED_ORIGINAL_LINEAGE_EVIDENCE_INDEPENDENTLY_READ',
 packet_verified:true,canonical_customer_original_present:false,
 continuity_observation_verified:true,
 continuity_event_id:'e70bba18-9570-5a15-b58f-a3c52b2cb492',
 continuity_root_id:'36f0ad48-f391-549f-8622-66cd493977e7',
 continuity_worldline_id:'694f30e8-2bdb-5221-b2b2-539ea59472d4',
 continuity_fact:'CURRENT_ORIGINAL_REMAINS_UNFINISHED'
};
const db={strictSecrets:true,project:'test',
 url:'https://test.supabase.co',secretKey:'not-a-real-key'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'test'};
const runner='e6cb61d9-a919-423c-8dd1-30b788af4b46';
const empty={status:'NO_SIGNED_ORIGINAL_LINEAGE_PACKET',owner_id:owner,
 packet_verified:false,original_job_completed:false,installation_authorized:false,
 production_changed:false};
test('same-shift #307 source/claim independent read, no business original admission',async()=>{
 const calls=[];
 const r=await stageVerifiedSignedOriginalLineagePacket({
  db,env,gate,shiftId:shift,workerRunId:runner,
  fetchImpl:async()=>{},call:async(_db,method,args)=>{
   calls.push({method,args});
   return calls.length===1?empty:method==='reality_stage_signed_original_lineage_packet_v1'?
    stage:read;
  }});
 assert.equal(r.status,'SIGNED_ORIGINAL_LINEAGE_EVIDENCE_STAGED_INDEPENDENTLY_READ');
 assert.equal(r.packet_staged,true);
 assert.equal(r.source_reconciled,true);
 assert.equal(r.original_work_id,work);
 assert.equal(r.source_claim_id,'418ee1f1-7d78-42d2-88e7-c3a2efc1cd0b');
 assert.equal(r.continuity_event_id,'e70bba18-9570-5a15-b58f-a3c52b2cb492');
 assert.equal(r.continuity_fact,'CURRENT_ORIGINAL_REMAINS_UNFINISHED');
 assert.equal(r.customer_original_verified,false);
 assert.equal(r.original_claim_admitted,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.installation_authorized,false);
 assert.deepEqual(calls.map(c=>c.method),[
  'reality_read_owner_original_lineage_packet_v1',
  'reality_stage_signed_original_lineage_packet_v1',
  'reality_read_owner_original_lineage_packet_v1'
 ]);
 assert.deepEqual(calls[0].args,{p_owner_id:owner});
 assert.deepEqual(calls[1].args,{p_shift_id:shift,p_original_work_id:work});
 assert.deepEqual(calls[2].args,{p_owner_id:owner});
});
test('the same algorithm works for any source PR number and original identity',async()=>{
 const alt={...gate,source_ref:'https://github.com/maloney2323/Reality/pull/77314',
  original_work_id:'work:'+'b'.repeat(32)};
 const alteredStage={...stage,source_ref:alt.source_ref,
  original_work_id:alt.original_work_id};
 let calls=0;
 const r=await stageVerifiedSignedOriginalLineagePacket({
  db,env,gate:alt,shiftId:shift,workerRunId:runner,
  fetchImpl:async()=>{},call:async(_db,method)=>{
   if(++calls===1)return empty;
   return method==='reality_stage_signed_original_lineage_packet_v1'?
    alteredStage:{...read,source_ref:alt.source_ref,
      original_work_id:alt.original_work_id};
  }});
 assert.equal(r.status,'SIGNED_ORIGINAL_LINEAGE_EVIDENCE_STAGED_INDEPENDENTLY_READ');
 assert.equal(r.source_ref,alt.source_ref);
});
test('never confuse incident #211 claim with the #307 PR-review claim',async()=>{
 let calls=0;
 const r=await stageVerifiedSignedOriginalLineagePacket({
  db,env,gate,shiftId:shift,workerRunId:runner,
  fetchImpl:async()=>{},call:async(_db,method)=>{
   calls++;
   if(calls===1)return empty;
   if(method==='reality_stage_signed_original_lineage_packet_v1')return stage;
   return {...read,source_claim_id:'1a311d37-9f8a-4301-ac11-585fc7ef14df'};
  }});
 assert.equal(calls,3);
 assert.equal(r.status,'SIGNED_ORIGINAL_LINEAGE_INDEPENDENT_READ_UNVERIFIED');
 assert.equal(r.source_reconciled,false);
 assert.equal(r.original_job_completed,false);
});
test('a source change, role drift or unsigned worker cannot stage packets',async()=>{
 let calls=0;
 const check=async data=>stageVerifiedSignedOriginalLineagePacket({
  db,env,gate,shiftId:shift,workerRunId:runner,
  fetchImpl:async()=>{},call:async()=>{calls++;return stage},...data});
 for(const data of [
  {gate:{...gate,source_ref:'https://example.com/unknown'}},
  {gate:{...gate,case_specific_maintenance_ci_red_attested:true}},
  {gate:{...gate,original_job_completed:true}},
  {gate:{...gate,independent_final_receipt_verified:true,
    case_specific_maintenance_ci_red_attested:true}},
  {env:{...env,VERCEL_ENV:'production'}},
  {shiftId:'7a97c31e-8080-4b71-b826-1a950497aaae'},
  {workerRunId:'not-a-uuid'},
 ]){
  const r=await check(data);
  assert.equal(r.packet_staged,false);
  assert.equal(r.original_job_completed,false);
 }
 assert.equal(calls,0);
});
test('service source returned missing business proof cannot be presented as verified',async()=>{
 const r=await stageVerifiedSignedOriginalLineagePacket({
  db,env,gate,shiftId:shift,workerRunId:runner,
  fetchImpl:async()=>{},call:async(_db,method)=>method===
   'reality_read_owner_original_lineage_packet_v1'?empty:{
   status:'ORIGINAL_LINEAGE_INDEPENDENT_SOURCE_JOIN_NOT_VERIFIED'
  }});
 assert.equal(r.packet_staged,false);
 assert.equal(r.source_reconciled,false);
});
test('owner read refuses foreign tenants, forged original completion and stage labels',()=>{
 assert.ok(verifyOwnerOriginalLineagePacket(read,owner,shift));
 for(const wrong of [
  {...read,owner_id:shift},
  {...read,shift_id:owner},
  {...read,packet_verified:false},
  {...read,source_claim_id:'notuuid'},
  {...read,continuity_observation_verified:false},
  {...read,continuity_event_id:'unverified'},
  {...read,continuity_fact:'CUSTOMER_WORK_SETTLED'},
  {...read,evidence_sha256:'bad'},
  {...read,customer_original_verified:true},
  {...read,original_claim_admitted:true},
  {...read,original_job_completed:true},
  {...read,installation_authorized:true},
  {...read,production_changed:true},
  {...read,next_action:'INSTALL_PATCH_NOW'}
 ])assert.equal(verifyOwnerOriginalLineagePacket(wrong,owner,shift),null);
});
test('SQL binds actual original PR claim and warrant, not a hardcoded claim or customer',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261121143000_signed_original_source_lineage_packet_v1.sql',
  import.meta.url),'utf8');
 assert.match(sql,/o\.claim_id is not null/);
 assert.match(sql,/o\.source_proof_sha256=t\.proof_sha256/);
 assert.match(sql,/scope\.entry->>'maintenance_id'=m\.incident_id::text/);
 assert.match(sql,/scope\.entry->>'independent_review_receipt_sha256'/);
 assert.match(sql,/m\.original_customer_work_id is null/);
 assert.match(sql,/not exists \(\s*select 1 from reality_internal\.governed_employee_original_claims_v1/i);
 assert.match(sql,/on conflict \(shift_id,original_work_id,source_ref,source_claim_id\)/i);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/e\.payload->>'original_source_ref'=v\.source_ref/);
 assert.match(sql,/CURRENT_ORIGINAL_REMAINS_UNFINISHED/);
 assert.match(sql,/e\.provenance->>'authoritative_source'/);
 assert.match(sql,/e\.epistemic_status='VERIFIED'/);
 assert.doesNotMatch(sql,/418ee1f1|1a311d37|#307|#211|315562fe1b/);
 assert.doesNotMatch(sql,/\b(?:update|delete)\s+reality_internal\.governed_employee_original_claims_v1/i);
 assert.doesNotMatch(sql,/\bcreate\s+or\s+replace\s+function\s+public\.reality_read_same_original_postmaintenance_gate_v1/i);
});
test('existing worker and authenticated Chat use bound RPC, do not override original',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const api=readFileSync(new URL(
  '../api/reality/personal-handoff-health.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL(
  '../reality-chat-handoff-health-v1.js',import.meta.url),'utf8');
 assert.match(worker,/await stageVerifiedSignedOriginalLineagePacket\(/);
 assert.match(worker,/signed_original_lineage_evidence:signedOriginalLineageEvidence/);
 assert.match(api,/reality_read_owner_original_lineage_packet_v1/);
 assert.match(ui,/Original evidence → customer-work handoff/);
 assert.match(ui,/No verified customer-original admission or final receipt/);
});
test('two narrow service RPCs are allowlisted, unregistered operations blocked',async()=>{
 let calls=0;
 const first={status:'NO_SIGNED_ORIGINAL_LINEAGE_PACKET',
  packet_verified:false,owner_id:owner,
  original_job_completed:false,installation_authorized:false,
  production_changed:false};
 const f=async()=>{calls++;return{ok:true,json:async()=>first}};
 await shiftRpc(db,'reality_read_owner_original_lineage_packet_v1',
  {p_owner_id:owner},{fetchImpl:f});
 assert.equal(calls,1);
 await assert.rejects(shiftRpc(db,
  'reality_read_owner_original_lineage_packet_v1_unverified_install',
  {p_owner_id:owner},{fetchImpl:f}),/SHIFT_RPC_NOT_ALLOWLISTED/);
 assert.equal(calls,1);
});


test('a verified existing original packet is reused without a second write on later wakes',async()=>{
 const calls=[];
 const r=await stageVerifiedSignedOriginalLineagePacket({db,env,gate,shiftId:shift,
  workerRunId:runner,expectedContinuityRootId:read.continuity_root_id,
  fetchImpl:async()=>{},call:async(_db,method)=>{calls.push(method);return read;}});
 assert.deepEqual(calls,['reality_read_owner_original_lineage_packet_v1']);
 assert.equal(r.status,'SIGNED_ORIGINAL_LINEAGE_EXISTING_EVIDENCE_INDEPENDENTLY_READ');
 assert.equal(r.existing_packet_reused,true);
 assert.equal(r.packet_staged,false);
 assert.equal(r.source_reconciled,true);
 assert.equal(r.owner_id,owner);
 assert.equal(r.shift_id,shift);
 assert.equal(r.continuity_root_id,read.continuity_root_id);
 assert.equal(r.evidence_sha256,hash);
 assert.equal(r.original_claim_admitted,false);
});
test('foreign packet, changed canonical root and unavailable read never trigger restaging',async()=>{
 for(const invalid of [{...read,original_work_id:'work:'+'f'.repeat(32)},
  {...read,continuity_root_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'},null]){
  let calls=0;
  const r=await stageVerifiedSignedOriginalLineagePacket({db,env,gate,shiftId:shift,
   workerRunId:runner,expectedContinuityRootId:read.continuity_root_id,
   fetchImpl:async()=>{},call:async()=>{calls++;if(invalid===null)throw Error('READ_DOWN');return invalid;}});
  assert.equal(calls,1);
  assert.equal(r.packet_staged,false);
  assert.equal(r.source_reconciled,false);
 }
});
