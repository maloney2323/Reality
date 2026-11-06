import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {qualifyUnboundSourceForReview,qualifyUnboundSourceBatch}
 from '../src/reality-owner-unbound-capability-qualification-v1.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=source('supabase/migrations/20261104_owner_unbound_capability_source_review_v1.sql');
const server=source('api/reality/personal-gap-intake.js');
const ui=source('index.html');
const bytes=Buffer.from("import test from 'node:test';\ntest('frozen acceptance',()=>{});\n");
const hash=createHash('sha256').update(bytes).digest('hex');
const observation={
 frozen_sha256:hash,
 frozen_test_path:'test/reality-frozen-regressions/reality-historical-no-work-receipt-v1.test.js',
 missing_module_path:'src/reality-extensions/reality-historical-no-work-receipt.mjs',
 status:'AWAITING_OWNER_WORK_BINDING',
 observations:13,
 first_observed_sha:'a'.repeat(40),
 latest_observed_sha:'b'.repeat(40),
 last_observed_at:'2026-11-05T01:58:35Z'
};
const current='c'.repeat(40);
const sourceFetch=({changedCurrent=false,sourcePresent=false,providerError=false}={})=>
 async(url,opts)=>{
  assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');
  assert.ok(String(url).startsWith('https://api.github.com/repos/maloney2323/Reality/contents/'));
  if(providerError)return {ok:false,status:403};
  const u=new URL(url),path=u.pathname.split('/contents/')[1],ref=u.searchParams.get('ref');
  if(path===observation.missing_module_path&&!sourcePresent)
   return {ok:false,status:404};
  const buffer=path===observation.missing_module_path?
   Buffer.from('export const installed=true;'):
   changedCurrent&&ref===current?Buffer.from('changed frozen suite'):bytes;
  return {ok:true,status:200,json:async()=>({
   path,encoding:'base64',content:buffer.toString('base64')
  })};
 };
test('source bytes can be independently reobserved without creating an owner job',async()=>{
 const v=await qualifyUnboundSourceForReview(observation,{
  currentCommit:current,fetchImpl:sourceFetch()});
 assert.equal(v.kind,'UNBOUND_FROZEN_DISCOVERY');
 assert.equal(v.stage,'CURRENT_SOURCE_MISSING_OWNER_JOB');
 assert.equal(v.verified_current_source_absence,true);
 assert.equal(v.source_check_completed,true);
 assert.equal(v.verified_missing_capability,false);
 assert.equal(v.owner_authorized_new_job,false);
 assert.equal(v.executable_job,false);
 assert.equal(v.installation_authorized,false);
 assert.equal(v.production_changed,false);
 assert.equal(v.observed_count,13);
 assert.match(v.next_proof,/independently failing original job/);
});
test('installed capability is not offered as a missing repair',async()=>{
 const v=await qualifyUnboundSourceForReview(observation,{
  currentCommit:current,fetchImpl:sourceFetch({sourcePresent:true})});
 assert.equal(v.stage,'CAPABILITY_PRESENT_RECONCILE_HISTORICAL_WORK');
 assert.equal(v.verified_current_source_absence,false);
 assert.equal(v.executable_job,false);
});
test('changed test and unavailable provider fail closed',async()=>{
 const changed=await qualifyUnboundSourceForReview(observation,{
  currentCommit:current,fetchImpl:sourceFetch({changedCurrent:true})});
 assert.equal(changed.stage,'FROZEN_SOURCE_CHANGED_NEEDS_REQUALIFICATION');
 const blocked=await qualifyUnboundSourceForReview(observation,{
  currentCommit:current,fetchImpl:sourceFetch({providerError:true})});
 assert.equal(blocked.stage,'SOURCE_CHECK_UNAVAILABLE');
 assert.equal(blocked.source_check_completed,false);
 const unknown=await qualifyUnboundSourceForReview(observation,{
  currentCommit:'UNKNOWN',fetchImpl:sourceFetch()});
 assert.equal(unknown.stage,'SOURCE_CHECK_UNAVAILABLE');
 assert.equal(unknown.executable_job,false);
});
test('malformed or duplicate signed sources never enter review',async()=>{
 await assert.rejects(qualifyUnboundSourceBatch([observation,observation]),/DUPLICATE_FROZEN_SOURCE/);
 await assert.rejects(qualifyUnboundSourceBatch([{
  ...observation,missing_module_path:'../secret'
 }]),/UNTRUSTED_OBSERVATION/);
});
test('owner-only database readback is read-only and never grants new work',()=>{
 for(const piece of [
  "current_user<>'service_role'",
  'goal_publication_epochs',
  "g.user_id=p_owner_id",
  "status='AWAITING_OWNER_WORK_BINDING'",
  'observations between 1 and 100000',
  'order by last_observed_at desc limit 8',
  "'source_reverified_now',false",
  "'owner_authorized_new_job',false",
  "'verified_missing_capability',false",
  "'installation_authorized',false",
  "'original_job_completed',false",
  "'production_changed',false",
  'revoke all on function public.reality_read_owner_unbound_capability_sources_v1(uuid)',
  'to service_role;'
 ]) assert.ok(sql.includes(piece),piece);
 assert.doesNotMatch(sql,/\b(insert|update|delete)\s+(into|reality_internal|public)\./i);
});
test('existing owner feed incorporates historical and fresh source evidence without upgrading authorization',()=>{
 for(const piece of [
  'reality_read_owner_unbound_capability_sources_v1',
  'p_owner_id:session.user_id',
  "source.owner_authorized_new_job!==false",
  "source.verified_missing_capability!==false",
  "unboundItems=await qualifyUnboundSourceBatch",
  "currentCommit:process.env.VERCEL_GIT_COMMIT_SHA",
  "x.executable_job!==false",
  "x.verified_missing_capability!==false",
  "unboundCoverage='SOURCE_REVIEW_UNAVAILABLE'",
  "current_candidates:items.length",
  'frozen_source_discoveries:currentUnbound.length',
  'reality_read_genuine_historical_no_work_v1',
  "proof.independent_database_readback===true",
  'const currentUnbound=noWorkClosed?unboundItems.filter'
 ])assert.ok(server.includes(piece),piece);
});
test('refresh re-reads category after audit; source observations are distinguished from a build-ready gap',()=>{
 for(const piece of [
  "await Promise.allSettled([wcRefreshCapabilities(),wcInvestigateMarket()])",
  "await wcLoadGapFeed()",
  "x.kind==='UNBOUND_FROZEN_DISCOVERY'",
  'FROZEN SOURCE RECHECKED · NEEDS AUTHORIZED ORIGINAL JOB',
  'HISTORICAL DISCOVERY · CAPABILITY NOW PRESENT',
  'SOURCE_REVIEW_UNAVAILABLE',
  'frozen_source_discoveries',
  'current_source_absence_confirmed',
  "x.owner_authorized_new_job!==false",
  'Source check:'
 ])assert.ok(ui.includes(piece),piece);
});
