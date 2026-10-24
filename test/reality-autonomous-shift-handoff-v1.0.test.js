import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 validateCronCredential,autonomousShiftSlot,projectAutonomousShiftHome,authorizeShiftConfigWrite,authorizeManualShiftRun,
} from '../src/reality-autonomous-shift-control-v1.0.js';
const secret='a-value-with-at-least-32-characters-to-check';
const cfg={enabled:true,readinessTime:'16:30',shiftStart:'17:00',
 shiftLength:8,timeZone:'America/New_York',updated_by:'signed-owner-1'};
const scope={continuity_root_id:'root:real-shift',worldline_id:'world:real-shift'};
const event=(id,when,items,options={})=>({
 event_id:id,continuity_root_id:options.root||scope.continuity_root_id,
 worldline_id:options.world||scope.worldline_id,
 event_kind:'observation',entity_type:'shift_result',assertion_time:when,
 payload:{tick_id:'shift:'+id,evidence_summary:{discovered_work:items}},
});
test('only exact bearer cron secret passes, never arbitrary bearer or spoofed user agent',()=>{
 assert.equal(validateCronCredential({headers:{authorization:'Bearer '+secret}},secret).ok,true);
 for(const headers of [
  {},{'user-agent':'vercel-cron/1.0'},
  {authorization:'Bearer bad'},
  {authorization:'Bearer '+secret+'x'},
  {authorization:'Basic '+secret},
  {authorization:'Bearer '+secret.slice(0,-1)+'!'},
  {authorization:'Bearer '+secret,'user-agent':'spoof'},
 ]) {
  const verified=validateCronCredential({headers},secret);
  if(headers.authorization==='Bearer '+secret)assert.equal(verified.ok,true);
  else assert.equal(verified.ok,false);
 }
 assert.equal(validateCronCredential({headers:{authorization:'Bearer '+secret}},undefined).http,503);
});
test('enabled Eastern shift 16:30 readiness and 17:00 start tolerate runtime minutes',()=>{
 const read=autonomousShiftSlot({config:cfg,now:new Date('2026-10-24T20:32:45Z')});
 assert.equal(read.phase,'READINESS');
 assert.equal(read.scheduled_slot,'2026-10-24T16:30:00[America/New_York]');
 assert.equal(read.cron_delay_tolerated_minutes,2);
 const started=autonomousShiftSlot({config:cfg,now:new Date('2026-10-24T21:06:45Z')});
 assert.equal(started.phase,'SHIFT_START');
 const active=autonomousShiftSlot({config:cfg,now:new Date('2026-10-24T21:17:00Z')});
 assert.equal(active.phase,'OPERATING');
 const waiting=autonomousShiftSlot({config:cfg,now:new Date('2026-10-24T18:00:00Z')});
 assert.equal(waiting.phase,null);
});
test('nonquarter hour input is rounded to next scheduled 15m slot, no unexpected earlier start',()=>{
 const custom={...cfg,readinessTime:'16:35',shiftStart:'17:05'};
 assert.equal(autonomousShiftSlot({config:custom,now:new Date('2026-10-24T20:35:00Z')}).phase,null);
 assert.equal(autonomousShiftSlot({config:custom,now:new Date('2026-10-24T20:46:00Z')}).phase,'READINESS');
 assert.equal(autonomousShiftSlot({config:custom,now:new Date('2026-10-24T21:15:00Z')}).phase,'SHIFT_START');
});
test('disabled shift cannot be triggered even at a matching schedule slot',()=>{
 assert.equal(autonomousShiftSlot({config:{...cfg,enabled:false},now:new Date('2026-10-24T21:00:00Z')}).status,'DISABLED');
});
test('Home only reveals saved work to the original signed owner session',()=>{
 const data=[event('a','2026-10-24T20:32:00Z',[{work_id:'w-a',title:'Found task'}])];
 const notOwner=projectAutonomousShiftHome({config:cfg,scope,events:data,principalId:'someone-else'});
 assert.equal(notOwner.status,'OWNER_SESSION_REQUIRED');
 assert.equal(notOwner.work.length,0);
 const owner=projectAutonomousShiftHome({config:cfg,scope,events:data,principalId:'signed-owner-1'});
 assert.equal(owner.status,'RECORDED');
 assert.equal(owner.work[0].title,'Found task');
 assert.equal(owner.work[0].external_effects_executed,false);
});
test('Home shows most recent observation per work ID without inventing execution receipts',()=>{
 const data=[
  event('old','2026-10-24T15:00:00Z',[{work_id:'w-a',title:'Old title',status:'VERIFIED'}]),
  event('new','2026-10-24T21:00:00Z',[{work_id:'w-a',title:'New version',status:'COMPLETED',consequential:true},
   {work_id:'w-b',title:'Needs decision',proposed_next_action:'REQUEST_EXPLICIT_AUTHORITY'}]),
 ];
 const owner=projectAutonomousShiftHome({config:cfg,scope,events:data,principalId:cfg.updated_by});
 assert.equal(owner.work.length,2);
 assert.equal(owner.work[0].title,'New version');
 assert.equal(owner.work[0].status,'DISCOVERED');
 assert.equal(owner.verified_execution_count,0);
 assert.equal(owner.attention.length,2);
 assert.equal(owner.recent_shifts,2);
});
test('Home refuses wrong worldline, wrong root and unsupported event types',()=>{
 const data=[
  event('x','2026-10-24T19:00:00Z',[{work_id:'x'}],{root:'another-root'}),
  event('y','2026-10-24T19:00:00Z',[{work_id:'y'}],{world:'another-world'}),
  {...event('z','2026-10-24T19:00:00Z',[{work_id:'z'}]),entity_type:'shift_tick'},
 ];
 const result=projectAutonomousShiftHome({config:cfg,scope,events:data,principalId:cfg.updated_by});
 assert.equal(result.status,'NO_RECORDED_SHIFT');
 assert.deepEqual(result.work,[]);
});
test('a saved enabled config with no shift ticks is visibly unverified, not shown as done',()=>{
 const r=projectAutonomousShiftHome({config:cfg,scope,events:[],principalId:cfg.updated_by});
 assert.equal(r.status,'NO_RECORDED_SHIFT');
 assert.equal(r.verified_execution_count,0);
});
test('runtime code actually passes a structured Universe object, never JSON-stringifies the evidence',()=>{
 const code=readFileSync(new URL('../api/reality/shift.js',import.meta.url),'utf8');
 assert.match(code,/systemContext: \{ shift_config: config, shift_evidence: evidence, connected_world_observations:/);
 assert.doesNotMatch(code,/systemContext: JSON\.stringify/);
 assert.match(code,/validateCronCredential\(req, process\.env\.CRON_SECRET\)/);
 assert.doesNotMatch(code,/function cronRequest/);
});
test('Home auto refreshes persisted work but does not execute a discovered task on load',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/async function refreshSavedShiftHome/);
 assert.match(html,/refreshSavedShiftHome\(\);/);
 assert.match(html,/fetch\('\/api\/reality\/shift',\{cache:'no-store'\}\)/);
 const onload=html.split('async function refreshSavedShiftHome')[1].split('</script>')[0];
 assert.doesNotMatch(onload,/fetch\('\/api\/reality\/(?:execute|authority|intelligence)'/);
});

