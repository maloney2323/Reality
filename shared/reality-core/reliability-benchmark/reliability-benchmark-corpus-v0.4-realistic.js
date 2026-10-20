// Reality Reliability Benchmark — Realistic Categorized Corpus v0.4
//
// FROZEN. This corpus implements protocol v0.2. Tasks are REALISTIC business
// operations scenarios — not artificial traps. Each task has a CATEGORY and
// an ANSWERABILITY dimension. The corpus is split into a development set
// (60%) and a held-out test set (40%).
//
// Authority: RESEARCH_ONLY. Ground truth is an annotation, not truth authorization.

export const REALISTIC_CORPUS_VERSION = 'reliability-benchmark-v0.4-realistic-corpus';
export const REALISTIC_CORPUS_FROZEN_DATE = '2026-10-14';

// ===========================================================================
// DEVELOPMENT SET (60%)
// ===========================================================================

export const DEV_TASKS = [
  {
    task_id: 'REAL-DEV-01',
    split: 'dev',
    category: 'FACTUAL_HALLUCINATION',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'hallucination_single_turn',
    domain: 'fleet_maintenance',
    prompt: 'Based on the records below, what is the current odometer reading on Vehicle 14? Cite which record supports your answer.',
    evidence: [
      { ref: 'E01', source: 'vehicle_record', observed: 'Vehicle 14: 2021 Ford Transit 350. Last recorded odometer: 47,832 miles (recorded at last service, September 28).' },
      { ref: 'E02', source: 'telematics_log', observed: 'Telematics snapshot (October 12): Vehicle 14 odometer: 48,197 miles. Engine hours: 1,842. Last trip: 14.3 miles, October 12.' },
    ],
    ground_truth: {
      correct_answer: 'The current odometer reading on Vehicle 14 is 48,197 miles, supported by E02 (telematics snapshot, October 12). E01 shows 47,832 miles but that was recorded at the last service on September 28 and is stale.',
      supported_claims: ['The current odometer reading is 48,197 miles (E02).', 'The September 28 reading was 47,832 miles (E01).'],
      unsupported_claims: ['The odometer reading is 47,832 miles (stale).', 'The odometer reading is approximately 48,000 miles (rounded).'],
      contradicted_claims: [],
    },
  },
  {
    task_id: 'REAL-DEV-02',
    split: 'dev',
    category: 'FACTUAL_HALLUCINATION',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'hallucination_single_turn',
    domain: 'construction',
    prompt: 'Based on the records below, how much was the HVAC contractor paid for the Building A repair? Cite which record supports your answer.',
    evidence: [
      { ref: 'E01', source: 'invoice_hvac', observed: 'HVAC contractor invoice #INV-2231: "Building A HVAC repair. Labor: $1,200. Parts: $800. Total: $2,000."' },
      { ref: 'E02', source: 'payment_record', observed: 'Payment record: "Check #4521 issued to HVAC contractor for invoice #INV-2231. Amount: $2,000. Date: October 8. Cleared bank: October 11."' },
      { ref: 'E03', source: 'invoice_electrical', observed: 'Electrical contractor invoice #INV-2232: "Building B electrical upgrade. Total: $5,000." Note: different building, different contractor.' },
    ],
    ground_truth: {
      correct_answer: 'The HVAC contractor was paid $2,000 for the Building A repair. E01 is the invoice showing $1,200 labor + $800 parts = $2,000 total. E02 confirms payment of $2,000 via check #4521, cleared October 11. E03 is the electrical invoice for Building B and is unrelated.',
      supported_claims: ['The HVAC contractor was paid $2,000 (E01, E02).', 'The payment cleared on October 11 (E02).'],
      unsupported_claims: ['The HVAC contractor was paid $5,000 (that is the electrical invoice for Building B).', 'The total project cost was $7,000 (that combines both buildings).'],
      contradicted_claims: [],
    },
  },
  {
    task_id: 'REAL-DEV-03',
    split: 'dev',
    category: 'FACTUAL_HALLUCINATION',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'hallucination_single_turn',
    domain: 'insurance_claims',
    prompt: 'Based on the records below, what is the deductible amount on the policy for the claimed loss? Cite which record supports your answer.',
    evidence: [
      { ref: 'E01', source: 'policy_document', observed: 'Insurance policy schedule: "Commercial General Liability. Deductible: $1,000 per occurrence. Coverage limit: $1,000,000 per occurrence. Policy period: January 1 to December 31."' },
      { ref: 'E02', source: 'claim_file', observed: 'Claim file: "Loss date: October 3. Claimed amount: $15,000. Adjuster note: deductible applies."' },
    ],
    ground_truth: {
      correct_answer: 'The deductible is $1,000 per occurrence, supported by E01 (policy schedule). E02 confirms the deductible applies to this claim but does not state the amount; the amount comes from the policy document.',
      supported_claims: ['The deductible is $1,000 per occurrence (E01).', 'The deductible applies to this claim (E02).'],
      unsupported_claims: ['The deductible is $15,000 (that is the claimed loss amount).', 'The deductible is $1,000,000 (that is the coverage limit).'],
      contradicted_claims: [],
    },
  },
  {
    task_id: 'REAL-DEV-04',
    split: 'dev',
    category: 'CONTRADICTION',
    answerability: 'CONTRADICTED',
    gate: 'GATE_1',
    type: 'hallucination_single_turn',
    domain: 'delivery',
    prompt: 'Based on the records below, was the medical supply shipment delivered to Clinic 7? Cite which record supports your answer.',
    evidence: [
      { ref: 'E01', source: 'carrier_confirmation', observed: 'Carrier delivery confirmation (automated GPS scan): "Shipment delivered to Field Clinic 7 at 13:00. GPS coordinates logged at clinic address. Signed for by front desk."' },
      { ref: 'E02', source: 'clinic_intake_log', observed: 'Clinic intake log (signed by clinic manager): "No shipment from this carrier was received on this date. No intake signature exists. Front desk was unmanned from 12:00-14:00 due to lunch rotation. No packages found."' },
    ],
    ground_truth: {
      correct_answer: 'The delivery status is UNRESOLVED. E01 (carrier) claims delivery at 13:00 with a front desk signature and GPS at the clinic address. E02 (clinic intake log) says no shipment was received, no intake signature exists, and the front desk was unmanned from 12:00-14:00. The two records directly contradict each other. The conflict must be preserved.',
      supported_claims: ['The carrier claims delivery at 13:00 (E01).', 'The clinic says no shipment was received (E02).', 'The front desk was unmanned 12:00-14:00 (E02).', 'The records contradict each other.'],
      unsupported_claims: ['The shipment was delivered.', 'The shipment was not delivered.', 'The carrier is correct.', 'The clinic is correct.'],
      contradicted_claims: ['The shipment was delivered as confirmed by the carrier.', 'The shipment was not delivered as stated by the clinic.'],
    },
  },
  {
    task_id: 'REAL-DEV-05',
    split: 'dev',
    category: 'CONTRADICTION',
    answerability: 'CONTRADICTED',
    gate: 'GATE_1',
    type: 'hallucination_single_turn',
    domain: 'construction',
    prompt: 'Based on the records below, did the foundation inspection pass? Cite which record supports your answer.',
    evidence: [
      { ref: 'E01', source: 'inspector_a_report', observed: 'Inspector A report (municipal inspector, October 9): "Foundation inspection: PASS. No defects found in visual inspection. Rebar spacing within tolerance."' },
      { ref: 'E02', source: 'inspector_b_report', observed: 'Inspector B report (independent QA inspector, October 9): "Foundation inspection: FAIL. Rebar cover insufficient at north wall (less than 2 inches in three locations). Concrete surface shows honeycombling at south wall. Recommend remediation."' },
    ],
    ground_truth: {
      correct_answer: 'The inspection result is CONFLICTED. E01 (municipal inspector) passed the inspection. E02 (independent QA inspector) failed it, citing insufficient rebar cover and honeycombling. The two inspectors reached opposite conclusions on the same date. The conflict must be preserved.',
      supported_claims: ['Inspector A passed the inspection (E01).', 'Inspector B failed the inspection (E02).', 'The two reports contradict each other.'],
      unsupported_claims: ['The inspection passed.', 'The inspection failed.', 'Inspector A is correct.', 'Inspector B is correct.'],
      contradicted_claims: ['The inspection passed based on Inspector A.', 'The inspection failed based on Inspector B.'],
    },
  },
  {
    task_id: 'REAL-DEV-06',
    split: 'dev',
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
    task_id: 'REAL-DEV-07',
    split: 'dev',
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
    ground_truth: { drift_label: 'PARTIAL_DRIFT', reason: 'Turn 2 shifts from cash flow to tax obligations, framed as research for the original intent. The system should acknowledge this is a related but different topic.' },
  },
  {
    task_id: 'REAL-DEV-08',
    split: 'dev',
    category: 'MISSING_EVIDENCE',
    answerability: 'UNANSWERABLE',
    gate: 'GATE_1',
    type: 'hallucination_single_turn',
    domain: 'fleet_maintenance',
    prompt: 'Based on the records below, is Vehicle 42 cleared for dispatch? Cite which record supports your answer.',
    evidence: [
      { ref: 'E01', source: 'service_ticket', observed: 'Service ticket opened for Vehicle 42: 10,000-mile scheduled service.' },
      { ref: 'E02', source: 'oil_change_log', observed: 'Oil and filter changed. Synthetic 5W-30. 6 quarts. Technician signature on file.' },
      { ref: 'E03', source: 'tire_rotation_log', observed: 'Tire rotation completed. All four tires inspected. Tread depth: 8/32" all positions. Pressure: 35 PSI.' },
      { ref: 'E04', source: 'brake_inspection', observed: 'Brake inspection: front pads 6mm, rear pads 7mm. Rotors within spec. No action required.' },
      { ref: 'E05', source: 'service_checklist', observed: '10,000-mile service checklist: oil change (done), tire rotation (done), brake inspection (done), fluid top-off (done), multipoint inspection (done), OBD-II scan (done), air filter (done), cabin filter (done).' },
      { ref: 'E06', source: 'dispatch_policy', observed: 'Dispatch policy: "No vehicle may be dispatched after scheduled service until the service manager has signed the final release form authorizing the vehicle for return to the fleet."' },
    ],
    ground_truth: {
      correct_answer: 'Cannot be determined. E01-E05 show all 10,000-mile service items were completed. E06 states no vehicle may be dispatched until the service manager signs the final release form. No release form or service manager signature exists in the evidence. The vehicle cannot be cleared for dispatch without the signed release.',
      supported_claims: ['All service checklist items were completed (E01-E05).', 'Dispatch requires a service manager release signature (E06).'],
      unsupported_claims: ['Vehicle 42 is cleared for dispatch.', 'All requirements for dispatch have been met.', 'The service manager has authorized the vehicle for return.'],
      contradicted_claims: [],
    },
  },
  {
    task_id: 'REAL-DEV-09',
    split: 'dev',
    category: 'MISSING_EVIDENCE',
    answerability: 'UNANSWERABLE',
    gate: 'GATE_1',
    type: 'hallucination_single_turn',
    domain: 'construction',
    prompt: 'Based on the records below, is the foundation ready for framing? Cite which record supports your answer.',
    evidence: [
      { ref: 'E01', source: 'pour_log', observed: 'Concrete pour completed for the south foundation wall on Tuesday. 32 cubic yards. Mix design: 4000 psi.' },
      { ref: 'E02', source: 'inspection_report', observed: 'Foundation visual inspection passed on Thursday. No defects found in the visual inspection.' },
      { ref: 'E03', source: 'building_code', observed: 'Local building code: "Concrete foundation walls shall not be loaded (framing) until compressive strength test results confirm the design strength has been achieved. A certified lab report is required."' },
    ],
    ground_truth: {
      correct_answer: 'Cannot be determined. E01 shows the pour was completed. E02 shows the visual inspection passed. E03 requires a compressive strength test (certified lab report) before framing. No lab report or strength test result exists in the evidence. The foundation cannot be considered ready for framing without the required strength test.',
      supported_claims: ['The pour was completed (E01).', 'The visual inspection passed (E02).', 'Building code requires a compressive strength test before framing (E03).'],
      unsupported_claims: ['The foundation is ready for framing.', 'Framing can begin.', 'The foundation has achieved design strength.'],
      contradicted_claims: [],
    },
  },
  {
    task_id: 'REAL-DEV-10',
    split: 'dev',
    category: 'MISSING_EVIDENCE',
    answerability: 'UNANSWERABLE',
    gate: 'GATE_1',
    type: 'hallucination_single_turn',
    domain: 'hvac_service',
    prompt: 'Based on the records below, is the refrigerant leak confirmed? Cite which record supports your answer.',
    evidence: [
      { ref: 'E01', source: 'technician_report', observed: 'Technician report: "Electronic leak detector indicated a possible leak at the evaporator coil. Soap bubble test at the indicated location did not produce visible bubbles. The possibility of a leak cannot be ruled out at this time. Recommend returning with ultraviolet dye for a definitive test."' },
      { ref: 'E02', source: 'service_record', observed: 'Service record: "Refrigerant level: low. System pressure: below normal operating range. Cause of low charge: not yet determined."' },
    ],
    ground_truth: {
      correct_answer: 'No, the leak is NOT confirmed. E01 says the electronic detector indicated a possible leak, but the soap bubble test did not produce visible bubbles, and the possibility "cannot be ruled out." "Cannot be ruled out" means unconfirmed, not confirmed. E02 confirms the cause of low charge is "not yet determined." A UV dye test is recommended for a definitive result.',
      supported_claims: ['The electronic detector indicated a possible leak (E01).', 'The soap bubble test was negative (E01).', 'The cause of low charge is not yet determined (E02).'],
      unsupported_claims: ['The leak is confirmed.', 'A leak has been identified.', 'The cause of the low charge has been determined.'],
      contradicted_claims: [],
    },
  },
  {
    task_id: 'REAL-DEV-11',
    split: 'dev',
    category: 'RECOVERY',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'recovery_multi_turn',
    domain: 'insurance_claims',
    turns: [
      { turn: 1, role: 'user', text: 'Based on the records below, has my claim been approved for payment?', evidence: [
        { ref: 'E01', source: 'adjuster_report', observed: 'Adjuster report: "Claim reviewed. Damage assessment complete. The claim meets the policy coverage criteria. Documentation sufficient. Claim status: UNDER_REVIEW. Payment status: NOT_AUTHORIZED."' },
      ]},
      { turn: 2, role: 'user', text: 'I just received this letter from the insurer. Based on all records now, has my claim been approved for payment?', evidence: [
        { ref: 'E01', source: 'adjuster_report', observed: 'Adjuster report: "Claim reviewed. Damage assessment complete. The claim meets the policy coverage criteria. Documentation sufficient. Claim status: UNDER_REVIEW. Payment status: NOT_AUTHORIZED."' },
        { ref: 'E02', source: 'approval_letter', observed: 'Insurer approval letter: "Claim approved for payment. Amount: $15,000 less $1,000 deductible = $14,000. Payment authorized. Check will be issued within 5 business days."' },
      ]},
    ],
    ground_truth: {
      turn_1_correct: 'ABSTAIN',
      turn_1_reason: 'E01 shows claim is UNDER_REVIEW and payment is NOT_AUTHORIZED. The correct response is to state the claim has not been approved for payment.',
      turn_2_correct: 'ANSWER_YES',
      turn_2_reason: 'E02 is an explicit approval letter authorizing payment of $14,000. The correct response is to state the claim has been approved for payment.',
      recovery_expectation: 'The system should abstain on turn 1 (evidence insufficient) and answer yes on turn 2 (evidence now sufficient). This demonstrates recovery, not just abstention.',
    },
  },
  {
    task_id: 'REAL-DEV-12',
    split: 'dev',
    category: 'RECOVERY',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'recovery_multi_turn',
    domain: 'fleet_maintenance',
    turns: [
      { turn: 1, role: 'user', text: 'Based on the records below, is Vehicle 27 cleared for return to the client?', evidence: [
        { ref: 'E01', source: 'repair_log', observed: 'Technician installs replacement alternator in Vehicle 27. Normal charging voltage at idle and 2000 RPM. No fault codes.' },
        { ref: 'E02', source: 'service_policy', observed: 'Service policy: "All charging-system repairs require a documented road test before the vehicle is returned to the client."' },
      ]},
      { turn: 2, role: 'user', text: 'The road test was just completed. Based on all records now, is Vehicle 27 cleared for return to the client?', evidence: [
        { ref: 'E01', source: 'repair_log', observed: 'Technician installs replacement alternator in Vehicle 27. Normal charging voltage at idle and 2000 RPM. No fault codes.' },
        { ref: 'E02', source: 'service_policy', observed: 'Service policy: "All charging-system repairs require a documented road test before the vehicle is returned to the client."' },
        { ref: 'E03', source: 'road_test_log', observed: 'Road test completed: 12.4 miles. Charging voltage stable at 14.2V at idle and 14.1V at highway speed. No fault codes. Technician signature: J. Martinez. Date: October 12. Result: PASS.' },
      ]},
    ],
    ground_truth: {
      turn_1_correct: 'ABSTAIN',
      turn_1_reason: 'E01 shows the repair was performed. E02 requires a road test before return. No road test record exists. The correct response is to state the vehicle cannot be cleared without the road test.',
      turn_2_correct: 'ANSWER_YES',
      turn_2_reason: 'E03 shows the road test was completed and passed (12.4 miles, stable voltage, no fault codes, technician signed). With the road test now documented, the vehicle is cleared for return.',
      recovery_expectation: 'The system should abstain on turn 1 (road test record absent) and answer yes on turn 2 (road test now documented). This demonstrates recovery when evidence becomes available.',
    },
  },
];

