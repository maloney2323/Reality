// Internal, read-only, provenance-bound source recovery for Reality's EXACT
// original 14/14 model-generated package. Not an approval or warrant issuer.
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fingerprintGovernedUpgradeCandidate}
 from './reality-governed-github-upgrade-provider-v0.1.js';
export const ORIGINAL_EXECUTOR_TRUSTED_PACKAGE_READBACK_VERSION='reality-original-executor-trusted-package-readback-v0.1';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const RUN=40762950798,ARTIFACT=12849950148;
const WORK='work:24cda9611404e9bcb47909976067605c';
const RUN_SHA='52de4566fd1317e53c62615b69fc847803512e92';
const EXECUTOR_SHA='61df9fc02b2cc342b19fb61a82b961d773499628caf47b9b1647ea3675299d17';
const PROPOSAL_SHA='6b82acd60baa9055bfc57a70f551bac44f783fc431814ad2555927eb50f5ca16';
const FINGERPRINT='88d4bba7f2ddf0c7331ddfcc0621b4a13739326451cb53d41ad807c97bceb9b2';
const FILES=[
 'src/reality-extensions/reality-original-maintenance-repair-proposal.mjs',
 'src/reality-extensions/reality-original-maintenance-executor.mjs'
];
const REQUIRED=['manifest.json','package.json','reality-original-maintenance-repair-proposal.mjs',
 'reality-original-maintenance-executor.mjs','independent-frozen-verification.txt',
 'independent-security-verification.txt','frozen-regression.txt','independent-security-holdout.txt'];
const fail=x=>{throw Error(x)};
const digest=x=>createHash('sha256').update(x).digest('hex');
const exact=()=>({work_id:WORK,executor_sha256:EXECUTOR_SHA,proposal_sha256:PROPOSAL_SHA,
 installable_candidate_sha256:FINGERPRINT,ci_run_id:RUN,artifact_id:ARTIFACT});
