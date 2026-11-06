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
 assert.equal(called[0].url,'https://api.github.com/repos/maloney2323/Reality/issues?state=open&per_page=100&page=1');
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

test('full open GitHub census reaches later pages, including issues buried behind recent PRs',async()=>{
 const all=Array.from({length:100},(_,i)=>({
  number:500-i,title:'PR '+i,html_url:root+'/issues/'+(500-i),
  pull_request:{url:'https://api.github.com/example/'+i}
 }));
 const older=[
  {number:201,title:'Real original-job settlement work',html_url:root+'/issues/201'},
  {number:188,title:'Original capability gap',html_url:root+'/issues/188'}
 ];
 const calls=[];
 const read=await fetchCatalogGitHub('issues',{
  env:{VERCEL_ENV:'preview'},
  fetchImpl:async(url,opts)=>{
   calls.push({url,opts});
   return {ok:true,json:async()=>url.endsWith('&page=1')?all:older};
  },
 });
 assert.equal(read.length,102);
 assert.equal(calls.length,2);
 assert.equal(read.source_scan.complete,true);
 assert.equal(read.source_scan.query_scope_fully_reconciled,true);
 assert.equal(read.source_scan.pages_scanned,2);
 assert.equal(read.source_scan.items_fetched,102);
 assert.ok(read.some(x=>x.number===188&&!x.pull_request));
 assert.ok(calls.every(x=>x.opts.method==='GET'&&
  x.opts.redirect==='error'&&!('Authorization' in x.opts.headers)));
 const work=await buildRealityWorkCatalog({
  steward:async()=>({work:[]}),
  readCatalog:async kind=>kind==='issues'?read:[],
 });
 assert.equal(work.status,'OBSERVED');
 assert.equal(work.source_coverage.issues,'checked');
 assert.equal(work.source_scans.issues.pages_scanned,2);
 assert.equal(work.items.filter(x=>x.finding_type==='OPEN_ISSUE').length,2);
});
test('an error on page two retains earlier evidence but advertises PARTIAL coverage',async()=>{
 const first=Array.from({length:100},(_,i)=>({
  number:1000-i,title:'Open issue '+i,
  html_url:root+'/issues/'+(1000-i)
 }));
 const got=await fetchCatalogGitHub('issues',{
  env:{VERCEL_ENV:'preview'},
  fetchImpl:async url=>url.endsWith('&page=1')?
   {ok:true,json:async()=>first}:{ok:false,status:429}
 });
 assert.equal(got.length,100);
 assert.equal(got.source_scan.complete,false);
 assert.equal(got.source_scan.reached_safe_page_limit,true);
 const out=await buildRealityWorkCatalog({
  steward:async()=>({work:[]}),
  readCatalog:async kind=>kind==='issues'?got:[],
 });
 assert.equal(out.status,'PARTIAL');
 assert.equal(out.source_coverage.issues,'partial');
 assert.equal(out.items.length,100);
 assert.equal(out.counts.operations,100);
 assert.ok(out.source_failures.some(x=>/GitHub open issues scanned only/.test(x)));
});
test('maximum source-page bound never pretends a page-five census is complete',async()=>{
 let calls=0;
 const read=await fetchCatalogGitHub('pulls',{
  env:{VERCEL_ENV:'preview'},
  fetchImpl:async()=>{calls++;
   return {ok:true,json:async()=>Array.from({length:100},(_,i)=>({
    number:100*i+calls,title:'PR '+calls+'-'+i
   }))};
  },
 });
 assert.equal(calls,5);
 assert.equal(read.length,500);
 assert.equal(read.source_scan.complete,false);
 assert.equal(read.source_scan.reached_safe_page_limit,true);
 assert.equal(read.source_scan.pages_scanned,5);
});
test('GitHub commits are explicitly a bounded recent-history window, never outstanding defects',async()=>{
 const read=await fetchCatalogGitHub('commits',{
  env:{VERCEL_ENV:'preview'},
  fetchImpl:async()=>({ok:true,json:async()=>[]})
 });
 assert.equal(read.source_scan.scope,'RECENT_CHANGE_CONTEXT_ONLY');
 assert.equal(read.source_scan.recent_history_is_not_outstanding_work,true);
 assert.equal(read.source_scan.complete,false);
});

test('stale PR stewardship follow-ups do not become recurring CI failures or duplicate PR backlog',async()=>{
 const steward=async()=>({work:[
  {kind:'FOLLOW_UP',work_key:'stale-pr:152',
   work_id:'work:'+'a'.repeat(32),
   objective:'Review stale pull request #152',
   evidence_refs:[root+'/pull/152'],authorization_required:false},
  {kind:'FOLLOW_UP',work_key:'stale-pr:154',
   work_id:'work:'+'b'.repeat(32),
   objective:'Review stale pull request #154',
   evidence_refs:[root+'/pull/154'],authorization_required:false},
  {kind:'SYSTEM_MAINTENANCE',
   work_key:'workflow-failure:Reality acceptance CI',
   work_id:'work:'+'c'.repeat(32),
   objective:'Investigate repeated Reality acceptance CI failures',
   evidence_refs:[root+'/actions/runs/9001'],
   authorization_required:true},
 ]});
 const readCatalog=async kind=>{
  if(kind==='issues')return [];
  if(kind==='commits')return [];
  if(kind==='pulls')return [
   {number:152,title:'Owner review: exact estimate gate',
    html_url:root+'/pull/152'},
   {number:154,title:'Historical repair follow-up',
    html_url:root+'/pull/154',draft:true}];
  throw Error('not allowlisted');
 };
 const result=await buildRealityWorkCatalog({steward,readCatalog});
 const failures=result.items.filter(i=>i.finding_type==='RECURRING_FAILURE');
 const prs=result.items.filter(i=>i.finding_type==='OPEN_PULL_REQUEST');
 assert.equal(result.status,'OBSERVED');
 assert.equal(failures.length,1);
 assert.equal(prs.length,2);
 assert.equal(result.total_findings,3);
 assert.equal(failures[0].source,'github_actions');
 assert.deepEqual(failures[0].evidence_refs,[root+'/actions/runs/9001']);
 assert.ok(prs.every(x=>x.source==='github_pull_requests'));
 assert.equal(result.items.filter(x=>x.title.includes('stale pull request')).length,0);
 assert.equal(result.authority,'NONE_GRANTED');
 assert.equal(result.execution_enabled,false);
});
test('a stale PR with a fabricated Actions link never becomes an authenticated recurring failure',async()=>{
 const result=await buildRealityWorkCatalog({
  steward:async()=>({work:[{
   kind:'FOLLOW_UP',work_key:'stale-pr:150',
   work_id:'work:'+'a'.repeat(32),
   objective:'Review stale pull request #150',
   evidence_refs:[root+'/actions/runs/9876']
  }]}),
  readCatalog:async()=>[]
 });
 assert.equal(result.items.filter(x=>x.finding_type==='RECURRING_FAILURE').length,0);
 assert.equal(result.total_findings,0);
});
