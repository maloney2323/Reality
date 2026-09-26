import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import {
  REALITY_OPENAI_CODING_MODEL,
  invokeOpenAiStructured,
} from '../../shared/reality-core/direct-model-provider.js';
import {
  REALITY_CODE_FILES,
  REALITY_CODE_TREE_HASH,
} from '../../shared/personal-reality/generated-code-index.js';
import { SELF_MODEL_FACTS, SELF_MODEL_VERSION } from '../../shared/personal-reality/self-model.js';
import {
  ArtifactStatus,
  ArtifactType,
  DERIVED_ARTIFACT_AUTHORITY,
  normalizeDerivedArtifact,
} from '../../shared/personal-reality/derived-artifact-contract.js';
import { githubJsonResponse as json } from '../../shared/reality-core/github-client.ts';

// Reality Code Assess v0.1 — READ AND ASSESS ONLY.
// Reads Reality's own code (embedded source pack + Self Model), optionally
// researches the market, and produces bounded findings: upgrades needed,
// additions needed, removal candidates, bugs to watch, market shifts.
// No code is changed. action_authorized stays false. Findings are non-authoritative.

const FUNCTION_VERSION = 'reality-code-assess-v0.1';
const MAX_FINDINGS = 10;
const CATEGORIES = ['UPGRADE_NEEDED', 'ADD_NEEDED', 'REMOVE_CANDIDATE', 'BUG_WATCH', 'MARKET_SHIFT'];

const FINDINGS_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: CATEGORIES },
          subject: { type: 'string' },
          summary: { type: 'string' },
          evidence_refs: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          what_would_change_it: { type: 'array', items: { type: 'string' } },
          materiality: { type: 'string' },
        },
        required: ['category', 'subject', 'summary', 'evidence_refs', 'confidence'],
      },
    },
  },
  required: ['findings'],
});

function buildStructureOverview(sources) {
  const byDir = {};
  for (const s of sources) {
    const dir = String(s.path).split('/')[0] || 'root';
    (byDir[dir] ||= []).push(s.path);
  }
  return Object.entries(byDir)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([dir, paths]) => `${dir}/ (${paths.length}) — ${paths.slice(0, 2).join(', ')}${paths.length > 2 ? ', …' : ''}`)
    .join('\n');
}

