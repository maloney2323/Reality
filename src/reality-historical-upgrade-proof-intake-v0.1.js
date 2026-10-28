// Import the actual GitHub Actions self-correction result as HISTORICAL evidence.
// The pilot has NO authenticated customer work checkpoint. Never relabel its
// developer-created work ID as the owner's, or turn a pilot pass into a warrant.
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {validUuid} from './reality-private-chat-store-v0.1.js';

export const HISTORICAL_UPGRADE_PROOF_VERSION='reality-historical-upgrade-proof-intake-v0.1';
const REPO='maloney2323/Reality';
const RUN=40617479444, ARTIFACT=12785991548;
const PILOT='work:80f3f5a2891414a8742de7a4715b8575';
const SOURCE_SHA='1f59e7b74217526225b6283d79d107456c5ab8ce9beffee9328bbed3f6893bf1';
const PREVIOUS_SHA='ac6b3be4717b8bfdc6fc69935c26cf720497386f27565a87bb48a499ac232b81';
const ZIP_SHA='10a9eb07e75dde7297c6a4841a9131fdc1bc893b37a46ffb6d0516c7ff6c4f85';
const GRADER_SHA='48fbc0a91ca7968a8430026921545da4135973f163c71b84227e74ceba381f67';
const FIRST_RESPONSE='resp_0caa066cec78119d006ae15446059887d2a3be76a30ee344cd';
const SECOND_RESPONSE='resp_0708a3a4eca57fef006ae1551afd4487d090ffdcedce9b4cce';
const fail=code=>{throw Error(code)};
const sha=data=>createHash('sha256').update(data).digest('hex');
const url='https://api.github.com/repos/'+REPO;
const MAX_ZIP=4000000, MAX_CONTENT=600000, MAX_ENTRIES=40;

