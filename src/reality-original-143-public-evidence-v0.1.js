// Public-GitHub *read-only* provider for one real Reality customer job.
// This exists because the PUBLIC repository is independently verified but the
// isolated experimental preview has no REALITY_GITHUB_TOKEN. No token is copied
// from production or another branch; owner approval is still required for any
// capability registration. All non-GET requests and other repos are forbidden.
export const ORIGINAL_143_PUBLIC_EVIDENCE_VERSION='v0.1';
const API='https://api.github.com';
const ROOT='/repos/maloney2323/Reality/';
const BRANCH='experiment/reality-live-durable-adversarial-20261025';
const STATIC=new Set([
 ROOT+'git/ref/heads/'+BRANCH,
 ROOT+'pulls/156',ROOT+'pulls/157',
 ROOT+'issues/143',ROOT+'actions/runs/40777160879',
]);
const MODELED='src/reality-extensions/reality-original-maintenance-executor.mjs';
const ORIGINAL='test/reality-personal-discovered-work-handoff-v0.1.test.js';
function safePath(path){
 if(typeof path!=='string'||path.length>360||path.includes('%')||
    path.includes('#')||path.includes('\\')||
    path.includes('//')||!path.startsWith(ROOT))return false;
 if(STATIC.has(path))return true;
 // The exact two source files may only be read at a verified immutable commit.
 const match=path.match(/^\/repos\/maloney2323\/Reality\/contents\/([^?]+)\?ref=([a-f0-9]{40})$/);
 return !!match&&(match[1]===MODELED||match[1]===ORIGINAL);
}
export async function readPublicOriginal143GitHubEvidence(path,{
 env=process.env,fetchImpl=fetch,
}={}){
 if(env.VERCEL_ENV!=='preview')throw Error('ORIGINAL_143_PUBLIC_GITHUB_PREVIEW_ONLY');
 if(!safePath(path))throw Error('ORIGINAL_143_PUBLIC_GITHUB_ROUTE_NOT_ALLOWED');
 const response=await fetchImpl(API+path,{
  method:'GET',redirect:'error',cache:'no-store',
  headers:{accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-original-143-evidence-read-only'},
 });
 if(!response?.ok){
  const code=Number(response?.status);
  throw Error(code===403?'ORIGINAL_143_PUBLIC_GITHUB_RATE_OR_ACCESS_DENIED':
    code===404?'ORIGINAL_143_PUBLIC_GITHUB_EVIDENCE_NOT_FOUND':
    'ORIGINAL_143_PUBLIC_GITHUB_PROVIDER_UNAVAILABLE');
 }
 const result=await response.json();
 if(result===null||typeof result!=='object')
  throw Error('ORIGINAL_143_PUBLIC_GITHUB_RESPONSE_INVALID');
 return result;
}
