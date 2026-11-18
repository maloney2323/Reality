import test from 'node:test';
import assert from 'node:assert/strict';
import {
  projectShiftWorkCandidates,jobEvent,persistShiftQueue,
} from '../src/reality-shift-evidence-queue-v1.js';
import { createShiftExecutionAdapters } from '../src/reality-shift-execution-bridge-v1.js';
import { createAuthorityPolicy } from '../src/reality-authority-v1.0.js';
import { runGovernedShiftRecovery } from '../src/reality-shift-recovery-loop-v1.js';
import { deriveShiftInstanceId } from '../api/reality/shift.js';

const principal='owner-A';
const root='7b8f7a7e-5c5a-4f8e-9b9e-0d6b5c2f1001';
const worldline='7b8f7a7e-5c5a-4f8e-9b9e-0d6b5c2f1002';
const candidate = id=>({
  state:'QUALIFIED',authorization_required:true,work_id:id,
  evidence_refs:['https://github.com/maloney2323/Reality/actions/runs/123'],
  execution_work_item:{
    work_item_id:id,workflow_id:'workflow:'+id,
    connector:'github',operation:'create_issue',consequential:true,
    inputs:{repository:'maloney2323/Reality',title:'Maintenance '+id,body:'Source-backed investigation'},
  },
});
const steward = (...work) => ({
  status:'OBSERVED',source:{provider:'github',repository:'maloney2323/Reality'},work,
});
function memory() {
  const rows=[];
  return {
    rows,
    appendEvent:async event=>{
      if (rows.some(x=>x.event_id===event.event_id)) throw new Error('UNIVERSE_POSTGRES_HTTP_409');
      rows.push(event);
    },
    reconstruct:async()=>rows,
  };
}
function policyFor(jobs, person=principal) {
  return createAuthorityPolicy({
    principalId:person,mode:'auto',
    scopes:jobs.map(j=>({connector:j.connector,operation:j.operation,
      resource:j.inputs.repository,work_item_id:j.work_item_id})),
    approvedBy:person,
  });
}

test('only evidence-grounded supported operations become operational work',()=>{
  const found=projectShiftWorkCandidates(steward(candidate('job-A')), {principalId:principal});
  assert.equal(found.length,1);
  assert.equal(found[0].work_item_id,'job-A');
  assert.equal(found[0].principal_id,principal);
  assert.ok(found[0].continuity_root_id.includes('-'));
  assert.deepEqual(projectShiftWorkCandidates(steward({
    ...candidate('unsafe'),evidence_refs:['https://example.org/claim'],
  }),{principalId:principal}),[]);
  assert.deepEqual(projectShiftWorkCandidates(steward({
    ...candidate('wrong-op'),
    execution_work_item:{...candidate('wrong-op').execution_work_item,operation:'transfer_money'},
  }),{principalId:principal}),[]);
  assert.deepEqual(projectShiftWorkCandidates(steward(candidate('x')),{}),[]);
});

test('discovery writes proposals but assigns a job only with exact prior authority',async()=>{
  const jobs=projectShiftWorkCandidates(steward(candidate('job-A'),candidate('job-B')),{principalId:principal});
  const db=memory();
  const first=await persistShiftQueue({
    persistence:db,candidates:jobs,principalId:principal,
    shiftRootId:root,worldlineId:worldline,hasExactAuthority:job=>job.work_item_id==='job-A',
  });
  assert.equal(first.assigned,1);
  assert.equal(first.proposed,1);
  assert.equal(db.rows.length,2);
  assert.equal(db.rows[0].entity_type,'shift_work_item');
  assert.equal(db.rows[0].payload.work_item.source_verified,true);
  const same=await persistShiftQueue({
    persistence:db,candidates:jobs,principalId:principal,
    shiftRootId:root,worldlineId:worldline,existingEvents:db.rows,
    hasExactAuthority:job=>job.work_item_id==='job-A',
  });
  assert.equal(db.rows.length,2);
  assert.equal(same.assigned,1);
  const approved=await persistShiftQueue({
    persistence:db,candidates:jobs,principalId:principal,
    shiftRootId:root,worldlineId:worldline,existingEvents:db.rows,
    hasExactAuthority:()=>true,
  });
  assert.equal(approved.assigned,2);
  assert.equal(db.rows.length,3);
  assert.equal(db.rows.at(-1).payload.state,'ASSIGNED');
  assert.equal(jobEvent(jobs[0],{state:'ASSIGNED',shiftRootId:root,worldlineId:worldline}).event_id,
    jobEvent(jobs[0],{state:'ASSIGNED',shiftRootId:root,worldlineId:worldline}).event_id);
});

