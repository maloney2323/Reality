import crypto from 'node:crypto';
export const SYSTEM_DISCOVERY_VERSION='reality-system-discovery-v0.1';
const REQUIRED=['constitution','capability_gap_detector','governed_cognitive_loop','intelligence_orchestrator','ekr','system_access'];
const PATHS={constitution:'src/reality-constitution.js',capability_gap_detector:'src/reality-capability-gap-detector-v0.1.js',governed_cognitive_loop:'src/reality-governed-cognitive-loop-v0.1.js',intelligence_orchestrator:'src/reality-intelligence-orchestrator-v0.1.js',ekr:'src/reality-ekr-v0.2.js',system_access:'src/reality-governed-system-access-v0.1.js'};
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const stable=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(stable).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
const digest=v=>'sha256:'+crypto.createHash('sha256').update(stable(v)).digest('hex');
export function buildSelfModelManifest({sourceTree=[]}={}){
 const byPath=new Map(sourceTree.map(x=>[x.path,x]));
 const components=Object.fromEntries(REQUIRED.map(name=>[name,{path:PATHS[name],present:byPath.has(PATHS[name]),source_sha:byPath.get(PATHS[name])?.sha||null}]));
 return {manifest_version:'reality-self-model-manifest-v0.1',components};
}
export function compareDiscoverySnapshot({current,previous=null}={}){
 if(!current?.commit_sha)throw new Error('CURRENT_SNAPSHOT_REQUIRED');
 if(!previous)return {comparison_status:'BASELINE_REQUIRED',commit_changed:null,added_paths:[],removed_paths:[],changed_paths:[]};
 const c=new Map((current.tree?.paths||[]).map(x=>[x.path,x.sha])),p=new Map((previous.tree?.paths||[]).map(x=>[x.path,x.sha]));
 return {comparison_status:current.commit_sha===previous.commit_sha?'UNCHANGED':'CHANGED',commit_changed:current.commit_sha!==previous.commit_sha,previous_commit_sha:previous.commit_sha,current_commit_sha:current.commit_sha,added_paths:[...c.keys()].filter(x=>!p.has(x)).sort(),removed_paths:[...p.keys()].filter(x=>!c.has(x)).sort(),changed_paths:[...c.keys()].filter(x=>p.has(x)&&p.get(x)!==c.get(x)).sort()};
}
export function buildSystemDiscoveryArtifact({repositoryObservation,selfModel={},previousSnapshot=null,capabilityState={}}={}){
 if(!repositoryObservation?.source?.commit_sha)throw new Error('REPOSITORY_OBSERVATION_REQUIRED');
 const tree=repositoryObservation.tree?.paths||[],manifest=buildSelfModelManifest({sourceTree:tree});
 const comparison=compareDiscoverySnapshot({current:{commit_sha:repositoryObservation.source.commit_sha,tree:{paths:tree}},previous:previousSnapshot});
 const gaps=[];
 const missing=Object.entries(manifest.components).filter(([,v])=>!v.present).map(([k])=>k);
 if(missing.length)gaps.push({gap_id:'SELF_MODEL_COMPONENT_MISSING',severity:'HIGH',evidence:missing,status:'OBSERVED'});
 if(comparison.comparison_status==='BASELINE_REQUIRED')gaps.push({gap_id:'DISCOVERY_SNAPSHOT_BASELINE_MISSING',severity:'MEDIUM',evidence:['No prior snapshot supplied.'],status:'OBSERVED'});
 if(capabilityState?.github?.write!==true)gaps.push({gap_id:'GITHUB_RUNTIME_WRITE_AUTHORITY_MISSING',severity:'MEDIUM',evidence:['github.write=false'],status:'OBSERVED'});
 if(capabilityState?.vercel?.read!==true)gaps.push({gap_id:'VERCEL_READ_CAPABILITY_MISSING',severity:'MEDIUM',evidence:['vercel.read=false'],status:'OBSERVED'});
 const proposal=gaps.length?{proposal_id:'DISCOVERY-PROPOSAL-'+repositoryObservation.source.commit_sha.slice(0,12),bounded:true,authority:'DISCOVERY_ONLY',proposed_upgrades:gaps.map(g=>({gap_id:g.gap_id,action:g.gap_id==='DISCOVERY_SNAPSHOT_BASELINE_MISSING'?'Establish durable snapshot storage.':g.gap_id==='VERCEL_READ_CAPABILITY_MISSING'?'Provide narrowly scoped Vercel read access.':g.gap_id==='GITHUB_RUNTIME_WRITE_AUTHORITY_MISSING'?'Configure narrowly scoped GitHub write access only after authorization policy exists.':'Inspect the missing Self Model component before proposing implementation.'}))}:null;
 const artifact={discovery_version:SYSTEM_DISCOVERY_VERSION,observed_at:new Date().toISOString(),provenance:{provider:repositoryObservation.provider||'github',repository:repositoryObservation.repository?.full_name||'maloney2323/Reality',ref:repositoryObservation.source.ref||'main',commit_sha:repositoryObservation.source.commit_sha,commit_message:repositoryObservation.source.commit_message||null},source_observation_digest:digest(repositoryObservation),self_model_manifest:manifest,comparison,capability_state:clone(capabilityState),observed_gaps:gaps,proposal,authorization:{status:'NOT_REQUESTED',write_authorized:false,execution_authorized:false},verification:{status:'OBSERVED_NOT_INDEPENDENTLY_VERIFIED',deployment_verified:false,behavior_verified:false}};
 return {artifact,artifact_digest:digest(artifact),persistence:{status:'NOT_PERSISTED',reason:'NO_DURABLE_SNAPSHOT_STORE_CONFIGURED'},next_action:proposal?'PROPOSE':'NO_GAP_OBSERVED'};
}