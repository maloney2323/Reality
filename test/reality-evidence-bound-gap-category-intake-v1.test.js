import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../api/reality/personal-gap-intake.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261103_owner_capability_gap_category_intake_v1.sql',import.meta.url),'utf8');
const inline=page.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
const index=inline.indexOf('// The gap intake connects actual saved source evidence');
const end=inline.indexOf('function wcRender(){',index);
assert.ok(index>0&&end>index);
const renderer=inline.slice(index,end);
const OWNER='85eeae0b-2988-43c4-b20c-590fb51da70d';
function fake({items=6,history=3}={}){
 const result={
  ok:true,status:'OWNER_GAP_INTAKE_RECONCILED',
  counts:{
   current_candidates:items,verified_current_gaps:0,
   historical_completed:history,independently_tested_candidates:1,
   research_assessed:4,provider_failures_to_investigate:1,
   governed_active_queue:0},
  read_only:true,installation_authorized:false,work_started:false,
  production_changed:false,
  source_basis:'PERSISTED_OWNER_EVIDENCE_NO_PROVIDER_LIVE_REFRESH',
  items:Array.from({length:items},(_,i)=>({
    kind:i===0?'INDEPENDENTLY_TESTED_CANDIDATE':i===1?'CI_FAILURE_INVESTIGATION':'RESEARCH_OPPORTUNITY',
    stage:'INSPECTED_NEEDS_INDEPENDENT_GAP_TEST',
    title:'Evidence-backed item '+i,
    what_it_does:'Review genuine source evidence',
    potential_value:'Potential improvement, not a measured result',
    pros:['Independent source','Contains next proof'],
    cons:['Missing current testing','Unmeasured implementation costs'],
    risk:'Do not claim a repair without current evidence',
    next_proof:'Reproduce source failure on the original owner job',
    priority:i,source_url:'https://github.com/maloney2323/Reality/issues/188',
    source_receipt:'hash',installation_authorized:false,executable_job:false,
    verified_missing_capability:false
  })),
  settled_history:Array.from({length:history},(_,i)=>({
    title:'Historical settled '+i,
    stage:'SETTLED_ISOLATED',
    source_url:'https://github.com/maloney2323/Reality/commit/'+'a'.repeat(40)
  }))
 };
 return result;
}
function mount(data=fake(),signed=true){
 const nodes={
  privateReady:{style:{display:signed?'block':'none'}},
  simpleGapFeedStatus:{textContent:''}
 };
 let reads=[],renders=0;
 const context={
  $:id=>nodes[id],esc:s=>String(s).replace(/[<>&"']/g,x=>({
   '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'
  }[x])),
  wcRender:()=>{renders++},
  fetch:async(url,opt)=>{reads.push({url,opt});return {ok:true,json:async()=>data}}
 };
 vm.createContext(context);
 vm.runInContext("let wcGapFeed=[],wcGapHistory=[],wcGapFeedReady=false,wcGapFeedSerial=0;let wcGapCounts={current_candidates:0,verified_current_gaps:0,historical_completed:0};let wcGapFeedStatus='Not checked';"+renderer,context);
 return {context,nodes,reads,get renders(){return renders}};
}
test('full homepage and category handler parse without changing existing governor',()=>{
 assert.doesNotThrow(()=>new vm.Script(inline));
 assert.match(page,/id="simpleViewGapCategory"/);
 assert.match(page,/id="simpleGapFeedStatus"/);
 assert.match(inline,/wcCurrent='upgrades';wcRender\(\)/);
 assert.match(inline,/wcGapEvidenceCards\(\)/);
 assert.match(inline,/wcLoadGapFeed\(\)/);
 assert.match(inline,/setInterval\(\(\)=>\{if\(homeOwnerSignedIn\(\)\)void wcLoadGapFeed\(\);\},60000\)/);
 assert.match(inline,/wcInvestigateMarket\(\{restore:true\}\);void wcLoadGapFeed\(\)/);
});
test('active category displays only current evidence and keeps settled history out of its cards',async()=>{
 const x=mount();
 await vm.runInContext('wcLoadGapFeed()',x.context);
 assert.equal(x.reads.length,1);
 assert.equal(x.reads[0].url,'/api/reality/personal-gap-intake');
 assert.equal(x.reads[0].opt.method,'GET');
 assert.equal(x.reads[0].opt.credentials,'same-origin');
 assert.match(x.nodes.simpleGapFeedStatus.textContent,/6 tracked/);
 assert.match(x.nodes.simpleGapFeedStatus.textContent,/0 proven current gaps/);
 assert.match(x.nodes.simpleGapFeedStatus.textContent,/Historical records are filed separately in Past Jobs & Receipts/);
 const html=vm.runInContext('wcGapEvidenceCards()',x.context);
 assert.match(html,/6 tracked · 0 proven current gaps/);
 assert.match(html,/TESTED CANDIDATE/);
 assert.match(html,/PROVIDER FAILURE OBSERVED/);
 assert.match(html,/ASSESSED RESEARCH/);
 assert.doesNotMatch(html,/3 prior completed upgrades · Not new gaps/);
 assert.match(html,/Past Jobs &amp; Receipts/);
 assert.doesNotMatch(html,/data-wc-start|data-recovery-run|data-owner-approve/);
 assert.equal(x.renders,1);
});
test('forged proof stage, changed authority, and wrong counts are rejected',async()=>{
 for(const mutate of [
  x=>x.items[0].installation_authorized=true,
  x=>x.items[0].executable_job=true,
  x=>x.items[0].verified_missing_capability=true,
  x=>x.counts.current_candidates=99,
  x=>x.source_basis='UNVERIFIED_LIVE_PROVIDER_SCAN',
  x=>x.work_started=true
 ]){
  const r=fake();mutate(r);
  const x=mount(r);await vm.runInContext('wcLoadGapFeed()',x.context);
  assert.equal(vm.runInContext('wcGapFeedReady',x.context),false);
  assert.match(x.nodes.simpleGapFeedStatus.textContent,/could not be verified/);
 }
});
test('logout prevents reading and clears view without inferring empty gap discovery',async()=>{
 const x=mount(fake(),false);
 await vm.runInContext('wcLoadGapFeed()',x.context);
 assert.equal(x.reads.length,0);
 assert.equal(vm.runInContext('wcGapFeedReady',x.context),false);
});
test('backend only accepts authenticated read-only owner and trusted evidence',()=>{
 for(const token of [
  "req.method!=='GET'","req.query","VERCEL_ENV!=='preview'",
  'authenticatedChatSession(req,res)','session.user_id',
  'db.url!==session.config.url',
  "db.project!=='hvkfreoagbrphwghjajw'",
  'reality_read_owner_capability_gap_feed_v1',
  'p_owner_id:session.user_id',
  'payload.owner_id!==session.user_id',
  'payload.counts.verified_current_gaps',
  'payload.installation_authorized!==false']){
  assert.ok(api.includes(token),'missing '+token);
 }
 assert.doesNotMatch(api,/githubWrite|create_issue|install_capability|ownerApprove/);
});
test('database categorizes real evidence and excludes settled from active',()=>{
 for(const name of [
  'market_finding_assessments_v1','capability_discovery_audit_sightings_v1',
  'verified_candidate_handoffs_v1','verified_capability_receipt_releases_v1',
  'genuine_capability_queue_v1','genuine_preview_install_approvals_v1',
  "q.phase='SETTLED_ISOLATED'",
  "h.phase='AWAITING_FRESH_OWNER_WORK_BINDING'",
  "kind','INDEPENDENTLY_TESTED_CANDIDATE'",
  "kind','CI_FAILURE_INVESTIGATION'",
  "kind','RESEARCH_OPPORTUNITY'",
  "kind','GOVERNED_ORIGINAL_JOB_GAP'",
  "'verified_current_gaps',verified_gap_count",
  "'read_only',true,'installation_authorized',false",
  "current_user <> 'service_role'",
  'revoke all on function public.reality_read_owner_capability_gap_feed_v1(uuid)']){
  assert.ok(migration.includes(name),'missing '+name);
 }
});
