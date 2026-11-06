// Genuine CI auto-trigger — no browser, synthetic customer, API credentials,
// hardcoded job number, owner, frozen module name or write authority.
import {readdirSync,readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {deriveFrozenFailureSignals} from '../src/reality-genuine-auto-detect-v1.js';
const sha=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],
 {encoding:'utf8'}).trim();
const folder='test/reality-frozen-regressions';
const paths=readdirSync(folder)
 .filter(x=>/^[a-z0-9._-]+\.test\.js$/.test(x))
 .map(x=>folder+'/'+x).sort();
if(!paths.length||paths.length>60)throw Error('GENUINE_AUTO_TRIGGER_NO_BOUNDED_FROZEN_TESTS');
const tests=paths.map(path=>{
 const source=readFileSync(path);
 const run=spawnSync(process.execPath,['--test',path],{
  encoding:'utf8',timeout:60000,maxBuffer:250000,
  env:{PATH:process.env.PATH,HOME:process.env.HOME,
   CI:'true',NODE_OPTIONS:'--no-warnings'},
 });
 const output=String(run.stdout||'')+'\n'+String(run.stderr||'');
 const absent=[];
 for(const match of output.matchAll(
  /(?:file:\/\/)?[^\s"'()]*?\/src\/reality-extensions\/([a-z0-9._-]+\.mjs)/g)){
  const relative='src/reality-extensions/'+match[1];
  if(!existsSync(relative))absent.push(relative);
 }
 return {path,source,output:output.slice(0,100000),
  exitCode:Number.isInteger(run.status)?run.status:124,
  absentModulePaths:[...new Set(absent)]};
});
const report=deriveFrozenFailureSignals({tests,repositorySha:sha});
mkdirSync('artifact',{recursive:true});
writeFileSync('artifact/genuine-capability-auto-trigger.json',
 JSON.stringify(report,null,2)+'\n',{flag:'w'});
console.log('REALITY_AUTOMATIC_CAPABILITY_DISCOVERY',JSON.stringify({
 status:report.status,candidate_count:report.findings.length,
 frozen_tests_examined:tests.length,repository_sha:sha,
 queued_in_governed_capability_queue:false,
 installation_authorized:false,original_job_completed:false,
}));
