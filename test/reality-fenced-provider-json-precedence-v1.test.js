import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL(
 '../supabase/migrations/20261122173000_fix_signed_fenced_provider_json_precedence_v1.sql',import.meta.url),'utf8');
test('JSON extractor binds to frozen spec before feature suffix concatenation',()=>{
 assert.ok(sql.includes("then '-feature-r'||(q.recovery_spec->>'feature_revision_epoch') else '' end"));
 assert.ok(!sql.includes("then '-feature-r'||q.recovery_spec->>'feature_revision_epoch' else '' end"));
 assert.ok(sql.includes("'-syntax-r'||(v_epoch+1)"));
 assert.ok(sql.includes("from net._http_response response_row"));
 assert.ok(sql.includes("v_broker_count<2"));
 assert.ok(sql.includes("signed_chat_goal_shift_lineage_v1"));
 assert.ok(sql.includes("phase='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'"));
 assert.ok(sql.includes("'provider_requalification_limit',1"));
 assert.ok(sql.includes("revoke all on function public.reality_requalify_fenced_signed_chat_provider_v1"));
 assert.ok(!/security definer/i.test(sql));
});
