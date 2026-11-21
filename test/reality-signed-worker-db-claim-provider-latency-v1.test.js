import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
const source=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
const section=source.split('// The database can briefly queue PostgREST requests')[1]
 ?.split('  if(governedWakeGate?.status===')[0];
test('one authoritative bounded claim, no duplicate write, no fabricated wake',()=>{
 assert.ok(section,'must still use existing signed claim');
 assert.match(section,/reality_claim_governed_shift_worker_run_v1/);
 assert.match(section,/p_claim_id:proposedWakeClaimId/);
 assert.match(section,/timeoutMs:18000/);
 assert.doesNotMatch(section,/(?:while\s*\(|\bfor\s*\(|setTimeout|setInterval|retry\s*\()/);
 assert.equal((section.match(/await shiftRpc\(/g)||[]).length,1);
 assert.match(source,/governedWakeGate\.claim_id!==proposedWakeClaimId/);
 assert.match(source,/throw Error\('GOVERNED_SHIFT_WORKER_LEASE_READBACK_UNVERIFIED'\)/);
});
test('failed provider response never becomes a claimed worker lease',async()=>{
 let n=0;
 await assert.rejects(
  shiftRpc({url:'https://example.supabase.co',secretKey:'test'},
   'reality_claim_governed_shift_worker_run_v1',
   {p_claim_id:'0a40c450-1490-4f18-bc44-cdb4f29cdce3'},{
    timeoutMs:18000,
    fetchImpl:async()=>{
     n++;return{ok:false,status:503,json:async()=>({code:'57014'})};
    }
   }),
  /SHIFT_DATABASE_RPC_reality_claim_governed_shift_worker_run_v1_UNAVAILABLE/
 );
 assert.equal(n,1,'no automatic repeat or unsafe alternate lease');
});
test('missing or coalesced claim cannot authorize an original job',()=>{
 assert.match(source,/WAKE_COALESCED_ACTIVE_OR_COOLDOWN/);
 assert.match(source,/worker_started:false,work_completed:false/);
 assert.match(source,/governedWakeGate\.original_job_completed!==false/);
 assert.match(source,/governedWakeGate\.installation_authorized!==false/);
});