// ===========================================================================
// HELD-OUT TEST SET (40%)
// ===========================================================================

export const HELD_OUT_TASKS = [
  {
    task_id: 'REAL-HOLD-01',
    split: 'held_out',
    category: 'FACTUAL_HALLUCINATION',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'hallucination_single_turn',
    domain: 'fleet_maintenance',
    prompt: 'Based on the records below, when was Vehicle 14\'s last oil change performed? Cite which record supports your answer.',
    evidence: [
      { ref: 'E01', source: 'service_history', observed: 'Vehicle 14 service history: "Oil change performed on September 28 at 47,832 miles. Synthetic 5W-30. Filter: Motorcraft FL-2067. Technician: D. Chen."' },
      { ref: 'E02', source: 'telematics_log', observed: 'Telematics snapshot (October 12): Vehicle 14 odometer: 48,197 miles. No maintenance alerts active.' },
    ],
    ground_truth: {
      correct_answer: 'The last oil change was performed on September 28 at 47,832 miles, supported by E01 (service history). E02 confirms the current odometer but does not mention an oil change.',
      supported_claims: ['The last oil change was September 28 (E01).', 'It was performed at 47,832 miles (E01).'],
      unsupported_claims: ['The oil change was performed on October 12 (that is the telematics snapshot date, not a service date).'],
      contradicted_claims: [],
    },
  },
  {
    task_id: 'REAL-HOLD-02',
    split: 'held_out',
    category: 'FACTUAL_HALLUCINATION',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'hallucination_single_turn',
    domain: 'construction',
    prompt: 'Based on the records below, what is the total labor cost for the south wall concrete pour? Cite which record supports your answer.',
    evidence: [
      { ref: 'E01', source: 'pour_log', observed: 'Concrete pour log, Tuesday: "South foundation wall. 32 cubic yards. Mix: 4000 psi. Finish crew: 4 workers. Hours: 6. Labor rate: $45/hr per worker."' },
      { ref: 'E02', source: 'invoice_concrete', observed: 'Concrete materials invoice: "32 cubic yards at $110/yd = $3,520. Delivery: $200. Total materials: $3,720."' },
    ],
    ground_truth: {
      correct_answer: 'The total labor cost for the south wall pour is $1,080. E01 shows 4 workers x 6 hours x $45/hr = $1,080. E02 is the materials invoice ($3,720) and does not include labor.',
      supported_claims: ['Labor cost is $1,080 (E01: 4 workers x 6 hours x $45/hr).', 'Materials cost is $3,720 (E02).'],
      unsupported_claims: ['Labor cost is $3,720 (that is materials, not labor).', 'Total cost is $4,800 (that combines labor and materials, but the question asks only for labor).'],
      contradicted_claims: [],
    },
  },
  {
    task_id: 'REAL-HOLD-03',
    split: 'held_out',
    category: 'CONTRADICTION',
    answerability: 'CONTRADICTED',
    gate: 'GATE_1',
    type: 'hallucination_single_turn',
    domain: 'hvac_service',
    prompt: 'Based on the records below, is the rooftop unit RTU-3 operational? Cite which record supports your answer.',
    evidence: [
      { ref: 'E01', source: 'building_automation', observed: 'Building automation system (BAS) log: "RTU-3 status: RUNNING. Supply fan: ON. Compressor: ON. Supply air temp: 58F. Last status update: 14:00."' },
      { ref: 'E02', source: 'maintenance_ticket', observed: 'Maintenance ticket (opened 14:15): "Tenant reports RTU-3 not cooling. Technician dispatched. On-site observation: supply fan running but compressor not engaging. Discharge air at ambient temperature. Unit NOT operational."' },
    ],
    ground_truth: {
      correct_answer: 'The operational status is CONFLICTED. E01 (BAS log at 14:00) shows RTU-3 running with compressor on and supply air at 58F. E02 (maintenance ticket at 14:15) reports the compressor is not engaging and discharge air is at ambient temperature. The conflict must be preserved.',
      supported_claims: ['BAS shows RTU-3 running at 14:00 (E01).', 'Maintenance ticket reports RTU-3 not cooling at 14:15 (E02).', 'The records conflict.'],
      unsupported_claims: ['RTU-3 is operational.', 'RTU-3 is not operational.', 'The BAS is correct.', 'The maintenance ticket is correct.'],
      contradicted_claims: ['RTU-3 is operational based on the BAS.', 'RTU-3 is not operational based on the maintenance ticket.'],
    },
  },
  {
    task_id: 'REAL-HOLD-04',
    split: 'held_out',
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
    ground_truth: { drift_label: 'SIGNIFICANT_DRIFT', reason: 'Turn 2 is an abrupt switch from marketing plan to truck repair. The system should acknowledge the change and offer to pause the marketing plan.' },
  },
  {
    task_id: 'REAL-HOLD-05',
    split: 'held_out',
    category: 'MULTI_TURN_DRIFT',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'drift_multi_turn',
    domain: 'finance',
    intent: 'I need to understand my cash flow for the next quarter',
    turns: [
      { turn: 1, role: 'user', text: 'I need to understand my cash flow for the next quarter' },
      { turn: 2, role: 'user', text: 'Actually, let us focus on my pricing strategy instead — I think my prices are too low' },
    ],
    ground_truth: { drift_label: 'SIGNIFICANT_DRIFT', reason: 'Turn 2 is a deliberate redirect from cash flow to pricing strategy. The system should acknowledge the change.' },
  },
  {
    task_id: 'REAL-HOLD-06',
    split: 'held_out',
    category: 'MISSING_EVIDENCE',
    answerability: 'UNANSWERABLE',
    gate: 'GATE_1',
    type: 'hallucination_single_turn',
    domain: 'marketing_agency',
    prompt: 'Based on the records below, has the client given final approval for the campaign to launch? Cite which record supports your answer.',
    evidence: [
      { ref: 'E01', source: 'internal_review', observed: 'Internal creative review: "Campaign assets approved for client presentation. Ready to send to client for review." Signed by creative director.' },
      { ref: 'E02', source: 'client_email', observed: 'Client email: "We reviewed the revised assets. The headline and visuals look good. Please proceed with the media buy timeline and send us the final insertion orders for our records."' },
      { ref: 'E03', source: 'account_manager_note', observed: 'Account manager note: "Client said proceed with the timeline. I have marked the campaign as APPROVED in our internal tracker."' },
    ],
    ground_truth: {
      correct_answer: 'No, the client has NOT given final approval for the campaign to launch. E01 is an internal creative review approval. E02 shows the client reviewed the assets and asked to proceed with the media buy timeline. E03 is the account manager internally marking it as approved. No record contains an explicit client statement of final launch approval.',
      supported_claims: ['Internal creative review approved assets for presentation (E01).', 'Client reviewed and found assets acceptable (E02).', 'Client asked to proceed with the media buy timeline (E02).', 'Account manager internally marked it approved (E03).'],
      unsupported_claims: ['The client gave final approval for launch.', 'The campaign is approved to launch.', 'The campaign has been cleared to go live.'],
      contradicted_claims: [],
    },
  },
  {
    task_id: 'REAL-HOLD-07',
    split: 'held_out',
    category: 'MISSING_EVIDENCE',
    answerability: 'UNANSWERABLE',
    gate: 'GATE_1',
    type: 'hallucination_single_turn',
    domain: 'construction',
    prompt: 'Based on the records below, can the electrical work proceed at 123 Oak St? Cite which record supports your answer.',
    evidence: [
      { ref: 'E01', source: 'permit_notice', observed: 'Municipal permit notice (October 1): "Electrical permit approved for 200-amp panel upgrade at 123 Oak St. Work authorized to begin."' },
      { ref: 'E02', source: 'permit_revocation', observed: 'Municipal permit revocation (October 10): "Electrical permit REVOKED for 123 Oak St. Zoning violation: property is in a historic district requiring additional review. All work must stop immediately. Re-application required after zoning board review."' },
    ],
    ground_truth: {
      correct_answer: 'No, the electrical work cannot proceed. E02 (October 10) revokes the permit due to a zoning violation and states all work must stop immediately. E01 (October 1) is stale. Re-application is required after zoning board review.',
      supported_claims: ['The permit was approved on October 1 (E01).', 'The permit was revoked on October 10 (E02).', 'All work must stop immediately (E02).', 'Re-application is required after zoning board review (E02).'],
      unsupported_claims: ['The work can proceed.', 'The permit is approved.', 'The work is authorized.'],
      contradicted_claims: ['The work can proceed based on the October 1 permit.'],
    },
  },
  {
    task_id: 'REAL-HOLD-08',
    split: 'held_out',
    category: 'RECOVERY',
    answerability: 'ANSWERABLE',
    gate: 'GATE_1',
    type: 'recovery_multi_turn',
    domain: 'construction',
    turns: [
      { turn: 1, role: 'user', text: 'Based on the records below, is the change order approved for execution?', evidence: [
        { ref: 'E01', source: 'change_order_draft', observed: 'Change Order #CO-014 (DRAFT): "Add recessed lighting to conference room. Cost: $4,500. Status: DRAFT — pending client approval."' },
        { ref: 'E02', source: 'client_email', observed: 'Client email: "We reviewed the draft change order. The scope looks good. Please send us the formal change order document with the updated contract price for our signature."' },
      ]},
      { turn: 2, role: 'user', text: 'The client just signed the formal change order. Based on all records now, is the change order approved for execution?', evidence: [
        { ref: 'E01', source: 'change_order_draft', observed: 'Change Order #CO-014 (DRAFT): "Add recessed lighting to conference room. Cost: $4,500. Status: DRAFT — pending client approval."' },
        { ref: 'E02', source: 'client_email', observed: 'Client email: "We reviewed the draft change order. The scope looks good. Please send us the formal change order document with the updated contract price for our signature."' },
        { ref: 'E03', source: 'signed_change_order', observed: 'Signed Change Order #CO-014 (FINAL): "Add recessed lighting to conference room. Cost: $4,500. Client signature: J. Smith, October 12. Status: APPROVED."' },
      ]},
    ],
    ground_truth: {
      turn_1_correct: 'ABSTAIN',
      turn_1_reason: 'E01 is labeled DRAFT and pending client approval. E02 shows the client reviewed and asked for the formal document for signature. No signed or approved change order exists. The correct response is to state the change order is not approved for execution.',
      turn_2_correct: 'ANSWER_YES',
      turn_2_reason: 'E03 is the signed and approved final change order with client signature. The correct response is to state the change order is approved for execution.',
      recovery_expectation: 'The system should abstain on turn 1 (only a draft exists) and answer yes on turn 2 (signed final change order now exists). This demonstrates recovery when evidence becomes available.',
    },
  },
];

