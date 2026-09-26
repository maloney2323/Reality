import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import {
  REALITY_OPENAI_CODING_MODEL,
  invokeOpenAiStructured,
} from '../../shared/reality-core/direct-model-provider.js';
import { githubJsonResponse as json } from '../../shared/reality-core/github-client.ts';
import {
  cleanFragmentedSignals,
  SIGNAL_CLEANER_VERSION,
} from '../../shared/reality-core/fragmented-signal-cleaner.js';

const VERSION = 'reality-business-inspect-v0.2';
const CATEGORIES = ['STRENGTH', 'WEAKNESS', 'RISK', 'UPGRADE', 'ADD', 'OPPORTUNITY'];
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];
const CONFIDENCE = ['HIGH', 'MEDIUM', 'LOW'];

const RESULT_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    headline: { type: 'string' },
    overall_state: { type: 'string', enum: ['STRONG_BUT_INCOMPLETE', 'HEALTHY_WITH_GAPS', 'ATTENTION_NEEDED', 'INSUFFICIENT_EVIDENCE'] },
    executive_summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: CATEGORIES },
          title: { type: 'string' },
          summary: { type: 'string' },
          why_it_matters: { type: 'string' },
          priority: { type: 'string', enum: PRIORITIES },
          confidence: { type: 'string', enum: CONFIDENCE },
          evidence_refs: { type: 'array', items: { type: 'string' } },
          evidence_gap: { type: 'string' },
          recommended_next_step: { type: 'string' },
        },
        required: ['category', 'title', 'summary', 'why_it_matters', 'priority', 'confidence', 'evidence_refs', 'evidence_gap', 'recommended_next_step'],
      },
    },
  },
  required: ['headline', 'overall_state', 'executive_summary', 'findings'],
});

function clip(value: unknown, max = 1800) {
  return String(value ?? '').trim().slice(0, max);
}

