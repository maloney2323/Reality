import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const page=readFileSync('index.html','utf8');
const start=page.indexOf('let wcGovernedBuildEligible=false;');
const stop=page.indexOf('let wcUnfinishedReadSerial=0;',start);
assert.ok(start>0&&stop>start,'Scoped Reality queue UI handlers present');
const code=page.slice(start,stop);
const work='work:'+'b'.repeat(32);
function setup({reply,authenticated=true}={}){
 const nodes=new Map();
 function node(id){
  if(!nodes.has(id)){
   const value={id,disabled:false,checked:false,open:false,textContent:'',
    dataset:{},style:{display:id==='privateReady'&&authenticated?'block':'none'},
    children:[],href:'',target:'',rel:'',
    replaceChildren(...args){this.children=args},
    appendChild(value){this.children.push(value)},
    showModal(){this.open=true},
    close(){this.open=false},
    scrollIntoView(){this.scrolled=true},
    click(){this.onclick?.()},
   };
   nodes.set(id,value);
  }
  return nodes.get(id);
 }
 const responses=[],requests=[];
 let get=reply||{ok:true,completed:false,model_generated:false,
  sandbox_executed:false,phase:'NOT_QUEUED',
  queued:false,eligible_for_investigation:true,
  original_work_id:work,goal_id:'confirmed:owner:goal'};
 let post={ok:true,phase:'QUEUED_DISCOVERY',
  original_work_id:work,queue_id:'11111111-1111-4111-8111-111111111111',
  installation_authorized:false,original_job_completed:false};
 const document={
  getElementById:node,
  createTextNode(text){return {textContent:text}},
  createElement(tag){return {tag,textContent:'',href:'',target:'',rel:''}},
 };
 const $=node;
 const context={document,$,console,
  fetch:async(url,options={})=>{
   requests.push({url,method:options.method||'GET',body:options.body});
   const data=(options.method==='POST'?post:get);
   return {ok:!data.error,json:async()=>data};
  },
 };
 vm.runInNewContext(code,context,{filename:'Reality Capability Center handlers'});
 return {context,node,requests,responses,setGet:value=>get=value,setPost:value=>post=value};
}
test('read-only review shows eligible work, never starts a job by itself',async()=>{
 const s=setup();
 await s.context.wcReadGovernedBuild();
 assert.equal(s.requests.length,1);
 assert.equal(s.requests[0].method,'GET');
 assert.equal(s.node('wcRepairStep1').dataset.state,'complete');
 assert.equal(s.node('wcRepairStep2').dataset.state,'active');
 assert.equal(s.node('wcStartGovernedBuild').disabled,false);
 assert.equal(s.node('wcRepairBadge').textContent,'Ready for review');
 assert.equal(s.node('wcRepairStep4').dataset.state,'pending');
 assert.match(s.node('wcRepairApprovalInfo').textContent,/Installation stays locked/);
});
test('one verified user consent is required before discovery POST',async()=>{
 const s=setup();
 await s.context.wcReadGovernedBuild();
 s.node('wcStartGovernedBuild').onclick();
 assert.equal(s.node('wcRepairConsentDialog').open,true);
 assert.equal(s.requests.length,1);
 assert.equal(s.node('wcRepairConfirmInvestigation').disabled,true);
 s.node('wcRepairConsentCheckbox').checked=true;
 s.node('wcRepairConsentCheckbox').onchange();
 assert.equal(s.node('wcRepairConfirmInvestigation').disabled,false);
 await s.node('wcRepairConfirmInvestigation').onclick();
 assert.equal(s.requests.length,2);
 assert.equal(s.requests[1].method,'POST');
 assert.equal(s.requests[1].url,'/api/reality/personal-governed-build');
 assert.deepEqual(JSON.parse(s.requests[1].body),{
  intent:'QUEUE_SAFE_AUTONOMOUS_DISCOVERY',expected_original_work_id:work});
 assert.equal(s.node('wcRepairConsentDialog').open,false);
 assert.equal(s.node('wcStartGovernedBuild').disabled,true);
 assert.equal(s.node('wcRepairStep4').dataset.state,'pending');
 assert.match(s.node('wcGovernedBuildProof').children[0].textContent,/installation/i);
});
test('existing queue stays read-only and cannot be submitted again',async()=>{
 const s=setup({reply:{ok:true,completed:false,model_generated:false,
  sandbox_executed:false,queued:true,phase:'DISPATCHED_TO_ISOLATED_WORKER',
  original_work_id:work,queue_id:'11111111-1111-4111-8111-111111111111',
  worker_observation:{state:'WORKER_PENDING',worker_run_ref:
   'https://github.com/maloney2323/Reality/actions/runs/41174494410'}}});
 await s.context.wcReadGovernedBuild();
 assert.equal(s.node('wcStartGovernedBuild').disabled,true);
 assert.equal(s.node('wcRepairStep3').dataset.state,'pending');
 assert.equal(s.node('wcRepairBadge').textContent,'Investigation recorded');
 assert.equal(s.node('wcGovernedBuildProof').children.length,2);
});
test('blocked dispatch is marked blocked, not successful',async()=>{
 const s=setup({reply:{ok:true,completed:false,model_generated:false,
  sandbox_executed:false,queued:true,phase:'QUEUED_DISPATCH_BLOCKED',
  original_work_id:work,queue_id:'11111111-1111-4111-8111-111111111111'}});
 await s.context.wcReadGovernedBuild();
 assert.equal(s.node('wcRepairStep2').dataset.state,'blocked');
 assert.equal(s.node('wcRepairBadge').dataset.tone,'blocked');
 assert.equal(s.node('wcRepairStep5').dataset.state,'pending');
});
test('unsigned session blocks investigation and installation is never offered',async()=>{
 const s=setup({authenticated:false});
 await s.context.wcReadGovernedBuild();
 assert.equal(s.requests.length,0);
 assert.equal(s.node('wcStartGovernedBuild').disabled,true);
 assert.equal(s.node('wcRepairBadge').dataset.tone,'blocked');
 assert.doesNotMatch(code,/APPROVE_EXACT_VERIFIED_178_UPGRADE_AND_FINISH/);
 assert.doesNotMatch(code,/installCapability|promoteVerifiedUpgrade/);
});
test('UI is mobile-friendly and owner approval is a distinct stage',()=>{
 assert.match(page,/id="wcRepairConsentDialog"/);
 assert.match(page,/id="wcRepairConsentCheckbox"/);
 assert.match(page,/id="wcRepairStep4"/);
 assert.match(page,/Installation always requires your approval/);
 assert.match(page,/@media\(max-width:620px\)\{\.repair-center/);
 assert.match(page,/role="status" aria-live="polite"/);
 assert.doesNotMatch(page,/wcFirstUpgrade178|wcStartFirstGap178/);
});
