import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTINUOUS_CONVERSATION_CASES as cases,
 CONTINUOUS_CONVERSATION_CASEPACK_HASH as hash,
 CONTINUOUS_CONVERSATION_MANIFEST as manifest}
 from '../benchmarks/reality-deep-conversational-drift-120turn-v2.mjs';
test('exactly 120 causally ordered genuine free-form user messages are frozen',()=>{
 assert.equal(cases.length,120);
 cases.forEach((x,i)=>{assert.equal(x.turn,i+1);assert.ok(x.text.length>40);});
 assert.match(hash,/^sha256:[a-f0-9]{64}$/);
});
test('many key facts have delays of dozens to over 100 turns',()=>{
 const probes=cases.filter(x=>x.probe);
 assert.equal(probes.length,24);
 const lags=probes.flatMap(x=>x.probe.sources.map(s=>x.turn-s));
 assert.ok(lags.some(l=>l>=60));
 assert.ok(lags.some(l=>l>=100));
 assert.equal(manifest.no_baseline_lane,true);
});
test('a hard causal rule forbids future source messages from helping earlier questions',()=>{
 for(const t of cases.filter(x=>x.probe))
  for(const source of t.probe.sources)assert.ok(source<t.turn,
   'source '+source+' must precede probe '+t.turn);
});
test('signed scope and permission to send are treated as separate evidence',()=>{
 assert.match(cases[0].text,/signs the revised scope/i);
 assert.match(cases[0].text,/separately authorize sending/i);
 assert.match(cases[73].text,/scope v2/i);
 assert.match(cases[73].text,/NOT authorized sending/i);
 assert.match(cases[95].text,/scope v3 signature/i);
 assert.match(cases[95].text,/not permission/i);
});
test('there are genuine chronological supersessions, not manufactured model failures',()=>{
 assert.match(cases[40].text,/154/);
 assert.match(cases[80].text,/WITHDRAWN/);
 assert.match(cases[105].text,/157/);
 assert.match(cases[65].text,/INSPECTION PASS/);
 assert.match(cases[90].text,/SAFETY HOLD/);
 assert.equal(cases.every(x=>!('model_answer' in x)),true);
});
test('prompts do not repeat rigid structured checklist every turn',()=>{
 const prompts=cases.map(x=>x.text);
 const structured=prompts.filter(x=>/state the current blockers, current readiness/i.test(x));
 assert.equal(structured.length,0);
 assert.ok(prompts.some(x=>/three versions of a polite/i.test(x)));
 assert.ok(prompts.some(x=>/grout/i.test(x)));
 assert.ok(prompts.some(x=>/pretend/i.test(x)));
});
test('last prompt asks for current status after several reversals',()=>{
 assert.match(cases[119].text,/final owner-ready recap/i);
 assert.match(cases[119].text,/historical/i);
 assert.match(cases[119].text,/superseded/i);
 assert.ok(cases[119].probe);
});
