import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('provider checkpoint stays in existing ledger and does not consume a transition or budget',()=>{
 const sql=read('sql/reality-governed-provider-continuity-checkpoint-v1.sql');
 assert.match(sql,/INSERT INTO reality_internal\.owner_shift_continuity_incidents_v1/);
 assert.match(sql,/ON CONFLICT\(owner_id,shift_id,kind,evidence_key\) DO NOTHING/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/PROVIDER_CHECKPOINT_CONTINUITY_STALE/);
 assert.match(sql,/next_investigation_at/);
 assert.match(sql,/'infinity'::timestamptz/);
 assert.doesNotMatch(sql,/CREATE TABLE|INSERT INTO public\.universe_events|INSERT INTO reality_internal\.final_loop_transition_receipts_v1|UPDATE reality_internal\.final_loop_resume_events_v1/i);
 assert.match(sql,/'execution_freeze_verified',false/);
 assert.match(sql,/REVOKE ALL ON FUNCTION/);
});
test('controller persists only on existing preparation intent and fails closed on ambiguous write',()=>{
 const s=read('api/reality/governed-worker-release-control-plane.js');
 assert.match(s,/\['OWNER_PREPARE_EXACT_RELEASE','PREPARE_EXACT_RELEASE'\]\.includes\(req.body.intent\)/);
 assert.match(s,/await adapters\.persistProviderCheckpoint/);
 assert.match(s,/PROVIDER_CHECKPOINT_OUTCOME_UNVERIFIED_RECONCILE_NO_REPLAY/);
 const a=read('src/reality-governed-signed-worker-control-plane-adapters-v1.js');
 assert.ok(a.indexOf("await serviceRpc('reality_record_governed_provider_checkpoint_v1'")<a.indexOf("await serviceRpc('reality_read_governed_provider_checkpoint_v1'"));
});
