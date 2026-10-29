import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createFoundationalBuildTicket,validateFoundationalCandidate,
 createSandboxEvidenceCandidate,independentlyVerifySandbox}
 from '../src/reality-foundational-build-loop-v1.0.js';
import {createIsolatedVercelSandbox}
 from '../src/reality-foundational-vercel-sandbox-adapter-v1.0.js';
const sha=x=>createHash('sha256').update(x).digest('hex');
const commit='a'.repeat(40);
const manifest=JSON.stringify({manifest_ref:'ci-constitutional-v1',
 tests:['test/reality-governed-self-improvement-spine-v1.0.test.js']});
const ticket=createFoundationalBuildTicket({
 owner_id:'owner:test',goal_id:'goal:verified',goal_evidence_ref:'continuity:user:verified',
 goal_transition_receipt_ref:'continuity:goal:verified',
 original_work_id:'work:'+'c'.repeat(32),
 continuity_root_id:'root:verified',worldline_id:'worldline:verified',
 confirmed_gap_receipt_ref:'provider:missing-capability',
 confirmed_gap_evidence_hash:'sha256:provider-gap',
 confirmed_gap_source:'INDEPENDENT_PROVIDER_READBACK',
 frozen_regression_manifest_ref:'ci-constitutional-v1',
 frozen_regression_sha256:sha(manifest),repository_base_sha:commit,
 environment:'ISOLATED_PREVIEW',max_attempts:2,
 allowed_source_roots:['src/reality-extensions/','test/reality-extensions/'],
});
const model={ticket_hash:ticket.ticket_hash,original_work_id:ticket.original_work_id,
 rationale:'Source-linked actual missing instrument',
 files:[
  {path:'src/reality-extensions/fixed-capability.mjs',
   content:'export function useful(){return true}'},
  {path:'test/reality-extensions/fixed-capability.test.js',
   content:'import test from "node:test";test("real",()=>{})'},
 ]};
