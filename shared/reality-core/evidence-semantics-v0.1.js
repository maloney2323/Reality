// Reality Evidence Semantics v0.1
//
// Deterministic evidence identity / co-reference detection for the Reality
// Development Governance observation layer.
//
// PURPOSE
//   The observation engine previously counted every entry in a capability's
//   contradiction_evidence_refs as a separate contradiction. Two references that
//   point to the SAME underlying artifact (e.g. a benchmark-run handle and the
//   GitHub artifact handle that the same run produced) were counted as two
//   contradictions, inflating contradiction burden.
//
//   This module resolves evidence references to deterministic identities,
//   deduplicates co-referring handles, and classifies the relationship between
//   references — without re-litigating the capability ledger's claim
//   relationship. Multiple references to the same underlying artifact are
//   NEVER counted as multiple contradictions.
//
// RELATIONSHIPS
//   COUNTER_EVIDENCE        — evidence that conflicts with the capability claim
//   CORROBORATING_EVIDENCE  — multiple refs pointing to compatible evidence
//   SAME_EVIDENCE_REFERENCE — multiple handles/records for one underlying artifact
//   INDEPENDENT_EVIDENCE    — evidence from an independent source/measurement
//   UNRESOLVED_EVIDENCE     — relationship to the claim cannot yet be established
//
// GOVERNING RULE
//   A contradiction may only be recorded when there is an actual conflict
//   between evidence and the claim, or between independently meaningful
//   evidence items. Multiple references to the same underlying artifact MUST
//   NOT be counted as multiple contradictions. All original references are
//   preserved for auditability; only the contradiction *burden* is corrected.

export const EVIDENCE_SEMANTICS_VERSION = 'reality-evidence-semantics-v0.1';

export const EvidenceRelationship = Object.freeze({
  COUNTER_EVIDENCE: 'COUNTER_EVIDENCE',
  CORROBORATING_EVIDENCE: 'CORROBORATING_EVIDENCE',
  SAME_EVIDENCE_REFERENCE: 'SAME_EVIDENCE_REFERENCE',
  INDEPENDENT_EVIDENCE: 'INDEPENDENT_EVIDENCE',
  UNRESOLVED_EVIDENCE: 'UNRESOLVED_EVIDENCE',
});

function unionFind() {
  const parent = new Map();
  function find(x) {
    if (!parent.has(x)) { parent.set(x, x); return x; }
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r);
    let cur = x;
    while (parent.get(cur) !== r) {
      const next = parent.get(cur);
      parent.set(cur, r);
      cur = next;
    }
    return r;
  }
  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  return { find, union };
}

// Extract deterministic identifiers from a single evidence ref string.
// Identifiers are namespaced by type so a run-id and an artifact-id never merge
// merely because they happen to share a numeric value.
export function parseEvidenceIdentifiers(ref) {
  const raw = String(ref || '');
  const ids = { run_ids: [], artifact_ids: [], digests: [], record_ids: [] };
  let m;
  if ((m = raw.match(/^benchmark-run:.+?:(\d{6,})/))) ids.run_ids.push(m[1]);
  if ((m = raw.match(/^github-actions-run:(\d{6,})/))) ids.run_ids.push(m[1]);
  if ((m = raw.match(/^github-artifact:(\d{6,})/))) ids.artifact_ids.push(m[1]);
  const digestRe = /\b[0-9a-f]{64}\b/gi;
  while ((m = digestRe.exec(raw)) !== null) ids.digests.push(m[0].toLowerCase());
  const recRe = /\b[0-9a-f]{24}\b/gi;
  while ((m = recRe.exec(raw)) !== null) {
    const v = m[0].toLowerCase();
    // Skip if this 24-hex is a substring of an already-captured 64-hex digest.
    if (!ids.digests.some((d) => d.includes(v))) ids.record_ids.push(v);
  }
  return ids;
}