function asData(result: any) {
  return result?.data ?? result ?? {};
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function evidenceSignals(items: Array<{ ref: string; source: string; text: string }>) {
  return items.slice(0, 90).map((item, index) => ({
    signal_id: `business-inspection-signal:${String(index + 1).padStart(3, '0')}`,
    admission_ref: item.ref,
    source_ref: `business-inspection:${item.source}`,
    provenance_ref: item.ref,
    content: item.text,
    observed_at: null,
    received_at: null,
    admitted_at: null,
    disclosure_state: 'UNSPECIFIED',
    adapter_metadata: {
      source_kind: item.source,
    },
  }));
}

function providerEvidence(worldInspection: any) {
  const items: Array<{ ref: string; source: string; text: string }> = [];
  const candidates = Array.isArray(worldInspection?.connected_source_candidates)
    ? worldInspection.connected_source_candidates
    : [];
  for (const source of candidates) {
    if (source?.read_executed !== true) continue;
    const provider = clip(source?.provider || source?.plugin_slug || 'provider', 120).toLowerCase();
    const evidence = Array.isArray(source?.evidence) ? source.evidence : [];
    if (!evidence.length) {
      items.push({
        ref: `provider:${provider}`,
        source: provider,
        text: clip(source?.reason || `${provider} readability established, but this bounded read returned no content rows.`),
      });
      continue;
    }
    evidence.slice(0, 8).forEach((row: unknown, index: number) => {
      items.push({
        ref: `provider:${provider}:${index + 1}`,
        source: provider,
        text: clip(row),
      });
    });
  }
  return items;
}

function selfCodeEvidence(worldInspection: any) {
  const refs: Array<{ ref: string; source: string; text: string }> = [];
  const inspection = worldInspection?.self_inspection || {};
  const matches = Array.isArray(inspection?.matches) ? inspection.matches : [];
  for (const match of matches.slice(0, 16)) {
    const codeRefs = Array.isArray(match?.code_refs) ? match.code_refs : [];
    for (const path of codeRefs.slice(0, 4)) {
      const ref = clip(path, 500);
      if (!ref) continue;
      refs.push({ ref, source: 'reality-code', text: clip(match?.summary || match?.fact || match?.description || `Indexed Reality source: ${ref}`) });
    }
  }
  const files = Array.isArray(worldInspection?.code_intelligence?.files) ? worldInspection.code_intelligence.files : [];
  for (const file of files.slice(0, 20)) {
    const ref = clip(file?.path || file?.file_path, 500);
    if (!ref) continue;
    refs.push({ ref, source: 'reality-code', text: clip(file?.summary || file?.purpose || `Indexed Reality source: ${ref}`) });
  }
  return refs;
}

function assessmentEvidence(codeAssessment: any) {
  const items: Array<{ ref: string; source: string; text: string }> = [];
  const findings = Array.isArray(codeAssessment?.findings) ? codeAssessment.findings : [];
  findings.slice(0, 10).forEach((finding: any, findingIndex: number) => {
    const refs = Array.isArray(finding?.evidence_refs) ? finding.evidence_refs : [];
    if (!refs.length) {
      items.push({
        ref: `code-assessment:${findingIndex + 1}`,
        source: 'code-assessment',
        text: clip(`${finding?.category || ''}: ${finding?.subject || ''} — ${finding?.summary || ''}`),
      });
      return;
    }
    refs.slice(0, 5).forEach((refValue: unknown) => {
      const ref = clip(refValue, 500);
      if (!ref) return;
      items.push({
        ref,
        source: 'code-assessment',
        text: clip(`${finding?.category || ''}: ${finding?.subject || ''} — ${finding?.summary || ''}`),
      });
    });
  });
  return items;
}

function coverage(worldInspection: any) {
  const candidates = Array.isArray(worldInspection?.connected_source_candidates)
    ? worldInspection.connected_source_candidates
    : [];
  const byProvider: Record<string, any> = {};
  for (const provider of ['base44', 'github', 'vercel', 'gmail']) {
    const candidate = candidates.find((row: any) => String(row?.provider || row?.plugin_slug || '').toLowerCase().includes(provider));
    byProvider[provider] = {
      connected: provider === 'base44' ? true : candidate?.connected === true,
      read_executed: provider === 'base44' ? true : candidate?.read_executed === true,
      readability_established: provider === 'base44' ? true : candidate?.readability_established === true,
      completeness_established: candidate?.completeness_established === true,
      reason: clip(candidate?.reason || (provider === 'base44' ? 'Base44 is inherent to the authenticated Reality session.' : 'No bounded provider observation was returned.'), 600),
    };
  }
  return byProvider;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const principal = await base44.auth.me();
    if (!principal?.id) return json({ error: 'Authentication required.' }, 401);
    if (principal.role !== 'admin') return json({ error: 'Admin access required.' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = clip(body?.action || 'status', 80);
    if (action === 'status') {
      return json({
        ok: true,
        version: VERSION,
        mode: 'READ_ONLY_BUSINESS_SELF_INSPECTION',
        categories: CATEGORIES,
        sources: ['base44', 'github', 'vercel', 'gmail_when_relevant'],
        action_authorized: false,
        write_authorized: false,
        deploy_authorized: false,
      });
    }
    if (action !== 'inspect') return json({ error: 'Unknown action. Use status or inspect.' }, 400);

    const focus = clip(body?.focus, 2000);
    const worldId = clip(body?.world_id || 'personal:self', 220);
    const inspectionMessage = [
      'Perform a read-only business and product health inspection of Reality.',
      'Inspect GitHub, Vercel, and Base44 where readable. Use Gmail only if relevant and authorized.',
      'Look for supported strengths, weaknesses, risks, missing capabilities, upgrades, and opportunities.',
      'Do not write code, deploy, change settings, or authorize action.',
      focus ? `Focus requested by builder: ${focus}` : '',
    ].filter(Boolean).join(' ');

    const [worldResult, codeResult] = await Promise.all([
      base44.functions.invoke('world-inspection-plan', {
        message: inspectionMessage,
        world_id: worldId,
        conversation_id: `business-inspect:${crypto.randomUUID()}`,
        thought_id: `business-inspect:${crypto.randomUUID()}`,
      }),
      base44.functions.invoke('reality-code-assess', {
        action: 'assess',
        focus: focus || 'Overall product and business-readiness weaknesses, strengths, missing capabilities, upgrade needs, reliability risks, and leverage opportunities.',
        research_market: false,
      }),
    ]);

    const worldInspection = asData(worldResult);
    const codeAssessment = asData(codeResult);
    if (worldInspection?.error) return json({ error: 'World inspection failed.', diagnostic: clip(worldInspection.error, 800) }, 502);
    if (codeAssessment?.error) return json({ error: 'Code assessment failed.', diagnostic: clip(codeAssessment.error, 800) }, 502);

    const evidenceItems = [
      ...providerEvidence(worldInspection),
      ...selfCodeEvidence(worldInspection),
      ...assessmentEvidence(codeAssessment),
    ].filter((item) => item.ref && item.text);
    const sourceCoverage = coverage(worldInspection);

    const signalPacket = evidenceItems.length
      ? cleanFragmentedSignals({
          packet_id: `business-inspection:${crypto.randomUUID()}`,
          signals: evidenceSignals(evidenceItems),
          reconciled_at: new Date().toISOString(),
        })
      : null;
    const canonicalEvidence = (signalPacket?.observations || []).slice(0, 70).map((observation: any) => ({
      ref: clip(observation?.provenance_ref || observation?.attributes?.admission_ref || observation?.id, 500),
      source: clip(observation?.source_ref || 'unknown', 160),
      text: clip(observation?.content, 1800),
    })).filter((item: any) => item.ref && item.text);
    const allowedRefs = new Set(canonicalEvidence.map((item: any) => item.ref));

    const evidenceText = canonicalEvidence.length
      ? canonicalEvidence.map((item: any) => `[${item.ref}] (${item.source}) ${item.text}`).join('\n')
      : '(No detailed bounded evidence rows were returned.)';
    const unresolvedConflicts = Array.isArray(signalPacket?.conflicts) ? signalPacket.conflicts : [];

    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) return json({ error: 'OPENAI_API_KEY_NOT_CONFIGURED' }, 503);

    const prompt = `You are Reality's read-only Business Self-Inspector. You do not execute changes. You synthesize only the supplied evidence into a builder-facing business/product health review.

BUILDER FOCUS:
${focus || 'Overall Reality business/product readiness.'}

SOURCE COVERAGE (readability is not completeness):
${JSON.stringify(sourceCoverage)}

BOUNDED EVIDENCE:
${evidenceText}

CODE-ASSESS FINDINGS (candidate evidence, not automatically true):
${JSON.stringify((codeAssessment?.findings || []).slice(0, 10))}

SIGNAL CLEANER STATE:
- cleaner_version: ${SIGNAL_CLEANER_VERSION}
- canonical_observations: ${signalPacket?.metadata?.canonical_observation_count || 0}
- exact_same_source_repeats_removed: ${signalPacket?.metadata?.exact_repeat_count || 0}
- unresolved_structured_conflicts: ${unresolvedConflicts.length}
- source_independence_inferred: false
- semantic_promotion_authorized: false
${unresolvedConflicts.length ? `UNRESOLVED CONFLICTS:\n${JSON.stringify(unresolvedConflicts)}` : ''}

Produce a concise, decision-useful inspection with at most 12 findings total. Use these categories only: STRENGTH, WEAKNESS, RISK, UPGRADE, ADD, OPPORTUNITY.

Rules:
- Every finding MUST cite one or more exact evidence refs shown in brackets above. Never invent refs.
- A source being connected or readable does NOT establish completeness.
- The Signal Cleaner canonicalizes representation only. It does NOT establish truth, source independence, causal meaning, confidence, authority, or a winning value.
- Never silently resolve a conflict surfaced by the Signal Cleaner. Preserve it as an evidence gap or risk unless separate evidence genuinely resolves it.
- Distinguish an implemented capability from runtime proof and from commercial validation.
- Do not call something a business strength solely because code exists; explain the operational or product significance that the evidence supports.
- Do not infer customer demand, revenue, retention, conversion, profitability, or market leadership unless evidence explicitly supports it.
- If a conclusion would require missing customer/payment/usage/analytics evidence, say so in evidence_gap.
- Recommended next step must be bounded and practical. Do not execute it.
- Prefer fewer strong findings over filler.
- overall_state = INSUFFICIENT_EVIDENCE if evidence is too thin; otherwise choose the best supported state.

Return only the schema object.`;

    const modelResult: any = await invokeOpenAiStructured({
      apiKey,
      prompt,
      response_json_schema: RESULT_SCHEMA,
      schemaName: 'reality_business_inspection',
      model: REALITY_OPENAI_CODING_MODEL,
      reasoningEffort: 'medium',
    });

    const rawFindings = Array.isArray(modelResult?.findings) ? modelResult.findings : [];
    const findings = rawFindings.slice(0, 12).map((finding: any) => {
      const refs = unique((Array.isArray(finding?.evidence_refs) ? finding.evidence_refs : [])
        .map((ref: unknown) => clip(ref, 500))
        .filter((ref: string) => allowedRefs.has(ref)));
      return {
        category: CATEGORIES.includes(finding?.category) ? finding.category : 'RISK',
        title: clip(finding?.title, 240),
        summary: clip(finding?.summary, 1400),
        why_it_matters: clip(finding?.why_it_matters, 1000),
        priority: PRIORITIES.includes(finding?.priority) ? finding.priority : 'MEDIUM',
        confidence: CONFIDENCE.includes(finding?.confidence) ? finding.confidence : 'LOW',
        evidence_refs: refs,
        evidence_gap: clip(finding?.evidence_gap, 900),
        recommended_next_step: clip(finding?.recommended_next_step, 1000),
      };
    }).filter((finding: any) => finding.title && finding.summary && finding.evidence_refs.length > 0);

    return json({
      ok: true,
      version: VERSION,
      inspected_at: new Date().toISOString(),
      focus: focus || null,
      headline: clip(modelResult?.headline || 'Reality business inspection', 260),
      overall_state: modelResult?.overall_state || (findings.length ? 'HEALTHY_WITH_GAPS' : 'INSUFFICIENT_EVIDENCE'),
      executive_summary: clip(modelResult?.executive_summary, 1800),
      findings,
      source_coverage: sourceCoverage,
      evidence_item_count: canonicalEvidence.length,
      signal_cleaner: signalPacket ? {
        version: SIGNAL_CLEANER_VERSION,
        packet_id: signalPacket.packet_id,
        input_signal_count: signalPacket.metadata?.input_signal_count || 0,
        canonical_observation_count: signalPacket.metadata?.canonical_observation_count || 0,
        exact_repeat_count: signalPacket.metadata?.exact_repeat_count || 0,
        unresolved_conflict_count: unresolvedConflicts.length,
        independence_policy: signalPacket.metadata?.independence_policy || 'NOT_INFERRED',
        semantic_policy: signalPacket.metadata?.semantic_policy || 'NO_SEMANTIC_PROMOTION',
        authority: signalPacket.metadata?.authority || 'CANONICALIZATION_ONLY',
      } : null,
      provider_content_read_count: Number(worldInspection?.provider_content_read_count || 0),
      repository_read_executed: worldInspection?.repository_read_executed === true,
      governance: {
        authority: 'READ_ONLY_BUSINESS_SELF_INSPECTION',
        truth_authorized: false,
        write_authorized: false,
        action_authorized: false,
        deploy_authorized: false,
        external_effects_permitted: false,
      },
    });
  } catch (error: any) {
    console.error('reality-business-inspect failed', error);
    return json({
      error: 'Reality could not complete the business inspection.',
      diagnostic: clip(error?.message || String(error), 1200),
      action_authorized: false,
      write_authorized: false,
    }, 500);
  }
}