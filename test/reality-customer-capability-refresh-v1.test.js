import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const begin=page.indexOf('let wcCapabilityRefreshSerial=0;');
const end=page.indexOf('async function wcDiscoverCatalog(){',begin);
assert.ok(begin>0&&end>begin,'capability shelf must be in live page');
const source=page.slice(begin,end);
function runner({signed=true,reply={}}={}){
 const nodes=new Map(),requests=[];
 const node=id=>{
  if(!nodes.has(id)){
   nodes.set(id,{id,disabled:false,style:{display:id==='privateReady'?(signed?'block':'none'):'block'},
    textContent:'',onclick:null,children:[],
    replaceChildren(...v){this.children=v;},
    append(...v){this.children.push(...v);}
   });
  }
  return nodes.get(id);
 };
 const context={
  document:{getElementById:node,createElement:tag=>({
   tag,children:[],className:'',textContent:'',href:null,target:null,rel:null,
   append(...v){this.children.push(...v);},
  })},
  $:node,
  fetch:async(url,options)=>{
   requests.push({url,method:options.method,credentials:options.credentials});
   const value=reply[url]||{ok:true,items:[],entries:[],opportunities:[]};
   return {ok:value.ok!==false,json:async()=>value};
  },
  Promise,Number,String,Array,Set,
 };
 vm.runInNewContext(source,context,{filename:'Reality capability shelf'});
 return {context,node,requests};
}
const catalog='/api/reality/work-catalog';
const qualified='/api/reality/personal-qualified-capabilities';
const gaps='/api/reality/personal-real-repair-opportunities';
test('capability refresh is present and gives at least one REAL built-in implementation to review',async()=>{
 assert.match(page,/id="wcRefreshCapabilities"/);
 assert.match(page,/id="wcCapabilityList"/);
 const r=runner();
 await r.context.wcRefreshCapabilities();
 assert.equal(r.node('wcCapabilityList').children.length,1);
 assert.match(r.node('wcCapabilityList').children[0].children[0].textContent,/BUILT-IN/);
 assert.match(r.node('wcCapabilityList').children[0].children[2].textContent,/live proof/);
 assert.ok(r.requests.length===3);
 assert.ok(r.requests.every(x=>x.method==='GET'&&x.credentials==='same-origin'));
 assert.match(r.node('wcCapabilityRefreshStatus').textContent,/No new independently qualified/);
});
test('verified gaps are distinguished from tracked review work and ranked above it',async()=>{
 const issue='https://github.com/maloney2323/Reality/issues/321';
 const r=runner({reply:{
  [catalog]:{ok:true,items:[
   {category:'upgrades',finding_type:'OPEN_ISSUE',title:'Proposed capability',
    evidence_refs:[issue]},
   {category:'upgrades',finding_type:'RECENT_CHANGE_TO_VERIFY',
    title:'Old settled change',evidence_refs:['https://github.com/maloney2323/Reality/commit/'+'a'.repeat(40)]},
  ]},
  [qualified]:{ok:true,entries:[
   {phase:'AWAITING_OWNER_APPROVAL',approval:null,capability_id:'reality.bridge',
    original_work_id:'work:'+'c'.repeat(32),
    qualification:{installation_authorized:false,original_job_completed:false}},
  ]},
  [gaps]:{ok:true,opportunities:[
   {issue_number:321,issue_title:'Independent missing module',
    issue_url:issue,independently_verified:true,job_completed:false,
    installation_authorized:false,original_provider_failed_run_id:123,
    source_sha:'a'.repeat(40),source_path:'src/reality-extensions/new-module.mjs'},
  ]},
 }});
 await r.context.wcRefreshCapabilities();
 const cards=r.node('wcCapabilityList').children;
 assert.equal(cards.length,3); // qualified, verified, built-in; no duplicate issue
 assert.match(cards[0].children[0].textContent,/INDEPENDENTLY QUALIFIED/);
 assert.equal(cards[0].children.some(x=>x.tag==='a'),false);
 assert.match(cards[1].children[0].textContent,/SOURCE-VERIFIED GAP/);
 assert.equal(cards[1].children[3].href,issue);
 assert.match(cards[2].children[0].textContent,/BUILT-IN/);
 assert.ok(r.requests.every(x=>x.method==='GET'));
});
test('closed/settled observations never appear as newly verified opportunities',async()=>{
 const link='https://github.com/maloney2323/Reality/issues/42';
 const r=runner({reply:{
  [catalog]:{ok:true,items:[
   {category:'upgrades',finding_type:'RECENT_CHANGE_TO_VERIFY',title:'Old commit',
    evidence_refs:[link]},
   {category:'upgrades',finding_type:'OPEN_ISSUE',title:'Real open issue',
    evidence_refs:[link]},
  ]},
  [qualified]:{ok:true,entries:[
   {phase:'SETTLED_ISOLATED',capability_id:'old',original_work_id:'work:'+'a'.repeat(32),
    qualification:{installation_authorized:false,original_job_completed:false}},
  ]},
  [gaps]:{ok:true,opportunities:[
   {issue_number:42,issue_url:link,independently_verified:true,job_completed:true,
    installation_authorized:false,original_provider_failed_run_id:123,
    source_sha:'a'.repeat(40),source_path:'src/reality-extensions/old.mjs'},
  ]},
 }});
 await r.context.wcRefreshCapabilities();
 const cards=r.node('wcCapabilityList').children;
 assert.equal(cards.length,2); // review-only open issue, built-in
 assert.match(cards[0].children[0].textContent,/TRACKED OPPORTUNITY/);
 assert.ok(cards.every(x=>!/INDEPENDENTLY QUALIFIED|SOURCE-VERIFIED GAP/.test(x.children[0].textContent)));
 assert.ok(r.requests.every(x=>x.method==='GET'));
});
test('signed-out user can still explore one capability without private readbacks',async()=>{
 const r=runner({signed:false});
 await r.context.wcRefreshCapabilities();
 assert.equal(r.requests.length,1);
 assert.equal(r.requests[0].url,catalog);
 assert.equal(r.node('wcCapabilityList').children.length,1);
 assert.match(r.node('wcCapabilityRefreshStatus').textContent,/Sign in/);
});
test('failed provider never produces fake capability results or POST approval',async()=>{
 const r=runner({reply:{[catalog]:{ok:false},[qualified]:{ok:false},[gaps]:{ok:false}}});
 await r.context.wcRefreshCapabilities();
 assert.equal(r.node('wcCapabilityList').children.length,1);
 assert.match(r.node('wcCapabilityRefreshStatus').textContent,/3 source\(s\) unavailable/);
 assert.ok(r.requests.every(x=>x.method==='GET'));
 assert.doesNotMatch(source,/method:'POST'|installation_authorized:true|APPROVE_THIS_EXACT/);
});