const candidate=validateFoundationalCandidate(ticket,model);
function fake({badSha=false,secret=false,providerLie=false,failed=false}={}){
 const calls=[],commands=new Map();let sequence=0,stopped=false,network='allow-all';
 const sandbox={
  currentSession:()=>({sessionId:'sbx_verified_123'}),
  update:async({networkPolicy})=>{calls.push('deny:'+networkPolicy);network=networkPolicy},
  async runCommand(opts){
   calls.push(opts.cmd+' '+opts.args[0]);
   const id='cmd_'+ ++sequence;
   const isSha=opts.cmd==='git';
   const isEnv=opts.cmd==='node'&&opts.args[0]==='-e'&&
    opts.args[1].includes('Object.keys(process.env)');
   const isTest=opts.cmd==='node'&&opts.args[0]==='--test';
   if(isTest)assert.equal(network,'deny-all');
   const code=isEnv&&secret?45:isTest&&failed?1:0;
   const output=isSha?(badSha?'b'.repeat(40):commit):
    isTest?'# tests 2\n# pass '+(failed?1:2)+'\n# fail '+(failed?1:0):'';
   const cmd={id,exitCode:code,stdout:async()=>output,stderr:async()=>''};
   commands.set(id,{id,exitCode:code});
   return cmd;
  },
  async readFileToBuffer({path}){
   assert.equal(network,'deny-all');
   assert.match(path,/ci-constitutional-v1\.json$/);
   return Buffer.from(manifest);
  },
  async writeFiles(files){
   calls.push('write');
   assert.equal(network,'deny-all');
   assert.equal(files.length,2);
   assert.ok(files.every(x=>x.path.startsWith('/vercel/Reality/')));
  },
  async getCommand(id){
   calls.push('getCommand:'+id);
   const c=commands.get(id);
   return c&&providerLie?{...c,exitCode:41}:c;
  },
  async stop(){stopped=true;calls.push('stop')},
 };
 const Client={async create(options){
  calls.push('create');
  assert.equal(options.persistent,false);
  assert.equal(options.networkPolicy,'allow-all');
  assert.equal(options.source.revision,commit);
  assert.equal(options.resources.vcpus,1);
  assert.equal(Object.prototype.hasOwnProperty.call(options,'env'),false);
  return sandbox;
 }};
 return {Client,calls,commands,get stopped(){return stopped}};
}
async function run(h){
 const adapter=createIsolatedVercelSandbox({SandboxClient:h.Client});
 const report=await adapter.isolatedSandbox({ticket,candidate,attempt:1,
  frozen_suite_ref:ticket.frozen_regression_manifest_ref,
  network_permitted:false,secrets_permitted:false});
 const preliminary=createSandboxEvidenceCandidate(ticket,candidate,report);
 return {report,adapter,preliminary};
}
test('real Vercel microVM adapter closes egress BEFORE any model bytes are written',async()=>{
 const h=fake(),{report,adapter,preliminary}=await run(h);
 assert.equal(report.exit_code,0);
 assert.equal(report.network_disabled,true);
 assert.equal(report.secrets_mounted,false);
 assert.equal(report.governance_tests_passed,true);
 const verified=await independentlyVerifySandbox(ticket,candidate,preliminary,{
  readback:adapter.independentReadback});
 assert.equal(verified.independently_verified,true);
 assert.match(verified.attestation_ref,/vercel:provider-verified:sbx_verified_123/);
 assert.equal(h.stopped,true);
 assert.ok(h.calls.indexOf('deny:deny-all')<h.calls.indexOf('write'));
 assert.equal(h.calls.filter(x=>x.startsWith('getCommand:')).length,2);
});
test('preexisting source SHA mismatch is blocked, and sandbox is stopped',async()=>{
 const h=fake({badSha:true});
 await assert.rejects(run(h),/FOUNDATION_SANDBOX_REPOSITORY_SHA_MISMATCH/);
 assert.equal(h.stopped,true);
 assert.equal(h.calls.includes('write'),false);
});
test('VM with any bearer credential is rejected before model bytes',async()=>{
 const h=fake({secret:true});
 await assert.rejects(run(h),/FOUNDATION_SANDBOX_ENVIRONMENT_CREDENTIAL_PRESENT/);
 assert.equal(h.stopped,true);
 assert.equal(h.calls.includes('write'),false);
});
test('provider readback cannot be replaced by model assertions',async()=>{
 const h=fake({providerLie:true}),{adapter,preliminary}=await run(h);
 await assert.rejects(independentlyVerifySandbox(ticket,candidate,preliminary,{
  readback:adapter.independentReadback}),
 /FOUNDATION_SANDBOX_PROVIDER_COMMAND_READBACK_MISMATCH/);
 assert.equal(h.stopped,true);
});
test('a genuine failed test stays failed and cannot install',async()=>{
 const h=fake({failed:true}),{report,adapter,preliminary}=await run(h);
 assert.equal(report.exit_code,1);
 const p=await independentlyVerifySandbox(ticket,candidate,preliminary,{
  readback:adapter.independentReadback});
 assert.equal(p.passed,false);
 assert.equal(h.stopped,true);
});
test('unauthorized network, foreign scope, and stale attempts fail before sandbox creation',async()=>{
 const h=fake(),a=createIsolatedVercelSandbox({SandboxClient:h.Client});
 for(const change of [{network_permitted:true},{secrets_permitted:true},{attempt:3}]){
  await assert.rejects(a.isolatedSandbox({ticket,candidate,attempt:1,
   frozen_suite_ref:ticket.frozen_regression_manifest_ref,
   network_permitted:false,secrets_permitted:false,...change}),
  /FOUNDATION_VERCEL_SANDBOX_SCOPE_NOT_AUTHORIZED/);
 }
 assert.deepEqual(h.calls,[]);
});
