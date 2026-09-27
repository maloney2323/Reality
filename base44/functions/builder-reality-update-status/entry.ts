import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { REALITY_CODE_FILES, REALITY_CODE_FILE_COUNT, REALITY_CODE_INDEX_VERSION, REALITY_CODE_TREE_HASH } from '../../shared/personal-reality/generated-code-index.js';
import { SELF_MODEL_FACTS } from '../../shared/personal-reality/self-model.js';
import { buildSelfInspectionWorkUnit, verifySelfInspectionWorkUnit, deriveSelfInspectionRequirements } from '../../shared/reality-core/self-inspection-v0.1.js';
import { buildCodeIntelligenceModel, compareCodeSnapshots, inspectCodeChangeImpact } from '../../shared/personal-reality/code-intelligence-model.js';

const FUNCTION_VERSION = 'builder-reality-update-status-v0.1';
const RECORD_VERSION = 'builder-reality-update-inspection-v0.1';
const REVIEW_AUTHORITY = 'MODEL_REVIEW_CANDIDATE_ONLY';
const ALLOWED_ACTIONS = new Set(['status', 'record_inspection']);

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function requireAdmin(base44: ReturnType<typeof createClientFromRequest>) {
  try {
    const principal = await base44.auth.me();
    if (principal?.id && principal.role === 'admin') return principal;
  } catch {}
  return null;
}

function currentFileHashes() {
  return Object.fromEntries(REALITY_CODE_FILES.map((file: any) => [file.path, file.sha256]));
}

function filesFromHashes(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([path, sha256]) => path && typeof sha256 === 'string' && sha256)
    .map(([path, sha256]) => ({ path, sha256 }));
}

function snapshot(previous: any = null) {
  const firstInspection = !previous;
  const currentFiles = REALITY_CODE_FILES;
  const previousFiles = firstInspection ? currentFiles : filesFromHashes(previous.file_hashes);
  const comparison = compareCodeSnapshots({ previousFiles, currentFiles });
  const changedForImpact = [...comparison.added_paths, ...comparison.changed_paths];
  const model = buildCodeIntelligenceModel({
    codeFiles: currentFiles,
    selfModelFacts: SELF_MODEL_FACTS,
    codeTreeHash: REALITY_CODE_TREE_HASH,
    codeIndexVersion: REALITY_CODE_INDEX_VERSION,
  });
  const impact = inspectCodeChangeImpact({ model, changedPaths: changedForImpact, maxDepth: 4 });
  const hasNewUpdate = Boolean(previous && previous.code_tree_hash !== REALITY_CODE_TREE_HASH);

  return Object.freeze({
    source_version: FUNCTION_VERSION,
    record_version: RECORD_VERSION,
    builder_identity: 'Ryan Maloney',
    trigger_mode: 'BUILDER_FOREGROUND_APP_CHECK',
    first_inspection: firstInspection,
    has_new_update: hasNewUpdate,
    current_code_tree_hash: REALITY_CODE_TREE_HASH,
    previous_code_tree_hash: previous?.code_tree_hash || null,
    code_index_version: REALITY_CODE_INDEX_VERSION,
    indexed_file_count: REALITY_CODE_FILE_COUNT,
    file_hashes: currentFileHashes(),
    added_paths: firstInspection ? [] : comparison.added_paths,
    removed_paths: firstInspection ? [] : comparison.removed_paths,
    changed_paths: firstInspection ? [] : comparison.changed_paths,
    direct_capability_refs: impact.direct_capability_refs,
    downstream_capability_refs: impact.downstream_capability_refs,
    potentially_affected_files: impact.potentially_affected_files,
    relevant_tests: impact.relevant_tests,
    semantic_change_established: false,
    breakage_established: false,
    change_safety_established: false,
    continuous_background_monitoring_established: false,
    code_write_authorized: false,
    merge_authorized: false,
    deploy_authorized: false,
    governance_change_authorized: false,
    self_model_promotion_authorized: false,
    external_action_authorized: false,
  });
}

