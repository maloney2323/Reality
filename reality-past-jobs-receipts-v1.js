// Owner-scoped Past Jobs & Receipts. Read-only projections, never work authority.
// Every displayed full-loop receipt is independently read back from the owner ledger.
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const WORK = /^work:[a-f0-9]{32}$/;
 const SHA40 = /^[a-f0-9]{40}$/;
 const GITHUB_SOURCE = /^https:\/\/github\.com\/maloney2323\/Reality\/(?:blob|commit|pull|issues)\//;
 let serial = 0;

 const home = $('realitySimpleHome');
 const panel = $('simpleArchivePanel');
 if (!home || !panel || !$('archiveJobs')) return;

 // Move the older read-only action-receipt viewer, not the live shift output.
 const priorActions = $('wcCompletionCenter');
 const shiftOutput = $('wcShiftReceipt');
 if (priorActions && shiftOutput) priorActions.before(shiftOutput);
 if (priorActions) $('archivePriorActions').append(priorActions);

 const empty = (target, message) => {
  target.replaceChildren();
  const p = document.createElement('p');
  p.className = 'archive-note';
  p.textContent = message;
  target.append(p);
 };
 function record(target, title, status, detail, href, linkLabel) {
  const article = document.createElement('article');
  article.className = 'archive-record';
  const stage = document.createElement('div');
  stage.className = 'simple-kicker';
  stage.textContent = status;
  const heading = document.createElement('h3');
  heading.textContent = title;
  const explanation = document.createElement('p');
  explanation.textContent = detail;
  article.append(stage, heading, explanation);
  if (href && linkLabel) {
   const a = document.createElement('a');
   a.href = href;
   a.target = '_blank';
   a.rel = 'noopener noreferrer';
   a.textContent = linkLabel;
   article.append(a);
  }
  target.append(article);
 }
 function signedIn() {
  return $('privateReady')?.style.display === 'block';
 }
 function close() {
  document.body.classList.remove('reality-archive-open');
  panel.hidden = true;
  home.scrollIntoView({ behavior: 'smooth', block: 'start' });
 }
 async function load() {
  const epoch = ++serial;
  const original = $('archiveJobs'), upgrades = $('archivePriorUpgrades');
  const status = $('archiveReadback'), refresh = $('archiveRefresh');
  original.replaceChildren();
  upgrades.replaceChildren();
  if (!signedIn()) {
   status.textContent = 'Sign in to read your private job history. No action was performed.';
   empty(original, 'Your completed jobs and receipts are only available after sign-in.');
   empty(upgrades, 'Sign-in required.');
   return;
  }
  refresh.disabled = true;
  status.textContent = 'Reading saved original-job settlements and historical installations · Read only…';
  const get = async path => {
   const response = await fetch(path, { method: 'GET', credentials: 'same-origin', cache: 'no-store' });
   const value = await response.json();
   if (!response.ok || value?.ok !== true) throw Error('OWNER_ARCHIVE_READBACK_UNAVAILABLE');
   return value;
  };
  try {
   // Both endpoints use the authenticated server session. Browser-supplied job
   // identifiers are never accepted as readback ownership assertions.
   const [jobsResult, historyResult] = await Promise.allSettled([
    get('/api/reality/personal-genuine-loop-status'),
    get('/api/reality/personal-gap-intake')
   ]);
   if (epoch !== serial || !signedIn()) return;
   let completed = 0, historical = 0, closedNoWork = 0, downloads = 0;
   let jobReadbackVerified = false, upgradeReadbackVerified = false;
   if (jobsResult.status === 'fulfilled') {
    const data = jobsResult.value;
    if (data.status !== 'OWNER_GOVERNED_LOOP_READBACK' ||
        data.production_changed !== false || data.external_action_performed !== false ||
        !Array.isArray(data.jobs) || data.jobs.length > 12 ||
        !Array.isArray(data.independent_final_receipts) ||
        data.independent_final_receipts.length > 12) {
     empty(original, 'Trusted job readback failed validation. No completion inferred.');
    } else {
     jobReadbackVerified = true;
     const receipts = new Map(data.independent_final_receipts.filter(r =>
      r.status === 'FULL_LOOP_INDEPENDENTLY_VERIFIED' && WORK.test(String(r.original_work_id || '')))
      .map(r => [r.original_work_id, r]));
     const seen = new Set();
     for (const job of data.jobs) {
      const id = String(job.original_work_id || '');
      if (!WORK.test(id) || seen.has(id)) continue;
      seen.add(id);
      const receipt = receipts.get(id);
      const fullySettled = job.independently_settled === true &&
       job.universe_settlement_verified === true &&
       (job.capability_id !== 'reality-general-execution-receipt' ||
        (job.full_loop_independently_verified === true && Boolean(receipt)));
      const previouslySatisfied = job.historical_reconciliation?.status ===
       'HISTORICAL_RECONCILIATION_ALREADY_VERIFIED_NO_NEW_EFFECT' &&
       job.historical_reconciliation?.current_job_settled === false;
      const disposition = job.historical_no_work_final_disposition;
      const closedWithoutExecution = job.terminal_no_new_work_verified === true &&
       disposition?.status === 'HISTORICAL_OBJECTIVE_SATISFIED_NO_NEW_EXECUTION' &&
       disposition.independent_database_readback === true &&
       disposition.original_job_completed === false &&
       disposition.original_execution_replayed === false &&
       disposition.new_universe_settlement_written === false &&
       disposition.new_execution_claim_consumed === false &&
       disposition.production_changed === false &&
       Number.isSafeInteger(disposition.signed_github_run_id) &&
       disposition.signed_github_run_id > 0;
      if (!fullySettled && !previouslySatisfied && !closedWithoutExecution) continue;
      const name = String(job.capability_id || 'Reality capability')
       .replace(/^reality-/, '').replaceAll('-', ' ');
      if (closedWithoutExecution) {
       closedNoWork++;
       record(original, name + ' · ' + id.slice(5, 13),
        'VERIFIED CLOSED · OBJECTIVE ALREADY SATISFIED · NO NEW EXECUTION',
        'Reality independently read back the immutable final no-work disposition ' +
        String(disposition.receipt_id || '') + '. Two earlier Universe settlements ' +
        'satisfied the same objective. This original job was not executed or settled again; ' +
        'no additional work, PDF completion receipt or labor savings are claimed.',
        'https://github.com/maloney2323/Reality/actions/runs/' +
         disposition.signed_github_run_id,
        'View signed disposition worker evidence');
      } else if (fullySettled) {
       completed++;
       if (receipt) downloads++;
       record(original, name + ' · ' + id.slice(5, 13),
        receipt ? 'FULL LOOP VERIFIED · RECEIPT READY' : 'ORIGINAL JOB SETTLED · VERIFIED',
        'Owner-bound job ' + id + '. Independent Universe settlement verified. ' +
        (receipt ? 'Final customer PDF is independently verified and available.' :
         'No independent final-loop PDF was returned; no full-loop receipt is claimed.'),
        receipt ? '/api/reality/personal-genuine-final-receipt-pdf?work_id=' +
         encodeURIComponent(id) : null,
        receipt ? 'Download independently verified final receipt (PDF)' : null);
      } else {
       historical++;
       record(original, name + ' · ' + id.slice(5, 13),
        'HISTORICAL · PREVIOUS RESULT RECOGNIZED',
        'A verified earlier reconciliation already satisfied the target. ' +
        'This particular job has NOT independently settled and no second receipt was generated.');
      }
     }
     if (!completed && !historical && !closedNoWork) empty(original,
      'No verified completed original jobs or historical reconciliations were returned. Active jobs remain in the separate work queue.');
    }
   } else {
    empty(original, 'Original-job receipts are temporarily unavailable. No completion has been inferred.');
   }

   if (historyResult.status === 'fulfilled') {
    const h = historyResult.value;
    if (h.status === 'OWNER_GAP_INTAKE_RECONCILED' &&
        h.read_only === true && h.work_started === false &&
        h.installation_authorized === false && h.production_changed === false &&
        Array.isArray(h.settled_history) && h.settled_history.length <= 12) {
     upgradeReadbackVerified = true;
     const seenCommits = new Set();
     for (const item of h.settled_history) {
      if (item.stage !== 'SETTLED_ISOLATED' ||
          item.historical_settlement_verified !== true ||
          !SHA40.test(String(item.source_commit || '')) ||
          seenCommits.has(item.source_commit)) continue;
      seenCommits.add(item.source_commit);
      record(upgrades, String(item.title || 'Earlier installed upgrade'),
       'HISTORICAL INSTALLATION · VERIFIED',
       'Source commit ' + item.source_commit +
       '. This is older installation evidence, not a new capability gap or an additional final receipt.',
       GITHUB_SOURCE.test(String(item.source_url || '')) ? item.source_url : null,
       'View prior installation source');
     }
     if (!seenCommits.size) empty(upgrades, 'No verified historical installations were returned.');
    } else empty(upgrades, 'Historical intake readback was not independently verified.');
   } else empty(upgrades, 'Historical upgrade records are temporarily unavailable.');
   status.textContent = (jobReadbackVerified ?
    completed + ' independently settled original job(s) · ' +
    downloads + ' verified final PDF receipt(s) · ' +
    closedNoWork + ' verified no-new-work final disposition(s) · ' +
    historical + ' historical observations without a final disposition.' :
    'Original-job readback unavailable; completion counts are unknown.') +
    (upgradeReadbackVerified ?
     ' Earlier installation history loaded.' :
     ' Historical installation readback unavailable.') +
    ' Incomplete jobs are not marked finished. Nothing was queued, approved or restarted.';
  } catch {
   if (epoch !== serial) return;
   empty(original, 'Saved history could not be verified. No completion claim made.');
   status.textContent = 'Read-only archive unavailable; no action performed.';
  } finally {
   if (epoch === serial) refresh.disabled = false;
  }
 }
 function open() {
  document.body.classList.remove('reality-details-open');
  const toggle = $('simpleAdvancedToggle');
  if (toggle) {
   toggle.setAttribute('aria-expanded', 'false');
   toggle.textContent = 'Show full dashboard & technical controls';
  }
  panel.hidden = false;
  document.body.classList.add('reality-archive-open');
  home.scrollIntoView({ behavior: 'smooth', block: 'start' });
  void load();
  // Existing action-receipt reader is read-only. It keeps its own strict
  // conversation-scoped authentication and explicitly disclaims full-job proof.
  $('wcRefreshCompletion')?.click();
 }
 document.addEventListener('click', event => {
  if (event.target.closest('#simpleArchiveOpen,[data-archive-open]')) open();
  else if (event.target.closest('#simpleArchiveClose')) close();
 });
 $('archiveRefresh').addEventListener('click', () => void load());
 const auth = $('privateReady');
 if (auth) new MutationObserver(() => {
  if (!signedIn()) {
   ++serial;
   close();
   empty($('archiveJobs'), 'Sign in to access your saved jobs.');
   empty($('archivePriorUpgrades'), 'Sign-in required.');
   $('archiveReadback').textContent = 'Sign in to access your private work history.';
  }
 }).observe(auth, { attributes: true, attributeFilter: ['style'] });
})();
