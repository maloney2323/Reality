// One foundational, read-only service: provide the coding model with the
// EXACT frozen regression test source that the independent sandbox will run.
// Without this the model only sees a manifest name and must guess the contract.
// Pinned public GitHub source -> hashed manifest -> source bytes. No arbitrary
// browser URLs, checkout commands, credentials in model text, or model writes.
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=x=>{throw Error('FOUNDATION_REGRESSION_CONTEXT_'+x)};
const BASE='https://api.github.com/repos/maloney2323/Reality';
const PATH=/^test\/[a-zA-Z0-9._/-]+\.test\.js$/;
function safePath(p){
 return typeof p==='string'&&p.length<=180&&PATH.test(p)&&
  !p.split('/').includes('..')&&!p.split('/').includes('.')&&!p.includes('//');
}
export function createVerifiedFrozenRegressionReader({
 fetchImpl=fetch,token=null,
}={}){
 return async ticket=>{
  if(ticket?.environment!=='ISOLATED_PREVIEW'||
    !/^[a-f0-9]{40}$/.test(ticket?.repository_base_sha||'')||
    !/^[a-f0-9]{64}$/.test(ticket?.frozen_regression_sha256||'')||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(ticket?.frozen_regression_manifest_ref||''))
   fail('PINNED_TICKET_REQUIRED');
  const headers={accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-independent-frozen-contract-readback'};
  if(token)headers.authorization='Bearer '+token;
  async function read(path){
   const url=BASE+'/contents/'+path+'?ref='+ticket.repository_base_sha;
   let resp;
   try{resp=await fetchImpl(url,{method:'GET',cache:'no-store',redirect:'error',headers})}
   catch{fail('GITHUB_PROVIDER_UNAVAILABLE')}
   if(!resp?.ok)fail('GITHUB_PROVIDER_UNAVAILABLE');
   const body=await resp.json();
   if(body?.encoding!=='base64'||body?.path!==path||
      !Number.isSafeInteger(body.size)||body.size<1||body.size>70000||
      typeof body.content!=='string')
    fail('SOURCE_CONTENT_UNVERIFIED');
   const bytes=Buffer.from(body.content.replace(/\s/g,''),'base64');
   if(bytes.length!==body.size)fail('SOURCE_SIZE_CHANGED');
   const raw=bytes.toString('utf8');
   if(Buffer.byteLength(raw,'utf8')!==bytes.length)fail('SOURCE_ENCODING_INVALID');
   return raw;
  }
  const manifestPath='test/reality-frozen-regressions/'+
    ticket.frozen_regression_manifest_ref+'.json';
  const raw=await read(manifestPath);
  if(hash(raw)!==ticket.frozen_regression_sha256)
   fail('FROZEN_MANIFEST_HASH_CHANGED');
  let manifest;try{manifest=JSON.parse(raw)}catch{fail('FROZEN_MANIFEST_INVALID')}
  if(manifest?.manifest_ref!==ticket.frozen_regression_manifest_ref||
     !Array.isArray(manifest.tests)||manifest.tests.length<2||
     manifest.tests.length>10||new Set(manifest.tests).size!==manifest.tests.length||
     manifest.tests.some(x=>!safePath(x))||
     !manifest.tests.includes('test/reality-governed-self-improvement-spine-v1.0.test.js'))
   fail('FROZEN_SUITE_SCOPE_INVALID');
  let total=0;
  const files=[];
  for(const path of manifest.tests){
   const content=await read(path);
   total+=Buffer.byteLength(content,'utf8');
   if(total>120000)fail('TOTAL_CONTRACT_TOO_LARGE');
   files.push(Object.freeze({path,sha256:hash(content),content}));
  }
  return Object.freeze({
   source:'GITHUB_PINNED_READ_ONLY_TEST_FILES',
   repository_base_sha:ticket.repository_base_sha,
   frozen_regression_manifest_ref:ticket.frozen_regression_manifest_ref,
   frozen_regression_sha256:ticket.frozen_regression_sha256,
   files:Object.freeze(files),
   model_execution_authority:false,
   installation_authorized:false,
  });
 };
}
