import test from 'node:test';
import assert from 'node:assert/strict';
import {
 projectNative263OwnerTemporalBrief,
 native263ConversationRelevant,
 readVerifiedNative263TemporalForChat,
 verifiedNative263OpeningMessage,
 buildNative263SettledOwnerCard
} from '../src/reality-native263-temporal-chat-context-v1.js';
const OWNER='85eeae0b-2988-43c4-b20c-590fb51da70d';
const receipt='681ce4ab-4dd0-47cf-963b-dc65087468fc';
const SOURCE='e44ee294f21c73803a2bcdb5a9cb487f0f80fc85';
const SHA='de45ee4c557339b19aa1f320aba1cd5fba301dbb';
const raw={
 status:'NATIVE263_ORIGINAL_POSTINSTALL_READONLY_CONTEXT',
 owner_id:OWNER,
 original_work_id:'work:873a6e74fd14c6beacc9042dd8021dfc',
 shift_id:'9460cfff-937a-4105-9093-2e41ab39a950',
 source_ref:'https://github.com/maloney2323/Reality/issues/263',
 target_branch:'reality/isolated-openai-governance-gateway-20261108',
 target_path:'src/reality-riley-service-original-runtime-v1.js',
 expected_installed_blob_sha:'dda8e71d44cca6745312bcbd000089d5a0b01d54',
 candidate_artifact_sha256:'sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48',
 candidate_commit_sha:SOURCE,
 frozen_verifier_run_id:42525028367,
 production_changed:false,
 state:'ORIGINAL_SETTLED',
 original_phase:'SETTLED',
 original_installed:true,
 installed_commit_sha:SHA,
 original_final_receipt_id:receipt,
 approval_receipt_id:'bdd8ee41-887c-461d-be09-f0c19dbc41fd',
 owner_approved_at:'2026-11-13 12:26:51.192616+00'
};
const fixedNow=new Date('2026-11-13T14:00:00.000Z');
test('settled original produces past/present/future, exact receipt and no execution power',()=>{
 const b=projectNative263OwnerTemporalBrief(raw,{ownerId:OWNER,now:fixedNow});
 assert.equal(b.original_final_receipt_id,receipt);
 assert.equal(b.original_job_completed,true);
 assert.equal(b.independent_original_settlement_verified,true);
 assert.match(b.past,/owner|approval/i);
 assert.match(b.present,/independently settled/);
 assert.match(b.present,/681ce4ab-4dd0-47cf-963b-dc65087468fc/);
 assert.match(b.operational_future,/no more actions/i);
 assert.equal(b.verified_cash_savings_usd,null);
 assert.equal(b.human_labor_saved_minutes,null);
 assert.equal(b.external_execution_authorized,false);
 assert.equal(b.production_changed,false);
});
test('installed but unsettled does not invent a final receipt',()=>{
 const c={...raw,state:'SOURCE_INSTALLED',original_phase:'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL',original_installed:false,original_final_receipt_id:null};
 const b=projectNative263OwnerTemporalBrief(c,{ownerId:OWNER,now:fixedNow});
 assert.equal(b.original_job_completed,false);
 assert.equal(b.original_final_receipt_id,null);
 assert.match(b.present,/NOT yet independently recorded/);
 assert.match(b.operational_future,/existing signed worker/);
});
test('cross-owner and source/artifact/receipt drift fails closed',()=>{
 const attempts=[
  [{...raw,owner_id:'c24a6ba0-24bf-4cad-a153-d4e45fcd8b4b'},OWNER],
  [raw,'c24a6ba0-24bf-4cad-a153-d4e45fcd8b4b'],
  [{...raw,candidate_commit_sha:'0'.repeat(40)},OWNER],
  [{...raw,state:'ORIGINAL_SETTLED',original_final_receipt_id:null},OWNER],
  [{...raw,state:'SOURCE_INSTALLED',original_phase:'SETTLED'},OWNER]
 ];
 for(const [c,id] of attempts)assert.throws(()=>projectNative263OwnerTemporalBrief(c,{ownerId:id,now:fixedNow}));
});
test('owner-bound chat read uses existing read-only Supabase context, not an action',async()=>{
 const calls=[];
 const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw',
  url:'https://hvkfreoagbrphwghjajw.supabase.co',secretKey:'IN_UNIT_TEST_NOT_A_REAL_CREDENTIAL'};
 const observations=await readVerifiedNative263TemporalForChat({
  session:{user_id:OWNER,config:{url:db.url}},
  message:'What happened in original job #263? Explain past, present and future.',
  db,env:{VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project},
  now:fixedNow,
  rpc:async(_db,name,payload)=>{calls.push({name,payload});return raw;}
 });
 assert.equal(observations.length,1);
 assert.equal(observations[0].original_job_completed,true);
 assert.deepEqual(calls,[{name:'reality_read_native263_postinstall_context_v1',payload:{}}]);
});
test('irrelevant, unauthenticated and unavailable readback cannot create invented context',async()=>{
 const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw',
  url:'https://hvkfreoagbrphwghjajw.supabase.co',secretKey:'UNIT_TEST_ONLY_NOT_REAL'};
 const ctx={db,env:{VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project},now:fixedNow};
 assert.equal(native263ConversationRelevant('Explain job #263'),true);
 assert.equal(native263ConversationRelevant('What is the weather?'),false);
 assert.deepEqual(await readVerifiedNative263TemporalForChat({
  ...ctx,session:{user_id:OWNER,config:{url:db.url}},
  message:'What is the weather?',rpc:async()=>{throw Error('unexpected call')}
 }),[]);
 assert.deepEqual(await readVerifiedNative263TemporalForChat({
  ...ctx,session:{user_id:'c24a6ba0-24bf-4cad-a153-d4e45fcd8b4b',config:{url:db.url}},
  message:'Explain #263',rpc:async()=>raw
 }),[]);
 assert.deepEqual(await readVerifiedNative263TemporalForChat({
  ...ctx,session:{user_id:OWNER,config:{url:db.url}},
  message:'Explain #263',rpc:async()=>{throw Error('provider unavailable')}
 }),[]);
});

