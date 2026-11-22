import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parseOnlyModule,compareFrozenCandidateSyntax}
 from '../src/reality-signed-chat-recovery-syntax-verifier-v1.js';
import {reproduceFrozenStructuralSpanFailure}
 from '../src/reality-recovery-structural-splice-v1.js';
import {deriveExactPatchFromFrozenLineSpan}
 from '../src/reality-chat-new-development-worker-v1.js';

const baseline=[
 'export function liveOriginalDriver(enabled,create,createDriver,db){',
 ' const originalAdapters=enabled?create():null;',
 ' const executeQualifiedOriginals=originalAdapters?',
 '  createDriver({',
 '   db,loadA:originalAdapters.loadA,',
 '   runOriginal:originalAdapters.runOriginal,',
 '   batchEligibleOriginals:true,',
 '  }):null;',
 ' return executeQualifiedOriginals;',
 '}',''
].join('\n');
const find=[
 ' const originalAdapters=enabled?create():null;',
 ' const executeQualifiedOriginals=originalAdapters?',
 '  createDriver({',
 '   db,loadA:originalAdapters.loadA,',''
].join('\n');
const replacement=[
 ' const originalAdapters=enabled?create():null;',
 ' const executeQualifiedOriginals=originalAdapters?',
 '  createDriver({',
 '   db,loadA:originalAdapters.loadA,',
 '   verifyIndependentOriginalAcceptance:originalAdapters.verifyIndependentOriginalAcceptance,',
 '   reconcileProviderEffectAndFinalUniverse:originalAdapters.reconcileProviderEffectAndFinalUniverse,',
 '  }):null;',''
].join('\n');
const H=x=>'sha256:'+createHash('sha256').update(x).digest('hex');

test('a malformed truncated invocation is independently extended to its nearest valid complete statement',()=>{
 assert.equal(parseOnlyModule(baseline),'VALID_SYNTAX');
 const initial=compareFrozenCandidateSyntax(baseline,find,replacement);
 assert.equal(initial.candidate,'INVALID_SYNTAX');
 const r=reproduceFrozenStructuralSpanFailure(baseline,find,replacement,{
  parse:parseOnlyModule,visibleRanges:[[1,10]]});
 assert.equal(r?.schema,'reality-exact-structural-span-reproduction-v1');
 assert.equal(r.classification,'INCOMPLETE_FROZEN_SYNTAX_SPAN');
 assert.equal(r.additional_source_lines,3);
 assert.equal(r.original_start_line,2);
 assert.equal(r.original_end_line,5);
 assert.equal(r.corrected_end_line,8);
 assert.equal(r.unchanged_replace,replacement);
 assert.equal(r.unchanged_replacement_sha256,H(replacement));
 assert.equal(r.original_candidate_sha256,initial.proposed_sha256);
 assert.equal(r.baseline_sha256,H(baseline));
 assert.equal(r.parse_only,true);
 assert.equal(r.candidate_executed,false);
 assert.equal(r.functional_acceptance_verified,false);
 const corrected=deriveExactPatchFromFrozenLineSpan(baseline,{
  start_line:2,end_line:8,replace:replacement,reason:'Independent syntax-only corrected span, no functional acceptance'
 },[[1,10]]);
 assert.equal(corrected.ok,true);
 assert.equal(corrected.find,r.corrected_find);
 assert.equal(corrected.replace,r.unchanged_replace);
 assert.equal(parseOnlyModule(corrected.proposed),'VALID_SYNTAX');
 assert.equal(H(corrected.proposed),r.corrected_candidate_sha256);
 assert.ok(corrected.proposed.includes(' return executeQualifiedOriginals;\n'));
});
test('cannot expand into model-unseen source, unrelated statements, ambiguous anchors, no-op or invalid replacements',()=>{
 const missingVisibility=reproduceFrozenStructuralSpanFailure(baseline,find,replacement,{
  parse:parseOnlyModule,visibleRanges:[[2,5]]});
 assert.equal(missingVisibility,null);
 assert.equal(reproduceFrozenStructuralSpanFailure(baseline,find,replacement,{
  parse:parseOnlyModule,maxAdditionalLines:2}),null);
 assert.equal(reproduceFrozenStructuralSpanFailure(baseline,find,find,{parse:parseOnlyModule}),null);
 assert.equal(reproduceFrozenStructuralSpanFailure(baseline+baseline,find,replacement,{parse:parseOnlyModule}),null);
 assert.equal(reproduceFrozenStructuralSpanFailure(baseline,find,' const executeQualifiedOriginals=;\n',{
  parse:parseOnlyModule}),null);
 assert.equal(reproduceFrozenStructuralSpanFailure(baseline,find,replacement,{parse:()=> 'PARSE_PROVIDER_UNAVAILABLE'}),null);
 const wrong='export const first=1;\nexport const second=2;\n';
 assert.equal(reproduceFrozenStructuralSpanFailure(wrong,'export const first=1;\n','export const first=;\n',{
  parse:parseOnlyModule}),null);
});
test('signed generator has complete-module syntax gate before source persistence and no model execution',()=>{
 const worker=readFileSync(new URL('../src/reality-chat-new-development-worker-v1.js',import.meta.url),'utf8');
 const verifier=readFileSync(new URL('../src/reality-signed-chat-recovery-syntax-verifier-v1.js',import.meta.url),'utf8');
 assert.match(worker,/reproduceFrozenStructuralSpanFailure/);
 assert.match(worker,/visibleRanges:frozenExcerpt\.ranges/);
 assert.match(worker,/parseOnlyModule\(checked\.proposed\)!=='VALID_SYNTAX'/);
 assert.match(worker,/MODEL_COMPLETE_MODULE_SYNTAX_NOT_VERIFIED/);
 assert.ok(worker.indexOf("parseOnlyModule(checked.proposed)")<worker.indexOf("reality_record_signed_chat_recovery_draft_v1"));
 assert.ok(verifier.includes("reproduceFrozenStructuralSpanFailure(source,c.find,c.replace,{parse})"));
 assert.ok(verifier.includes("['corrected_find','unchanged_replace'].includes(key)"));
});
test('reentry remains bound to a signed independent incident and full proof, not unlimited retries',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261122143000_signed_chat_structural_syntax_reentry_v1.sql',import.meta.url),'utf8');
 for(const requirement of ['source_evidence=evidence','j.investigated_at<sh.started_at',
  "j.kind='SIGNED_CHAT_RECOVERY_SYNTAX_STALLED'",'INCOMPLETE_FROZEN_SYNTAX_SPAN',
  'independent_boundary_reproduction','syntax_investigation_receipt_sha256',
  'candidate_executed','full_goal_accepted','additional_source_lines',
  'corrected_end_line','unchanged_replacement_sha256','no_install_authority',
  'GENERATE_DISTINCT_CANDIDATE_WITH_INDEPENDENTLY_VERIFIED_STRUCTURAL_COMPILER'])
  assert.ok(sql.includes(requirement),requirement);
 assert.doesNotMatch(sql,/security definer|production_changed',true|installation_authorized',true/i);
});
