import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/20261119170000_signed_maintenance_ci_service_acl_v1.sql',import.meta.url),'utf8');
test('signed maintenance CI preflight ACL explicitly revokes anon, authenticated and PUBLIC',()=>{
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.reality_read_signed_maintenance_ci_preflight_v1\(uuid,uuid\) FROM anon,authenticated,PUBLIC/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.reality_read_signed_maintenance_ci_preflight_v1\(uuid,uuid\) TO service_role/);
 assert.match(sql,/has_function_privilege\('anon'/);
 assert.match(sql,/has_function_privilege\('authenticated'/);
 assert.match(sql,/has_function_privilege\('service_role'/);
 assert.match(sql,/SIGNED_MAINTENANCE_CI_FUNCTION_ACL_INCORRECT/);
 assert.doesNotMatch(sql,/\b(INSERT INTO|UPDATE reality_internal|cron\.schedule|net\.http_post)\b/i);
});
