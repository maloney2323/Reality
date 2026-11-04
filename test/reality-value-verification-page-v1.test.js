import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html');
const client=read('reality-value-verification-v1.js');
const config=JSON.parse(read('vercel.json'));
const count=id=>(html.match(new RegExp('id="'+id+'"','g'))||[]).length;
test('Value Verification is a real, standalone, direct-linkable tab',()=>{
 assert.ok(config.rewrites.some(r=>r.source==='/value'&&r.destination==='/index.html'));
 assert.ok(config.rewrites.some(r=>r.source==='/chat'&&r.destination==='/index.html'));
 assert.match(html,/<a id="realityValueTab" href="\/value">Value Verification<\/a>/);
 assert.match(html,/id="realityValueVerification"[^>]*hidden aria-labelledby="realityValueTitle"/);
 assert.ok(html.includes('body[data-reality-route="value"] main > :not(.top):not(#realityValueVerification)'));
 assert.match(html,/\$\('realityValueTab'\)\.setAttribute\('aria-current',realityIsValuePage\(\)\?'page':'false'\)/);
 assert.match(html,/src="\/reality-value-verification-v1\.js"/);
 assert.match(html,/<a href="\/value">View detailed business evidence<\/a>/);
 assert.match(html,/href="\/chat">Ask Reality about this evidence/);
});
test('mobile and desktop Value page cannot be concealed by legacy Home-only CSS',()=>{
 const css=html.slice(html.indexOf('<style>')+7,html.indexOf('</style>'));
 const legacy='body.reality-simple-home:not(.reality-details-open) main >';
 assert.ok(!css.includes(legacy),'legacy selector hides the entire /value page when Home details are collapsed');
 assert.ok(css.includes('body.reality-simple-home[data-reality-route="home"]:not(.reality-details-open) main >'));
 assert.ok(css.includes('body[data-reality-route="value"] main > #realityValueVerification{display:block!important}'));
 assert.ok(css.includes('body[data-reality-route="value"] main > :not(.top):not(#realityValueVerification){display:none!important}'));
 assert.ok(html.includes('const realityIsValuePage=()=>'));
 assert.match(html,/document\.body\.dataset\.realityRoute=realityIsChatPage\(\)\?'chat':realityIsValuePage\(\)\?'value':'home'/);
 assert.match(html,/@media\(max-width:600px\)/);
});
test('source IDs remain single-owner; no duplicated receipts, models or value widgets',()=>{
 for(const id of ['realityEconSignals','realityEconSettled','realityEconReceipts',
  'realityEconCapacity','realityPublishedRepairEvidence','realityHomeCategories',
  'realityHomePlanning','realityEconWorkHistory','realityEconCash','realityEconHuman',
  'realityBacklogValuePanel','realityCategoryEconomics','realityCategoryOwnerStatus',
  'realityValueVerification','rvSignals','rvReceipts','rvFindings','rvCandidates',
  'rvSettled','rvCapacity','rvReceiptEvidence','rvMeasuredInputs','realityValueTab'])
  assert.equal(count(id),1,id+' must have exactly one source/view node');
 assert.match(client,/relocate\('#realityPublishedRepairEvidence','rvPublishedSource'\)/);
 assert.match(client,/relocate\('#realityHomeCategories','rvCategories'\)/);
 assert.match(client,/relocate\('\.reality-home-proof','rvReceiptEvidence'\)/);
 assert.match(client,/relocate\('#realityHomeFinance','rvMeasuredInputs'\)/);
 assert.doesNotMatch(client,/cloneNode|innerHTML|OWNER_APPROVE_EXACT|createJob|method:'POST'/);
});
test('value proof separates opportunity signals, historical assumptions and accepted original jobs',()=>{
 assert.match(html,/VALUE BEFORE AUTOMATION/);
 assert.match(html,/ILLUSTRATIVE · NOT REALIZED SAVINGS/);
 assert.match(html,/INDEPENDENTLY VERIFIED · REALIZED OUTCOMES/);
 assert.match(html,/Historical benchmark models, potential revenue or avoided cost/);
 assert.match(html,/A pipeline stage is not marked complete for any specific job/);
 assert.match(html,/Provider observations aren't completed jobs or verified capability gaps/);
 assert.match(html,/Verified net human capacity returned/);
 assert.match(html,/Not measured/);
 assert.match(html,/Review the exact original-job evidence/);
 assert.doesNotMatch(html.slice(html.indexOf('id="realityValueVerification"'),
  html.indexOf('id="realitySimpleHome"')),/\$\d{3,}|97\.3% Saved|6\.8 hrs|9\.4 hrs|413 jobs/);
});
test('browser code is valid, read-only, owner-gated, and recalculates on source readbacks',()=>{
 assert.doesNotThrow(()=>new vm.Script(client));
 assert.match(client,/MutationObserver/);
 assert.match(client,/privateReady/);
 assert.match(client,/const findings=isSignedIn/);
 assert.match(client,/const candidates=isSignedIn/);
 assert.match(client,/Cash savings not measured/);
 assert.doesNotMatch(client,/fetch\(|localStorage|sessionStorage|OWNER_APPROVE/);
});
test('Value page projects existing signed-in evidence without inventing additional savings',()=>{
 const nodes=new Map();
 function el(id,text='',tagName='DIV'){
  const o={id,textContent:text,tagName,hidden:false,open:false,children:[],
   style:{display:''},attributes:{},
   appendChild(v){this.children.push(v);v.parent=this},
   removeAttribute(k){delete this.attributes[k]},
   querySelector(){return null}};
  nodes.set(id,o);return o;
 }
 for(const id of ['realityValueVerification','rvCategories','rvPublishedSource',
 'rvPotentialPlanning','rvReceiptEvidence','rvMeasuredInputs','rvSourceStatus',
 'rvSignals','rvSettled','rvReceipts','rvCapacity','rvFindings','rvCandidates',
 'realityEconSignals','realityEconSettled','realityEconReceipts','realityEconCapacity',
 'privateReady','realityCategoryOwnerStatus'])el(id);
 el('realityHomeCategories','','DETAILS');el('realityPublishedRepairEvidence','','SECTION');
 el('realityHomePlanning','','DETAILS');el('realityHomeFinance','','DETAILS');
 el('proofElement','','DIV');
 nodes.get('realityEconSignals').textContent='123';
 nodes.get('realityEconSettled').textContent='3';
 nodes.get('realityEconReceipts').textContent='1 independently reconciled';
 nodes.get('realityEconCapacity').textContent='Not measured';
 nodes.get('privateReady').style.display='block';
 nodes.get('realityCategoryOwnerStatus').textContent='6 tracked · 1 verified implementation defect(s) · No new install approved';
 const doc={body:{dataset:{realityRoute:'value'}},getElementById:id=>nodes.get(id),
  querySelector:selector=>selector==='.reality-home-proof'?nodes.get('proofElement'):null};
 vm.runInNewContext(client,{document:doc,Promise,window:{addEventListener(){}}});
 assert.equal(nodes.get('realityValueVerification').hidden,false);
 assert.equal(nodes.get('rvSignals').textContent,'123');
 assert.equal(nodes.get('rvSettled').textContent,'3');
 assert.equal(nodes.get('rvReceipts').textContent,'1 independently reconciled');
 assert.equal(nodes.get('rvCapacity').textContent,'Not measured');
 assert.equal(nodes.get('rvFindings').textContent,'6');
 assert.equal(nodes.get('rvCandidates').textContent,'1');
 assert.equal(nodes.get('rvCategories').children[0].id,'realityHomeCategories');
 assert.equal(nodes.get('rvReceiptEvidence').children[0].id,'proofElement');
 assert.equal(nodes.get('rvMeasuredInputs').children[0].id,'realityHomeFinance');
 assert.equal(nodes.get('realityHomeFinance').open,false);
 assert.match(nodes.get('rvSourceStatus').textContent,/Evidence verified for this view/);
});
test('route remains inactive on Home and Chat and leaves source modules untouched',()=>{
 for(const route of ['home','chat']){
  const page={hidden:true};
  const doc={body:{dataset:{realityRoute:route}},getElementById:id=>id==='realityValueVerification'?page:null};
  assert.doesNotThrow(()=>vm.runInNewContext(client,{document:doc}));
  assert.equal(page.hidden,true);
 }
});

test('five focused sections replace full-page scrolling without removing any evidence IDs',()=>{
 const views=['Overview','Opportunities','Potential','Results','Governance'];
 const panels=['rvPanelOverview','rvPanelOpportunities','rvPanelPotential','rvPanelResults','rvPanelGovernance'];
 for(const id of views.map(x=>'rvTab'+x).concat(panels)){
  assert.equal(count(id),1,'missing focused navigation or content: '+id);
 }
 assert.match(html,/id="rvViewNav"[^>]*role="tablist"/);
 assert.match(html,/id="rvTabOverview"[^>]*aria-selected="true"/);
 assert.match(html,/id="rvPanelOverview"[^>]*role="tabpanel"/);
 for(const id of panels.slice(1))
  assert.match(html,new RegExp('id="'+id+'"[^>]*role="tabpanel"[^>]*hidden'));
 for(const id of ['rvPanelResults','rvPanelPotential','rvPanelOpportunities'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/class="rv-deep-dive"/);
 assert.match(client,/event\.key==='ArrowRight'/);
 assert.match(client,/event\.key==='ArrowLeft'/);
 assert.match(client,/event\.key==='Home'/);
 assert.match(client,/event\.key==='End'/);
 assert.match(html,/#realityValueVerification \.rv-tabpanel\[hidden\]\{display:none!important\}/);
 assert.match(html,/@media\(max-width:600px\)/);
});
test('mobile evidence navigator is interactive, keyboard accessible and preserves signed-in sources',()=>{
 const nodes=new Map();
 const mk=(id,tagName='DIV')=>{
  const el={id,tagName,children:[],handlers:{},style:{display:''},
   textContent:'',hidden:tagName==='SECTION',open:true,attributes:{},
   appendChild(n){this.children.push(n)},
   removeAttribute(n){delete this.attributes[n]},
   addEventListener(name,fn){this.handlers[name]=fn},
   setAttribute(name,value){this.attributes[name]=value},
   getAttribute(name){return this.attributes[name]},
   querySelector(){return null},
   focus(){this.focused=true},
   scrollIntoView(){this.scrolled=true}};
  nodes.set(id,el);return el;
 };
 for(const id of ['realityValueVerification','rvCategories','rvPublishedSource',
  'rvPotentialPlanning','rvReceiptEvidence','rvMeasuredInputs','rvSourceStatus',
  'rvSignals','rvSettled','rvReceipts','rvCapacity','rvFindings','rvCandidates',
  'realityEconSignals','realityEconSettled','realityEconReceipts','realityEconCapacity',
  'privateReady','realityCategoryOwnerStatus','realityCategoryOwnerCount',
  'realityCategoryVerifiedRepairs','rvViewNav'])mk(id);
 const names=['Overview','Opportunities','Potential','Results','Governance'];
 for(const name of names){mk('rvTab'+name,'BUTTON');mk('rvPanel'+name,'SECTION')}
 for(const [id,tag] of [
  ['realityHomeCategories','DETAILS'],['realityPublishedRepairEvidence','SECTION'],
  ['realityHomePlanning','DETAILS'],['realityHomeFinance','DETAILS'],
  ['proofElement','DIV']])mk(id,tag);
 nodes.get('privateReady').style.display='block';
 nodes.get('realityEconSignals').textContent='122';
 nodes.get('realityEconSettled').textContent='3';
 nodes.get('realityEconReceipts').textContent='1 independently reconciled';
 nodes.get('realityEconCapacity').textContent='Not measured';
 nodes.get('realityCategoryOwnerStatus').textContent='6 saved current owner intake record(s) · 1 independently tested existing-code repair(s)';
 nodes.get('realityCategoryOwnerCount').textContent='6';
 nodes.get('realityCategoryVerifiedRepairs').textContent='1';
 const shortcut=mk('overviewToResults','BUTTON');
 shortcut.getAttribute=name=>name==='data-rv-show'?'results':null;
 const doc={body:{dataset:{realityRoute:'value'}},
  getElementById:id=>nodes.get(id),
  querySelector:q=>q==='.reality-home-proof'?nodes.get('proofElement'):null,
  querySelectorAll:q=>q==='#realityValueVerification [data-rv-show]'?[shortcut]:[]};
 vm.runInNewContext(client,{document:doc,Promise,window:{addEventListener(){}}});
 assert.equal(nodes.get('rvPanelOverview').hidden,false);
 for(const n of names.slice(1))assert.equal(nodes.get('rvPanel'+n).hidden,true);
 assert.equal(nodes.get('rvFindings').textContent,'6');
 assert.equal(nodes.get('rvCandidates').textContent,'1');
 assert.equal(nodes.get('rvSignals').textContent,'122');
 assert.equal(nodes.get('realityHomeCategories').open,false);
 assert.equal(nodes.get('realityHomePlanning').open,false);
 assert.equal(nodes.get('realityHomeFinance').open,false);
 const button=nodes.get('rvTabOpportunities');
 button.handlers.click();
 assert.equal(nodes.get('rvPanelOverview').hidden,true);
 assert.equal(nodes.get('rvPanelOpportunities').hidden,false);
 assert.equal(button.attributes['aria-selected'],'true');
 assert.equal(nodes.get('rvTabOverview').tabIndex,-1);
 let prevented=false;
 button.handlers.keydown({key:'ArrowRight',preventDefault(){prevented=true}});
 assert.equal(prevented,true);
 assert.equal(nodes.get('rvPanelPotential').hidden,false);
 assert.equal(nodes.get('rvPanelOpportunities').hidden,true);
 assert.equal(nodes.get('rvTabPotential').focused,true);
 shortcut.handlers.click();
 assert.equal(nodes.get('rvPanelResults').hidden,false);
 assert.equal(nodes.get('rvPanelPotential').hidden,true);
 assert.equal(nodes.get('rvViewNav').scrolled,true);
 assert.equal(nodes.get('realityHomeFinance').open,false);
});
