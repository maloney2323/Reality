import crypto from 'node:crypto';

export const WORK_DISCOVERY_FOUNDATION_VERSION = 'reality-work-discovery-foundation-v1.0';

export const WORK_KINDS = Object.freeze([
  'REVENUE_OPPORTUNITY','CUSTOMER_COMMITMENT','RECURRING_OPERATION',
  'FOLLOW_UP','CAPABILITY_BUILD','RISK_REDUCTION','SYSTEM_MAINTENANCE'
]);

export const WORK_STATES = Object.freeze([
  'DISCOVERED','EVIDENCE_NEEDED','QUALIFIED','PROPOSED','AUTHORIZED',
  'IN_PROGRESS','AWAITING_VERIFICATION','COMPLETED','REJECTED','EXPIRED'
]);

function stable(v){
  if(v===null||typeof v!=='object') return v;
  if(Array.isArray(v)) return v.map(stable);
  return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
}
function digest(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function text(v){return typeof v==='string'?v.trim():'';}
function list(v){return Array.isArray(v)?v.filter(Boolean):[];}
function number(v){return Number.isFinite(Number(v))?Number(v):null;}

export function discoverWork({
  observations=[],
  existingWork=[],
  now=new Date().toISOString(),
  recurrenceWindowDays=45,
  minimumRecurrences=2,
}= {}){
  const candidates=new Map();

  for(const o of list(observations)){
    const key=text(o.work_key||o.task_key||o.commitment_key||o.opportunity_key);
    if(!key) continue;
    const arr=candidates.get(key)||[];
    arr.push(o);
    candidates.set(key,arr);
  }

  const existing=new Set(list(existingWork).map(w=>text(w.work_key||w.id)).filter(Boolean));
  const discovered=[];

  for(const [workKey,items] of candidates){
    if(existing.has(workKey)) continue;
    const dates=items.map(x=>Date.parse(x.occurred_at||x.effective_time||x.created_at)).filter(Number.isFinite).sort();
    const recurring=items.length>=minimumRecurrences;
    const gaps=[];
    for(let i=1;i<dates.length;i++) gaps.push((dates[i]-dates[i-1])/86400000);
    const cadenceDays=gaps.length?gaps.reduce((a,b)=>a+b,0)/gaps.length:null;
    const withinWindow=!dates.length || (Date.now()-dates[dates.length-1] <= recurrenceWindowDays*86400000);

    const revenue=items.map(x=>number(x.revenue||x.expected_revenue||x.value)).filter(v=>v!==null);
    const expectedRevenue=revenue.length?revenue.reduce((a,b)=>a+b,0)/revenue.length:null;
    const evidenceRefs=items.flatMap(x=>list(x.evidence_refs||x.evidence_references||[x.evidence_ref])).filter(Boolean);
    const sourceKinds=items.map(x=>text(x.kind)).filter(k=>WORK_KINDS.includes(k));
    const kind=sourceKinds.includes('REVENUE_OPPORTUNITY')||items.some(x=>x.revenue||x.expected_revenue)
      ? 'REVENUE_OPPORTUNITY'
      : sourceKinds.includes('SYSTEM_MAINTENANCE') ? 'SYSTEM_MAINTENANCE'
      : sourceKinds.includes('CUSTOMER_COMMITMENT') ? 'CUSTOMER_COMMITMENT'
      : sourceKinds.includes('RECURRING_OPERATION')||items.some(x=>x.recurring_work) ? 'RECURRING_OPERATION'
      : sourceKinds.includes('RISK_REDUCTION') ? 'RISK_REDUCTION'
      : sourceKinds.includes('CAPABILITY_BUILD') ? 'CAPABILITY_BUILD'
      : 'FOLLOW_UP';

    discovered.push({
      work_id:'work:'+digest([workKey,items.map(x=>x.id||x.observation_id||null)]).slice(0,32),
      work_key:workKey,
      foundation_version:WORK_DISCOVERY_FOUNDATION_VERSION,
      kind,
      state:evidenceRefs.length?'DISCOVERED':'EVIDENCE_NEEDED',
      recurring,
      recurrence_count:items.length,
      cadence_days:cadenceDays,
      cadence_confidence:recurring&&withinWindow?'SUPPORTED':'INSUFFICIENT_EVIDENCE',
      expected_revenue:expectedRevenue,
      revenue_evidence_backed:revenue.length>0,
      evidence_refs:[...new Set(evidenceRefs)],
      source_observation_ids:items.map(x=>x.observation_id||x.id).filter(Boolean),
      last_observed_at:dates.length?new Date(dates[dates.length-1]).toISOString():null,
      next_due_at:cadenceDays&&dates.length?new Date(dates[dates.length-1]+cadenceDays*86400000).toISOString():null,
      objective:text(items[items.length-1].objective||items[items.length-1].action||workKey),
      authority:'NONE_UNLESS_EXPLICITLY_ESTABLISHED',
      authorization_required:false,
      external_effects_permitted:false,
      discovered_at:now,
    });
  }

  return discovered.sort((a,b)=>(b.expected_revenue||0)-(a.expected_revenue||0));
}

export function qualifyWorkCandidate(work,{evidenceRequired=true,minRevenue=0}={}){
  if(!work?.work_id) throw new Error('WORK_CANDIDATE_REQUIRED');
  const evidenceOk=!evidenceRequired||work.evidence_refs?.length>0;
  const recurringOk=work.recurring===true||work.kind!=='RECURRING_OPERATION';
  const revenueOk=work.expected_revenue===null||work.expected_revenue>=minRevenue;
  const qualified=evidenceOk&&recurringOk&&revenueOk;
  return Object.freeze({...work,state:qualified?'QUALIFIED':'EVIDENCE_NEEDED',
    qualification:{evidence_ok:evidenceOk,recurrence_ok:recurringOk,revenue_ok:revenueOk},
    authority:'NONE_UNLESS_EXPLICITLY_ESTABLISHED'});
}

export function rankWorkForMoney(work,{riskWeight=1,recurrenceWeight=1,revenueWeight=1}={}){
  if(!work?.work_id) throw new Error('WORK_CANDIDATE_REQUIRED');
  const revenue=work.expected_revenue||0;
  const recurrence=work.recurring?Math.min(work.recurrence_count/5,1):0;
  const riskPenalty=work.risk==='HIGH'?riskWeight:0;
  const score=(revenue*revenueWeight)+(recurrence*50*recurrenceWeight)-riskPenalty;
  return Object.freeze({...work,money_priority_score:score});
}

export function createRecurringWorkTemplate(work,{owner='UNASSIGNED',successConditions=[]}={}){
  if(!work?.work_id) throw new Error('WORK_CANDIDATE_REQUIRED');
  if(work.recurring!==true) throw new Error('RECURRING_PATTERN_NOT_ESTABLISHED');
  return Object.freeze({
    template_id:'recurring:'+digest(work.work_id).slice(0,32),
    source_work_id:work.work_id,
    work_key:work.work_key,
    cadence_days:work.cadence_days,
    owner,
    success_conditions:list(successConditions),
    state:'PROPOSED',
    authority:'NONE_UNLESS_EXPLICITLY_ESTABLISHED',
    expected_revenue:work.expected_revenue,
    evidence_refs:work.evidence_refs,
  });
}
