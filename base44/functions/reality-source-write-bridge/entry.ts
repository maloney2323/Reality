import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildSourceWriteEnvelope, SOURCE_WRITE_BRIDGE_VERSION } from '../../shared/reality-core/source-write-bridge-v0.1.js';

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export default async function (req) {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  const base44 = createClientFromRequest(req);
  const principal = await base44.auth.me().catch(() => null);
  if (!principal?.id || principal.role !== 'admin') return json({ error: 'ADMIN_REQUIRED' }, 403);

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || 'status').trim();

  if (action === 'status') {
    return json({
      version: SOURCE_WRITE_BRIDGE_VERSION,
      mode: 'AUTHORIZED_SOURCE_WRITE_HANDOFF',
      target: 'BASE44_SOURCE_OF_RECORD',
      runtime_filesystem_write_available: false,
      external_source_writer_required: true,
      merge_authorized: false,
      deploy_authorized: false,
      governance_change_authorized: false,
      action_authorized: false,
    });
  }

  if (action !== 'prepare') return json({ error: 'UNKNOWN_ACTION', allowed: ['status', 'prepare'] }, 400);

  const candidateArtifactId = String(body?.candidate_artifact_id || '').trim();
  const authorizationArtifactId = String(body?.authorization_artifact_id || '').trim();
  if (!candidateArtifactId || !authorizationArtifactId) return json({ error: 'CANDIDATE_AND_AUTHORIZATION_REQUIRED' }, 400);

  const service = base44.asServiceRole;
  const candidates = await service.entities.DerivedArtifact.filter(
    { id: candidateArtifactId, user_id: principal.id, artifact_type: 'CODE_PATCH_CANDIDATE' },
    '-created_date', 2, 0,
  );
  const authorizations = await service.entities.DerivedArtifact.filter(
    { id: authorizationArtifactId, user_id: principal.id, artifact_type: 'CODE_WRITE_AUTHORIZATION' },
    '-created_date', 2, 0,
  );
  if (candidates.length !== 1) return json({ error: 'EXACT_CODE_PATCH_CANDIDATE_NOT_FOUND' }, 404);
  if (authorizations.length !== 1) return json({ error: 'EXACT_CODE_WRITE_AUTHORIZATION_NOT_FOUND' }, 404);

  try {
    const envelope = await buildSourceWriteEnvelope({
      candidate: candidates[0].extension_data
        ? { ...candidates[0].extension_data, id: candidates[0].id, artifact_type: candidates[0].artifact_type }
        : null,
      authorization: authorizations[0].extension_data
        ? { ...authorizations[0].extension_data, id: authorizations[0].id, artifact_type: authorizations[0].artifact_type, status: authorizations[0].status }
        : null,
    });
    return json({
      ok: true,
      envelope,
      execution: 'EXTERNAL_SOURCE_WRITER_REQUIRED',
      source_of_record_mutated: false,
      merge_authorized: false,
      deploy_authorized: false,
      governance_change_authorized: false,
      action_authorized: false,
    });
  } catch (error) {
    return json({ error: 'SOURCE_WRITE_ENVELOPE_REJECTED', diagnostic: error?.message || String(error) }, 409);
  }
}