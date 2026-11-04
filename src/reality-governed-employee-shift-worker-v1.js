import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const REPO='maloney2323/Reality';
const URL=/^https:\/\/github\.com\/maloney2323\/Reality\/(issues|pull|actions\/runs)\/([1-9][0-9]{0,15})$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const noProduction=x=>x?.production_changed===false;
async function readProviderSource(source,{fetchImpl=fetch}={}){
 const parsed=URL.exec(String(source||''));
 if(!parsed)throw Error('SHIFT_SOURCE_REF_NOT_ALLOWED');
 const category=parsed[1],id=parsed[2],endpoint=
  category==='issues'?'issues':category==='pull'?'pulls':'actions/runs';
 const target='https://api.github.com/repos/'+REPO+'/'+endpoint+'/'+id;
 const r=await fetchImpl(target,{
  method:'GET',redirect:'error',cache:'no-store',
  headers:{accept:'application/vnd.github+json','user-agent':'Reality-Employee-Shift-ReadOnly/1.0',
   'x-github-api-version':'2022-11-28'},
  signal:AbortSignal.timeout(10000)
 });
 if(r.status===404)return {
  kind:'GITHUB_SOURCE_READBACK',source_url:source,provider_status:'NOT_FOUND',
  provider_checked:true,read_only:true,production_changed:false,
  observed_at:new Date().toISOString()};
 if(!r.ok)throw Error('SHIFT_GITHUB_PROVIDER_READBACK_UNAVAILABLE');
 const data=await r.json();
 if(!data||Number(data.id)<=0||String(data.html_url||'')!==source)
  throw Error('SHIFT_GITHUB_IDENTITY_MISMATCH');
 let state;
 if(category==='issues'){
  if(data.pull_request)throw Error('SHIFT_ISSUE_IS_PR_MISMATCH');
  state=data.state==='open'?'OPEN_ISSUE':data.state==='closed'?'CLOSED':null;
 }else if(category==='pull'){
  state=data.state==='open'?'OPEN_PULL_REQUEST':data.state==='closed'?'CLOSED':null;
 }else state=data.status==='completed'?
   (data.conclusion==='failure'?'FAILED_WORKFLOW':'COMPLETED_WORKFLOW'):null;
 if(!state)throw Error('SHIFT_GITHUB_STATUS_UNRECOGNIZED');
 return {kind:'GITHUB_SOURCE_READBACK',source_url:source,
  provider_status:state,provider_checked:true,read_only:true,
  production_changed:false,observed_at:new Date().toISOString(),
  provider_id:data.id};
}
async function readPreflight(db,{fetchImpl=fetch}={}){
 const claim=await shiftRpc(db,'reality_read_owner_genuine_loop_v1',
  {p_owner_id:db._claimed_owner_id},{fetchImpl});
 const receipts=await shiftRpc(db,'reality_read_owner_final_receipts_v1',
  {p_owner_id:db._claimed_owner_id},{fetchImpl});
 if(claim.status!=='OWNER_GOVERNED_LOOP_READBACK'||
  !Array.isArray(claim.jobs)||claim.jobs.length>12||
  claim.owner_installation_authorized_by_read!==false||
  claim.external_action_performed!==false||!noProduction(claim)||
  receipts.status!=='INDEPENDENT_FINAL_RECEIPT_READBACK'||
  !Array.isArray(receipts.receipts)||receipts.receipts.length>12||
  receipts.does_not_authorize_actions!==true)
  throw Error('SHIFT_ORIGINAL_OWNER_PROVIDER_PREFLIGHT_UNTRUSTED');
 return {kind:'ORIGINAL_LEDGER_READBACK',provider_checked:true,
  owner_scope_verified:true,read_only:true,production_changed:false,
  observed_at:new Date().toISOString(),
  checked_original_jobs:claim.jobs.length,
  independent_final_receipts_read:receipts.receipts.length,
  no_new_authority_granted:true};
}
export async function processGovernedEmployeeShiftTick(db,{fetchImpl=fetch}={}){
 // An isolated one-step invocation; no arbitrary scheduling or execution.
 const closed=await shiftRpc(db,'reality_close_employee_shift_v1',{}, {fetchImpl});
 if(closed.status!=='NO_SHIFT_DUE_FOR_CLOSE'&&closed.status!=='EIGHT_HOUR_SHIFT_EVIDENCE_REPORT')
  throw Error('SHIFT_CLOSE_READBACK_UNVERIFIED');
 const reconciled=await shiftRpc(db,'reality_reconcile_employee_shift_original_v1',
  {},{fetchImpl});
 if(!['NO_SHIFT_AWAITING_EXACT_WORK',
      'EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED',
      'EXACT_SHIFT_ORIGINAL_RECEIPT_RECONCILED'].includes(reconciled.status))
  throw Error('SHIFT_FINAL_RECEIPT_RECONCILIATION_UNTRUSTED');
 const claimed=await shiftRpc(db,'reality_claim_employee_shift_step_v1',{}, {fetchImpl});
 if(['NO_DUE_AUTHORIZED_SHIFT','NO_CLAIMABLE_STEP','INFLIGHT_LEASE_UNEXPIRED',
   'LEASE_EXHAUSTED_ESCALATED','STEP_BLOCKED_SHIFT_CONTINUES',
   'SHIFT_STEP_NOT_YET_DUE','EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED',
   'SHIFT_FINAL_REPORT_NOT_DUE'].includes(claimed.status))
  return {ok:true,status:claimed.status,
   shift_id:claimed.shift_id||null,
   upgrade_approval_channel:'EXISTING_REALITY_CHAT_ONLY',
   installation_authorized:false,job_completed:false,production_changed:false};
 if(claimed.status!=='READ_ONLY_STEP_CLAIMED'||!UUID.test(claimed.shift_id||'')||
  !UUID.test(claimed.claim_id||'')||!UUID.test(claimed.owner_id||'')||
  !Number.isSafeInteger(claimed.step_index)||claimed.step_index<1||
  claimed.step_index>5||claimed.no_external_write_authority!==true)
  throw Error('SHIFT_WORKER_CLAIM_UNTRUSTED');
 let proof;
 if(claimed.step_index===1){
  if(claimed.source_ref!=null)throw Error('SHIFT_PREFLIGHT_SOURCE_MUST_BE_EMPTY');
  proof=await readPreflight({...db,_claimed_owner_id:claimed.owner_id},{fetchImpl});
 }else if(claimed.source_ref===null){
  proof={kind:'NO_SOURCE_AVAILABLE',source_available:false,
   source_url:null,provider_status:'UNASSIGNED_NO_SOURCE',
   provider_checked:false,read_only:true,
   production_changed:false,observed_at:new Date().toISOString()};
 }else proof=await readProviderSource(claimed.source_ref,{fetchImpl});
 const settled=await shiftRpc(db,'reality_settle_employee_shift_step_v1',{
  p_shift_id:claimed.shift_id,p_step_index:claimed.step_index,
  p_claim_id:claimed.claim_id,p_proof:proof},{fetchImpl});
 if(settled.status!=='READ_ONLY_PROVIDER_EVIDENCE_RECORDED'||
  settled.step_index!==claimed.step_index||
  !/^sha256:[a-f0-9]{64}$/.test(settled.proof_sha256||'')||
  settled.production_changed!==false||settled.original_job_completed!==false||
  settled.human_hours_saved!==null)
  throw Error('SHIFT_STEP_INDEPENDENT_SETTLEMENT_UNVERIFIED');
 return {ok:true,status:'READ_ONLY_SHIFT_STEP_SETTLED',
  shift_id:claimed.shift_id,step_index:claimed.step_index,
  source_status:proof.provider_status||'OWNER_LEDGER_CHECKED',
  evidence_digest:settled.proof_sha256,
  installation_authorized:false,job_completed:false,
  verified_human_hours_saved:null,production_changed:false};
}
