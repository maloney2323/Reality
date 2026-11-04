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
 assert.match(html,/body\.reality-simple-home\[data-reality-route="value"\] main > :not\(\.top\):not\(#realityValueVerification\)/);
 assert.match(html,/\$\('realityValueTab'\)\.setAttribute\('aria-current',realityIsValuePage\(\)\?'page':'false'\)/);
 assert.match(html,/src="\/reality-value-verification-v1\.js"/);
 assert.match(html,/<a href="\/value">View detailed business evidence<\/a>/);
 assert.match(html,/href="\/chat">Ask Reality about this evidence/);
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
 assert.match(html,/POTENTIAL VALUE · NOT REALIZED SAVINGS/);
 assert.match(html,/REALIZED VALUE · INDEPENDENT EVIDENCE/);
 assert.match(html,/Historical benchmark models, potential revenue or avoided cost/);
 assert.match(html,/A pipeline stage is not marked complete for any specific job/);
 assert.match(html,/not proof the work was completed or time saved/);
 assert.match(html,/Net human capacity returned/);
 assert.match(html,/Not measured/);
 assert.match(html,/Only independently linked original-job outcomes/);
 assert.doesNotMatch(html.slice(html.indexOf('id="realityValueVerification"'),
  html.indexOf('id="realitySimpleHome"')),/\$\d{3,}|97\.3% Saved|6\.8 hrs|9\.4 hrs|413 jobs/);
});
test('browser code is valid, read-only, owner-gated, and recalculates on source readbacks',()=>{
 assert.doesNotThrow(()=>new vm.Script(client));
 assert.match(client,/MutationObserver/);
 assert.match(client,/privateReady/);
 assert.match(client,/isSignedIn&&findings/);
 assert.match(client,/isSignedIn&&candidates/);
 assert.match(client,/No cash savings inferred/);
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
 assert.equal(nodes.get('realityHomeFinance').open,true);
 assert.match(nodes.get('rvSourceStatus').textContent,/incomplete/);
});
test('route remains inactive on Home and Chat and leaves source modules untouched',()=>{
 for(const route of ['home','chat']){
  const page={hidden:true};
  const doc={body:{dataset:{realityRoute:route}},getElementById:id=>id==='realityValueVerification'?page:null};
  assert.doesNotThrow(()=>vm.runInNewContext(client,{document:doc}));
  assert.equal(page.hidden,true);
 }
});