// Independently compare the actual previously owner-approved #188 source
// with the new model artifact. No installation, approval or repo write.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const E=process.env,fail=s=>{throw Error('REALITY_188_APPROVAL_HARDENING_'+s)};
const HASH=x=>createHash('sha256').update(x).digest('hex');
const INSTALLED='a7ff52787dd9c026c8354c27dae4c2520bf83af8';
const CANDIDATE='29243c5484c599b133142c2930e20e9eaff70ff05f87f444213ed1812e201602';
const issueWork='work:1eecc0d71b21492e0cfdd527f9c257f3';
if(E.GITHUB_ACTIONS!=='true'||E.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 E.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
 !E.GH_TOKEN||E.OPENAI_API_KEY||E.SUPABASE_SECRET_KEY)fail('PINNED_SECRET_FREE_WORKER_REQUIRED');
const proposal=JSON.parse(readFileSync('candidate/reality-issue188-uninstalled-proposal.json','utf8'));
const attestation=JSON.parse(readFileSync('verification/reality-issue188-independent-value-verification.json','utf8'));
if(HASH(proposal.source)!==CANDIDATE||proposal.source_sha256!==CANDIDATE||
 attestation.source_sha256!==CANDIDATE||
 attestation.status!=='INDEPENDENT_SOURCE_CANDIDATE_PASSED'||
 attestation.tested!==20||attestation.failed!==0||
 attestation.installation_authorized!==false)
 fail('SIGNED_PREVIOUS_INDEPENDENT_20_CASE_PROOF_REQUIRED');
const res=await fetch('https://api.github.com/repos/maloney2323/Reality/contents/src/reality-extensions/reality-general-execution-receipt.mjs?ref='+INSTALLED,{
 cache:'no-store',redirect:'error',headers:{authorization:'Bearer '+E.GH_TOKEN,
 accept:'application/vnd.github+json','x-github-api-version':'2022-11-28'}});
if(!res.ok)fail('HISTORICAL_INSTALLED_BYTES_MISSING');
const old=await res.json();
if(old.encoding!=='base64'||old.path!=='src/reality-extensions/reality-general-execution-receipt.mjs')
 fail('WRONG_INSTALLED_SOURCE');
const baseline=Buffer.from(old.content.replace(/\s/g,''),'base64');
mkdirSync('scratch',{recursive:true});mkdirSync('artifact/out',{recursive:true});
writeFileSync('scratch/installed.mjs',baseline);
writeFileSync('scratch/proposed.mjs',proposal.source);
const runner=spawnSync('docker',['run','--rm','--network','none','--read-only',
 '--cap-drop','ALL','--security-opt','no-new-privileges',
 '--memory','512m','--cpus','1','--user','65534:65534',
 '--tmpfs','/tmp:rw,noexec,nosuid,size=16m',
 '-v',process.cwd()+':/work:ro','-w','/work','node:22',
 'node','test/reality-issue188-security-compare-v1.mjs'],
 {encoding:'utf8',timeout:90000,maxBuffer:200000,env:{PATH:E.PATH,HOME:E.HOME}});
const output=String(runner.stdout||'')+'\n'+String(runner.stderr||'');
const line=output.split('\n').find(x=>x.startsWith('REALITY_188_SECURITY_COMPARISON '));
if(!line)fail('INDEPENDENT_OFFLINE_COMPARISON_MISSING');
let checks;try{checks=JSON.parse(line.replace('REALITY_188_SECURITY_COMPARISON ',''));}
catch{fail('PROBE_RECEIPT_NOT_JSON')}
if(runner.status!==0||!Array.isArray(checks)||checks.length!==5)
 fail('PRIOR_PROOF_OR_VALID_BASELINE_FAILED');
const regressions=checks.filter(x=>x.regression);
const report={schema:'reality-owner-approval-regression-gate-188-v1',
 historical_original_work_id:issueWork,
 historical_original_work_status:'ALREADY_SETTLED_DO_NOT_REPLAY',
 historical_installed_commit_sha:INSTALLED,
 historical_installed_source_sha256:HASH(baseline),
 proposal_source_sha256:CANDIDATE,proposal_provider_run_id:41530142180,
 previous_independent_tests_passed:20,
 new_independent_anti_regression_cases:checks.length,
 cases:checks,confirmed_regressions:regressions,
 decision:regressions.length?'BLOCK_NEW_APPROVAL_UNTIL_HARDENED':'NO_REGRESSION_IN_SCOPED_CASES',
 new_owner_work_bound:false,new_installation_approved:false,
 original_job_replayed:false,production_changed:false};
writeFileSync('artifact/out/reality-188-owner-approval-regression-gate.json',
 JSON.stringify(report,null,2)+'\n');
console.log('REALITY_188_FINAL_APPROVAL_READINESS '+JSON.stringify({
 decision:report.decision,regressions:regressions.length,
 historical_job_already_settled:true,
 source_sha256:CANDIDATE,production_changed:false}));
