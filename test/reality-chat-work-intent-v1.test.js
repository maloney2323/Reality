import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChatWorkIntent,classifyChatWorkIntent} from '../src/reality-chat-work-intent-v1.js';

const capabilities=[
 {id:'governed-original-discovery',description:'Existing development work'},
 {id:'owner-employee-shift-briefing',description:'Existing shift status'},
];
test('natural explicit request maps only to an actually registered executor, without granting execution',async()=>{
 const message='Reality, please continue my existing repair job.';
 const x=await classifyChatWorkIntent({message,registeredCapabilities:capabilities,
  provider:async()=>({kind:'WORK_REQUEST',capability_id:'governed-original-discovery',
   explicit_request:true,quote:'please continue my existing repair job',objective:'Continue repair'})});
 assert.equal(x.capability_id,'governed-original-discovery');
 assert.equal(x.action_eligible,true);
});
test('hypothetical discussion and past instructions do not authorize real work',()=>{
 const x=validateChatWorkIntent({message:'Could Reality possibly do this someday?',
  registeredCapabilities:capabilities,interpretation:{
   kind:'CONVERSATION',capability_id:'governed-original-discovery',
   explicit_request:false,quote:'Could Reality possibly do this someday',
   objective:'Discuss possibility'}});
 assert.equal(x.action_eligible,false);
});
test('model cannot invent a quote from earlier turns to authorize an existing job',()=>{
 const x=validateChatWorkIntent({message:'That is interesting.',
  registeredCapabilities:capabilities,interpretation:{
   kind:'WORK_REQUEST',capability_id:'governed-original-discovery',
   explicit_request:true,quote:'continue the previous original job',objective:'Continue'}});
 assert.equal(x.status,'INTENT_SOURCE_QUOTE_UNVERIFIED');
 assert.equal(x.action_eligible,false);
});
test('missing website editing adapter is a declared capability gap, not development work',()=>{
 const message='Change the headline on my homepage to Welcome.';
 const x=validateChatWorkIntent({message,registeredCapabilities:capabilities,
  interpretation:{kind:'WORK_REQUEST',capability_id:'',
   explicit_request:true,quote:'Change the headline on my homepage',objective:'Change headline'}});
 assert.equal(x.status,'CAPABILITY_ADAPTER_NOT_REGISTERED');
 assert.equal(x.capability_id,null);
 assert.equal(x.action_eligible,false);
});
test('unregistered adapter chosen by a model cannot dispatch external work',()=>{
 const x=validateChatWorkIntent({message:'Please transfer money now.',
  registeredCapabilities:capabilities,interpretation:{
   kind:'WORK_REQUEST',capability_id:'transfer-money',explicit_request:true,
   quote:'Please transfer money now',objective:'Transfer funds'}});
 assert.equal(x.action_eligible,false);
 assert.equal(x.capability_id,null);
});
test('model transport failure cannot authorize action',async()=>{
 await assert.rejects(()=>classifyChatWorkIntent({
  message:'Please fix the site',registeredCapabilities:capabilities,
  provider:async()=>{throw Error('CONNECTION_LOST');}
 }),/CONNECTION_LOST/);
});
