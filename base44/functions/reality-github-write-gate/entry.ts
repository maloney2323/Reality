import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { githubJsonResponse as json } from '../../shared/reality-core/github-client.ts';
import { issueGithubWriteAuthorization } from '../../shared/reality-core/github-write-gate-v0.1.js';
import { ArtifactType } from '../../shared/personal-reality/derived-artifact-contract.js';

const VERSION = 'reality-github-write-gate-v0.1';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const principal = await base44.auth.me();
    if (!principal?.id) return json({ error:'AUTHENTICATION_REQUIRED' },401);
    if (principal.role !== 'admin') return json({ error:'ADMIN_REQUIRED' },403);
    const body = await req.json().catch(()=>({}));
    const action = String(body?.action || 'status');
    if (action === 'status') return json({
      schema: VERSION, mode:'EXPLICIT_HUMAN_AUTHORIZATION_FOR_BRANCH_COMMIT_PR_ONLY',
      consequence:'CREATE_BRANCH_COMMIT_PR', merge_authorized:false, deploy_authorized:false,
      main_write_authorized:false, governance_change_authorized:false,
      description:'Issues a single-use, five-minute authorization bound to one exact CODE_PATCH_CANDIDATE, repository, base ref, changed paths, and candidate tree hash.'
    });
    if (action !== 'authorize') return json({error:'UNKNOWN_ACTION',allowed:['status','authorize']},400);
    const candidateArtifactId=String(body?.candidate_artifact_id||'').trim();
    const repository=String(body?.repository||'').trim();
    const baseRef=String(body?.base_ref||'main').trim();
    if(!candidateArtifactId||!repository) return json({error:'CANDIDATE_AND_REPOSITORY_REQUIRED'},400);
    const service=base44.asServiceRole;
    const rows=await service.entities.DerivedArtifact.filter({id:candidateArtifactId,user_id:principal.id,artifact_type:ArtifactType.CODE_PATCH_CANDIDATE},'-created_date',5,0);
    if(!Array.isArray(rows)||rows.length!==1) return json({error:'EXACT_CODE_PATCH_CANDIDATE_NOT_FOUND'},404);
    const candidate=rows[0];
    if(candidate.status!=='CANDIDATE'&&candidate.status!=='ACTIVE') return json({error:'CANDIDATE_NOT_APPLICABLE',status:candidate.status},409);
    const issued=await issueGithubWriteAuthorization({service,principal,candidate,repository,baseRef,issuedAt:new Date().toISOString()});
    return json({schema:'reality.github-write-authorization.v0.1',ok:true,authorization:issued,governance:{consequence:'CREATE_BRANCH_COMMIT_PR',merge_authorized:false,deploy_authorized:false,main_write_authorized:false,governance_change_authorized:false,human_action_recorded:true}});
  } catch(error:any) {
    console.error('reality-github-write-gate failed',error);
    return json({error:'GITHUB_WRITE_AUTHORIZATION_FAILED_CLOSED',diagnostic:error?.message||String(error)},500);
  }
}