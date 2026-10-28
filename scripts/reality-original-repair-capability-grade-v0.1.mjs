// No-credential, no-network independent model-code verifier for the
// EXACT owner original 3/7 historical source repair. Never trusts model
// claims of correctness, tests passing, owner consent or installation.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const candidatePath=process.argv[2],historicalPath=process.argv[3],fixedPath=process.argv[4];
if(!candidatePath?.startsWith('/work/')||!candidatePath.endsWith('/candidate.mjs')||
   !historicalPath?.startsWith('/fixtures/')||
   !fixedPath?.startsWith('/fixtures/'))
 throw Error('SANDBOX_EXACT_READ_ONLY_INPUT_REQUIRED');
const original='work:24cda9611404e9bcb47909976067605c';
const file='test/reality-personal-discovered-work-handoff-v0.1.test.js';
const title="test('Home checks signed-in goal before preparing source work and never silently executes',()=>{";
const old=readFileSync(historicalPath,'utf8');
const fixed=readFileSync(fixedPath,'utf8');
const sha=v=>createHash('sha256').update(v).digest('hex');
function parts(src){
 const idx=src.indexOf(title);
 if(idx<0||src.indexOf(title,idx+1)!==-1)throw Error('ORIGINAL_TEST_TARGET_NOT_UNIQUE');
 const end=src.indexOf('\n});',idx);
 if(end<0)throw Error('ORIGINAL_TEST_CLOSURE_MISSING');
 return [src.slice(0,idx),src.slice(idx,end+4),src.slice(end+4)];
}
const [oldBefore,oldTest,oldAfter]=parts(old);
const [fixedBefore,fixedTest,fixedAfter]=parts(fixed);
if(oldBefore!==fixedBefore||oldAfter!==fixedAfter||
   oldTest===fixedTest||oldTest.includes('guidedStart')||
   !fixedTest.includes('guidedStart'))
 throw Error('INDEPENDENT_FROZEN_GIT_COMMIT_PAIR_NOT_ATTESTED');
