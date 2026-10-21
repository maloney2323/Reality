import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
  createPostgresOwnerApprovalStore
} from '../src/reality-owner-consent-postgres-store-v0.1.js';
import {
  OWNER_CONSENT_SCHEMA, SANDBOX_CONSENT_SCOPE,
  canonicalOwnerConsentMessage, consumeOwnerConsentOnce
} from '../src/reality-owner-consent-boundary-v0.1.js';

const keys=generateKeyPairSync('ed25519');
const saved=process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY=
  keys.publicKey.export({type:'spki',format:'pem'});
process.on('exit',()=>{
  if(saved===undefined) delete process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
  else process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY=saved;
});

const expected={
  purpose:SANDBOX_CONSENT_SCOPE,
  subjectRef:'upgrade:customer-808',
  originalTaskRef:'customer-request:808',
  governanceKernelRef:'kernel:808',
  consentRef:'human-consent:808',
};
function signedApproval(nonce='nonce:808') {
  const now=Date.now();
  const body={
    schema:OWNER_CONSENT_SCHEMA,
    owner_id:'human-owner:808',
    purpose:expected.purpose,
    subject_ref:expected.subjectRef,
    original_task_ref:expected.originalTaskRef,
    governance_kernel_ref:expected.governanceKernelRef,
    consent_ref:expected.consentRef,
    nonce,issued_at:new Date(now-1000).toISOString(),
    expires_at:new Date(now+3600000).toISOString(),
  };
  return {...body,signature:sign(null,
    Buffer.from(canonicalOwnerConsentMessage(body)),keys.privateKey).toString('base64')};
}
function fakePgClient() {
  // Emulates a single SQL INSERT ... ON CONFLICT DO NOTHING with unique PK.
  // This is NOT a live database integration test.
  const unique=new Set();
  const calls=[];
  return {
    calls,
    query:async(sql,args)=>{
      calls.push({sql,args});
      assert.match(sql,/INSERT INTO reality_governance\.owner_approval_consumptions/);
      assert.match(sql,/ON CONFLICT \(approval_key\) DO NOTHING/);
      assert.match(sql,/WHERE \$7::timestamptz > now\(\)/);
      assert.equal(args.length,7);
      if(unique.has(args[0]) || new Date(args[6]).valueOf()<=Date.now())
        return {rowCount:0,rows:[]};
      unique.add(args[0]);
      return {rowCount:1,rows:[{approval_key:args[0],binding_sha256:args[1]}]};
    },
  };
}
test('trusted database handle is mandatory',()=>{
  assert.throws(()=>createPostgresOwnerApprovalStore({}),/TRUSTED_POSTGRES_QUERY_REQUIRED/);
});
test('signed consent consumes a parameterized PG row only once even concurrently',async()=>{
  const pg=fakePgClient();
  const store=createPostgresOwnerApprovalStore({query:pg.query});
  const approval=signedApproval();
  const calls=await Promise.allSettled(Array.from({length:12},
    ()=>consumeOwnerConsentOnce({approval,expected,approvalStore:store})));
  assert.equal(calls.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(calls.filter(x=>x.status==='rejected').length,11);
  assert.equal(pg.calls.length,12);
  const survivor=calls.find(x=>x.status==='fulfilled').value;
  assert.ok(survivor.consumption_record_ref.startsWith('pg-owner-approval:owner-consent:'));
  assert.equal(survivor.operation_completed,false);
});
test('source data is passed only as query params (no SQL interpolation)',async()=>{
  const pg=fakePgClient();
  const store=createPostgresOwnerApprovalStore({query:pg.query});
  const value="owner'); DROP TABLE public.users; --";
  const result=await store.consumeOnce({
    key:'owner-consent:'+'a'.repeat(64),
    binding_sha256:'c'.repeat(64),
    owner_id:value,purpose:'EXAMPLE',subject_ref:'subject',consent_ref:'consent',
    expires_at:new Date(Date.now()+60000).toISOString(),
  });
  assert.equal(result.consumed,true);
  assert.equal(pg.calls[0].args[2],value);
  assert.equal(pg.calls[0].sql.includes(value),false);
});
test('invalid or contradictory insert readback fails closed',async()=>{
  const store=createPostgresOwnerApprovalStore({query:async()=>({
    rowCount:1,rows:[{approval_key:'other',binding_sha256:'0'.repeat(64)}],
  })});
  await assert.rejects(()=>store.consumeOnce({
    key:'owner-consent:'+'b'.repeat(64),
    binding_sha256:'c'.repeat(64),
    owner_id:'owner',purpose:'purpose',subject_ref:'subject',consent_ref:'consent',
    expires_at:new Date(Date.now()+60000).toISOString(),
  }),/POSTGRES_OWNER_CONSUMPTION_READBACK_MISMATCH/);
});
test('migration is private, primary-key backed and RLS enabled',()=>{
  const sql=readFileSync('sql/owner_approval_consumptions_v0.1.sql','utf8');
  assert.match(sql,/CREATE SCHEMA IF NOT EXISTS reality_governance/);
  assert.match(sql,/approval_key text PRIMARY KEY/);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL ON TABLE/);
  assert.doesNotMatch(sql,/GRANT .*\bTO authenticated\b|GRANT .*\bTO anon\b/i);
});
