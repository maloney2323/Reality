import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readPublicOriginal143GitHubEvidence as get}
 from '../src/reality-original-143-public-evidence-v0.1.js';
const env={VERCEL_ENV:'preview'};
const ROOT='/repos/maloney2323/Reality/';
const BRANCH='experiment/reality-live-durable-adversarial-20261025';
const EXPECTED='7ba3cc3273c2301c6902b6b3b3d6d0247e8b6abe0398467656e5e2ca93648128';
const SOURCE='src/reality-extensions/reality-original-maintenance-executor.mjs';
const ISSUE='Reality recurring work: repair repeated Reality Governed Execution Engine v0.1 failures';
test('no original evidence retrieval can use production environment',async()=>{
 await assert.rejects(get(ROOT+'issues/143',{env:{VERCEL_ENV:'production'}}),
 /ORIGINAL_143_PUBLIC_GITHUB_PREVIEW_ONLY/);
});
test('only exact source and immutable head are allowed: no other repos, branches or write path',async()=>{
 for(const path of [
  '/repos/maloney2323/TAKE/issues/143',
  ROOT+'issues/144',
  ROOT+'issues/143/../144',
  ROOT+'git/ref/heads/main',
  ROOT+'contents/'+SOURCE+'?ref=main',
  ROOT+'contents/'+SOURCE+'?ref='+'0'.repeat(39)+'X',
  ROOT+'contents/README.md?ref='+'a'.repeat(40),
  ROOT+'issues/143?access_token=token',
  ROOT+'issues/143#fragment',
  ROOT+'issues//143',
 ]){
  await assert.rejects(get(path,{env}),/ORIGINAL_143_PUBLIC_GITHUB_ROUTE_NOT_ALLOWED/);
 }
});
test('source never attaches credentials or allows redirects and method cannot be changed',async()=>{
 let examined;
 const fixture={ok:true,status:200,json:async()=>({number:143})};
 const result=await get(ROOT+'issues/143',{env,fetchImpl:async(url,init)=>{
  examined={url,init};return fixture;
 }});
 assert.equal(result.number,143);
 assert.equal(examined.url,'https://api.github.com'+ROOT+'issues/143');
 assert.equal(examined.init.method,'GET');
 assert.equal(examined.init.redirect,'error');
 assert.equal(examined.init.cache,'no-store');
 assert.ok(!Object.keys(examined.init.headers).some(k=>/authorization|cookie|token|apikey/i.test(k)));
});
test('explicit HTTP/provider failures never lead to capability installation',async()=>{
 await assert.rejects(get(ROOT+'issues/143',{env,fetchImpl:async()=>({ok:false,status:403})}),
 /ORIGINAL_143_PUBLIC_GITHUB_RATE_OR_ACCESS_DENIED/);
 await assert.rejects(get(ROOT+'issues/143',{env,fetchImpl:async()=>({ok:false,status:404})}),
 /ORIGINAL_143_PUBLIC_GITHUB_EVIDENCE_NOT_FOUND/);
});
test('real public GitHub GET independently verifies ORIGINAL issue, branch, two PRs, run, and source SHA with no token',async(t)=>{
 if(process.env.REALITY_PUBLIC_GITHUB_LIVE!=='true'){t.skip('Set REALITY_PUBLIC_GITHUB_LIVE=true in no-secret GitHub CI');return;}
 const [branch,pr156,pr157,issue,run]=await Promise.all([
  get(ROOT+'git/ref/heads/'+BRANCH,{env}),
  get(ROOT+'pulls/156',{env}),
  get(ROOT+'pulls/157',{env}),
  get(ROOT+'issues/143',{env}),
  get(ROOT+'actions/runs/40777160879',{env}),
 ]);
 assert.equal(branch.ref,'refs/heads/'+BRANCH);
 assert.match(branch.object.sha,/^[0-9a-f]{40}$/);
 assert.equal(pr156.merged,true);assert.equal(pr157.merged,true);
 assert.equal(pr156.base.ref,BRANCH);assert.equal(pr157.base.ref,BRANCH);
 assert.equal(issue.state,'open');assert.equal(issue.number,143);assert.equal(issue.title,ISSUE);
 assert.equal(run.status,'completed');assert.equal(run.conclusion,'success');assert.equal(run.head_branch,BRANCH);
 const source=await get(ROOT+'contents/'+SOURCE+'?ref='+branch.object.sha,{env});
 assert.equal(source.type,'file');assert.equal(source.path,SOURCE);
 const sha=createHash('sha256').update(Buffer.from(source.content.replace(/\s/g,''),'base64')).digest('hex');
 assert.equal(sha,EXPECTED);
});
