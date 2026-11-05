// The deterministic read-only decision layer for Reality's EXISTING governed
// worker. It cannot mint original-job authorization, a lease, a model mandate,
// an installation, or a receipt. Signed workers must independently re-read
// the ledger before acting on any decision.
export const NEXT_WORK_VERSION='reality-governed-next-work-decision-v1';
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const PRIORITY=Object.freeze({
 'PENDING_FROZEN_REPRODUCTION':1,
 'LEASED_FOR_INDEPENDENT_REPRODUCTION':1,
 'FROZEN_REPRODUCED_AWAITING_CANDIDATE':2,
 'EVIDENCE_RECONCILIATION_REQUIRED':3,
 'AWAITING_OWNER_APPROVAL':4,
 'ISOLATED_INSTALLED_PROBATION':5,
});
const terminal=new Set(['SETTLED_ISOLATED']);
function fail(x){throw Error('NEXT_WORK_UNTRUSTED_'+x)}
export function selectNextGovernedWork({loop,qualified=[],shift=null}={}){
 if(loop?.status!=='OWNER_GOVERNED_LOOP_READBACK'||
    loop.owner_installation_authorized_by_read!==false||
    loop.external_action_performed!==false||
    loop.production_changed!==false||
    !Array.isArray(loop.jobs)||loop.jobs.length>12||
    !Array.isArray(qualified)||qualified.length>20||
    loop.jobs.some(j=>!WORK.test(j?.original_work_id)||
      !UUID.test(j.trigger_id)||typeof j.phase!=='string'||
      (j.environment!=='ISOLATED_PREVIEW')||
      typeof j.candidate_verified!=='boolean'||
      typeof j.owner_install_approved!=='boolean'||
      (j.independently_settled!=null&&typeof j.independently_settled!=='boolean'))||
    qualified.some(q=>!WORK.test(q?.original_work_id)||
      !/^[a-f0-9]{64}$/.test(q?.qualification?.artifact_sha256||'')||
      q.qualification?.installation_authorized!==false||
      q.qualification?.original_job_completed!==false)||
    shift!==null&&(
      shift.authorized!==true||
      !['RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(shift.status)||
      typeof shift.read_only_sources_available!=='boolean'||
      shift.production_changed!==false))
   fail('SCOPE_OR_PROVIDER_READBACK');
 const seen=new Set();
 for(const j of loop.jobs){
  if(seen.has(j.original_work_id))fail('DUPLICATE_ORIGINAL');
  seen.add(j.original_work_id);
  if(!terminal.has(j.phase)&&!(j.phase in PRIORITY))
   fail('UNKNOWN_QUEUE_PHASE');
  if(j.phase==='SETTLED_ISOLATED'&&j.independently_settled!==true)
   fail('UNVERIFIED_SETTLEMENT');
 }
 const candidates=loop.jobs.filter(j=>!terminal.has(j.phase)&&
    j.independently_settled!==true).sort((a,b)=>
      PRIORITY[a.phase]-PRIORITY[b.phase]||
      a.original_work_id.localeCompare(b.original_work_id));
 const qmap=new Map(qualified.map(q=>[q.original_work_id,q]));
 if(qmap.size!==qualified.length)fail('DUPLICATE_QUALIFICATION');
 const work=candidates[0]||null;
 let action='NO_ELIGIBLE_JOB';
 if(work){
  if(['PENDING_FROZEN_REPRODUCTION','LEASED_FOR_INDEPENDENT_REPRODUCTION',
    'FROZEN_REPRODUCED_AWAITING_CANDIDATE'].includes(work.phase))
   action='RECHECK_AND_WAKE_EXISTING_ORIGINAL_WORKER';
  else if(work.phase==='EVIDENCE_RECONCILIATION_REQUIRED')
   action='INDEPENDENT_EFFECT_RECONCILIATION_NO_REPLAY';
  else if(work.phase==='AWAITING_OWNER_APPROVAL')
   action=work.candidate_verified===true&&qmap.has(work.original_work_id)?
     'EXACT_UPGRADE_APPROVAL_IN_REALITY_CHAT':
     'INDEPENDENT_CANDIDATE_READBACK_REQUIRED';
  else if(work.phase==='ISOLATED_INSTALLED_PROBATION')
   action=work.owner_install_approved===true&&work.isolated_installed===true?
     'VERIFY_ORIGINAL_OUTCOME_NO_DUPLICATE_EXECUTION':
     'INDEPENDENT_INSTALLATION_READBACK_REQUIRED';
 }
 const safeSourceContinuation=shift?.read_only_sources_available===true;
 const ownerActionNeeded=action==='EXACT_UPGRADE_APPROVAL_IN_REALITY_CHAT';
 const verifiedNoNewWork=!work;
 // Always identify the next safe READ-ONLY activity even while installation
 // approval is pending; an approval gate blocks only its exact effect.
 const concurrentReadOnlyAction=safeSourceContinuation?
    'MONITOR_AND_INVESTIGATE_ALREADY_AUTHORIZED_SOURCES':
    'NO_FURTHER_AUTHORIZED_DISCOVERY_SOURCES';
 return Object.freeze({
  schema:NEXT_WORK_VERSION,
  next_action:action,original_work_id:work?.original_work_id||null,
  existing_trigger_id:work?.trigger_id||null,
  queue_phase:work?.phase||null,
  active_original_jobs:candidates.length,
  independently_settled_jobs:loop.jobs.filter(j=>
    j.phase==='SETTLED_ISOLATED'&&j.independently_settled===true).length,
  no_new_executable_work:verifiedNoNewWork,
  source_continuation:concurrentReadOnlyAction,
  owner_action_required:ownerActionNeeded,
  owner_action_channel:ownerActionNeeded?'EXISTING_REALITY_CHAT':null,
  next_worker_must_revalidate_provider:true,
  automatic_wake_is_not_new_authority:true,
  original_job_execution_claimed:false,
  external_effect_replay_authorized:false,
  installation_authorized:false,original_job_completed:false,
  production_changed:false,
 });
}
