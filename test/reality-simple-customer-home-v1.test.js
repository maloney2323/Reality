import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
const start=source.indexOf('/* Customer homepage: saved findings only.');
const end=source.indexOf('let wcMarketResearchSerial=0;',start);
assert.ok(start>0&&end>start);
const script=source.slice(start,end);

function setup(){
 const elements={};
 const element=(tag='div')=>({
  tag,children:[],className:'',style:{display:'block'},disabled:false,attributes:{},
  textContent:'',open:false,href:'',target:'',rel:'',append(...items){this.children.push(...items)},
  replaceChildren(...items){this.children=items},
  setAttribute(n,v){this.attributes[n]=v},
  scrollIntoView(){this.scrolled=true},
  querySelector(name){
   if(name==='.simple-finding')return this.children.find(x=>x.className==='simple-finding');
   if(name==='details')return this.children.find(x=>x.tag==='details');
   return null;
  }
 });
 for(const id of ['simpleResearchList','simpleResearchCount','simpleResearchStatus',
  'simpleLoginState','simpleChat','simpleReviewFirst','simpleAdvancedToggle','realitySimpleHome',
  'privateReady'])elements[id]=element();
 elements.privateReady.style.display='block';
 const body={classList:{value:new Set(['reality-simple-home']),toggle(c){
  if(this.value.has(c)){this.value.delete(c);return false}this.value.add(c);return true}}};
 let opened=0,reads=0;
 const ctx={$:id=>elements[id],document:{
   body,createElement:element,createTextNode:text=>({text})
  },URL, realityOpenChatDock:()=>opened++,wcInvestigateMarket:()=>reads++};
 vm.createContext(ctx);vm.runInContext(script,ctx);
 return {ctx,elements,body,get opened(){return opened},get reads(){return reads}};
}
function savedFindings(){
 return {ok:true,verified_readback:true,review_only:true,
  installation_authorized:false,job_started:false,production_changed:false,
  status:'GOVERNED_MARKET_RESEARCH_RECORDED',
  findings:Array.from({length:4},(_,i)=>({
   status:'RESEARCH_HYPOTHESIS_NEEDS_INDEPENDENT_TEST',
   title:'Proposed finding '+(i+1),
   market_claim:'Published evidence',
   reality_comparison:'Only sampled code reviewed',
   proposed_improvement:'Evaluate capability',
   falsification_test:'Independently test the actual gap',
   evidence_urls:['https://docs.example.org/article']
  }))}
}
test('full legacy dashboard is visually hidden by default but remains mounted and recoverable',()=>{
 assert.match(html,/<body class="reality-simple-home">/);
 assert.match(html,/main > :not\(\.top\):not\(#realitySimpleHome\):not\(#privateChat\)/);
 for(const id of ['startFlow','workCenter','privateChat','businessHome','wcCapabilityShelf',
  'wcGovernedBuild','realityChatDockOpen'])
  assert.ok(html.includes('id="'+id+'"'),id+' must remain available in advanced controls');
 const x=setup();
 assert.equal(x.body.classList.value.has('reality-details-open'),false);
 x.elements.simpleAdvancedToggle.onclick();
 assert.equal(x.body.classList.value.has('reality-details-open'),true);
 assert.equal(x.elements.simpleAdvancedToggle.attributes['aria-expanded'],'true');
 x.elements.simpleAdvancedToggle.onclick();
 assert.equal(x.body.classList.value.has('reality-details-open'),false);
});
test('homepage shows exactly four source-backed saved research cards, no fabricated executable jobs',()=>{
 const x=setup();
 vm.runInContext('realitySimpleRender(input)',vm.createContext({...x.ctx,input:savedFindings()}));
 assert.equal(x.elements.simpleResearchList.children.length,4);
 assert.match(x.elements.simpleResearchCount.textContent,/4 saved opportunities/);
 assert.match(x.elements.simpleResearchStatus.textContent,/not a verified new capability/);
 const first=x.elements.simpleResearchList.children[0];
 assert.match(first.children[0].textContent,/NEEDS VERIFICATION/);
 assert.equal(first.children[1].textContent,'Proposed finding 1');
 assert.equal(first.children[3].tag,'details');
 assert.equal(first.children[3].children.at(-1).href,'https://docs.example.org/article');
 assert.equal(x.reads,0,'rendering must never invoke a new paid research run');
 assert.equal(x.opened,0,'rendering must not require chat');
});
test('unverified and fabricated research cannot replace the on-screen findings',()=>{
 const x=setup();const bad=savedFindings();bad.verified_readback=false;
 x.ctx.input=bad;vm.runInContext('realitySimpleRender(input)',x.ctx);
 assert.match(x.elements.simpleResearchStatus.textContent,/could not be verified/);
 assert.equal(x.elements.simpleResearchList.children.length,0);
});
test('simple next-action opens evidence or the existing private chat, never authorizes writes',()=>{
 const x=setup();
 x.elements.simpleReviewFirst.onclick();
 assert.equal(x.reads,1,'empty saved view may only request readback');
 x.ctx.input=savedFindings();vm.runInContext('realitySimpleRender(input)',x.ctx);
 x.elements.simpleReviewFirst.onclick();
 assert.equal(x.elements.simpleResearchList.children[0].children[3].open,true);
 assert.equal(x.reads,1);
 x.elements.simpleChat.onclick();
 assert.equal(x.opened,1);
 assert.doesNotMatch(script,/fetch\(|OWNER_APPROVE|INSTALL_CAPABILITY|githubWrite/);
});
test('sign-out clears private findings and never exposes prior account research',()=>{
 const x=setup();x.ctx.input=savedFindings();vm.runInContext('realitySimpleRender(input)',x.ctx);
 vm.runInContext('realitySimpleAccount(false)',x.ctx);
 assert.equal(x.elements.simpleResearchList.children.length,0);
 assert.equal(vm.runInContext('realitySimpleFindings.length',x.ctx),0);
 assert.match(x.elements.simpleLoginState.textContent,/Sign in/);
});
test('existing research restoration populates the simple page; no new search on login',()=>{
 assert.match(source,/realitySimpleAccount\(yes\)/);
 assert.match(source,/wcInvestigateMarket\(\{restore:true\}\)/);
 assert.match(source,/realitySimpleRender\(data\)/);
 assert.match(source,/if\(restore\)realitySimpleSetStatus/);
 const full=html.match(/<script>([\s\S]*?)<\/script>/g)||[];
 assert.equal(full.length,1);
 assert.doesNotThrow(()=>new vm.Script(source));
});
