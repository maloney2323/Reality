import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyApprovedBackgroundReadiness}
 from '../src/reality-approved-repair-background-readiness-v1.0.js';
const repo='maloney2323/Reality';
const preview='feature/reality-closed-loop-worker-20261031';
const workflow='.github/workflows/reality-governed-approved-scheduler-v1.yml';
const now=Date.parse('2026-10-31T18:05:00Z');
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:preview,
 REALITY_GOVERNED_SCHEDULER_ENABLED:'true'};
const run=(conclusion='success',extra={})=>({
 id:41227497421,run_number:3,path:workflow,event:'schedule',
 head_branch:'main',head_repository:{full_name:repo},
 status:'completed',conclusion,updated_at:'2026-10-31T18:03:28Z',
 ...extra,
});
const fetchWith=runs=>async(url,options)=>{
 assert.equal(options.method,'GET');
 assert.equal(options.headers.authorization,undefined);
 assert.match(url,/actions\/runs\?branch=main/);
 return {ok:true,json:async()=>({workflow_runs:runs})};
};
test('actual GitHub cron tick passes exact no-secret readiness before one customer approval',async()=>{
 const result=await verifyApprovedBackgroundReadiness({
  env,fetchImpl:fetchWith([run()]),now});
 assert.equal(result.ready,true);
 assert.equal(result.code,'GOVERNED_AUTO_WAKE_VERIFIED');
 assert.equal(result.installation_authorized,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.production_changed,false);
});
test('latest scheduler must be green, exact-main, matching repo and fresh',async()=>{
 const variations=[
  [run('failure')],
  [run('success',{head_branch:preview})],
  [run('success',{head_repository:{full_name:'untrusted/repo'}})],
  [run('success',{path:'other.yml'})],
  [run('success',{event:'pull_request'})],
  [run('success',{event:'push'})],
  [run('success',{event:'workflow_dispatch'})],
  [],
  [run('success',{updated_at:'2026-10-30T12:00:00Z'})],
  [run('success'),run('failure',{run_number:4,id:41227497422})],
 ];
 for(const runs of variations){
  const result=await verifyApprovedBackgroundReadiness({
   env,fetchImpl:fetchWith(runs),now});
  assert.equal(result.ready,false);
  assert.equal(result.original_job_completed,false);
 }
});
test('production, missing enablement and unreachable provider fail closed',async()=>{
 for(const settings of [
  {...env,VERCEL_ENV:'production'},
  {...env,VERCEL_GIT_COMMIT_REF:'main'},
  {...env,REALITY_GOVERNED_SCHEDULER_ENABLED:undefined},
 ]){
  let called=false;
  const result=await verifyApprovedBackgroundReadiness({
   env:settings,fetchImpl:async()=>{called=true;throw Error('forbidden')}});
  assert.equal(result.ready,false);
  assert.equal(called,false);
 }
 const failed=await verifyApprovedBackgroundReadiness({
  env,fetchImpl:async()=>({ok:false,status:403}),now});
 assert.equal(failed.ready,false);
});
test('owner UI and signed-in owner API still protect exact single-use approval',()=>{
 const api=readFileSync(new URL('../api/reality/personal-real-repair-install.js',
  import.meta.url),'utf8');
 const candidate=readFileSync(new URL('../api/reality/personal-real-repair-candidate.js',
  import.meta.url),'utf8');
 const ui=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(candidate,/background_preflight_passed:preflight\.ready===true/);
 assert.match(api,/REAL_INSTALL_BACKGROUND_PREREQUISITES_UNAVAILABLE/);
 assert.ok(api.indexOf('const preflight=await verifyApprovedBackgroundReadiness()')<
  api.indexOf('service.ownerApproveAndQueue'));
 assert.match(ui,/wcApproveExactInstall'\)\.disabled=!workerReady/);
 assert.match(ui,/OWNER_APPROVED_GOVERNED_SCHEDULER_QUEUED/);
 assert.match(ui,/Approval is disabled to avoid consuming authorization/);
});