test('full two-job shift passes actual existing execution-engine contract and provider readback',async()=>{
  const jobs=projectShiftWorkCandidates(steward(candidate('job-A'),candidate('job-B')),{principalId:principal});
  const recorded=[];
  const providerCalls=[];
  const bridgeFactory=()=>({
    execute:async ({workItem})=>{
      providerCalls.push(workItem.work_item_id);
      return {providerExecutionId:'provider:'+workItem.work_item_id,
        observation:{issue_number:200,title:workItem.inputs.title}};
    },
    verify:async ({workItem})=>({
      verified:true,independent:true,basis:'REALITY_OWNED_GITHUB_READBACK',
      verification_id:'verification:'+workItem.work_item_id,
      observedState:{repository:'maloney2323/Reality',
        issue_number:200,title:workItem.inputs.title,state:'open',
        url:'https://github.com/maloney2323/Reality/issues/200'},
    }),
  });
  const db=memory();
  const adapters=createShiftExecutionAdapters({
    principalId:principal,persistence:db,
    policyReader:async()=>policyFor(jobs),
    issueReader:async()=>[],
    bridgeFactory,
    record:async event=>recorded.push(event),
    loadPriorStages:async()=>recorded,
  });
  const result=await runGovernedShiftRecovery({
    shiftId:'shift-2026-11-18',loadAssignedWork:async()=>jobs,adapters,
  });
  assert.equal(result.status,'ALL_SELECTED_JOBS_VERIFIED');
  assert.equal(result.completed_count,2);
  assert.deepEqual(providerCalls,['job-A','job-B']);
  assert.equal(recorded.filter(x=>x.stage==='VERIFIED_COMPLETION').length,2);
  const replay=await runGovernedShiftRecovery({
    shiftId:'shift-2026-11-18',loadAssignedWork:async()=>jobs,adapters,
  });
  assert.equal(replay.completed_count,2);
  assert.deepEqual(providerCalls,['job-A','job-B'],'replays must not create another issue');
  assert.equal(replay.jobs[0].from_durable_receipt,true);
});

test('exact authorization and a trustworthy provider receipt are mandatory',async()=>{
  const jobs=projectShiftWorkCandidates(steward(candidate('job-A'),candidate('job-B')),{principalId:principal});
  const db=memory();
  let calls=0;
  const adapter=createShiftExecutionAdapters({
    principalId:principal,persistence:db,
    policyReader:async()=>policyFor([jobs[0]]),
    issueReader:async()=>[],
    bridgeFactory:()=>({
      execute:async()=>{calls++;return {providerExecutionId:'provider'};},
      verify:async()=>({verified:true,independent:true,verification_id:'fake',
        observedState:{repository:'maloney2323/Reality',title:jobs[0].inputs.title,state:'open',
          url:'https://attacker.example/issues/1'}}),
    }),
    record:async()=>{},
    loadPriorStages:async()=>[],
  });
  assert.equal(await adapter.authorizeWork(jobs[1]),null);
  const grant=await adapter.authorizeWork(jobs[0]);
  const execution=await adapter.executeWork(jobs[0],grant,{idempotency_key:'dedupe-1'});
  assert.equal(execution.status,'SUCCEEDED');
  assert.equal(await adapter.verifyOutcome(jobs[0],execution),null,'wrong readback URL must fail closed');
  assert.equal(calls,1);
});

test('a crash between request and receipt blocks replay of external effects',async()=>{
  const jobs=projectShiftWorkCandidates(steward(candidate('job-A')),{principalId:principal});
  const prior=[{shift_id:'shift-X',work_item_id:'job-A',continuity_root_id:jobs[0].continuity_root_id,
    stage:'EXECUTION_REQUESTED',attempt:1,detail:{}}];
  let calls=0;
  const db=memory();
  const adapter=createShiftExecutionAdapters({
    principalId:principal,persistence:db,
    policyReader:async()=>policyFor(jobs),
    issueReader:async()=>[],
    bridgeFactory:()=>({execute:async()=>{calls++;}}),
    record:async()=>{},
    loadPriorStages:async()=>prior,
  });
  const result=await runGovernedShiftRecovery({
    shiftId:'shift-X',loadAssignedWork:async()=>jobs,adapters:adapter,
  });
  assert.equal(result.jobs[0].state,'UNRESOLVED');
  assert.equal(result.jobs[0].reason,'PENDING_SIDE_EFFECT_RECONCILIATION_REQUIRED');
  assert.equal(calls,0);
});