function renderSelfModel(facts) {
  try {
    return JSON.stringify(facts).slice(0, 12000);
  } catch {
    return String(facts).slice(0, 12000);
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const principal = await base44.auth.me();
    if (!principal?.id) return json({ error: 'Authentication required.' }, 401);
    if (principal.role !== 'admin') return json({ error: 'Admin access required.' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || 'status').trim();

    if (action === 'status') {
      return json({
        schema: 'reality.code-assess.v0.1',
        version: FUNCTION_VERSION,
        mode: 'READ_AND_ASSESS_ONLY',
        action_authorized: false,
        code_changed: false,
        description: "Reads Reality's own code (source pack + Self Model), optionally researches the market, and produces bounded findings: upgrades, additions, removals, bugs, market shifts. Read-only — no code changes.",
        categories: CATEGORIES,
        optional_inputs: ['focus', 'research_market (default true)'],
      });
    }
    if (action !== 'assess') return json({ error: 'Unknown action. Use status or assess.' }, 400);

    const focus = String(body?.focus || '').trim().slice(0, 2000);
    const researchMarket = body?.research_market !== false;
    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) return json({ error: 'OPENAI_API_KEY_NOT_CONFIGURED' }, 503);

    const structureOverview = buildStructureOverview(REALITY_CODE_FILES);
    const selfModelText = renderSelfModel(SELF_MODEL_FACTS);

    // Optional market research via web-grounded LLM (gemini supports add_context_from_internet).
    let marketBriefing = '';
    if (researchMarket) {
      try {
        const marketPrompt = `You are researching the technology and market landscape (as of late 2026) for an "evidence-authorization layer for autonomous AI" — a platform called Reality, built on Base44 (React + Vite + Tailwind, serverless backend functions, GitHub, Vercel, Gmail/Google Calendar connectors), that governs AI code changes via grounded candidates and human-merged pull requests.

Identify concisely:
1. Any deprecated or end-of-life dependencies or runtimes in this stack.
2. Important library/platform upgrades worth adopting.
3. Relevant market shifts: AI coding agents, evidence/verification/governance for AI, autonomous action authorization.
4. Emerging capabilities this kind of product is expected to have.

Return a tight briefing (under 400 words). Cite sources where possible.`;
        const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: marketPrompt,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
        });
        marketBriefing = typeof res === 'string' ? res : String(res?.response || res?.text || res || '');
      } catch (e: any) {
        marketBriefing = `(Market research unavailable: ${e?.message || 'error'})`;
      }
    }

    const assessPrompt = `You are Reality's read-only code assessor. You are NOT an executor. You have no write, merge, deploy, or action authority.

You are assessing REALITY'S OWN CODEBASE. Your job: read the structural model and Self Model${researchMarket ? ', consider the market briefing, ' : ' and '}and produce bounded findings about what needs upgrading, what should be added, what could be removed, and bugs to watch. Every finding must cite concrete evidence (file paths from the structure below, or external market references).

${focus ? `FOCUS AREA:\n${focus}\n` : 'General assessment (no specific focus given).'}

SELF MODEL (capabilities + invariants, bounded JSON):
${selfModelText}

CODE STRUCTURE (${REALITY_CODE_FILES.length} source files, tree ${REALITY_CODE_TREE_HASH.slice(0, 12)}):
${structureOverview}
${marketBriefing ? `\nMARKET BRIEFING (external research, candidate evidence only — not verified truth):\n${marketBriefing}` : ''}

Produce up to ${MAX_FINDINGS} findings. Rules:
- category: UPGRADE_NEEDED (dependency/runtime upgrade), ADD_NEEDED (missing capability/test), REMOVE_CANDIDATE (dead/redundant code), BUG_WATCH (likely bug or fragility), MARKET_SHIFT (external shift affecting the code).
- evidence_refs: real file paths from the structure above, or external URLs from the briefing. Never invent paths.
- confidence: honest LOW/MEDIUM/HIGH. Default LOW for anything not directly visible in the structure.
- what_would_change_it: what would confirm or refute this finding.
- Do NOT propose code. Do NOT claim authority, execution, or that anything was changed.

Return only the schema object.`;

    const assessment: any = await invokeOpenAiStructured({
      apiKey,
      prompt: assessPrompt,
      response_json_schema: FINDINGS_SCHEMA,
      schemaName: 'reality_code_assess_findings',
      model: REALITY_OPENAI_CODING_MODEL,
      reasoningEffort: 'medium',
    });

    const findings = Array.isArray(assessment?.findings) ? assessment.findings.slice(0, MAX_FINDINGS) : [];
    if (!findings.length) return json({ error: 'Assessment produced no findings.' }, 502);

    // Persist a single governed, non-authoritative assessment artifact (audit trail).
    const now = new Date().toISOString();
    const artifact = normalizeDerivedArtifact({
      user_id: principal.id,
      artifact_group_id: `code-assess:${crypto.randomUUID()}`,
      admission_key: `code-assess:${now}`,
      version: 1,
      supersedes_id: null,
      artifact_type: ArtifactType.ENGINEERING_REVIEW,
      engine: 'reality-code-assess:read-only',
      subject: (focus || 'Reality codebase assessment').slice(0, 200),
      summary: `Read-only assessment produced ${findings.length} bounded finding(s): ${findings.map((f) => f.category).join(', ')}. No code was changed.`,
      evidence_refs: findings.flatMap((f) => (f.evidence_refs || []).slice(0, 4)).slice(0, 24),
      assumptions: ['Assessment is grounded in the indexed source structure + Self Model; the market briefing is candidate evidence only.'],
      what_would_change_it: ['A finding\'s cited evidence is shown to be inaccurate.', 'A runtime test contradicts a BUG_WATCH finding.'],
      horizon: null,
      as_of: now,
      materiality_level: 2,
      materiality_risks: ['CODE_CHANGE', 'CAPABILITY_CHANGE'],
      status: ArtifactStatus.CANDIDATE,
      outcome_ref: null,
      outcome_resolved: false,
      extension_data: {
        focus: focus || null,
        research_market: researchMarket,
        market_briefing_included: Boolean(marketBriefing),
        code_tree_hash: REALITY_CODE_TREE_HASH,
        self_model_version: SELF_MODEL_VERSION,
        findings,
        authority: 'READ_AND_ASSESS_ONLY',
        action_authorized: false,
        code_changed: false,
      },
      authority: DERIVED_ARTIFACT_AUTHORITY,
      produced_at: now,
    });
    const created = await base44.asServiceRole.entities.DerivedArtifact.create(artifact);

    return json({
      schema: 'reality.code-assess-result.v0.1',
      version: FUNCTION_VERSION,
      ok: true,
      assessment_artifact_id: created.id,
      focus: focus || null,
      research_market: researchMarket,
      findings,
      grounding: {
        code_source_verified: true,
        self_model_version: SELF_MODEL_VERSION,
        code_tree_hash: REALITY_CODE_TREE_HASH,
        market_research: researchMarket,
        authority: 'READ_AND_ASSESS_ONLY',
      },
      governance: {
        action_authorized: false,
        code_changed: false,
        merge_authorized: false,
        note: 'Read-only assessment. Findings are non-authoritative candidates; no code was changed.',
      },
    });
  } catch (error: any) {
    console.error('reality-code-assess failed', error);
    return json({ error: 'Reality could not complete the code assessment.', diagnostic: error?.message || String(error), action_authorized: false, code_changed: false }, 500);
  }
}