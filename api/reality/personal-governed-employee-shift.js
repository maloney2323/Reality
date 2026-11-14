// Owner-authenticated exact-job shift creation and independent completion.
// Legacy hour planning is not a deadline for completion-bound warrants.
// First approval authorizes source checks, NOT arbitrary new original jobs or
// installs. Exact upgrades are presented in EXISTING Reality Chat.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {buildRealityWorkCatalog} from '../../src/reality-work-catalog-v0.1.js';
import {buildRealityWorkdayOpportunityBrief} from '../../src/reality-workday-opportunity-brief-v1.js';
import {assessRealityWorkdayTeam,routeRealityWorkCategoriesToEmployees} from '../../src/reality-workday-team-assessment-v1.js';
import {buildRealityEightHourShiftDraft} from '../../src/reality-eight-hour-shift-plan-v1.js';
import {buildRileyTaylorCombinedWorkOrders} from '../../src/reality-riley-taylor-combined-work-orders-v1.js';
import {computeShiftFingerprint,shiftDatabase,shiftRpc,
 assertShiftReceipt,assertShiftReadback}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {findEmployeeShiftCapabilityHandoffs}
 from '../../src/reality-employee-shift-capability-handoff-v1.js';
import {buildRealityShiftConversationBrief}
 from '../../src/reality-shift-conversation-brief-v1.js';
import {reconcileRealityMixedShiftReceipts}
 from '../../src/reality-mixed-shift-receipts-v1.js';
import {projectRealityAutomaticShiftSupervisor}
 from '../../src/reality-automatic-shift-supervisor-v1.js';
import {projectRealityExistingShiftIntegratedIntake}
 from '../../src/reality-existing-shift-integrated-intake-v1.js';
import {assertRealityUnifiedShiftGraph}
 from '../../src/reality-shift-unified-execution-controller-v1.js';
import {assessRealityNativeBatchReadiness}
 from '../../src/reality-riley-native-batch-readiness-v1.js';
import {diagnoseRealityEmployeeRecovery}
 from '../../src/reality-employee-recovery-route-v1.js';
import {projectRileyExistingBacklog}
 from '../../src/reality-riley-existing-backlog-v1.js';
export const maxDuration=60;
// An owner-authorized shift must begin with the work Reality already knows.
// These are read-only source priorities; no issue, legacy queue or model
// proposal is an original-job admission or installation approval.
export async function ownerExistingRileySourcePriority({catalog,brief,ownerId,db,
 call=shiftRpc}={}){
 if(!UUID.test(ownerId||'')||!Array.isArray(catalog?.items)||
  !Array.isArray(brief?.items))
  throw Error('SHIFT_OWNER_BACKLOG_INPUT_UNVERIFIED');
 const issues=[],seen=new Set();
 for(const finding of catalog.items){
  if(finding?.finding_type!=='OPEN_ISSUE'||finding.source!=='github_issues')
   continue;
  const m=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9]\d{0,6})$/.exec(
   String(finding.evidence_refs?.[0]||''));
  if(!m||seen.has(Number(m[1])))continue;
  seen.add(Number(m[1]));
  issues.push({number:Number(m[1]),state:'open',
   html_url:finding.evidence_refs[0],
   title:String(finding.title||'').slice(0,210)});
  if(issues.length===30)break;
 }
 if(!issues.length)return Object.freeze({
  refs:[],ranked:0,source_coverage_complete:false});
 const loop=await call(db,'reality_read_owner_genuine_loop_v1',
  {p_owner_id:ownerId});
 const prior=await Promise.all(issues.map(async x=>({
  issue_number:x.number,
  record:await call(db,'reality_read_owner_existing_original_issue_v1',{
   p_owner_id:ownerId,p_issue_number:x.number})
 })));
 const reconciled=projectRileyExistingBacklog({
  issues,ownerLoop:loop,priorOriginals:prior,
  coverageComplete:catalog.source_scans?.issues?.query_scope_fully_reconciled===true&&
   seen.size===issues.length,
  activeShiftCount:0
 });
 const candidateURLs=new Set(brief.items.flatMap(x=>
  x.finding_type==='OPEN_ISSUE'?x.evidence_refs.slice(0,1):[]));
 const refs=reconciled.rows.filter(row=>
  ['OPEN_SOURCE_WORK_AWAITING_ORIGINAL_JOB_QUALIFICATION',
   'EXISTING_CAPABILITY_JOB_REQUIRES_LIVE_AUTHORITY_GATE'].includes(row.status)&&
  candidateURLs.has(row.source_url)).map(row=>row.source_url);
 return Object.freeze({refs,ranked:reconciled.rows.length,
  source_coverage_complete:reconciled.source_coverage_complete});
}

