import test from 'node:test';
import assert from 'node:assert/strict';
import {readExactModelRepairEvidence}
 from '../src/reality-real-verified-repair-readback-v1.0.js';
import {verifyRealMissingRepairIssue}
 from '../src/reality-real-repair-opportunity-intake-v1.0.js';
import {verifyApprovedBackgroundReadiness}
 from '../src/reality-approved-repair-background-readiness-v1.0.js';
import {readFileSync} from 'node:fs';
const TOKEN='ghp_preview_read_only_test_token_1234567890123456';
const base={VERCEL_ENV:'preview',
 VERCEL_GIT_COMMIT_REF:'feature/reality-home-repair-chat-20261031',
 REALITY_FIRST178_GITHUB_READ_TOKEN:TOKEN};
function forbidden(){
 const requests=[];
 return {requests,fetchImpl:async(url,opts)=>{
  requests.push({url,authorization:opts.headers.authorization,method:opts.method});
  return {ok:false,status:403,json:async()=>({message:'Forbidden'})};
 }};
}
test('original source verifier uses existing read-only preview token on GitHub API',async()=>{
 const x=forbidden();
 await assert.rejects(readExactModelRepairEvidence({issueNumber:188,env:base,
  fetchImpl:x.fetchImpl}),/REAL_REPAIR_READBACK_GITHUB_PROVIDER_403/);
 assert.equal(x.requests.length,1);
 assert.match(x.requests[0].url,/\/git\/ref\/heads\/feature/);
 assert.equal(x.requests[0].authorization,'Bearer '+TOKEN);
 assert.equal(x.requests[0].method,'GET');
});
test('frozen source intake uses same read-only credential',async()=>{
 const x=forbidden();
 await assert.rejects(verifyRealMissingRepairIssue({issueNumber:188,env:base,
  fetchImpl:x.fetchImpl}),/REALITY_REAL_REPAIR_GITHUB_PROVIDER_SOURCE_READBACK_403/);
 assert.equal(x.requests[0].authorization,'Bearer '+TOKEN);
 assert.equal(x.requests[0].method,'GET');
});
test('background scheduler preflight uses existing token and still fails closed',async()=>{
 const x=forbidden();
 const result=await verifyApprovedBackgroundReadiness({env:{
  ...base,REALITY_GOVERNED_SCHEDULER_ENABLED:'true'},
  fetchImpl:x.fetchImpl});
 assert.equal(result.ready,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(x.requests[0].authorization,'Bearer '+TOKEN);
 assert.equal(x.requests[0].method,'GET');
});
test('default proposal sorts newer real issue before duplicate older issue',()=>{
 const code=readFileSync(new URL('../api/reality/personal-real-repair-candidate.js',
  import.meta.url),'utf8');
 assert.match(code,/const ordered=\[\.\.\.jobs\]\.sort/);
 assert.match(code,/Number\(b\.issue_url\.split\('\/'\)\.at\(-1\)\)/);
 assert.match(code,/const job=ordered\[0\]/);
 assert.match(code,/owner_installation_authorized:false/);
});
