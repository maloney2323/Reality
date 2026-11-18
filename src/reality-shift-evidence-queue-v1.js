import crypto from 'node:crypto';

export const SHIFT_QUEUE_VERSION = 'reality-evidence-shift-queue-v1';
const text = v => typeof v === 'string' ? v.trim() : '';
const acceptedUrl = value => /^https:\/\/github\.com\/maloney2323\/Reality\/(?:actions\/runs\/[0-9]+|pull\/[0-9]+|issues\/[0-9]+)(?:[/?#].*)?$/i.test(text(value));

function uuid(key) {
  const chars = crypto.createHash('sha256').update(JSON.stringify(key)).digest('hex').slice(0,32).split('');
  chars[12]='5';
  chars[16]=((parseInt(chars[16],16)&3)|8).toString(16);
  const h=chars.join('');
  return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
}

/**
 * Discovery never grants authority. Only Reality-owned, source-backed and
 * independently verifiable operations are eligible for automatic assignment.
 * An unchanged source observation does not generate a fresh job every tick.
 */
export function projectShiftWorkCandidates(stewardship, { principalId } = {}) {
  if (!text(principalId)) return [];
  if (stewardship?.status !== 'OBSERVED'
    || stewardship?.source?.repository !== 'maloney2323/Reality'
    || stewardship?.source?.provider !== 'github') return [];

  const byId = new Map();
  for (const candidate of Array.isArray(stewardship.work) ? stewardship.work : []) {
    const source = candidate?.execution_work_item;
    if (candidate?.state !== 'QUALIFIED' || !candidate?.authorization_required
      || candidate?.authorization_required !== true
      || !text(candidate.work_id) || !text(source?.work_item_id)
      || source.work_item_id !== candidate.work_id
      || source.connector !== 'github' || source.operation !== 'create_issue'
      || source.inputs?.repository !== 'maloney2323/Reality'
      || !text(source.inputs?.title) || !text(source.inputs?.body)
      || !text(source.workflow_id)) continue;
    const refs = [...new Set((candidate.evidence_refs || []).filter(acceptedUrl))];
    if (!refs.length) continue;
    const workId=source.work_item_id;
    if (byId.has(workId)) continue;
    const job={ ...source,
      continuity_root_id: uuid(['shift-job-root',principalId,workId]),
      principal_id: principalId,
      evidence_refs: refs,
      evidence_source: 'github',
      source_candidate_id: candidate.work_id,
      source_verified: true,
    };
    byId.set(workId,Object.freeze(job));
  }
  return [...byId.values()];
}

export function jobEvent(job, { state, shiftRootId, worldlineId }) {
  if (!['PROPOSED','ASSIGNED'].includes(state)) throw new Error('SHIFT_WORK_STATE_INVALID');
  if (!text(job?.principal_id) || !text(job?.work_item_id) || !Array.isArray(job?.evidence_refs)
    || !job.evidence_refs.some(acceptedUrl)) throw new Error('SOURCE_BACKED_JOB_REQUIRED');
  const eventId=uuid(['shift-work-state',job.principal_id,job.work_item_id,state]);
  const timestamp=new Date().toISOString();
  return Object.freeze({
    event_id:eventId,event_kind:'governance',entity_type:'shift_work_item',
    entity_id:uuid(['shift-work-item',job.principal_id,job.work_item_id]),
    continuity_root_id:shiftRootId,worldline_id:worldlineId,parent_event_id:null,
    effective_time:timestamp,assertion_time:timestamp,epistemic_status:'OBSERVED',
    payload: { principal_id:job.principal_id,state,work_item:job,
      source_evidence_refs:job.evidence_refs },
    evidence_refs:job.evidence_refs,
    provenance:{source:SHIFT_QUEUE_VERSION,source_candidate_id:job.source_candidate_id},
  });
}

/**
 * Stable, append-only state transitions. A 409 is accepted only after reading
 * back the exact matching canonical event. No authorization is written here.
 */
export async function persistShiftQueue({
  persistence, candidates=[], principalId, shiftRootId, worldlineId,
  existingEvents=[], hasExactAuthority,
} = {}) {
  if (!persistence?.appendEvent || !persistence?.reconstruct) throw new Error('SHIFT_QUEUE_PERSISTENCE_REQUIRED');
  if (!text(principalId) || !text(shiftRootId) || !text(worldlineId)
    || typeof hasExactAuthority !== 'function') throw new Error('SHIFT_QUEUE_AUTHORITY_CONTEXT_REQUIRED');
  const known=new Map((existingEvents || []).map(e=>[e.event_id,e]));
  const results=[];
  for (const job of candidates) {
    if (job.principal_id !== principalId) throw new Error('SHIFT_QUEUE_PRINCIPAL_MISMATCH');
    const approved=await hasExactAuthority(job);
    const state=approved===true ? 'ASSIGNED' : 'PROPOSED';
    const event=jobEvent(job,{state,shiftRootId,worldlineId});
    if (!known.has(event.event_id)) {
      try {
        await persistence.appendEvent(event);
      } catch (err) {
        if (!/409|23505|duplicate/i.test(String(err?.message||''))) throw err;
        const readback=await persistence.reconstruct({continuityRootId:shiftRootId,worldlineId});
        const existing=readback.find(x=>x.event_id===event.event_id);
        if (existing?.payload?.work_item?.work_item_id !== job.work_item_id ||
          existing?.payload?.principal_id !== principalId ||
          existing?.payload?.state !== state) throw new Error('SHIFT_QUEUE_CONFLICT_UNVERIFIED');
      }
      known.set(event.event_id,event);
    }
    results.push(Object.freeze({work_item_id:job.work_item_id,state,event_id:event.event_id}));
  }
  return Object.freeze({
    version:SHIFT_QUEUE_VERSION,
    candidates:candidates.length,
    assigned:results.filter(x=>x.state==='ASSIGNED').length,
    proposed:results.filter(x=>x.state==='PROPOSED').length,
    jobs:results,
  });
}