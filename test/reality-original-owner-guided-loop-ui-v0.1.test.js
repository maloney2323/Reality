import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync('owner-repair.html','utf8');
const start=html.indexOf('<script>'),end=html.indexOf('</script>',start);
assert.ok(start>=0&&end>start);
const script=html.slice(start+8,end);
const work='work:24cda9611404e9bcb47909976067605c';
const conv='4cc2f119-385c-48b8-8f03-88bbd47360df';
const hash='88d4bba7f2ddf0c7331ddfcc0621b4a13739326451cb53d41ad807c97bceb9b2';

function createHarness({unresolved=false}={}){
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const nodes=Object.fromEntries(ids.map(id=>[id,{
  id,disabled:false,hidden:false,textContent:'',dataset:{},href:'',listeners:{},
  addEventListener(kind,fn){this.listeners[kind]=fn},
 }]));
 let draftCreated=false,installVerified=false,settled=false;
 const calls=[],confirms=[];
 const snapshot=()=>({
  ok:true,original_work_id:work,conversation_id:conv,no_implicit_approval:true,
  verified_settlement_receipt_required:true,
  original_goal_active:true,original_source_verified:false, // LEGACY patch tests absent
  owner_warrant_events:1,sandbox_receipts:1,warranted_upgrade_ready:true,
  verified_draft_ready:draftCreated,installation_verified:installVerified,
  job_settlement_verified:settled,install_approval_can_prepare:draftCreated&&!installVerified,
  resume_approval_can_prepare:installVerified,source_review:{issue_open:true},
  next_required_step:draftCreated?'PREPARE_EXACT_OWNER_INSTALL_APPROVAL':'PREPARE_GOVERNED_DRAFT_PR_AUTHORIZATION',
 });
 const prepare=()=>({
  ok:true,status:'AWAITING_EXACT_GOVERNED_DRAFT_OWNER_APPROVAL',
  stage:'DRAFT',original_work_id:work,expected_candidate_hash:hash,
  target_repository:'maloney2323/Reality',
  target_base:'experiment/reality-live-durable-adversarial-20261025',
  warrant_id:'warrant:'+'9'.repeat(64),
  work_item:{connector:'github',operation:'create_isolated_upgrade_pr',
   inputs:{candidate_hash:hash,draft:true,production_merge_permitted:false}},
  grounding_proof:{version:'test-bound-proof'},
  github_draft_dispatch_configured:true,
  approval_recorded:false,draft_pr_created:false,
  installation_authorized:false,external_action_performed:false,original_job_completed:false,
 });
 const respond=data=>({ok:data.ok!==false,status:data.ok===false?503:200,
  async json(){return data}});
 const fetch=async(url,opts={})=>{
  calls.push({url:String(url),method:opts.method||'GET',intent:opts.body?JSON.parse(opts.body).intent:null});
  if(url.startsWith('/api/reality/personal-unfinished-work'))
   return respond({ok:true,status:'SCOPED_READ_ONLY',
    jobs:[{work_id:work,conversation_id:conv,job_completed:false}]});
  if(url.startsWith('/api/reality/personal-original-repair-owner-console')&&
     (!opts.method||opts.method==='GET'))return respond(snapshot());
  if(url.startsWith('/api/reality/personal-original-executor-run-status'))
   return respond({ok:true,original_work_id:work,owner_warrant_issued:false,
     original_job_completed:false,installed_capability:false,
     installation_package_verified:true,installable_candidate_sha256:hash,
     independent_behavioral_cases_passed:10,independent_security_holdout_passed:4,
     run_id:40762950798,run_url:'https://github.com/maloney2323/Reality/actions/runs/40762950798'});
  if(url==='/api/reality/personal-original-governed-draft'){
   const intent=JSON.parse(opts.body).intent;
   if(intent==='PREPARE_EXACT_GOVERNED_DRAFT')return respond(prepare());
   if(intent==='DISPATCH_ONE_OWNER_APPROVED_GOVERNED_DRAFT'){
    if(unresolved)return respond({ok:true,status:'UNRESOLVED_NO_RETRY',
      original_work_id:work,original_job_completed:false,external_action_may_have_occurred:true});
    draftCreated=true;
    return respond({ok:true,status:'DRAFT_PR_VERIFIED_AND_RESERVATION_SETTLED',
      original_work_id:work,original_job_completed:false,
      draft_durably_recorded:true,independently_reobserved:true,
      candidate_hash:hash,github_pr_number:188});
   }
  }
  if(url==='/api/reality/personal-action-authority')
   return respond({ok:true,status:'EXACT_GOAL_BOUND_ACTION_APPROVED',
    action_approved_for_this_exact_goal:true,external_action_performed:false,
    execution_authorized_by_approval_alone:false});
  if(url==='/api/reality/personal-original-repair-owner-console')
   return respond({ok:true,stage:'INSTALL',original_work_id:work,
    state:'AWAITING_EXPLICIT_OWNER_APPROVAL',authorization_persisted:false,
    external_action_performed:false,original_job_completed:false,
    work_item:{connector:'github',operation:'install_exact_verified_upgrade'},
    grounding_proof:{version:'test-grounding'},approved_pr_number:188,candidate_sha256:hash});
  if(url==='/api/reality/personal-autonomous-upgrade-loop')
   return respond({ok:true,status:'INSTALL_NOT_YET_VERIFIED',original_work_id:work,
    original_job_completed:false});
  throw Error('UNEXPECTED_TEST_FETCH '+url);
 };
 const context=vm.createContext({
  document:{getElementById(id){if(!nodes[id])throw Error('MISSING_DOM_ID '+id);return nodes[id]}},
  window:{confirm(x){confirms.push(x);return true}},
  fetch,console,
 });
 vm.runInContext(script,context);
 const settle=async()=>{
  for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));
 };
 return {nodes,calls,confirms,context,settle,setInstalled(){installVerified=true}};
}
test('guided mobile UI gives one prominent action, hides historical controls and starts with durable original warrant receipts',async()=>{
 assert.match(html,/id="guidedLoop"/);
 assert.match(html,/id="advanced" class="advanced"/);
 assert.match(html,/id="nextAction"/);
 const h=createHarness();await h.settle();
 assert.equal(h.nodes.nextAction.disabled,false);
 const step=vm.runInContext('guidedChoice().type',h.context);
 assert.equal(step,'draft-prepare');
 assert.match(h.nodes.nextReason.textContent,/signed|receipt|Signed/i);
 assert.equal(h.calls.filter(c=>c.method==='POST').length,0);
});
test('one customer control proceeds through read-only prepare, exact approval, and one-time GitHub draft dispatch',async()=>{
 const h=createHarness();await h.settle();
 const act=()=>vm.runInContext('continueReality()',h.context);
 await act();
 assert.match(h.nodes.nextFeedback.textContent,/Action: Create a reviewed DRAFT PR only/);
 assert.equal(vm.runInContext('guidedChoice().type',h.context),'draft-approve');
 await act();
 assert.equal(vm.runInContext('guidedChoice().type',h.context),'draft-run');
 assert.equal(h.calls.filter(c=>c.method==='POST'&&c.url==='/api/reality/personal-original-governed-draft').length,1);
 await act();
 assert.match(h.nodes.nextFeedback.textContent,/independently verified draft PR #188/);
 assert.equal(h.calls.filter(c=>c.intent==='DISPATCH_ONE_OWNER_APPROVED_GOVERNED_DRAFT').length,1);
 assert.equal(vm.runInContext('guidedChoice().type',h.context),'review');
 await act(); // only re-observe the signed-in original job, never re-dispatch
 assert.equal(vm.runInContext('guidedChoice().type',h.context),'install-prepare');
 assert.equal(h.calls.filter(c=>c.intent==='DISPATCH_ONE_OWNER_APPROVED_GOVERNED_DRAFT').length,1);
});
test('uncertain GitHub effect locks one-time dispatch and only allows evidence inspection',async()=>{
 const h=createHarness({unresolved:true});await h.settle();
 const act=()=>vm.runInContext('continueReality()',h.context);
 await act();await act();await act();
 assert.match(h.nodes.nextFeedback.textContent,/not verified|Do NOT retry/i);
 assert.equal(vm.runInContext('guidedChoice().type',h.context),'review');
 await act();await act();
 assert.equal(h.calls.filter(c=>c.intent==='DISPATCH_ONE_OWNER_APPROVED_GOVERNED_DRAFT').length,1);
});
test('independent install readback advances to separate resumption, not a second installation',async()=>{
 const h=createHarness();await h.settle();
 h.setInstalled();
 vm.runInContext('locked=true',h.context);
 await vm.runInContext('refresh()',h.context);
 assert.equal(vm.runInContext('locked',h.context),false);
 assert.equal(vm.runInContext('guidedChoice().type',h.context),'resume-prepare');
 assert.equal(h.nodes.nextAction.disabled,false);
});