// Parse a deliberately bounded GitHub Actions ZIP. Never run imported JS.
// Cross-check ZIP central and local entries; no paths, duplicates, encryption,
// ZIP64 or external symlinks. Artifact hash is pinned to the earlier proof.
export function unpackBoundedProofArchive(bytes){
 const b=Buffer.from(bytes||[]);
 if(b.length<22||b.length>MAX_ZIP)fail('UPGRADE_IMPORT_ARCHIVE_SIZE_INVALID');
 let eocd=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){
  if(b.readUInt32LE(i)===0x06054b50){eocd=i;break;}
 }
 if(eocd<0||eocd+22+b.readUInt16LE(eocd+20)!==b.length)
  fail('UPGRADE_IMPORT_ZIP_END_INVALID');
 const n=b.readUInt16LE(eocd+10),centralSize=b.readUInt32LE(eocd+12);
 const start=b.readUInt32LE(eocd+16);
 if(n<3||n>MAX_ENTRIES||n!==b.readUInt16LE(eocd+8)||
    start+centralSize!==eocd)fail('UPGRADE_IMPORT_ZIP_DIRECTORY_INVALID');
 let p=start,total=0;
 const entries=new Map();
 for(let i=0;i<n;i++){
  if(p+46>eocd||b.readUInt32LE(p)!==0x02014b50)
   fail('UPGRADE_IMPORT_ZIP_ENTRY_INVALID');
  const flags=b.readUInt16LE(p+8),method=b.readUInt16LE(p+10);
  const crc=b.readUInt32LE(p+16),compressed=b.readUInt32LE(p+20);
  const uncompressed=b.readUInt32LE(p+24);
  const nameLength=b.readUInt16LE(p+28),extra=b.readUInt16LE(p+30);
  const comment=b.readUInt16LE(p+32),local=b.readUInt32LE(p+42);
  const ext=b.readUInt32LE(p+38)>>>16;
  const end=p+46+nameLength+extra+comment;
  if(end>eocd||flags&1||![0,8].includes(method)||
     uncompressed>MAX_CONTENT||compressed>MAX_CONTENT||
     (ext&0xf000)===0xa000)fail('UPGRADE_IMPORT_UNSAFE_ZIP_ENTRY');
  const name=b.toString('utf8',p+46,p+46+nameLength);
  if(!/^[a-z0-9][a-z0-9.-]{0,80}$/.test(name)||entries.has(name))
   fail('UPGRADE_IMPORT_ZIP_PATH_OR_DUPLICATE');
  if(local+30>start||b.readUInt32LE(local)!==0x04034b50||
     b.readUInt16LE(local+8)!==method||b.readUInt16LE(local+6)!==flags)
   fail('UPGRADE_IMPORT_ZIP_LOCAL_HEADER_MISMATCH');
  const lname=b.readUInt16LE(local+26),lextra=b.readUInt16LE(local+28);
  if(lname!==nameLength||
     b.toString('utf8',local+30,local+30+lname)!==name)
   fail('UPGRADE_IMPORT_ZIP_LOCAL_NAME_MISMATCH');
  const begin=local+30+lname+lextra;
  if(begin+compressed>start)fail('UPGRADE_IMPORT_ZIP_BOUNDS_INVALID');
  const raw=b.subarray(begin,begin+compressed);
  const data=method===0?Buffer.from(raw):inflateRawSync(raw,{maxOutputLength:MAX_CONTENT});
  if(data.length!==uncompressed)fail('UPGRADE_IMPORT_ZIP_DECOMPRESSED_SIZE_MISMATCH');
  // CRC32 protects ZIP entry decoding; SHA-256 protects entire downloaded ZIP.
  let c=0xffffffff;
  for(const byte of data){
   c^=byte;
   for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);
  }
  if(((c^0xffffffff)>>>0)!==crc)fail('UPGRADE_IMPORT_ZIP_CRC_MISMATCH');
  total+=data.length;
  if(total>MAX_CONTENT)fail('UPGRADE_IMPORT_ZIP_TOTAL_TOO_LARGE');
  entries.set(name,data);
  p=end;
 }
 if(p!==eocd)fail('UPGRADE_IMPORT_ZIP_TRAILING_DIRECTORY');
 return entries;
}
async function readSmall(response,max){
 if(!response?.ok)fail('UPGRADE_IMPORT_GITHUB_PROVIDER_READ_FAILED');
 const declared=Number(response.headers?.get?.('content-length')||0);
 if(declared>max)fail('UPGRADE_IMPORT_PROVIDER_RESPONSE_TOO_LARGE');
 const b=Buffer.from(await response.arrayBuffer());
 if(b.length>max)fail('UPGRADE_IMPORT_PROVIDER_RESPONSE_TOO_LARGE');
 return b;
}
export async function loadRealGitHubPilotProof({fetchImpl=fetch,env=process.env}={}){
 // No browser-supplied run/artifact IDs, URLs, hashes, access tokens or code.
 const headers={Accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28',
  'User-Agent':'Reality-Historical-Upgrade-Proof-ReadOnly'};
 if(typeof env.REALITY_GITHUB_TOKEN==='string'&&env.REALITY_GITHUB_TOKEN.trim())
  headers.Authorization='Bearer '+env.REALITY_GITHUB_TOKEN.trim();
 const api=async path=>{
  const response=await fetchImpl(url+path,{method:'GET',headers,redirect:'manual'});
  return JSON.parse((await readSmall(response,100000)).toString('utf8'));
 };
 const run=await api('/actions/runs/'+RUN);
 const meta=await api('/actions/artifacts/'+ARTIFACT);
 if(run?.id!==RUN||run.repository?.full_name!==REPO||
    run.status!=='completed'||run.conclusion!=='success'||
    run.html_url!=='https://github.com/'+REPO+'/actions/runs/'+RUN||
    !/^[a-f0-9]{40}$/.test(String(run.head_sha||''))||
    meta?.id!==ARTIFACT||meta.name!=='reality-model-self-correction-independent-proof'||
    meta.expired!==false||meta.workflow_run?.id!==RUN||
    meta.workflow_run?.head_sha!==run.head_sha||
    meta.digest!=='sha256:'+ZIP_SHA)
  fail('UPGRADE_IMPORT_GITHUB_RUN_OR_ARTIFACT_UNVERIFIED');
 // GitHub's API redirects artifact downloads to short-lived blob storage.
 // Never forward GitHub's bearer token to the redirected Azure host.
 const redirect=await fetchImpl(url+'/actions/artifacts/'+ARTIFACT+'/zip',{
  method:'GET',headers,redirect:'manual'});
 if(redirect.status!==302)fail('UPGRADE_IMPORT_EXPECTED_DOWNLOAD_REDIRECT');
 const target=redirect.headers?.get?.('location');
 let blob;
 try{blob=new URL(target)}catch{fail('UPGRADE_IMPORT_DOWNLOAD_URL_INVALID')}
 if(blob.protocol!=='https:'||!/^productionresultssa[0-9]+\.blob\.core\.windows\.net$/.test(blob.hostname)||
    blob.username||blob.password)
  fail('UPGRADE_IMPORT_DOWNLOAD_HOST_REJECTED');
 const archived=await readSmall(await fetchImpl(blob.href,{
  method:'GET',headers:{'User-Agent':'Reality-Historical-Upgrade-Proof-ReadOnly'},
  redirect:'error'}),MAX_ZIP);
 if(sha(archived)!==ZIP_SHA)fail('UPGRADE_IMPORT_ARTIFACT_SHA256_MISMATCH');
 const files=unpackBoundedProofArchive(archived);
 const required=['candidate.mjs','original-candidate.mjs',
  'generation-evidence.json','independent-verification.json','independent-proof.json'];
 if(required.some(x=>!files.has(x)))fail('UPGRADE_IMPORT_PROOF_FILES_MISSING');
 const json=x=>{try{return JSON.parse(files.get(x).toString('utf8'))}
  catch{fail('UPGRADE_IMPORT_INVALID_JSON_EVIDENCE')}};
 const generator=json('generation-evidence.json');
 const grader=json('independent-verification.json');
 const proof=json('independent-proof.json');
 const candidate=sha(files.get('candidate.mjs'));
 const original=sha(files.get('original-candidate.mjs'));
 if(candidate!==SOURCE_SHA||original!==PREVIOUS_SHA||
    sha(files.get('independent-verification.json'))!==GRADER_SHA||
    generator.original_work_id!==PILOT||
    generator.model_generated_correction!==true||
    generator.predecessor_candidate_sha256!==PREVIOUS_SHA||
    generator.corrected_source_sha256!==SOURCE_SHA||
    generator.predecessor_response_id!==FIRST_RESPONSE||
    generator.new_response_id!==SECOND_RESPONSE||
    grader.status!=='INDEPENDENT_SANDBOX_VERIFIED'||
    grader.total!==15||grader.passed!==15||grader.failed!==0||
    grader.frozen?.passed!==true||grader.frozen?.count!==5||
    grader.holdout?.passed!==true||grader.holdout?.count!==10||
    grader.isolation?.production_write_permitted!==false||
    grader.isolation?.secrets_accessible!==false||
    grader.isolation?.network_permitted!==false||
    proof.original_work_id!==PILOT||
    proof.first_model_response_id!==FIRST_RESPONSE||
    proof.second_model_response_id!==SECOND_RESPONSE||
    proof.first_candidate_sha256!==PREVIOUS_SHA||
    proof.second_candidate_sha256!==SOURCE_SHA||
    proof.passed!==15||proof.total!==15||
    proof.heldout_result_sha256!==grader.holdout.result_sha256||
    proof.independent_grader_sha256!==GRADER_SHA||
    proof.state!=='REAL_MODEL_CORRECTED_AND_INDEPENDENTLY_VERIFIED_NOT_PROMOTED'||
    proof.github_write_authorized!==false||
    proof.capability_installed!==false||proof.original_job_completed!==false)
  fail('UPGRADE_IMPORT_MODEL_PROOF_CONTRACT_INVALID');
 return Object.freeze({
  source:'GITHUB_ACTIONS_PINNED_PILOT_ARTIFACT',
  run_id:RUN,artifact_id:ARTIFACT,
  run_url:run.html_url,verified_head_sha:run.head_sha,
  artifact_zip_sha256:ZIP_SHA,corrected_source_sha256:SOURCE_SHA,
  predecessor_source_sha256:PREVIOUS_SHA,
  first_model_response_id:FIRST_RESPONSE,second_model_response_id:SECOND_RESPONSE,
  holdout_result_sha256:grader.holdout.result_sha256,
  grader_sha256:GRADER_SHA,frozen_passed:5,holdout_passed:10,total_passed:15,
  pilot_work_id:PILOT,
  customer_original_work_id:null,verified_customer_capability_gap:false,
  verified_customer_sandbox:false,owner_warrant_issued:false,
  github_execution_authorized:false,promotion_authorized:false,
  capability_installed:false,original_job_completed:false,
 });
}

