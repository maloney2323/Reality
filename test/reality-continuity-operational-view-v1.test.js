import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=source('../supabase/migrations/20261121202000_owner_operational_continuity_qualification_projection_v1.sql');
const ui=source('../reality-chat-continuous-qualification-v1.js');
test('operational Continuity projects the same signed source qualifier without new work or invented worldline',()=>{
 assert.match(sql,/reality_internal\.owner_continuity_qualification_routes_v1 r/);
 assert.match(sql,/reality_internal\.owner_continuous_qualification_inbox_v1 i/);
 assert.match(sql,/i\.owner_id=r\.owner_id/);
 assert.match(sql,/WHERE r\.owner_id=p_owner_id/);
 assert.match(sql,/family_rank<=3/);
 assert.match(sql,/LIMIT 16/);
 for(const field of [
 'continuity_qualification_total','continuity_qualification_needing_canonical_original',
 'continuity_qualification_routes','governed_next_action',
 'canonical_universe_worldline_verified','route_reference_is_not_canonical_universe_worldline',
 'qualification_routes_do_not_authorize_models_or_work'
 ])assert.ok(sql.includes(field),'missing continuity field '+field);
 assert.match(sql,/approval_granted_by_projection',false/);
 assert.match(sql,/execution_authorized_by_projection',false/);
 assert.match(sql,/original_customer_job_completed',false/);
 assert.match(sql,/read_only',true/);
 assert.doesNotMatch(sql,/INSERT INTO|UPDATE reality_internal|\bDELETE FROM\b|\bcreate table\b/i);
});
test('owner Continuity readback remains service-only, and Chat does not mislabel route as final receipt',()=>{
 assert.match(sql,/current_user <> 'service_role'/);
 assert.match(sql,/revoke all on function public\.reality_read_owner_operational_continuity_v1\(uuid\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.reality_read_owner_operational_continuity_v1\(uuid\) to service_role/);
 assert.match(ui,/Qualification route key \(not a final job receipt\)/);
 assert.doesNotMatch(ui,/Continuity receipt:/);
});
