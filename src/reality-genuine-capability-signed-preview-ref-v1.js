// Signed GitHub Actions identity for the active Reality isolated preview.
// This is not a production deploy, owner approval or source of job authority.
// The owner goal, original-work and frozen-failure guards remain mandatory.
// Pin the trusted signed preview deployment, not every writable reality/** branch.
// Only a deployment authority update may change this trust root.
export const REALITY_SIGNED_CAPABILITY_PREVIEW_BRANCH=
 'reality/chat-direct-work-handoff-20261115';
const REF='refs/heads/'+REALITY_SIGNED_CAPABILITY_PREVIEW_BRANCH;
const SHA=/^[a-f0-9]{40}$/;
export function isSignedRealityCapabilityPreviewRef(ref){
 return typeof ref==='string'&&ref===REF;
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
