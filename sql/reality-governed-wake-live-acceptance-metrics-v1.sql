-- Reality Governed Wake v1: live-acceptance timing and safety evidence.
-- READ ONLY. No synthetic work, approval, installer, or queue mutations.
-- Capture this query before AND after the one-time owner-approved preview test.
-- Empty output means no qualifying new wake; it is NOT a passing wake test.
SELECT
 w.original_work_id,
 w.approval_id,
 w.target_environment,
 a.approved_at AS owner_approval_committed_at_utc,
 w.created_at AS wake_intent_created_at_utc,
 w.dispatched_at AS provider_delivery_accepted_at_utc,
 w.first_worker_alive_at AS oidc_worker_alive_at_utc,
 a.consumed_at AS original_install_authorization_consumed_at_utc,
 w.updated_at AS latest_wake_evidence_at_utc,
 CASE WHEN w.dispatched_at IS NOT NULL THEN
   round((extract(epoch FROM (w.dispatched_at-a.approved_at))*1000)::numeric,0)
 ELSE NULL END AS approval_to_delivery_ms,
 CASE WHEN w.first_worker_alive_at IS NOT NULL
    AND w.dispatched_at IS NOT NULL THEN
   round((extract(epoch FROM
       (w.first_worker_alive_at-w.dispatched_at))*1000)::numeric,0)
 ELSE NULL END AS delivery_to_signed_life_ms,
 w.dispatch_attempts,
 w.dispatch_fence,
 w.worker_run_id,
 w.worker_run_attempt,
 w.wake_state,
 q.phase AS original_customer_job_phase,
 a.installed_commit_sha,
 CASE WHEN a.settlement_receipt->>'independent_outcome_verified'='true'
  THEN true ELSE false END AS independent_original_settlement_reported,
 EXISTS(
  SELECT 1 FROM reality_internal.genuine_independent_final_receipts_v1 r
  WHERE r.original_work_id=w.original_work_id
    AND r.artifact_sha256=w.artifact_sha256
    AND r.owner_id=w.owner_id
    AND r.production_changed=false
 ) AS independently_recorded_final_receipt,
 (SELECT count(*) FROM reality_internal.governed_execution_wake_events_v1 e
  WHERE e.approval_id=w.approval_id) AS durable_transition_receipts
FROM reality_internal.governed_execution_wake_outbox_v1 w
JOIN reality_internal.genuine_preview_install_approvals_v1 a
 ON a.approval_id=w.approval_id
 AND a.original_work_id=w.original_work_id
 AND a.artifact_hash=w.artifact_sha256
JOIN reality_internal.genuine_capability_queue_v1 q
 ON q.trigger_id=w.trigger_id
 AND q.owner_id=w.owner_id
WHERE w.target_environment='ISOLATED_PREVIEW'
ORDER BY a.approved_at DESC LIMIT 25;
