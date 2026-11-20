// Registered Reality CI: automatically execute the SAME frozen original
// failure regression against historical code (RED) and corrected code (GREEN).
// Source case specs are tied to existing signed maintenance trigger identities;
// NO model, GitHub issue comment, or passing generic diagnostic claims success.
// Running code tests cannot authorize installation, execute original customer
// work, or mint a maintenance settlement receipt.
import {readFileSync,readdirSync,existsSync,mkdirSync,writeFileSync,
 copyFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const fail=reason=>{throw Error('REALITY_SIGNED_CASE_CI_'+reason)};
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const WORK=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
const FROZEN=/^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/;
const SOURCE=/^src\/[a-z0-9._/-]+\.js$/;
const BRANCH='repair/maintenance-warrant-scope-handoff-20261119';
const sha=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
function command(cmd,args,{cwd=process.cwd(),timeout=25000,env=process.env}={}){
 const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout,maxBuffer:500000,env});
 return {status:r.status,signal:r.signal,
  text:String(r.stdout||'')+'\n'+String(r.stderr||'')};
}
function checked(args,cwd=process.cwd()){
 const r=command('git',args,{cwd,timeout:20000});
 if(r.status!==0)fail('GIT_SOURCE_OR_WORKTREE_UNVERIFIED');
 return r.text.trim();
}
function verifySuite(result,{expectsRed=false,title}={}){
 if(result.signal!==null)fail('FROZEN_TEST_KILLED_OR_TIMED_OUT');
 const pass=/^# pass (\d+)$/m.exec(result.text);
 const failures=/^# fail (\d+)$/m.exec(result.text);
 const tests=/^# tests (\d+)$/m.exec(result.text);
 if(!pass||!failures||!tests||Number(tests[1])<3)
  fail('FROZEN_TAP_TEST_COUNT_UNVERIFIED');
 if(expectsRed){
  if(result.status===0||Number(failures[1])<1||
     !result.text.includes('not ok 1 - '+title)||
     !/AssertionError|ERR_ASSERTION/.test(result.text))
   fail('HISTORICAL_FAILURE_NOT_EXACT_FROZEN_ASSERTION');
 }else if(result.status!==0||Number(failures[1])!==0||
  Number(pass[1])!==Number(tests[1]))
  fail('CORRECTED_SOURCE_NOT_GREEN_ON_FROZEN_REGRESSION');
 return {tests:Number(tests[1]),passed:Number(pass[1]),
  failed:Number(failures[1]),exit_code:result.status,
  log_sha256:sha(result.text)};
}
if(process.env.GITHUB_ACTIONS!=='true'||
 process.env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 !['push','pull_request'].includes(process.env.GITHUB_EVENT_NAME)||
 (process.env.GITHUB_EVENT_NAME==='push'&&
  process.env.GITHUB_REF!=='refs/heads/'+BRANCH)||
 (process.env.GITHUB_EVENT_NAME==='pull_request'&&
  process.env.GITHUB_HEAD_REF!==BRANCH))
 fail('EXISTING_SIGNED_GITHUB_BRANCH_REQUIRED');
const commit=checked(['rev-parse','HEAD']);
if(!SHA.test(commit))fail('CURRENT_GITHUB_SHA_INVALID');
if(process.env.GITHUB_EVENT_NAME==='push'&&
 commit!==process.env.GITHUB_SHA)
 fail('WORKTREE_CURRENT_GITHUB_SHA_DRIFT');
const dir='reality-maintenance-case-specs';
if(!existsSync(dir))fail('SIGNED_CASE_CI_SOURCE_MANIFEST_DIR_MISSING');
const files=readdirSync(dir).filter(x=>x.endsWith('.json')).sort();
if(files.length<1||files.length>4)
 fail('SIGNED_MAINTENANCE_CASE_SCOPE_COUNT_INVALID');
