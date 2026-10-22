// Recovery path for durable continuity events when the canonical Universe
// ledger is temporarily unavailable. The outbox MUST be backed by a second,
// independently durable store; an in-process Map is only a test double.
//
// The journal holds the original immutable Universe entry. Replay uses the
// existing Postgres/Universe persistence + readback contract. No speculative
// or unverified fact is promoted and no action authority is granted.
import { createHash } from 'node:crypto';
import { createUniverseEntry,validateUniverseEntry } from './reality-universe-persistence-contract-v1.0.js';
import { persistUniverseEntry,retrievePersistedUniverseEntry } from './reality-native-universe-persistence-v1.0.js';

export const CONTINUITY_RECOVERY_VERSION='reality-continuity-recovery-outbox-v0.1';
const required=(x,code)=>{if(typeof x!=='string'||!x.trim())throw Error(code);return x};
const canonical=x=>Array.isArray(x)?x.map(canonical):
  x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const identical=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
function journal(outbox){
  if(!outbox || ['append','read','pending','acknowledge','recordFailure'].some(
    method=>typeof outbox[method]!=='function'))
    throw Error('DURABLE_OUTBOX_ADAPTER_REQUIRED');
  if(outbox.durable!==true || outbox.independent_from_primary_ledger!==true)
    throw Error('DURABLE_OUTBOX_INDEPENDENCE_NOT_ASSERTED');
}
function validEnvelope(record,entryId=null){
  if(record?.version!==CONTINUITY_RECOVERY_VERSION || record?.status==='ACKNOWLEDGED' ||
     record?.event_id!==record?.event?.entry_id ||
     (entryId && record.event_id!==entryId))
    throw Error('OUTBOX_RECORD_IDENTITY_INVALID');
  validateUniverseEntry(record.event);
  if(record.ledger_hash!==record.event.ledger_entry_hash ||
     record.root_id!==record.event.continuity_root_id ||
     record.worldline_id!==record.event.worldline_id ||
     record.record_hash!==digest({version:record.version,event:record.event}))
    throw Error('OUTBOX_RECORD_INTEGRITY_FAILED');
  return record;
}
async function verifyQueued(outbox,record){
  const found=await outbox.read(record.event_id);
  validEnvelope(found,record.event_id);
  if(!identical(found.event,record.event) || found.record_hash!==record.record_hash)
    throw Error('OUTBOX_DURABLE_READBACK_MISMATCH');
  return found;
}
async function verifyPrimary(entry,fetchImpl){
  await persistUniverseEntry(entry,{fetchImpl});
  const readBack=await retrievePersistedUniverseEntry({entryId:entry.entry_id,fetchImpl});
  if(readBack.ledger_entry_hash!==entry.ledger_entry_hash ||
     !identical(readBack,entry))
    throw Error('CONTINUITY_RECOVERY_PRIMARY_READBACK_MISMATCH');
  return readBack;
}
function observedFailure(error){
  return String(error?.code||error?.message||'UNKNOWN_WRITE_FAILURE').slice(0,160);
}
/**
 * Submit only already-validated, server-created Universe entries.
 * The two independent durability reads are intentional. If the outbox cannot
 * prove its own persistence, no caller may report the event as safely queued.
 */
export async function appendContinuityWithRecovery({
  entry,outbox,fetchImpl=fetch,assertionTime=new Date().toISOString(),
}={}){
  validateUniverseEntry(entry);
  journal(outbox);
  const record=Object.freeze({
    version:CONTINUITY_RECOVERY_VERSION,event_id:entry.entry_id,
    root_id:entry.continuity_root_id,worldline_id:entry.worldline_id,
    ledger_hash:entry.ledger_entry_hash,event:entry,
    record_hash:digest({version:CONTINUITY_RECOVERY_VERSION,event:entry}),
  });
  await outbox.append(record);
  await verifyQueued(outbox,record);
  try {
    const verified=await verifyPrimary(entry,fetchImpl);
    await outbox.acknowledge(entry.entry_id,{
      primary_ledger_hash:verified.ledger_entry_hash,
      primary_entry_id:verified.entry_id,
      verification:'INDEPENDENT_PRIMARY_READBACK',
    });
    return Object.freeze({
      status:'VERIFIED_PRIMARY',entry_id:entry.entry_id,
      ledger_entry_hash:verified.ledger_entry_hash,queued_durably:true,
      recovered:false,action_authorized:false,
    });
  } catch(error){
    // A failed acknowledgement after a successful canonical write is also
    // recoverable: idempotent replay will re-read that same immutable entry.
    let failureRecorded=false;
    try{
      const failure={
        assertion_time:assertionTime,
        reason:observedFailure(error),
        fault_domain:'PRIMARY_LEDGER_OR_ACKNOWLEDGEMENT',
      };
      await outbox.recordFailure(entry.entry_id,failure);
      const confirmed=await verifyQueued(outbox,record);
      failureRecorded=Array.isArray(confirmed.failures) &&
        confirmed.failures.some(item=>identical(item,failure));
    } catch(failureRecordingError){
      // Do not erase the original operational error, but do not claim
      // that failure metadata was durably written either.
    }
    return Object.freeze({
      status:'PENDING_DURABLE_REPLAY',entry_id:entry.entry_id,
      ledger_entry_hash:entry.ledger_entry_hash,queued_durably:true,
      failure_record_verified:failureRecorded,
      primary_verified:false,action_authorized:false,
    });
  }
}