test('global shift settings cannot be seized or toggled by a fresh anonymous session',()=>{
 const current={updated_by:'signed-owner-1',enabled:true};
 assert.equal(authorizeShiftConfigWrite({existingConfig:current,principalId:'signed-owner-1'}).ok,true);
 assert.equal(authorizeShiftConfigWrite({existingConfig:current,principalId:'attacker'}).ok,false);
 assert.equal(authorizeShiftConfigWrite({existingConfig:null,principalId:'attacker'}).ok,false);
 assert.equal(authorizeShiftConfigWrite({existingConfig:null,principalId:'new-owner',
  bootstrapPrincipalId:'new-owner'}).ok,true);
 assert.equal(authorizeShiftConfigWrite({existingConfig:{},principalId:'new-owner',
  bootstrapPrincipalId:'new-owner'}).ok,false);
 const code=readFileSync(new URL('../api/reality/shift.js',import.meta.url),'utf8');
 assert.match(code,/authorizeShiftConfigWrite\(\{/);
 assert.match(code,/if \(!auth\.ok\) return json\(res, 403/);
});

test('only signed original owner can initiate one manual discovery cycle',()=>{
 assert.equal(authorizeManualShiftRun({config:cfg,principalId:'signed-owner-1'}).ok,true);
 assert.equal(authorizeManualShiftRun({config:cfg,principalId:'not-the-owner'}).ok,false);
 assert.equal(authorizeManualShiftRun({config:cfg,principalId:null}).ok,false);
 assert.equal(authorizeManualShiftRun({config:{...cfg,enabled:false},principalId:'signed-owner-1'}).ok,false);
 assert.equal(authorizeManualShiftRun({config:null,principalId:'signed-owner-1'}).ok,false);
});
test('manual entry is checked before configuration writes and never bypasses cron authentication',()=>{
 const code=readFileSync(new URL('../api/reality/shift.js',import.meta.url),'utf8');
 assert.match(code,/req\\.body\\?\\.action === 'RUN_ONCE_NOW'/);
 assert.match(code,/authorizeManualShiftRun\\(\\{config,principalId:principal\\.principal_id\\}\\)/);
 assert.match(code,/SHIFT_SAME_ORIGIN_REQUIRED/);
 assert.match(code,/runTick\\(\\{\\s*config, phase:'MANUAL', local:time\\.local/);
 assert.match(code,/validateCronCredential\\(req, process\\.env\\.CRON_SECRET\\)/);
 assert.ok(code.indexOf('RUN_ONCE_NOW')<code.indexOf('if (!auth.ok) return json(res, 403'));
});
test('shift tick replay is checked before any model call, and result follows ledger tail',()=>{
 const code=readFileSync(new URL('../api/reality/shift.js',import.meta.url),'utf8');
 const claim=code.slice(code.indexOf('async function runTick'),code.indexOf('export default async function handler'));
 assert.ok(claim.indexOf('priorShift.some(e => e.event_id === tickId)')<claim.indexOf("await githubCommits()"));
 assert.ok(claim.indexOf('priorShift.some(e => e.event_id === tickId)')<claim.indexOf('runLiveIntelligenceOrchestration'));
 assert.match(claim,/entity_type: 'shift_result'[\\s\\S]*?parent_event_id: null/);
 assert.doesNotMatch(claim,/parent_event_id: tickId/);
 assert.match(claim,/seenObservationIds\\.has\\(o\\.observation_id\\)/);
});
test('Home manual run requires persisted receipt readback before claiming success',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="runShiftNow"/);
 assert.match(html,/action:'RUN_ONCE_NOW'/);
 assert.match(html,/saved\\.home\\.latest_tick_id!==result\\.result\\?\\.tick_id/);
 assert.match(html,/SHIFT_RESULT_NOT_YET_READ_BACK_VERIFIED/);
 assert.match(html,/No work execution verified/);
});