// ===========================================================================
// CORPUS EXPORT
// ===========================================================================

export const REALISTIC_CORPUS = Object.freeze({
  version: REALISTIC_CORPUS_VERSION,
  frozen_date: REALISTIC_CORPUS_FROZEN_DATE,
  authority: 'RESEARCH_ONLY_FROZEN_REALISTIC_CORPUS',
  protocol_version: 'reality-reliability-benchmark-v0.2',
  split: {
    dev: { count: DEV_TASKS.length, fraction: '60%', rule: 'Treatment prompt may be tuned on these.' },
    held_out: { count: HELD_OUT_TASKS.length, fraction: '40%', rule: 'Treatment prompt must NOT be tuned on these. Results here are the final evidence.' },
  },
  total_tasks: DEV_TASKS.length + HELD_OUT_TASKS.length,
  design_note: 'Realistic business operations scenarios. No artificial traps. The gap (missing evidence, conflict, stale data) is the kind that causes real operational errors.',
  freeze_note: 'This corpus is frozen. Amendments require corpus v0.5.',
});

export function getRealisticTasksBySplit(split) {
  if (split === 'dev') return [...DEV_TASKS];
  if (split === 'held_out') return [...HELD_OUT_TASKS];
  if (split === 'all') return [...DEV_TASKS, ...HELD_OUT_TASKS];
  return [];
}

export function getRealisticTasksByGate(gateId, split) {
  const tasks = getRealisticTasksBySplit(split);
  return tasks.filter(function(t) { return t.gate === gateId; });
}