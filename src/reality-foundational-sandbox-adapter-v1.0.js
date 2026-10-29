// Trusted no-secret CI sandbox. Candidate bytes are copied as inert data on
// host, NEVER executed on host. Only no-network Docker evaluates model source.
import {mkdtempSync,cpSync,existsSync,readFileSync,writeFileSync,mkdirSync,rmSync,chmodSync}
 from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
import {validateFoundationalCandidate}
 from './reality-foundational-build-loop-v1.0.js';
const sha=s=>createHash('sha256').update(s).digest('hex');
const deny=why=>{throw Error(why)};
const testPath=p=>typeof p==='string'&&
 /^test\/[a-zA-Z0-9._/-]+\.test\.js$/.test(p)&&
 !p.split('/').includes('..')&&!p.includes('//')&&!p.split('/').includes('.');
const pinned=image=>typeof image==='string'&&/^node@sha256:[a-f0-9]{64}$/.test(image);
const counts=text=>{
 const num=name=>{const m=[...String(text||'')
  .matchAll(new RegExp('^# '+name+' (\\d+)$','gm'))].at(-1);
  return m?Number(m[1]):0;};
 return {tests:num('tests'),pass:num('pass'),fail:num('fail')};
};
export function validateTrustedFrozenSuite(ticket,raw,root){
 if(typeof raw!=='string'||sha(raw)!==ticket.frozen_regression_sha256)
  deny('FOUNDATION_FROZEN_MANIFEST_CHANGED');
 let manifest;try{manifest=JSON.parse(raw)}catch{deny('FOUNDATION_FROZEN_MANIFEST_INVALID')}
 if(manifest?.manifest_ref!==ticket.frozen_regression_manifest_ref||
  !Array.isArray(manifest.tests)||manifest.tests.length<1||
  manifest.tests.length>25||new Set(manifest.tests).size!==manifest.tests.length)
  deny('FOUNDATION_FROZEN_MANIFEST_SCOPE_INVALID');
 for(const p of manifest.tests)
  if(!testPath(p)||!existsSync(join(root,p)))
   deny('FOUNDATION_FROZEN_TEST_NOT_IN_BASE');
 if(!manifest.tests.includes('test/reality-governed-self-improvement-spine-v1.0.test.js'))
  deny('FOUNDATION_CONSTITUTIONAL_FROZEN_REGRESSION_MISSING');
 return manifest;
}
export function createIsolatedDockerSandbox({workspace,image,spawn=spawnSync,
 readBaseSha=root=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()}={}){
 if(!pinned(image))deny('FOUNDATION_SANDBOX_DIGEST_PIN_REQUIRED');
 if(typeof workspace!=='string'||!existsSync(join(workspace,'src'))||
  !existsSync(join(workspace,'test'))||
  !existsSync(join(workspace,'package.json')))
  deny('FOUNDATION_TRUSTED_BASE_TREE_MISSING');
 return async({ticket,candidate,attempt,frozen_suite_ref,
  network_permitted,secrets_permitted})=>{
  if(network_permitted!==false||secrets_permitted!==false||
   frozen_suite_ref!==ticket.frozen_regression_manifest_ref||
   !Number.isInteger(attempt)||attempt<1||attempt>ticket.max_attempts)
   deny('FOUNDATION_SANDBOX_UNTRUSTED_EXECUTION_SCOPE');
  if(readBaseSha(workspace)!==ticket.repository_base_sha)
   deny('FOUNDATION_SANDBOX_BASE_COMMIT_CHANGED');
  const verified=validateFoundationalCandidate(ticket,candidate);
  if(verified.artifact_sha256!==candidate.artifact_sha256)
   deny('FOUNDATION_SANDBOX_CANDIDATE_HASH_CHANGED');
  const manifestPath=join(workspace,'test','reality-frozen-regressions',
   ticket.frozen_regression_manifest_ref+'.json');
  const manifest=validateTrustedFrozenSuite(ticket,
   readFileSync(manifestPath,'utf8'),workspace);
  for(const file of candidate.files)
   if(existsSync(join(workspace,file.path)))
    deny('FOUNDATION_CANNOT_OVERWRITE_BASE_SOURCE');
  const root=mkdtempSync(join(tmpdir(),'reality-isolated-'));
  // mkdtemp creates a 0700 directory; the container's unprivileged UID
  // must be able to read the mounted sandbox WITHOUT becoming root.
  chmodSync(root,0o755);
  try{
   for(const dir of ['src','test'])
    cpSync(join(workspace,dir),join(root,dir),{recursive:true});
   cpSync(join(workspace,'package.json'),join(root,'package.json'));
   for(const file of candidate.files){
    if(file.path.startsWith('docs/'))continue;
    const p=join(root,file.path);mkdirSync(dirname(p),{recursive:true});
    writeFileSync(p,file.content,'utf8');
   }
   const candidateTests=candidate.files.filter(x=>x.path.startsWith('test/'))
    .map(x=>x.path);
   if(!candidateTests.length)deny('FOUNDATION_CANDIDATE_TESTS_REQUIRED');
   const execute=paths=>{
    const args=['run','--rm','--network','none','--read-only',
     '--cap-drop','ALL','--security-opt','no-new-privileges',
     '--pids-limit','64','--memory','512m','--cpus','2',
     '--user','65534:65534','--tmpfs','/tmp:rw,nosuid,size=16m',
     '--mount','type=bind,src='+root+',dst=/work,readonly',
     '--workdir','/work',image,'node','--test',...paths];
    const response=spawn('docker',args,{encoding:'utf8',timeout:180000,
     maxBuffer:2000000,
     env:{PATH:process.env.PATH||'/usr/bin:/bin',HOME:'/tmp'}});
    const output=String(response.stdout||'')+'\n'+String(response.stderr||'');
    return {status:response.error?124:
     Number.isInteger(response.status)?response.status:125,
     output:output.slice(-12000),counts:counts(response.stdout||'')};
   };
   // Model-authored tests cannot inflate the independent frozen regression
   // count. Each group is executed in a separate container invocation.
   const frozen=execute(manifest.tests);
   const modelTests=execute(candidateTests);
   return {ticket_hash:ticket.ticket_hash,
    artifact_sha256:candidate.artifact_sha256,
    environment:'ISOLATED_NO_SECRET_CONTAINER',
    network_disabled:true,secrets_mounted:false,
    production_write_permitted:false,
    frozen_suite_sha256:ticket.frozen_regression_sha256,
    frozen_test_manifest_ref:ticket.frozen_regression_manifest_ref,
    governance_tests_passed:frozen.status===0&&frozen.counts.fail===0,
    frozen_test_count:frozen.counts.tests,
    frozen_test_pass_count:frozen.counts.pass,
    exit_code:frozen.status===0&&modelTests.status===0?0:1,
    test_results:[
     {kind:'FROZEN',passed:frozen.status===0&&
      frozen.counts.tests>0&&frozen.counts.fail===0},
     {kind:'MODEL_CANDIDATE',passed:modelTests.status===0&&
      modelTests.counts.tests>0&&modelTests.counts.fail===0}],
    log_excerpt:(frozen.output+'\n'+modelTests.output).slice(-8000),
    runner_receipt_ref:'isolated:github-action:'+
     (process.env.GITHUB_RUN_ID||'UNSET')+':'+attempt};
  }finally{rmSync(root,{recursive:true,force:true})}
 };
}