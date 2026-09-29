import { CONSTITUTION, CONSTITUTION_VERSION, evaluateConstitution } from '../../src/reality-constitution.js';

const PROVIDERS = Object.freeze({
  github: { name: 'GitHub', scope: 'repository', connector: 'connected_integration' },
  vercel: { name: 'Vercel', scope: 'project', connector: 'connected_integration' },
  base44: { name: 'Base44', scope: 'app', connector: 'connected_integration' },
});

const ACTIONS = Object.freeze({
  github: ['read_repository', 'create_repository_file', 'update_repository_file', 'create_pull_request'],
  vercel: ['read_project', 'read_deployment', 'trigger_deployment'],
  base44: ['read_app', 'read_file', 'read_connectors'],
});

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function capabilitySnapshot() {
  return {
    service: 'reality-world-access',
    version: '0.4.0',
    credential_model: 'connector_backed',
    constitutional_gate: {
      version: CONSTITUTION_VERSION,
      enforced_before_execution: true,
      intelligence_can_modify: false,
    },
    providers: Object.fromEntries(
      Object.entries(PROVIDERS).map(([id, p]) => [
        id,
        {
          name: p.name,
          read: true,
          write: true,
          scope: p.scope,
          authority: p.connector,
          runtime_secret_required: false,
          actions: ACTIONS[id],
        },
      ]),
    ),
    execution: {
      mode: 'action_broker',
      provider_credentials_in_runtime: false,
      execution_key_required: false,
      external_execution: 'connected_integration_layer',
    },
    policy: {
      no_implicit_authority: true,
      no_unverified_completion: true,
      bounded_actions_only: true,
      independent_verification_required: true,
      contradiction_preservation: true,
      no_runtime_provider_secrets: true,
    },
  };
}

function actionEnvelope(body, constitutionalDecision) {
  return {
    envelope_version: '0.4.0',
    request_id: body.requestId || crypto.randomUUID(),
    provider: body.provider,
    action: body.action,
    target: body.target || null,
    parameters: body.parameters || {},
    authorization: {
      authorized: body.authorization?.authorized === true,
      scope: body.authorization?.scope || null,
      authorityId: body.authorization?.authorityId || null,
    },
    constitution: {
      version: constitutionalDecision.constitutionVersion,
      decision: constitutionalDecision.decision,
      reason: constitutionalDecision.reason,
      attested: constitutionalDecision.attested,
    },
    verification: {
      required: true,
      read_back_required: true,
      preserve_contradictions: true,
    },
    status: 'PENDING_CONNECTED_EXECUTION',
  };
}

function validate(body) {
  const provider = PROVIDERS[body.provider];
  if (!provider) return { ok: false, status: 400, error: 'PROVIDER_NOT_ALLOWED' };
  if (!ACTIONS[body.provider]?.includes(body.action)) {
    return { ok: false, status: 400, error: 'ACTION_NOT_ALLOWED' };
  }
  if (body.authorization?.authorized !== true) {
    return { ok: false, status: 403, error: 'EXPLICIT_AUTHORIZATION_REQUIRED' };
  }
  if (body.authorization.scope !== provider.scope) {
    return { ok: false, status: 403, error: 'AUTHORITY_SCOPE_MISMATCH' };
  }
  return { ok: true, provider };
}

export default async function handler(req, res) {
  if (req.method === 'GET') return json(res, 200, capabilitySnapshot());

  if (req.method !== 'POST') {
    res.setHeader('allow', 'GET, POST');
    return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  if (body.action === 'read_capabilities') {
    return json(res, 200, { capability: capabilitySnapshot() });
  }

  const check = validate(body);
  if (!check.ok) return json(res, check.status, { error: check.error, verified: false });

  const proposal = {
    ...(body.proposal || {}),
    authorization: body.authorization,
    requiredScope: check.provider.scope,
  };
  const state = body.state || {};

  const constitutionalDecision = evaluateConstitution({
    proposal,
    state,
    constitution: CONSTITUTION,
  });

  if (!constitutionalDecision.allowed) {
    return json(res, 403, {
      verified: false,
      constitutional_gate: constitutionalDecision,
      execution: 'BLOCKED',
      message: 'Constitutional Gate blocked execution. No external action was requested.',
    });
  }

  // Reality never receives or stores provider credentials here.
  // The connected integration layer executes this envelope and must return
  // an external-state read-back before Reality records completion.
  return json(res, 202, {
    envelope: actionEnvelope(body, constitutionalDecision),
    execution_boundary: 'CONNECTED_INTEGRATION_LAYER',
    verified: false,
    message: 'Action accepted for connected execution; completion is not asserted until an independent external read-back is returned.',
  });
}
