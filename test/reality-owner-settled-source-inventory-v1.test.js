import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL(
 '../supabase/migrations/20261116_owner_shift_settled_source_reconciliation_v1.sql',
 import.meta.url),'utf8');
const api=readFileSync(new URL(
 '../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
const shift=readFileSync(new URL(
 '../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
test('service-only current owner settled inventory cannot grant work or installation',()=>{
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/p_owner_id IS NULL/);
 assert.match(sql,/g\.owner_id=p_owner_id/);
 assert.match(sql,/t\.owner_id=p_owner_id/);
 assert.match(sql,/g\.outcome='SUCCEEDED'/);
 assert.match(sql,/g\.final_evidence_sha256~/);
 assert.match(sql,/a\.original_final_receipt_id=g\.receipt_id/);
 assert.match(sql,/n\.original_settlement_receipt_ref=/);
 assert.match(sql,/t\.provider_comment_body_sha256~/);
 assert.match(sql,/t\.final_receipt_id IS NOT NULL/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.reality_read_owner_additional_settled_shift_sources_v1/);
 assert.match(sql,/'work_creation_authorized',false/);
 assert.match(sql,/'shift_authorized',false/);
 assert.match(sql,/'installation_authorized',false/);
 assert.match(sql,/'production_changed',false/);
 assert.doesNotMatch(sql,/\b(INSERT|UPDATE|DELETE)\s+(?:INTO|reality_internal\.)/i);
});
test('both one-time owner draft and signed owner start exclude new-format completed work',()=>{
 assert.match(api,/reality_read_owner_additional_settled_shift_sources_v1/);
 assert.match(api,/additional\.source_refs\.length>30/);
 assert.match(api,/additional\.owner_id!==ownerId/);
 assert.match(api,/additional\.work_creation_authorized!==false/);
 assert.match(api,/additional\.shift_authorized!==false/);
 assert.match(api,/additional\.source_refs\)refs\.add\(ref\)/);
 assert.equal((api.match(/await ownerSettledOriginalSourceRefs\(/g)||[]).length,2);
 assert.equal((api.match(/excludedSettledSourceRefs:settledRefs/g)||[]).length,2);
 assert.match(shift,/read_owner_additional_settled_shift_sources_v1/);
});
