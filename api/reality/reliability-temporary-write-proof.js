// TEMPORARY isolated Preview test route. Remove immediately after the
// requested two-request proof. Its only effect is writing a maximum of two
// predetermined synthetic turns to an allowlisted benchmark database.
// Never enable on production, never run a paid model or customer-world action.
import { resolveReliabilityBenchmarkDb } from '../../src/reality-reliability-db-boundary-v0.1.js';
import { createUniversePostgresPersistence } from '../../src/reality-universe-postgres-persistence-v0.1.js';
import { startContinuityRuntime } from '../../src/reality-continuity-spine-runtime-v0.1.js';
import { buildGovernedChatSignal } from '../../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import { runContinuousReliabilityCycle,orderContinuityHistory } from '../../src/reality-continuous-reliability-v0.1.js';
import { createContinuitySpine } from '../../src/reality-continuity-spine-v2.0.js';
const BRANCH='feature/reality-drift-live-continuity-v1-20261024';
const ROOT='isolated-reliability-preview-ledger-write-proof-v2';
const WORLD='isolated-reliability-proof-world-not-customer';
const subject='synthetic-benchmark-probe';
const countTurn=events=>events.filter(x=>x.event_kind==='RAW_SIGNAL').length;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'||process.env.VERCEL_ENV!=='preview'||
    process.env.VERCEL_GIT_COMMIT_REF!==BRANCH||
    process.env.REALITY_RELIABILITY_SYNTHETIC_WRITE_PROOF_ENABLED!=='true'||
    req.query?.purpose!=='bounded-continuity-proof') {
   return res.status(404).json({ok:false,code:'TEMPORARY_PROOF_NOT_AVAILABLE'});
 }
 const phase=Number(req.query?.turn);
 if(!Number.isInteger(phase)||phase<1||phase>2)
   return res.status(400).json({ok:false,code:'INVALID_SYNTHETIC_PHASE'});
 try {
   const db=resolveReliabilityBenchmarkDb({
     ...process.env,REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
   });
   const persistence=createUniversePostgresPersistence({
     url:db.url,secretKey:db.secretKey,strictSecrets:true,
   });
   const s=createContinuitySpine({continuityRootId:ROOT,worldlineId:WORLD,subjectId:subject});
   const before=orderContinuityHistory(await persistence.reconstruct({
      continuityRootId:s.continuity_root_id,worldlineId:s.worldline_id,
   }));
   const n=countTurn(before);
   if(n>=phase) {
      const receipt=before.find(x=>x.event_kind==='VERIFICATION'&&
        x.payload?.event_type==='MODEL_OUTPUT_ASSESSMENT'&&x.payload?.turn===phase);
      return res.status(200).json({ok:Boolean(receipt),kind:'SYNTHETIC_BENCHMARK',
       outcome:'ALREADY_PERSISTED',phase,prior_turns:n,
       readback_verified:Boolean(receipt),model_calls:0,customer_actions:0});
   }
   if(n!==phase-1)
     return res.status(409).json({ok:false,code:'PHASE_ORDER_REQUIRED',prior_turns:n});
   const at=phase===1?'2026-10-01T12:00:01.000Z':'2026-10-01T12:00:02.000Z';
   const signal=buildGovernedChatSignal({
     message:phase===1?'Synthetic turn one: homeowner approval must precede estimate dispatch':
       'Synthetic turn two: maintain homeowner-approval obligation; no estimate sent',
     observedAt:at,
   });
   const runtime=await startContinuityRuntime({
     continuityRootSource:ROOT,worldlineSource:WORLD,subjectId:subject,
     signal,observedAt:at,previewProofPersistence:persistence,
   });
   const assessment=await runContinuousReliabilityCycle({
     continuityRuntime:runtime,packetId:signal.packet.packet_id,
     modelOutput:'Synthetic storage proof only; no real model response and no external action.',
     modelResponseId:null,observedAt:at,
   });
   const after=orderContinuityHistory(await persistence.reconstruct({
     continuityRootId:s.continuity_root_id,worldlineId:s.worldline_id,
   }));
   const nowTurns=countTurn(after);
   const receipt=after.find(x=>x.event_id===assessment.receipt_id);
   const valid=nowTurns===phase&&
     Boolean(receipt)&&receipt.payload?.evaluation_status==='NOT_EVALUATED'&&
     assessment.readback_verified===true;
   return res.status(valid?200:500).json({
     ok:valid,kind:'SYNTHETIC_BENCHMARK',phase,
     outcome:valid?'PERSISTED_AND_INDEPENDENTLY_RECONSTRUCTED':'VERIFICATION_FAILED',
     prior_event_count:runtime.prior_event_count,
     total_events:after.length,raw_turns:nowTurns,
     continuity_verified:valid,readback_verified:valid,
     assessment_status:assessment.evaluation_status,
     drift_rate_pct:null,hallucination_rate_pct:null,
     model_calls:0,customer_actions:0,
   });
 }catch(error) {
   return res.status(500).json({ok:false,
     code:'SYNTHETIC_PREVIEW_WRITE_PROOF_FAILED',
     // Public tests must not return provider errors or connection details.
     reason:error?.code||'NOT_VERIFIED',model_calls:0,customer_actions:0});
 }
}
