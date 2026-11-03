import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const begin=page.indexOf('let wcCapabilityRefreshSerial=0;');
const end=page.indexOf('async function wcDiscoverCatalog(){',begin);
assert.ok(begin>0&&end>begin,'capability shelf must be in live page');
const source=page.slice(begin,end);
const auditUrl='/api/reality/personal-capability-discovery-audit';
const catalogUrl='/api/reality/work-catalog';
const qualifiedUrl='/api/reality/personal-qualified-capabilities';
const uuid='11111111-1111-4111-8111-111111111111';
const stored={ok:true,status:'GOVERNED_AUDIT_RECORDED',audit_executed:true,review_only:true,
 audit_id:uuid,installation_authorized:false,job_started:false,
 production_changed:false,new_evidence_count:0,previously_observed_count:0,
 already_handled_count:0,candidates:[]};
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
   tag,children:[],className:'',textContent:'',href:null,target:null,rel:null,onclick:null,
   append(...v){this.children.push(...v);},
  })},
  $:node,
  fetch:async(url,options)=>{
   requests.push({url,method:options.method,credentials:options.credentials,
    body:options.body,headers:options.headers});
   const value=Object.hasOwn(reply,url)?reply[url]:url===auditUrl?stored:
    {ok:true,items:[],entries:[],opportunities:[]};
   return {ok:value.ok!==false,json:async()=>value};
  },
  Promise,Number,String,Array,Set,
 };
 vm.runInNewContext(source,context,{filename:'Reality capability shelf'});
 return {context,node,requests};
}
test('signed-in click runs governed audit exactly once and shows one real existing capability',async()=>{
 assert.match(page,/id="wcRefreshCapabilities"/);
 const r=runner();
 await r.context.wcRefreshCapabilities();
 assert.equal(r.node('wcCapabilityList').children.length,1);
 assert.match(r.node('wcCapabilityList').children[0].children[0].textContent,/BUILT-IN/);
 assert.equal(r.requests.length,3);
 const post=r.requests.filter(x=>x.method==='POST');
 assert.equal(post.length,1);
 assert.equal(post[0].url,auditUrl);
 assert.deepEqual(JSON.parse(post[0].body),
  {intent:'RUN_GOVERNED_CAPABILITY_DISCOVERY_AUDIT'});
 assert.ok(r.requests.every(x=>x.credentials==='same-origin'));
 assert.match(r.node('wcCapabilityRefreshStatus').textContent,/Governed audit recorded/);
 assert.match(r.node('wcCapabilityRefreshStatus').textContent,/0 first-observed/);
 assert.match(r.node('wcCapabilityRefreshStatus').textContent,/No job created/);
});
test('first-observed verified source gap outranks generic tracked work and cannot double-list an issue',async()=>{
 const issue='https://github.com/maloney2323/Reality/issues/321';
 const r=runner({reply:{
  [catalogUrl]:{ok:true,items:[
   {category:'upgrades',finding_type:'OPEN_ISSUE',title:'Proposal',evidence_refs:[issue]},
   {category:'upgrades',finding_type:'RECENT_CHANGE_TO_VERIFY',title:'Old commit',
    evidence_refs:['https://github.com/maloney2323/Reality/commit/'+'a'.repeat(40)]},
  ]},
  [qualifiedUrl]:{ok:true,entries:[{phase:'AWAITING_OWNER_APPROVAL',approval:null,
   capability_id:'reality.bridge',original_work_id:'work:'+'c'.repeat(32),
   qualification:{installation_authorized:false,original_job_completed:false}}]},
  [auditUrl]:{...stored,new_evidence_count:1,candidates:[{
   kind:'SOURCE_VERIFIED_GAP',title:'Frozen original source missing',
   fingerprint:'a'.repeat(64),evidence_url:issue,
   novelty:'FIRST_OBSERVED_IN_OWNER_AUDIT'}]},
 }});
 await r.context.wcRefreshCapabilities();
 const cards=r.node('wcCapabilityList').children;
 assert.equal(cards.length,3);
 assert.match(cards[0].children[0].textContent,/INDEPENDENTLY QUALIFIED/);
 assert.ok(!cards[0].children.some(x=>x.tag==='a'));
 assert.match(cards[1].children[0].textContent,/FIRST OBSERVED/);
 assert.match(cards[1].children[0].textContent,/SOURCE-VERIFIED GAP/);
 assert.equal(cards[1].children[3].href,issue);
 assert.match(cards[1].children[2].textContent,/has NOT proved/);
 assert.match(cards[1].children.at(-1).textContent,/Review in Reality/);
 assert.match(cards[2].children[0].textContent,/BUILT-IN/);
 assert.equal(r.requests.filter(x=>x.method==='POST').length,1);
});
test('repeated provider CI failures appear as candidates, not verified missing capabilities',async()=>{
 const r=runner({reply:{[auditUrl]:{...stored,new_evidence_count:1,candidates:[{
  kind:'REPEATED_CI_FAILURE',title:'Recurring worker regression',
  fingerprint:'a'.repeat(64),novelty:'FIRST_OBSERVED_IN_OWNER_AUDIT',
  evidence_url:'https://github.com/maloney2323/Reality/actions/runs/12345'}]}}});
 await r.context.wcRefreshCapabilities();
 const cards=r.node('wcCapabilityList').children;
 assert.equal(cards.length,2);
 assert.match(cards[0].children[0].textContent,/RECENT CI FAILURES/);
 assert.match(cards[0].children[2].textContent,/NOT yet proven/);
});
test('already-settled work cannot appear as a NEW capability',async()=>{
 const url='https://github.com/maloney2323/Reality/issues/42';
 const r=runner({reply:{
  [catalogUrl]:{ok:true,items:[{category:'upgrades',finding_type:'OPEN_ISSUE',
   title:'Tracked existing item',evidence_refs:[url]}]},
  [auditUrl]:{...stored,already_handled_count:1,candidates:[{
   kind:'SOURCE_VERIFIED_GAP',title:'Already settled old issue',
   novelty:'ALREADY_SETTLED_NOT_ELIGIBLE',
   evidence_url:url,fingerprint:'a'.repeat(64)}]},
 }});
 await r.context.wcRefreshCapabilities();
 const cards=r.node('wcCapabilityList').children;
 assert.equal(cards.length,2);
 assert.match(cards[0].children[0].textContent,/TRACKED OPPORTUNITY/);
 assert.ok(cards.every(x=>!/FIRST OBSERVED/.test(x.children[0].textContent)));
});
test('signed-out refresh never launches private audit and still displays built-in',async()=>{
 const r=runner({signed:false});
 await r.context.wcRefreshCapabilities();
 assert.equal(r.requests.length,1);
 assert.equal(r.requests[0].url,catalogUrl);
 assert.equal(r.node('wcCapabilityList').children.length,1);
 assert.match(r.node('wcCapabilityRefreshStatus').textContent,/Sign in to launch/);
});
test('audit failure is openly labeled NOT verified, without granting authority',async()=>{
 const r=runner({reply:{[auditUrl]:{ok:false},[catalogUrl]:{ok:false},
  [qualifiedUrl]:{ok:false}}});
 await r.context.wcRefreshCapabilities();
 assert.equal(r.node('wcCapabilityList').children.length,1);
 assert.match(r.node('wcCapabilityRefreshStatus').textContent,/NOT verified/);
 assert.match(r.node('wcCapabilityRefreshStatus').textContent,/3 source\(s\) unavailable/);
 assert.ok(r.requests.every(x=>['GET','POST'].includes(x.method)));
 assert.ok(r.requests.filter(x=>x.method==='POST').every(x=>x.url===auditUrl));
 assert.doesNotMatch(source,/installation_authorized:true|APPROVE_THIS_EXACT/);
});
