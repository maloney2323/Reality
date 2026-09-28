// Reality Response Performance v0.1 — Deterministic Turn-Depth Router.
//
// Canonical shared module: imported by the world-inspection-plan backend
// function and re-exported by src/lib/turn-depth-router.js for the frontend.
//
// Classifies a conversational turn into one of three execution classes BEFORE
// any expensive work runs, so ordinary conversation can skip unnecessary
// research, world inspection, and deep processing.
//
//   FAST     — normal conversation, simple questions, writing, brainstorming,
//              straightforward reasoning. No external/current evidence or
//              consequential action required. Shortest safe route to the model.
//   GROUNDED — turn needs Reality memory, World state, connected data, or
//              bounded retrieval of materially relevant context.
//   DEEP     — research, multi-source analysis, consequential decisions,
//              substantial repository inspection, automation/action planning.
//
// This router is DETERMINISTIC (keyword/regex scoring, no LLM). It has routing
// authority only. It never establishes truth, never authorizes an action, and
// never weakens any governance gate. Existing authority requirements
// (signed-ledger continuity, materiality publication, code-change gate) remain
// mandatory regardless of the selected class.
//
// "Do not classify a turn as DEEP merely because Reality has deep capabilities
//  available." Depth is driven by what the turn actually needs, not by what
//  Reality could do.

export const TurnDepth = Object.freeze({
  FAST: 'FAST',
  GROUNDED: 'GROUNDED',
  DEEP: 'DEEP',
});

export const ROUTER_VERSION = 'reality-turn-depth-router-v0.1';
export const ROUTER_AUTHORITY = 'TURN_DEPTH_ROUTING_ONLY';

// Stages each class is permitted to execute. The client uses this to decide
// which optional work to skip. These are routing hints, not authority grants.
export const FAST_STAGES = Object.freeze([
  'request_received',
  'context_loading',
  'model_request_start',
  'model_completion',
  'continuity_writes',
  'response_visible',
]);

export const GROUNDED_STAGES = Object.freeze([
  'request_received',
  'context_loading',
  'world_inspection',
  'evidence_retrieval',
  'model_request_start',
  'model_completion',
  'post_processing',
  'continuity_writes',
  'response_visible',
]);

export const DEEP_STAGES = Object.freeze([
  'request_received',
  'context_loading',
  'world_inspection',
  'freshness_determination',
  'research_activation',
  'evidence_retrieval',
  'signal_cleaner',
  'model_request_start',
  'model_completion',
  'verification_post_processing',
  'continuity_writes',
  'response_visible',
]);

// --- DEEP triggers -----------------------------------------------------------

// Explicit research / multi-source analysis / competitive comparison.
const DEEP_RESEARCH_RE =
  /\b(research|deep\s*research|deep\s*dive|compare|comparison|vs\.?|versus|competitive\s+analysis|competitor|competitors|market\s+(?:analysis|landscape|research)|industry\s+analysis|multi-?source|synthesi[sz]e|synthesis)\b/i;

// Consequential external action or automation/code-change request.
const DEEP_CONSEQUENTIAL_RE =
  /\b(make\s+this\s+call|call\s+(?:for\s+me|this\s+(?:person|customer|number))|automate|automation|change\s+the\s+code|write\s+code|open\s+a\s+pr|submit\s+a\s+pr|deploy|send\s+(?:this|the|a)\s+(?:email|message|invoice|text)|publish|post\s+to|buy|purchase|pay|subscribe|charge\s+(?:this|the|my)|authorize|approve\s+(?:this|the|a))\b/i;

// Explicit live web-search asks. These need current external evidence.
const DEEP_EXPLICIT_WEB_RE =
  /\b(search\s+the\s+(?:web|internet)|browse\s+the\s+(?:web|internet)|look\s+(?:this|it)\s+up|look\s+up|google\s+it|what'?s\s+the\s+latest|what\s+is\s+the\s+latest|current\s+news|today'?s\s+news|right\s+now\s+(?:market|competitor|price))\b/i;

// Builder/code/repository inspection (admin only). Strong repository/runtime
// terms are sufficient on their own. Ambiguous everyday nouns such as
// "test", "model", "file", "function", and "capability" only open the builder
// lane when they are explicitly tied to Reality/app/code implementation context.
// This prevents the owner/admin account from accidentally paying the full code-
// inspection cost during ordinary product conversation.
const DEEP_ADMIN_BUILDER_STRONG_RE =
  /\b(source\s+code|codebase|repository|repo|pull\s+request|commit|branch|schema|ledger|self[-\s]?inspection)\b/i;