let fn=null;
try{
 const mod=await import(pathToFileURL(candidatePath).href);
 if(Object.keys(mod).join(',')!=='proposeOriginalRepair'||
   typeof mod.proposeOriginalRepair!=='function')
  throw Error('CANDIDATE_EXACT_FUNCTION_NOT_FOUND');
 fn=mod.proposeOriginalRepair;
}catch(e){
 console.log(JSON.stringify({
  state:'SANDBOX_REJECTED',
  original_work_id:original,reason:'CANDIDATE_IMPORT_REJECTED',
  error:String(e?.message||'').slice(0,130),passed:0,total:8,
  code_installed:false,original_job_completed:false,
 }));
 process.exit(8);
}
const cases=[];
const test=(name,cb)=>{
 let valid=false,reason=null;
 try{cb();valid=true;}catch(e){reason=String(e?.message||'FAILED').slice(0,130);}
 cases.push({name,passed:valid,reason});
};
const use=(workId,source)=>fn({workId,source});
const exact=r=>{
 if(!r||typeof r!=='object'||Array.isArray(r)||
    Object.keys(r).sort().join(',')!=='file,patchedSource,status'||
    r.file!==file||typeof r.patchedSource!=='string')
  throw Error('REPAIR_OUTPUT_EXACT_SHAPE_REQUIRED');
 return r;
};
const assert=(ok,code)=>{if(!ok)throw Error(code)};
const verifyRepair=(src,r)=>{
 exact(r);
 assert(r.status==='PATCH_PROPOSED','MUST_PROPOSE_PATCH');
 const [pre,changed,post]=parts(r.patchedSource);
 const [wantedPre,_,wantedPost]=parts(src);
 assert(pre===wantedPre&&post===wantedPost,'OUTSIDE_ORIGINAL_TEST_MODIFIED');
 assert(changed.includes('const guidedStart=html.indexOf('),'GUIDED_HANDLER_START_NOT_FOUND');
 assert(changed.includes('const guidedEnd=html.indexOf('),'GUIDED_HANDLER_END_NOT_FOUND');
 assert(changed.includes('const guided=html.slice(guidedStart,guidedEnd)'),'SCOPED_GUIDED_HANDLER_NOT_CREATED');
 assert(changed.includes('assert.ok(guidedStart>=0&&guidedEnd>guidedStart)'),'SCOPE_BOUNDS_UNVERIFIED');
 for(const k of ['sign','goal','prepare','approval','consent']){
  assert(changed.includes('const '+k+'=guided.indexOf('),'UNSCOPED_'+k);
  assert(!changed.includes('const '+k+'=html.indexOf('),'GLOBAL_INDEX_'+k);
 }
 assert(changed.includes('assert.ok(sign>=0&&sign<goal&&goal<prepare&&prepare<consent&&consent<approval)'),
  'ORIGINAL_ORDERING_ASSERTION_LOST');
 assert(changed.includes("assert.equal(html.includes("),
  'ORIGINAL_NEGATIVE_TESTS_REMOVED');
 // Require both independent regression and the exact frozen historical
 // source correction effect; do not accept changing tests to just PASS.
 assert(changed===fixedTest,'PATCH_DIFF_DOES_NOT_MATCH_INDEPENDENT_VERIFIED_FIX');
};
test('frozen:historical-actual-Git-source-repaired',()=>{
 const r=use(original,old);verifyRepair(old,r);
 assert(r.patchedSource===fixed,'COMPLETE_TEST_FILE_NOT_HISTORICAL_FIXED_SOURCE');
});
test('frozen:already-fixed-does-not-repair-again',()=>{
 const r=exact(use(original,fixed));
 assert(r.status==='ALREADY_FIXED'&&r.patchedSource===fixed,
  'PATCH_REAPPLIED_TO_ALREADY_FIXED_SOURCE');
});
test('frozen:wrong-original-work-fails-closed',()=>{
 let threw=false;try{use('work:'+'f'.repeat(32),old)}catch{threw=true}
 assert(threw,'UNAUTHORIZED_WORK_ACCEPTED');
});
test('holdout:source-with-independent-extra-prefix-preserved',()=>{
 const input='// original unrelated module header\n'+old;
 const r=use(original,input);verifyRepair(input,r);
 assert(r.patchedSource==='// original unrelated module header\n'+fixed,
  'UNRELATED_PREFIX_MODIFIED');
});
test('holdout:duplicate-test-must-be-rejected',()=>{
 let threw=false;try{use(original,old+'\n'+oldTest+'\n')}catch{threw=true}
 assert(threw,'DUPLICATE_TARGET_ALLOWED');
});
test('holdout:missing-target-must-be-rejected',()=>{
 let threw=false;try{use(original,'const x=1;\n')}catch{threw=true}
 assert(threw,'MISSING_TARGET_ACCEPTED');
});
test('holdout:invalid-input-type-rejected',()=>{
 let threw=false;try{use(original,{body:old})}catch{threw=true}
 assert(threw,'WRONG_SOURCE_TYPE_ACCEPTED');
});
test('holdout:fixed-test-plus-unrelated-text-preserved',()=>{
 const input=fixed+'\n// a later unrelated test\n';
 const r=exact(use(original,input));
 assert(r.status==='ALREADY_FIXED'&&r.patchedSource===input,
  'ALREADY_FIXED_SOURCE_DID_NOT_REMAIN_IDENTICAL');
});
const passed=cases.filter(x=>x.passed).length;
const result={
 version:'reality-original-owner-repair-independent-sandbox-v0.1',
 original_work_id:original,
 historical_sha256:sha(old),
 independently_fixed_sha256:sha(fixed),
 candidate_sha256:sha(readFileSync(candidatePath)),
 capability:'reality.original-repair-execution',
 state:passed===cases.length?'ORIGINAL_REPAIR_CAPABILITY_SANDBOX_VERIFIED':'SANDBOX_REJECTED',
 total:cases.length,passed,failed:cases.length-passed,
 frozen_verified:cases.slice(0,3).every(x=>x.passed),
 hidden_holdout_verified:cases.slice(3).every(x=>x.passed),
 isolation:{network_permitted:false,secrets_accessible:false,
  code_installed:false,github_write_authorized:false},
 cases, original_repair_executed:false,original_job_completed:false,
};
console.log(JSON.stringify(result));
process.exitCode=result.failed===0?0:8;