// Never offer a previously independently settled owner's original-job
// source as a fresh source assignment simply to fill a four-slot work plan.
// These receipts are CURRENT owner-scoped service-role DB readbacks, not
// old UI strings, model advice or an inference from an issue being open.
export async function ownerSettledOriginalSourceRefs({ownerId,db,call=shiftRpc}={}){
 if(!UUID.test(ownerId||''))throw Error('SHIFT_OWNER_SETTLED_SCOPE_UNVERIFIED');
 const [reviews,triage,native]=await Promise.all([
  call(db,'reality_read_owner_riley_pr_review_v1',{p_owner_id:ownerId}),
  call(db,'reality_read_owner_shift_failure_triage_143_v1',{p_owner_id:ownerId}),
  call(db,'reality_read_owner_riley_repair_original_v1',{p_owner_id:ownerId})
 ]);
 if(reviews?.status!=='OWNER_PR_REVIEW_ORIGINAL_READBACK'||
    reviews.production_changed!==false||
    !Array.isArray(reviews.jobs)||reviews.jobs.length>10||
    triage?.status!=='OWNER_SCOPED_VERIFIED_SHIFT_FAILURE_TRIAGE'||
    triage.production_changed!==false||
    !Array.isArray(triage.jobs)||triage.jobs.length>5||
    native?.status!=='OWNER_SCOPED_UNATTENDED_REPAIR_ORIGINAL_READBACK'||
    native.production_changed!==false||
    native.does_not_authorize_new_work!==true||
    !Array.isArray(native.jobs)||native.jobs.length>6)
  throw Error('SHIFT_OWNER_SETTLED_ORIGINAL_RECEIPT_READBACK_UNVERIFIED');
 const refs=new Set();
 for(const [kind,data] of [['PR_REVIEW',reviews.jobs],['FAILURE_TRIAGE',triage.jobs]]){
  for(const j of data){
   if(j?.phase!=='SETTLED')continue;
   const source=String(j.source_ref||'');
   const receipt=String(j.settlement_receipt_ref||'');
   if(j.original_job_completed!==true||
      !/^work:[a-f0-9]{32}$/.test(j.original_work_id||'')||
      (kind==='PR_REVIEW'?
       !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(source)||
       !/^supabase:riley_pr_review_originals_v1:[a-f0-9-]{36}$/.test(receipt):
       source!=='https://github.com/maloney2323/Reality/issues/143'||
       !/^supabase:riley_shift_failure_triage_v1:[a-f0-9-]{36}$/.test(receipt))
   )throw Error('SHIFT_SETTLED_JOB_INDEPENDENT_RECEIPT_INVALID');
   refs.add(source);
  }
 }
 // Native engineering receipts are distinct from older Universe capability
 // receipts. A GitHub issue can remain OPEN even after Reality independently
 // installed, verified and settled the exact original repair. Never schedule it
 // again merely to fill a new employee shift.
 for(const j of native.jobs){
  if(j.phase!=='SETTLED')continue;
  if(j.original_job_completed!==true||
     j.code_repair_completed!==true||
     j.production_changed!==false||
     !/^work:[a-f0-9]{32}$/.test(j.original_work_id||'')||
     j.source_ref!=='https://github.com/maloney2323/Reality/issues/263'||
     !/^sha256:[a-f0-9]{64}$/.test(j.source_proof_sha256||'')||
     !/^supabase:riley_native_independent_final_receipts_v1:[a-f0-9-]{36}$/i.test(
      j.original_settlement_receipt_ref||''))
   throw Error('SHIFT_NATIVE_SETTLED_ORIGINAL_RECEIPT_UNVERIFIED');
  refs.add(j.source_ref);
 }
 return Object.freeze([...refs].sort());
}

