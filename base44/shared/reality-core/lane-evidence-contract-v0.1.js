// Reality Lane Evidence Contract v0.1
// Structured, non-authoritative output emitted by every analysis lane.
// Model-generated analysis is never promoted to independent evidence.

export const LANE_EVIDENCE_CONTRACT_VERSION = 'reality-lane-evidence-contract-v0.1';

export const LANE_EVIDENCE_FIELDS = Object.freeze([
  'observations',
  'supported_claims',
  'unsupported_claims',
  'unresolved_items',
  'contradictions',
  'missing_evidence',
  'authority_findings',
  'verification_requirements',
  'analysis',
]);

function cleanList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

function cleanText(value) {
  return String(value ?? '').trim();
}

export function emptyLaneEvidence() {
  return Object.freeze({
    schema_version: LANE_EVIDENCE_CONTRACT_VERSION,
    observations: [],
    supported_claims: [],
    unsupported_claims: [],
    unresolved_items: [],
    contradictions: [],
    missing_evidence: [],
    authority_findings: [],
    verification_requirements: [],
    analysis: '',
  });
}

export function normalizeLaneEvidence(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.freeze({
    schema_version: LANE_EVIDENCE_CONTRACT_VERSION,
    observations: cleanList(source.observations),
    supported_claims: cleanList(source.supported_claims),
    unsupported_claims: cleanList(source.unsupported_claims),
    unresolved_items: cleanList(source.unresolved_items),
    contradictions: cleanList(source.contradictions),
    missing_evidence: cleanList(source.missing_evidence),
    authority_findings: cleanList(source.authority_findings),
    verification_requirements: cleanList(source.verification_requirements),
    analysis: cleanText(source.analysis),
  });
}

function extractJsonObject(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\\s*\`\`\`/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  }
  return null;
}

export function parseLaneEvidence(text) {
  const parsed = extractJsonObject(text);
  if (!parsed) {
    return Object.freeze({
      ...emptyLaneEvidence(),
      analysis: String(text ?? '').trim(),
      parse_status: 'UNSTRUCTURED_FALLBACK',
    });
  }
  return Object.freeze({
    ...normalizeLaneEvidence(parsed),
    parse_status: 'STRUCTURED',
  });
}

export function laneEvidenceForPrompt(evidence) {
  return JSON.stringify(normalizeLaneEvidence(evidence), null, 2);
}

export function materialEpistemicState(evidence) {
  const e = normalizeLaneEvidence(evidence);
  return JSON.stringify({
    supported_claims: e.supported_claims,
    unsupported_claims: e.unsupported_claims,
    unresolved_items: e.unresolved_items,
    contradictions: e.contradictions,
    missing_evidence: e.missing_evidence,
    authority_findings: e.authority_findings,
    verification_requirements: e.verification_requirements,
  });
}

export function materialStateChanged(before, after) {
  return materialEpistemicState(before) !== materialEpistemicState(after);
}