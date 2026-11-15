import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html');
const js=read('reality-home-command-v1.js');
const css=read('reality-home-command-v1.css');

test('command center is attached only to original Home; original controls remain exactly once',()=>{
 assert.match(html,/<link rel="stylesheet" href="\/reality-home-command-v1.css">/);
 assert.match(html,/<script defer src="\/reality-home-command-v1.js"><\/script>/);
 assert.ok(html.indexOf('reality-home-command-v1.js')>html.indexOf('reality-home-employee-brief-v1.js'));
 for(const id of ['realitySimpleHome','realityHomeEmployees','simpleEconomicEvidenceDashboard',
  'realityShiftHomeNow','realityEmployeeShiftPlanner','realityAuthorizeEmployeeShift',
  'simpleRunFullLoop','realityEconReceipts','realityEconCash','simpleWorkdayCandidates',
  'realityHomeWorkday','realityEconSignals','privateChat'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.doesNotThrow(()=>new vm.Script(js));
});
test('only provider-validated readback text becomes Home data; no new work or ROI engine',()=>{
 for(const source of ['realityEconSignals','realityEconReceipts','realityEconCash',
  'realityEconCapacity','realityShiftHomeNow','simpleWorkdayCandidates',
  'simpleWorkdayStatus','realityHomeEmployees'])
  assert.ok(js.includes(source),source);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/);
 assert.doesNotMatch(js,/AUTHORIZE_EXACT_EMPLOYEE_SHIFT|OWNER_APPROVE_EXACT|\$6,480|142 hours|71%|48%/i);
 assert.ok(js.includes("metrics.ready.value.textContent='Not verified'"));
 assert.ok(js.includes("title.textContent=found!==null&&Number(found)>0"));
 assert.ok(js.includes("details.open=true"));
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/@media\(max-width:860px\)/);
 assert.ok(css.includes('safe-area-inset-bottom'));
});

class Node {
 constructor(tag='div'){
  this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;
  this.className='';this.id='';this.attributes={};this.listeners={};
  this.style={display:'block'};this.hidden=false;this.open=false;
  this.textContent='';this.href='';
  this.classList={values:new Set(),add:k=>this.classList.values.add(k)};
 }
 append(...nodes){for(const n of nodes){
  if(n.parentElement){const p=n.parentElement;p.children.splice(p.children.indexOf(n),1);}
  this.children.push(n);n.parentElement=this;
 }}
 insertBefore(n,ref){
  if(n.parentElement){const p=n.parentElement;p.children.splice(p.children.indexOf(n),1);}
  const at=this.children.indexOf(ref);
  if(at<0)throw Error('BAD_MOUNT');
  this.children.splice(at,0,n);n.parentElement=this;
 }
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(type,fn){this.listeners[type]=fn}
 scrollIntoView(){this.scrolled=true}
 querySelector(){return null}
 querySelectorAll(){return []}
}
function fixture(){
 const ids={};const body=new Node('body');
 const add=id=>{const n=new Node();n.id=id;ids[id]=n;return n};
 const home=add('realitySimpleHome');body.append(home);
 const team=add('realityHomeEmployees'),econ=add('simpleEconomicEvidenceDashboard');
 home.append(team,econ);
 const auth=add('privateReady');auth.style.display='block';
 const defaults={
  realityEconomicStatus:'Read-only source check complete · 4/4 evidence sources validated.',
  realityEconSignals:'24',realityEconSignalsNote:'Provider observations · current defects not yet verified',
  realityEconReceipts:'1 independently reconciled',
  realityEconCash:'Not established',realityEconCapacity:'Not measured',
  realityShiftHomeNow:'Shift status could not be verified.',
  realityShiftHomeNext:'Next shift action unknown.',
  realityEmployeeShiftStatus:'No shift planned yet.',
  realityHomeEmployeesStatus:'8 proposed AI roles · source check complete',
  simpleWorkdayStatus:'Checked connected provider sources. These are opportunities to validate.'
 };
 for(const [id,value] of Object.entries(defaults))add(id).textContent=value;
 add('simpleWorkdayCandidates');
 const planner=add('realityEmployeeShiftPlanner');econ.append(planner);
 const work=add('realityHomeWorkday');econ.append(work);
 const seen=[];
 const context={
  document:{body,createElement:t=>new Node(t),
   getElementById:id=>{
    if(ids[id])return ids[id];
    const find=n=>n.id===id?n:n.children.map(find).find(Boolean);
    return find(body)||null;
   }},
  window:{location:{pathname:'/'}},
  MutationObserver:class {constructor(fn){this.fn=fn;seen.push(this)}
   observe(){}}
 };
 vm.runInNewContext(js,context);
 return {body,ids,seen,get:context.document.getElementById};
}
test('renders verified source signals and final receipts while suppressing readiness/ROI inventions',()=>{
 const f=fixture();
 const command=f.get('realityHomeCommand');
 assert.ok(command,'command exists');
 assert.equal(f.get('realityHomeExistingEvidence').children[1],f.ids.simpleEconomicEvidenceDashboard);
 assert.ok(f.ids.realityHomeEmployees.parentElement!==f.ids.realitySimpleHome);
 const find=(root,cls)=>root.className?.split(' ').includes(cls)?root:
  root.children.map(x=>find(x,cls)).find(Boolean);
 const values=(root,cls)=>{
  const out=[];function scan(n){if(n.className?.split(' ').includes(cls))out.push(n.textContent);
   for(const c of n.children)scan(c);
  }scan(root);return out;
 };
 assert.ok(values(command,'rc-stat-value').includes('24'));
 assert.ok(values(command,'rc-stat-value').includes('1'));
 assert.ok(values(command,'rc-stat-value').includes('Not verified'));
 assert.ok(values(command,'rc-cash').includes('Not established'));
 const action=f.get('realityHomeReviewWork');
 assert.equal(typeof action.listeners.click,'function');
 action.listeners.click();
 assert.equal(f.get('realityHomeExistingEvidence').open,true);
 assert.equal(f.ids.realityEmployeeShiftPlanner.scrolled,true);
});
test('signout and unavailable economic evidence never leave old owner counts on Home',()=>{
 const f=fixture();
 f.ids.privateReady.style.display='none';
 f.seen[0].fn();
 const values=[];
 function scan(n){if(n.className?.split(' ').includes('rc-stat-value'))values.push(n.textContent);
  for(const c of n.children)scan(c);
 }
 scan(f.get('realityHomeCommand'));
 assert.equal(values[0],'—');
 assert.equal(values[4],'Not verified');
});
