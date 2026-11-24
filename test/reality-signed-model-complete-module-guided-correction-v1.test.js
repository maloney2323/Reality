import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseOnlyModule,parseOnlyModuleFailureCategory}
 from '../src/reality-signed-chat-recovery-syntax-verifier-v1.js';
import {deriveExactPatchFromFrozenLineSpan}
 from '../src/reality-chat-new-development-worker-v1.js';
const worker=readFileSync(new URL(
 '../src/reality-chat-new-development-worker-v1.js',import.meta.url),'utf8');
const code=readFileSync(new URL(
 '../src/reality-signed-chat-recovery-syntax-verifier-v1.js',import.meta.url),'utf8');

test('full-module syntax correction gets bounded syntax-category and source-line proof, never executes JS',()=>{
 const valid='export function f(){ return true; }\n';
 const invalid='export function f(){ return true; }\n}\n';
 const marker='throw Error("this must not run");\n';
 assert.equal(parseOnlyModule(valid),'VALID_SYNTAX');
 assert.equal(parseOnlyModuleFailureCategory(valid).verdict,'VALID_SYNTAX');
 const result=parseOnlyModuleFailureCategory(invalid);
 assert.equal(result.verdict,'INVALID_SYNTAX');
 assert.equal(result.category,'UNEXPECTED_TOKEN');
 assert.equal(result.source_executed,false);
 assert.ok(result.line===null||Number.isInteger(result.line));
 assert.equal(parseOnlyModuleFailureCategory(marker).verdict,'VALID_SYNTAX');
 assert.equal(parseOnlyModuleFailureCategory(invalid,()=>({
  error:new Error('provider down'),status:null,signal:null
 })).verdict,'PARSE_PROVIDER_UNAVAILABLE');
});
test('independently check a distinct complete span after an invalid model-selected span',()=>{
 const source=[
  'export function run(){',
  ' const value=1;',
  ' return value;',
  '}',''
 ].join('\n');
 const bad=deriveExactPatchFromFrozenLineSpan(source,{
  start_line:2,end_line:3,replace:' const value=1;\n return ; }\n',
  reason:'Deliberately malformed initial code for independent parse rejection'
 },[[1,5]]);
 const corrected=deriveExactPatchFromFrozenLineSpan(source,{
  start_line:2,end_line:3,replace:' const value=2;\n return value;\n',
  reason:'Complete original bounded statement replacement with full syntax'
 },[[1,5]]);
 assert.equal(bad.ok,true);
 assert.equal(parseOnlyModule(bad.proposed),'INVALID_SYNTAX');
 assert.equal(corrected.ok,true);
 assert.equal(parseOnlyModule(corrected.proposed),'VALID_SYNTAX');
 assert.notEqual(bad.find+bad.replace,corrected.find+corrected.replace);
});
test('model feedback retry is bounded, hash-distinct, full-module checked before draft persistence',()=>{
 const corrector=worker.indexOf('This is the final distinct correction');
 const fail=worker.indexOf("fail('MODEL_COMPLETE_MODULE_SYNTAX_NOT_VERIFIED')",corrector);
 const record=worker.indexOf('reality_record_signed_chat_recovery_draft_v1',corrector);
 assert.ok(corrector>0&&fail>corrector&&record>fail);
 for(const source of [
  "parseOnlyModuleFailureCategory(corrected.proposed)",
  "previousFingerprint",
  "role:'patch_line_correction'",
  "DIFFERENT complete",
  "end_line:alternate.choice.end_line+additional.additional_source_lines",
  "parseOnlyModule(bounded.proposed)!=='VALID_SYNTAX'",
  "if(!bounded.ok",
  "fail('MODEL_REPEATED_INVALID_LINE_SPAN')",
  "raw=admittedResponse;derived=admitted",
  "installation_authorized:false",
  "original_job_completed:false"
 ])assert.ok(worker.includes(source),source);
 assert.ok(code.includes("['--input-type=module','--check']"));
 assert.ok(code.includes("source_executed:false"));
 assert.doesNotMatch(worker.slice(corrector,record),/eval\(|new Function\(|execSync\(/);
});
