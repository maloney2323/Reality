// Read-only end-of-work projections over existing immutable Continuity receipts.
// Never infer a completed business job from a tracking issue or a shift tick.
export const COMPLETION_REPORT_VERSION='reality-completion-report-v0.1';
const ISSUE_URL=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/\d+$/;
const WORK_ID=/^work:[a-f0-9]{32}$/;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function projectPersonalCompletionReports({events=[],limit=12}={}){
 if(!Array.isArray(events))throw Error('COMPLETION_HISTORY_REQUIRED');
 const handoffs=new Map();
 const sorted=[...events].filter(e=>e&&typeof e==='object')
  .sort((a,b)=>String(a.assertion_time||'').localeCompare(String(b.assertion_time||'')));
 for(const event of sorted){
  if(event.entity_type!=='personal_discovered_work_handoff')continue;
  const p=event.payload||{};
  if(!WORK_ID.test(String(p.work_id||''))||
     p.work_item?.work_item_id!==p.work_id||
     p.work_item?.connector!=='github'||
     p.work_item?.operation!=='create_issue'||
     p.work_item?.inputs?.repository!=='maloney2323/Reality')continue;
  handoffs.set(p.work_id,{title:String(p.work_item?.inputs?.title||'Reality tracking issue').slice(0,200),
   work_key:String(p.work_key||''),evidence_count:Array.isArray(p.evidence_refs)?p.evidence_refs.length:0});
 }
 const used=new Set();
 const reports=[];
 for(const event of sorted.reverse()){
  if(event.entity_type!=='personal_issue_execution_outcome')continue;
  const p=event.payload||{};
  if(!WORK_ID.test(String(p.work_id||''))||
     !UUID.test(String(p.reservation_id||''))||
     !handoffs.has(p.work_id)||
     used.has(p.reservation_id))continue;
  used.add(p.reservation_id);
  const verified=event.epistemic_status==='VERIFIED'&&
   p.outcome_state==='VERIFIED_OUTCOME'&&
   p.independently_verified===true&&
   p.reservation_state==='VERIFIED'&&
   ISSUE_URL.test(String(p.provider_issue_url||''))&&
   String(event.event_id||'').length>0;
  const known=handoffs.get(p.work_id);
  reports.push({
   version:COMPLETION_REPORT_VERSION,type:'ACTION',work_id:p.work_id,
   status:verified?'ACTION_VERIFIED_JOB_OPEN':'OUTCOME_UNRESOLVED',
   headline:verified?'Reality finished this action: GitHub issue created':
    'Reality could not confirm this action finished',
   action:'Create one GitHub issue to track recurring workflow failures',
   title:known.title,
   action_completed:verified,full_job_completed:false,shift_completed:false,
   observed_at:event.assertion_time||null,
   completed_actions:verified?[
    'Created the approved GitHub tracking issue',
    'Independently verified the GitHub issue at execution',
    'Saved and read back the outcome in Continuity'
   ]:[],
   pending_work:['Investigate the failure','Repair the underlying cause',
    'Verify a successful post-repair workflow run'],
   verification:verified?'GITHUB_READBACK_AND_DURABLE_OUTCOME':'UNVERIFIED_NO_RETRY',
   source_evidence_count:known.evidence_count,
   issue_url:verified?p.provider_issue_url:null,
   issue_number:verified&&Number.isInteger(p.provider_issue_number)?
    p.provider_issue_number:null,
   receipt_id:String(event.event_id||''),
   reservation_id:p.reservation_id,
   measurement:{
    elapsed_seconds:null,manual_baseline_seconds:null,time_saved_seconds:null,
    execution_cost_usd:null,realized_cash_savings_usd:null
   },
   next_step:verified?'The tracking action is finished; the actual repair is still a separate job.':
    'Do not rerun this action. Inspect prior provider effects read-only.'
  });
  if(reports.length>=Math.min(Math.max(Number(limit)||12,1),30))break;
 }
 return reports;
}
export function projectShiftCycleCompletion({home}={}){
 if(!home||home.status!=='RECORDED'||typeof home.latest_tick_id!=='string'||
    !home.latest_tick_id.startsWith('shift:tick:'))return null;
 const c=home.latest_cycle;
 if(!c||c.tick_id!==home.latest_tick_id||
    !c.source_event_id||!Number.isSafeInteger(c.discovered_work_count)||
    c.discovered_work_count<0)return null;
 return {
  version:COMPLETION_REPORT_VERSION,type:'SHIFT_DISCOVERY_CYCLE',
  status:'DISCOVERY_CYCLE_RECORDED_SHIFT_NOT_VERIFIED_COMPLETE',
  headline:'Reality recorded this shift discovery cycle',
  action_completed:true,full_job_completed:false,shift_completed:false,
  observed_at:c.observed_at||home.latest_shift_at||null,
  tick_id:c.tick_id,source_receipt_id:c.source_event_id,
  phase:c.phase||'UNKNOWN',
  discovered_work_count:c.discovered_work_count,
  discovered_items:Array.isArray(c.discovered_items)?c.discovered_items.filter(x=>
   x&&typeof x.title==='string'&&x.status==='DISCOVERED_NOT_EXECUTED'
  ).slice(0,20).map(x=>({title:x.title,evidence_count:x.evidence_count,
   status:'DISCOVERED_NOT_EXECUTED'})):[],
  evidence_observation_count:Number.isSafeInteger(c.recent_observation_count)?
   c.recent_observation_count:null,
  verified_execution_count:0,
  completed_actions:['Saved a discovery-cycle result to the existing Continuity ledger'],
  pending_work:['Individual discovered jobs still need exact authorization and execution',
   'A full shift-close event and independently verified completed-job inventory are not established'],
  verification:'SHIFT_TICK_PERSISTED_READBACK_DISCOVERY_ONLY',
  measurement:{elapsed_seconds:null,manual_baseline_seconds:null,
   time_saved_seconds:null,execution_cost_usd:null,realized_cash_savings_usd:null},
  next_step:'Review findings and authorize eligible jobs individually. Do not treat this tick as a completed 1–8 hour shift.'
 };
}
