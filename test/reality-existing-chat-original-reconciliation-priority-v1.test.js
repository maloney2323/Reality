import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/20261122010000_existing_chat_original_reconciliation_priority_v1.sql');
const ui=read('../reality-chat-continuous-qualification-v1.js');
test('existing source-bound original takes precedence in a bounded authenticated owner Chat sample',()=>{
 assert.equal(sql.split("r.original_work_id~'^work:[a-f0-9]{32}$'").length-1,2);
 assert.match(sql,/partition by i\.intake_family/);
 assert.match(sql,/where ranked\.family_rank<=5/);
 assert.match(sql,/i\.intake_family='AUTHENTICATED_CHAT'/);
 assert.match(sql,/not i\.terminal_observation then -1/);
 assert.match(sql,/matched_original_work_id/);
 for(const key of ["approval_ready',false","execution_authorized',false","installation_authorized',false"]){
  assert.ok(sql.includes(key));
 }
 assert.doesNotMatch(sql,/\binsert into\b|\bupdate\s+reality_internal\./i);
 assert.doesNotMatch(sql,/work:[a-f0-9]{32}(?!\$)/);
});
test('Chat shows prior original for same-work reconciliation, not a new-original approval',()=>{
 assert.match(ui,/EXISTING_SIGNED_CHAT_ORIGINAL_RECONCILE_WORKER/);
 assert.match(ui,/matched_original_work_id/);
 assert.match(ui,/if\(existingOriginal\)\{/);
 assert.match(ui,/Review existing original handoff in Chat/);
 assert.match(ui,/Do not re-admit, replay, approve, install or claim completion/);
 assert.match(ui,/continue;\s*}\s*button\.addEventListener\('click',async/);
 assert.match(ui,/INSPECT_QUALIFIED_CHAT_ORIGINAL/);
 assert.match(ui,/APPROVE_EXACT_QUALIFIED_CHAT_ORIGINAL/);
 assert.doesNotMatch(ui,/reality_authorize_employee_shift_v1/);
});
