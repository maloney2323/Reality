import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {buildRealityShiftConversationBrief} from '../src/reality-shift-conversation-brief-v1.js';
import {readVerifiedEmployeeShiftForChat} from '../src/reality-employee-shift-chat-context-v1.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),page=read('reality-shift-conversation-v1.js');
const api=read('api/reality/personal-governed-employee-shift.js');
const chat=read('api/reality/personal-chat.js'),config=JSON.parse(read('vercel.json'));
const uuid='11111111-2222-4333-8444-555555555555';
const sha='sha256:'+'a'.repeat(64);
const stages=['SOURCE_RECONCILIATION','VERIFY_OPEN_ISSUE','VERIFY_PROVIDER_EVIDENCE',
 'REVIEW_INDEPENDENT_EVIDENCE','QUALIFY_NEXT_WORK','CONDITIONAL_EXECUTION_WINDOW',
 'CONDITIONAL_VERIFICATION_WINDOW','EVIDENCE_AND_VALUE_REPORT'];
const steps=()=>stages.map((stage,i)=>({
 step_index:i+1,stage,state:'QUEUED',
 source_ref:i===1?'https://github.com/maloney2323/Reality/issues/201':null,
 proof_sha256:null,completed_at:null,source_status:null
}));
function shift(status='QUEUED',contents=steps()){
 return {shift_id:uuid,plan_fingerprint:sha,status,
   planned_start_at:'2026-11-05T08:28:00.000Z',
   planned_end_at:'2026-11-05T16:28:00.000Z',
   created_at:'2026-11-04T20:15:00.000Z',
   steps:contents};
}
test('Chat is a genuine /chat page with Home and Chat tabs and a direct rewrite',()=>{
 assert.ok(config.rewrites.some(x=>x.source==='/chat'&&x.destination==='/index.html'));
 assert.match(html,/<nav id="realityPageTabs"[^>]*aria-label="Reality pages"/);
 assert.match(html,/<a id="realityHomeTab" href="\/"/);
 assert.match(html,/<a id="realityChatTab" href="\/chat"/);
 assert.match(html,/body\[data-reality-route="chat"\] main > :not\(\.top\):not\(#privateChat\)/);
 assert.match(html,/body\[data-reality-route="chat"\] #privateChat/);
 assert.match(html,/window\.location\.assign\('\/chat'\)/);
 assert.match(html,/window\.location\.assign\('\/'\)/);
 assert.match(html,/role="region" aria-labelledby="realityChatTitle"/);
 assert.doesNotMatch(html,/<section id="privateChat"[^>]*role="dialog"/);
 assert.match(html,/id="realityChatDockClose"[^>]*aria-label="Return to Reality Home"/);
 assert.equal((html.match(/id="realityChatTab"/g)||[]).length,1);
 assert.equal((html.match(/id="privateChat"/g)||[]).length,1);
});
test('real signed-in chat composer, conversations and installation approvals stay on chat page',()=>{
 const ordered=['realityChatShiftBrief','privateTranscript','realityChatComposer',
  'realityChatApprovalInbox','realityChatActivity'];
 const index=ordered.map(id=>html.indexOf('id="'+id+'"'));
 assert.ok(index.every(x=>x>0));
 for(let i=1;i<index.length;i++)assert.ok(index[i]>index[i-1],ordered[i]);
 for(const id of ['privatePrompt','privateSend','privateConversations','homeOwnerAuthorizations',
  'realityChatApprovalItems','realityChatShiftNeed','realityShiftOpenConversation'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(html,/OWNER_APPROVE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
 assert.match(page,/api\/reality\/personal-governed-employee-shift/);
 assert.doesNotMatch(page,/method:'POST'|OWNER_APPROVE_EXACT|INSTALL_CAPABILITY/);
 const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline?.length>100000);
 assert.doesNotThrow(()=>new Script(inline));
 assert.doesNotThrow(()=>new Script(page));
});
test('owner-queued shift provides useful natural-language before start without inventing completed work',()=>{
 const brief=buildRealityShiftConversationBrief([shift()],[],new Date('2026-11-04T22:00:00.000Z'));
 assert.equal(brief.status,'QUEUED');
 assert.match(brief.headline,/queued, not running/i);
 assert.match(brief.current,/not started/i);
 assert.match(brief.next,/scheduled start/i);
 assert.match(brief.what_finished,/No task or original-job completion/);
 assert.equal(brief.verified_source_checks,0);
 assert.equal(brief.verified_original_job_receipts,0);
 assert.equal(brief.verified_human_hours_saved,null);
 assert.equal(brief.complete_shift_proven,false);
});
test('owner can see exact checked work and what happens next, but no fabricated repair',()=>{
 const ss=steps();ss[0]={...ss[0],state:'SOURCE_CHECKED',source_status:'READBACK_VERIFIED',
  proof_sha256:sha,completed_at:'2026-11-05T08:30:00.000Z'};
 const brief=buildRealityShiftConversationBrief([shift('RUNNING',ss)],[],new Date('2026-11-05T09:00:00.000Z'));
 assert.equal(brief.verified_source_checks,1);
 assert.equal(brief.events[0].code,'SOURCE_VALIDATED');
 assert.match(brief.what_finished,/no original-job completion independently matched/i);
 assert.match(brief.next,/Validate the tracked issue/);
 assert.equal(brief.complete_shift_proven,false);
});
test('shift cannot treat installation approval or blocked work as completed shift',()=>{
 const ss=steps();ss[5]={...ss[5],state:'AWAITING_EXACT_WORK'};
 const pending=buildRealityShiftConversationBrief([shift('AWAITING_EXACT_ORIGINAL_WORK',ss)],[],new Date('2026-11-05T13:20:00.000Z'));
 assert.match(pending.current,/original-job action awaits independent qualification or authorization/);
 assert.match(pending.next,/independently qualify/);
 assert.equal(pending.approval_pending,false);
 assert.equal(pending.verified_human_hours_saved,null);
 const done=buildRealityShiftConversationBrief([shift('ENDED_WITH_BLOCKED_WORK',ss)],[],new Date('2026-11-05T17:00:00.000Z'));
 assert.equal(done.verified_original_job_receipts,0);
 assert.equal(done.complete_shift_proven,false);
});
test('no shift is a truthful empty observation; untrusted evidence is rejected',()=>{
 const empty=buildRealityShiftConversationBrief([],[],new Date('2026-11-04T22:00:00.000Z'));
 assert.equal(empty.status,'NO_SHIFT_AUTHORIZED');
 assert.equal(empty.shift_id,null);
 assert.match(empty.next,/approve its exact scope/);
 assert.throws(()=>buildRealityShiftConversationBrief([shift('RUNNING',[
  {...steps()[0],state:'OWNER_APPROVED_INSTALL'},...steps().slice(1)])]),/SOURCE_UNTRUSTED/);
});
test('signed-in Reality Chat receives owner-scoped shift status without instruction authority',async()=>{
 const result={status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
  shifts:[shift()],work_installation_authorized_by_read:false,
  verified_human_hours_saved:null,production_changed:false};
 const fetchImpl=async(url,options)=>{
  assert.match(url,/reality_read_owner_employee_shifts_v1$/);
  assert.equal(options.method,'POST');
  assert.deepEqual(JSON.parse(options.body),{p_owner_id:uuid});
  return {ok:true,json:async()=>result};
 };
 const entries=await readVerifiedEmployeeShiftForChat({
  session:{user_id:uuid,config:{url:'https://hvkfreoagbrphwghjajw.supabase.co'}},
  message:'What is my employee shift doing now?',
  env:{VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'},
  db:{url:'https://hvkfreoagbrphwghjajw.supabase.co',
    project:'hvkfreoagbrphwghjajw',secretKey:'test-only-not-real',
    strictSecrets:true},fetchImpl,
  // Stable pre-start fixture: do not let wall-clock time silently turn
  // an authorized future shift into an already-started shift in CI.
  now:new Date('2026-11-04T22:00:00.000Z')
 });
 assert.equal(entries.length,1);
 assert.equal(entries[0].event_kind,'owner_governed_employee_shift_briefing');
 assert.match(entries[0].summary,/not running yet/);
 assert.equal(entries[0].external_execution_authorized,false);
 assert.equal(entries[0].verified_human_hours_saved,null);
 assert.equal(entries[0].installation_authorized,false);
 assert.match(chat,/readVerifiedEmployeeShiftForChat/);
 assert.match(api,/buildRealityShiftConversationBrief/);
});
