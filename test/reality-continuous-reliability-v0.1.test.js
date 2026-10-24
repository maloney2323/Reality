import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGovernedChatSignal } from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import { startContinuityRuntime } from '../src/reality-continuity-spine-runtime-v0.1.js';
import { recordSourceAttestedEvidence, readGroundedEvidence } from '../src/reality-reliability-evidence-v0.1.js';
import { extractReliabilityClaims } from '../src/reality-reliability-claim-extraction-v0.1.js';
import { runLiveIntelligenceOrchestration } from '../src/reality-live-intelligence-orchestration-v0.1.js';
import { resolveReliabilityBenchmarkDb } from '../src/reality-reliability-db-boundary-v0.1.js';
import {sealModelOutput,openModelOutput} from '../src/reality-reliability-private-replay-v0.1.js';
import {captureGithubRepositoryEvidence} from '../src/reality-reliability-github-evidence-v0.1.js';
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
  const names=['REALITY_UNIVERSE_PERSISTENCE_ENABLED','SUPABASE_URL','SUPABASE_SECRET_KEY',
    'REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL','REALITY_RELIABILITY_BENCHMARK_SUPABASE_SECRET_KEY',
    'REALITY_RELIABILITY_BENCHMARK_PROJECT_REF','REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF'];
  const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-only';
  process.env.REALITY_RELIABILITY_BENCHMARK_PROJECT_REF='hvkfreoagbrphwghjajw';
  process.env.REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF='hvkfreoagbrphwghjajw';
  process.env.REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL='https://hvkfreoagbrphwghjajw.supabase.co';
  process.env.REALITY_RELIABILITY_BENCHMARK_SUPABASE_SECRET_KEY='isolated-test-key';
  try { await fn(); }
  finally {
    for (const [name,value] of Object.entries(previous)) {
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
    const evidence = await recordSourceAttestedEvidence({
      continuityRuntime:runtime,worldId:snapshot.world_id,
      sourceKind:'CONNECTED_PROVIDER_READBACK',sourceRef:'supplier-delivery-verified',
      sourceDigest:'readback-hash-v1',facts:[{key:'cabinet_delivery_date',value:'2026-10-27'}],observedAt:at,
    });
    candidate.claims[0].evidence_refs=[evidence.event_id];
    const result=await runContinuousReliabilityCycle({
      continuityRuntime:runtime,modelOutput:'Cabinets October 24; price $4500',
      packetId:signal.packet.packet_id,
      structuredCandidate:candidate,observedAt:at,
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

test('tampered historical payload is rejected even when stored hash pointers are unchanged',async()=>{
  await withPersistence(async()=>{
    const fixture=mockUniverse();
    await turn(1,fixture);
    const before=fixture.events.length;
    fixture.events[0].payload.raw_content_digest='sha256:tampered';
    await assert.rejects(turn(2,fixture),/RELIABILITY_HISTORY_CONTENT_HASH_INVALID/);
    assert.equal(fixture.events.length,before);
  });
});

test('source evidence cannot be supplied through the assessment as an arbitrary trust snapshot',async()=>{
  await withPersistence(async()=>{
    const fixture=mockUniverse(),at='2026-10-24T13:01:00.000Z';
    const signal=buildGovernedChatSignal({message:'Prepare cabinet schedule',observedAt:at});
    const runtime=await startContinuityRuntime({
      continuityRootSource:'continuity:reliability-test',worldlineSource:'world:construction',
      subjectId:'conversation:contractor',signal,observedAt:at,fetchImpl:fixture.fetchImpl,
    });
    const fake={
      world_id:'construction:site-a',facts:[{key:'delivery',value:'tomorrow',world_id:'construction:site-a',evidence_ref:'fake'}],
      obligations:[],authorities:[],receipts:[],
    };
    const result=await runContinuousReliabilityCycle({
      continuityRuntime:runtime,modelOutput:'Delivery tomorrow',
      packetId:signal.packet.packet_id,independentlyVerifiedSnapshot:fake,
      evidenceVerifierReceipt:{verified:true,independent:true,source_kind:'EXTERNAL_EVIDENCE_VERIFIER'},
      structuredCandidate:{world_id:'construction:site-a',scope:'CONVERSATIONAL',claims:[{key:'delivery',value:'tomorrow',evidence_refs:['fake']}],actions:[],carried_obligation_ids:[]},
      observedAt:at,
    });
    assert.equal(result.evaluation_status,'NOT_EVALUATED');
    assert.equal(result.hallucination_rate_pct,null);
  });
});

test('source attestation requires explicit supersession and rejects ungrounded contradictory updates',async()=>{
  await withPersistence(async()=>{
    const fixture=mockUniverse(),at='2026-10-24T13:02:00.000Z';
    const signal=buildGovernedChatSignal({message:'Delivery review',observedAt:at});
    const runtime=await startContinuityRuntime({
      continuityRootSource:'continuity:reliability-test',worldlineSource:'world:construction',
      subjectId:'conversation:contractor',signal,observedAt:at,fetchImpl:fixture.fetchImpl,
    });
    const a=await recordSourceAttestedEvidence({
      continuityRuntime:runtime,worldId:'construction:site-a',
      sourceKind:'CONNECTED_PROVIDER_READBACK',sourceRef:'supplier:1',sourceDigest:'sha-one',
      facts:[{key:'cabinet_delivery_date',value:'October 24'}],observedAt:at,
    });
    await recordSourceAttestedEvidence({
      continuityRuntime:runtime,worldId:'construction:site-a',
      sourceKind:'CONNECTED_PROVIDER_READBACK',sourceRef:'supplier:2',sourceDigest:'sha-two',
      facts:[{key:'cabinet_delivery_date',value:'October 27'}],observedAt:at,
    });
    assert.throws(()=>readGroundedEvidence(orderContinuityHistory(fixture.events),{worldId:'construction:site-a'}),
      /RELIABILITY_CONFLICTING_ATTESTED_FACTS/);
    // With an explicit supersession chain the active fact advances, not history.
    // A different root is required after a conflicting source was appended.
    assert.ok(a.event_id);
  });
});

test('quote-anchored extractor rejects invented quotes and cannot prove accuracy by itself',async()=>{
  const snapshot={world_id:'construction:site-a',facts:[{key:'delivery',value:'October 27',evidence_ref:'source:1'}],obligations:[]};
  const modelOutput='Delivery is October 24 and the price is $4500.';
  const extract=async value=>extractReliabilityClaims({
    snapshot,worldId:snapshot.world_id,modelOutput,apiKey:'test-key',model:'test-model',
    fetchImpl:async()=>new Response(JSON.stringify({id:'extract:1',output_text:JSON.stringify(value)}),{status:200}),
  });
  const ok=await extract({claims:[
    {key:'delivery',value:'October 24',quote:'Delivery is October 24'},
    {key:'price',value:'4500',quote:'the price is $4500'},
  ],actions:[],operational:false});
  assert.equal(ok.candidate.claims.length,2);
  assert.equal(ok.completeness_independently_verified,false);
  await assert.rejects(extract({claims:[{key:'price',value:'4500',quote:'I verified the price'}],
    actions:[],operational:false}),/RELIABILITY_EXTRACTION_QUOTE_NOT_IN_MODEL_OUTPUT/);
});

test('real orchestration path sees prior ledger evidence and detects model contradiction via quote extraction',async()=>{
  await withPersistence(async()=>{
    const prev={environment:process.env.VERCEL_ENV,cycle:process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED,
      extraction:process.env.REALITY_RELIABILITY_EXTRACTION_ENABLED};
    process.env.VERCEL_ENV='preview';
    process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED='true';
    process.env.REALITY_RELIABILITY_EXTRACTION_ENABLED='true';
    try{
      const fixture=mockUniverse(),at='2026-10-24T13:15:00.000Z';
      const signal=buildGovernedChatSignal({message:'Record supplier confirmation',observedAt:at});
      const prior=await startContinuityRuntime({
        continuityRootSource:'continuity:reliability-test',worldlineSource:'world:construction',
        subjectId:'conversation:contractor',signal,observedAt:at,fetchImpl:fixture.fetchImpl,
      });
      const receipt=await recordSourceAttestedEvidence({
        continuityRuntime:prior,worldId:'construction:site-a',
        sourceKind:'CONNECTED_PROVIDER_READBACK',sourceRef:'supplier:confirmed-delivery',
        sourceDigest:'supplier-receipt:oct27',
        facts:[{key:'cabinet_delivery_date',value:'October 27'}],
        obligations:[{id:'do_not_send_estimate_without_approval',active:true}],
        observedAt:at,
      });
      const modelCalls=[];
      const fakeFetch=async (url,options={})=>{
        if(String(url).includes('/rest/v1/reality_universe_entries'))return new Response('[]',{status:200});
        if(String(url).includes('api.openai.com/v1/responses')){
          const request=JSON.parse(options.body);
          modelCalls.push(request);
          if(request.text?.format?.name==='reliability_assertions'){
            return new Response(JSON.stringify({id:'extract:1',status:'completed',output_text:JSON.stringify({
              claims:[{key:'cabinet_delivery_date',value:'October 24',quote:'October 24'}],
              actions:[],operational:false,
            })}),{status:200});
          }
          return new Response(JSON.stringify({id:'model:1',status:'completed',
            output_text:'The cabinet delivery is October 24.'}),{status:200});
        }
        return fixture.fetchImpl(url,options);
      };
      const result=await runLiveIntelligenceOrchestration({
        message:'What is the cabinet delivery?',model:'test-model',apiKey:'test-key',
        systemContext:{continuity_root_id:'continuity:reliability-test',
          conversation_id:'conversation:contractor',worldline_id:'world:construction',
          world_id:'construction:site-a'},observedAt:'2026-10-24T13:16:00.000Z',
        fetchImpl:fakeFetch,
      });
      assert.equal(modelCalls.length,2);
      assert.equal(modelCalls[0].input[1].content[0].text.includes('October 27'),true);
      assert.equal(modelCalls[0].input[1].content[0].text.includes('do_not_send_estimate_without_approval'),true);
      assert.equal(result.reliability.evaluation_status,'EVALUATED_AGAINST_SOURCE_ATTESTATION');
      assert.deepEqual(result.reliability.drift,['FACT_DRIFT']);
      assert.equal(result.reliability.readback_verified,true);
      assert.equal(result.reliability.correction_proposed,true);
      assert.equal(result.reliability.model_output_quarantined,true);
      assert.match(result.intelligence.answer,/October 27/);
      assert.doesNotMatch(result.intelligence.answer,/October 24/);
      assert.equal(result.intelligence.reliability_intervention,'QUARANTINED_PRIOR_TO_DISPLAY');
      assert.equal(result.reliability.correction_published_to_active_state,false);
      assert.equal(result.reliability.hallucination_rate_pct,null);
      assert.ok(receipt.event_id);
    }finally{
      for(const [k,v] of [['VERCEL_ENV',prev.environment],
        ['REALITY_CONTINUOUS_RELIABILITY_ENABLED',prev.cycle],
        ['REALITY_RELIABILITY_EXTRACTION_ENABLED',prev.extraction]]){
        if(v===undefined)delete process.env[k]; else process.env[k]=v;
      }
    }
  });
});

test('25-turn audit discovers earlier claim conflicting with later superseding source',async()=>{
  await withPersistence(async()=>{
    const fixture=mockUniverse(),worldId='construction:site-a';
    const at1='2026-10-24T14:00:01.000Z';
    const original=buildGovernedChatSignal({message:'Cabinet delivery is October 24',observedAt:at1});
    const first=await startContinuityRuntime({
      continuityRootSource:'continuity:reliability-test',worldlineSource:'world:construction',
      subjectId:'conversation:contractor',signal:original,observedAt:at1,fetchImpl:fixture.fetchImpl,
    });
    const firstEvidence=await recordSourceAttestedEvidence({
      continuityRuntime:first,worldId,sourceKind:'CONNECTED_PROVIDER_READBACK',
      sourceRef:'supplier:preliminary',sourceDigest:'readback:preliminary',
      facts:[{key:'cabinet_delivery_date',value:'October 24'}],observedAt:at1,
    });
    const initial=await runContinuousReliabilityCycle({
      continuityRuntime:first,modelOutput:'Cabinet delivery is October 24.',
      packetId:original.packet.packet_id,observedAt:at1,
      structuredCandidate:{world_id:worldId,scope:'CONVERSATIONAL',actions:[],
        carried_obligation_ids:[],claims:[{key:'cabinet_delivery_date',value:'October 24',
          evidence_refs:[firstEvidence.event_id],original_quote:'October 24'}]},
    });
    assert.equal(initial.evaluation_status,'EVALUATED_AGAINST_SOURCE_ATTESTATION');
    assert.equal(initial.drift.length,0);
    for(let n=2;n<25;n++)await turn(n,fixture);
    const at25='2026-10-24T14:00:25.000Z';
    const signal=buildGovernedChatSignal({message:'Supplier changed delivery plan',observedAt:at25});
    const later=await startContinuityRuntime({
      continuityRootSource:'continuity:reliability-test',worldlineSource:'world:construction',
      subjectId:'conversation:contractor',signal,observedAt:at25,fetchImpl:fixture.fetchImpl,
    });
    const newEvidence=await recordSourceAttestedEvidence({
      continuityRuntime:later,worldId,sourceKind:'CONNECTED_PROVIDER_READBACK',
      sourceRef:'supplier:confirmed',sourceDigest:'readback:confirmed',
      facts:[{key:'cabinet_delivery_date',value:'October 27',
        supersedes_evidence_ref:firstEvidence.event_id}],observedAt:at25,
    });
    const result=await runContinuousReliabilityCycle({
      continuityRuntime:later,modelOutput:'Acknowledged.',
      packetId:signal.packet.packet_id,observedAt:at25,
    });
    assert.equal(result.turn,25);
    assert.equal(result.checkpoint.retrospective_discrepancies.length,1);
    const incident=result.checkpoint.retrospective_discrepancies[0];
    assert.equal(incident.original_turn,1);
    assert.equal(incident.new_source_receipt_id,newEvidence.event_id);
    assert.equal(incident.status,'NEW_EVIDENCE_CONTRADICTION_PENDING_TEMPORAL_ADJUDICATION');
    assert.equal(result.checkpoint.hallucination_rate_pct,null);
    assert.equal(result.checkpoint.readback_verified,true);
  });
});

test('benchmark storage refuses inherited production credentials and project scope confusion',()=>{
  const base={VERCEL_ENV:'preview',REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
    REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:'hvkfreoagbrphwghjajw',
    REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:'hvkfreoagbrphwghjajw',
    REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
    SUPABASE_SECRET_KEY:'production-key',
    REALITY_RELIABILITY_BENCHMARK_SUPABASE_SECRET_KEY:'isolated-key'};
  assert.equal(resolveReliabilityBenchmarkDb(base).strictSecrets,true);
  assert.throws(()=>resolveReliabilityBenchmarkDb({...base,
    REALITY_RELIABILITY_BENCHMARK_SUPABASE_SECRET_KEY:'production-key'}),/DEDICATED_KEY_REQUIRED/);
  assert.throws(()=>resolveReliabilityBenchmarkDb({...base,
    REALITY_RELIABILITY_BENCHMARK_SUPABASE_SECRET_KEY:undefined}),/DEDICATED_KEY_REQUIRED/);
  assert.throws(()=>resolveReliabilityBenchmarkDb({...base,
    REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://qkzvjfiegihyaoabiniy.supabase.co'}),
    /PROJECT_SCOPE_NOT_VERIFIED/);
  assert.throws(()=>resolveReliabilityBenchmarkDb({...base,
    REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:'qkzvjfiegihyaoabiniy'}),
    /PROJECT_NOT_ALLOWLISTED/);
  assert.equal(resolveReliabilityBenchmarkDb({...base,VERCEL_ENV:'production'}),null);
});

test('encrypted replay is bound to continuity scope and private model output stays out of plaintext receipts',()=>{
 const key='test-only-private-replay-key';
 const scope='root:a|world:1';
 const model='Private customer instruction: no estimate without approval';
 const encrypted=sealModelOutput(model,{key,scope});
 assert.equal(encrypted.status,'ENCRYPTED_REPLAY_AVAILABLE');
 assert.equal(JSON.stringify(encrypted).includes('Private customer'),false);
 assert.equal(openModelOutput(encrypted,{key,scope}),model);
 assert.throws(()=>openModelOutput(encrypted,{key,scope:'root:b|world:1'}),
   /RELIABILITY_REPLAY_DECRYPT_OR_SCOPE_FAILED/);
 assert.throws(()=>openModelOutput(encrypted,{key:'wrong-key',scope}),
   /RELIABILITY_REPLAY_DECRYPT_OR_SCOPE_FAILED/);
 assert.equal(sealModelOutput(model,{key:'',scope}).status,'NOT_RETAINED');
});
test('historical audit distinguishes replayable from permanently missing original model output',async()=>{
 await withPersistence(async()=>{
   const fixture=mockUniverse();
   const previous=process.env.REALITY_RELIABILITY_REPLAY_KEY;
   process.env.REALITY_RELIABILITY_REPLAY_KEY='test-replay-key';
   try{
     for(let n=1;n<=25;n++)await turn(n,fixture);
     const audit=computeHistoricalBackcheck(fixture.events);
     assert.equal(audit.replayable_unassessed_receipt_ids.length,25);
     assert.equal(audit.unreplayable_unassessed_receipt_ids.length,0);
     assert.equal(audit.hallucination_rate_pct,null);
   }finally{
     if(previous===undefined)delete process.env.REALITY_RELIABILITY_REPLAY_KEY;
     else process.env.REALITY_RELIABILITY_REPLAY_KEY=previous;
   }
 });
});
test('authenticated real-provider adapter records scoped GitHub facts and superseding changes',async()=>{
 await withPersistence(async()=>{
   const fixture=mockUniverse();
   const signal=buildGovernedChatSignal({message:'Inspect Reality repository',observedAt:'2026-10-24T14:30:00.000Z'});
   const runtime=await startContinuityRuntime({
      continuityRootSource:'continuity:reliability-test',worldlineSource:'world:construction',
      subjectId:'conversation:contractor',signal,observedAt:'2026-10-24T14:30:00.000Z',fetchImpl:fixture.fetchImpl,
   });
   let branch='main',reads=0;
   const provider=async(url,options)=>{
     assert.equal(url,'https://api.github.com/repos/maloney2323/Reality');
     assert.equal(options.method,'GET');reads++;
     return new Response(JSON.stringify({
       id:1388852445,full_name:'maloney2323/Reality',
       default_branch:branch,archived:false,
     }),{status:200});
   };
   const first=await captureGithubRepositoryEvidence({
     continuityRuntime:runtime,allowedRepository:'maloney2323/Reality',
     worldId:'developer:repo',fetchImpl:provider,
     observedAt:'2026-10-24T14:30:01.000Z',
   });
   assert.equal(first.readback_verified,true);
   assert.equal(first.facts.default_branch,'main');
   branch='master';
   const next=await captureGithubRepositoryEvidence({
     continuityRuntime:runtime,allowedRepository:'maloney2323/Reality',
     worldId:'developer:repo',fetchImpl:provider,
     observedAt:'2026-10-24T14:30:02.000Z',
   });
   assert.equal(next.facts.default_branch,'master');
   assert.equal(reads,2);
   const snapshot=readGroundedEvidence(orderContinuityHistory(fixture.events),{worldId:'developer:repo'});
   const fact=snapshot.facts.find(x=>x.key==='default_branch');
   assert.equal(fact.value,'master');
   assert.equal(fact.evidence_ref,next.source_receipt_id);
   assert.equal(snapshot.source_receipt_ids.length,2);
 });
});
test('GitHub evidence adapter rejects wrong repo, forged response and provider outage',async()=>{
 await withPersistence(async()=>{
   const fixture=mockUniverse();
   const signal=buildGovernedChatSignal({message:'Observe',observedAt:'2026-10-24T14:31:00.000Z'});
   const runtime=await startContinuityRuntime({
     continuityRootSource:'continuity:reliability-test',worldlineSource:'world:construction',
     subjectId:'conversation:contractor',signal,observedAt:'2026-10-24T14:31:00.000Z',fetchImpl:fixture.fetchImpl,
   });
   const before=fixture.events.length;
   const base={continuityRuntime,allowedRepository:'maloney2323/Reality',worldId:'developer:repo'};
   await assert.rejects(captureGithubRepositoryEvidence({...base,repository:'another/repo'}),
     /RELIABILITY_GITHUB_REPOSITORY_NOT_ALLOWLISTED/);
   await assert.rejects(captureGithubRepositoryEvidence({...base,
     fetchImpl:async()=>new Response(JSON.stringify({
       id:1,full_name:'attacker/clone',default_branch:'main',archived:false,
     }),{status:200})}),/RELIABILITY_GITHUB_PROVIDER_DATA_INVALID/);
   await assert.rejects(captureGithubRepositoryEvidence({...base,
     fetchImpl:async()=>new Response('unavailable',{status:503})}),
     /RELIABILITY_GITHUB_PROVIDER_READ_FAILED_503/);
   assert.equal(fixture.events.length,before);
 });
});