import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../sql/REVIEW_ONLY_preview_atomic_abandonment_v1.sql',import.meta.url),'utf8');
test('review-only file carries explicit no-apply warning and restrictive function ACL',()=>{
 assert.match(sql,/REVIEW ONLY\. Do NOT apply/);
 assert.match(sql,/current_user\s+is distinct from\s+'service_role'/);
 assert.match(sql,/revoke all on function public\.reality_abandon_incomplete_conversation_turn_v1/);
 assert.match(sql,/to service_role/);
 assert.match(sql,/security invoker/);
});
test('late assistant completion is row-locked and rejected after an abandonment tombstone',()=>{
 assert.match(sql,/create trigger reality_reject_late_abandoned_turn_v1/);
 assert.match(sql,/before insert on public\.reality_universe_entries/);
 assert.match(sql,/for update/);
 assert.match(sql,/REALITY_LATE_OUTPUT_FOR_ABANDONED_TURN/);
 assert.match(sql,/e\.payload->>'resolution_status'='ABANDONED'/);
});
test('abandonment appends two immutable receipts before adjusting exactly one active sequence',()=>{
 const p=sql.indexOf("insert into public.reality_universe_entries");
 const q=sql.indexOf("insert into public.reality_universe_entries",p+1);
 const u=sql.indexOf("update public.reality_conversation_turn_fences",q);
 assert.ok(p>=0&&q>p&&u>q);
 assert.match(sql,/active_turn_id=p_turn_id and active_claim_token=p_claim_token/);
 assert.match(sql,/sequence_num=preceding,active_turn_id=null/);
 assert.match(sql,/REALITY_ABANDONMENT_ATOMIC_FENCE_UPDATE_FAILED/);
 assert.doesNotMatch(sql,/delete\s+from\s+public\.reality_universe_entries/i);
});
test('original user, processing, interruption and absent assistant are asserted transactionally',()=>{
 assert.match(sql,/REALITY_ABANDONMENT_LIVE_ASSISTANT_OR_EVIDENCE_CONFLICT/);
 assert.match(sql,/payload->>'role'='user'/);
 assert.match(sql,/payload->>'phase'='PROCESSING'/);
 assert.match(sql,/payload->>'phase'='INTERRUPTED'/);
 assert.match(sql,/payload->>'role'='assistant'/);
 assert.match(sql,/payload->>'phase'='COMMITTED'/);
 assert.match(sql,/resolution_status' is distinct from 'ABANDONED'/);
});
// NOTE: These static safety tests are NOT PostgreSQL execution, concurrency,
// RLS grant validation, or hash compatibility proof. A disposable-clone
// integration gate is mandatory before anyone can apply the migration.
