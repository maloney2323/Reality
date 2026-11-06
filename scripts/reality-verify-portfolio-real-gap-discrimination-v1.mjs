// Source-backed REAL missing-capability discrimination against previously
// settled isolated upgrades. Never install, execute customer work, or assert approval.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const env=process.env,REPO='maloney2323/Reality';
const fail=c=>{throw Error('REALITY_GAP_DISCRIMINATION_'+c)};
const sha=x=>createHash('sha256').update(x).digest('hex');
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==REPO||
 env.GITHUB_EVENT_NAME!=='push'||
 env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
 !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')||
 !/^[1-9][0-9]{7,17}$/.test(env.GITHUB_RUN_ID||'')||!env.GH_TOKEN)
 fail('PINNED_ISOLATED_SIGNED_WORKFLOW_REQUIRED');
async function api(path){
 const r=await fetch('https://api.github.com/repos/'+REPO+path,{
  redirect:'error',cache:'no-store',headers:{
   authorization:'Bearer '+env.GH_TOKEN,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28','user-agent':'Reality-real-gap-discriminator-v1'}});
 if(!r.ok)fail('GITHUB_PROVIDER_READ_'+r.status);
 return r.json();
}
async function signedSnapshot(){
 const u=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL||'');
 u.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
 const response=await fetch(u,{cache:'no-store',redirect:'error',headers:{
  authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
 if(!response.ok)fail('OIDC_IDENTITY_UNAVAILABLE');
 const jwt=(await response.json()).value;
 if(typeof jwt!=='string'||jwt.length<300)fail('OIDC_IDENTITY_INVALID');
 const r=await fetch('https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
  method:'POST',redirect:'error',cache:'no-store',
  headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
   'x-reality-github-provider-token':env.GH_TOKEN},
  body:JSON.stringify({action:'readiness_snapshot',scope:{repository_sha:env.GITHUB_SHA}})});
 const body=await r.json().catch(()=>null);
 if(!r.ok||body?.ok!==true)fail('SIGNED_INDEPENDENT_READINESS_REQUIRED');
 return body;
}
const missingPath='src/reality-extensions/reality-general-execution-receipt.mjs';
const frozenPath='test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js';
const issue=await api('/issues/188');
if(issue.number!==188||issue.state!=='open'||issue.pull_request||
 !String(issue.body||'').includes(missingPath))
 fail('ACTUAL_GENUINE_GAP_ISSUE_MISSING');
const [tree,frozenSource,readiness]=await Promise.all([
 api('/git/trees/'+env.GITHUB_SHA+'?recursive=1'),
 api('/contents/'+frozenPath+'?ref='+env.GITHUB_SHA),
 signedSnapshot()
]);
if(tree.truncated===true||!Array.isArray(tree.tree)||tree.tree.some(x=>x.path===missingPath)||
 !tree.tree.some(x=>x.path===frozenPath)||
 frozenSource.encoding!=='base64'||frozenSource.path!==frozenPath)
 fail('FROZEN_OR_MISSING_SOURCE_NOT_PROVIDER_VERIFIED');
const frozenBytes=Buffer.from(frozenSource.content.replace(/\s/g,''),'base64');
if(sha(frozenBytes)!==sha(readFileSync(frozenPath)))fail('FROZEN_SOURCE_BYTES_CHANGED');
const isolatedControls=[
 {name:'ci_failure_evidence',ref:'feature/reality-qualified-install-9b788790c00d',
 path:'src/reality-extensions/reality-ci-failure-evidence.mjs'},
 {name:'continuity_settlement_reconciler',ref:'feature/reality-qualified-install-c422a929dec5',
 path:'src/reality-extensions/reality-continuity-settlement-reconciler.mjs'}];
const controls=[];
for(const control of isolatedControls){
 const head=await api('/git/ref/heads/'+control.ref);
 if(!/^[a-f0-9]{40}$/.test(head.object?.sha))fail('CONTROL_INSTALLED_BRANCH_MISSING');
 const source=await api('/contents/'+control.path+'?ref='+head.object.sha);
 if(source.encoding!=='base64'||source.path!==control.path||
 !source.content||Buffer.from(source.content.replace(/\s/g,''),'base64').length<100)
  fail('SETTLED_CONTROL_INSTALLED_BYTES_MISSING');
 controls.push({name:control.name,installed_branch:control.ref,installed_commit_sha:head.object.sha,
  provider_installed_source_verified:true,
  new_upgrade_needed_not_established:true});
}
const snap=readiness.snapshot;
if(snap?.settled_original_jobs!==2||
 snap?.verified_universe_settlements!==2||
 snap?.unreconciled_settlements!==0||
 snap?.production_changed!==false||
 snap?.production_release_authorized!==false)
 fail('INDEPENDENT_SETTLED_ORIGINALS_READBACK_INVALID');
// Run unchanged FROZEN acceptance without privileges, network, writable root,
// environment credentials or mutable source. This failure is expected and proof
// of missing source on the exact working-branch version, NOT a new installation.
const args=['run','--rm','--network','none','--read-only','--cap-drop','ALL',
 '--security-opt','no-new-privileges','--memory','512m','--cpus','1',
 '--user','65534:65534','--tmpfs','/tmp:rw,noexec,nosuid,size=16m',
 '-v',process.cwd()+':/work:ro','-w','/work','node:22','node',
 '--test','--test-reporter=tap',frozenPath];
const execution=spawnSync('docker',args,{encoding:'utf8',timeout:90000,maxBuffer:300000,
 env:{PATH:env.PATH,HOME:env.HOME}});
const log=String(execution.stdout||'')+'\n'+String(execution.stderr||'');
if(execution.status===0||execution.signal||
 !log.includes('ERR_MODULE_NOT_FOUND')||
 !log.includes('reality-general-execution-receipt.mjs')||
 !log.includes('# fail 1')||
 !log.includes('# tests 1'))fail('EXPECTED_FROZEN_CAPABILITY_GAP_NOT_REPRODUCED');
const report={
 schema:'reality-authentic-upgrade-discrimination-v1',
 run_id:Number(env.GITHUB_RUN_ID),repository_sha:env.GITHUB_SHA,
 issue_number:188,issue_url:issue.html_url,
 original_frozen_test_path:frozenPath,frozen_test_sha256:sha(frozenBytes),
 genuine_missing_module_path:missingPath,working_branch_source_absent:true,
 independently_reproduced_frozen_failure:'ERR_MODULE_NOT_FOUND',
 sandbox_network_disabled:true,sandbox_executor_unprivileged:true,
 classification:'CONFIRMED_MISSING_SOURCE_CAPABILITY_ON_WORKING_BRANCH',
 installation_authorized:false,owner_approval_not_inferred:true,
 previously_installed_not_new_gaps:controls,
 settled_original_jobs:2,verified_universe_outcomes:2,
 original_customer_work_executed:false,
 preview_installation_changed:false,production_changed:false,
 next_step:'GENERATE_AND_INDEPENDENTLY_VERIFY_CANDIDATE_FOR_EXACT_ORIGINAL_WORK;OWNER_APPROVAL_REQUIRED_FOR_INSTALL',
};
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-gap-discrimination.json',JSON.stringify(report,null,2)+'\n');
console.log('REALITY_REAL_CAPABILITY_GAP_REPRODUCED_AND_TWO_PREVIOUSLY_INSTALLED_DISQUALIFIED',JSON.stringify({
 issue_number:188,frozen_sha256:report.frozen_test_sha256,
 missing_source:missingPath,genuine_gap_status:report.classification,
 negative_controls:controls.map(x=>x.name),
 settled_original_jobs:2,independent_outcomes:2,production_changed:false,
 installation_authorized:false}));
