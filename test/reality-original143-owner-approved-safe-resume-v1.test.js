import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {claimOrResumeOriginal143Reservation}
 from '../src/reality-original-143-real-activation-v0.1.js';
const reserved='12345678-1234-4234-8234-123456789abc';
const epoch={goal_revision:9,goal_transition_event_id:reserved,
 user_message_revision:12,latest_user_request_id:reserved};
const base={policyId:'source-bound-143',fingerprint:'sha256:'+'a'.repeat(64),
 goalId:'user-goal:verified',epoch};
test('same approved, un-dispatched reservation resumes without a second claim',async()=>{
 let claims=0;
 const got=await claimOrResumeOriginal143Reservation({...base,
  prior:{status:'RESERVED_UNDISPATCHED',reservation_id:reserved},
  lease:{claim:async()=>{claims++;throw Error('MUST_NOT_RECLAIM')}},
 });
 assert.equal(got.reservation_id,reserved);
 assert.equal(got.existing_owner_approval_reused,true);
 assert.equal(claims,0);
});
test('a new exact action gets one reserve call, not implicit execution',async()=>{
 let claims=0;
 const r=await claimOrResumeOriginal143Reservation({...base,
  prior:{status:'NOT_FOUND'},lease:{claim:async args=>{
   claims++;assert.equal(args.policyId,base.policyId);
   assert.equal(args.workFingerprint,base.fingerprint);
   assert.equal(args.expectedGoalRevision,9);
   return {reservation_id:reserved,status:'RESERVED_NOT_DISPATCHED'};
  }},
 });
 assert.equal(claims,1);assert.equal(r.status,'RESERVED_NOT_DISPATCHED');
});
test('consumed, stale, forged, or ambiguous reservations never rearm or claim',async()=>{
 let claims=0;
 for(const prior of [null,{status:'NOT_RESUMABLE'},{status:'VERIFIED'},
  {status:'RESERVED_UNDISPATCHED',reservation_id:'not-uuid'},
  {status:'RESERVED_UNDISPATCHED',reservation_id:null}]){
  await assert.rejects(claimOrResumeOriginal143Reservation({...base,prior,
   lease:{claim:async()=>{claims++}}}),/ORIGINAL_143_/);
 }
 assert.equal(claims,0);
});
test('database enforces real SQL service role while retaining service-only grants and exact prior scope',()=>{
 const sql=readFileSync('supabase/migrations/20261029205000_reality_original_143_safe_reservation_resume.sql','utf8');
 assert.match(sql,/current_user <> 'service_role'/);
 assert.doesNotMatch(sql,/current_setting\('request.jwt.claim.role'/);
 assert.match(sql,/security invoker set search_path to ''/);
 assert.match(sql,/revoke all on function public\.reality_register_original_143_capability/);
 assert.match(sql,/revoke all on function public\.reality_settle_original_143_job/);
 assert.match(sql,/revoke all on function public\.reality_read_original_143_reservation/);
 assert.match(sql,/r\.status <> 'RESERVED'/);
 assert.match(sql,/r\.dispatch_started_at is not null/);
 assert.match(sql,/r\.work_fingerprint is distinct from p_work_fingerprint/);
 assert.match(sql,/r\.goal_revision is distinct from ep\.revision/);
 assert.match(sql,/EFFECTS_ALREADY_RECORDED/);
 assert.doesNotMatch(sql,/update reality_internal\.execution_reservations\s+set status='RESERVED'/);
});
test('owner endpoint and UI verify reservation status before any deliberate resumed POST',()=>{
 const html=readFileSync('index.html','utf8');
 const src=readFileSync('src/reality-original-143-real-activation-v0.1.js','utf8');
 const api=readFileSync('api/reality/personal-original-full-loop.js','utf8');
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>0);
 for(const [,body] of scripts)new vm.Script(body);
 assert.match(html,/existing_approved_reservation_verified===true/);
 assert.match(html,/Resume already-approved isolated activation/);
 assert.match(html,/Never replay a failed POST automatically/);
 assert.match(html,/window\.confirm\(/);
 assert.match(src,/reality_read_original_143_reservation/);
 assert.match(src,/claimOrResumeOriginal143Reservation/);
 assert.match(src,/exactOriginal143ActionIdentity/);
 assert.match(api,/assertSameOrigin/);
 assert.match(api,/ACTIVATE_RESUME_SETTLE_ORIGINAL_143/);
});