// Resolve a list of evidence refs into equivalence groups. Two refs join the
// same group when they share a namespaced identifier (obvious alias) OR when
// they co-appear in one SelfEvidenceEvent's evidence_refs (same underlying
// provenance event — e.g. a benchmark run and the GitHub artifact it produced).
export function resolveEvidenceEquivalence(refs, evidenceEvents = []) {
  const uf = unionFind();
  const refSet = [...new Set((refs || []).filter(Boolean))];
  for (const r of refSet) uf.find(r);

  const idToRef = new Map();
  const keyOf = (type, val) => `${type}:${val}`;
  for (const r of refSet) {
    const ids = parseEvidenceIdentifiers(r);
    for (const type of ['run', 'artifact', 'digest', 'record']) {
      const vals = type === 'run' ? ids.run_ids : type === 'artifact' ? ids.artifact_ids : type === 'digest' ? ids.digests : ids.record_ids;
      for (const v of vals) {
        const k = keyOf(type, v);
        if (idToRef.has(k)) uf.union(idToRef.get(k), r);
        else idToRef.set(k, r);
      }
    }
  }

  for (const evt of evidenceEvents || []) {
    const erefs = (evt?.evidence_refs || []).filter((x) => refSet.includes(x));
    for (let i = 1; i < erefs.length; i++) uf.union(erefs[0], erefs[i]);
  }

  const groups = new Map();
  for (const r of refSet) {
    const root = uf.find(r);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(r);
  }
  return [...groups.values()].map((members) => [...members].sort());
}

// Classify a set of evidence refs. `claimRelationship` is the capability
// ledger's asserted relationship of the UNDERLYING evidence to the claim
// (COUNTER_EVIDENCE for contradiction_refs, CORROBORATING_EVIDENCE for
// certification refs). This module does not re-litigate that assertion; it
// deduplicates co-referring handles and flags identities it cannot resolve.
export function classifyEvidenceRefs(refs, { claimRelationship, evidenceEvents = [] } = {}) {
  const groups = resolveEvidenceEquivalence(refs, evidenceEvents);
  const classified = groups.map((members) => {
    const ids = members.reduce((acc, r) => {
      const p = parseEvidenceIdentifiers(r);
      acc.run_ids.push(...p.run_ids);
      acc.artifact_ids.push(...p.artifact_ids);
      acc.digests.push(...p.digests);
      acc.record_ids.push(...p.record_ids);
      return acc;
    }, { run_ids: [], artifact_ids: [], digests: [], record_ids: [] });
    const resolvable = !!(ids.run_ids.length || ids.artifact_ids.length || ids.digests.length || ids.record_ids.length);
    const coRef = members.length > 1;
    const claimRel = resolvable ? claimRelationship : EvidenceRelationship.UNRESOLVED_EVIDENCE;
    return {
      canonical_id: members[0],
      member_refs: members,
      member_count: members.length,
      co_reference_detected: coRef,
      within_group_relationship: coRef ? EvidenceRelationship.SAME_EVIDENCE_REFERENCE : 'SINGLE_REFERENCE',
      identity_resolvable: resolvable,
      identifiers: ids,
      claim_relationship: claimRel,
    };
  });
  const burden = classified.filter((g) => g.claim_relationship === EvidenceRelationship.COUNTER_EVIDENCE).length;
  return {
    record_version: EVIDENCE_SEMANTICS_VERSION,
    original_ref_count: (refs || []).filter(Boolean).length,
    distinct_evidence_count: classified.length,
    contradiction_burden: claimRelationship === EvidenceRelationship.COUNTER_EVIDENCE ? burden : null,
    unresolved_count: classified.filter((g) => g.claim_relationship === EvidenceRelationship.UNRESOLVED_EVIDENCE).length,
    co_reference_detected: classified.some((g) => g.co_reference_detected),
    groups: classified,
  };
}

// Convenience: deduplicated contradiction burden for a capability's
// contradiction_evidence_refs. Returns { burden, co_reference_detected,
// distinct_count, original_count, groups }.
export function computeContradictionBurden(contradictionRefs, evidenceEvents = []) {
  const sem = classifyEvidenceRefs(contradictionRefs, { claimRelationship: EvidenceRelationship.COUNTER_EVIDENCE, evidenceEvents });
  return {
    burden: sem.contradiction_burden,
    co_reference_detected: sem.co_reference_detected,
    distinct_count: sem.distinct_evidence_count,
    original_count: sem.original_ref_count,
    unresolved_count: sem.unresolved_count,
    groups: sem.groups,
  };
}