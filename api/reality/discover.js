import {inspectGitHubRepository} from '../../src/reality-governed-system-access-v0.1.js';
import {buildSystemDiscoveryArtifact} from '../../src/reality-system-discovery-v0.1.js';
function json(res,status,body){res.statusCode=status;res.setHeader('content-type','application/json');res.end(JSON.stringify(body));}
export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('allow','POST');return json(res,405,{error:'METHOD_NOT_ALLOWED'});}
 try{const b=req.body&&typeof req.body==='object'?req.body:{};const o=await inspectGitHubRepository({owner:b.owner||'maloney2323',repo:b.repo||'Reality',ref:b.ref||'main'});return json(res,200,buildSystemDiscoveryArtifact({repositoryObservation:o,previousSnapshot:b.previousSnapshot||null,capabilityState:b.capabilityState||{}}));}
 catch(e){return json(res,502,{error:e.message,verified:false});}
}