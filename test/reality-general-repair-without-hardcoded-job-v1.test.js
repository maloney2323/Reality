import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {
  GENERIC_REDESIGN_AUTHORIZATION_SCOPE,
  isVerifiedRedesignScope,
} from '../src/reality-recovery-authorization-scope-v1.0.js';

test('Reality main interface uses only the general owner-scoped governed-work queue',()=>{
  const html=readFileSync('index.html','utf8');
  for(const [,script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
    new vm.Script(script);
  assert.match(html,/class="repair-center"/);
  assert.match(html,/id="wcRepairConsentDialog"/);
  assert.match(html,/Installation always requires your approval/);
  assert.match(html,/id="wcInspectGovernedBuild"/);
  assert.match(html,/id="wcStartGovernedBuild"[^>]*disabled/);
  assert.match(html,/QUEUE_SAFE_AUTONOMOUS_DISCOVERY/);
  assert.doesNotMatch(html,/#178|FirstGap178|FirstUpgrade178|personal-first-upgrade-178/);
});
test('no special-case original job schedule and all general shifts remain intact',()=>{
  const config=JSON.parse(readFileSync('vercel.json','utf8'));
  const paths=config.crons.map(c=>c.path);
  assert.equal(paths.includes('/api/reality/shift'),true);
  assert.equal(paths.includes('/api/reality/stewardship'),true);
  assert.equal(paths.some(x=>/first.*178|job.*178/.test(x)),false);
});
test('constitutional engine contains no job number or special-case authorization literal',()=>{
  const source=readFileSync('src/reality-governed-self-improvement-spine-v1.0.js','utf8');
  assert.doesNotMatch(source, /#178|ORIGINAL178|original.?178/i);
  assert.match(source,/scope\.original_work_id/);
  assert.match(source,/independent_provider_readback/);
  assert.match(source,/SELF_IMPROVEMENT_GOVERNED_RECOVERY_RESERVATION_REQUIRED/);
});
test('new work uses generic owner authorization; archival scope can only verify existing history',()=>{
  assert.equal(GENERIC_REDESIGN_AUTHORIZATION_SCOPE,'ONE_ORIGINAL_WORK_REDESIGN_ATTEMPT');
  assert.equal(isVerifiedRedesignScope(GENERIC_REDESIGN_AUTHORIZATION_SCOPE),true);
  assert.equal(isVerifiedRedesignScope('ONE_ORIGINAL178_REDESIGN_ATTEMPT'),false);
  assert.equal(isVerifiedRedesignScope('ONE_ORIGINAL178_REDESIGN_ATTEMPT',{historicalReceipt:true}),true);
  assert.equal(isVerifiedRedesignScope('ARBITRARY_FAKE_OWNER_APPROVAL',{historicalReceipt:true}),false);
});

test('legacy issue-specific execution routes are retired rather than remaining alternate workers',()=>{
  const oldRoutes=[
    'personal-first-upgrade-178.js',
    'personal-first-upgrade-178-run.js',
    'personal-first-upgrade-178-execute.js',
    'personal-first-upgrade-178-recovery.js',
    'personal-first-upgrade-178-redesign.js',
    'personal-first-upgrade-178-approve.js',
    'personal-first-upgrade-178-background.js',
    'personal-first-upgrade-178-dispatch.js',
  ];
  for(const route of oldRoutes){
    const source=readFileSync('api/reality/'+route,'utf8');
    const handler=source.slice(source.indexOf('export default async function handler'));
    assert.match(handler,/LEGACY_SINGLE_JOB_EXECUTION_RETIRED/,route);
    assert.match(handler,/status\(410\)/,route);
    assert.match(handler,/original_job_completed:false/,route);
  }
});