function recoveryGapEvent({record,latestFailure}){
  // Durable evidence that an interruption occurred. It never changes the
  // state of the original event or claims its semantic truth.
  if(!latestFailure?.assertion_time || !Number.isFinite(Date.parse(latestFailure.assertion_time)))
    throw Error('CONTINUITY_RECOVERY_GAP_TIME_INVALID');
  const event=record.event;
  return createUniverseEntry({
    entry_id:'continuity:recovery-gap:'+digest({
      event_id:event.entry_id,record_hash:record.record_hash,
      failure:latestFailure,
    }),
    continuity_root_id:event.continuity_root_id,
    worldline_id:event.worldline_id,event_kind:'CONTINUITY_RECOVERY_GAP',
    epistemic_kind:'OBSERVATION',
    assertion_time:latestFailure.assertion_time,
    effective_time:event.effective_time,
    source_ref:CONTINUITY_RECOVERY_VERSION,
    payload:{
      recovered_event_id:event.entry_id,
      recovered_event_ledger_hash:event.ledger_entry_hash,
      failure:latestFailure,
      gap_disposition:'REPLAYED_AND_READ_BACK',
      original_history_preserved:true,
      epistemic_truth_established:false,action_authorized:false,
    },
    evidence_references:[event.entry_id],
    provenance:{source:CONTINUITY_RECOVERY_VERSION,recovery_event_ref:event.entry_id},
  });
}
/**
 * Explicit replay (not a pretend background worker). Caller must invoke on
 * startup or from a trusted scheduled process; tenant-root required.
 */
export async function replayContinuityOutbox({
  outbox,continuityRootId,worldlineId='reality:primary',
  fetchImpl=fetch,limit=100,
}={}){
  journal(outbox);
  required(continuityRootId,'RECOVERY_ROOT_REQUIRED');
  required(worldlineId,'RECOVERY_WORLDLINE_REQUIRED');
  if(!Number.isInteger(limit)||limit<1||limit>1000)
    throw Error('RECOVERY_BATCH_LIMIT_INVALID');
  const batch=await outbox.pending({continuityRootId,worldlineId,limit});
  if(!Array.isArray(batch)||batch.length>limit)
    throw Error('OUTBOX_PENDING_SCAN_INVALID');
  let replayed=0,pending=0;
  const failures=[];
  for(const pendingItem of batch){
    // Scope-check BEFORE dereferencing any submitted outbox identity.
    const id=required(pendingItem?.event_id,'OUTBOX_PENDING_ID_REQUIRED');
    if(pendingItem.root_id!==continuityRootId ||
       pendingItem.worldline_id!==worldlineId)
      throw Error('OUTBOX_PENDING_SCOPE_MISMATCH');
    const record=await verifyQueued(outbox,pendingItem);
    try{
      const verified=await verifyPrimary(record.event,fetchImpl);
      const failuresObserved=Array.isArray(pendingItem.failures)?pendingItem.failures:[];
      // Append an explicit interruption receipt. Failure records are only
      // diagnostic; the original event remains immutable.
      for(const failure of failuresObserved){
        const gap=recoveryGapEvent({record,latestFailure:failure});
        await verifyPrimary(gap,fetchImpl);
      }
      await outbox.acknowledge(id,{
        primary_ledger_hash:verified.ledger_entry_hash,
        primary_entry_id:verified.entry_id,
        verification:'INDEPENDENT_PRIMARY_READBACK_AFTER_RECOVERY',
      });
      replayed++;
    }catch(error){
      pending++;
      failures.push({event_id:id,reason:observedFailure(error)});
      // The independently durable original is kept. Failure telemetry is
      // best effort and may itself be unavailable.
      try{
        await outbox.recordFailure(id,{
          assertion_time:new Date().toISOString(),
          reason:observedFailure(error),
          fault_domain:'REPLAY_ATTEMPT',
        });
      }catch{}
    }
  }
  return Object.freeze({
    status:pending?'PARTIAL_RECOVERY':'REPLAY_BATCH_COMPLETED',
    continuity_root_id:continuityRootId,worldline_id:worldlineId,
    attempted:batch.length,replayed,pending,
    failures:Object.freeze(failures),
    // A batch limit is NOT proof that a global queue has been drained.
    backlog_exhausted_proven:false,
  });
}
