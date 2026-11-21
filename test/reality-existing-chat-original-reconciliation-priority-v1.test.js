import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/20261122010000_existing_chat_original_reconciliation_priority_v1.sql');
const ui=read('../reality-chat-continuous-qualification-v1.js');
test('existing original-source routes outrank unclassified Chat turns within the same bounded owner readback',()=>{
 assert.equal((sql.match(/r\\.original_work_id~'\\^work:\\[a-f0-9\\]\\{32\\}\\\\$'/g)||[]).length,0); // literal source regex is not a fabricated original
 assert.equal(sql.split("r.original_work_id~'^work:[a-f0-9]{32}$'").length-1,2);
 assert.match(sql,/partition by i\\.intake_family/);
 assert.match(sql,/where ranked\\.family_rank<=5/);
 assert.match(sql,/i\\.intake_family='AUTHENTICATED_CHAT'/);
 assert.match(sql,/not i\\.terminal_observation then -1/);
 assert.match(sql,/matched_original_work_id/);
 assert.match(sql,/approval_ready',false/);
 assert.match(sql,/execution_authorized',false/);
 assert.match(sql,/installation_authorized',false/);
 assert.doesNotMatch(sql,/\\binsert into\\b|\\bupdate\\s+reality_internal\\./i);
 assert.doesNotMatch(sql,/work:[a-f0-9]{32}(?!\\$)/);
});
test('same original in Chat is never incorrectly offered a new-original admission approval',()=>{
 assert.match(ui,/EXISTING_SIGNED_CHAT_ORIGINAL_RECONCILE_WORKER/);
 assert.match(ui,/matched_original_work_id/);
 assert.match(ui,/if\\(existingOriginal\\)\\{/);
 assert.match(ui,/Review existing original handoff in Chat/);
 assert.match(ui,/Do not re-admit, replay, approve, install or claim completion/);
 assert.match(ui,/continue;\\s*}\\s*button\\.addEventListener\\('click',async/);
 assert.match(ui,/INSPECT_QUALIFIED_CHAT_ORIGINAL/);
 assert.match(ui,/APPROVE_EXACT_QUALIFIED_CHAT_ORIGINAL/);
 assert.doesNotMatch(ui,/reality_authorize_employee_shift_v1/);
});
