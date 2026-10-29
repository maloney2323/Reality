import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyGitHub403} from '../src/reality-connector-github-v1.0.js';
import {inspectPreviewGithubRepositoryAccessReadOnly}
 from '../src/reality-personal-github-execution-bridge-v0.1.js';
import {readFileSync} from 'node:fs';

const root='/repos/maloney2323/Reality';
test('scope-related, SSO and rate-limit GitHub 403s use fixed diagnostic codes only',()=>{
 const cases=[
  [{message:'Resource not accessible by personal access token'},'TOKEN_REPOSITORY_OR_ISSUES_SCOPE_DENIED'],
  [{message:'Resource not accessible by integration'},'TOKEN_REPOSITORY_OR_ISSUES_SCOPE_DENIED'],
  [{message:'API rate limit exceeded for 1.2.3.4'},'PRIMARY_RATE_LIMIT'],
  [{message:'You have exceeded a secondary rate limit'},'SECONDARY_RATE_LIMIT'],
  [{message:'SAML SSO authorization is required'},'SSO_AUTHORIZATION_REQUIRED'],
  [{message:'The repository is archived'},'REPOSITORY_WRITE_UNAVAILABLE'],
  [{message:'Your operation is not permitted'},'GITHUB_WRITE_POLICY_RESTRICTED'],
  [{message:'Bearer PRIVATE-SECRET unknown provider refusal'},'FORBIDDEN_REASON_NOT_DISCLOSED'],
 ];
 for(const [body,code] of cases){
  const result=classifyGitHub403(body);
  assert.equal(result,code);
  assert.ok(!result.includes('PRIVATE-SECRET'));
 }
 assert.equal(classifyGitHub403({message:'No matter'},{
  get:(key)=>key==='x-github-sso'?'required; url=https://github.com/auth':'',
 }), 'SSO_AUTHORIZATION_REQUIRED');
});
test('actual preview credential probe accepts exact GitHub owner/repo issues after GET only',async()=>{
 const paths=[];
 const data=await inspectPreviewGithubRepositoryAccessReadOnly({
  get:async path=>{
   paths.push(path);
   if(path==='/user')return {login:'maloney2323'};
   if(path===root)return {full_name:'maloney2323/Reality',archived:false,has_issues:true};
   if(path===root+'/issues?state=open&per_page=1')return [];
   throw Error('NOT_AUTHORIZED_TO_USE_THIS_ENDPOINT');
  },
 });
 assert.deepEqual(new Set(paths),new Set(['/user',root,root+'/issues?state=open&per_page=1']));
 assert.equal(paths.length,3);
 assert.equal(data.principal_verified,true);
 assert.equal(data.repository_metadata_verified,true);
 assert.equal(data.issues_feature_enabled,true);
 assert.equal(data.repository_archived,false);
 assert.equal(data.external_action_performed,false);
 assert.equal(data.github_issue_write_permission_not_yet_proven,true);
});
test('preview token owner mismatch fails closed rather than issuing a provider POST',async()=>{
 await assert.rejects(inspectPreviewGithubRepositoryAccessReadOnly({
  get:async path=>path==='/user'?{login:'wrong-owner'}:
   path===root?{full_name:'maloney2323/Reality',archived:false,has_issues:true}:[],
 }),/PERSONAL_GITHUB_READ_ONLY_PROBE_SCOPE_NOT_VERIFIED/);
});
test('UI exposes no-write diagnostic and acknowledges Issue WRITE is unproven',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const api=readFileSync(new URL('../api/reality/personal-issue-dispatch.js',import.meta.url),'utf8');
 assert.ok(html.includes('id="wcCredentialCheck"'));
 assert.ok(html.includes('id="wcCredentialResult"'));
 assert.ok(html.includes("method:'GET',credentials:'same-origin',cache:'no-store'"));
 assert.ok(html.includes('Issues WRITE still unproven'));
 assert.ok(html.includes('No GitHub write attempted'));
 assert.ok(api.includes('inspectPreviewGithubRepositoryAccessReadOnly()'));
 assert.ok(api.includes('github_issue_write_permission_not_yet_proven:true'));
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 assert.doesNotThrow(()=>new Function(script));
});
test('persisted provider failure detail only allows bounded explicit denial codes',()=>{
 const engine=readFileSync(new URL('../src/reality-governed-execution-engine-v0.1.js',import.meta.url),'utf8');
 const output=readFileSync(new URL('../src/reality-personal-issue-dispatch-v0.1.js',import.meta.url),'utf8');
 assert.ok(engine.includes('provider_failure_detail:githubFailureDetail'));
 assert.ok(output.includes('provider_failure_detail:executionResult?.provider_failure_detail||null'));
 assert.ok(output.includes('provider_failure_detail:outcome.failure_detail||null'));
 assert.ok(!engine.includes('provider_failure_detail:error.body'));
});
