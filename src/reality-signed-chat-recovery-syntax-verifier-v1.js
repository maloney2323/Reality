// Independent parse-only preflight for the EXISTING signed recovery candidate.
// Candidate source is untrusted: never import, evaluate, or invoke it.
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {reproduceFrozenStructuralSpanFailure} from './reality-recovery-structural-splice-v1.js';
const SHA=/^[a-f0-9]{40}$/, HASH=/^sha256:[a-f0-9]{64}$/, UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const digest=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const safe=(status,detail={})=>Object.freeze({status,...detail,execution_authorized:false,
 installation_authorized:false,original_job_completed:false,production_changed:false,new_shift_started:false});
export function parseOnlyModule(source,spawn=spawnSync){
 const result=spawn(process.execPath,['--input-type=module','--check'],{
  input:source,encoding:'utf8',env:{},timeout:2500,maxBuffer:256000,
  windowsHide:true});
 if(result?.error||result?.signal||!Number.isInteger(result?.status))
  return 'PARSE_PROVIDER_UNAVAILABLE';
 if(result.status===0)return 'VALID_SYNTAX';
 if(result.status===1&&typeof result.stderr==='string'&&/SyntaxError:/.test(result.stderr))
  return 'INVALID_SYNTAX';
 return 'PARSE_PROVIDER_UNAVAILABLE';
}
// Independently classify a FULL, never-executed ESM module parse failure.
// Only a fixed category and bounded source line leave this parser: never
// forward model-controlled stderr or source text as trusted instructions.
export function parseOnlyModuleFailureCategory(source,spawn=spawnSync){
 if(typeof source!=='string'||Buffer.byteLength(source,'utf8')>280000)
  return Object.freeze({verdict:'PARSE_INPUT_UNVERIFIED'});
 const result=spawn(process.execPath,['--input-type=module','--check'],{
  input:source,encoding:'utf8',env:{},timeout:2500,maxBuffer:256000,
  windowsHide:true});
 if(result?.error||result?.signal||!Number.isInteger(result?.status))
  return Object.freeze({verdict:'PARSE_PROVIDER_UNAVAILABLE'});
 if(result.status===0)
  return Object.freeze({verdict:'VALID_SYNTAX'});
 if(result.status!==1||typeof result.stderr!=='string'||
  !/SyntaxError:/.test(result.stderr))
  return Object.freeze({verdict:'PARSE_PROVIDER_UNAVAILABLE'});
 const diagnostic=result.stderr.match(/SyntaxError:\s*([^\r\n]{1,140})/);
 const message=diagnostic?.[1]||'';
 const category=/Unexpected end of input|Unexpected end of file/i.test(message)?
  'UNEXPECTED_END_OF_MODULE':
  /Unexpected token/i.test(message)?'UNEXPECTED_TOKEN':
  /Missing catch or finally after try/i.test(message)?'INCOMPLETE_TRY_STATEMENT':
  /Identifier .* has already been declared/i.test(message)?'DUPLICATE_DECLARATION':
  /Invalid or unexpected token/i.test(message)?'INVALID_TOKEN':
  'OTHER_SYNTAX_ERROR';
 const match=result.stderr.match(/\[stdin\]:(\d{1,6})/);
 const position=match?Number(match[1]):null;
 return Object.freeze({
  verdict:'INVALID_SYNTAX',category,
  line:Number.isSafeInteger(position)&&position>=1&&position<=100000?
   position:null,source_executed:false
 });
}
export function compareFrozenCandidateSyntax(original,find,replace,parse=parseOnlyModule){
 if(typeof original!=='string'||typeof find!=='string'||typeof replace!=='string'||
  !find.length||find===replace)return null;
 const at=original.indexOf(find);
 if(at<0||original.indexOf(find,at+1)>=0)return null;
 const next=original.slice(0,at)+replace+original.slice(at+find.length);
 if(next.includes('\0')||Buffer.byteLength(next,'utf8')>280000)return null;
 const baseline=parse(original);
 if(baseline!=='VALID_SYNTAX')return null;
 const verdict=parse(next);
 if(!['VALID_SYNTAX','INVALID_SYNTAX'].includes(verdict))return null;
 return {baseline:'VALID_SYNTAX',candidate:verdict,baseline_sha256:digest(original),
  proposed_sha256:digest(next),candidate_executed:false,parse_only:true};
}
// Independently reproduce the specific compiler class: an unconsumed
// source closing-delimiter line already present at the replacement boundary.
// Only one unique exact anchored span is admissible. Never execute a draft,
// infer functional correctness, or modify its proposed replacement bytes.
export function reproduceFrozenBoundaryFailure(original,find,replace,parse=parseOnlyModule){
 const p=compareFrozenCandidateSyntax(original,find,replace,parse);
 if(p?.candidate!=='INVALID_SYNTAX'||!find.endsWith('\n')||!replace.endsWith('\n'))return null;
 const at=original.indexOf(find);
 const after=original.slice(at+find.length);
 const next=after.match(/^[ \t]*[}\])]+;?[ \t]*\n/)?.[0];
 const last=replace.match(/(?:^|\n)([ \t]*[}\])]+;?[ \t]*\n)$/)?.[1];
 if(!next||!last||next!==last)return null;
 const expanded=find+next;
 if(expanded.length>16000||original.indexOf(expanded,at+1)>=0)return null;
 const fixed=compareFrozenCandidateSyntax(original,expanded,replace,parse);
 if(fixed?.candidate!=='VALID_SYNTAX')return null;
 return Object.freeze({schema:'reality-exact-splice-boundary-reproduction-v1',
  classification:'DUPLICATED_FROZEN_CLOSING_DELIMITER',
  original_candidate_sha256:p.proposed_sha256,corrected_candidate_sha256:fixed.proposed_sha256,
  expanded_find_sha256:digest(expanded),unchanged_replacement_sha256:digest(replace),
  boundary_line:next,additional_source_lines:1,parse_only:true,candidate_executed:false,
  functional_acceptance_verified:false});
}
export async function independentlyVerifySignedRecoverySyntax({
 db,env=process.env,shiftId,workerRunId,fetchImpl=fetch,call=shiftRpc,parse=parseOnlyModule
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  !SHA.test(env.VERCEL_GIT_COMMIT_SHA||''))
  return safe('SIGNED_RECOVERY_SYNTAX_PREVIEW_SCOPE_UNVERIFIED');
 const q=await call(db,'reality_read_next_signed_chat_recovery_publish_v1',{}, {fetchImpl});
 if(q?.status==='NO_SIGNED_CHAT_RECOVERY_QUARANTINE_CANDIDATE')return safe(q.status);
 const c=q?.candidate;
 if(q?.status!=='SIGNED_CHAT_RECOVERY_QUARANTINE_CANDIDATE_READ'||
  !UUID.test(q.trigger_id||'')||!WORK.test(q.original_work_id||'')||
  !HASH.test(q.target_review_receipt_sha256||'')||q.independent_target_review_verified!==true||
  !['SIGNED_CHAT_RECOVERY_TARGET_REVIEWED','SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'].includes(q.phase)||
  q.installation_authorized!==false||q.original_job_completed!==false||q.production_changed!==false||
  !c||c.original_work_id!==q.original_work_id||c.spec_sha256!==q.spec_sha256||
  !HASH.test(c.candidate_sha256||'')||!SHA.test(c.base_sha||'')||c.base_sha!==q.release_sha||
  !SHA.test(c.source_blob_sha||'')||!/^\b(?:src\/|api\/reality\/)[A-Za-z0-9_/-]+\.js$/.test(c.target_path||'')||
  c.target_path.includes('//')||c.target_path.includes('..'))
  return safe('SIGNED_RECOVERY_SYNTAX_EXACT_SOURCE_UNVERIFIED');
 try{
  const r=await fetchImpl('https://api.github.com/repos/maloney2323/Reality/contents/'+c.target_path+'?ref='+c.base_sha,
   {method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),
    headers:{accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'Reality-independent-parse-verifier'}});
  if(!r?.ok)return safe('SIGNED_RECOVERY_SYNTAX_PINNED_SOURCE_UNAVAILABLE');
  const d=await r.json();
  if(d.path!==c.target_path||d.encoding!=='base64'||d.sha!==c.source_blob_sha||
   !Number.isSafeInteger(d.size)||d.size<1||d.size>210000||typeof d.content!=='string')
   return safe('SIGNED_RECOVERY_SYNTAX_SOURCE_METADATA_UNVERIFIED');
  const b=Buffer.from(d.content.replace(/\s/g,''),'base64'),source=b.toString('utf8');
  if(b.length!==d.size||gitBlob(b)!==c.source_blob_sha||!Buffer.from(source,'utf8').equals(b))
   return safe('SIGNED_RECOVERY_SYNTAX_SOURCE_BYTES_UNVERIFIED');
  const proof=compareFrozenCandidateSyntax(source,c.find,c.replace,parse);
  if(!proof)return safe('SIGNED_RECOVERY_SYNTAX_PROOF_UNAVAILABLE');
  const structural=proof.candidate==='INVALID_SYNTAX'?
   reproduceFrozenStructuralSpanFailure(source,c.find,c.replace,{parse}):null;
  const boundary=proof.candidate==='INVALID_SYNTAX'?
   (reproduceFrozenBoundaryFailure(source,c.find,c.replace,parse)||structural):null;
  const boundaryReceipt=boundary?Object.fromEntries(Object.entries(boundary)
   .filter(([key])=>!['corrected_find','unchanged_replace'].includes(key))):null;
  const recorded=await call(db,'reality_record_signed_chat_recovery_syntax_v1',{
   p_shift_id:shiftId,p_worker_run_id:workerRunId,p_trigger_id:q.trigger_id,
   p_candidate_sha256:c.candidate_sha256,p_base_sha:c.base_sha,p_source_blob_sha:c.source_blob_sha,
   p_release_sha:env.VERCEL_GIT_COMMIT_SHA,p_proof:{...proof,...(boundaryReceipt?{boundary_reproduction:boundaryReceipt}:{})}},{fetchImpl});
  if(recorded?.original_work_id!==q.original_work_id||recorded.trigger_id!==q.trigger_id||
   !HASH.test(recorded.syntax_receipt_sha256||'')||
   recorded.installation_authorized!==false||recorded.original_job_completed!==false||recorded.production_changed!==false)
   return safe('SIGNED_RECOVERY_SYNTAX_DURABLE_RECEIPT_UNVERIFIED');
  if(!['SIGNED_RECOVERY_PARSE_ONLY_VERIFIED','SIGNED_RECOVERY_INVALID_SYNTAX_SAME_ORIGINAL_RECOMPILED','SIGNED_RECOVERY_SYNTAX_REVISION_EXHAUSTED_NEEDS_INVESTIGATION','SIGNED_RECOVERY_SYNTAX_INVESTIGATION_RECOMPILED_SAME_ORIGINAL'].includes(recorded.status))
   return safe('SIGNED_RECOVERY_SYNTAX_DURABLE_RECEIPT_UNVERIFIED');
  return safe(recorded.status,{original_work_id:q.original_work_id,trigger_id:q.trigger_id,
    candidate_sha256:c.candidate_sha256,syntax_receipt_sha256:recorded.syntax_receipt_sha256,
    next_action:recorded.next_action,full_goal_feature_accepted:false});
 }catch{return safe('SIGNED_RECOVERY_SYNTAX_PROVIDER_OR_LEDGER_UNVERIFIED');}
}
