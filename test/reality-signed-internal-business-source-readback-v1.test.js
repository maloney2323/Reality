import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {probeOneSignedInternalBusinessProviderSource} from
 '../src/reality-signed-internal-business-source-readback-v1.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/20261121234000_signed_internal_repo_business_source_probe_v1.sql');
const worker=read('../api/reality/governed-employee-shift-worker.js');
const ui=read('../reality-chat-continuous-qualification-v1.js');
const api=read('../api/reality/personal-internal-business-provider-proof.js');
const boundary=read('../src/reality-governed-shift-boundary-v1.js');
const ownerId='85eeae0b-2988-43c4-b20c-590fb51da70d';
const workerRun='aae83122-d88e-4e8b-adfe-e1b527cf8fd0';
const hash='sha256:'+'b'.repeat(64);
const ref='https://github.com/example-company/existing-repo/issues/73';
const continuity='reality:qualification:'+'c'.repeat(64);
const env={
 VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated-example',
 VERCEL_GIT_REPO_OWNER:'example-company',VERCEL_GIT_REPO_SLUG:'existing-repo',
 REALITY_GITHUB_TOKEN:'a'.repeat(40)
};
const db={strictSecrets:true,secretKey:'opaque-key',project:'isolated-example'};
const input=()=>({status:'SIGNED_OWNER_INTERNAL_PROVIDER_SOURCE_SELECTED',
 owner_id:ownerId,intake_family:'EMPLOYEE_SCHEDULE',
 intake_key:'source-key-73',source_ref:ref,continuity_ref:continuity,
 worker_run_id:workerRun,provider_recheck_required:true,
 customer_connection_verified:false,original_job_admitted:false,
 model_execution_authorized:false,owner_approval_granted:false,
 new_shift_started:false,installation_authorized:false,production_changed:false});
const evidence=()=>({
 source_ref:ref,source_title:'Verified current source',
 provider_proof_sha256:hash,provider_updated_at:'2026-11-21T17:00:00.000Z',
 checked_at:'2026-11-21T19:00:00.000Z',current_state:'open'
});
const recorded=()=>({
 status:'SIGNED_INTERNAL_BUSINESS_SOURCE_DOUBLE_PROVIDER_READBACK_RECORDED',
 owner_id:ownerId,source_ref:ref,continuity_ref:continuity,
 provider_proof_sha256:hash,internal_source_provider_readback_verified:true,
 customer_connection_verified:false,original_job_admitted:false,
 model_execution_authorized:false,owner_approval_granted:false,
 new_shift_started:false,installation_authorized:false,production_changed:false
});

