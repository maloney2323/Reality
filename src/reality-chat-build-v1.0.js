import crypto from 'node:crypto';
import { createSelfBuildProposal, authorizeSelfBuild, executeSelfBuild } from './reality-self-build-controller-v1.0.js';
import { createGitHubSelfBuildProvider } from './reality-github-self-build-provider-v1.0.js';

export const CHAT_BUILD_VERSION = 'reality-chat-build-v1.0';
const REPO = process.env.REALITY_GITHUB_REPOSITORY || 'maloney2323/Reality';
const MODEL = process.env.REALITY_OPENAI_MODEL || 'gpt-5.6-luna';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseJson(value) {
  const raw = text(value).replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/i, '').trim();
  try { return JSON.parse(raw); } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error('CHAT_BUILD_MODEL_OUTPUT_INVALID');
  }
}

function requestId(message) {
  return crypto.createHash('sha256').update(message).digest('hex').slice(0, 24);
}

async function githubJson(path, token, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`CHAT_BUILD_GITHUB_HTTP_${response.status}`);
  return body;
}

async function loadRepositoryContext(message) {
  const token = text(process.env.REALITY_GITHUB_TOKEN);
  if (!token) throw new Error('REALITY_GITHUB_TOKEN_REQUIRED');

  const tree = await githubJson(`/repos/${REPO}/git/trees/main?recursive=1`, token);
  const files = (tree?.tree || [])
    .filter((item) => item.type === 'blob' && /\.(js|jsx|ts|tsx|json|css|html|md)$/.test(item.path))
    .map((item) => item.path);

  const terms = text(message).toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 2);
  const scored = files.map((path) => {
    const lower = path.toLowerCase();
    let score = 0;
    for (const term of terms) if (lower.includes(term)) score += 4;
    if (/api|src|components|pages|app/.test(lower)) score += 1;
    if (/test|node_modules|lock|dist/.test(lower)) score -= 5;
    return { path, score };
  }).sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, 10).map((x) => x.path);
  for (const preferred of ['package.json', 'vercel.json']) {
    if (files.includes(preferred) && !selected.includes(preferred)) selected.push(preferred);
  }

  const context = [];
  for (const path of selected.slice(0, 12)) {
    try {
      const blob = await githubJson(`/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=main`, token);
      if (blob?.content) {
        const content = Buffer.from(blob.content, 'base64').toString('utf8');
        context.push({ path, content: content.slice(0, 30000) });
      }
    } catch {
      // One unreadable context file must not block the build.
    }
  }
  return { tree: files.slice(0, 600), files: context };
}

async function generateBuild({ message, repositoryContext, apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('OPENAI_API_KEY_REQUIRED');

  const response = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_output_tokens: 14000,
      input: [
        {
          role: 'system',
          content: [{
            type: 'input_text',
            text: `You are Reality's governed software builder. The user is explicitly asking Reality to build something in its canonical repository.

Generate a concrete implementation, not an explanation. Work from the supplied repository context. Preserve existing architecture and governance. Do not remove safety, authorization, evidence, verification, or production boundaries. Do not invent APIs that are not present when an existing module can be reused.

Return ONLY valid JSON:
{
  "objective": "short objective",
  "rationale": "why this change satisfies the request",
  "files": [{"path":"relative/path","content":"complete file contents"}],
  "tests": ["test command or test description"],
  "verificationPlan": ["how the result should be independently verified"]
}

Rules:
- Files must be complete contents, not patches.
- Paths are repository-relative and must not escape the repository.
- Prefer updating existing files when that is clearly required; otherwise add focused modules.
- Do not include secrets, tokens, credentials, or environment values.
- Keep the change as small as possible while actually satisfying the request.
- If the request cannot safely or truthfully be implemented from the supplied context, return files: [] and explain why in rationale.`,
          }],
        },
        {
          role: 'user',
          content: [{
            type: 'input_text',
            text: JSON.stringify({
              request: message,
              repository: REPO,
              repository_context: repositoryContext,
            }),
          }],
        },
      ],
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    const error = new Error(body?.error?.message || 'CHAT_BUILD_MODEL_FAILED');
    error.status = response.status;
    throw error;
  }

  const output = body?.output_text || (body?.output || [])
    .flatMap((item) => item?.content || [])
    .filter((item) => item?.type === 'output_text')
    .map((item) => item.text)
    .join('');

  const plan = parseJson(output);
  if (!text(plan.objective) || !Array.isArray(plan.files) || !plan.files.length) {
    throw new Error('CHAT_BUILD_NO_IMPLEMENTATION');
  }
  return plan;
}

export function isChatBuildRequest(message) {
  return /^(build|create|implement|add|make|fix|modify|change)\b/i.test(text(message))
    || /\b(build|implement|add|create)\s+(this|that|it|a|an|the)\b/i.test(text(message));
}

export async function buildFromChat({ message, requestedBy = 'chat_user', authorizationRef = null } = {}) {
  if (!isChatBuildRequest(message)) return null;

  const repositoryContext = await loadRepositoryContext(message);
  const plan = await generateBuild({ message, repositoryContext });

  const authorization = authorizationRef || `chat-build:${requestId(text(message))}`;
  const proposal = createSelfBuildProposal({
    requestedBy,
    objective: plan.objective,
    rationale: plan.rationale,
    files: plan.files,
    tests: Array.isArray(plan.tests) ? plan.tests : [],
    baseRef: 'main',
    riskLevel: 'low',
    verificationPlan: Array.isArray(plan.verificationPlan) ? plan.verificationPlan : [],
  });

  // The user's explicit "build/create/implement..." message is authorization
  // for this bounded self-build operation only: create an isolated branch and
  // PR. It never grants production merge or deployment authority.
  const authorized = authorizeSelfBuild(proposal, {
    authorizationRef: authorization,
    authorizedBy: requestedBy,
    allowedOperation: 'github:write_isolated_build_branch',
  });

  const result = await executeSelfBuild(authorized, {
    provider: createGitHubSelfBuildProvider(),
  });

  return {
    version: CHAT_BUILD_VERSION,
    status: result.state,
    build_id: result.build_id,
    objective: result.objective,
    branch: result.branch,
    commit_sha: result.commit_sha,
    pull_request: result.pull_request,
    authorization: {
      ref: result.authorization_ref,
      scope: result.allowed_operation,
      production_merge_permitted: false,
    },
  };
}