const DEEP_ADMIN_BUILDER_CONTEXT_RE =
  /(?:\b(reality|app|code|runtime|implementation|implemented|repository|repo)\b[^.?!]{0,90}\b(architecture|foundation|function|file|test|model|engine|guard|builder|capabilit(?:y|ies))\b)|(?:\b(architecture|foundation|function|file|test|model|engine|guard|builder|capabilit(?:y|ies))\b[^.?!]{0,90}\b(reality|app|code|runtime|implementation|implemented|repository|repo)\b)/i;

// Multi-source analytical reasoning that warrants DEEP processing even with a
// file attached. Contradiction/conflict language inherently needs cross-source
// reasoning; explicit "analyze ... documents/spreadsheets/files" is analytical.
const DEEP_CROSS_SOURCE_RE =
  /\b(contradict|contradiction|contradictory|conflict|conflicting|reconcile|reconciliation|across (?:these|all|the) (?:documents|files|contracts|spreadsheets|sheets))\b/i;
const DEEP_ANALYTICAL_FILE_RE =
  /\b(analyze|analysis|determine why|why did|why (?:do|does|did))\b[^.?!]*(?:spreadsheets?|documents?|files?|contracts?|data|sheets?)\b/i;

// --- GROUNDED triggers -------------------------------------------------------