const SHA=/^sha256:[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(!['GET','POST'].includes(req.method))
  return res.status(405).setHeader('Allow','GET, POST').json({ok:false,error:'SHIFT_METHOD_DENIED'});
 // Only the duration selector is accepted; owner and scope remain derived
 // from the signed-in session. Draft lookup is read-only.
 const queryKeys=Object.keys(req.query||{});
 if(queryKeys.some(k=>k!=='hours')||queryKeys.length>1)
  return res.status(400).json({ok:false,error:'SHIFT_CLIENT_SCOPE_REJECTED'});
 if(req.method==='POST'&&queryKeys.length)
  return res.status(400).json({ok:false,error:'SHIFT_CLIENT_SCOPE_REJECTED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'SHIFT_SIGN_IN_REQUIRED'});
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url)
   return res.status(403).json({ok:false,error:'SHIFT_OWNER_PROJECT_MISMATCH'});
  if(req.method==='GET'){
   const hours=req.query?.hours===undefined?null:Number(req.query.hours);
   if(hours!==null&&(!Number.isSafeInteger(hours)||hours<1||hours>12))
    return res.status(400).json({ok:false,error:'SHIFT_DURATION_NOT_SUPPORTED'});
   const read=assertShiftReadback(await shiftRpc(db,'reality_read_owner_employee_shifts_v1',
    {p_owner_id:session.user_id}));
   let handoffs=[],handoff_status='NO_VERIFIED_SHIFT_BOUND_CAPABILITY_REQUEST';
   const active=read.shifts.some(s=>['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(s.status)&&
       (s.planned_end_at==='infinity'||(
        Number.isFinite(Date.parse(s.planned_end_at))&&
        Date.parse(s.planned_end_at)>Date.now())));
   if(active){
    try{
     const [qualified,loop]=await Promise.all([
      shiftRpc(db,'reality_read_owner_qualified_capabilities_v1',
       {p_owner_id:session.user_id}),
      shiftRpc(db,'reality_read_owner_genuine_loop_v1',
       {p_owner_id:session.user_id})]);
     handoffs=findEmployeeShiftCapabilityHandoffs({
      ownerShifts:read.shifts,qualified,loop});
     if(handoffs.length)handoff_status='EXACT_CAPABILITY_APPROVAL_REQUESTED_IN_CHAT';
    }catch{handoff_status='EXACT_CAPABILITY_READBACK_UNAVAILABLE_FAIL_CLOSED';}
   }
   let riley_pr_review_jobs={
    status:'OWNER_PR_REVIEW_READBACK_UNAVAILABLE',jobs:[],
    production_changed:false,verified_human_hours_saved:null
   };
   try{
    const verified=await shiftRpc(db,'reality_read_owner_riley_pr_review_v1',
      {p_owner_id:session.user_id});
    if(verified?.status==='OWNER_PR_REVIEW_ORIGINAL_READBACK'&&
      verified.production_changed===false&&
      verified.verified_human_hours_saved===null&&
      Array.isArray(verified.jobs)&&verified.jobs.length<=10&&
      verified.jobs.every(j=>j.source_review_job_only===true&&
        j.installation_authorized===false&&j.production_changed===false&&
        /^work:[a-f0-9]{32}$/.test(j.original_work_id||'')&&
        /^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(j.source_ref||'')&&
        (j.phase!=='SETTLED'||(
          j.original_job_completed===true&&
          /^supabase:riley_pr_review_originals_v1:[a-f0-9-]{36}$/.test(
            j.settlement_receipt_ref||'')&&
          /^https:\/\/github\.com\/maloney2323\/Reality\/(?:pull|issues)\/[1-9]\d*#issuecomment-\d+$/.test(
            j.provider_comment_url||'')
        ))))
     riley_pr_review_jobs=verified;
   }catch{/* Never represent missing durable original receipt as settlement. */}
   let riley_failure_triage_jobs={status:'OWNER_TRIAGE_READBACK_UNAVAILABLE',jobs:[]};
   let riley_code_repair_jobs={status:'OWNER_REPAIR_READBACK_UNAVAILABLE',jobs:[]};
   try{
    const x=await shiftRpc(db,'reality_read_owner_shift_failure_triage_143_v1',
     {p_owner_id:session.user_id});
    if(x?.status==='OWNER_SCOPED_VERIFIED_SHIFT_FAILURE_TRIAGE'&&
       x.installation_authorized===false&&x.production_changed===false&&
       Array.isArray(x.jobs)&&x.jobs.length<=5&&
       x.jobs.every(j=>j.code_repair_completed===false&&
         j.production_changed===false&&
         j.source_ref==='https://github.com/maloney2323/Reality/issues/143'&&
         /^work:[a-f0-9]{32}$/.test(j.original_work_id||'')&&
         (j.phase!=='SETTLED'||(
           j.original_job_completed===true&&
           /^supabase:riley_shift_failure_triage_v1:[a-f0-9-]{36}$/.test(
            j.settlement_receipt_ref||'')&&
           /^https:\/\/github\.com\/maloney2323\/Reality\/issues\/143#issuecomment-\d+$/.test(
            j.provider_comment_url||'')
         ))))
      riley_failure_triage_jobs=x;
   }catch{/* Explicit no independent disposition readback. */}
   try{
    const x=await shiftRpc(db,'reality_read_owner_riley_repair_original_v1',
     {p_owner_id:session.user_id});
    if(x?.status==='OWNER_SCOPED_UNATTENDED_REPAIR_ORIGINAL_READBACK'&&
       x.does_not_authorize_new_work===true&&
       x.production_changed===false&&
       Array.isArray(x.jobs)&&x.jobs.length<=6&&
       x.jobs.every(j=>
        j.source_ref==='https://github.com/maloney2323/Reality/issues/263'&&
        /^work:[a-f0-9]{32}$/.test(j.original_work_id||'')&&
        /^sha256:[a-f0-9]{64}$/.test(j.source_proof_sha256||'')&&
        j.production_changed===false&&
        (j.phase!=='SETTLED'||(
         j.original_job_completed===true&&
         /^supabase:[a-z0-9_]+:[a-f0-9-]{36}$/.test(
          j.original_settlement_receipt_ref||'')
        ))))
      riley_code_repair_jobs=x;
   }catch{/* Do not mistake missing readback for completed repair. */}
   // Owner-scoped database records distinguish permission from work:
   // authorization, actual server pulse, step claim, verification and receipt.
   let shift_activity=null,shift_activity_status='NO_SHIFT_ACTIVITY_YET';
   const chosen=read.shifts.find(s=>
    ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(s.status)&&
     (s.planned_end_at==='infinity'||(
      Number.isFinite(Date.parse(s.planned_end_at))&&
      Date.parse(s.planned_end_at)>Date.now())))||read.shifts[0];
   if(chosen){
    try{
     const activity=await shiftRpc(db,'reality_read_owner_shift_live_activity_v1',{
      p_owner_id:session.user_id,p_shift_id:chosen.shift_id});
     if(activity?.status==='OWNER_SHIFT_LIVE_ACTIVITY_INDEPENDENT_READBACK'&&
        activity.shift_id===chosen.shift_id&&
        activity.owner_bound===true&&activity.installation_authorized===false&&
        activity.production_changed===false&&
        activity.original_job_completed_by_readback===false&&
        Array.isArray(activity.source_events)&&activity.source_events.length<=20&&
        Array.isArray(activity.original_jobs)&&activity.original_jobs.length<=20){
      shift_activity=activity;shift_activity_status='VERIFIED_OWNER_ACTIVITY';
     }else shift_activity_status='ACTIVITY_READBACK_SCOPE_UNVERIFIED';
    }catch{shift_activity_status='ACTIVITY_READBACK_UNAVAILABLE';}
   }
   // One independently checked execution graph is shared by the worker
   // and signed-in owner Chat. Source-native and Universe originals have
   // the SAME owner/shift/source identity; no synthetic job or authority.
   let verifiedGraphForTriage=null;
   let shift_execution_graph=null;
   let shift_execution_graph_status='NO_CURRENT_EXECUTION_GRAPH';
   if(chosen?.planned_end_at==='infinity'&&
      ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(chosen.status)){
    try{
     const graph=assertRealityUnifiedShiftGraph(await shiftRpc(db,
      'reality_read_owner_shift_execution_graph_v1',{
       p_owner_id:session.user_id,p_shift_id:chosen.shift_id
      }),{expectedShiftId:chosen.shift_id});
     if(graph.status==='UNIFIED_OWNER_JOB_CONTROL_READY'&&
        graph.owner_id===session.user_id&&graph.jobs.length<=4){
      verifiedGraphForTriage=graph;
      shift_execution_graph={
       status:graph.status,shift_id:graph.shift_id,
       owner_id:graph.owner_id,plan_fingerprint:graph.plan_fingerprint,
       next_action:graph.next_action,
       jobs:graph.jobs.map(x=>({
        source_step_index:x.source_step_index,
        source_ref:x.source_ref,original_kind:x.original_kind,
        original_work_id:x.original_work_id,phase:x.phase,
        source_proof_sha256:x.source_proof_sha256,
        independent_source_proof_verified:x.independent_source_proof_verified,
        next_governed_action:x.next_governed_action
       })),
       installation_authorized:false,original_job_completed:false,
       production_changed:false
      };
      shift_execution_graph_status='VERIFIED_CURRENT_OWNER_EXECUTION';
     }else shift_execution_graph_status='EXECUTION_GRAPH_READBACK_UNVERIFIED';
    }catch{shift_execution_graph_status='EXECUTION_GRAPH_READBACK_UNAVAILABLE';}
   }
   // Exact reviewed source patch is owner-private informational evidence;
   // it is NOT a verified autonomous upgrade nor permission to install.
   let riley_native_reviewed_patch=null;
   let riley_native_reviewed_patch_status='NO_NATIVE_PATCH_REVIEW';
   if(shift_execution_graph_status==='VERIFIED_CURRENT_OWNER_EXECUTION'){
    try{
     const patch=await shiftRpc(db,'reality_read_owner_native_reviewed_patch_v1',{
      p_owner_id:session.user_id,p_shift_id:chosen.shift_id});
     if(patch?.status==='EXACT_NATIVE_ENGINEERING_PATCH_INDEPENDENTLY_TESTED_REVIEW_ONLY'&&
        patch.owner_id===session.user_id&&
        patch.shift_id===chosen.shift_id&&
        /^work:[a-f0-9]{32}$/.test(patch.original_work_id||'')&&
        /^sha256:[a-f0-9]{64}$/.test(patch.candidate_artifact_sha256||'')&&
        /^[a-f0-9]{40}$/.test(patch.candidate_commit_sha||'')&&
        Number.isSafeInteger(patch.independent_passing_run_id)&&
        patch.independent_passing_run_id>10000&&
        patch.provenance==='CHATGPT_REVIEWED_ENGINEERING_PATCH_AFTER_REJECTED_MODEL_DRAFT'&&
        patch.owner_approval_ready===false&&
        patch.native_install_to_settlement_accepted===false&&
        patch.installation_authorized===false&&
        patch.original_job_completed===false&&
        patch.production_changed===false&&
        shift_execution_graph.jobs.some(j=>j.original_work_id===patch.original_work_id)){
      riley_native_reviewed_patch={
       status:patch.status,original_work_id:patch.original_work_id,
       shift_id:patch.shift_id,owner_id:patch.owner_id,
       source_ref:patch.source_ref,
       source_proof_sha256:patch.source_proof_sha256,
       native_install_to_settlement_accepted:false,
       candidate_commit_sha:patch.candidate_commit_sha,
       candidate_artifact_sha256:patch.candidate_artifact_sha256,
       independent_passing_run_id:patch.independent_passing_run_id,
       provenance:patch.provenance,owner_approval_ready:false,
       installation_authorized:false,original_job_completed:false,
       production_changed:false
      };
      riley_native_reviewed_patch_status='VERIFIED_OWNER_SOURCE_PATCH_NOT_INSTALLABLE';
     }else if(patch?.status==='NO_CURRENT_OWNER_NATIVE_REVIEWED_PATCH')
      riley_native_reviewed_patch_status='NO_OWNER_TESTED_PATCH_YET';
     else riley_native_reviewed_patch_status='NATIVE_PATCH_READBACK_UNVERIFIED';
    }catch{riley_native_reviewed_patch_status='NATIVE_PATCH_READBACK_UNAVAILABLE';}
   }
   // No new authorization or installation can be inferred from a test run.
   // The exact owner graph and artifact are evaluated together with the
   // PREVIEW-only provider setup; unresolved execution gates stay closed.
   let riley_native_batch_readiness=null;
   if(shift_execution_graph_status==='VERIFIED_CURRENT_OWNER_EXECUTION'){
    try{
     riley_native_batch_readiness=assessRealityNativeBatchReadiness({
      graph:shift_execution_graph,reviewedPatch:riley_native_reviewed_patch,
      env:process.env,expectedProject:db.project
     });
    }catch{
     riley_native_batch_readiness={
      status:'NATIVE_BATCH_READINESS_UNVERIFIED',
      ready_for_new_install_approval:false,
      new_shift_required:false,installation_authorized:false,
      original_job_completed:false,production_changed:false,
      blockers:['OWNER_SOURCE_OR_ARTIFACT_READBACK_UNVERIFIED']
     };
    }
   }
   // Show only a service-read, owner-matched receipt from the exact active
   // shift. This is proof of a real read-only OpenAI->Reality tool call,
   // NOT native original execution, installation or final settlement.
   let riley_native_model_tool_proof={
    status:'NATIVE_MODEL_TOOL_OWNER_READBACK_UNAVAILABLE',
    model_tool_readback_verified:false,installation_authorized:false,
    original_job_completed:false,production_changed:false
   };
   if(shift_execution_graph_status==='VERIFIED_CURRENT_OWNER_EXECUTION'){
    try{
     const proof=await shiftRpc(db,
      'reality_read_owner_native_readonly_tool_proof_v1',{
       p_owner_id:session.user_id,p_shift_id:chosen.shift_id});
     if(proof?.status==='OWNER_NATIVE_MODEL_TOOL_INDEPENDENT_READBACK_VERIFIED'&&
       proof.shift_id===chosen.shift_id&&
       proof.original_work_id===shift_execution_graph.jobs.find(x=>
        x.source_ref==='https://github.com/maloney2323/Reality/issues/263')
        ?.original_work_id&&
       proof.model_tool_readback_verified===true&&
       proof.tool_scope==='READ_ONLY_CURRENT_ORIGINAL_EVIDENCE'&&
       /^sha256:[a-f0-9]{64}$/.test(proof.tool_readback_sha256||'')&&
       Number.isSafeInteger(proof.model_call_count)&&
       proof.model_call_count>=1&&proof.model_call_count<=3&&
       Number.isFinite(Date.parse(proof.verified_at))&&
       proof.installation_authorized===false&&
       proof.original_job_completed===false&&
       proof.production_changed===false)
      riley_native_model_tool_proof=proof;
     else if(proof?.model_tool_readback_verified===false&&
        proof.installation_authorized===false&&
        proof.original_job_completed===false&&
        proof.production_changed===false)
      riley_native_model_tool_proof=proof;
    }catch{/* Never invent a missing model/tool receipt. */}
   }
   // Existing signed-in owner: independently read finalized source-native
   // originals without reopening their DB claims or changing shift authority.
   let shift_source_native_receipts=null;
   let shift_source_native_receipts_status='NO_OWNER_SOURCE_NATIVE_RECEIPT_COVERAGE';
   const activeBrief=read.shifts[0];
   if(activeBrief?.planned_end_at==='infinity'&&
      Array.isArray(activeBrief.steps)&&activeBrief.steps.length===8&&
      activeBrief.steps.slice(1,5).every(x=>
       /^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull)\/[1-9]\d*$/.test(
        x.source_ref||''))){
    try{
     shift_source_native_receipts=reconcileRealityMixedShiftReceipts(activeBrief,{
      prReadback:riley_pr_review_jobs.status==='OWNER_PR_REVIEW_ORIGINAL_READBACK'?
       riley_pr_review_jobs:null,
      repairReadback:riley_code_repair_jobs.status===
       'OWNER_SCOPED_UNATTENDED_REPAIR_ORIGINAL_READBACK'?
       riley_code_repair_jobs:null
     });
     shift_source_native_receipts_status='OWNER_SOURCE_NATIVE_RECEIPTS_RECONCILED_READ_ONLY';
    }catch{
     shift_source_native_receipts=null;
     shift_source_native_receipts_status='SOURCE_NATIVE_RECEIPT_BINDING_UNVERIFIED';
    }
   }
   // Automatically classify all frozen authorized sources at each owner
   // readback; verified original-job receipts take precedence over GitHub
   // OPEN status or an old, generic execution queue.
   let shift_automatic_supervisor=null;
   let shift_automatic_supervisor_status='NO_VERIFIED_OWNER_SOURCE_TRIAGE';
   if(verifiedGraphForTriage&&shift_source_native_receipts){
    try{
     shift_automatic_supervisor=projectRealityAutomaticShiftSupervisor(
      verifiedGraphForTriage,shift_source_native_receipts);
     shift_automatic_supervisor_status=
      'EXACT_OWNER_SOURCE_TRIAGE_READ_ONLY_VERIFIED';
    }catch{
     shift_automatic_supervisor_status=
      'EXACT_OWNER_SOURCE_TRIAGE_READBACK_UNVERIFIED';
    }
   }
   // The Chat/employee UI can read the SAME unified work inventory that
   // the trusted scheduled worker checks; observations are not executable jobs.
   let shift_integrated_work_intake=null;
   let shift_integrated_work_intake_status='NO_VERIFIED_CURRENT_SHIFT_INTAKE';
   if(verifiedGraphForTriage&&shift_automatic_supervisor){
    try{
     const [weekly,capabilities]=await Promise.all([
      shiftRpc(db,'reality_read_owner_shift_weekly_backlog_v1',{
       p_owner_id:session.user_id,
       p_shift_id:verifiedGraphForTriage.shift_id}),
      shiftRpc(db,'reality_read_owner_capability_gap_feed_v1',{
       p_owner_id:session.user_id})
     ]);
     shift_integrated_work_intake=projectRealityExistingShiftIntegratedIntake({
      graph:verifiedGraphForTriage,
      supervisor:shift_automatic_supervisor,
      weekly,capabilityFeed:capabilities});
     shift_integrated_work_intake_status=
      'WEEKLY_AND_HOMEPAGE_INTAKE_OWNER_RECONCILED';
    }catch{
     shift_integrated_work_intake_status=
      'WEEKLY_AND_HOMEPAGE_INTAKE_NOT_YET_VERIFIED';
    }
   }
   const shift_briefing=buildRealityShiftConversationBrief(
    read.shifts,handoffs,new Date(),shift_source_native_receipts);
   const recovery_diagnosis=diagnoseRealityEmployeeRecovery({shifts:read.shifts,handoffs});
   let draft=null;
   if(hours!==null){
     const catalog=await buildRealityWorkCatalog();
     const brief=buildRealityWorkdayOpportunityBrief(catalog);
     const priority=await ownerExistingRileySourcePriority({
      catalog,brief,ownerId:session.user_id,db});
     const settledRefs=await ownerSettledOriginalSourceRefs({
      ownerId:session.user_id,db});
     const plan=buildRealityEightHourShiftDraft(brief,{
      durationHours:hours,prioritySourceRefs:priority.refs,
      excludedSettledSourceRefs:settledRefs});
     const fingerprint=computeShiftFingerprint(plan);
     const combined=buildRileyTaylorCombinedWorkOrders({plan,fingerprint});
     draft={...plan,expected_fingerprint:fingerprint,
       combined_employee_work_orders:combined,
       proposed_team:assessRealityWorkdayTeam(brief),
       employee_category_assignments:routeRealityWorkCategoriesToEmployees(brief),
       existing_owner_backlog_priorities:priority.refs,
       owner_backlog_issue_records_reconciled:priority.ranked,
       owner_backlog_coverage_complete:priority.source_coverage_complete,
       previously_settled_original_source_refs_excluded:settledRefs};
   }
   return res.status(200).json({ok:true,...read,shift_briefing,
    shift_activity,shift_activity_status,
    shift_source_native_receipts,shift_source_native_receipts_status,
    shift_automatic_supervisor,shift_automatic_supervisor_status,
    shift_integrated_work_intake,shift_integrated_work_intake_status,
    shift_execution_graph,shift_execution_graph_status,
    riley_native_reviewed_patch,riley_native_reviewed_patch_status,
    riley_native_batch_readiness,riley_native_model_tool_proof,
    requested_shift_draft:draft,
    recovery_diagnosis,
    riley_pr_review_jobs,riley_failure_triage_jobs,riley_code_repair_jobs,
    capability_approval_handoffs:handoffs,handoff_status,
    job_started_by_read:false,
    shift_approval_does_not_authorize_installation:true,
    existing_chat_approval_required:true});
  }
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'SHIFT_SAME_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'SHIFT_JSON_REQUIRED'});
  const b=req.body||{},keys=Object.keys(b);
  if(!b||typeof b!=='object'||Array.isArray(b)||
   ![3,4,5].includes(keys.length)||
   keys.some(x=>!['action','expected_fingerprint','planned_start_at',
     'requested_hours','completion_bound'].includes(x))||
   (b.completion_bound!==undefined&&b.completion_bound!==true)||
   (b.completion_bound===true&&
     (keys.length!==5||b.requested_hours!==8))||
   (b.completion_bound!==true&&
     (keys.length!==3&&keys.length!==4||
      (keys.length===4&&!Object.hasOwn(b,'requested_hours'))||
      (keys.length===3&&Object.hasOwn(b,'requested_hours'))))||
   (!Number.isSafeInteger(b.requested_hours??8)||
   (b.requested_hours??8)<1||(b.requested_hours??8)>12)||
   b.action!=='AUTHORIZE_EXACT_EMPLOYEE_SHIFT'||!SHA.test(b.expected_fingerprint||''))
   return res.status(400).json({ok:false,error:'SHIFT_EXACT_APPROVAL_REQUIRED'});
  const start=new Date(b.planned_start_at);
  if(typeof b.planned_start_at!=='string'||!/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d\d\dZ/.test(b.planned_start_at)||
   !Number.isFinite(start.valueOf())||
   start.getTime()<Date.now()-120000||start.getTime()>Date.now()+7*86400000)
   return res.status(400).json({ok:false,error:'SHIFT_START_NOT_IN_ALLOWED_WINDOW'});
  const catalog=await buildRealityWorkCatalog();
  const brief=buildRealityWorkdayOpportunityBrief(catalog);
  const priority=await ownerExistingRileySourcePriority({
   catalog,brief,ownerId:session.user_id,db});
  const settledRefs=await ownerSettledOriginalSourceRefs({
   ownerId:session.user_id,db});
  const plan=buildRealityEightHourShiftDraft(brief,{
   durationHours:b.requested_hours??8,prioritySourceRefs:priority.refs,
   excludedSettledSourceRefs:settledRefs});
  const fingerprint=computeShiftFingerprint(plan);
  const combined=buildRileyTaylorCombinedWorkOrders({plan,fingerprint});
  // Do not create a timer-only idle shift when no paired source task was
  // actually nominated in the exact, already-pinned owner scope.
  if(combined.task_count===0)
   return res.status(409).json({ok:false,
    error:'NO_COMBINED_RILEY_TAYLOR_SOURCE_WORK_IN_APPROVED_PLAN',
    job_started:false,installation_authorized:false,production_changed:false});
  if(fingerprint!==b.expected_fingerprint)
   return res.status(409).json({ok:false,error:'SHIFT_SOURCE_CHANGED_REBUILD_PLAN'});
  const receipt=assertShiftReceipt(await shiftRpc(db,
   b.completion_bound===true?
    'reality_authorize_employee_completion_shift_v1':
    'reality_authorize_employee_shift_v1',{
    p_owner_id:session.user_id,p_fingerprint:fingerprint,
    p_source_observed_at:plan.observed_at,p_start_at:start.toISOString(),
    p_steps:plan.slots
   }));
  const read=assertShiftReadback(await shiftRpc(db,
   'reality_read_owner_employee_shifts_v1',
   {p_owner_id:session.user_id}));
  const exact=read.shifts.find(s=>s.shift_id===receipt.shift_id&&
   s.plan_fingerprint===fingerprint&&s.steps.length===8&&
   (b.completion_bound===true?
     s.planned_end_at==='infinity'&&receipt.completion_bound===true:
     Number(new Date(s.planned_end_at))-Number(start)===
      plan.shift_duration_minutes*60000));
  if(!exact)throw Error('SHIFT_COMMIT_NOT_READ_BACK_VERIFIED');
  const start_confirmation=Object.freeze({
   status:'OWNER_WORK_BATCH_AUTHORIZATION_CONFIRMED',
   shift_id:exact.shift_id,authorized_at:exact.authorized_at,
   planned_start_at:exact.planned_start_at,
   completion_bound:b.completion_bound===true,
   exact_job_count:exact.steps.slice(1,5).filter(t=>t.source_ref).length,
   selected_sources:exact.steps.slice(1,5).filter(t=>t.source_ref)
    .map(t=>({step_index:t.step_index,source_ref:t.source_ref})),
   worker_execution_verified:false,
   original_job_completed:false,installation_authorized:false,
   production_changed:false
  });
  return res.status(202).json({ok:true,...receipt,shift:exact,
   start_confirmation,
   combined_employee_work_orders:combined,
   initial_authorization_recorded:true,
   completion_bound:b.completion_bound===true,
   completion_condition:b.completion_bound===true?
    'ALL_SELECTED_JOBS_INDEPENDENTLY_VERIFIED_AND_RECEIPTED':null,
   installation_authorized:false,
   existing_chat_approval_required_for_exact_capabilities:true,
   job_started:false,shift_started:false,
   worker_dispatch_verified:false,
   production_changed:false});
 }catch(e){
  console.warn('EMPLOYEE_SHIFT_OWNER_BOUNDARY',
   /^SHIFT_[A-Z0-9_]{5,100}$/.test(e?.message||'')?
    e.message:'UNVERIFIED_FAILURE');
  return res.status(503).json({ok:false,
   error:'SHIFT_OWNER_OR_DATABASE_READBACK_UNAVAILABLE',
   job_started:false,shift_started:false,
   installation_authorized:false,production_changed:false});
 }
}
