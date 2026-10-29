import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRealityWorkCatalog,fetchCatalogGitHub}
 from '../src/reality-work-catalog-v0.1.js';
const root='https://github.com/maloney2323/Reality';
const sha='a'.repeat(40);
test('catalog federates real-shaped workflows, open issues, active PRs, and code-change observations',async()=>{
 const calls=[];
 const readCatalog=async type=>{
  calls.push(type);
  if(type==='issues')return [
   {number:62,title:'Customer support response regression',html_url:root+'/issues/62'},
   {number:64,title:'Should not include pull request in issue list',
    html_url:root+'/issues/64',pull_request:{url:'provider'}},
  ];
  if(type==='commits')return [
   {sha,html_url:root+'/commit/'+sha,commit:{message:'fix: repair login bug\nDetails'}},
   {sha:'b'.repeat(40),html_url:root+'/commit/'+'b'.repeat(40),commit:{message:'feat: add shift planner'}},
  ];
  if(type==='pulls')return [{
   number:140,draft:true,title:'Upgrade continuity proposal',
   html_url:root+'/pull/140',
  }];
  throw Error('bad source');
 };
 const observed=await buildRealityWorkCatalog({
  steward:async()=>({work:[{
   kind:'SYSTEM_MAINTENANCE',work_key:'workflow-failure:Reality CI',
   work_id:'work:'+'a'.repeat(32),
   objective:'Investigate repeated CI failures',
   evidence_refs:[root+'/actions/runs/123',root+'/actions/runs/124'],
   authorization_required:true,
  }]}),readCatalog,
 });
 assert.deepEqual(calls,['issues','commits','pulls']);
 assert.equal(observed.status,'OBSERVED');
 assert.equal(observed.total_findings,5);
 assert.equal(observed.counts.reliability,1);
 assert.ok(observed.counts.bugs>=1);
 assert.ok(observed.counts.features>=1);
 assert.ok(observed.counts.upgrades>=1);
 assert.ok(observed.counts.customer>=1);
 assert.equal(observed.source_coverage.issues,'checked');
 assert.equal(observed.source_coverage.commits,'checked');
 assert.equal(observed.source_coverage.pull_requests,'checked');
 assert.equal(observed.source_coverage.customer_feedback,'not_connected');
 assert.ok(observed.items.every(x=>x.finding_id?.startsWith('catalog:')&&
  x.evidence_refs.length>0));
 const changes=observed.items.filter(x=>x.finding_type==='RECENT_CHANGE_TO_VERIFY');
 assert.ok(changes.length===2);
 assert.ok(changes.every(x=>x.execution_work_item===null&&
  x.authorization_required===false&&x.state==='OBSERVED_NOT_AN_OPEN_DEFECT'));
 assert.equal(observed.authority,'NONE_GRANTED');
 assert.equal(observed.execution_enabled,false);
});
test('failed upstream provider reports PARTIAL, never silently zero opportunities',async()=>{
 const result=await buildRealityWorkCatalog({
  steward:async()=>{throw Error('401');},
  readCatalog:async type=>{
   if(type==='issues')throw Error('rate limited');
   if(type==='pulls')return [];
   return [];
  },
 });
 assert.equal(result.status,'PARTIAL');
 assert.equal(result.source_coverage.issues,'unavailable');
 assert.equal(result.source_coverage.actions,'unavailable');
 assert.equal(result.source_coverage.customer_feedback,'not_connected');
 assert.equal(result.total_findings,0);
 assert.ok(result.source_failures.length>=2);
});
test('catalog is read-only and accepts only fixed allowlisted GitHub repository GET paths',async()=>{
 const called=[];
 const result=await fetchCatalogGitHub('issues',{
  env:{VERCEL_ENV:'preview'},
  fetchImpl:async(url,opts)=>{
   called.push({url,opts});
   return {ok:true,json:async()=>[]};
  },
 });
 assert.deepEqual(result,[]);
 assert.equal(called.length,1);
 assert.equal(called[0].url,'https://api.github.com/repos/maloney2323/Reality/issues?state=open&per_page=30');
 assert.equal(called[0].opts.method,'GET');
 assert.equal(called[0].opts.headers.Authorization,undefined);
 await assert.rejects(fetchCatalogGitHub('secrets',{
  env:{VERCEL_ENV:'preview'},fetchImpl:async()=>{throw Error('DO NOT CALL')},
 }),/CATALOG_PROVIDER_PATH_DENIED/);
 await assert.rejects(fetchCatalogGitHub('issues',{
  env:{VERCEL_ENV:'production'},fetchImpl:async()=>{throw Error('DO NOT CALL')},
 }),/CATALOG_PREVIEW_READ_ONLY_ONLY/);
});
test('catalog endpoint has no write method, automatic grant, or credit claims',async()=>{
 const {readFileSync}=await import('node:fs');
 const c=readFileSync(new URL('../api/reality/work-catalog.js',import.meta.url),'utf8');
 assert.ok(c.includes("req.method!=='GET'"));
 assert.ok(c.includes('buildRealityWorkCatalog()'));
 assert.ok(!c.includes('githubWrite('));
 assert.ok(!c.includes('runPersonalIssueDispatch('));
});
