// Read-only ranking of already saved and independently sourced opportunities.
// Does not accept settled/no-new-work duplicate originals as fresh work.
const GOOD_KINDS=new Set(['GOVERNED_ORIGINAL_JOB_GAP',
 'INDEPENDENTLY_TESTED_CANDIDATE','RESEARCH_OPPORTUNITY']);
const WORK=/^work:[a-f0-9]{32}$/;
const stageRank=x=>
 x.kind==='GOVERNED_ORIGINAL_JOB_GAP'&&x.verified_missing_capability===true?0:
 x.kind==='INDEPENDENTLY_TESTED_CANDIDATE'&&x.candidate_independently_tested===true?1:
 x.repair_proof?.status==='FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED'?2:99;

export function chooseNextOwnerQualification(items,{closedWorkIds=[]}={}){
 if(!Array.isArray(items)||items.length>30||
  !Array.isArray(closedWorkIds)||closedWorkIds.length>12||
  closedWorkIds.some(w=>!WORK.test(w)))throw Error('NEXT_QUALIFICATION_TRUSTED_SOURCE_REQUIRED');
 const closed=new Set(closedWorkIds);
 const next=items.filter(x=>x&&GOOD_KINDS.has(x.kind)&&
  x.executable_job===false&&x.installation_authorized===false&&
  x.original_job_completed!==true&&
  !closed.has(x.original_work_id)&&!closed.has(x.linked_original_work_id)&&
  typeof x.title==='string'&&x.title.length>=5&&
  typeof x.next_proof==='string'&&x.next_proof.length>=20&&
  Number.isSafeInteger(x.priority)&&x.priority>=0&&x.priority<=10&&
  stageRank(x)<99
 ).sort((a,b)=>stageRank(a)-stageRank(b)||
  a.priority-b.priority||a.title.localeCompare(b.title))[0];
 if(!next)return null;
 return Object.freeze({
  key:next.key,title:next.title,kind:next.kind,
  source_url:next.source_url||null,
  status:'CANDIDATE_REQUIRES_CURRENT_ORIGINAL_JOB_VERIFICATION',
  next_proof:next.next_proof,
  verified_current_gap:next.verified_missing_capability===true,
  owner_approval_granted:false,execution_started:false,
  installation_authorized:false,production_changed:false
 });
}
