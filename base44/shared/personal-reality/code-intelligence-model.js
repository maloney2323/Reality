// Personal Reality Code Intelligence Model v0.1
//
// Deterministic structural model over Reality's generated repository metadata and
// builder-authored Self Model evidence refs. This model can establish structural
// relationships that are explicitly present in those inputs: indexed files,
// relative import edges, reverse dependencies, capability↔file evidence refs,
// test-file refs, hash-level snapshot changes, and bounded potential change
// impact. It does NOT establish source semantics, runtime behavior, breakage,
// change safety, author intent, or action authority.

export const CODE_INTELLIGENCE_MODEL_VERSION = 'reality-code-intelligence-model-v0.1';
export const CODE_INTELLIGENCE_AUTHORITY = 'STRUCTURAL_CODE_RELATIONSHIPS_ONLY';

const CODE_REF = /^(?:base44|src|android|\.github)\//;
const CODE_EXTENSION = /\.(?:js|jsx|ts|tsx|json|jsonc|kt|kts|xml|ya?ml)$/i;
const TEST_PATH = /(?:\.test\.[jt]sx?$|\/tests?\/)/i;
const RUNTIME_REF = /^(?:live-proof|runtime-proof|deployed-proof|prod-proof):/i;
const SOURCE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json', '.jsonc'];

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function uniqueSorted(values) {
  return [...new Set((values || []).filter(nonEmpty))].sort();
}

