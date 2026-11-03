import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const server=readFileSync(new URL('../api/reality/personal-market-research.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261103_owner_market_research_latest_readback_v1.sql',import.meta.url),'utf8');
function fixture(){
 const a=page.indexOf('let wcMarketResearchSerial=0;');
 const b=page.indexOf('async function wcDiscoverCatalog()',a);
 assert.ok(a>=0&&b>a,'Research handlers not found');
 return page.slice(a,b);
}
function preview({status='GOVERNED_MARKET_RESEARCH_RECORDED',findings}={}){
 const nodes={wcResearchMarket:{disabled:false},
  wcMarketResearchStatus:{textContent:''},
  wcMarketResearchFindings:{children:[],replaceChildren(...xs){this.children=xs}},
  privateReady:{style:{display:'block'}}};
 let renderCount=0,requests=[];
 const result={ok:true,status,verified_readback:true,review_only:true,
  installation_authorized:false,job_started:false,production_changed:false,
  researched_source_count:51,pinned_commit_sha:'a'.repeat(40),
  receipt_id:'11111111-1111-4111-8111-111111111111',
  findings:findings??Array.from({length:4},(_,i)=>({
   status:'RESEARCH_HYPOTHESIS_NEEDS_INDEPENDENT_TEST',
   title:'Opportunity '+(i+1),
   market_claim:'Documented vendor announcement '+(i+1),
   reality_comparison:'Partial code comparison',
   proposed_improvement:'Propose verification',
   falsification_test:'Independently test exact missing capability',
   evidence_urls:['https://docs.example.org/release-'+i]
  }))};
 const context={
  URL,console,
  document:{
   createElement(tag){return {tag,children:[],className:'',
    textContent:'',href:'',target:'',rel:'',
    append(...items){this.children.push(...items)}}},
   createTextNode(text){return {text}}
  },
  $(id){return nodes[id]},
  fetch:async(path,options)=>{requests.push({path,options});
   return {ok:true,json:async()=>result}},
  wcRender:()=>{renderCount++}
 };
 vm.createContext(context);
 vm.runInContext('let wcMarketReviewFindings=[];'+fixture(),context);
 return {context,nodes,requests,get renderCount(){return renderCount}};
}
test('entire inline browser script parses (research restoration cannot break sign-in UI)',()=>{
 const scripts=[...page.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);
 assert.doesNotThrow(()=>new vm.Script(scripts[0][1],{filename:'index.html'}));
});
test('signed-in session restores 4 persisted hypotheses over GET without starting research',async()=>{
 const x=preview();
 await vm.runInContext('wcInvestigateMarket({restore:true})',x.context);
 assert.equal(x.requests.length,1);
 assert.equal(x.requests[0].options.method,'GET');
 assert.equal(x.requests[0].options.credentials,'same-origin');
 assert.equal(x.nodes.wcMarketResearchFindings.children.length,4);
 assert.match(x.nodes.wcMarketResearchStatus.textContent,/Saved research restored/);
 assert.match(x.nodes.wcMarketResearchStatus.textContent,/NOT verified gaps or approved upgrades/);
 assert.equal(vm.runInContext('wcMarketReviewFindings.length',x.context),4);
 assert.equal(x.nodes.wcResearchMarket.disabled,false);
 assert.equal(x.renderCount,1);
});
test('no prior research reports no results and does not manufacture opportunities',async()=>{
 const x=preview({status:'NO_RESEARCH_RECEIPT',findings:[]});
 await vm.runInContext('wcInvestigateMarket({restore:true})',x.context);
 assert.equal(x.requests.length,1);
 assert.equal(x.requests[0].options.method,'GET');
 assert.equal(vm.runInContext('wcMarketReviewFindings.length',x.context),0);
 assert.match(x.nodes.wcMarketResearchStatus.textContent,/No saved market investigation/);
});
test('research and executable work remain separate categories',()=>{
 assert.match(page,/wcMarketReviewFindings=\[\]/);
 assert.match(page,/id==='research'\?n\+' tasks/);
 assert.match(page,/Not approved work/);
 assert.match(page,/wcCurrent==='research'&&wcMarketReviewFindings\.length/);
 assert.match(page,/wcInvestigateMarket\(\{restore:true\}\)/);
 assert.match(page,/No work authorized/);
});
test('owner-only GET uses exact owner ID, strict isolated DB, and no action authority',()=>{
 assert.match(server,/req\.method==='GET'/);
 assert.match(server,/authenticatedChatSession\(req,res\)/);
 assert.match(server,/db\.url!==session\.config\.url/);
 assert.match(server,/p_owner_id:session\.user_id/);
 assert.match(server,/reality_read_latest_owner_market_research_v1/);
 assert.match(server,/data\.installation_authorized!==false/);
 assert.match(migration,/current_user<>'service_role'/);
 assert.match(migration,/where owner_id=p_owner_id/);
 assert.match(migration,/security invoker/);
 assert.match(migration,/revoke all on function public\.reality_read_latest_owner_market_research_v1/);
});