export async function persistAuthenticatedHistoricalPilotProof({
 session,conversationId,env=process.env,
 readGoal=readFreshPersonalGoalState,createPersistence=createUniversePostgresPersistence,
 loadProof=loadRealGitHubPilotProof,
}={}){
 if(env.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||!validUuid(conversationId))
  fail('UPGRADE_IMPORT_AUTHENTICATED_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('UPGRADE_IMPORT_OWNER_DB_SCOPE_INVALID');
 const goal=await readGoal({session,conversationId,env});
 const active=goal?.state?.active_goal;
 if(goal?.principal_id!==session.user_id||
    goal?.conversation_id!==conversationId||
    active?.user_confirmed!==true||active?.status!=='ACTIVE'||
    active.goal_id!==goal.state?.active_goal_id||
    !active.last_transition_receipt_id)
  fail('UPGRADE_IMPORT_CONFIRMED_GOAL_REQUIRED');
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,
  worldlineId:goal.scope.worldline,subjectId:session.user_id});
 if(spine.continuity_root_id!==goal.state.continuity_root_id||
    goal.scope.world!==goal.state.world_id)
  fail('UPGRADE_IMPORT_OWNER_WORLDLINE_MISMATCH');
 const proof=await loadProof({env});
 // Even a test-injected loader cannot silently turn pilot data into job proof.
 if(proof?.source!=='GITHUB_ACTIONS_PINNED_PILOT_ARTIFACT'||
    proof.pilot_work_id!==PILOT||
    proof.artifact_zip_sha256!==ZIP_SHA||
    proof.corrected_source_sha256!==SOURCE_SHA||
    proof.customer_original_work_id!==null||
    proof.verified_customer_capability_gap!==false||
    proof.verified_customer_sandbox!==false||
    proof.owner_warrant_issued!==false||
    proof.github_execution_authorized!==false||
    proof.capability_installed!==false||
    proof.original_job_completed!==false)
  fail('UPGRADE_IMPORT_PILOT_PROOF_MUST_REMAIN_NON_AUTHORIZING');
 const store=createPersistence({...db});
 const read=async()=>orderContinuityHistory(await store.reconstruct({
  continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id}));
 const history=await read();
 const eventId=continuityUuidFromSource('historical-model-proof:'+session.user_id+
  ':'+conversationId+':'+ZIP_SHA);
 const existing=history.find(x=>x.event_id===eventId);
 const state={
  version:HISTORICAL_UPGRADE_PROOF_VERSION,
  active_goal_id:goal.state.active_goal_id,
  goal_revision:active.last_transition_receipt_id,
  historical_pilot_proof:proof,
  evidence_role:'HISTORICAL_PILOT_EVIDENCE_ONLY',
  original_customer_work_id:null,
  warrant_allowed:false,job_completed:false,external_action_authorized:false,
 };
 if(existing){
  if(existing.entity_type!=='personal_historical_upgrade_pilot_proof'||
     existing.epistemic_status!=='VERIFIED'||
     JSON.stringify(existing.payload)!==JSON.stringify(state))
   fail('UPGRADE_IMPORT_EXISTING_EVENT_CONFLICT');
 }else{
  const tail=history.at(-1);
  if(!tail?.event_id||!tail.lineage_hash)
   fail('UPGRADE_IMPORT_CONTINUITY_TAIL_REQUIRED');
  const at=new Date().toISOString();
  const node=appendContinuityNode({
   spine,stage:'OBSERVATION',entityId:PILOT,eventId,
   parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
   effectiveTime:at,assertionTime:at,epistemicStatus:'VERIFIED',
   evidenceRefs:[proof.run_url],payload:state,
   provenance:{source:HISTORICAL_UPGRADE_PROOF_VERSION,
    principal_id:session.user_id,conversation_id:conversationId},
  });
  // Do not bypass the append-only, lineage-hashed owner Continuity store.
  await store.appendEvent({...node,entity_type:'personal_historical_upgrade_pilot_proof'});
 }
 const confirmed=await read();
 const observed=confirmed.find(x=>x.event_id===eventId);
 if(!observed||observed.entity_type!=='personal_historical_upgrade_pilot_proof'||
    observed.payload?.historical_pilot_proof?.artifact_zip_sha256!==ZIP_SHA||
    observed.payload?.evidence_role!=='HISTORICAL_PILOT_EVIDENCE_ONLY'||
    observed.payload?.external_action_authorized!==false)
  fail('UPGRADE_IMPORT_OWNER_READBACK_NOT_VERIFIED');
 return Object.freeze({
  status:'HISTORICAL_PILOT_PROOF_PERSISTED_JOB_BINDING_REQUIRED',
  owner_id:session.user_id,conversation_id:conversationId,
  original_customer_work_id:null,
  receipt_id:eventId,already_recorded:Boolean(existing),
  source_run_url:proof.run_url,verified_candidate_sha256:SOURCE_SHA,
  warrant_issued:false,github_write_authorized:false,
  capability_installed:false,original_job_completed:false,
 });
}
