import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const src=readFileSync(new URL('../reality-model-capability-map-v1.js',import.meta.url),'utf8');
const SNAPSHOT='https://github.com/maloney2323/Reality/blob/74159ac09fbb24a516e5f214e06ca9547eb2fe14/';
const make=(tag='div')=>({
 tag,children:[],textContent:'',className:'',href:'',rel:'',target:'',
 append(...items){this.children.push(...items)}
});
function render(){
 const host=make('div');
 vm.runInNewContext(src,{
  document:{getElementById:id=>id==='realityModelCapabilities'?host:null,
   createElement:make,createTextNode:text=>({tag:'#text',textContent:text})},
  fetch:()=>{throw Error('NO_PROVIDER_CALLS_ALLOWED')},window:{}
 });
 return host;
}
function descendants(node,tag){
 return [...(node.children||[])].flatMap(child=>[
  ...(child.tag===tag?[child]:[]),...descendants(child,tag)]);
}
function textOnly(node){
 return [String(node.textContent||''),
  ...(node.children||[]).map(textOnly)].join(' ');
}
test('Engine Delta includes a specific model-augmentation capability map',()=>{
 const a=html.indexOf('id="realityModelCapabilityMap"');
 const b=html.indexOf('id="realityEngineDelta"');
 const c=html.indexOf('id="realityCategoryEconomics"');
 assert.ok(b>=0&&a>b&&c>a);
 assert.match(html,/THE ABILITIES REALITY ADDS/);
 assert.match(html,/what boundaries it enforces/i);
 assert.match(html,/Source files and automated test suites/);
 assert.match(html,/src="\/reality-model-capability-map-v1\.js"/);
 assert.match(html,/@media\(max-width:680px\)/);
 assert.doesNotThrow(()=>new vm.Script(src));
});
test('eleven concrete capabilities appear in four operational groups',()=>{
 const host=render(),groups=host.children;
 assert.equal(groups.length,4);
 assert.equal(groups.reduce((n,g)=>n+descendants(g,'details').length,0),11);
 const headings=groups.map(g=>textOnly(g.children[0]));
 assert.match(headings[0],/Understand and remember/);
 assert.match(headings[1],/Enforce permission and safety/);
 assert.match(headings[2],/Improve and continue work/);
 assert.match(headings[3],/Verify, prove and value/);
 const contents=textOnly(host);
 for(const phrase of [
  'Durable original-work continuity','Source-backed opportunity discovery',
  'Failure versus capability-gap diagnosis','Exact-work execution authority',
  'Two explicit authorization boundaries','Evidence-gated self-upgrade orchestration',
  'Business-specific capability acquisition',
  'Original-job continuation safeguards','Independent post-install acceptance',
  'Durable final settlement receipts','Evidence-scoped business value',
  'What the model gains:','What Reality enforces:'
 ])assert.ok(contents.includes(phrase),phrase);
});
test('each capability links to an existing implementation and automated test',()=>{
 const details=descendants(render(),'details');
 const refs=[];
 for(const d of details){
  const links=descendants(d,'a');
  assert.equal(links.length,2);
  assert.match(textOnly(d),/Code and tests available/);
  for(const link of links){
   assert.ok(link.href.startsWith(SNAPSHOT),link.href);
   assert.equal(link.rel,'noopener noreferrer');
   const rel=link.href.slice(SNAPSHOT.length);
   assert.match(rel,/^(?:src|test)\/[a-zA-Z0-9._/-]+\.js$/);
   assert.ok(!rel.includes('..'));
   assert.ok(existsSync(new URL('../'+rel,import.meta.url)),rel);
   refs.push(rel);
  }
 }
 assert.equal(refs.length,22);
 assert.equal(refs.filter(x=>x.startsWith('src/')).length,11);
 assert.equal(refs.filter(x=>x.startsWith('test/')).length,11);
 assert.equal(new Set(refs).size,22);
});
test('no manufactured statistics, action authority or general production readiness claims',()=>{
 assert.doesNotMatch(src,/100% safety|0\.0%|zero hallucinations|no competitors|fully autonomous workday proven|all repairs guaranteed/i);
 assert.doesNotMatch(src,/fetch\(['"]\/api\/|localStorage|OWNER_APPROVE_EXACT_VERIFIED|INSTALL_CAPABILITY|method:\s*['"]POST/);
 assert.match(src,/general full-loop automation remains under validation/);
 assert.match(src,/verified net savings not yet established/);
 assert.match(html,/not that every scenario is production-ready/);
 assert.equal(descendants(render(),'button').length,0);
});

test('customer-adaptation story binds model generation to authentic customer work and independent governance',()=>{
 const segment=html.slice(html.indexOf('id="realityCustomerAdaptation"'),
  html.indexOf('id="realityModelCapabilityMap"'));
 assert.ok(segment.length>200);
 assert.match(segment,/Reality adapts to the business—not just the prompt/);
 assert.match(segment,/Cross-business architecture · Live generality not yet certified/);
 assert.match(segment,/underlying model|model intelligence|model can propose and build/i);
 assert.match(segment,/The model cannot grant itself authority/);
 assert.match(segment,/final receipt only after independent settlement/);
 assert.match(segment,/multi-industry autonomous adaptation .* remain to be independently demonstrated/);
 const stages=(segment.match(/<li>/g)||[]).length;
 assert.equal(stages,5);
 const fullText=textOnly(render());
 assert.match(fullText,/Business-specific capability acquisition/);
 assert.match(fullText,/cross-business self-adaptation not yet independently certified/);
 assert.match(fullText,/trusted server adapters/);
});