test('all ticks in one shift share shift identity, including midnight rollover',()=>{
  const config={updated_at:'2026-11-17',shiftStart:'17:00',shiftLength:8,timeZone:'America/New_York'};
  const at17={year:'2026',month:'11',day:'18',hour:'17',minute:'00'};
  const at18={...at17,hour:'18',minute:'15'};
  const afterMidnight={...at17,day:'19',hour:'00',minute:'30'};
  assert.equal(deriveShiftInstanceId(config,at17),deriveShiftInstanceId(config,at18));
  assert.equal(deriveShiftInstanceId(config,at17),deriveShiftInstanceId(config,afterMidnight));
  assert.notEqual(deriveShiftInstanceId(config,at17),
    deriveShiftInstanceId(config,{...at17,day:'19',hour:'17'}));
});
test('an interrupted write is settled by fresh GitHub readback without creating a second issue',async()=>{
  const jobs=projectShiftWorkCandidates(steward(candidate('job-A')),{principalId:principal});
  const job=jobs[0];
  const marker=job.inputs.body.match(/<!-- reality-shift-work:[a-f0-9]{32} -->/)?.[0];
  assert.ok(marker);
  const issue={
    number:42,id:4242,body:job.inputs.body,title:job.inputs.title,
    state:'open',html_url:'https://github.com/maloney2323/Reality/issues/42',
  };
  let writes=0,reads=0;
  const adapter=createShiftExecutionAdapters({
    principalId:principal,persistence:memory(),
    policyReader:async()=>policyFor(jobs),
    bridgeFactory:()=>({execute:async()=>{writes++;}}),
    issueReader:async path=>{
      reads++;
      return path.includes('issues?') ? [issue] : issue;
    },
    record:async()=>{},
    loadPriorStages:async()=>[{
      shift_id:'shift-interrupted',work_item_id:job.work_item_id,
      continuity_root_id:job.continuity_root_id,
      stage:'EXECUTION_REQUESTED',attempt:1,detail:{},
    }],
  });
  const record=[];
  const result=await runGovernedShiftRecovery({
    shiftId:'shift-interrupted',loadAssignedWork:async()=>jobs,
    adapters:{...adapter,record:async event=>record.push(event)},
  });
  assert.equal(result.status,'ALL_SELECTED_JOBS_VERIFIED');
  assert.equal(result.completed_count,1);
  assert.equal(result.jobs[0].reconciled_from_provider,true);
  assert.equal(writes,0);
  assert.ok(reads>=2);
  assert.equal(record[0].stage,'VERIFIED_COMPLETION');
});

test('an already existing work issue is verified instead of written a second time',async()=>{
  const jobs=projectShiftWorkCandidates(steward(candidate('job-A')),{principalId:principal});
  const job=jobs[0];
  const issue={
    number:45,id:4545,body:job.inputs.body,title:job.inputs.title,
    state:'open',html_url:'https://github.com/maloney2323/Reality/issues/45',
  };
  let writes=0;
  const adapter=createShiftExecutionAdapters({
    principalId:principal,persistence:memory(),
    policyReader:async()=>policyFor(jobs),
    bridgeFactory:()=>({execute:async()=>{writes++;}}),
    issueReader:async path=>path.includes('issues?')?[issue]:issue,
    record:async()=>{},loadPriorStages:async()=>[],
  });
  const grant=await adapter.authorizeWork(job);
  const execution=await adapter.executeWork(job,grant,{idempotency_key:'same-job'});
  assert.equal(execution.status,'SUCCEEDED');
  assert.equal(execution.reused_existing_issue,true);
  assert.equal(writes,0);
  const verified=await adapter.verifyOutcome(job,execution);
  assert.equal(verified.status,'VERIFIED');
});