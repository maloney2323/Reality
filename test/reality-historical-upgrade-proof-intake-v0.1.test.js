import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {
 unpackBoundedProofArchive,loadRealGitHubPilotProof,
 persistAuthenticatedHistoricalPilotProof,
} from '../src/reality-historical-upgrade-proof-intake-v0.1.js';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';

const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'test-isolated-credential'};
const pilot='work:80f3f5a2891414a8742de7a4715b8575';
const zip='10a9eb07e75dde7297c6a4841a9131fdc1bc893b37a46ffb6d0516c7ff6c4f85';
const candidate='1f59e7b74217526225b6283d79d107456c5ab8ce9beffee9328bbed3f6893bf1';
function proof(){return {
 source:'GITHUB_ACTIONS_PINNED_PILOT_ARTIFACT',
 pilot_work_id:pilot,artifact_zip_sha256:zip,corrected_source_sha256:candidate,
 customer_original_work_id:null,verified_customer_capability_gap:false,
 verified_customer_sandbox:false,owner_warrant_issued:false,
 github_execution_authorized:false,capability_installed:false,
 original_job_completed:false,run_url:'https://github.com/maloney2323/Reality/actions/runs/40617479444',
};}
function fixture(){
 const owner=randomUUID(),conversationId=randomUUID();
 const session={user_id:owner,config:{url}};
 const scope=personalGoalScope({userId:owner,conversationId});
 const spine=createContinuitySpine({continuityRootId:scope.root,
  worldlineId:scope.worldline,subjectId:owner});
 const id='goal:confirmed-historical-pilot-test';
 const revision='goal-transition:confirmed-historical-pilot-test';
 const goal={principal_id:owner,conversation_id:conversationId,
  scope,state:{continuity_root_id:spine.continuity_root_id,
   world_id:scope.world,active_goal_id:id,
   active_goal:{goal_id:id,status:'ACTIVE',user_confirmed:true,
    last_transition_receipt_id:revision}}};
 const at=new Date('2026-10-27T22:00:00Z').toISOString();
 const root=appendContinuityNode({spine,stage:'RAW_SIGNAL',
  entityId:id,eventId:randomUUID(),effectiveTime:at,assertionTime:at,
  payload:{source:'authenticated-owner-goal'}});
 function row(node,type){return {...node,entity_type:type,
  provenance:{...node.provenance,
   continuity_spine:{prior_lineage_hash:node.prior_lineage_hash,
    transformation_receipt_id:node.transformation_receipt_id}}};}
 const records=[row(root,'raw_signal')];
 let reads=0,writes=0;
 const store={reconstruct:async()=>{reads++;return [...records]},
  appendEvent:async node=>{writes++;records.push(row(node,node.entity_type));
   return {status:'PERSISTED'}}};
 const args={session,conversationId,env,readGoal:async()=>goal,
  createPersistence:()=>store,loadProof:async()=>proof()};
 return {args,goal,records,get reads(){return reads},get writes(){return writes}};
}
test('authenticated historical proof writes and reads back one non-authorizing owner event',async()=>{
 const f=fixture();
 const first=await persistAuthenticatedHistoricalPilotProof(f.args);
 assert.equal(first.status,'HISTORICAL_PILOT_PROOF_PERSISTED_JOB_BINDING_REQUIRED');
 assert.equal(first.original_customer_work_id,null);
 assert.equal(first.github_write_authorized,false);
 assert.equal(first.original_job_completed,false);
 assert.equal(f.writes,1);
 const event=f.records.at(-1);
 assert.equal(event.entity_type,'personal_historical_upgrade_pilot_proof');
 assert.equal(event.payload.historical_pilot_proof.pilot_work_id,pilot);
 assert.equal(event.payload.original_customer_work_id,null);
 assert.equal(event.payload.warrant_allowed,false);
 assert.equal(event.payload.external_action_authorized,false);
 const second=await persistAuthenticatedHistoricalPilotProof(f.args);
 assert.equal(second.receipt_id,first.receipt_id);
 assert.equal(second.already_recorded,true);
 assert.equal(f.writes,1);
 assert.ok(f.reads>=4);
});
test('wrong owner, inactive goal and non-preview environment fail before any write',async()=>{
 const f=fixture();
 const attempts=[
  {...f.args,session:{...f.args.session,user_id:randomUUID()}},
  {...f.args,readGoal:async()=>({...f.goal,state:{...f.goal.state,
   active_goal:{...f.goal.state.active_goal,status:'PAUSED'}}})},
  {...f.args,env:{...env,VERCEL_ENV:'production'}},
  {...f.args,env:{...env,REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'other'}},
 ];
 for(const a of attempts)
  await assert.rejects(persistAuthenticatedHistoricalPilotProof(a),
   /UPGRADE_IMPORT_/);
 assert.equal(f.writes,0);
});
test('model text cannot relabel historical pilot as owner job or claim authority',async()=>{
 const f=fixture();
 for(const bad of [
  {...proof(),customer_original_work_id:'work:'+'1'.repeat(32)},
  {...proof(),verified_customer_sandbox:true},
  {...proof(),owner_warrant_issued:true},
  {...proof(),github_execution_authorized:true},
  {...proof(),artifact_zip_sha256:'e'.repeat(64)},
  {...proof(),original_job_completed:true},
 ])await assert.rejects(persistAuthenticatedHistoricalPilotProof({
  ...f.args,loadProof:async()=>bad,
 }),/UPGRADE_IMPORT_PILOT_PROOF_MUST_REMAIN_NON_AUTHORIZING/);
 assert.equal(f.writes,0);
});
test('an existing conflicting immutable event blocks an overwrite',async()=>{
 const f=fixture();
 await persistAuthenticatedHistoricalPilotProof(f.args);
 f.records.at(-1).payload.evidence_role='CANDIDATE_AUTHORIZED';
 await assert.rejects(persistAuthenticatedHistoricalPilotProof(f.args),
  /(?:RELIABILITY_HISTORY_CONTENT_HASH_INVALID|UPGRADE_IMPORT_EXISTING_EVENT_CONFLICT)/);
 assert.equal(f.writes,1);
});
test('reject provider metadata that does not prove the pinned successful GitHub run',async()=>{
 let requests=0;
 const fetchImpl=async()=>{requests++;
  return {ok:true,headers:{get:()=>null},
   arrayBuffer:async()=>Buffer.from(JSON.stringify({id:40617479444,
    repository:{full_name:'attacker/fork'},conclusion:'success'}))};};
 await assert.rejects(loadRealGitHubPilotProof({fetchImpl,env:{}}),
  /UPGRADE_IMPORT_GITHUB_RUN_OR_ARTIFACT_UNVERIFIED/);
 assert.equal(requests,2);
});
function crc32(b){let c=0xffffffff;for(const x of b){
 c^=x;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);
 }return (c^0xffffffff)>>>0}