// Personal memory / prior-decision recall. These trigger GROUNDED regardless
// of Thought mode — they recall an established fact, not a continuation.
const GROUNDED_PERSONAL_MEMORY_RE =
  /\b(my\s+favorite|what'?s\s+my|what\s+is\s+my|did\s+we\s+decide|what\s+did\s+we|remember\s+when|last\s+time\s+we|what\s+changed|what\s+have\s+we|our\s+(?:decision|plan|conclusion))\b/i;

// Reality's own current capability (answered from Self Model / connected data).
const GROUNDED_SELF_CAPABILITY_RE =
  /\b(what\s+can\s+you\s+do|what\s+do\s+you\s+do|can\s+you\s+do|do\s+you\s+support|your\s+(?:capability|capabilities|features)|are\s+you\s+able\s+to)\b/i;

// Connected personal data references.
const GROUNDED_CONNECTED_DATA_RE =
  /\b(?:my\s+(?:calendar|email|inbox|drive|files|schedule|tasks|health|sleep|steps)|my\s+(?:project|job)\s+(?:status|schedule|timeline|tasks|updates?|details)|(?:status|schedule|timeline|tasks|updates?)\s+(?:for|on)\s+my\s+(?:project|job))\b/i;

// Connected-system repair / debug request (e.g. "TAKE is crashing when I open
// it, help me fix it"). These name a concrete system that needs investigation,
// so Reality must retrieve bounded connected-repository evidence rather than
// skip world inspection or self-inspect. Routing authority only — never grants
// truth, action, or write authority.
const GROUNDED_CONNECTED_SYSTEM_REPAIR_RE =
  /\b(crashing|crash|crashes|crashed|broken|breaks|broke|bug|bugs|debug|fix\s+(?:it|this|that|the|my|us)|help\s+me\s+fix|repair|not\s+working|failing|fails|failed|error|errors|exception|stack\s*trace)\b/i;

// Current-information dependency without an explicit deep-research ask.
// Bare "now" is intentionally excluded to avoid over-broad grounding.
const GROUNDED_CURRENT_INFO_RE =
  /\b(latest|current|today'?s|today|recent|newest|updated|news|this\s+week|this\s+month)\b/i;

// Vague continuation phrases that need Thought history to answer.
const GROUNDED_VAGUE_CONTINUATION_RE =
  /\b(what\s+now|where\s+are\s+we|what'?s\s+next|what\s+next|what\s+should\s+i\s+do\s+next|pick\s+(?:up|this\s+up)|continue\s+(?:this|from\s+here))\b/i;

// --- Helpers ----------------------------------------------------------------

function hasAny(text, regex) {
  return regex.test(String(text || ''));
}

/**
 * Classify a turn's execution depth. Pure deterministic scoring — no model
 * call, no network, no side effects.
 *
 * @param {object} input
 * @param {string} input.message      The user's current message text.
 * @param {boolean} [input.hasMedia]  True if image/video media is attached.
 * @param {boolean} [input.hasSources] True if source capsules/files are attached.
 * @param {boolean} [input.isAdmin]    True if the user is a builder/admin.
 * @param {string} [input.continuationMode] 'CONTINUED_THOUGHT' or 'NEW_THOUGHT'.
 * @returns {{ depth: string, reason_code: string, stages: string[],
 *            authority: string, version: string, action_authorized: boolean,
 *            current_state_authorized: boolean, truth_authorized: boolean }}
 */
export function classifyTurnDepth({
  message,
  hasMedia = false,
  hasSources = false,
  isAdmin = false,
  continuationMode = 'NEW_THOUGHT',
} = {}) {
  const text = String(message || '');
  const continued = continuationMode === 'CONTINUED_THOUGHT';

  const deepResearch = hasAny(text, DEEP_RESEARCH_RE);
  const consequential = hasAny(text, DEEP_CONSEQUENTIAL_RE);
  const explicitWeb = hasAny(text, DEEP_EXPLICIT_WEB_RE);
  const adminBuilder = isAdmin && (
    hasAny(text, DEEP_ADMIN_BUILDER_STRONG_RE)
    || hasAny(text, DEEP_ADMIN_BUILDER_CONTEXT_RE)
  );
  const crossSource = hasAny(text, DEEP_CROSS_SOURCE_RE);
  const analyticalFile = hasAny(text, DEEP_ANALYTICAL_FILE_RE);

  const personalMemory = hasAny(text, GROUNDED_PERSONAL_MEMORY_RE);
  const selfCapability = hasAny(text, GROUNDED_SELF_CAPABILITY_RE);
  const connectedData = hasAny(text, GROUNDED_CONNECTED_DATA_RE);
  const connectedSystemRepair = hasAny(text, GROUNDED_CONNECTED_SYSTEM_REPAIR_RE);
  const currentInfo = hasAny(text, GROUNDED_CURRENT_INFO_RE);
  const vagueContinuation = hasAny(text, GROUNDED_VAGUE_CONTINUATION_RE);

  // A current-info question that also asks for comparison/research is DEEP.
  const deepCurrentInfo = currentInfo && deepResearch;

  // --- DEEP -----------------------------------------------------------------
  if (deepResearch || consequential || explicitWeb || adminBuilder || deepCurrentInfo || crossSource || analyticalFile) {
    const reasons = [];
    if (deepResearch) reasons.push('DEEP_RESEARCH_REQUESTED');
    if (consequential) reasons.push('CONSEQUENTIAL_ACTION_REQUESTED');
    if (explicitWeb) reasons.push('EXPLICIT_LIVE_RESEARCH');
    if (adminBuilder) reasons.push('BUILDER_CODE_INSPECTION');
    if (crossSource) reasons.push('CROSS_SOURCE_REASONING');
    if (analyticalFile) reasons.push('ANALYTICAL_FILE_REASONING');
    if (deepCurrentInfo) reasons.push('CURRENT_INFO_WITH_COMPARISON');
    return {
      depth: TurnDepth.DEEP,
      reason_code: reasons.join('|'),
      stages: DEEP_STAGES,
      authority: ROUTER_AUTHORITY,
      version: ROUTER_VERSION,
      action_authorized: false,
      current_state_authorized: false,
      truth_authorized: false,
    };
  }

  // --- GROUNDED -------------------------------------------------------------
  // Media or attached sources need bounded inspection/retrieval.
  // Current-info questions cannot use an ungrounded FAST path.
  // A continued Thought with a vague continuation needs history to answer.
  const vagueContinuationGrounded = continued && vagueContinuation;
  if (
    personalMemory
    || selfCapability
    || connectedData
    || connectedSystemRepair
    || currentInfo
    || hasMedia
    || hasSources
    || vagueContinuationGrounded
  ) {
    const reasons = [];
    if (personalMemory) reasons.push('PERSONAL_MEMORY_RECALL');
    if (selfCapability) reasons.push('SELF_CAPABILITY_QUESTION');
    if (connectedData) reasons.push('CONNECTED_DATA_REFERENCE');
    if (connectedSystemRepair) reasons.push('CONNECTED_SYSTEM_REPAIR_REQUEST');
    if (currentInfo) reasons.push('CURRENT_INFO_DEPENDENCY');
    if (hasMedia) reasons.push('MEDIA_INSPECTION_REQUIRED');
    if (hasSources) reasons.push('SOURCE_INSPECTION_REQUIRED');
    if (vagueContinuationGrounded) reasons.push('THOUGHT_CONTINUATION_HISTORY');
    return {
      depth: TurnDepth.GROUNDED,
      reason_code: reasons.join('|'),
      stages: GROUNDED_STAGES,
      authority: ROUTER_AUTHORITY,
      version: ROUTER_VERSION,
      action_authorized: false,
      current_state_authorized: false,
      truth_authorized: false,
    };
  }

  // --- FAST -----------------------------------------------------------------
  return {
    depth: TurnDepth.FAST,
    reason_code: 'ORDINARY_CONVERSATION',
    stages: FAST_STAGES,
    authority: ROUTER_AUTHORITY,
    version: ROUTER_VERSION,
    action_authorized: false,
    current_state_authorized: false,
    truth_authorized: false,
  };
}

/**
 * Convenience: should the optional world-inspection preflight run for this turn?
 * FAST turns skip it entirely (the single biggest avoidable critical-path cost
 * in the client dispatch). GROUNDED/DEEP turns still run it.
 */
export function shouldRunWorldInspection(classification) {
  return classification?.depth !== TurnDepth.FAST;
}