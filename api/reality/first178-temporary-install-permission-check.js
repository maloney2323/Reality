import {verifyFirst178ScopedGithubWrite}
 from '../../src/reality-first178-isolated-github-install-v0.1.js';
export const maxDuration=20;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET'||process.env.VERCEL_ENV!=='preview'||
  process.env.VERCEL_GIT_COMMIT_REF!==
  'feature/first178-live-single-claim-execution-20261029')
  return res.status(404).json({ok:false});
 const value=String(process.env.REALITY_FIRST178_GITHUB_INSTALL_TOKEN||
   process.env.REALITY_GITHUB_TOKEN||'');
 const canPush=await verifyFirst178ScopedGithubWrite({token:value});
 // No identity, token value, token fingerprint or privileged GitHub response
 // is ever surfaced. This disposable read-only connectivity probe is
 // deleted after its one live test.
 return res.status(200).json({ok:canPush,provider:'GITHUB',
  scope:'ISOLATED_PREVIEW_ONLY',can_push:canPush,
  original_job_executed:false,install_approved:false,
  production_changed:false});
}