let inspected=0,proved=0;
for(const filename of files){
 if(!UUID.test(filename.slice(0,-5)))fail('CASE_SOURCE_SPEC_FILENAME_INVALID');
 const raw=readFileSync(join(dir,filename),'utf8'),spec=JSON.parse(raw);
 const keys='case_regression_only,corrected_defect_guard,expected_red_test_name,'+
 'frozen_test_path,historical_commit_sha,historical_defect_marker,'+
 'historical_failure_kind,installation_authorized,maintenance_id,'+
 'original_customer_execution_proven,schema,shift_id,source_ref,target_source_path';
 if(Object.keys(spec).sort().join(',')!==keys||
   spec.schema!=='reality-maintenance-case-frozen-ci-v1'||
   spec.maintenance_id!==filename.slice(0,-5)||
   !UUID.test(spec.shift_id||'')||!WORK.test(spec.source_ref||'')||
   !SHA.test(spec.historical_commit_sha||'')||
   !FROZEN.test(spec.frozen_test_path||'')||
   !SOURCE.test(spec.target_source_path||'')||
   spec.frozen_test_path.includes('..')||spec.target_source_path.includes('..')||
   typeof spec.historical_failure_kind!=='string'||
   typeof spec.expected_red_test_name!=='string'||
   spec.expected_red_test_name.length<35||
   typeof spec.historical_defect_marker!=='string'||
   spec.historical_defect_marker.length<8||
   typeof spec.corrected_defect_guard!=='string'||
   spec.corrected_defect_guard.length<20||
   spec.case_regression_only!==true||
   spec.original_customer_execution_proven!==false||
   spec.installation_authorized!==false)
  fail('UNTRUSTED_CASE_SPEC_OR_PERMISSION_DRIFT');
 const trigger='reality-maintenance-ci-triggers/'+spec.maintenance_id+'.json';
 if(!existsSync(trigger))fail('EXACT_EXISTING_SIGNED_TRIGGER_MISSING');
 const triggerText=readFileSync(trigger,'utf8'),item=JSON.parse(triggerText);
 if(item.maintenance_id!==spec.maintenance_id||
   item.shift_id!==spec.shift_id||
   item.source_ref!==spec.source_ref||
   item.historical_failure_kind!==spec.historical_failure_kind||
   item.installation_authorized!==false||
   item.original_job_completed!==false||
   item.repair_executed!==false||
   item.frozen_ci_red_verified!==false||
   item.production_changed!==false)
  fail('CASE_SPEC_SIGNED_WARRANT_TRIGGER_MISMATCH');
 inspected++;
 if(!existsSync(spec.frozen_test_path)||!existsSync(spec.target_source_path))
  fail('EXACT_CASE_SPEC_FILE_MISSING');
 if(!checked(['cat-file','-t',spec.historical_commit_sha])
    .includes('commit'))fail('FROZEN_HISTORICAL_COMMIT_MISSING');
 const oldModule=command('git',['show',spec.historical_commit_sha+':'+
   spec.target_source_path],{timeout:12000});
 if(oldModule.status!==0||!oldModule.text.includes(
   spec.historical_defect_marker))
  fail('HISTORICAL_SOURCE_DOES_NOT_CONTAIN_DOCUMENTED_DEFECT');
 const corrected=readFileSync(spec.target_source_path,'utf8');
 if(!corrected.includes(spec.corrected_defect_guard))
  fail('CORRECTED_SOURCE_MISSING_EXACT_DEFECT_GUARD');
 const frozen=readFileSync(spec.frozen_test_path);
 const temp=mkdtempSync(join(tmpdir(),'reality-maintenance-red-'));
 const hist=join(temp,'historical');
 let red,green,existing;
 try{
  checked(['worktree','add','--detach',hist,spec.historical_commit_sha]);
  const testDest=join(hist,spec.frozen_test_path);
  mkdirSync(dirname(testDest),{recursive:true});
  copyFileSync(spec.frozen_test_path,testDest);
  if(!readFileSync(testDest).equals(frozen))
   fail('FROZEN_REGRESSION_HISTORICAL_COPY_MISMATCH');
  red=command(process.execPath,['--test','--test-reporter=tap',
   spec.frozen_test_path],{cwd:hist,timeout:90000});
  green=command(process.execPath,['--test','--test-reporter=tap',
   spec.frozen_test_path],{timeout:90000});
  existing=command(process.execPath,['--test','--test-reporter=tap',
   'test/reality-qualified-source-change-requalification-v1.test.js'],
   {timeout:90000});
 }finally{
  command('git',['worktree','remove','--force',hist],{timeout:25000});
  rmSync(temp,{recursive:true,force:true});
 }
 const redStats=verifySuite(red,{expectsRed:true,
   title:spec.expected_red_test_name});
 const greenStats=verifySuite(green);
 const existingStats=verifySuite(existing);
 if(!frozen.length||frozen.length>20000||greenStats.tests<3)
  fail('CASE_REGRESSION_SUITE_NOT_FROZEN');
 const receipt={
  schema:'reality-existing-shift-case-specific-ci-red-green-v1',
  shift_id:spec.shift_id,maintenance_id:spec.maintenance_id,
  source_ref:spec.source_ref,
  historical_failure_kind:spec.historical_failure_kind,
  signed_trigger_sha256:sha(triggerText),
  case_spec_sha256:sha(raw),
  frozen_test_sha256:sha(frozen),
  target_source_path:spec.target_source_path,
  historical_commit_sha:spec.historical_commit_sha,
  corrected_commit_sha:commit,
  github_run_id:process.env.GITHUB_RUN_ID,
  independent_runner:'GITHUB_ACTIONS_PINNED_NODE22',
  historical_red:redStats,corrected_green:greenStats,
  existing_requalification_green:existingStats,
  case_specific_source_epoch_regression_verified:true,
  same_frozen_test_on_both_versions:true,
  original_customer_execution_proven:false,
  maintenance_installation_authorized:false,
  original_job_completed:false,production_changed:false,
  complete_autonomous_shift_proven:false
 };
 mkdirSync('artifact',{recursive:true});
 const output='artifact/maintenance-sourcebound-red-green-'+spec.maintenance_id+'.json';
 writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');
 console.log('SIGNED_CASE_RED_GREEN_INDEPENDENT_TEST_PROVED',JSON.stringify({
  source_ref:spec.source_ref,maintenance_id:spec.maintenance_id,
  historical_red:redStats.failed,corrected_green:greenStats.passed,
  existing_tests_green:existingStats.passed,
  receipt_sha256:sha(JSON.stringify(receipt)),
  original_job_completed:false,production_changed:false
 }));
 proved++;
}
if(proved<1||inspected!==proved)
 fail('NO_EXISTING_SIGNED_CASE_REGRESSION_INDEPENDENTLY_PROVEN');
console.log('REGISTERED_SIGNED_MAINTENANCE_CASE_REGRESSIONS_VERIFIED',proved);
