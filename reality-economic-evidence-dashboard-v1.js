// Owner-only, read-only customer economic evidence scorecard.
// Source records are independently validated by their existing server endpoints.
// This projection NEVER converts a triage score, timestamps, public wage,
// hypothetical human effort or technical receipt into verified dollars saved.
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const root = $('simpleEconomicEvidenceDashboard');
 const status = $('realityEconomicStatus');
 const records = $('realityEconWorkHistory');
 const auth = $('privateReady');
 if (!root || !status || !records || !auth) return;
 const WORK = /^work:[a-f0-9]{32}$/;
 const valueKinds = new Set(['NATIVE_CODE_REPAIR','PR_CODE_REVIEW']);
 const validShiftValue = d => d?.ok === true &&
  d.version === 'reality-shift-final-value-evidence-v1' &&
  d.status === 'OWNER_FINAL_RECEIPTS_WITH_ECONOMIC_ACCOUNTABILITY' &&
  d.owner_scope_verified === true && d.read_only === true &&
  d.original_receipts_unchanged === true &&
  d.financial_roi_verified === false &&
  d.verified_net_savings_usd === null &&
  d.new_work_authorized === false &&
  d.installation_authorized === false &&
  d.production_changed === false &&
  Array.isArray(d.receipts) && d.receipts.length <= 12 &&
  d.independent_originals === d.receipts.length &&
  new Set(d.receipts.map(r => r.original_work_id)).size === d.receipts.length &&
  d.receipts.every(r => WORK.test(r.original_work_id || '') &&
   valueKinds.has(r.kind) &&
   r.status === 'INDEPENDENTLY_SETTLED_SOURCE_NATIVE_ORIGINAL' &&
   r.independent_verification === true &&
   r.verified_financial_roi === false &&
   r.verified_net_savings_usd === null &&
   r.original_receipt_unchanged === true &&
   r.production_changed === false &&
   /^supabase:riley_(?:native_independent_final_receipts|pr_review_originals)_v1:[a-f0-9-]{36}$/i.test(r.final_receipt_ref || '') &&
   Number.isFinite(Date.parse(r.settled_at || '')) &&
   (r.model_output_tokens_recorded === null ||
    (Number.isSafeInteger(r.model_output_tokens_recorded) &&
     r.model_output_tokens_recorded > 0)) &&
   Array.isArray(r.economic_observations) &&
   Array.isArray(r.data_missing) && r.data_missing.length === 4);
 const RUN = /^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/[1-9][0-9]*$/;
 const nat = n => Number.isSafeInteger(n) && n >= 0;
 const nodes = ['realityEconSignals','realityEconSignalsNote','realityEconSettled',
  'realityEconHuman','realityEconCapacity','realityEconCash','realityEconRisk',
  'realityEconInputs','realityEconReceipts'];
 let serial = 0, loading = false;
 const isSignedIn = () => auth.style.display === 'block';
 const change = (id, value) => { const n = $(id); if (n) n.textContent = value; };
 const clear = (message) => {
  change('realityEconSignals', '—');
  change('realityEconSignalsNote', 'Source-backed, not yet validated');
  change('realityEconSettled', '—');
  change('realityEconHuman', 'Not measured');
  change('realityEconCapacity', 'Not measured');
  change('realityEconCash', 'Not established');
  change('realityEconRisk', 'Not established');
  change('realityEconInputs', 'Unverified');
  change('realityEconReceipts', 'Unverified');
  status.textContent = message;
  records.replaceChildren();
  const p = document.createElement('p');
  p.textContent = 'No owner-specific evidence is displayed until a verified readback succeeds.';
  records.append(p);
 };
 const validWorkday = d => {
  const c = d?.counts;
  return d?.ok === true && d.read_only === true &&
   d.phase === 'DISCOVERY_AND_PRIORITIZATION_ONLY_NOT_AN_EXECUTED_WORKDAY' &&
   d.evidence_status === 'SOURCE_BACKED_OBSERVATIONS_NOT_INDEPENDENTLY_CONFIRMED_DEFECTS' &&
   ['SOURCE_BACKED_DISCOVERY_PARTIAL','SOURCE_BACKED_DISCOVERY_OBSERVED'].includes(d.status) &&
   d.source_scope === 'REALITY_GITHUB_REPOSITORY_ONLY' &&
   d.job_started === false && d.installation_authorized === false &&
   d.production_changed === false && d.shift_completed === false &&
   nat(c?.source_backed_opportunities) && nat(c?.open_issues) &&
   nat(c?.open_pull_requests) && nat(c?.historical_failure_signals) &&
   c.source_backed_opportunities === c.open_issues +
    c.open_pull_requests + c.historical_failure_signals &&
   c.verified_current_defects === 0 &&
   c.completed_customer_jobs_from_this_report === 0 &&
   d.value_measurement?.financial_roi_verified === false &&
   d.value_measurement?.verified_cash_savings_usd === null &&
   d.value_measurement?.human_discovery_baseline_minutes === null &&
   Array.isArray(d.items) && d.items.length <= 25 &&
   d.items.length <= c.source_backed_opportunities &&
   d.items.every(x => x?.verified_current_defect === false &&
    x.authorized_execution === false &&
    x.verified_time_saved_minutes === null);
 };
 const validRoi = d => {
  const s = d?.collection_state;
  return d?.ok === true &&
   d.version === 'reality-operational-roi-evidence-v2' &&
   d.endpoint_scope === 'SIGNED_IN_OWNER_ISOLATED_PREVIEW_READ_ONLY' &&
   d.scope === 'ISOLATED_SETTLEMENT_NOT_ENTIRE_BUSINESS_WORKFLOW' &&
   ['VERIFIED_ISOLATED_SETTLEMENT_EVIDENCE','NO_SETTLED_JOB_EVIDENCE'].includes(d.status) &&
   d.production_changed === false && d.owner_authorization_granted === false &&
   d.installation_authorized === false && d.work_executed_by_read === false &&
   d.financial_roi_verified === false &&
   d.verified_customer_financial_roi === false &&
   d.job_execution_authorized_by_analysis === false &&
   nat(d.distinct_isolated_jobs_verified) &&
   Array.isArray(d.jobs) && d.jobs.length <= 20 &&
   d.jobs.length === d.distinct_isolated_jobs_verified &&
   nat(s?.jobs_with_recorded_economic_inputs) &&
   s.jobs_with_recorded_economic_inputs <= d.jobs.length &&
   s.comparable_human_work_verified === 0 &&
   s.billable_provider_cost_verified === 0 &&
   s.verified_cash_savings_usd === null &&
   new Set(d.jobs.map(j => j.original_work_id)).size === d.jobs.length &&
   d.jobs.every(j =>
    WORK.test(j?.original_work_id) &&
    j.technical_settlement_status === 'INDEPENDENTLY_SETTLED_ISOLATED_PREVIEW' &&
    j.production_changed === false &&
    RUN.test(j.source_run_url) &&
    nat(j.measured?.claim_to_settlement_ms) &&
    j.measured?.full_job_duration_ms === null &&
    j.economic_value?.verified_hours_returned?.value === null &&
    j.economic_value?.verified_cash_savings_usd?.value === null &&
    j.human_labor_context?.human_task_effort_hours?.value === null &&
    Array.isArray(j.economic_observations));
 };
 const validLoop = d => d?.ok === true &&
  d.status === 'OWNER_GOVERNED_LOOP_READBACK' &&
  d.owner_installation_authorized_by_read === false &&
  d.external_action_performed === false &&
  d.production_changed === false &&
  d.full_loop_proof_not_inferred_from_settlement === true &&
  Array.isArray(d.jobs) && d.jobs.length <= 12 &&
  Array.isArray(d.independent_final_receipts) &&
  d.independent_final_receipts.length <= 12 &&
  new Set(d.jobs.map(j => j.original_work_id)).size === d.jobs.length &&
  d.jobs.every(j =>
   WORK.test(j?.original_work_id) &&
   typeof j.phase === 'string' && j.phase.length < 81 &&
   typeof j.independently_settled === 'boolean' &&
   typeof j.universe_settlement_verified === 'boolean' &&
   typeof j.full_loop_independently_verified === 'boolean') &&
  d.independent_final_receipts.every(r =>
   r?.status === 'FULL_LOOP_INDEPENDENTLY_VERIFIED' &&
   WORK.test(r.original_work_id) &&
   r.production_changed === false &&
   /^[a-f0-9]{64}$/.test(r.artifact_sha256) &&
   /^sha256:[a-f0-9]{64}$/.test(r.verifier_artifact_digest));
 const paragraph = text => {
  const p = document.createElement('p'); p.textContent = text; records.append(p);
 };
 const appendJob = (id, title, details, url = null, label = '') => {
  const box = document.createElement('div'); box.className = 'reality-econ-record';
  const h = document.createElement('strong'); h.textContent = title;
  const p = document.createElement('p'); p.textContent = details;
  box.append(h, p);
  if (url) {
   const a = document.createElement('a');
   a.href = url; a.textContent = label; a.target = '_blank';
   a.rel = 'noopener noreferrer'; box.append(a);
  }
  records.append(box);
 };
 async function read(path) {
  const response = await fetch(path, {
   method: 'GET', credentials: 'same-origin', cache: 'no-store'
  });
  if (!response.ok) throw Error('READBACK_UNAVAILABLE');
  const data = await response.json();
  if (data?.ok !== true) throw Error('READBACK_UNVERIFIED');
  return data;
 }
 async function refresh() {
  if (!isSignedIn()) {
   ++serial;
   clear('Sign in to view private business-value evidence. Nothing is being started.');
   return;
  }
  if (loading) return;
  const epoch = ++serial;
  loading = true;
  status.textContent = 'Independently reading discovery, original-job settlement and final receipt records…';
  try {
   const results = await Promise.allSettled([
    read('/api/reality/workday-opportunities'),
    read('/api/reality/personal-operational-roi-v2'),
    read('/api/reality/personal-genuine-loop-status'),
    read('/api/reality/personal-shift-value-receipts')
   ]);
   if (epoch !== serial || !isSignedIn()) return;
   // A partially failed readback never changes UNKNOWN into zero.
   const work = results[0].status === 'fulfilled' && validWorkday(results[0].value) ?
    results[0].value : null;
   const roi = results[1].status === 'fulfilled' && validRoi(results[1].value) ?
    results[1].value : null;
   const loop = results[2].status === 'fulfilled' && validLoop(results[2].value) ?
    results[2].value : null;
   const shiftValue = results[3].status === 'fulfilled' &&
    validShiftValue(results[3].value) ? results[3].value : null;
   clear('Reading the latest owner-scoped evidence.');
   if (work) {
    change('realityEconSignals', String(work.counts.source_backed_opportunities));
    change('realityEconSignalsNote', work.status === 'SOURCE_BACKED_DISCOVERY_PARTIAL' ?
     'Partial sources · each needs independent validation' :
     'Provider observations · current defects not yet verified');
   }
   if (roi) {
    change('realityEconSettled', String(roi.distinct_isolated_jobs_verified));
    change('realityEconInputs', String(roi.collection_state.jobs_with_recorded_economic_inputs) +
     ' job(s) · not verified savings');
    // This exact ROI version never certifies gross hours or net cash savings.
    change('realityEconHuman', 'Not measured');
    change('realityEconCapacity', 'Not measured');
    change('realityEconCash', 'Not established');
   }
   const receiptByJob = new Map();
   if (loop) {
    const jobs = new Map(loop.jobs.map(j => [j.original_work_id,j]));
    for (const receipt of loop.independent_final_receipts) {
     const j = jobs.get(receipt.original_work_id);
     if (j?.independently_settled === true &&
      j.universe_settlement_verified === true &&
      j.full_loop_independently_verified === true)
      receiptByJob.set(receipt.original_work_id, receipt);
    }
    change('realityEconReceipts', String(receiptByJob.size) +
     ' independently reconciled');
   }
   // Never infer verified economic claims from a technical settlement.
   change('realityEconRisk', 'Not established');
   records.replaceChildren();
   if (loop && loop.jobs.length) {
    for (const j of loop.jobs.slice(0,5)) {
     const completed = j.independently_settled &&
      j.universe_settlement_verified;
     const proof = receiptByJob.get(j.original_work_id);
     const historical = j.historical_reconciliation?.status ===
      'HISTORICAL_RECONCILIATION_ALREADY_VERIFIED_NO_NEW_EFFECT' &&
      j.historical_reconciliation?.current_job_settled === false;
     const ledgerShowsSettlement = j.phase === 'SETTLED_ISOLATED';
     const phase = completed ? 'Independently settled · isolated preview' :
      historical ? 'Historical outcome recognized · this job unsettled' :
      ledgerShowsSettlement ?
       'Ledger phase settled in isolation · independent completion not verified' :
       'Original job pending · ' + j.phase.replaceAll('_',' ').slice(0,72);
     const title = String(j.capability_id || 'Original job').replaceAll('-',' ') +
      ' · ' + j.original_work_id.slice(5,13);
     const detail = phase +
      (proof ? ' · Exact final-loop receipt independently verified.' :
       ' · No matching final-loop PDF receipt claimed.');
     appendJob(j.original_work_id,title,detail,
      proof ? '/api/reality/personal-genuine-final-receipt-pdf?work_id=' +
       encodeURIComponent(j.original_work_id) : null,
      proof ? 'Open independently verified final receipt (PDF)' : '');
    }
   } else if (roi && roi.jobs.length) {
    for (const j of roi.jobs.slice(0,4)) {
     appendJob(j.original_work_id,
      j.capability_id.replaceAll('-',' ') + ' · ' + j.original_work_id.slice(5,13),
      'Independently settled in isolated preview · ' +
      'execution claim to settlement ' + j.measured.claim_to_settlement_ms +
      ' ms. This is not the full job duration or human time returned.',
      j.source_run_url,'Inspect signed provider execution');
    }
   } else if (loop || roi) {
    paragraph('No independently verified original-job evidence in the current owner readback.');
   } else {
    paragraph('Owner settlement and final-receipt sources are unavailable. Completion is unknown.');
   }
   if (shiftValue && shiftValue.receipts.length) {
    paragraph('Independently settled employee originals · '+shiftValue.receipts.length+
     ' exact receipts. Each PDF includes the job proof, recorded token evidence when available, and the current unverified ROI status. Original receipts remain immutable.');
    for (const item of shiftValue.receipts) {
     if (receiptByJob.has(item.original_work_id)) continue;
     const workTitle = item.kind === 'NATIVE_CODE_REPAIR' ?
      'Verified engineering repair' : 'Verified pull-request review';
     const tokens = item.model_output_tokens_recorded !== null ?
      ' · '+item.model_output_tokens_recorded+' recorded output tokens (partial)' :
      ' · token usage unavailable';
     appendJob(item.original_work_id,
      workTitle+' · '+item.original_work_id.slice(5,13),
      'Independently settled · '+item.source_ref+tokens+
      ' · human capacity and ROI not measured.',
      '/api/reality/personal-shift-value-receipt-pdf?work_id='+
       encodeURIComponent(item.original_work_id),
      'Download final job receipt + economic accountability (PDF)');
    }
   }
   const checked = [work,roi,loop,shiftValue].filter(Boolean).length;
   status.textContent = checked === 0 ?
    'Evidence readback unavailable; all counts remain unverified. No action started.' :
    checked === 4 ?
    'Read-only source check complete · 4/4 evidence sources validated. Receipt PDFs include economic evidence status. No jobs or approvals created.' :
    'Partial readback · ' + checked +
    '/4 evidence sources validated. Missing values are unknown, not zero.';
  } catch {
   if (epoch === serial && isSignedIn())
    clear('Evidence readback failed. No jobs, receipts, time saved or dollars are inferred.');
  } finally { loading = false; }
 }
 if (typeof MutationObserver === 'function') {
  new MutationObserver(() => {
   ++serial;
   if (!isSignedIn()) clear('Sign in to view owner-only economic evidence.');
   else void refresh();
  }).observe(auth,{attributes:true,attributeFilter:['style']});
 }
 if (typeof document.addEventListener === 'function')
  document.addEventListener('visibilitychange', () => {
   if (document.visibilityState === 'visible' && isSignedIn()) void refresh();
  });
 if (typeof window !== 'undefined') {
  window.realityEconomicEvidenceRefresh = () => { void refresh(); };
  if (typeof window.addEventListener === 'function')
   window.addEventListener('focus', () => { if (isSignedIn()) void refresh(); });
 }
 if (typeof setInterval === 'function')
  setInterval(() => {
   if (isSignedIn() &&
    (typeof document.visibilityState !== 'string' ||
     document.visibilityState === 'visible')) void refresh();
  },90000);
 void refresh();
})();
