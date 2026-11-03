import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
 readPinnedRealityMarketSnapshot,normalizeMarketResearchResponse,
 runGovernedMarketResearch,persistOwnerMarketResearch,
 MARKET_RESEARCH_VERSION
} from '../src/reality-autonomous-market-intelligence-v1.js';
const repo='maloney2323/Reality',sha='a'.repeat(40),url='https://zapier.com/blog/ai-automation/';
const d=x=>createHash('sha256').update(x).digest('hex');
const files=[
 'src/reality-customer-capability-discovery-audit-v1.js',
 'src/reality-genuine-capability-engine-v1.js',
 'src/reality-shift-capability-audit-v1.js',
 'src/reality-cognitive-research-engine-v0.1.js'
];
const snapshot={
 repository:repo,ref:'feature/reality-general-capability-engine-20261101',
 commit_sha:sha,snapshot_sha256:'b'.repeat(64),
 files:files.map(path=>({path,content_sha256:'b'.repeat(64)}))
};
const finding={title:'Test workflow evidence gap',
 market_claim:'A vendor published a new workflow feature.',
 reality_comparison:'The inspected adapter has no equivalent shown; entire repo unknown.',
 falsification_test:'Read complete pinned source and run frozen contract.',
 proposed_improvement:'Propose a verified research-to-upgrade adapter.',
 source_urls:[url]};
