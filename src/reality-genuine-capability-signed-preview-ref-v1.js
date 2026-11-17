// Signed GitHub Actions identity for the active Reality isolated preview.
// This is not a production deploy, owner approval or source of job authority.
// The owner goal, original-work and frozen-failure guards remain mandatory.
const REF=/^refs\/heads\/reality\/[a-z0-9][a-z0-9_/-]{8,109}$/;
const SHA=/^[a-f0-9]{40}$/;
export function isSignedRealityCapabilityPreviewRef(ref){
 return typeof ref==='string'&&REF.test(ref)&&
  !ref.includes('//')&&!ref.endsWith('/')&&
  !ref.split('/').includes('main')&&!ref.split('/').includes('production');
}
export function isSignedRealityCapabilityPush(env){
 return env?.GITHUB_ACTIONS==='true'&&
  env.GITHUB_EVENT_NAME==='push'&&
  env.GITHUB_REPOSITORY==='maloney2323/Reality'&&
  isSignedRealityCapabilityPreviewRef(env.GITHUB_REF)&&
  SHA.test(env.GITHUB_SHA||'');
}
export function requireSignedRealityCapabilityPush(env){
 if(!isSignedRealityCapabilityPush(env))
  throw Error('GENUINE_CAPABILITY_SIGNED_ISOLATED_PREVIEW_REF_REQUIRED');
 return Object.freeze({
  ref:env.GITHUB_REF,
  branch:env.GITHUB_REF.slice('refs/heads/'.length),
  sha:env.GITHUB_SHA
 });
}
