import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const archive=readFileSync(new URL('../reality-past-jobs-receipts-v1.js',import.meta.url),'utf8');
const inline=page.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
const WORK='work:'+'a'.repeat(32);
const HIST='work:'+'b'.repeat(32);
function node(tag='div'){
 return {tag,children:[],style:{},dataset:{},hidden:false,disabled:false,
  textContent:'',listeners:{},classList:{add(){},remove(){}},
  append(...args){this.children.push(...args)},
  replaceChildren(...args){this.children=args},
  before(){},scrollIntoView(){},setAttribute(){},
  addEventListener(name,fn){this.listeners[name]=fn},
  click(){this.listeners.click?.()}};
}
function mount({signed=true,job=null,final=null,history=[]}={}){
 const ids=['realitySimpleHome','simpleArchivePanel','archiveJobs','archivePriorUpgrades',
  'archivePriorActions','archiveReadback','archiveRefresh','simpleAdvancedToggle',
  'wcCompletionCenter','wcShiftReceipt','wcRefreshCompletion','privateReady'];
 const els=Object.fromEntries(ids.map(id=>[id,node()]));
 els.privateReady.style.display=signed?'block':'none';
 const events={},calls=[];
 const owner={ok:true,status:'OWNER_GOVERNED_LOOP_READBACK',
  production_changed:false,external_action_performed:false,
  jobs:job?[job]:[],independent_final_receipts:final?[final]:[]};
 const old={ok:true,status:'OWNER_GAP_INTAKE_RECONCILED',
  read_only:true,work_started:false,installation_authorized:false,
  production_changed:false,settled_history:history};
 vm.runInNewContext(archive,{
  document:{getElementById:id=>els[id],createElement:node,
   addEventListener:(name,fn)=>{events[name]=fn},
   body:{classList:{add(){},remove(){}}}},
  MutationObserver:class{observe(){}},
  fetch:async(url,opt)=>{calls.push({url,opt});return {
   ok:true,json:async()=>url.includes('loop-status')?owner:old}},
  encodeURIComponent
 },{filename:'reality-past-jobs-receipts-v1.js'});
 const open=()=>events.click({target:{closest:selector=>
  selector.includes('simpleArchiveOpen')?{}:null}});
 return {els,calls,open};
}
async function settle(){await new Promise(resolve=>setImmediate(resolve));}
test('separate archive is visible from home and categories, and all scripts parse',()=>{
 assert.match(page,/id="simpleArchiveOpen"[^>]*>Past Jobs &amp; Receipts/);
 assert.match(page,/id="simpleArchivePanel" hidden/);
 assert.match(page,/data-archive-open="1"/);
 assert.match(page,/src="\/reality-past-jobs-receipts-v1\.js"/);
 assert.doesNotThrow(()=>new vm.Script(archive));
 assert.doesNotThrow(()=>new vm.Script(inline));
 assert.doesNotMatch(archive,/method:\s*['"]POST['"]|ownerApprove|install_capability|start_job|github\.create_issue/);
 assert.doesNotMatch(inline.slice(inline.indexOf('function wcGapEvidenceCards()'),
  inline.indexOf('async function wcLoadGapFeed()')),
  /prior completed upgrades · Not new gaps/);
});
test('verified original work exposes the exact authenticated PDF link, no writes',async()=>{
 const job={original_work_id:WORK,capability_id:'reality-general-execution-receipt',
  independently_settled:true,universe_settlement_verified:true,
  full_loop_independently_verified:true};
 const final={original_work_id:WORK,status:'FULL_LOOP_INDEPENDENTLY_VERIFIED'};
 const f=mount({job,final,history:[{title:'Older upgrade',stage:'SETTLED_ISOLATED',
  historical_settlement_verified:true,source_commit:'c'.repeat(40),
  source_url:'https://github.com/maloney2323/Reality/commit/'+'c'.repeat(40)}]});
 f.open();await settle();
 assert.equal(f.calls.length,2);
 assert.ok(f.calls.every(c=>c.opt.method==='GET'&&c.opt.credentials==='same-origin'));
 assert.match(f.els.archiveReadback.textContent,/1 independently settled/);
 const card=f.els.archiveJobs.children[0];
 const links=card.children.filter(x=>x.tag==='a');
 assert.equal(links.length,1);
 assert.equal(links[0].href,
  '/api/reality/personal-genuine-final-receipt-pdf?work_id='+encodeURIComponent(WORK));
 assert.equal(f.els.archivePriorUpgrades.children.length,1);
});
test('unverified settlement never gets a completed-job card or PDF',async()=>{
 const f=mount({job:{original_work_id:WORK,
  capability_id:'reality-general-execution-receipt',
  independently_settled:true,universe_settlement_verified:false,
  full_loop_independently_verified:false}});
 f.open();await settle();
 assert.equal(f.els.archiveJobs.children.filter(x=>x.className==='archive-record').length,0);
 assert.match(f.els.archiveReadback.textContent,/0 independently settled/);
});
test('an older already-satisfied reconciliation is labeled unfinished, not given a new receipt',async()=>{
 const f=mount({job:{original_work_id:HIST,
  capability_id:'reality-continuity-settlement-reconciler',independently_settled:false,
  historical_reconciliation:{status:'HISTORICAL_RECONCILIATION_ALREADY_VERIFIED_NO_NEW_EFFECT',
   current_job_settled:false}}});
 f.open();await settle();
 const card=f.els.archiveJobs.children[0];
 assert.ok(card.children.some(x=>/NOT independently settled/.test(x.textContent)));
 assert.equal(card.children.filter(x=>x.tag==='a').length,0);
});
test('signed-out archive makes no server requests and displays no saved results',async()=>{
 const f=mount({signed:false});
 f.open();await settle();
 assert.equal(f.calls.length,0);
 assert.match(f.els.archiveReadback.textContent,/Sign in/);
});
