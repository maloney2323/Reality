import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../api/reality/personal-market-stage.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261103_market_stage_autonomous_recovery_v1.sql',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
function fixture(){
 const a=script.indexOf('// The stage watchdog runs in Supabase Cron');
 const b=script.indexOf('async function realityChatRefreshEvents()',a);
 assert.ok(a>0&&b>a);return script.slice(a,b);
}
const fingerprint='a'.repeat(64);
function trusted(){
 return {ok:true,status:'AUTO_REPAIRED_RESEARCH_STAGE_HANDOFF',
  receipt_id:'11111111-1111-4111-8111-111111111111',
  expected_findings:4,stage_handoff_verified:true,
  items:Array.from({length:4},(_,i)=>({
    finding_fingerprint:String(i).repeat(64),
    phase:'EVIDENCE_INSPECTED_INDEPENDENT_TEST_REQUIRED',
    stage_repair_verified:true,verified_missing_capability:false,
    owner_install_authorized:false,
  })),
  events:['RESEARCH_HANDOFF_ABSENT_DETECTED',
   'AUTO_REPAIRED_INVESTIGATION_HANDOFF',
   'INDEPENDENT_FAILURE_PROOF_STILL_REQUIRED'].map((event_code,i)=>({
    event_id:'11111111-1111-4111-8111-11111111111'+i,
    finding_fingerprint:fingerprint,event_code})),
  read_only:true,installation_authorized:false,
  external_execution_authorized:false,production_changed:false};
}
function setup({payload=trusted(),signed=true,ok=true}={}){
 const nodes={
  realityChatMarketStatus:{textContent:''},
  realityChatMarketEvents:{children:[],replaceChildren(...v){this.children=v},append(x){this.children.push(x)}},
  privateReady:{style:{display:signed?'block':'none'}}
 };
 const requests=[];
 const document={createElement(tag){return {
  tag,children:[],textContent:'',className:'',
  append(...children){this.children.push(...children)}
 }}};
 const ctx={$:id=>nodes[id],document,fetch:async(path,options)=>{
  requests.push({path,options});return {ok,json:async()=>payload}}};
 vm.createContext(ctx);vm.runInContext(fixture(),ctx);
 return {ctx,nodes,requests};
}
test('complete browser UI remains parseable with autonomous chat stage feed',()=>{
 assert.doesNotThrow(()=>new vm.Script(script));
 assert.match(html,/id="realityChatMarketStage"/);
 assert.match(html,/id="realityChatMarketStatus"/);
 assert.match(html,/id="realityChatMarketEvents"/);
 assert.match(script,/void realityChatMarketStage\(\)/);
});
test('chat shows real stalled-state diagnosis, recovered bridge and test blocker',async()=>{
 const x=setup();
 await vm.runInContext('realityChatMarketStage()',x.ctx);
 assert.equal(x.requests.length,1);
 assert.equal(x.requests[0].path,'/api/reality/personal-market-stage');
 assert.equal(x.requests[0].options.method,'GET');
 assert.equal(x.nodes.realityChatMarketEvents.children.length,5);
 assert.match(x.nodes.realityChatMarketStatus.textContent,/automatically repaired the read-only stage for 4 finding/);
 assert.match(x.nodes.realityChatMarketStatus.textContent,/independent frozen tests/);
 assert.match(x.nodes.realityChatMarketEvents.children[1].children[0].textContent,/Handoff recovered/);
 assert.equal(x.requests.some(x=>x.options.method==='POST'),false);
});
test('unverified stage never appears as a verified repair',async()=>{
 const result=trusted();result.items[0].verified_missing_capability=true;
 const x=setup({payload:result});
 await vm.runInContext('realityChatMarketStage()',x.ctx);
 assert.equal(x.nodes.realityChatMarketEvents.children.length,0);
 assert.match(x.nodes.realityChatMarketStatus.textContent,/cannot verify/);
});
test('no auth, no result and no stage repair are distinct states',async()=>{
 const signedOut=setup({signed:false});
 await vm.runInContext('realityChatMarketStage()',signedOut.ctx);
 assert.equal(signedOut.requests.length,0);
 assert.match(signedOut.nodes.realityChatMarketStatus.textContent,/Sign in/);
 const none=trusted();none.status='NO_SAVED_RESEARCH';none.items=[];none.events=[];
 const noFindings=setup({payload:none});
 await vm.runInContext('realityChatMarketStage()',noFindings.ctx);
 assert.match(noFindings.nodes.realityChatMarketStatus.textContent,/No completed market investigation/);
 const stalled=trusted();stalled.status='RESEARCH_STALLED_NO_INVESTIGATION_HANDOFF';stalled.items=[];stalled.events=[];
 const blocked=setup({payload:stalled});
 await vm.runInContext('realityChatMarketStage()',blocked.ctx);
 assert.match(blocked.nodes.realityChatMarketStatus.textContent,/has not been restored/);
});
test('read-only endpoint binds owner, preview, project and immutable authority',()=>{
 for(const token of ['req.method!==\'GET\'','authenticatedChatSession(req,res)',
  'req.query','reality_read_owner_market_stage_v1',
  'p_owner_id:session.user_id','db.url!==session.config.url',
  "db.project!=='hvkfreoagbrphwghjajw'",'data.events.length>24',
  'data.installation_authorized!==false','data.external_execution_authorized!==false',
  'data.production_changed!==false']){
  assert.ok(api.includes(token),'missing '+token);
 }
 assert.doesNotMatch(api,/githubWrite|installCapability|create_issue|ownerApprove/);
});
test('watchdog self-repairs once, runs independently of browser and cannot install',()=>{
 assert.match(sql,/reconcile_market_stages_v1/);
 assert.match(sql,/reality-market-investigation-stage-watchdog-v1/);
 assert.match(sql,/cron.schedule\(/);
 assert.match(sql,/on conflict do nothing/i);
 assert.match(sql,/RESEARCH_HANDOFF_ABSENT_DETECTED/);
 assert.match(sql,/AUTO_REPAIRED_INVESTIGATION_HANDOFF/);
 assert.match(sql,/INDEPENDENT_FAILURE_PROOF_STILL_REQUIRED/);
 assert.match(sql,/current_user not in \('postgres','service_role'\)/);
 assert.match(sql,/stage_repair_verified boolean not null default false check\(stage_repair_verified=true\)/);
 assert.match(sql,/verified_missing_capability boolean not null default false check\(verified_missing_capability=false\)/);
 assert.match(sql,/owner_install_authorized boolean not null default false check\(owner_install_authorized=false\)/);
 assert.match(sql,/revoke all on function public.reality_read_owner_market_stage_v1\(uuid\)/);
});
