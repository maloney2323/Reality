// Direct trusted Vercel Sandbox adapter for Reality's EXISTING foundational
// model -> sandbox -> independent provider readback contract.
// This replaces the need for a second GitHub worker dispatch credential.
// No generated source is ever evaluated in the Vercel Function process.
import {createHash} from 'node:crypto';
import {validateFoundationalCandidate} from './reality-foundational-build-loop-v1.0.js';
export const VERCEL_SANDBOX_UPGRADE_ADAPTER_VERSION='reality-vercel-isolated-upgrade-v1';
const hash=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(canonical):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));
const digest=x=>hash(JSON.stringify(canonical(x)));
const die=why=>{throw Error(why)};
const asString=x=>typeof x==='string'?x:'';
const counts=output=>{
 const found=key=>{const m=[...String(output).matchAll(
  new RegExp('^# '+key+' (\\d+)$','gm'))].at(-1);return m?Number(m[1]):0};
 return {tests:found('tests'),pass:found('pass'),fail:found('fail')};
};
// Provider-command output is untrusted diagnostic DATA. Preserve independent
// failing assertions, their expected/actual values and stack before any tail.
export function extractSandboxFailureEvidence(frozenOutput,modelOutput,max=8000){
 const sections=[];
 for(const [kind,raw] of [['FROZEN',frozenOutput],['MODEL_CANDIDATE',modelOutput]]){
  const lines=String(raw||'').split(/\r?\n/);
  const failing=[];
  for(let i=0;i<lines.length;i++){
   if(!/^not ok\s+\d+\s+-\s+/.test(lines[i].trim()))continue;
   const group=[lines[i]];
   let count=0;
   for(let j=i+1;j<lines.length&&count<45;j++){
    if(/^\s*(?:ok|not ok)\s+\d+\s+-\s+/.test(lines[j]))break;
    if(/^\s*# (?:Subtest:|tests |pass |fail |duration_ms )/.test(lines[j]))break;
    group.push(lines[j]);count++;
    if(/^\s*\.\.\.\s*$/.test(lines[j]))break;
   }
   failing.push(group.join('\n'));
   if(failing.length===8)break;
  }
  const counts=lines.filter(x=>/^# (?:tests|pass|fail) \d+/.test(x)).slice(-3);
  const reason=failing.length?failing.join('\n'):
   lines.filter(x=>/SyntaxError|ReferenceError|ERR_ASSERTION|ERR_MODULE_NOT_FOUND|Error:/i.test(x)).slice(0,14).join('\n');
  sections.push('['+kind+' independent sandbox diagnostics]\n'+
   (reason||'No per-test failure block in returned command output')+
   '\n'+counts.join('\n'));
 }
 const all=sections.join('\n');
 // Preserve early failing tests instead of truncating the first assertion.
 return all.slice(0,Math.max(500,Math.min(12000,max)));
}
const GITHUB='https://github.com/maloney2323/Reality';
const BASE='/vercel/Reality';
const secureManifest=({raw,ticket})=>{
 if(hash(raw)!==ticket.frozen_regression_sha256)
  die('FOUNDATION_SANDBOX_FROZEN_SUITE_CHANGED');
 let manifest;try{manifest=JSON.parse(raw)}catch{die('FOUNDATION_SANDBOX_MANIFEST_INVALID')}
 if(manifest?.manifest_ref!==ticket.frozen_regression_manifest_ref||
  !Array.isArray(manifest.tests)||manifest.tests.length<1||
  manifest.tests.length>25||new Set(manifest.tests).size!==manifest.tests.length||
  !manifest.tests.includes('test/reality-governed-self-improvement-spine-v1.0.test.js')||
  manifest.tests.some(p=>typeof p!=='string'||
   !/^test\/[A-Za-z0-9._\/-]+\.test\.js$/.test(p)||
   p.split('/').includes('..')||p.split('/').includes('.')))
  die('FOUNDATION_SANDBOX_FROZEN_TESTS_INVALID');
 return manifest;
};
// SDK is injected for hermetic contract tests; production supplies the
// published @vercel/sandbox Sandbox client through the existing Vercel OIDC.
// The VM is created with no environment secrets and network is shut off before
// model files are uploaded, tests imported, or any model source runs.
export function createIsolatedVercelSandbox({SandboxClient,timeout=180000,
 providerAuth=null}={}){
 if(!SandboxClient||typeof SandboxClient.create!=='function')
  die('FOUNDATION_VERCEL_SANDBOX_CLIENT_REQUIRED');
 if(providerAuth!==null&&(
   typeof providerAuth.token!=='string'||providerAuth.token.length<25||
   !/^[A-Za-z0-9_-]{10,160}$/.test(providerAuth.teamId||'')||
   !/^prj_[A-Za-z0-9]{10,64}$/.test(providerAuth.projectId||'')))
  die('FOUNDATION_EXTERNAL_SANDBOX_AUTH_INVALID');
 if(!Number.isInteger(timeout)||timeout<60000||timeout>300000)
  die('FOUNDATION_VERCEL_SANDBOX_TIMEOUT_INVALID');
 const pending=new Map();
 const isolatedSandbox=async({ticket,candidate,attempt,frozen_suite_ref,
  network_permitted,secrets_permitted})=>{
  if(ticket?.environment!=='ISOLATED_PREVIEW'||network_permitted!==false||
     secrets_permitted!==false||frozen_suite_ref!==ticket?.frozen_regression_manifest_ref||
     !Number.isInteger(attempt)||attempt<1||attempt>ticket.max_attempts||
     !/^[a-f0-9]{40}$/.test(ticket.repository_base_sha))
   die('FOUNDATION_VERCEL_SANDBOX_SCOPE_NOT_AUTHORIZED');
  const valid=validateFoundationalCandidate(ticket,candidate);
  if(valid.artifact_sha256!==candidate.artifact_sha256)
   die('FOUNDATION_VERCEL_SANDBOX_MODEL_BYTES_CHANGED');
  let sandbox;
  try{
   sandbox=await SandboxClient.create({
    persistent:false,timeout,resources:{vcpus:1},
    ...(providerAuth?{token:providerAuth.token,
     teamId:providerAuth.teamId,projectId:providerAuth.projectId}:{}),
    networkPolicy:'allow-all',
    source:{type:'git',url:GITHUB,depth:1,revision:ticket.repository_base_sha},
   });
   // This is a built-in Vercel microVM. It may fetch only the pinned,
   // publicly available BASE source during provisioning, before model code
   // is uploaded. No API keys, model prompts or owner data enter the VM.
   await sandbox.update({networkPolicy:'deny-all'});
   const sha=await sandbox.runCommand({cmd:'git',args:['rev-parse','HEAD'],cwd:BASE});
   if(sha.exitCode!==0||(await sha.stdout()).trim()!==ticket.repository_base_sha)
    die('FOUNDATION_SANDBOX_REPOSITORY_SHA_MISMATCH');
   const env=await sandbox.runCommand({cmd:'node',cwd:BASE,args:['-e',
    'const keys=Object.keys(process.env).filter(k=>/OPENAI|SUPABASE|GITHUB_TOKEN|VERCEL_OIDC_TOKEN|VERCEL_TOKEN|SECRET_KEY/.test(k));if(keys.length){process.exit(45)}']});
   if(env.exitCode!==0)die('FOUNDATION_SANDBOX_ENVIRONMENT_CREDENTIAL_PRESENT');
   const mf=await sandbox.readFileToBuffer({path:BASE+'/test/reality-frozen-regressions/'+
    ticket.frozen_regression_manifest_ref+'.json'});
   if(!mf)die('FOUNDATION_SANDBOX_FROZEN_MANIFEST_MISSING');
   const manifest=secureManifest({raw:mf.toString('utf8'),ticket});
   const written=candidate.files.filter(f=>!f.path.startsWith('docs/'));
   if(written.length<2)die('FOUNDATION_SANDBOX_SOURCE_AND_TEST_REQUIRED');
   // Check BEFORE writing; models cannot override base, policy, or fixtures.
   const check=await sandbox.runCommand({cmd:'node',cwd:BASE,
    args:['-e',
     'const fs=require("node:fs");const p=require("node:path");const xs=JSON.parse(process.argv[1]);if(xs.some(x=>fs.existsSync(p.join(process.cwd(),x))))process.exit(39)',
     JSON.stringify(written.map(f=>f.path))]});
   if(check.exitCode!==0)die('FOUNDATION_SANDBOX_BASE_FILE_OVERWRITE_DENIED');
   await sandbox.writeFiles(written.map(f=>({
    path:BASE+'/'+f.path,content:Buffer.from(f.content,'utf8'),
   })));
   const tests=candidate.files.filter(f=>f.path.startsWith('test/')).map(f=>f.path);
   const run=async paths=>{
    const cmd=await sandbox.runCommand({cmd:'node',cwd:BASE,
     args:['--test','--test-reporter=tap',...paths]});
    const output=(asString(await cmd.stdout())+'\n'+asString(await cmd.stderr())).slice(-12000);
    return {cmd,output,counts:counts(output)};
   };
   const frozen=await run(manifest.tests);
   const model=await run(tests);
   const session=sandbox.currentSession?.();
   const sessionId=session?.sessionId||session?.id;
   // @vercel/sandbox v3 returns CommandFinished.cmdId (not .id).
   // Do not synthesize IDs from model output or fabricate provider receipts.
   const frozenId=frozen.cmd?.cmdId,modelId=model.cmd?.cmdId;
   if(typeof sessionId!=='string'||!sessionId.startsWith('sbx_')||
      typeof frozenId!=='string'||!frozenId.startsWith('cmd_')||
      typeof modelId!=='string'||!modelId.startsWith('cmd_')||
      frozenId===modelId)
    die('FOUNDATION_SANDBOX_PROVIDER_COMMAND_ID_REQUIRED');
   const report={
    ticket_hash:ticket.ticket_hash,artifact_sha256:candidate.artifact_sha256,
    environment:'ISOLATED_NO_SECRET_CONTAINER',
    network_disabled:true,secrets_mounted:false,production_write_permitted:false,
    frozen_suite_sha256:ticket.frozen_regression_sha256,
    frozen_test_manifest_ref:ticket.frozen_regression_manifest_ref,
    frozen_test_count:frozen.counts.tests,frozen_test_pass_count:frozen.counts.pass,
    governance_tests_passed:frozen.cmd.exitCode===0&&frozen.counts.tests>0&&
     frozen.counts.fail===0,
    exit_code:frozen.cmd.exitCode===0&&model.cmd.exitCode===0?0:1,
    test_results:[
     {kind:'FROZEN',passed:frozen.cmd.exitCode===0&&
       frozen.counts.tests>0&&frozen.counts.fail===0},
     {kind:'MODEL_CANDIDATE',passed:model.cmd.exitCode===0&&
       model.counts.tests>0&&model.counts.fail===0},
    ],
    log_excerpt:extractSandboxFailureEvidence(frozen.output,model.output),
    runner_receipt_ref:'vercel-sandbox:'+sessionId+':'+modelId+':'+attempt,
   };
   const reportHash=digest(report);
   pending.set(reportHash,{sandbox,report,sessionId,
    commands:[frozenId,modelId],artifact_hash:candidate.artifact_sha256});
   return report;
  }catch(error){
   if(sandbox)await sandbox.stop().catch(()=>{});
   throw error;
  }
 };
 const independentReadback=async request=>{
  const ref=pending.get(request.report_hash);
  if(!ref||ref.artifact_hash!==request.artifact_sha256||
     ref.report.ticket_hash!==request.ticket_hash||
     ref.report.runner_receipt_ref!==request.runner_receipt_ref||
     ref.report.frozen_suite_sha256!==request.frozen_suite_sha256)
   die('FOUNDATION_SANDBOX_PROVIDER_REPORT_UNKNOWN');
  pending.delete(request.report_hash);
  try{
   // Re-read command exit codes from Vercel's provider API, not the model's
   // stdout assertion. Every sandbox run is an independently identified command.
   const [frozen,model]=await Promise.all(
    ref.commands.map(id=>ref.sandbox.getCommand(id)));
   const expected=ref.report.test_results;
   if(!frozen||!model||
      frozen.cmdId!==ref.commands[0]||model.cmdId!==ref.commands[1]||
      (frozen.exitCode===0)!==expected[0].passed||
      (model.exitCode===0)!==expected[1].passed)
    die('FOUNDATION_SANDBOX_PROVIDER_COMMAND_READBACK_MISMATCH');
   return Object.freeze({
    independent_provider_readback:true,
    report_hash:request.report_hash,runner_receipt_ref:request.runner_receipt_ref,
    artifact_sha256:request.artifact_sha256,ticket_hash:request.ticket_hash,
    attestation_ref:'vercel:provider-verified:'+ref.sessionId+':'+ref.commands.join(':'),
   });
  }finally{await ref.sandbox.stop().catch(()=>{})}
 };
 return Object.freeze({isolatedSandbox,independentReadback});
}