function zipArchive(entries){
 const local=[],central=[];
 let offset=0;
 for(const [name,content] of entries){
  const n=Buffer.from(name),b=Buffer.from(content),crc=crc32(b);
  const header=Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);
  header.writeUInt16LE(0,8);header.writeUInt32LE(crc,14);
  header.writeUInt32LE(b.length,18);header.writeUInt32LE(b.length,22);
  header.writeUInt16LE(n.length,26);
  local.push(header,n,b);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);
  c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);
  c.writeUInt32LE(crc,16);c.writeUInt32LE(b.length,20);
  c.writeUInt32LE(b.length,24);c.writeUInt16LE(n.length,28);
  c.writeUInt32LE(offset,42);central.push(c,n);
  offset+=header.length+n.length+b.length;
 }
 const middle=Buffer.concat(central);
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);
 end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);
 end.writeUInt32LE(middle.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,middle,end]);
}
test('ZIP reader bounds and extracts ordinary files but rejects ZIP path traversal and tampering',()=>{
 const example=zipArchive([['candidate.mjs','export const a=1;'],
  ['independent-proof.json','{}'],['independent-verification.json','{}']]);
 const extracted=unpackBoundedProofArchive(example);
 assert.equal(extracted.get('candidate.mjs').toString(),'export const a=1;');
 assert.throws(()=>unpackBoundedProofArchive(zipArchive([
  ['candidate.mjs','1'],['candidate.mjs','2'],['independent-proof.json','{}']
 ])),/UPGRADE_IMPORT_ZIP_PATH_OR_DUPLICATE/);
 assert.throws(()=>unpackBoundedProofArchive(zipArchive([
  ['../escape','1'],['independent-proof.json','{}'],['candidate.mjs','2']
 ])),/UPGRADE_IMPORT_ZIP_PATH_OR_DUPLICATE/);
 const tampered=Buffer.from(example);
 tampered[34]^=1;
 assert.throws(()=>unpackBoundedProofArchive(tampered),
  /(?:UPGRADE_IMPORT_ZIP_CRC_MISMATCH|UPGRADE_IMPORT_ZIP_LOCAL_NAME_MISMATCH)/);
});
