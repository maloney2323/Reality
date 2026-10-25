import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/reality/full-loop-sandbox-proof.js';
async function call({method='POST',mode='success',env='preview',branch='feature/reality-drift-live-continuity-v1-20261024'}={}){
 const prev={env:process.env.VERCEL_ENV,branch:process.env.VERCEL_GIT_COMMIT_REF};
 process.env.VERCEL_ENV=env;
 process.env.VERCEL_GIT_COMMIT_REF=branch;
 const result={headers:{},status:null,body:null};
 const res={
  setHeader(k,v){result.headers[k]=v;return this},
  status(n){result.status=n;return this},
  json(b){result.body=b;return this},
 };
 try{await handler({method,body:{mode}},res);return result}
 finally{
  if(prev.env===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=prev.env;
  if(prev.branch===undefined)delete process.env.VERCEL_GIT_COMMIT_REF;else process.env.VERCEL_GIT_COMMIT_REF=prev.branch;
 }
}
test('Preview only demo HTTP route runs genuine existing contracts in sandbox',async()=>{
 const result=await call();
 assert.equal(result.status,200);
 assert.equal(result.body.ok,true);
 assert.equal(result.body.proof_kind,'EPHEMERAL_ISOLATED_SANDBOX');
 assert.equal(result.body.result.status,'CLOSED_LOOP_VERIFIED_SANDBOX');
 assert.equal(result.body.result.receipt_chain_verified,true);
 assert.equal(result.body.real_external_actions,0);
 assert.equal(result.body.paid_model_calls,0);
 assert.equal(result.body.telemetry.evidence_scope,'EPHEMERAL_SANDBOX_RECONSTRUCTION');
 assert.equal(result.body.telemetry.receipt_chain_valid,true);
 assert.equal(result.body.telemetry.verified_sandbox_recoveries,1);
 assert.equal(result.body.telemetry.proof_divergence_rate_pct,0);
 assert.equal(result.body.telemetry.independently_adjudicated_customer_drift_rate_pct,null);
});
test('failed verification does not claim completed outcome or publish learning',async()=>{
 const result=await call({mode:'failed_readback'});
 assert.equal(result.status,200);
 assert.equal(result.body.result.verified_full_loop,false);
 assert.equal(result.body.result.ephemeral_universe_updated,false);
 assert.equal(result.body.telemetry.unresolved_completion_claims,1);
 assert.equal(result.body.telemetry.verified_sandbox_recoveries,0);
 assert.equal(result.body.telemetry.proof_divergence_rate_pct,100);
});
test('absence of approval stops and does not execute any external effects',async()=>{
 const result=await call({mode:'withhold_approval'});
 assert.equal(result.status,200);
 assert.equal(result.body.result.status,'AWAITING_OWNER_APPROVAL');
 assert.equal(result.body.result.externally_consequential_actions,0);
 assert.equal(result.body.telemetry.attempted_retries,0);
 assert.equal(result.body.telemetry.verified_recovery_yield_pct,null);
 assert.equal(result.body.telemetry.shadow_competitor_divergence_rate_pct,null);
});
test('production and wrong branch cannot access the demonstration route',async()=>{
 assert.equal((await call({env:'production'})).status,404);
 assert.equal((await call({branch:'master'})).status,404);
 assert.equal((await call({method:'GET'})).status,405);
 assert.equal((await call({mode:'unknown'})).status,400);
});