export default async function (req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: 'INVALID_JSON' }, 400); }

  const action = typeof body.action === 'string' && body.action.trim() ? body.action.trim() : 'status';
  if (!ALLOWED_ACTIONS.has(action)) return json({ error: 'UNKNOWN_ACTION' }, 400);

  const base44 = createClientFromRequest(req);
  const principal = await requireAdmin(base44);
  if (!principal) return json({ error: 'ADMIN_REQUIRED' }, 403);
  const service = base44.asServiceRole;

  const rows = await service.entities.BuilderRealityUpdateInspection.filter({ user_id: principal.id }, '-created_at', 20, 0);
  const previous = Array.isArray(rows) ? rows[0] || null : null;
  const current = snapshot(previous);

  if (action === 'status') {
    return json({
      ...current,
      last_inspection_id: previous?.inspection_id || null,
      last_inspected_at: previous?.created_at || previous?.created_date || null,
      last_review_response: previous?.review_response || null,
    });
  }

  const reviewResponse = typeof body.review_response === 'string' ? body.review_response.trim().slice(0, 20000) : '';
  if (!reviewResponse) return json({ error: 'REVIEW_RESPONSE_REQUIRED' }, 400);

  if (previous?.code_tree_hash === REALITY_CODE_TREE_HASH) {
    return json({ ...current, recorded: false, idempotent: true, inspection_id: previous.inspection_id, review_response: previous.review_response || null });
  }

  const now = new Date().toISOString();
  const inspectionId = `builder-update:${REALITY_CODE_TREE_HASH}`;
  const created = await service.entities.BuilderRealityUpdateInspection.create({
    inspection_id: inspectionId,
    record_version: RECORD_VERSION,
    user_id: principal.id,
    code_tree_hash: REALITY_CODE_TREE_HASH,
    ...(current.previous_code_tree_hash ? { previous_code_tree_hash: current.previous_code_tree_hash } : {}),
    code_index_version: REALITY_CODE_INDEX_VERSION,
    indexed_file_count: REALITY_CODE_FILE_COUNT,
    file_hashes: current.file_hashes,
    added_paths: current.added_paths,
    removed_paths: current.removed_paths,
    changed_paths: current.changed_paths,
    direct_capability_refs: current.direct_capability_refs,
    downstream_capability_refs: current.downstream_capability_refs,
    potentially_affected_files: current.potentially_affected_files,
    relevant_tests: current.relevant_tests,
    review_response: reviewResponse,
    review_authority: REVIEW_AUTHORITY,
    semantic_change_established: false,
    breakage_established: false,
    change_safety_established: false,
    code_write_authorized: false,
    merge_authorized: false,
    deploy_authorized: false,
    governance_change_authorized: false,
    self_model_promotion_authorized: false,
    external_action_authorized: false,
    created_at: now,
  });

  const verificationRequirements = [...new Set([
    ...current.relevant_tests.map((test: string) => `RUN_OR_VERIFY:${test}`),
    ...deriveSelfInspectionRequirements({ added: current.added_paths, changed: current.changed_paths, removed: current.removed_paths }),
  ])];

  const workUnit = await buildSelfInspectionWorkUnit({
    world_id: 'personal:self',
    previous_tree_hash: current.previous_code_tree_hash,
    current_tree_hash: current.current_code_tree_hash,
    added: current.added_paths,
    changed: current.changed_paths,
    removed: current.removed_paths,
    inspection_record_ref: `builder-inspection:${created?.inspection_id || inspectionId}`,
    evidence_refs: [`builder-inspection:${created?.inspection_id || inspectionId}`, `code-tree:${current.current_code_tree_hash}`],
    known: [`${current.added_paths.length} added path(s)`, `${current.changed_paths.length} changed path(s)`, `${current.removed_paths.length} removed path(s)`],
    unknown: ['semantic_change_established=false', 'breakage_established=false', 'change_safety_established=false'],
    contradictions: [],
    verification_requirements: verificationRequirements,
    proposed_next_actions: verificationRequirements.length ? ['RUN_GOVERNED_SELF_INSPECTION_VERIFICATION'] : [],
    observed_at: now,
  });

  const workUnitVerification = await verifySelfInspectionWorkUnit(workUnit);
  if (!workUnitVerification.valid) return json({ error: 'SELF_INSPECTION_WORK_UNIT_VALIDATION_FAILED', code: workUnitVerification.code }, 503);

  const existingWorkUnits = await service.entities.RealitySelfInspectionWorkUnitV01.filter({ work_unit_id: workUnit.work_unit_id }, '-created_at', 2, 0);
  let workUnitRecord = Array.isArray(existingWorkUnits) ? existingWorkUnits[0] || null : null;
  if (!workUnitRecord) workUnitRecord = await service.entities.RealitySelfInspectionWorkUnitV01.create(workUnit);

  return json({
    ...current,
    recorded: true,
    idempotent: false,
    inspection_id: created?.inspection_id || inspectionId,
    inspected_at: now,
    review_authority: REVIEW_AUTHORITY,
    self_inspection_work_unit: {
      work_unit_id: workUnit.work_unit_id,
      record_id: workUnitRecord?.id || null,
      status: workUnit.status,
      idempotency_key: workUnit.idempotency_key,
      verification_requirements: workUnit.verification_requirements,
      execution_authority: false,
      mutation_authority: false,
    },
  });
}