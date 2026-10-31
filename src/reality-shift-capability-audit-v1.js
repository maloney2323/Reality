// Read-only capability inspection for the EXISTING autonomous shift.
// No model claims, credential guesses, or discovery proposals become execution authority.
import {buildSystemDiscoveryArtifact} from './reality-system-discovery-v0.1.js';

const isSha=v=>typeof v==='string'&&/^[0-9a-f]{40}$/.test(v);
export function buildShiftCapabilityAudit({repositoryObservation,previousSnapshot=null}={}){
  const o=repositoryObservation;
  if(!o||o.provider!=='github'||o.repository?.full_name!=='maloney2323/Reality'||
     !isSha(o.source?.commit_sha)||!Array.isArray(o.tree?.paths)||
     o.tree?.truncated===true)
    throw Error('CAPABILITY_AUDIT_PINNED_COMPLETE_PROVIDER_TREE_REQUIRED');
  if(previousSnapshot && (!isSha(previousSnapshot.commit_sha)||
     !Array.isArray(previousSnapshot.tree?.paths)))
    throw Error('CAPABILITY_AUDIT_PREVIOUS_SNAPSHOT_UNVERIFIED');
  // Scope snapshots to actual executable and verification source, excluding
  // unrelated assets. Repeated 15-minute ticks must not bloat Continuity.
  const scopedPaths=o.tree.paths.filter(item=>
    item && typeof item.path==='string' && item.type!=='tree' &&
    /^(src|api|scripts|test|sql|supabase|\.github\/workflows)\//.test(item.path))
    .map(item=>({path:item.path,sha:item.sha}));
  const scopedObservation={...o,tree:{...o.tree,paths:scopedPaths}};
  // Unknown provider permissions are UNKNOWN, not "missing capabilities".
  const report=buildSystemDiscoveryArtifact({
    repositoryObservation:scopedObservation,previousSnapshot,
    capabilityState:{github:{read:true,write:null},vercel:{read:null,write:null}},
  });
  const finding=report.artifact;
  return Object.freeze({
    state:'EVIDENCE_CANDIDATES_ONLY',repository:'maloney2323/Reality',
    commit_sha:o.source.commit_sha,ref:o.source.ref,
    source_observation_digest:finding.source_observation_digest,
    complete_provider_tree_sha:o.tree.sha||null,
    scanned_source_path_count:scopedPaths.length,
    artifact_digest:report.artifact_digest,
    comparison:finding.comparison,
    self_model_manifest:finding.self_model_manifest,
    observed_gaps:finding.observed_gaps,
    // Stored inside the SAME durable shift_result event, not an unlinked tracker.
    snapshot:{commit_sha:o.source.commit_sha,tree:{paths:scopedPaths}},
    model_can_propose:true,can_install:false,can_settle:false,
    independently_verified_behavior:false,
  });
}