function providerResult({findings=[finding],sources=[{url,title:'Vendor documentation'}],status='completed'}={}){
 return {id:'resp_test_web_001',status,output:[
  {type:'web_search_call',action:{sources}},
  {type:'message',content:[{type:'output_text',text:JSON.stringify({findings})}]}
 ]};
}
test('pin every sampled file to one provider-verified GitHub commit',async()=>{
 const calls=[];
 const result=await readPinnedRealityMarketSnapshot({fetchImpl:async request=>{
  calls.push(request);
  if(request.includes('/commits/'))
   return {ok:true,json:async()=>({sha,commit:{tree:{sha:'f'.repeat(40)}}})};
  const path=files.find(path=>request.includes('/contents/'+path+'?ref='+sha));
  assert.ok(path,'unapproved source path requested');
  const bytes='// independently retrieved source for '+path;
  return {ok:true,json:async()=>({path,sha:'c'.repeat(40),
   encoding:'base64',size:Buffer.byteLength(bytes),
   content:Buffer.from(bytes).toString('base64')})};
 }});
 assert.equal(calls.length,5);
 assert.equal(result.commit_sha,sha);
 assert.equal(result.files.length,4);
 assert.equal(result.files[0].content_sha256,d('// independently retrieved source for '+files[0]));
 assert.equal(result.complete_repository_audited,false);
 assert.match(result.snapshot_sha256,/^[a-f0-9]{64}$/);
});
test('wrong branch and incomplete source fail rather than invent capability absence',async()=>{
 await assert.rejects(readPinnedRealityMarketSnapshot({ref:'main'}),/UNAPPROVED_REPOSITORY_REF/);
 await assert.rejects(readPinnedRealityMarketSnapshot({fetchImpl:async()=>({
  ok:false,status:404})}),/PINNED_GITHUB_READ_FAILED/);
});
test('only links from the web search tool may support research claims',()=>{
 const report=normalizeMarketResearchResponse({response:providerResult(),snapshot});
 assert.equal(report.findings.length,1);
 assert.equal(report.findings[0].status,'RESEARCH_HYPOTHESIS_NEEDS_INDEPENDENT_TEST');
 assert.equal(report.findings[0].sandbox_verified,false);
 assert.equal(report.findings[0].estimated_roi,null);
 assert.equal(report.findings[0].installation_authorized,false);
 assert.equal(report.job_started,false);
 assert.equal(report.original_job_completed,false);
 assert.equal(report.pinned_snapshot.complete_repository_audited,false);
 const forged=normalizeMarketResearchResponse({response:providerResult({
  findings:[{...finding,source_urls:['https://not-returned.example.com/claim']}]}) ,snapshot});
 assert.equal(forged.findings.length,0);
});
test('model response alone or a failed web lookup cannot be called research',()=>{
 assert.throws(()=>normalizeMarketResearchResponse({response:{
  status:'completed',output:[{type:'message',content:[{type:'output_text',
   text:JSON.stringify({findings:[finding]})}]}]},snapshot}),/INDEPENDENT_SEARCH_TOOL_SOURCES_REQUIRED/);
 assert.throws(()=>normalizeMarketResearchResponse({response:providerResult({
  status:'incomplete'}),snapshot}),/COMPLETED_WEB_SEARCH_RESPONSE_REQUIRED/);
 assert.throws(()=>normalizeMarketResearchResponse({response:providerResult({
  findings:[finding,finding,finding,finding,finding]}),snapshot}),/BOUNDED_STRATEGIC_FINDINGS_REQUIRED/);
});
test('research only calls hosted web search with a bounded model and no installation tools',async()=>{
 let seen=false;
 const report=await runGovernedMarketResearch({snapshot,apiKey:'test-secret',
  fetchImpl:async (url,options)=>{
   assert.equal(url,'https://api.openai.com/v1/responses');
   const body=JSON.parse(options.body);
   assert.equal(body.tools.length,1);
   assert.equal(body.tools[0].type,'web_search');
   assert.equal(body.tool_choice,'required');
   assert.equal(body.store,false);
   assert.equal(body.max_output_tokens,2900);
   assert.match(body.instructions,/never claim absence/i);
   assert.equal(body.instructions.includes('test-secret'),false);
   seen=true;
   return {ok:true,json:async()=>providerResult()};
  }});
 assert.equal(seen,true);
 assert.equal(report.findings.length,1);
 assert.equal(report.version,MARKET_RESEARCH_VERSION);
});
test('owner-scope and independent Supabase readback are mandatory',async()=>{
 const report=normalizeMarketResearchResponse({response:providerResult(),snapshot});
 const owner='22222222-2222-4222-8222-222222222222';
 const receipt='11111111-1111-4111-8111-111111111111';
 const db={url:'https://hvkfreoagbrphwghjajw.supabase.co',
  secretKey:'fake-service',strictSecrets:true};
 let n=0;
 const returned=await persistOwnerMarketResearch({report,ownerId:owner,db,
  fetchImpl:async(endpoint,options)=>{
   n++;
   const b=JSON.parse(options.body);
   assert.equal(b.p_owner_id,owner);
   if(n===1){
    assert.match(endpoint,/reality_record_owner_market_research_v1/);
    assert.equal(b.p_report.installation_authorized,false);
    return {ok:true,json:async()=>({ok:true,
     receipt_id:receipt,owner_id:owner,report_sha256:report.report_sha256,
     findings:report.findings.map(x=>({...x,novelty:'FIRST_RESEARCH_OBSERVATION'})),
     installation_authorized:false,job_started:false})};
   }
   assert.match(endpoint,/reality_read_owner_market_research_v1/);
   return {ok:true,json:async()=>({receipt_id:receipt,
    owner_id:owner,report_sha256:report.report_sha256,candidate_count:1})};
  }});
 assert.equal(n,2);
 assert.equal(returned.verified_readback,true);
 await assert.rejects(persistOwnerMarketResearch({report,ownerId:owner,db,
  fetchImpl:async(endpoint)=>({ok:true,json:async()=>endpoint.includes('record_owner')?
   {ok:true,receipt_id:receipt,owner_id:owner,report_sha256:report.report_sha256,
    findings:report.findings,installation_authorized:false,job_started:false}:
   {receipt_id:receipt,owner_id:owner,report_sha256:'f'.repeat(64),
    candidate_count:1}})}),/INDEPENDENT_DB_READBACK_REQUIRED/);
});
test('preview API preserves same-origin, sign-in and owner review gates',()=>{
 const api=readFileSync(new URL('../api/reality/personal-market-research.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(api,/VERCEL_ENV!=='preview'/);
 assert.match(api,/authenticatedChatSession/);
 assert.match(api,/assertSameOrigin/);
 assert.match(api,/resolveReliabilityBenchmarkDb/);
 assert.match(api,/persistOwnerMarketResearch/);
 assert.match(html,/id="wcResearchMarket"/);
 assert.match(html,/wcInvestigateMarket/);
 assert.match(html,/RESEARCH_HYPOTHESIS_NEEDS_INDEPENDENT_TEST/);
 assert.match(html,/textContent=finding\.market_claim|finding\.market_claim/);
 assert.doesNotMatch(api,/create_issue|merge_pull_request|installCapability/);
});