test('signed worker reuses existing provider and records a real double observation, never a business job',async()=>{
 const calls=[],providerReads=[];
 const response=await probeOneSignedInternalBusinessProviderSource({
  db,env,workerRunId:workerRun,
  call:async(_db,name,args)=>{
   calls.push({name,args});
   if(name==='reality_read_next_signed_internal_repo_business_source_v1')
    return input();
   if(name==='reality_record_signed_internal_repo_provider_proof_v1')
    return recorded();
   assert.fail('unexpected rpc');
  },
  readSource:async(url,options)=>{
   providerReads.push({url,options});
   return evidence();
  }
 });
 assert.equal(response.status,'SIGNED_INTERNAL_BUSINESS_SOURCE_DOUBLE_PROVIDER_READBACK_RECORDED');
 assert.equal(response.internal_company_provider_source_verified,true);
 assert.equal(response.customer_source_connection_verified,false);
 assert.equal(response.original_job_admitted,false);
 assert.equal(response.model_execution_authorized,false);
 assert.equal(response.new_shift_started,false);
 assert.equal(providerReads.length,2);
 assert.equal(providerReads[0].url,ref);
 assert.equal(providerReads[1].url,ref);
 assert.equal(providerReads[0].options.token,env.REALITY_GITHUB_TOKEN);
 assert.equal(calls.length,2);
 assert.equal(calls[0].args.p_worker_run_id,workerRun);
 assert.equal(calls[0].args.p_repo_full_name,'example-company/existing-repo');
 assert.equal(calls[1].args.p_first_sha256,hash);
 assert.equal(calls[1].args.p_second_sha256,hash);
 assert.equal(calls[1].args.p_source_ref,ref);
});
test('an unstable second read or a provider failure never persists a source proof',async()=>{
 for(const fault of ['changed','unavailable']){
  const calls=[];
  let count=0;
  const response=await probeOneSignedInternalBusinessProviderSource({
   db,env,workerRunId:workerRun,
   call:async(_db,name)=>{
    calls.push(name);
    if(name==='reality_read_next_signed_internal_repo_business_source_v1')
     return input();
    assert.fail('must not persist provider mismatch');
   },
   readSource:async()=>{
    count++;
    if(fault==='unavailable')throw Error('provider unavailable');
    return count===2?{...evidence(),provider_proof_sha256:'sha256:'+'a'.repeat(64)}:evidence();
   }
  });
  assert.equal(response.internal_company_provider_source_verified,false);
  assert.equal(response.model_execution_authorized,false);
  assert.equal(calls.length,1);
 }
});
test('no existing provider token means no anonymous GET can count as an owner connector',async()=>{
 const r=await probeOneSignedInternalBusinessProviderSource({
  db,workerRunId:workerRun,env:{...env,REALITY_GITHUB_TOKEN:''},
  call:async()=>assert.fail('cannot reach database on missing credential'),
  readSource:async()=>assert.fail('cannot call public provider anonymously')
 });
 assert.equal(r.status,'SIGNED_INTERNAL_SOURCE_PROVIDER_CREDENTIAL_MISSING');
 assert.equal(r.internal_company_provider_source_verified,false);
});
test('live source and permission must originate from same signed worker and owner Continuity',()=>{
 for(const v of [
  "w.status='STARTED'","i.intake_family='EMPLOYEE_SCHEDULE'",
  "g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'",
  'owner_continuity_qualification_routes_v1',
  'owner_continuous_qualification_inbox_v1',
  'owner_internal_repo_provider_evidence_v1',
  'p_first_sha256 is distinct from p_second_sha256',
  'SIGNED_INTERNAL_PROVIDER_RECEIPT_READBACK_FAILED',
  "'customer_connection_verified',false",
  "'original_job_admitted',false",
  "'new_shift_started',false",
  "'model_execution_authorized',false"
 ])assert.ok(sql.includes(v),v);
 assert.match(sql,/revoke all on function public\.reality_record_signed_internal_repo_provider_proof_v1/);
 assert.match(sql,/revoke all on function public\.reality_read_next_signed_internal_repo_business_source_v1/);
 assert.match(sql,/revoke all on function public\.reality_read_owner_internal_repo_provider_proofs_v1/);
 assert.doesNotMatch(sql,/INSERT INTO reality_internal\.governed_employee_original_claims_v1/i);
 assert.doesNotMatch(sql,/INSERT INTO public\.universe_events/i);
});
test('single signed worker calls installed source reader, Reality Chat displays verified internal provider not a customer connection',()=>{
 assert.match(worker,/probeOneSignedInternalBusinessProviderSource/);
 assert.match(worker,/continuityQualificationRoutes\.status==='CONTINUITY_QUALIFICATION_ROUTES_RECONCILED'/);
 assert.match(worker,/customer_source_connection_verified:false/);
 for(const name of ['read_next_signed_internal_repo_business_source_v1',
  'record_signed_internal_repo_provider_proof_v1',
  'read_owner_internal_repo_provider_proofs_v1'])assert.ok(boundary.includes(name),name);
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/r\.customer_source_connection_verified!==false/);
 assert.match(ui,/Internal company source · live provider proof/);
 assert.match(ui,/loadInternalCompanySourceProviderProof\(\)/);
 assert.match(ui,/No customer connection or executable original granted/);
});