function normalizePath(value) {
  const parts = [];
  for (const part of String(value || '').replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

function dirname(path) {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(0, index) : '';
}

function isIndexedCodeRef(ref, indexed) {
  const value = String(ref || '').trim();
  return CODE_REF.test(value) && CODE_EXTENSION.test(value) && !value.includes('@') && indexed.has(value);
}

function isTestFile(file) {
  return file?.kind === 'TEST' || TEST_PATH.test(String(file?.path || ''));
}

function resolveLocalImport(fromPath, specifier, indexed) {
  if (!nonEmpty(specifier) || !specifier.trim().startsWith('.')) return null;
  const base = normalizePath(`${dirname(fromPath)}/${specifier.trim()}`);
  const candidates = [base];
  if (!/\.[a-z0-9]+$/i.test(base)) {
    for (const extension of SOURCE_EXTENSIONS) candidates.push(`${base}${extension}`);
    for (const extension of SOURCE_EXTENSIONS) candidates.push(`${base}/index${extension}`);
  }
  return candidates.find((candidate) => indexed.has(candidate)) || null;
}

function normalizeFile(file) {
  return Object.freeze({
    path: String(file?.path || '').trim(),
    sha256: String(file?.sha256 || '').trim(),
    bytes: Number(file?.bytes) || 0,
    kind: String(file?.kind || 'OTHER'),
    exports: freezeArray(uniqueSorted(file?.exports || [])),
    local_imports: freezeArray(uniqueSorted(file?.local_imports || [])),
  });
}

function buildImportEdges(files, indexed) {
  const edges = [];
  for (const file of files) {
    for (const specifier of file.local_imports || []) {
      const resolved = resolveLocalImport(file.path, specifier, indexed);
      edges.push(Object.freeze({
        from_path: file.path,
        import_specifier: specifier,
        to_path: resolved,
        resolution: resolved ? 'RESOLVED_INDEXED_FILE' : 'UNRESOLVED_LOCAL_IMPORT',
        authority: CODE_INTELLIGENCE_AUTHORITY,
      }));
    }
  }
  return Object.freeze(edges);
}

function reverseDependencyMap(files, edges) {
  const result = {};
  for (const file of files) result[file.path] = [];
  for (const edge of edges) {
    if (!edge.to_path) continue;
    if (!result[edge.to_path]) result[edge.to_path] = [];
    result[edge.to_path].push(edge.from_path);
  }
  for (const path of Object.keys(result)) result[path] = freezeArray(uniqueSorted(result[path]));
  return Object.freeze(result);
}

function capabilityRecords(selfModelFacts, indexed, fileByPath) {
  return Object.freeze((selfModelFacts || []).map((fact) => {
    const refs = Array.isArray(fact?.evidence_refs) ? fact.evidence_refs : [];
    const codeRefs = refs.filter((ref) => isIndexedCodeRef(ref, indexed));
    const sourceFiles = codeRefs.filter((ref) => !isTestFile(fileByPath.get(ref)));
    const testFiles = codeRefs.filter((ref) => isTestFile(fileByPath.get(ref)));
    const missingCodeRefs = refs
      .filter((ref) => CODE_REF.test(String(ref || '')) && CODE_EXTENSION.test(String(ref || '')) && !String(ref).includes('@'))
      .filter((ref) => !indexed.has(ref));
    const runtimeRefs = refs.filter((ref) => RUNTIME_REF.test(String(ref || '')));
    return Object.freeze({
      fact_id: String(fact?.id || ''),
      status: String(fact?.status || 'NOT_ESTABLISHED'),
      text: String(fact?.text || ''),
      source_files: freezeArray(uniqueSorted(sourceFiles)),
      test_files: freezeArray(uniqueSorted(testFiles)),
      missing_code_refs: freezeArray(uniqueSorted(missingCodeRefs)),
      runtime_refs: freezeArray(uniqueSorted(runtimeRefs)),
      runtime_established: runtimeRefs.length > 0,
      relationship_authority: 'SELF_MODEL_EVIDENCE_REF_ONLY',
    });
  }));
}

function fileCapabilityMap(files, capabilities) {
  const result = {};
  for (const file of files) result[file.path] = [];
  for (const capability of capabilities) {
    for (const path of [...capability.source_files, ...capability.test_files]) {
      if (!result[path]) result[path] = [];
      result[path].push(capability.fact_id);
    }
  }
  for (const path of Object.keys(result)) result[path] = freezeArray(uniqueSorted(result[path]));
  return Object.freeze(result);
}

export function buildCodeIntelligenceModel({
  codeFiles = [],
  selfModelFacts = [],
  codeTreeHash = null,
  codeIndexVersion = null,
} = {}) {
  const files = Object.freeze((codeFiles || []).filter((file) => nonEmpty(file?.path)).map(normalizeFile));
  const indexed = new Set(files.map((file) => file.path));
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const importEdges = buildImportEdges(files, indexed);
  const capabilities = capabilityRecords(selfModelFacts, indexed, fileByPath);
  const unresolvedImports = importEdges.filter((edge) => edge.resolution !== 'RESOLVED_INDEXED_FILE');

  return Object.freeze({
    version: CODE_INTELLIGENCE_MODEL_VERSION,
    authority: CODE_INTELLIGENCE_AUTHORITY,
    code_index_version: codeIndexVersion || null,
    code_tree_hash: codeTreeHash || null,
    indexed_file_count: files.length,
    capability_count: capabilities.length,
    import_edge_count: importEdges.length,
    unresolved_local_import_count: unresolvedImports.length,
    files,
    capabilities,
    import_edges: importEdges,
    reverse_dependencies: reverseDependencyMap(files, importEdges),
    file_capability_refs: fileCapabilityMap(files, capabilities),
    semantic_truth_established: false,
    runtime_established: false,
    breakage_established: false,
    change_safety_established: false,
    author_intent_established: false,
    code_write_authorized: false,
    governance_change_authorized: false,
    action_authorized: false,
  });
}

function snapshotIndex(files = []) {
  return new Map((files || []).filter((file) => nonEmpty(file?.path)).map((file) => [file.path, file]));
}

export function compareCodeSnapshots({ previousFiles = [], currentFiles = [] } = {}) {
  const previous = snapshotIndex(previousFiles);
  const current = snapshotIndex(currentFiles);
  const allPaths = uniqueSorted([...previous.keys(), ...current.keys()]);
  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];
  for (const path of allPaths) {
    const before = previous.get(path);
    const after = current.get(path);
    if (!before && after) added.push(path);
    else if (before && !after) removed.push(path);
    else if (String(before?.sha256 || '') !== String(after?.sha256 || '')) changed.push(path);
    else unchanged.push(path);
  }
  return Object.freeze({
    version: CODE_INTELLIGENCE_MODEL_VERSION,
    authority: CODE_INTELLIGENCE_AUTHORITY,
    previous_file_count: previous.size,
    current_file_count: current.size,
    added_paths: freezeArray(added),
    removed_paths: freezeArray(removed),
    changed_paths: freezeArray(changed),
    unchanged_path_count: unchanged.length,
    why_changed_established: false,
    semantic_change_established: false,
    action_authorized: false,
  });
}

function reverseClosureWithDistance(model, seeds, maxDepth = 4) {
  const seen = new Set(seeds);
  const distance = new Map();
  let frontier = [...seeds];
  for (let depth = 1; depth <= maxDepth && frontier.length; depth += 1) {
    const next = [];
    for (const path of frontier) {
      for (const dependent of model?.reverse_dependencies?.[path] || []) {
        if (seen.has(dependent)) continue;
        seen.add(dependent);
        distance.set(dependent, depth);
        next.push(dependent);
      }
    }
    frontier = next;
  }
  return distance;
}

export function inspectCodeChangeImpact({ model, changedPaths = [], maxDepth = 4 } = {}) {
  const knownPaths = new Set((model?.files || []).map((file) => file.path));
  const changed = uniqueSorted(changedPaths);
  const knownChanged = changed.filter((path) => knownPaths.has(path));
  const unresolved = changed.filter((path) => !knownPaths.has(path));
  const depthLimit = Math.max(1, Math.min(Number(maxDepth) || 4, 8));
  const downstreamDistance = reverseClosureWithDistance(model, knownChanged, depthLimit);
  const downstream = uniqueSorted([...downstreamDistance.keys()]);
  const affectedSet = new Set([...knownChanged, ...downstream]);

  const directCapabilityRefs = uniqueSorted((model?.capabilities || [])
    .filter((capability) => capability.source_files.some((path) => knownChanged.includes(path)))
    .map((capability) => capability.fact_id));
  const downstreamCapabilityImpacts = (model?.capabilities || [])
    .map((capability) => {
      const distances = capability.source_files
        .map((path) => downstreamDistance.get(path))
        .filter((value) => Number.isInteger(value));
      if (!distances.length) return null;
      return Object.freeze({
        fact_id: capability.fact_id,
        dependency_distance: Math.min(...distances),
        relationship: 'CAPABILITY_REFERENCES_DOWNSTREAM_DEPENDENT_FILE',
      });
    })
    .filter(Boolean)
    .sort((a, b) => a.dependency_distance - b.dependency_distance || a.fact_id.localeCompare(b.fact_id));
  const downstreamCapabilityRefs = uniqueSorted(downstreamCapabilityImpacts.map((item) => item.fact_id));
  const potentiallyAffectedCapabilities = uniqueSorted([...directCapabilityRefs, ...downstreamCapabilityRefs]);

  const relevantTests = uniqueSorted([
    ...(model?.capabilities || [])
      .filter((capability) => directCapabilityRefs.includes(capability.fact_id) || potentiallyAffectedCapabilities.includes(capability.fact_id))
      .flatMap((capability) => capability.test_files),
    ...(model?.files || [])
      .filter((file) => isTestFile(file) && affectedSet.has(file.path))
      .map((file) => file.path),
  ]);

  return Object.freeze({
    version: CODE_INTELLIGENCE_MODEL_VERSION,
    authority: CODE_INTELLIGENCE_AUTHORITY,
    changed_paths: freezeArray(changed),
    known_changed_paths: freezeArray(knownChanged),
    unresolved_changed_paths: freezeArray(unresolved),
    direct_capability_refs: freezeArray(directCapabilityRefs),
    downstream_capability_refs: freezeArray(downstreamCapabilityRefs),
    downstream_capability_impacts: Object.freeze(downstreamCapabilityImpacts),
    potentially_affected_capability_refs: freezeArray(potentiallyAffectedCapabilities),
    potentially_affected_files: freezeArray(downstream),
    relevant_tests: freezeArray(relevantTests),
    dependency_depth_limit: depthLimit,
    breakage_established: false,
    change_safety_established: false,
    semantic_change_established: false,
    author_intent_established: false,
    runtime_established: false,
    code_write_authorized: false,
    action_authorized: false,
  });
}

function tokens(value) {
  const stop = new Set(['about', 'actually', 'against', 'code', 'does', 'from', 'have', 'into', 'reality', 'that', 'this', 'what', 'where', 'which', 'with', 'your']);
  return [...new Set(String(value || '').toLowerCase().match(/[a-z0-9][a-z0-9_-]{2,}/g) || [])]
    .filter((token) => !stop.has(token));
}

function textScore(queryTokens, text) {
  const haystack = String(text || '').toLowerCase();
  let score = 0;
  for (const token of queryTokens) if (haystack.includes(token)) score += token.length >= 8 ? 3 : 1;
  return score;
}

export function queryCodeIntelligence({ model, message, maxCapabilities = 8, maxFiles = 24 } = {}) {
  const queryTokens = tokens(message);
  const capabilities = (model?.capabilities || [])
    .map((capability) => ({ capability, score: textScore(queryTokens, `${capability.fact_id} ${capability.text}`) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.capability.fact_id.localeCompare(b.capability.fact_id))
    .slice(0, Math.max(1, Math.min(Number(maxCapabilities) || 8, 20)))
    .map((item) => item.capability);

  const selectedPaths = new Set();
  for (const capability of capabilities) {
    for (const path of [...capability.source_files, ...capability.test_files]) selectedPaths.add(path);
  }
  const initial = [...selectedPaths];
  const asksForDownstream = /\b(?:what depends on|dependents?|used by|consumers?|downstream)\b/i.test(String(message || ''));
  const asksForDependencies = /\b(?:what does .* depend on|dependencies|imports?|uses?)\b/i.test(String(message || ''));
  if (asksForDownstream) {
    for (const path of initial) {
      for (const dependent of model?.reverse_dependencies?.[path] || []) selectedPaths.add(dependent);
    }
  }
  if (asksForDependencies) {
    for (const path of initial) {
      for (const edge of model?.import_edges || []) {
        if (edge.from_path === path && edge.to_path) selectedPaths.add(edge.to_path);
      }
    }
  }

  // If no Self Model capability matched, permit direct bounded file/symbol lookup.
  if (!selectedPaths.size && queryTokens.length) {
    const rankedFiles = (model?.files || [])
      .map((file) => ({ file, score: textScore(queryTokens, `${file.path} ${(file.exports || []).join(' ')}`) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path))
      .slice(0, Math.max(1, Math.min(Number(maxFiles) || 24, 50)));
    for (const item of rankedFiles) selectedPaths.add(item.file.path);
  }

  const boundedPaths = [...selectedPaths].sort().slice(0, Math.max(1, Math.min(Number(maxFiles) || 24, 50)));
  const boundedPathSet = new Set(boundedPaths);
  const files = (model?.files || []).filter((file) => boundedPathSet.has(file.path));
  const edges = (model?.import_edges || []).filter((edge) => boundedPathSet.has(edge.from_path) && (!edge.to_path || boundedPathSet.has(edge.to_path)));

  return Object.freeze({
    version: CODE_INTELLIGENCE_MODEL_VERSION,
    authority: CODE_INTELLIGENCE_AUTHORITY,
    query: String(message || '').slice(0, 12000),
    capabilities: Object.freeze(capabilities),
    files: Object.freeze(files),
    import_edges: Object.freeze(edges),
    complete_repository_dump: false,
    semantic_truth_established: false,
    runtime_established: false,
    action_authorized: false,
  });
}

export function codeIntelligenceForPrompt({ model, queryResult = null, impact = null } = {}) {
  if (!model) return 'CODE INTELLIGENCE MODEL: unavailable.';
  const capabilities = (queryResult?.capabilities || []).map((item) =>
    `- [self_fact:${item.fact_id}] ${item.status} | source ${item.source_files.join(' | ') || '(none)'} | tests ${item.test_files.join(' | ') || '(none)'} | ${item.text}`
  ).join('\n');
  const files = (queryResult?.files || []).map((item) =>
    `- ${item.path} | ${item.kind} | exports ${(item.exports || []).join(', ') || '(none)'}`
  ).join('\n');
  const edges = (queryResult?.import_edges || []).map((item) =>
    `- ${item.from_path} -> ${item.to_path || item.import_specifier} | ${item.resolution}`
  ).join('\n');
  const impactText = impact
    ? `\nCHANGE IMPACT CANDIDATE:\nChanged: ${impact.changed_paths.join(' | ') || '(none)'}\nDIRECT_STRUCTURAL capability refs: ${impact.direct_capability_refs.join(' | ') || '(none)'}\nDOWNSTREAM_EXPOSURE capability refs: ${impact.downstream_capability_refs.join(' | ') || '(none)'}\nPotential downstream files: ${impact.potentially_affected_files.join(' | ') || '(none)'}\nRelevant tests: ${impact.relevant_tests.join(' | ') || '(none)'}\nThis is structural potential impact only. Breakage, semantic change, change safety, runtime behavior, and author intent are NOT established.`
    : '';

  return `CODE INTELLIGENCE MODEL — ${model.authority}\nVersion: ${model.version}; indexed files: ${model.indexed_file_count}; capabilities: ${model.capability_count}; import edges: ${model.import_edge_count}; unresolved local imports: ${model.unresolved_local_import_count}.\nThis is a deterministic structural model of the indexed repository plus explicit Self Model evidence refs. It can establish file/import/capability/test relationships that are present in those inputs. It cannot infer arbitrary source semantics, prove runtime behavior, prove a change is safe, prove that a dependency is broken, infer why a human made a change, modify code, change governance, or authorize action. Use it to reason about where capabilities live and what could be structurally affected, while preserving uncertainty.\n\nCODE RELATIONSHIP LANGUAGE CONTRACT:\n- DIRECT_STRUCTURAL: an indexed import edge or explicit Self Model evidence-ref relationship. State this plainly when the graph establishes it.\n- DOWNSTREAM_EXPOSURE: a dependency path or downstream consumer exists. Say it could be structurally affected; do not say it definitely changes or breaks.\n- BEHAVIORAL_HYPOTHESIS: a proposed runtime/semantic consequence such as false publication, missed evidence, extra blocking, latency, or safety degradation. The graph alone cannot establish this. Require semantic source analysis, targeted tests, or runtime evidence before presenting it as an outcome.\nNever widen a bounded graph into universal language such as “everything that requires X depends on this.” Never treat one downstream path as proof of behavior.\n\nRELEVANT CAPABILITIES:\n${capabilities || '- No bounded capability match.'}\n\nRELEVANT FILES:\n${files || '- No bounded file match.'}\n\nRELEVANT IMPORT EDGES:\n${edges || '- No bounded import edge match.'}${impactText}`;
}