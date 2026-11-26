-- Read-only verification of the existing canonical signed RESUME claim.
-- No new table, queue, approval, worker, or event mutation.
CREATE OR REPLACE FUNCTION public.reality_read_signed_release_preparation_event_v1(
 p_owner_id uuid,p_shift_id uuid,p_plan_fingerprint text,p_event_id uuid,
 p_worker_run_id uuid,p_lease_id uuid,p_running_release text,p_head text,p_revision bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE ok boolean;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RELEASE_PREPARATION_EVENT_SERVICE_ONLY';END IF;
 SELECT EXISTS(
 SELECT 1 FROM reality_internal.final_loop_resume_events_v1 e
 JOIN reality_internal.governed_employee_shifts_v1 s ON s.shift_id=e.shift_id AND s.owner_id=e.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id AND w.plan_fingerprint=s.plan_fingerprint
 JOIN reality_internal.signed_worker_actual_runs_v1 r ON r.run_id=e.governed_wake_worker_run_id
 JOIN reality_internal.governed_preview_shift_worker_leases_v1 l ON l.claim_id=p_lease_id
 JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.owner_id=s.owner_id AND a.shift_id=s.shift_id
 WHERE e.event_id=p_event_id AND e.owner_id=p_owner_id AND e.shift_id=p_shift_id
 AND s.plan_fingerprint=p_plan_fingerprint AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL
 AND s.planned_start_at<=pg_catalog.clock_timestamp() AND s.planned_end_at>pg_catalog.clock_timestamp()
 AND w.state='ACTIVE' AND e.state='SHADOW_PENDING' AND e.continuity_head_sha256=p_head
 AND e.continuity_revision=p_revision AND e.governed_wake_request_id IS NOT NULL
 AND e.governed_wake_queued_at>pg_catalog.clock_timestamp()-interval '5 minutes'
 AND r.run_id=p_worker_run_id AND r.status='STARTED' AND r.finished_at IS NULL
 AND r.started_at>=l.claimed_at AND r.started_at>pg_catalog.clock_timestamp()-interval '3 minutes'
 AND l.worker_key='preview-governed-employee-shift-worker' AND l.released_at IS NULL AND l.lease_expires_at>pg_catalog.clock_timestamp()
 AND a.state='CLAIMED_ONCE' AND a.release_sha=p_running_release AND a.provider_alias_observed_at>=a.claimed_at
 AND a.runtime_scope->>'production_changed'='false' AND a.runtime_scope->>'child_execution_enabled'='false'
 AND a.runtime_scope->>'parent_delivery_enabled'='false'
 AND (e.release_continuation_claim_id IS NULL OR e.release_continuation_claim_id=a.claim_id)
 AND EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 c
 WHERE c.owner_id=e.owner_id AND c.shift_id=e.shift_id AND c.original_work_id=e.original_work_id
 AND c.source_ref=e.source_ref AND c.condition_kind=e.signal_kind
 AND c.continuity_revision=e.continuity_revision AND c.continuity_head_sha256=e.continuity_head_sha256
 AND c.subscribed_receipt_sha256=e.previous_receipt_sha256)) INTO ok;
 RETURN pg_catalog.jsonb_build_object('status',CASE WHEN ok THEN 'SIGNED_RELEASE_PREPARATION_EVENT_VERIFIED' ELSE 'SIGNED_RELEASE_PREPARATION_EVENT_UNVERIFIED' END,
 'event_id',p_event_id,'worker_run_id',p_worker_run_id,'shift_id',p_shift_id,'read_only',true,
 'execution_authorized',false,'owner_approval_granted',false,'production_changed',false,'original_job_completed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_signed_release_preparation_event_v1(uuid,uuid,text,uuid,uuid,uuid,text,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_signed_release_preparation_event_v1(uuid,uuid,text,uuid,uuid,uuid,text,text,bigint) TO service_role;
