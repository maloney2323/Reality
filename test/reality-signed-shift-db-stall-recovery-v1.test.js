import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
 shiftRpc,SHIFT_RPC_DEFAULT_TIMEOUT_MS,isShiftDatabaseTransportUnreachable
} from '../src/reality-governed-shift-boundary-v1.js';

const db={url:'https://example.invalid',secretKey:'not-a-real-token'};
const rpc='reality_record_signed_worker_actual_run_v1';

test('signed shift database calls have an explicit bounded transport deadline',()=>{
 assert.ok(SHIFT_RPC_DEFAULT_TIMEOUT_MS>=1000);
 assert.ok(SHIFT_RPC_DEFAULT_TIMEOUT_MS<60000);
 const source=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url
 ),'utf8');
 assert.match(source,/SHIFT_WORKER_DATABASE_TRANSPORT_UNAVAILABLE/);
 assert.match(source,/!shiftDbTransportUnreachable/);
});

test('a hung PostgREST write times out once, without replaying an uncertain effect',async()=>{
 let calls=0;
 const start=Date.now();
 await assert.rejects(
  shiftRpc(db,rpc,{p_status:'STARTED'},{
   timeoutMs:25,
   fetchImpl:async (_url,options)=>{
    calls++;
    assert.equal(options.method,'POST');
    assert.ok(options.signal);
    return new Promise((_resolve,reject)=>{
     const onAbort=()=>reject(options.signal.reason);
     if(options.signal.aborted)return onAbort();
     options.signal.addEventListener('abort',onAbort,{once:true});
    });
   },
  }),new RegExp('SHIFT_DATABASE_RPC_'+rpc+'_TIMEOUT')
 );
 assert.equal(calls,1);
 assert.ok(Date.now()-start<1500);
});

test('a failed provider response does not expose provider details or retry',async()=>{
 let calls=0;
 await assert.rejects(shiftRpc(db,rpc,{},{
  fetchImpl:async()=>{calls++;return {
   ok:false,
   json:async()=>({error:'secret provider error should not leak'})
  }}
 }),new RegExp('SHIFT_DATABASE_RPC_'+rpc+'_UNAVAILABLE'));
 assert.equal(calls,1);
});

test('successful readback is accepted as a single operation',async()=>{
 let calls=0;
 const result=await shiftRpc(db,'reality_read_owner_employee_shifts_v1',{},{
  fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({status:'READ_ONLY'})}}
 });
 assert.equal(result.status,'READ_ONLY');
 assert.equal(calls,1);
});

test('invalid transport deadline and unsupported RPC reject before any provider side effect',async()=>{
 let calls=0;
 const fetchImpl=async()=>{calls++;return {ok:true,json:async()=>({})}};
 await assert.rejects(shiftRpc(db,rpc,{},{
  timeoutMs:20001,fetchImpl
 }),/SHIFT_DATABASE_RPC_TIMEOUT_BUDGET_INVALID/);
 await assert.rejects(shiftRpc(db,'unsafe_arbitrary_rpc',{},{
  timeoutMs:1000,fetchImpl
 }),/SHIFT_RPC_NOT_ALLOWLISTED/);
 assert.equal(calls,0);
});


test('real lower-case signed shift RPC timeout is recognized without another write',()=>{
 assert.equal(isShiftDatabaseTransportUnreachable(
  new Error('SHIFT_DATABASE_RPC_reality_record_signed_worker_actual_run_v1_TIMEOUT')
 ),true);
 assert.equal(isShiftDatabaseTransportUnreachable(
  new Error('SHIFT_DATABASE_RPC_reality_record_signed_worker_actual_run_v1_UNAVAILABLE')
 ),true);
 assert.equal(isShiftDatabaseTransportUnreachable(
  new Error('SIGNED_WORKER_REAL_PROCESS_START_NOT_DURABLE')
 ),false);
 assert.equal(isShiftDatabaseTransportUnreachable(
  new Error('SHIFT_DATABASE_RPC_unsafe_arbitrary_rpc_TIMEOUT')
 ),false);
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/shiftDbTransportUnreachable=isShiftDatabaseTransportUnreachable\(error\)/);
 assert.match(worker,/!shiftDbTransportUnreachable/);
});
