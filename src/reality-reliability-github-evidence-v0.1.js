import crypto from 'node:crypto';
import {readGroundedEvidence,recordSourceAttestedEvidence} from './reality-reliability-evidence-v0.1.js';

// A narrow real-provider evidence adapter. It independently reads GitHub's API
// and never derives facts from the current model answer. Only the server's
// allowlisted repository may be observed. Not an agent execution connector.
export const REALITY_GITHUB_EVIDENCE_VERSION='reality-github-evidence-v0.1';
export async function captureGithubRepositoryEvidence({
  continuityRuntime,repository='maloney2323/Reality',
  worldId='developer:reality-repository',
  allowedRepository=process.env.REALITY_RELIABILITY_GITHUB_ALLOWED_REPOSITORY,
  token=process.env.REALITY_GITHUB_TOKEN,
  fetchImpl=fetch,observedAt=new Date().toISOString(),
}={}){
  if(!allowedRepository||repository!==allowedRepository ||
      !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository))
    throw Error('RELIABILITY_GITHUB_REPOSITORY_NOT_ALLOWLISTED');
  if(!worldId||!continuityRuntime?.enabled)throw Error('RELIABILITY_GITHUB_WORLD_REQUIRED');
  const response=await fetchImpl('https://api.github.com/repos/'+repository,{
    method:'GET',headers:{
      accept:'application/vnd.github+json',
      'x-github-api-version':'2022-11-28',
      ...(token?{authorization:'Bearer '+token}:{}),
    },
  });
  if(!response.ok)throw Error('RELIABILITY_GITHUB_PROVIDER_READ_FAILED_'+response.status);
  const body=await response.json();
  if(body.full_name!==repository||typeof body.id!=='number'||
      typeof body.default_branch!=='string'||typeof body.archived!=='boolean')
    throw Error('RELIABILITY_GITHUB_PROVIDER_DATA_INVALID');
  const canonical={
    repository_id:body.id,repository:body.full_name,
    default_branch:body.default_branch,archived:body.archived,
  };
  const digest=crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  const prior=readGroundedEvidence(await continuityRuntime.readback(),{worldId});
  const byKey=new Map(prior.facts.map(f=>[f.key,f]));
  const facts=Object.entries(canonical).map(([key,value])=>{
    const previous=byKey.get(key);
    return {
      key,value,
      ...(previous&&JSON.stringify(previous.value)!==JSON.stringify(value)?
        {supersedes_evidence_ref:previous.evidence_ref}:{}),
    };
  });
  // Source ref and digest reflect the externally observed resource and data.
  const receipt=await recordSourceAttestedEvidence({
    continuityRuntime,worldId,sourceKind:'CONNECTED_PROVIDER_READBACK',
    sourceRef:'github:repo:'+repository,
    sourceDigest:digest,facts,observedAt,
  });
  return {
    adapter_version:REALITY_GITHUB_EVIDENCE_VERSION,
    world_id:worldId,source_receipt_id:receipt.event_id,
    source_kind:'CONNECTED_PROVIDER_READBACK',readback_verified:receipt.verified_readback,
    facts:canonical,
  };
}
