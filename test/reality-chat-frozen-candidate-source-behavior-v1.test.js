import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';

const fixture=JSON.parse(readFileSync(new URL(
 './fixtures/reality-chat-original-frozen-candidate-functional-v1.json',
 import.meta.url),'utf8'));
const SHA=/^[a-f0-9]{40}$/;
const FILE=/^src\/[a-zA-Z0-9/_-]+\.js$/;
const WORK=/^work:[a-f0-9]{32}$/;
const gitShow=(commit,path)=>execFileSync('git',['show',commit+':'+path],{
 encoding:'utf8',maxBuffer:200000,timeout:12000
});
const blobSha=bytes=>createHash('sha1')
 .update('blob '+bytes.length+'\0').update(bytes).digest('hex');
assert.equal(fixture.version,'reality-chat-original-frozen-candidate-functional-fixture-v1');
assert.match(fixture.original_work_id,WORK);
assert.match(fixture.base_commit_sha,SHA);
assert.match(fixture.candidate_commit_sha,SHA);
assert.match(fixture.target_path,FILE);
assert.equal(fixture.full_original_goal_acceptance,false);
assert.equal(fixture.installation_authorized,false);
assert.equal(fixture.original_job_completed,false);

const base=gitShow(fixture.base_commit_sha,fixture.target_path);
const candidate=gitShow(fixture.candidate_commit_sha,fixture.target_path);
const start="  const bytes=Buffer.from(source.content.replace(/\\s/g,''),'base64');";
const stop="  failure='MODEL_GENERATION_UNVERIFIED';";
const extract=s=>{
 const a=s.indexOf(start),b=s.indexOf(stop,a);
 assert.ok(a>0&&b>a,'candidate source must contain its exact guarded decode');
 assert.equal(s.indexOf(start,a+start.length),-1,'no ambiguous second decode');
 return s.slice(a,b+stop.length);
};
const prior=extract(base),guard=extract(candidate);

test('same original staged candidate really adds a UTF-8 round-trip and NUL guard',()=>{
 assert.equal(base.includes("if(Buffer.from(text,'utf8').length!==bytes.length)"),false);
 assert.equal(candidate.includes("if(Buffer.from(text,'utf8').length!==bytes.length)"),true);
 assert.equal(base.includes("if(/\\u0000/.test(text))"),false);
 assert.equal(candidate.includes("if(/\\u0000/.test(text))"),true);
 assert.match(guard,/MODEL_SOURCE_GIT_BLOB_BYTES_INVALID/);
 assert.match(guard,/MODEL_SOURCE_TEXT_UTF8_REQUIRED/);
 assert.equal(
  candidate.replace("  if(Buffer.from(text,'utf8').length!==bytes.length)\n   fail('MODEL_SOURCE_TEXT_UTF8_REQUIRED');\n  if(/\\u0000/.test(text))\n   fail('MODEL_SOURCE_TEXT_UTF8_REQUIRED');\n",''),
  base,'candidate should change only the tested source guard');
});
const executeGuard=bytes=>{
 const scope={Buffer,source:{content:bytes.toString('base64'),size:bytes.length,sha:blobSha(bytes)},
  blobSHA:blobSha,failure:null,result:null,fail:s=>{throw Error(s)}};
 runInNewContext(guard+'\nresult=text;',scope,{timeout:250});
 return scope.result;
};
test('frozen candidate accepts ASCII and valid multibyte source bytes',()=>{
 assert.equal(executeGuard(Buffer.from('const x = 1;\n','utf8')),'const x = 1;\n');
 assert.equal(executeGuard(Buffer.from('const emoji="✨";','utf8')),'const emoji="✨";');
});
test('frozen candidate rejects binary or lossy UTF-8 with a deterministic code',()=>{
 assert.throws(()=>executeGuard(Buffer.from([0xff,0xfe])),/MODEL_SOURCE_TEXT_UTF8_REQUIRED/);
 assert.throws(()=>executeGuard(Buffer.from([0x61,0xc3])),/MODEL_SOURCE_TEXT_UTF8_REQUIRED/);
 assert.throws(()=>executeGuard(Buffer.from([0x61,0,0x62])),/MODEL_SOURCE_TEXT_UTF8_REQUIRED/);
});
test('bounded functional proof never certifies an eight-step original or installation',()=>{
 assert.equal(fixture.feature_acceptance_scope,'FROZEN_CANDIDATE_UTF8_SOURCE_GUARD_ONLY');
 assert.equal(fixture.full_original_goal_acceptance,false);
 assert.equal(fixture.installation_authorized,false);
 assert.equal(fixture.original_job_completed,false);
});
