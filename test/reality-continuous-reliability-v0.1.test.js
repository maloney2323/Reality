import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGovernedChatSignal } from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import { startContinuityRuntime } from '../src/reality-continuity-spine-runtime-v0.1.js';
import {
  classifyReliabilityFindings, computeHistoricalBackcheck, orderContinuityHistory,
  runContinuousReliabilityCycle,
} from '../src/reality-continuous-reliability-v0.1.js';

function mockUniverse() {
  const events = [];
  const fetchImpl = async (url, options = {}) => {
    const u = new URL(url);
    const sp = u.searchParams;
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      events.push(body);
      return new Response(JSON.stringify([body]), { status: 201 });
    }
    let matches = events.slice();
    const id = sp.get('event_id')?.replace(/^eq\./, '');
    if (id) matches = matches.filter(event => event.event_id === id);
    const root = sp.get('continuity_root_id')?.replace(/^eq\./, '');
    const worldline = sp.get('worldline_id')?.replace(/^eq\./, '');
    if (root) matches = matches.filter(event => event.continuity_root_id === root);
    if (worldline) matches = matches.filter(event => event.worldline_id === worldline);
    if (sp.get('limit') === '1') matches = matches.slice(-1);
    else matches.reverse(); // deliberately not ordered by causal parent
    return new Response(JSON.stringify(matches), { status: 200 });
  };
  return { events, fetchImpl };
}