test('Reality opens first with exact independent evidence, no user question, no made-up ROI',()=>{
 const b=projectNative263OwnerTemporalBrief(raw,{ownerId:OWNER,now:fixedNow});
 const m=verifiedNative263OpeningMessage(b);
 assert.match(m,/Reality · Verified work completed/);
 assert.match(m,/Past:/);
 assert.match(m,/Present:/);
 assert.match(m,/Operational future:/);
 assert.ok(m.includes(receipt));
 assert.ok(m.includes(SHA));
 assert.match(m,/Actual labor time and financial savings have not been measured yet/);
 assert.match(m,/no new approval or restart/i);
 assert.throws(()=>verifiedNative263OpeningMessage({...b,original_job_completed:false}));
 assert.throws(()=>verifiedNative263OpeningMessage({...b,original_final_receipt_id:null}));
});

test('settled owner GET bypasses obsolete installation card and never approves again',async()=>{
 const {readFileSync}=await import('node:fs');
 const api=readFileSync(new URL('../api/reality/native263-owner-install-approval.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-native263-install-approval-ui-v1.js',import.meta.url),'utf8');
 assert.match(api,/if\(req\.method==='GET'\)\{/);
 assert.match(api,/current\?\.state==='ORIGINAL_SETTLED'/);
 assert.match(api,/buildNative263SettledOwnerCard\(current/);
 assert.match(api,/return res\.status\(200\)\.json\(buildNative263SettledOwnerCard/);
 assert.match(api,/no_third_confirmation:true/);
 assert.match(ui,/renderProactiveOpening\(d\)/);
 assert.match(ui,/transcript\.prepend\(node\)/);
 assert.match(ui,/Reply to Reality/);
 assert.match(ui,/composer\.scrollIntoView/);
 assert.doesNotMatch(ui,/await fetch\([^)]*method:'POST'[^)]*\.original_job_completed/);
});

test('independently settled original produces exact validated owner GET with a real first response',()=>{
 const card=buildNative263SettledOwnerCard(raw,{ownerId:OWNER,now:fixedNow});
 assert.equal(card.ok,true);
 assert.equal(card.status,'EXACT_OWNER_NATIVE263_INSTALLATION_APPROVAL_CARD');
 assert.equal(card.original_job_completed,true);
 assert.equal(card.independently_verified_final_original_receipt_id,receipt);
 assert.equal(card.owner_approval_ready,false);
 assert.equal(card.no_third_confirmation,true);
 assert.equal(card.production_changed,false);
 assert.equal(card.opening_message.includes(receipt),true);
 assert.equal(card.opening_message.includes(SHA),true);
 assert.throws(()=>buildNative263SettledOwnerCard({...raw,
   expected_installed_blob_sha:'0'.repeat(40)},{ownerId:OWNER,now:fixedNow}));
 assert.throws(()=>buildNative263SettledOwnerCard({...raw,
   owner_id:'c24a6ba0-24bf-4cad-a153-d4e45fcd8b4b'},{ownerId:OWNER,now:fixedNow}));
});

test('mobile Chat keeps its conversation and navigation outside the long #263 proof panel',async()=>{
 const {readFileSync}=await import('node:fs');
 const proof=readFileSync(new URL('../reality-native263-install-approval-ui-v1.js',import.meta.url),'utf8');
 const workspace=readFileSync(new URL('../reality-chat-workspace-v1.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../reality-chat-workspace-v1.css',import.meta.url),'utf8');
 assert.match(proof,/return element\('realityChatPanelProof'\)\|\|element\('chat'\)\|\|element\('privateReady'\)/);
 assert.match(proof,/if\(proof&&p\.parentNode!==proof\)proof\.append\(p\)/);
 assert.match(proof,/view\.hidden=!!conversation/);
 assert.match(proof,/transcript\.prepend\(node\)/);
 assert.match(proof,/native263ViewReceipt/);
 assert.match(proof,/realityChatTabProof/);
 assert.match(proof,/const ready=element\('privateReady'\)/);
 assert.match(workspace,/homeLink\.href = '\/'/);
 assert.match(workspace,/threadButtons\.append\(homeLink, historyToggle, inspectorToggle, focusToggle\)/);
 assert.match(workspace,/panels\.proof\.append\(native263Proof\)/);
 assert.match(css,/reality-chat-home-link/);
 assert.match(css,/reality-chat-inspector #native263InstallApprovalPanel/);
});

test('Send places owner text into transcript immediately and preserves typed words on failure',async()=>{
 const {readFileSync}=await import('node:fs');
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const status=readFileSync(new URL('../reality-chat-request-status-v1.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../reality-chat-fullscreen-v2.css',import.meta.url),'utf8');
 const workspace=readFileSync(new URL('../reality-chat-workspace-v1.js',import.meta.url),'utf8');
 assert.match(index,/const pendingBubble=bubble\('user',value\)/);
 assert.match(index,/YOU · SENDING \(save not yet verified\)/);
 assert.match(index,/el\('privatePrompt'\)\.value='';/);
 assert.match(index,/el\('privateTranscript'\)\.scrollTop/);
 assert.match(index,/reality:chat-request-started/);
 assert.match(index,/data\.continuity\?\.current_answer_persisted!==true/);
 assert.match(index,/REALITY · VERIFIED SAVED ANSWER/);
 assert.match(index,/reality:chat-request-failed/);
 assert.match(index,/YOU · DELIVERY OR REPLY NOT VERIFIED/);
 assert.match(index,/el\('privatePrompt'\)\.value=value/);
 assert.match(status,/transcript\.append\(block\)/);
 assert.match(status,/details\.open=true/);
 assert.match(status,/Authenticated message save/);
 assert.match(status,/Final reply saved and verified/);
 assert.match(status,/reality:chat-request-failed/);
 assert.doesNotMatch(status,/parent\.insertAdjacentElement\('afterend',block\)/);
 assert.match(css,/#privateTranscript #realityChatRequestStatus/);
 assert.match(workspace,/panels\.work\.append\(otherWork\)/);
 assert.match(workspace,/panels\.proof\.append\(proofLead\)/);
});