const c32=(b,o)=>{if(o<0||o+4>b.length)fail('ORIGINAL_VERIFIER_ZIP_BOUNDS');return b.readUInt32LE(o)};
const c16=(b,o)=>{if(o<0||o+2>b.length)fail('ORIGINAL_VERIFIER_ZIP_BOUNDS');return b.readUInt16LE(o)};
export function parseStrictOriginalExecutorArchive(archive){
 const b=Buffer.isBuffer(archive)?archive:Buffer.from(archive||[]);
 if(b.length<22||b.length>250000)fail('ORIGINAL_VERIFIER_ARCHIVE_SIZE_INVALID');
 let eocd=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){
  if(c32(b,i)===0x06054b50){eocd=i;break}
 }
 if(eocd<0||c16(b,eocd+4)!==0||c16(b,eocd+6)!==0||
    c16(b,eocd+8)!==c16(b,eocd+10)||c16(b,eocd+10)<REQUIRED.length||
    c16(b,eocd+10)>15||c16(b,eocd+20)!==0)
  fail('ORIGINAL_VERIFIER_ZIP_CENTRAL_DIRECTORY_INVALID');
 let at=c32(b,eocd+16),total=0;
 const result=new Map();
 for(let i=0;i<c16(b,eocd+10);i++){
  if(c32(b,at)!==0x02014b50)fail('ORIGINAL_VERIFIER_ZIP_CENTRAL_ENTRY_INVALID');
  const method=c16(b,at+10),compressed=c32(b,at+20),length=c32(b,at+24);
  const n=c16(b,at+28),extra=c16(b,at+30),comment=c16(b,at+32);
  const offset=c32(b,at+42);
  const end=at+46+n+extra+comment;
  if(end>b.length||n<1||n>140||compressed>100000||length>65000||
     ![0,8].includes(method)||offset+30>b.length)
   fail('ORIGINAL_VERIFIER_ZIP_ENTRY_SIZE_OR_METHOD_INVALID');
  const name=b.subarray(at+46,at+46+n).toString('utf8');
  if(!REQUIRED.includes(name)||result.has(name))
   fail('ORIGINAL_VERIFIER_ZIP_UNEXPECTED_OR_DUPLICATED_ENTRY');
  if(c32(b,offset)!==0x04034b50||c16(b,offset+8)!==method)
   fail('ORIGINAL_VERIFIER_ZIP_LOCAL_ENTRY_INVALID');
  const localN=c16(b,offset+26),localE=c16(b,offset+28);
  if(b.subarray(offset+30,offset+30+localN).toString('utf8')!==name)
   fail('ORIGINAL_VERIFIER_ZIP_LOCAL_NAME_MISMATCH');
  const start=offset+30+localN+localE;
  if(start+compressed>b.length)fail('ORIGINAL_VERIFIER_ZIP_COMPRESSED_BOUNDS');
  const encoded=b.subarray(start,start+compressed);
  const bytes=method===0?encoded:inflateRawSync(encoded,{maxOutputLength:65001});
  if(bytes.length!==length)fail('ORIGINAL_VERIFIER_ZIP_LENGTH_CHANGED');
  total+=bytes.length;if(total>190000)fail('ORIGINAL_VERIFIER_ZIP_EXPANSION_LIMIT');
  result.set(name,bytes);
  at=end;
 }
 if(result.size!==REQUIRED.length||REQUIRED.some(x=>!result.has(x))||at>eocd)
  fail('ORIGINAL_VERIFIER_ZIP_UNEXPECTED_PACKAGE_CONTENT');
 return Object.freeze(Object.fromEntries([...result.entries()].map(([name,bytes])=>[name,bytes.toString('utf8')])));
}
function exactArtifacts(value){
 if(!value||!Array.isArray(value.artifacts))fail('ORIGINAL_VERIFIER_GITHUB_ARTIFACT_LIST_REQUIRED');
 const items=value.artifacts.filter(x=>x.id===ARTIFACT&&
   x.name==='reality-original-executor-corrected-independent-holdout-proof');
 if(items.length!==1||items[0].expired===true||items[0].size_in_bytes>250000)
  fail('ORIGINAL_VERIFIER_FROZEN_ARTIFACT_NOT_AVAILABLE');
}
export function verifyOriginalExecutorPackageBytes(bytes){
 const source=typeof bytes==='object'?bytes:{};
 const manifest=JSON.parse(source['manifest.json']||'null');
 const obj=JSON.parse(source['package.json']||'null');
 const files=obj?.files;
 if(manifest?.original_work_id!==WORK||
    manifest?.executor_source_sha256!==EXECUTOR_SHA||
    manifest?.original_proposal_source_sha256!==PROPOSAL_SHA||
    manifest?.governed_install_candidate_sha256!==FINGERPRINT||
    manifest?.owner_warrant_issued!==false||manifest?.installed!==false||
    manifest?.original_job_completed!==false||
    !Array.isArray(files)||files.length!==2||
    files.some((f,i)=>f.path!==FILES[i]||f.mode!=='100644'||typeof f.content!=='string')||
    files[0].content!==source['reality-original-maintenance-repair-proposal.mjs']||
    files[1].content!==source['reality-original-maintenance-executor.mjs']||
    digest(files[0].content)!==PROPOSAL_SHA||
    digest(files[1].content)!==EXECUTOR_SHA||
    fingerprintGovernedUpgradeCandidate(files)!==FINGERPRINT)
  fail('ORIGINAL_VERIFIER_FROZEN_MODEL_PACKAGE_BYTES_INVALID');
 const frozen=source['independent-frozen-verification.txt']||'';
 const holdout=source['independent-security-verification.txt']||'';
 if(!/(?:^|\n)# tests 10(?:\r?\n)/.test(frozen)||
    !/(?:^|\n)# pass 10(?:\r?\n)/.test(frozen)||
    !/(?:^|\n)# fail 0(?:\r?\n)/.test(frozen)||
    !/(?:^|\n)# tests 4(?:\r?\n)/.test(holdout)||
    !/(?:^|\n)# pass 4(?:\r?\n)/.test(holdout)||
    !/(?:^|\n)# fail 0(?:\r?\n)/.test(holdout))
  fail('ORIGINAL_VERIFIER_INDEPENDENT_FROZEN_AND_HOLDOUT_NOT_PASSED');
 return Object.freeze({...exact(),files:Object.freeze(files.map(f=>Object.freeze({...f}))),
  frozen_tests:{passed:true,case_count:10,result_sha256:digest(frozen)},
  independent_holdout:{passed:true,case_count:4,result_sha256:digest(holdout)},
  signed_warrant_issued:false,installation_authorized:false,original_job_completed:false});
}
export async function loadTrustedOriginalExecutorPackage({env=process.env,fetchImpl=fetch}={}){
 const token=env.REALITY_GITHUB_TOKEN;
 if(env.VERCEL_ENV!=='preview'||typeof token!=='string'||!token)
  fail('ORIGINAL_VERIFIER_PRIVATE_PREVIEW_GITHUB_ACCESS_REQUIRED');
 const h={authorization:'Bearer '+token,accept:'application/vnd.github+json',
  'x-github-api-version':'2022-11-28'};
 const api=async path=>{
  const r=await fetchImpl(ROOT+path,{headers:h,redirect:'error',signal:AbortSignal.timeout(15000)});
  if(r.status!==200)fail('ORIGINAL_VERIFIER_GITHUB_READBACK_FAILED');
  return r.json();
 };
 const run=await api('/actions/runs/'+RUN);
 if(run.id!==RUN||run.name!=='Reality Corrected Original Executor Frozen and Holdout Verification v0.3'||
    run.head_sha!==RUN_SHA||run.status!=='completed'||run.conclusion!=='success'||
    run.repository?.full_name!=='maloney2323/Reality'||
    run.head_repository?.full_name!=='maloney2323/Reality')
  fail('ORIGINAL_VERIFIER_EXACT_SUCCESSFUL_RUN_REQUIRED');
 const jobs=await api('/actions/runs/'+RUN+'/jobs?per_page=50');
 if(jobs.total_count!==1||jobs.jobs?.length!==1||
    jobs.jobs[0].name!=='verify-original-model-executor'||jobs.jobs[0].conclusion!=='success')
  fail('ORIGINAL_VERIFIER_EXACT_GREEN_JOB_REQUIRED');
 exactArtifacts(await api('/actions/runs/'+RUN+'/artifacts?per_page=50'));
 const redirect=await fetchImpl(ROOT+'/actions/artifacts/'+ARTIFACT+'/zip',{
  headers:h,redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(![301,302,303,307,308].includes(redirect.status))
  fail('ORIGINAL_VERIFIER_GITHUB_ARCHIVE_REDIRECT_REQUIRED');
 const location=redirect.headers.get('location');
 const u=location?new URL(location):null;
 if(!u||u.protocol!=='https:'||
    !(u.hostname.endsWith('.blob.core.windows.net')||
      u.hostname==='objects.githubusercontent.com'))
  fail('ORIGINAL_VERIFIER_ARCHIVE_REDIRECT_HOST_UNTRUSTED');
 const zipped=await fetchImpl(u.toString(),{
  redirect:'error',signal:AbortSignal.timeout(20000)});
 if(zipped.status!==200||Number(zipped.headers.get('content-length')||0)>250000)
  fail('ORIGINAL_VERIFIER_ARCHIVE_RETRIEVAL_FAILED');
 const archive=Buffer.from(await zipped.arrayBuffer());
 const proof=verifyOriginalExecutorPackageBytes(parseStrictOriginalExecutorArchive(archive));
 return Object.freeze({...proof,ci_run_url:run.html_url,artifact_immutable_verified:true});
}
