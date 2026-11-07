// Isolated real-OpenAI proof of one Reality model coordinating TWO role
// responsibilities on a real current GitHub issue. No owner shift is
// authorized, no live database claim or business operation is executed.
import {strict as assert} from 'node:assert';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createOneOpenAICombinedRoleCoordinator}
 from '../src/reality-one-openai-combined-role-handoff-v1.js';
const start=new Date();
const ISSUE_URL='https://github.com/maloney2323/Reality/issues/263';
const API='https://api.github.com/repos/maloney2323/Reality/issues/263';
const claim='22222222-3333-4444-8555-666666666666';
const owner='11111111-2222-4333-8444-555555555555';
const sha=x=>createHash('sha256').update(x).digest('hex');
const provider=await fetch(API,{
 headers:{accept:'application/vnd.github+json',
  'user-agent':'Reality-Isolated-Combined-Role-Proof/1.0',
  'x-github-api-version':'2022-11-28'},
 signal:AbortSignal.timeout(12000),redirect:'error',cache:'no-store'
});
assert.equal(provider.status,200,'real issue provider GET must succeed');
const issue=await provider.json();
assert.equal(issue.html_url,ISSUE_URL);
assert.equal(issue.state,'open');
assert.ok(issue.id>0&&!issue.pull_request);
const ctx={
 shift_id:claim,claim_id:claim,owner_id:owner,
 step_index:2,stage:'VERIFY_OPEN_ISSUE',source_ref:ISSUE_URL,
 shift_step_claimed:true,read_only:true,
 installation_authorized:false,production_changed:false,
 provider:{kind:'GITHUB_SOURCE_READBACK',
  source_url:ISSUE_URL,provider_status:'OPEN_ISSUE',
  source_title:String(issue.title).slice(0,180),
  provider_id:issue.id,provider_checked:true,read_only:true,
  production_changed:false}
};
// Synthetic claim fields demonstrate the adapter gate only. They ARE NOT
// owner-bound authorized Reality database claims, global leases or settlement.
const model=process.env.REALITY_OPENAI_MODEL||'gpt-5.4';
const adapter=createOneOpenAICombinedRoleCoordinator({
 apiKey:process.env.OPENAI_API_KEY,model
});
const advisory=await adapter(ctx);
assert.equal(advisory.status,'SHARED_OPENAI_ROLE_ADVISORY_RECORDED_NOT_VERIFIED_WORK');
assert.deepEqual(advisory.roles,['Riley','Taylor']);
assert.equal(advisory.model_invocations_completed,1);
assert.equal(advisory.independent_verification_performed,false);
assert.equal(advisory.original_job_completed,false);
assert.equal(advisory.installation_authorized,false);
assert.equal(advisory.actual_model_cost_usd,null);
assert.match(advisory.advisory_sha256,/^sha256:[a-f0-9]{64}$/);
// Independent source readback; model text cannot become verification.
const reread=await fetch(API,{
 headers:{accept:'application/vnd.github+json',
  'user-agent':'Reality-Isolated-Combined-Role-Proof-Readback/1.0'},
 signal:AbortSignal.timeout(12000),redirect:'error',cache:'no-store'
});
assert.equal(reread.status,200);
const current=await reread.json();
assert.equal(current.html_url,ISSUE_URL);
assert.equal(current.state,'open');
assert.equal(current.id,issue.id);
const proof={
 version:'reality-real-provider-single-model-multi-role-proof-v1',
 proof_status:'REAL_OPENAI_ADVISORY_ON_CURRENT_GITHUB_SOURCE',
 model,issue:ISSUE_URL,
 source_sha256:sha(JSON.stringify({id:issue.id,title:issue.title,state:issue.state})),
 model_answer:advisory.model_advice,
 model_response_id:advisory.model_response_id,
 advisor_digest:advisory.advisory_sha256,
 roles:advisory.roles,real_openai_requests_completed:1,
 github_source_readbacks:2,
 independent_source_id_match:current.id===issue.id,
 model_used_no_tools:true,
 owner_authorized_shift_started:false,
 synthetic_scope_only:true,
 actual_original_job_executed:false,
 independent_original_job_settlement:false,
 model_report_is_not_independent_verification:true,
 user_payroll_savings_measured:false,
 installation_authorized:false,production_changed:false,
 elapsed_ms:new Date()-start
};
await mkdir('benchmark-results',{recursive:true});
await writeFile('benchmark-results/reality-real-openai-combined-role-proof-v1.json',
 JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({
 status:proof.proof_status,real_openai_requests_completed:1,
 github_source_readbacks:2,roles:proof.roles,
 independent_original_job_settlement:false,
 installation_authorized:false,production_changed:false
}));
