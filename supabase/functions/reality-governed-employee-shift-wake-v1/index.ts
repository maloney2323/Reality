// Reality isolated eight-hour shift wake.
// Reuses the EXISTING Supabase cron + pg_net scheduling infrastructure.
// The *existing* signed governed wake broker remains exclusively responsible
// for owner-approved capability installation/original-job continuation.
// No GitHub writes, installation, job creation or fabricated ROI here.
const PROJECT='hvkfreoagbrphwghjajw';
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/(issues|pull|actions\/runs)\/([1-9][0-9]{0,15})$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const allowed=new Set([
 'reality_authenticate_employee_shift_wake_v1',
 'reality_close_employee_shift_v1',
 'reality_reconcile_employee_shift_original_v1',
 'reality_claim_employee_shift_step_v1',
 'reality_settle_employee_shift_step_v1',
 'reality_read_owner_genuine_loop_v1',
 'reality_read_owner_final_receipts_v1'
]);
function send(status:number,obj:Record<string,unknown>){
 return new Response(JSON.stringify(obj),{
  status,headers:{'content-type':'application/json','cache-control':'no-store',
   'x-content-type-options':'nosniff'}});
}
function deny(reason:string):never{throw Error('SHIFT_WAKE_'+reason)}
function secrets(){
 const url=Deno.env.get('SUPABASE_URL')||'';
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 if(url!=='https://'+PROJECT+'.supabase.co'||key.length<25)
  deny('ISOLATED_SERVICE_BOUNDARY_INVALID');
 return {url,key};
}
async function rpc(name:string,body:Record<string,unknown>){
 if(!allowed.has(name))deny('RPC_NOT_ALLOWLISTED');
 const {url,key}=secrets();
 const r=await fetch(url+'/rest/v1/rpc/'+name,{
  method:'POST',cache:'no-store',redirect:'error',
  headers:{'content-type':'application/json',accept:'application/json',
   apikey:key,authorization:'Bearer '+key},
  body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 const x=await r.json().catch(()=>null);
 if(!r.ok||!x||typeof x!=='object'||Array.isArray(x))
  deny('PROVIDER_'+name.toUpperCase().replace(/[^A-Z0-9]/g,'')+'_UNAVAILABLE');
 return x as Record<string,unknown>;
}
async function githubSource(source:string){
 const match=ISSUE.exec(source);
 if(!match)deny('SOURCE_ALLOWLIST_REJECTED');
 const path=match[1]==='pull'?'pulls/'+match[2]:
   match[1]==='issues'?'issues/'+match[2]:'actions/runs/'+match[2];
 const response=await fetch('https://api.github.com/repos/maloney2323/Reality/'+path,{
  method:'GET',cache:'no-store',redirect:'error',
  headers:{accept:'application/vnd.github+json',
   'user-agent':'Reality-Shift-Readback/1.0',
   'x-github-api-version':'2022-11-28'},
  signal:AbortSignal.timeout(9500)});
 const stamp=new Date().toISOString();
 if(response.status===404)return {
  kind:'GITHUB_SOURCE_READBACK',source_url:source,
  provider_status:'NOT_FOUND',provider_checked:true,
  observed_at:stamp,read_only:true,production_changed:false};
 if(!response.ok)deny('SOURCE_PROVIDER_UNAVAILABLE');
 const data=await response.json().catch(()=>null);
 if(!data||!Number.isSafeInteger(data.id)||data.id<1||
  data.html_url!==source)deny('SOURCE_IDENTITY_MISMATCH');
 let status:string|null=null;
 if(match[1]==='issues'){
  if(data.pull_request)deny('SOURCE_ISSUE_IS_PULL_REQUEST');
  status=data.state==='open'?'OPEN_ISSUE':data.state==='closed'?'CLOSED':null;
 }else if(match[1]==='pull'){
  status=data.state==='open'?'OPEN_PULL_REQUEST':data.state==='closed'?'CLOSED':null;
 }else if(data.status==='completed'){
  status=data.conclusion==='failure'?'FAILED_WORKFLOW':'COMPLETED_WORKFLOW';
 }
 if(!status)deny('SOURCE_STATUS_UNVERIFIED');
 return {kind:'GITHUB_SOURCE_READBACK',source_url:source,
  provider_status:status,provider_id:data.id,
  provider_checked:true,observed_at:stamp,
  read_only:true,production_changed:false};
}
/**
 * The shift observes source evidence and forwards its exact identity to the
 * EXISTING governed capability cycle. No direct model, model key, second
 * research service or arbitrary capability-gap admission lives here.
 *
 * A GitHub failure is not an independently verified missing capability.
 * The authentic owner-goal + original-job + frozen failure gates remain in
 * the Genuine Capability Engine (the only builder entry point).
 *
 * This proof is a durable intake *observation*, not a claimed dispatch or
 * completed research. The governed runner must independently qualify it
 * against a real unfinished original job before any model generation.
 */
async function researchSourceWithoutStopping(proof:Record<string,unknown>){
 const status=String(proof.provider_status||'');
 const source=String(proof.source_url||'');
 const match=ISSUE.exec(source);
 if(!match||!['FAILED_WORKFLOW','OPEN_ISSUE','OPEN_PULL_REQUEST','NOT_FOUND'].includes(status))
  return proof;
 const research:Record<string,unknown>={
  status:'GOVERNED_RESEARCH_ORIGINAL_JOB_QUALIFICATION_REQUIRED',
  intake_lane:'EXISTING_REALITY_GENUINE_CAPABILITY_ENGINE',
  source_ref:source,source_status:status,
  evidence_kind:'READ_ONLY_PROVIDER_OBSERVATION',
  evidence_not_a_verified_capability_gap:true,
  original_job_goal_binding_verified:false,
  frozen_failure_reproduced:false,model_invoked:false,
  governed_cycle_dispatched:false,
  installation_authorized:false,original_job_completed:false,
  production_changed:false};
 if(status==='FAILED_WORKFLOW'&&match[1]==='actions/runs'){
  try{
   const r=await fetch(
    'https://api.github.com/repos/maloney2323/Reality/actions/runs/'+
     match[2]+'/jobs?per_page=100',{
      method:'GET',cache:'no-store',redirect:'error',
      headers:{accept:'application/vnd.github+json',
       'user-agent':'Reality-Shift-Governed-Evidence/1.0',
       'x-github-api-version':'2022-11-28'},
      signal:AbortSignal.timeout(8500)});
   if(r.ok){
    const jobs=await r.json().catch(()=>null);
    if(Array.isArray(jobs?.jobs)&&jobs.jobs.length<=100){
     const failed=jobs.jobs.filter((j:Record<string,unknown>)=>
      j.run_id===Number(match[2])&&j.conclusion==='failure');
     research.provider_failure_readback_verified=true;
     research.failed_job_count=failed.length;
     research.failed_jobs=failed.slice(0,8).map((j:Record<string,unknown>)=>({
      job_id:j.id,job_name:String(j.name||'').slice(0,160),
      failed_steps:(Array.isArray(j.steps)?j.steps:[])
       .filter((step:Record<string,unknown>)=>step.conclusion==='failure')
       .slice(0,5).map((step:Record<string,unknown>)=>
        String(step.name||'').slice(0,160))
     }));
    }
   }
  }catch{ /* Missing detail is not a failure of shift source settlement. */ }
 }
 return {...proof,research};
}

async function originalLedgerRead(owner_id:string){
 const [loop,receipts]=await Promise.all([
  rpc('reality_read_owner_genuine_loop_v1',{p_owner_id:owner_id}),
  rpc('reality_read_owner_final_receipts_v1',{p_owner_id:owner_id})
 ]);
 if(loop.status!=='OWNER_GOVERNED_LOOP_READBACK'||
  loop.owner_installation_authorized_by_read!==false||
  loop.external_action_performed!==false||loop.production_changed!==false||
  !Array.isArray(loop.jobs)||loop.jobs.length>12||
  receipts.status!=='INDEPENDENT_FINAL_RECEIPT_READBACK'||
  receipts.does_not_authorize_actions!==true||
  !Array.isArray(receipts.receipts)||receipts.receipts.length>12)
  deny('OWNER_LEDGER_PRECHECK_UNVERIFIED');
 return {kind:'ORIGINAL_LEDGER_READBACK',read_only:true,
  provider_checked:true,owner_scope_verified:true,
  checked_original_jobs:loop.jobs.length,
  independent_final_receipts_read:receipts.receipts.length,
  no_new_authority_granted:true,observed_at:new Date().toISOString(),
  production_changed:false};
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST')
   return send(405,{ok:false,status:'SHIFT_WAKE_POST_ONLY'});
  const token=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.get('authorization')||'');
  if(!token)return send(403,{ok:false,status:'SHIFT_WAKE_AUTH_REQUIRED',
   installation_authorized:false,production_changed:false});
  if(req.headers.get('content-type')!=='application/json')
   return send(415,{ok:false,status:'SHIFT_WAKE_JSON_REQUIRED'});
  const raw=await req.text();
  if(raw.length>16||raw.trim()!=='{}')
   return send(400,{ok:false,status:'SHIFT_WAKE_NO_CLIENT_SCOPE_ACCEPTED'});
  const access=await rpc('reality_authenticate_employee_shift_wake_v1',{
   p_token:token[1]});
  if(access.status!=='ISOLATED_SHIFT_WAKE_AUTHENTICATED'||
   access.permission_granted!==false||
   access.installation_authorized!==false||
   access.production_changed!==false)
   return send(403,{ok:false,status:'SHIFT_WAKE_UNTRUSTED_TOKEN',
    installation_authorized:false,production_changed:false});
  // Fail-closed isolated queue stages, one atomic claim each wake.
  const closing=await rpc('reality_close_employee_shift_v1',{});
  if(!['NO_SHIFT_DUE_FOR_CLOSE','EIGHT_HOUR_SHIFT_EVIDENCE_REPORT']
      .includes(String(closing.status)))
   deny('CLOSE_RECONCILIATION_UNVERIFIED');
  const original=await rpc('reality_reconcile_employee_shift_original_v1',{});
  if(!['NO_SHIFT_AWAITING_EXACT_WORK',
       'EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED',
       'EXACT_SHIFT_ORIGINAL_RECEIPT_RECONCILED']
       .includes(String(original.status)))
   deny('ORIGINAL_JOB_MATCH_UNVERIFIED');
  const claimed=await rpc('reality_claim_employee_shift_step_v1',{});
  if(['NO_DUE_AUTHORIZED_SHIFT','NO_CLAIMABLE_STEP',
      'SHIFT_STEP_NOT_YET_DUE','INFLIGHT_LEASE_UNEXPIRED',
      'LEASE_EXHAUSTED_ESCALATED','STEP_BLOCKED_SHIFT_CONTINUES',
      'EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED',
      'SHIFT_FINAL_REPORT_NOT_DUE'].includes(String(claimed.status)))
   return send(200,{ok:true,status:claimed.status,
    shift_id:claimed.shift_id||null,
    source_check_completed:false,
    installation_authorized:false,original_job_completed:false,
    verified_human_hours_saved:null,production_changed:false});
  if(claimed.status!=='READ_ONLY_STEP_CLAIMED'||
   !UUID.test(String(claimed.shift_id||''))||
   !UUID.test(String(claimed.claim_id||''))||
   !UUID.test(String(claimed.owner_id||''))||
   !Number.isSafeInteger(claimed.step_index)||
   claimed.step_index<1||claimed.step_index>5||
   claimed.no_external_write_authority!==true)
   deny('ATOMIC_SHIFT_CLAIM_INVALID');
  let proof:Record<string,unknown>;
  if(claimed.step_index===1){
   if(claimed.source_ref!==null)deny('PREFLIGHT_HAS_SOURCE');
   proof=await originalLedgerRead(String(claimed.owner_id));
  }else if(claimed.source_ref===null){
   proof={kind:'NO_SOURCE_AVAILABLE',source_url:null,
    source_available:false,provider_checked:false,
    provider_status:'UNASSIGNED_NO_SOURCE',
    observed_at:new Date().toISOString(),
    read_only:true,production_changed:false};
  }else{
   proof=await githubSource(String(claimed.source_ref));
   proof=await researchSourceWithoutStopping(proof);
  }
  const settled=await rpc('reality_settle_employee_shift_step_v1',{
   p_shift_id:claimed.shift_id,p_step_index:claimed.step_index,
   p_claim_id:claimed.claim_id,p_proof:proof});
  if(settled.status!=='READ_ONLY_PROVIDER_EVIDENCE_RECORDED'||
   settled.step_index!==claimed.step_index||
   !HASH.test(String(settled.proof_sha256||''))||
   settled.original_job_completed!==false||
   settled.production_changed!==false||
   settled.human_hours_saved!==null)
   deny('INDEPENDENT_SOURCE_PROOF_SETTLEMENT_UNVERIFIED');
  return send(200,{ok:true,status:'READ_ONLY_SHIFT_SOURCE_RECORDED',
   shift_id:claimed.shift_id,step_index:claimed.step_index,
   evidence_digest:settled.proof_sha256,
   source_status:proof.provider_status||'OWNER_LEDGER_CHECKED',
   research_status:(proof.research as Record<string,unknown>|undefined)?.status||null,
   installation_authorized:false,original_job_completed:false,
   verified_human_hours_saved:null,production_changed:false});
 }catch(err){
  const label=err instanceof Error?err.message:'UNKNOWN';
  if(/^SHIFT_WAKE_[A-Z0-9_]{4,150}$/.test(label))
   console.warn('REALITY_EMPLOYEE_SHIFT_WAKE',label);
  return send(503,{ok:false,status:'SHIFT_WAKE_FAIL_CLOSED',
   installation_authorized:false,original_job_completed:false,
   production_changed:false});
 }
});