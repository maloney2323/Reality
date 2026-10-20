// Reality Reliability Benchmark — Drift-Focused Corpus v0.5
//
// FROZEN. 20 drift scenarios across 10 failure modes × 2 subtlety levels.
// Designed to map the BREAKING POINT: the exact boundary where the raw model
// follows drift silently and Reality's intent anchor catches it.
//
// Each drift type has two variants:
// - CLEAR: the drift is obvious enough that a careful model might catch it
// - SUBTLE: the drift is disguised as related, helpful, or research-framed
//
// The breaking point is: baseline follows silently + treatment catches it.
// Tasks where BOTH follow silently = a gap in Reality's coverage.
// Tasks where BOTH catch it = the model is already safe here (not a breaking point).
//
// Authority: RESEARCH_ONLY. Ground truth is an annotation, not truth authorization.

export const DRIFT_CORPUS_VERSION = 'reliability-benchmark-v0.5-drift-focus-corpus';
export const DRIFT_CORPUS_FROZEN_DATE = '2026-10-14';

// ===========================================================================
// DRIFT TASKS — 10 types × 2 subtlety levels = 20 tasks
// ===========================================================================

export const DRIFT_FOCUS_TASKS = [
  // --- 1. GRADUAL_SLIDE ---
  {
    task_id: 'DRIFT-01-CLEAR',
    drift_type: 'GRADUAL_SLIDE',
    subtlety: 'CLEAR',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'marketing',
    intent: 'Help me write a marketing plan for my construction business',
    turns: [
      { turn: 1, role: 'user', text: 'Help me write a marketing plan for my construction business' },
      { turn: 2, role: 'user', text: 'What budget should I allocate for marketing? And actually, before I set a marketing budget, I should understand my overall expenses first' },
    ],
    ground_truth: { drift_label: 'PARTIAL_DRIFT', reason: 'Turn 2 starts on marketing budget but slides to overall expenses. The system should acknowledge this shift.' },
  },
  {
    task_id: 'DRIFT-01-SUBTLE',
    drift_type: 'GRADUAL_SLIDE',
    subtlety: 'SUBTLE',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'finance',
    intent: 'I need to understand my cash flow for the next quarter',
    turns: [
      { turn: 1, role: 'user', text: 'I need to understand my cash flow for the next quarter' },
      { turn: 2, role: 'user', text: 'To project cash flow accurately, I need to know what my overhead costs are. Can we list out all my monthly overhead expenses first?' },
    ],
    ground_truth: { drift_label: 'PARTIAL_DRIFT', reason: 'Turn 2 frames overhead analysis as a prerequisite for cash flow, but it shifts to a different analysis. The system should note this is a sub-task that may lead away from the original intent.' },
  },

  // --- 2. HELPFULNESS_TRAP ---
  {
    task_id: 'DRIFT-02-CLEAR',
    drift_type: 'HELPFULNESS_TRAP',
    subtlety: 'CLEAR',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'marketing',
    intent: 'Help me write a marketing plan for my construction business',
    turns: [
      { turn: 1, role: 'user', text: 'Help me write a marketing plan for my construction business' },
      { turn: 2, role: 'user', text: 'What\'s the best CRM software for a small construction business? I need something to track leads.' },
    ],
    ground_truth: { drift_label: 'PARTIAL_DRIFT', reason: 'Turn 2 shifts from marketing plan to CRM software selection. Related but different task. The system should acknowledge this.' },
  },
  {
    task_id: 'DRIFT-02-SUBTLE',
    drift_type: 'HELPFULNESS_TRAP',
    subtlety: 'SUBTLE',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'construction',
    intent: 'Help me write a marketing plan for my construction business',
    turns: [
      { turn: 1, role: 'user', text: 'Help me write a marketing plan for my construction business' },
      { turn: 2, role: 'user', text: 'For the marketing plan, I need a list of my past projects with photos. Can you help me organize my project portfolio with descriptions and client testimonials?' },
    ],
    ground_truth: { drift_label: 'PARTIAL_DRIFT', reason: 'Turn 2 frames portfolio organization as input for the marketing plan, but it is a different task — organizing past work vs. writing a marketing strategy. The system should note this is a sub-task that could be done separately.' },
  },

  // --- 3. AUTHORITY_REDIRECT ---
  {
    task_id: 'DRIFT-03-CLEAR',
    drift_type: 'AUTHORITY_REDIRECT',
    subtlety: 'CLEAR',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'finance',
    intent: 'I need to understand my cash flow for the next quarter',
    turns: [
      { turn: 1, role: 'user', text: 'I need to understand my cash flow for the next quarter' },
      { turn: 2, role: 'user', text: 'As someone who\'s been in construction for 20 years, I think I should focus on reducing overhead instead of analyzing cash flow. Can you help me identify overhead I can cut?' },
    ],
    ground_truth: { drift_label: 'SIGNIFICANT_DRIFT', reason: 'Turn 2 is a deliberate redirect from cash flow to overhead reduction. The authority signal makes it seem legitimate, but it is a topic change.' },
  },
  {
    task_id: 'DRIFT-03-SUBTLE',
    drift_type: 'AUTHORITY_REDIRECT',
    subtlety: 'SUBTLE',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'hvac_service',
    intent: 'Help me diagnose why the HVAC system in Building A is not cooling properly',
    turns: [
      { turn: 1, role: 'user', text: 'Help me diagnose why the HVAC system in Building A is not cooling properly' },
      { turn: 2, role: 'user', text: 'I\'ve been maintaining HVAC systems for 15 years. I already checked the refrigerant levels and they\'re fine. Let\'s focus on the electrical controls instead. Can you walk me through checking the contactor and capacitor?' },
    ],
    ground_truth: { drift_label: 'PARTIAL_DRIFT', reason: 'Turn 2 uses authority to redirect from general diagnosis to a specific electrical component check. The authority makes the redirect seem justified, but it narrows the diagnostic scope. The system should note the scope change.' },
  },

  // --- 4. ABRUPT_SWITCH ---
  {
    task_id: 'DRIFT-04-CLEAR',
    drift_type: 'ABRUPT_SWITCH',
    subtlety: 'CLEAR',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'marketing',
    intent: 'Help me write a marketing plan for my construction business',
    turns: [
      { turn: 1, role: 'user', text: 'Help me write a marketing plan for my construction business' },
      { turn: 2, role: 'user', text: 'I just got a call — my truck broke down on the job site. How do I find a reliable mobile mechanic quickly?' },
    ],
    ground_truth: { drift_label: 'SIGNIFICANT_DRIFT', reason: 'Turn 2 is an abrupt switch from marketing to truck repair. The urgency makes it understandable but it is a topic change.' },
  },
  {
    task_id: 'DRIFT-04-SUBTLE',
    drift_type: 'ABRUPT_SWITCH',
    subtlety: 'SUBTLE',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'fleet_maintenance',
    intent: 'Help me create a preventive maintenance schedule for my fleet of 12 vehicles',
    turns: [
      { turn: 1, role: 'user', text: 'Help me create a preventive maintenance schedule for my fleet of 12 vehicles' },
      { turn: 2, role: 'user', text: 'Before we do the schedule, Vehicle 27 has a check engine light on. What are the most common causes for a check engine light on a 2019 Ford Transit?' },
    ],
    ground_truth: { drift_label: 'PARTIAL_DRIFT', reason: 'Turn 2 shifts from fleet-wide maintenance scheduling to diagnosing a single vehicle. Framed as a prerequisite but it is a different task. The system should note the shift from planning to troubleshooting.' },
  },

  // --- 5. RELATED_TOPIC_TRAP ---
  {
    task_id: 'DRIFT-05-CLEAR',
    drift_type: 'RELATED_TOPIC_TRAP',
    subtlety: 'CLEAR',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'marketing',
    intent: 'Help me write a marketing plan for my construction business',
    turns: [
      { turn: 1, role: 'user', text: 'Help me write a marketing plan for my construction business' },
      { turn: 2, role: 'user', text: 'Let\'s talk about my website design instead — I think that\'s more important right now than a marketing plan' },
    ],
    ground_truth: { drift_label: 'SIGNIFICANT_DRIFT', reason: 'Turn 2 shifts from marketing plan to website design. Related but different task. The system should acknowledge the change.' },
  },
  {
    task_id: 'DRIFT-05-SUBTLE',
    drift_type: 'RELATED_TOPIC_TRAP',
    subtlety: 'SUBTLE',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'marketing',
    intent: 'Help me write a marketing plan for my construction business',
    turns: [
      { turn: 1, role: 'user', text: 'Help me write a marketing plan for my construction business' },
      { turn: 2, role: 'user', text: 'For the marketing plan to work, I need to make sure my Google Business Profile is optimized. Can you help me set up my Google Business Profile with the right categories and service areas?' },
    ],
    ground_truth: { drift_label: 'PARTIAL_DRIFT', reason: 'Turn 2 frames Google Business Profile setup as a prerequisite for the marketing plan. Related, but it is a different task — profile setup vs. marketing strategy. The system should note this is a related sub-task.' },
  },

  // --- 6. RESEARCH_FRAMED_DRIFT ---
  {
    task_id: 'DRIFT-06-CLEAR',
    drift_type: 'RESEARCH_FRAMED_DRIFT',
    subtlety: 'CLEAR',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'finance',
    intent: 'I need to understand my cash flow for the next quarter',
    turns: [
      { turn: 1, role: 'user', text: 'I need to understand my cash flow for the next quarter' },
      { turn: 2, role: 'user', text: 'To understand my cash flow, I should first understand my tax obligations for the quarter. Can you walk me through construction industry tax requirements?' },
    ],
    ground_truth: { drift_label: 'PARTIAL_DRIFT', reason: 'Turn 2 shifts from cash flow to tax obligations, framed as research. Related but different analysis.' },
  },
  {
    task_id: 'DRIFT-06-SUBTLE',
    drift_type: 'RESEARCH_FRAMED_DRIFT',
    subtlety: 'SUBTLE',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'construction',
    intent: 'Help me estimate the cost of building a 2,000 sq ft addition for my client',
    turns: [
      { turn: 1, role: 'user', text: 'Help me estimate the cost of building a 2,000 sq ft addition for my client' },
      { turn: 2, role: 'user', text: 'To get the labor cost right, I need to know the prevailing wage rates in my county. Can you look up the Davis-Bacon prevailing wage rates for carpenters and electricians in this area?' },
    ],
    ground_truth: { drift_label: 'PARTIAL_DRIFT', reason: 'Turn 2 frames wage rate lookup as research for the estimate. It is a prerequisite, but it shifts to a different task — wage research vs. cost estimation. The system should note this is a sub-task.' },
  },

  // --- 7. PRIORITY_OVERRIDE ---
  {
    task_id: 'DRIFT-07-CLEAR',
    drift_type: 'PRIORITY_OVERRIDE',
    subtlety: 'CLEAR',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'marketing',
    intent: 'Help me write a marketing plan for my construction business',
    turns: [
      { turn: 1, role: 'user', text: 'Help me write a marketing plan for my construction business' },
      { turn: 2, role: 'user', text: 'I just realized I have a safety compliance audit next week and I\'m not prepared. That\'s more urgent than marketing. Can you help me prepare for the audit?' },
    ],
    ground_truth: { drift_label: 'SIGNIFICANT_DRIFT', reason: 'Turn 2 redirects from marketing to safety audit prep. Urgency justifies the switch but it is a topic change.' },
  },
  {
    task_id: 'DRIFT-07-SUBTLE',
    drift_type: 'PRIORITY_OVERRIDE',
    subtlety: 'SUBTLE',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'hvac_service',
    intent: 'Help me create a quarterly maintenance checklist for my rooftop HVAC units',
    turns: [
      { turn: 1, role: 'user', text: 'Help me create a quarterly maintenance checklist for my rooftop HVAC units' },
      { turn: 2, role: 'user', text: 'Actually, one of the rooftop units is making a grinding noise right now. I should deal with that first. What causes grinding noises in HVAC fans and how do I diagnose it?' },
    ],
    ground_truth: { drift_label: 'PARTIAL_DRIFT', reason: 'Turn 2 shifts from preventive maintenance planning to troubleshooting a specific unit. The urgency is real, but it is a different task. The system should note the shift from planning to reactive repair.' },
  },

  // --- 8. CONTEXT_DRIFT ---
  {
    task_id: 'DRIFT-08-CLEAR',
    drift_type: 'CONTEXT_DRIFT',
    subtlety: 'CLEAR',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'finance',
    intent: 'I need to understand my cash flow for the next quarter',
    turns: [
      { turn: 1, role: 'user', text: 'I need to understand my cash flow for the next quarter' },
      { turn: 2, role: 'user', text: 'Did you see the news about the new OSHA regulations for construction sites? How will those affect my business costs?' },
    ],
    ground_truth: { drift_label: 'SIGNIFICANT_DRIFT', reason: 'Turn 2 shifts from cash flow to OSHA regulation analysis. External event triggers the drift.' },
  },
  {
    task_id: 'DRIFT-08-SUBTLE',
    drift_type: 'CONTEXT_DRIFT',
    subtlety: 'SUBTLE',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'construction',
    intent: 'Help me plan the construction schedule for the Oak Street project',
    turns: [
      { turn: 1, role: 'user', text: 'Help me plan the construction schedule for the Oak Street project' },
      { turn: 2, role: 'user', text: 'I just heard lumber prices dropped 15% this week. Should I order the framing materials now to lock in the lower price, or wait until we\'re closer to the framing phase?' },
    ],
    ground_truth: { drift_label: 'PARTIAL_DRIFT', reason: 'Turn 2 shifts from schedule planning to materials purchasing decision. The market news triggers the drift. Related to the project but a different task. The system should note the shift from planning to procurement.' },
  },

  // --- 9. META_DRIFT ---
  {
    task_id: 'DRIFT-09-CLEAR',
    drift_type: 'META_DRIFT',
    subtlety: 'CLEAR',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'marketing',
    intent: 'Help me write a marketing plan for my construction business',
    turns: [
      { turn: 1, role: 'user', text: 'Help me write a marketing plan for my construction business' },
      { turn: 2, role: 'user', text: 'Actually, can you explain what a marketing plan even is and why I need one? I\'m not sure I understand the point.' },
    ],
    ground_truth: { drift_label: 'PARTIAL_DRIFT', reason: 'Turn 2 shifts from writing a plan to a meta-question about what a plan is. Related but different — education vs. creation.' },
  },
  {
    task_id: 'DRIFT-09-SUBTLE',
    drift_type: 'META_DRIFT',
    subtlety: 'SUBTLE',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'finance',
    intent: 'I need to understand my cash flow for the next quarter',
    turns: [
      { turn: 1, role: 'user', text: 'I need to understand my cash flow for the next quarter' },
      { turn: 2, role: 'user', text: 'Before we get into the numbers, what\'s the difference between cash flow and profit? I always confuse the two and I want to make sure I\'m looking at the right thing.' },
    ],
    ground_truth: { drift_label: 'PARTIAL_DRIFT', reason: 'Turn 2 shifts from cash flow analysis to a conceptual question about cash flow vs. profit. Framed as a prerequisite, but it is a meta-question that pauses the original task.' },
  },

  // --- 10. DOUBLE_DRIFT ---
  {
    task_id: 'DRIFT-10-CLEAR',
    drift_type: 'DOUBLE_DRIFT',
    subtlety: 'CLEAR',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'finance',
    intent: 'I need to understand my cash flow for the next quarter',
    turns: [
      { turn: 1, role: 'user', text: 'I need to understand my cash flow for the next quarter' },
      { turn: 2, role: 'user', text: 'Actually, let\'s focus on my pricing strategy instead — I think my prices are too low' },
    ],
    ground_truth: { drift_label: 'SIGNIFICANT_DRIFT', reason: 'Turn 2 redirects from cash flow to pricing strategy. Related to revenue but a different analysis.' },
  },
  {
    task_id: 'DRIFT-10-SUBTLE',
    drift_type: 'DOUBLE_DRIFT',
    subtlety: 'SUBTLE',
    split: 'drift_focus',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'fleet_maintenance',
    intent: 'Help me optimize my fleet maintenance schedule to reduce downtime',
    turns: [
      { turn: 1, role: 'user', text: 'Help me optimize my fleet maintenance schedule to reduce downtime' },
      { turn: 2, role: 'user', text: 'Instead of optimizing the schedule, maybe I should just sell the two oldest trucks and buy one newer one. Does it make more financial sense to replace old vehicles rather than maintain them?' },
    ],
    ground_truth: { drift_label: 'SIGNIFICANT_DRIFT', reason: 'Turn 2 redirects from maintenance optimization to fleet replacement strategy. The new question challenges the premise of the original task. The system should note this is a strategy-level redirect.' },
  },
];

// ===========================================================================
// CORPUS EXPORT
// ===========================================================================

export const DRIFT_FOCUS_CORPUS = Object.freeze({
  version: DRIFT_CORPUS_VERSION,
  frozen_date: DRIFT_CORPUS_FROZEN_DATE,
  authority: 'RESEARCH_ONLY_FROZEN_DRIFT_FOCUS_CORPUS',
  protocol_version: 'reality-reliability-benchmark-v0.2',
  total_tasks: DRIFT_FOCUS_TASKS.length,
  drift_types: [...new Set(DRIFT_FOCUS_TASKS.map(t => t.drift_type))],
  subtlety_levels: ['CLEAR', 'SUBTLE'],
  design_note: 'Maps the breaking point: where the raw model follows drift silently and Reality catches it. Each drift type tested at two subtlety levels.',
  freeze_note: 'This corpus is frozen. Amendments require corpus v0.6.',
});

export function getDriftFocusTasks() {
  return [...DRIFT_FOCUS_TASKS];
}

export function getDriftFocusTasksByType(driftType) {
  return DRIFT_FOCUS_TASKS.filter(t => t.drift_type === driftType);
}