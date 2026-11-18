export const SHIFT_SETTLEMENT_VERSION='reality-governed-shift-settlement-v1';

const present = v=>typeof v==='string'&&v.trim().length>0;
const refs = v=>Array.isArray(v)&&v.some(present);

/**
 * A shift ends with per-job receipts and evidence, not the model's claim that
 * everything was handled. A blocked or never-authorized job stays unfinished.
 */
export function settleShift({shiftId,jobs=[],stageHistoryByJob={},valuation=null}={}) {
  if (!present(shiftId)||!Array.isArray(jobs)) throw new Error('SHIFT_SETTLEMENT_IDENTITY_REQUIRED');
  const outcomes=jobs.map(job=>{
    const history=stageHistoryByJob[job.work_item_id]||[];
    const relevant=history.filter(x=>x?.shift_id===shiftId &&
      x?.work_item_id===job.work_item_id &&
      x?.continuity_root_id===job.continuity_root_id);
    const receipt=relevant.findLast(x=>x.stage==='VERIFIED_COMPLETION');
    const detail=receipt?.detail||{};
    if (receipt&&present(detail.execution_id)&&present(detail.verification_id)&&refs(detail.evidence_refs)){
      return Object.freeze({
        work_item_id:job.work_item_id,continuity_root_id:job.continuity_root_id,
        state:'VERIFIED',execution_id:detail.execution_id,
        verification_id:detail.verification_id,evidence_refs:detail.evidence_refs,
        recovery_attempts:Math.max(0,Number(receipt.attempt||1)-1),
        independently_verified:true,
        reconciled_from_provider:detail.reconciled_from_provider===true,
      });
    }
    const last=relevant.at(-1);
    const stage=last?.stage||'NOT_ATTEMPTED';
    const attention=stage.includes('AUTHORIZATION')?'AWAITING_AUTHORIZATION':
      stage.includes('UNKNOWN')?'UNRESOLVED':
      stage==='EXECUTION_REQUESTED'||stage==='INSTALLATION_REQUESTED'?'UNRESOLVED':'BLOCKED';
    return Object.freeze({
      work_item_id:job.work_item_id,continuity_root_id:job.continuity_root_id,
      state:attention,last_stage:stage,independently_verified:false,
      recovery_attempts:Math.max(0,Number(last?.attempt||1)-1),
      evidence_refs:[],verification_id:null,
    });
  });
  const completed=outcomes.filter(o=>o.state==='VERIFIED').length;
  const status=outcomes.length>0&&completed===outcomes.length
    ? 'ALL_SELECTED_WORK_VERIFIED' : 'SHIFT_CLOSED_WITH_UNFINISHED_WORK';
  const financial={status:'NOT_MEASURED',currency:'USD',
    gross_labor_value:null,automation_cost:null,net_value:null,roi_percent:null,
    evidence_refs:[]};
  if (valuation&&Number.isFinite(valuation.baseline_manual_minutes)&&valuation.baseline_manual_minutes>=0
    && Number.isFinite(valuation.hourly_labor_rate_usd)&&valuation.hourly_labor_rate_usd>=0
    && Number.isFinite(valuation.actual_automation_cost_usd)&&valuation.actual_automation_cost_usd>=0
    && refs(valuation.evidence_refs)&&['MEASURED','ESTIMATED'].includes(valuation.baseline_kind)){
    const labor=valuation.baseline_manual_minutes/60*valuation.hourly_labor_rate_usd;
    const cost=valuation.actual_automation_cost_usd;
    financial.status=valuation.baseline_kind==='MEASURED'?'EVIDENCE_BACKED_MEASURED':'EVIDENCE_BACKED_ESTIMATE';
    financial.gross_labor_value=Math.round(labor*100)/100;
    financial.automation_cost=Math.round(cost*100)/100;
    financial.net_value=Math.round((labor-cost)*100)/100;
    financial.roi_percent=cost>0?Math.round((labor-cost)/cost*10000)/100:null;
    financial.evidence_refs=[...valuation.evidence_refs];
  }
  return Object.freeze({
    settlement_version:SHIFT_SETTLEMENT_VERSION,
    shift_id:shiftId,status,selected_count:outcomes.length,
    verified_count:completed,unfinished_count:outcomes.length-completed,
    repaired_and_resumed_count:outcomes.filter(x=>x.independently_verified&&x.recovery_attempts>0).length,
    independently_verified_count:completed,
    jobs:outcomes,
    financial,
    instruction_model_output_is_not_success:true,
  });
}