async function withPersistence(fn) {
  const previous = {
    enabled: process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED,
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SECRET_KEY,
  };
  process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-only';
  try { await fn(); }
  finally {
    for (const [name,value] of [
      ['REALITY_UNIVERSE_PERSISTENCE_ENABLED',previous.enabled],
      ['SUPABASE_URL',previous.url],
      ['SUPABASE_SECRET_KEY',previous.key],
    ]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
}

async function turn(n, fixture) {
  const at = new Date(Date.UTC(2026,9,24,12,0,n)).toISOString();
  const signal = buildGovernedChatSignal({message:'Construction turn '+n+'; no estimate without approval',observedAt:at});
  const runtime = await startContinuityRuntime({
    continuityRootSource:'continuity:reliability-test',worldlineSource:'world:construction',
    subjectId:'conversation:contractor',signal,observedAt:at,fetchImpl:fixture.fetchImpl,
  });
  const result = await runContinuousReliabilityCycle({
    continuityRuntime:runtime,modelOutput:'Acknowledged for turn '+n,
    modelResponseId:'model:'+n,packetId:signal.packet.packet_id,observedAt:at,
  });
  return {result,runtime};
}

test('drift findings and hallucination suspicions are different categories',()=>{
  const c = classifyReliabilityFindings(['FACT_DRIFT','OBLIGATION_LOSS','UNSUPPORTED_CLAIM','FALSE_COMPLETION']);
  assert.deepEqual(c.drift,['FACT_DRIFT','OBLIGATION_LOSS']);
  assert.deepEqual(c.hallucination_suspected,['UNSUPPORTED_CLAIM','FALSE_COMPLETION']);
  assert.equal(c.hallucination_confirmed,null);
});

test('second request links its RAW_SIGNAL to prior persisted VERIFICATION receipt', async()=>{
  await withPersistence(async()=>{
    const f=mockUniverse();
    const first=await turn(1,f), second=await turn(2,f);
    const ordered=orderContinuityHistory(f.events);
    const raw=ordered.filter(e=>e.event_kind==='RAW_SIGNAL');
    assert.equal(raw.length,2);
    assert.equal(raw[1].parent_event_id,first.result.receipt_id);
    assert.equal(second.result.turn,2);
    assert.equal(second.result.readback_verified,true);
    assert.equal(second.result.evaluation_status,'NOT_EVALUATED');
    assert.equal(second.result.drift_rate_pct,null);
    assert.equal(second.result.hallucination_rate_pct,null);
  });
});

test('25 turns produce a verified, correctly scoped backcheck without invented scores', async()=>{
  await withPersistence(async()=>{
    const f=mockUniverse();
    let last;
    for(let n=1;n<=25;n++) last=await turn(n,f);
    assert.equal(last.result.turn,25);
    assert.equal(last.result.checkpoint.window_start,1);
    assert.equal(last.result.checkpoint.window_end,25);
    assert.equal(last.result.checkpoint.readback_verified,true);
    assert.equal(last.result.checkpoint.independently_evaluated_turns,0);
    assert.equal(last.result.checkpoint.unresolved_or_unassessed_receipt_ids.length,25);
    assert.equal(last.result.checkpoint.drift_rate_pct,null);
    assert.equal(last.result.checkpoint.hallucination_rate_pct,null);
    assert.equal(f.events.filter(e=>e.payload?.event_type==='HISTORICAL_BACKCHECK').length,1);
    const report=computeHistoricalBackcheck(f.events,25);
    assert.equal(report.total_turns,25);
    assert.equal(report.recorded_assessments,25);
    assert.equal(f.events.length,101);
  });
});

test('tampered prior-event parent linkage blocks continuation before writes',async()=>{
  await withPersistence(async()=>{
    const f=mockUniverse();
    await turn(1,f);
    const count=f.events.length;
    f.events[1].parent_event_id='00000000-0000-4000-8000-000000000000';
    await assert.rejects(turn(2,f),/CONTINUITY_REHYDRATION_FAILED/);
    assert.equal(f.events.length,count);
  });
});

test('independently attested structured contradiction proposes recovery but never publishes truth',async()=>{
  await withPersistence(async()=>{
    const f=mockUniverse();
    const at='2026-10-24T12:00:15.000Z';
    const signal=buildGovernedChatSignal({message:'What date will cabinets arrive?',observedAt:at});
    const runtime=await startContinuityRuntime({
      continuityRootSource:'continuity:reliability-test',worldlineSource:'world:construction',
      subjectId:'conversation:contractor',signal,observedAt:at,fetchImpl:f.fetchImpl
    });
    const snapshot={
      world_id:'construction:site-a',as_of:at,
      facts:[{key:'cabinet_delivery_date',value:'2026-10-27',world_id:'construction:site-a',evidence_ref:'supplier:receipt:verified'}],
      obligations:[],authorities:[],receipts:[],
    };
    const candidate={
      world_id:snapshot.world_id,scope:'OPERATIONAL',carried_obligation_ids:[],actions:[],
      claims:[
        {key:'cabinet_delivery_date',value:'2026-10-24',evidence_refs:['supplier:receipt:verified']},
        {key:'cabinet_price',value:4500,evidence_refs:['model:invented']},
      ],
    };
    const receipt={
      independent:true,verified:true,world_id:snapshot.world_id,
      source_kind:'EXTERNAL_EVIDENCE_VERIFIER',
    };
    const result=await runContinuousReliabilityCycle({
      continuityRuntime:runtime,modelOutput:'Cabinets October 24; price $4500',
      packetId:signal.packet.packet_id,
      structuredCandidate:candidate,independentlyVerifiedSnapshot:snapshot,
      evidenceVerifierReceipt:receipt,observedAt:at,
    });
    assert.deepEqual(result.drift,['FACT_DRIFT']);
    assert.deepEqual(result.hallucination_suspected,['UNSUPPORTED_CLAIM']);
    assert.equal(result.correction_proposed,true);
    assert.equal(result.correction_published_to_active_state,false);
    assert.equal(result.hallucination_rate_pct,null);
    assert.equal(result.readback_verified,true);
  });
});

test('50-turn historical audit overlaps turn 25 and carries all unassessed incidents',async()=>{
  await withPersistence(async()=>{
    const fixture=mockUniverse();
    let last;
    for(let n=1;n<=50;n++)last=await turn(n,fixture);
    const checkpoints=fixture.events.filter(e=>e.payload?.event_type==='HISTORICAL_BACKCHECK');
    assert.equal(checkpoints.length,2);
    assert.deepEqual(checkpoints.map(e=>e.payload.window_start),[1,25]);
    assert.deepEqual(checkpoints.map(e=>e.payload.window_end),[25,50]);
    assert.equal(last.result.checkpoint.unresolved_or_unassessed_receipt_ids.length,50);
    assert.equal(last.result.checkpoint.missing_assessment_turns,0);
    assert.equal(last.result.checkpoint.recorded_assessments,26);
    assert.equal(last.result.checkpoint.hallucination_rate_pct,null);
  });
});

test('missing model output assessment stays visible in checkpoint, not counted as clean',async()=>{
  await withPersistence(async()=>{
    const fixture=mockUniverse();
    const at='2026-10-24T12:59:01.000Z';
    const signal=buildGovernedChatSignal({message:'Unanswered customer question',observedAt:at});
    await startContinuityRuntime({
      continuityRootSource:'continuity:reliability-test',worldlineSource:'world:construction',
      subjectId:'conversation:contractor',signal,observedAt:at,fetchImpl:fixture.fetchImpl,
    });
    for(let n=2;n<=25;n++)await turn(n,fixture);
    const report=computeHistoricalBackcheck(fixture.events);
    assert.equal(report.total_turns,25);
    assert.equal(report.missing_assessment_turns,1);
    assert.equal(report.recorded_assessments,24);
    assert.equal(report.drift_rate_pct,null);
  });
});
