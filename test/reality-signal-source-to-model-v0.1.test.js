import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {buildModelInput} from '../src/reality-model-gateway-v0.1.js';
const stamp='2026-10-22T12:00:00Z';
test('source formatting survives fragments and model boundary exactly',()=>{
 const raw='    const invoice =  5000;\r\n\tif (approved) {\r\n      return invoice;\r\n    }';
 const clean=buildGovernedChatSignal({message:raw,observedAt:stamp});
 const input=buildModelInput({governedSignal:clean});
 assert.equal(clean.packet.raw_content,raw);
 assert.equal(input.governed_signal.raw_content_exact,raw);
 assert.equal(input.governed_signal.source_text_status,
  'EXACT_RAW_SOURCE_INCLUDED_WITH_TRANSFORMED_FRAGMENTS');
 assert.equal(input.governed_signal.transformation_receipt.input_digest,
  input.governed_signal.raw_content_digest);
});
test('basic exact single-fragment text is not duplicated into paid model context',()=>{
 const raw='Explain the status.';
 const input=buildModelInput({governedSignal:buildGovernedChatSignal({message:raw,observedAt:stamp})});
 assert.equal(input.governed_signal.source_text_status,'SINGLE_FRAGMENT_EXACTLY_EQUALS_SOURCE');
 assert.equal(Object.hasOwn(input.governed_signal,'raw_content_exact'),false);
});
test('multi-line instructions, explicit negation, Unicode and spacing remain intact',()=>{
 const raw='Do not send invoice 17.\n\nWhat if its status is PENDING?\n\n计算:\t5000  -  500';
 const input=buildModelInput({governedSignal:buildGovernedChatSignal({message:raw,observedAt:stamp})});
 assert.equal(input.governed_signal.raw_content_exact,raw);
 assert.equal(input.authority.granted,false);
});
test('tampered source digest is rejected before any model invocation',()=>{
 const signal=buildGovernedChatSignal({message:'Keep this exact.',observedAt:stamp});
 assert.throws(()=>buildModelInput({governedSignal:{
  ...signal,packet:{...signal.packet,raw_content:'Tampered message'},
 }}),/SIGNAL_RAW_SOURCE_INTEGRITY_FAILED/);
 assert.throws(()=>buildModelInput({governedSignal:{
  ...signal,transformation_receipt:{...signal.transformation_receipt,input_digest:'forged'},
 }}),/SIGNAL_RAW_SOURCE_INTEGRITY_FAILED/);
});
