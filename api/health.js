function sourceProvenance() {
  return {
    git_provider: process.env.VERCEL_GIT_PROVIDER || null,
    git_repo_owner: process.env.VERCEL_GIT_REPO_OWNER || null,
    git_repo_slug: process.env.VERCEL_GIT_REPO_SLUG || null,
    git_commit_ref: process.env.VERCEL_GIT_COMMIT_REF || null,
    git_commit_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID || null,
    vercel_env: process.env.VERCEL_ENV || null,
    git_backed: Boolean(process.env.VERCEL_GIT_COMMIT_SHA),
  };
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({
    ok: true,
    service: 'Reality Core API',
    version: 'reality-core-api-v0.8-signed-ledger-continuity',
    base44_function_gateway_required: false,
    service_role_required: false,
    base44_session_verification: 'USER_ME_API',
    model_provider: 'OPENAI_RESPONSES',
    model_configured: Boolean(process.env.OPENAI_API_KEY),
    signed_ledger_key_configured: Buffer.byteLength(String(process.env.REALITY_CHAT_RECEIPT_HMAC_KEY || ''), 'utf8') >= 32,
    source_provenance: sourceProvenance(),
    bounded_self_context: 'reality-independent-self-context-v0.8',
    on_demand_web_research_available: true,
    full_code_inspection_executed_by_transport: false,
    call_continuity_slice_available: true,
    deterministic_continuity_fold_available: true,
    signed_ledger_continuity_available: true,
    pre_generation_signed_user_receipt_required: true,
    pre_generation_receipt_authority: 'AUTHENTICATED_USER_STATEMENT_RECEIPT_NOT_WORLD_TRUTH',
    exact_model_input_hash_verification_required: true,
    durable_user_turn_required_before_generation: true,
    durable_assistant_occurrence_required_before_success: true,
    verified_thought_history_available: true,
    account_latest_thought_recovery_available: true,
    cross_thought_governed_memory_retrieval_available: true,
    cross_thought_memory_authority: 'AUTHENTICATED_USER_STATEMENT_RECEIPT_NOT_WORLD_TRUTH',
    cross_thought_assistant_rows_admitted: false,
    legacy_personal_message_compatibility_read_only: true,
    post_response_chat_continuity_bridge_available: false,
    generic_observation_boundary_executed_by_chat_transport: false,
    assistant_history_authority: 'UNTRUSTED_NOT_EVIDENCE',
    governed_context_migrated: false,
    truth_authorized: false,
    action_authorized: false,
  });
}
