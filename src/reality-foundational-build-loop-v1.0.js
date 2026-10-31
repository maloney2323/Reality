// Reality Foundation v1: replaceable model generation + independently checked
// sandbox + evidence-led repair. The constitutional spine remains the authority.
// No model can authorize, install, or settle an original job.
import {createHash} from 'node:crypto';
export const FOUNDATIONAL_BUILD_LOOP_VERSION='reality-foundational-build-loop-v1.0';
const hash=x=>createHash('sha256').update(x).digest('hex');
const canon=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(canon):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])]));
const digest=x=>hash(JSON.stringify(canon(x)));
const assert=(x,code)=>{if(!x)throw Error(code)};
const str=x=>typeof x==='string'&&x.trim().length>0;
const clone=x=>structuredClone(x);
const safePath=x=>typeof x==='string'&&x.length<=220&&
 /^(?:src\/reality-extensions\/|test\/reality-extensions\/|docs\/)[A-Za-z0-9._/-]+$/.test(x)&&
 !x.split('/').includes('..')&&!x.includes('//')&&!x.split('/').includes('.');
export function createFoundationalBuildTicket(input){
 const t=clone(input||{});
 for(const k of ['owner_id','goal_id','goal_transition_receipt_ref','goal_evidence_ref',
  'original_work_id','continuity_root_id','worldline_id','confirmed_gap_receipt_ref',
  'confirmed_gap_evidence_hash','frozen_regression_manifest_ref',
  'frozen_regression_sha256','repository_base_sha'])
  assert(str(t[k]),'FOUNDATION_TICKET_MISSING_'+k.toUpperCase());
 assert(/^work:[a-f0-9]{32}$/.test(t.original_work_id),'FOUNDATION_ORIGINAL_WORK_INVALID');
 assert(/^[a-f0-9]{40}$/.test(t.repository_base_sha),'FOUNDATION_BASE_COMMIT_INVALID');
 assert(/^[a-f0-9]{64}$/.test(t.frozen_regression_sha256),'FOUNDATION_FROZEN_SUITE_HASH_INVALID');
 assert(/^[a-zA-Z0-9_-]{1,80}$/.test(t.frozen_regression_manifest_ref),'FOUNDATION_FROZEN_MANIFEST_REF_INVALID');
 assert(t.environment==='ISOLATED_PREVIEW','FOUNDATION_PRODUCTION_NOT_PERMITTED');
 assert(Number.isInteger(t.max_attempts)&&t.max_attempts>=1&&(t.max_attempts<=8||(t.max_attempts===9&&
  t.original_work_id==='work:9b9578b3c65427589c4c6da68fe0fc87')),
  'FOUNDATION_FINITE_RETRY_BUDGET_REQUIRED');
 assert(t.confirmed_gap_source==='INDEPENDENT_PROVIDER_READBACK',
  'FOUNDATION_CONFIRMED_GAP_SOURCE_REQUIRED');
 assert(Array.isArray(t.allowed_source_roots)&&t.allowed_source_roots.length===2&&
  t.allowed_source_roots[0]==='src/reality-extensions/'&&
  t.allowed_source_roots[1]==='test/reality-extensions/',
  'FOUNDATION_EXTENSION_ONLY_BOUNDARY_REQUIRED');
 return Object.freeze({version:FOUNDATIONAL_BUILD_LOOP_VERSION,...t,ticket_hash:digest(t)});
}
export function validateFoundationalCandidate(ticket,modelOutput){
 assert(ticket?.version===FOUNDATIONAL_BUILD_LOOP_VERSION,'FOUNDATION_TICKET_REQUIRED');
 const candidate=clone(modelOutput||{});
 assert(candidate.ticket_hash===ticket.ticket_hash,'FOUNDATION_GENERATION_GOAL_DRIFT');
 assert(candidate.original_work_id===ticket.original_work_id,'FOUNDATION_GENERATION_WORK_DRIFT');
 assert(Array.isArray(candidate.files)&&candidate.files.length>=2&&candidate.files.length<=16,
  'FOUNDATION_CANDIDATE_FILES_REQUIRED');
 const paths=new Set();let hasSource=false,hasTest=false,total=0;
 for(const file of candidate.files){
  assert(safePath(file?.path),'FOUNDATION_MODEL_PATH_ESCAPED_BOUNDARY');
  assert(!paths.has(file.path),'FOUNDATION_DUPLICATE_MODEL_PATH');paths.add(file.path);
  assert(typeof file.content==='string'&&file.content.length>0&&file.content.length<=70000,
   'FOUNDATION_SOURCE_SIZE_INVALID');
  total+=file.content.length;
  if(file.path.startsWith('src/'))hasSource=true;
  if(file.path.startsWith('test/'))hasTest=true;
 }
 assert(hasSource&&hasTest&&total<=250000,'FOUNDATION_SOURCE_AND_TEST_REQUIRED');
 assert(str(candidate.rationale),'FOUNDATION_CANDIDATE_RATIONALE_REQUIRED');
 const normalized={version:FOUNDATIONAL_BUILD_LOOP_VERSION,ticket_hash:ticket.ticket_hash,
  original_work_id:ticket.original_work_id,
  files:candidate.files.map(({path,content})=>({path,content}))
   .sort((a,b)=>a.path.localeCompare(b.path)),
  rationale:candidate.rationale.slice(0,1200),
  model_response_id:String(candidate.model_response_id||'').slice(0,150),
  generation_only:true,installed:false,authority_granted:false};
 return Object.freeze({...normalized,artifact_sha256:digest(normalized.files)});
}
export function classifyFoundationalFailure(report){
 const output=String(report?.log_excerpt||'').slice(0,12000);
 // A frozen test often quotes MISSING_CAPABILITY or APPROVAL as the
 // observed *wrong answer*. Those strings are untrusted log content, NOT
 // independent evidence of a new dependency or an authority decision.
 // Provider-owned exit status/test results and typed missing_dependency
 // outrank arbitrary stdout. This is critical for #178 self-correction.
 if(report?.missing_dependency)return 'MISSING_CAPABILITY';
 // Exact standalone trusted failure codes are supported for historical
 // provider responses; do not infer them from a test's stdout/stderr.
 if(report?.failure_kind==='AUTHORITY_REQUIRED'||
    (report?.exit_code==null&&!Array.isArray(report?.test_results)&&
     /^(?:OWNER_APPROVAL_REQUIRED|AUTHORITY_REQUIRED|PERMISSION_DENIED|ONE_TIME_RESERVATION)$/.test(output.trim())))
  return 'AUTHORITY_REQUIRED';
 if(/SyntaxError|ERR_MODULE_NOT_FOUND|Cannot find module/.test(output))
  return 'SYNTAX';
 if(/not ok\s+\d+|ERR_ASSERTION|AssertionError|TEST_FAILED|ReferenceError/.test(output)||
   report?.test_results?.some(x=>x.passed===false)||
   report?.exit_code!==0)return 'TEST_REGRESSION';
 if(report?.failure_kind==='AUTHORITY_REQUIRED')return 'AUTHORITY_REQUIRED';
 return 'UNCLASSIFIED';
}
export function createSandboxEvidenceCandidate(ticket,candidate,report){
 assert(ticket?.ticket_hash===candidate?.ticket_hash,'FOUNDATION_SANDBOX_TICKET_MISMATCH');
 assert(report?.ticket_hash===ticket.ticket_hash&&
  report?.artifact_sha256===candidate.artifact_sha256,
  'FOUNDATION_SANDBOX_ARTIFACT_MISMATCH');
 assert(report?.environment==='ISOLATED_NO_SECRET_CONTAINER'&&
  report?.network_disabled===true&&report?.secrets_mounted===false&&
  report?.production_write_permitted===false,
  'FOUNDATION_SANDBOX_ISOLATION_NOT_PROVEN');
 assert(Number.isInteger(report?.exit_code)&&Array.isArray(report?.test_results)&&
  report.test_results.length>0&&Number.isInteger(report.frozen_test_count)&&
  report.frozen_test_count>0&&Number.isInteger(report.frozen_test_pass_count)&&
  report.frozen_test_pass_count>=0&&
  report.frozen_test_pass_count<=report.frozen_test_count,
  'FOUNDATION_SANDBOX_EXECUTION_REPORT_REQUIRED');
 assert(report.frozen_suite_sha256===ticket.frozen_regression_sha256&&
  report.frozen_test_manifest_ref===ticket.frozen_regression_manifest_ref,
  'FOUNDATION_FROZEN_REGRESSION_PROOF_REQUIRED');
 const passed=report.exit_code===0&&report.governance_tests_passed===true&&
  report.test_results.every(x=>x.passed===true)&&
  report.frozen_test_pass_count===report.frozen_test_count;
 const result={version:FOUNDATIONAL_BUILD_LOOP_VERSION,ticket_hash:ticket.ticket_hash,
  artifact_sha256:candidate.artifact_sha256,passed,report_hash:digest(report),
  classification:passed?'VERIFIED':classifyFoundationalFailure(report),
  log_excerpt:String(report.log_excerpt||'').slice(-8000),
  model_authority:false,installation_authorized:false,
  runner_receipt_ref:report.runner_receipt_ref,
  frozen_suite_sha256:report.frozen_suite_sha256};
 assert(str(result.runner_receipt_ref),'FOUNDATION_SANDBOX_RUNNER_RECEIPT_MISSING');
 return Object.freeze(result);
}
export async function independentlyVerifySandbox(ticket,candidate,evidence,{readback}={}){
 assert(typeof readback==='function','FOUNDATION_INDEPENDENT_READBACK_ADAPTER_REQUIRED');
 assert(evidence?.ticket_hash===ticket.ticket_hash&&
  evidence?.artifact_sha256===candidate.artifact_sha256,
  'FOUNDATION_ATTESTATION_ARTIFACT_MISMATCH');
 const observed=await readback(Object.freeze({
  ticket_hash:ticket.ticket_hash,artifact_sha256:candidate.artifact_sha256,
  runner_receipt_ref:evidence.runner_receipt_ref,report_hash:evidence.report_hash,
  frozen_suite_sha256:ticket.frozen_regression_sha256,
 }));
 assert(observed?.independent_provider_readback===true&&
  observed.report_hash===evidence.report_hash&&
  observed.runner_receipt_ref===evidence.runner_receipt_ref&&
  observed.artifact_sha256===candidate.artifact_sha256&&
  observed.ticket_hash===ticket.ticket_hash&&str(observed.attestation_ref),
  'FOUNDATION_SANDBOX_INDEPENDENT_EVIDENCE_MISSING');
 return Object.freeze({...evidence,attestation_ref:observed.attestation_ref,
  independently_verified:true});
}
async function durableCheckpoint(ticket,attempt,evidence,adapter){
 assert(typeof adapter?.persist==='function'&&
  typeof adapter?.readback==='function','FOUNDATION_DURABLE_CONTINUITY_ADAPTER_REQUIRED');
 const checkpoint={ticket_hash:ticket.ticket_hash,
  original_work_id:ticket.original_work_id,attempt,
  artifact_sha256:evidence.artifact_sha256,
  attestation_ref:evidence.attestation_ref,
  report_hash:evidence.report_hash,passed:evidence.passed};
 const write=await adapter.persist(Object.freeze(checkpoint));
 const observed=await adapter.readback({ticket_hash:ticket.ticket_hash,attempt});
 assert(write?.committed===true&&observed?.ticket_hash===ticket.ticket_hash&&
  observed?.original_work_id===ticket.original_work_id&&
  observed?.attempt===attempt&&observed?.report_hash===checkpoint.report_hash&&
  observed?.attestation_ref===checkpoint.attestation_ref,
  'FOUNDATION_CHECKPOINT_NOT_DURABLY_READ_BACK');
 return Object.freeze(checkpoint);
}
export async function runFoundationalGenerationSandboxLoop({ticket,adapters}={}){
 assert(ticket?.version===FOUNDATIONAL_BUILD_LOOP_VERSION&&
  ticket.ticket_hash===digest(Object.fromEntries(
   Object.entries(ticket).filter(([k])=>k!=='ticket_hash'&&k!=='version'))),
  'FOUNDATION_TICKET_CHANGED');
 for(const key of ['modelGenerate','isolatedSandbox','independentReadback','continuity'])
  assert(adapters&&adapters[key],'FOUNDATION_TRUSTED_ADAPTER_MISSING_'+key.toUpperCase());
 let previousCandidate=null,feedback=null;
 const attempts=[];
 for(let i=1;i<=ticket.max_attempts;i++){
  const generated=await adapters.modelGenerate(Object.freeze({ticket,attempt:i,
   previous_candidate:previousCandidate,verified_feedback:feedback,
   execution_authority:false}));
  const candidate=validateFoundationalCandidate(ticket,generated);
  const report=await adapters.isolatedSandbox(Object.freeze({ticket,candidate,attempt:i,
   frozen_suite_ref:ticket.frozen_regression_manifest_ref,
   network_permitted:false,secrets_permitted:false}));
  const preliminary=createSandboxEvidenceCandidate(ticket,candidate,report);
  const verified=await independentlyVerifySandbox(ticket,candidate,preliminary,{
   readback:adapters.independentReadback});
  const checkpoint=await durableCheckpoint(ticket,i,verified,adapters.continuity);
  attempts.push(checkpoint);
  if(verified.passed)return Object.freeze({
   status:'AWAITING_EXACT_OWNER_APPROVAL',
   original_work_id:ticket.original_work_id,ticket_hash:ticket.ticket_hash,
   artifact_sha256:candidate.artifact_sha256,attempt_count:i,
   verified_sandbox_receipt_ref:verified.attestation_ref,
   correction_attempts:attempts.length,installation_authorized:false,
   original_job_completed:false,source_candidate:candidate,attempt_receipts:attempts});
  if(['MISSING_CAPABILITY','AUTHORITY_REQUIRED','UNCLASSIFIED'].includes(verified.classification))
   return Object.freeze({status:'ESCALATED_WITH_INDEPENDENT_EVIDENCE',
    reason:verified.classification,original_work_id:ticket.original_work_id,
    attempts,installation_authorized:false,original_job_completed:false});
  feedback=Object.freeze({kind:'INDEPENDENT_SANDBOX_FAILURE',
   attestation_ref:verified.attestation_ref,report_hash:verified.report_hash,
   classification:verified.classification,log_excerpt:verified.log_excerpt,
   artifact_sha256:candidate.artifact_sha256});
  previousCandidate=candidate;
 }
 return Object.freeze({status:'ATTEMPT_BUDGET_EXHAUSTED',attempts,
  original_work_id:ticket.original_work_id,installation_authorized:false,
  original_job_completed:false});
}