-- Reality Governed Execution Wake Protocol v1, isolated PREVIEW proposal.
-- NOT auto-applied: requires isolated DB migration review, edge broker credential,
-- signed GitHub OIDC proof-of-life, and a verified controlled acceptance test.
-- Only persisted owner approvals create intent; no event grants execution.
CREATE TABLE IF NOT EXISTS reality_internal.governed_execution_wake_outbox_v1 (
  approval_id uuid PRIMARY KEY
    REFERENCES reality_internal.genuine_preview_install_approvals_v1(approval_id),
  trigger_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  original_work_id text NOT NULL CHECK (original_work_id ~ '^work:[a-f0-9]{32}$'),
  artifact_sha256 text NOT NULL CHECK (artifact_sha256 ~ '^[a-f0-9]{64}$'),
  pre_state_hash text NOT NULL CHECK (pre_state_hash ~ '^[a-f0-9]{64}$'),
  approval_valid_time timestamptz NOT NULL,
  goal_transition_event_id uuid NOT NULL,
  provider_failure_hash text NOT NULL,
  target_environment text NOT NULL CHECK (target_environment = 'ISOLATED_PREVIEW'),
  wake_state text NOT NULL DEFAULT 'WAKE_PENDING'
    CHECK (wake_state IN ('WAKE_PENDING','DISPATCH_CLAIMED','DISPATCH_ACCEPTED',
      'WORKER_ALIVE','GOVERNANCE_READY','EXECUTING','RETRY_PENDING',
      'STALE_APPROVAL_BLOCKED','ESCALATED','SETTLED','RECEIPT_VERIFIED')),
  dispatch_fence bigint NOT NULL DEFAULT 0 CHECK (dispatch_fence >= 0),
  dispatch_claim_id uuid,
  dispatch_lease_expires_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  dispatch_attempts integer NOT NULL DEFAULT 0
    CHECK (dispatch_attempts >= 0 AND dispatch_attempts <= 5),
  last_delivery_id uuid,
  dispatched_at timestamptz,
  first_worker_alive_at timestamptz,
  worker_run_id bigint,
  worker_run_attempt integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (approval_id,artifact_sha256)
);
CREATE INDEX IF NOT EXISTS governed_execution_wake_ready_v1
  ON reality_internal.governed_execution_wake_outbox_v1
  (next_attempt_at,created_at)
  WHERE wake_state IN ('WAKE_PENDING','RETRY_PENDING','DISPATCH_CLAIMED','DISPATCH_ACCEPTED');

CREATE TABLE IF NOT EXISTS reality_internal.governed_execution_wake_events_v1 (
  event_no bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  approval_id uuid NOT NULL
    REFERENCES reality_internal.governed_execution_wake_outbox_v1(approval_id),
  dispatch_fence bigint NOT NULL CHECK (dispatch_fence >= 0),
  wake_state text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT now()
);
-- Every broker attempt/recovery emits immutable append-only evidence.
CREATE TABLE IF NOT EXISTS reality_internal.governed_execution_wake_nonces_v1 (
  nonce_id uuid PRIMARY KEY,
  approval_id uuid NOT NULL
    REFERENCES reality_internal.governed_execution_wake_outbox_v1(approval_id),
  dispatch_fence bigint NOT NULL CHECK (dispatch_fence >= 1),
  worker_run_id bigint NOT NULL CHECK (worker_run_id >= 1),
  verified_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reality_internal.governed_execution_wake_outbox_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE reality_internal.governed_execution_wake_events_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE reality_internal.governed_execution_wake_nonces_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_execution_wake_outbox_v1 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON reality_internal.governed_execution_wake_events_v1 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON reality_internal.governed_execution_wake_nonces_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.governed_execution_wake_outbox_v1 TO service_role;
GRANT SELECT,INSERT ON reality_internal.governed_execution_wake_events_v1 TO service_role;
GRANT SELECT,INSERT ON reality_internal.governed_execution_wake_nonces_v1 TO service_role;
GRANT USAGE,SELECT ON SEQUENCE reality_internal.governed_execution_wake_events_v1_event_no_seq TO service_role;

CREATE OR REPLACE FUNCTION reality_internal.enqueue_authorized_wake_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE q reality_internal.genuine_capability_queue_v1%rowtype;
BEGIN
 SELECT * INTO STRICT q FROM reality_internal.genuine_capability_queue_v1
 WHERE trigger_id=NEW.trigger_id;
 IF q.owner_id IS DISTINCT FROM NEW.owner_id
    OR q.original_work_id IS DISTINCT FROM NEW.original_work_id
    OR q.phase <> 'AWAITING_OWNER_APPROVAL'
    OR q.qualification_receipt->>'artifact_sha256' IS DISTINCT FROM NEW.artifact_hash
    OR NEW.target_environment <> 'ISOLATED_PREVIEW'
    OR NEW.approval_receipt->>'approval_origin' <>
       'AUTHENTICATED_OWNER_EXPLICIT_ACTION'
    OR NEW.consumed_at IS NOT NULL OR NEW.installed_commit_sha IS NOT NULL
 THEN RAISE EXCEPTION 'WAKE_OUTBOX_EXACT_DURABLE_APPROVAL_REQUIRED'; END IF;
 INSERT INTO reality_internal.governed_execution_wake_outbox_v1
 (approval_id,trigger_id,owner_id,original_work_id,artifact_sha256,
  pre_state_hash,approval_valid_time,goal_transition_event_id,
  provider_failure_hash,target_environment)
 VALUES (NEW.approval_id,NEW.trigger_id,NEW.owner_id,NEW.original_work_id,
  NEW.artifact_hash,NEW.pre_state_hash,NEW.valid_time,
  q.goal_transition_event_id,q.provider_failure_hash,NEW.target_environment);
 INSERT INTO reality_internal.governed_execution_wake_events_v1
  (approval_id,dispatch_fence,wake_state,detail)
 VALUES (NEW.approval_id,0,'WAKE_PENDING',
   jsonb_build_object('source','OWNER_APPROVAL_COMMIT','approval_valid_time',NEW.valid_time));
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS governed_execution_wake_on_approval_v1
 ON reality_internal.genuine_preview_install_approvals_v1;
CREATE TRIGGER governed_execution_wake_on_approval_v1
 AFTER INSERT ON reality_internal.genuine_preview_install_approvals_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.enqueue_authorized_wake_v1();

-- The dispatcher must be server authenticated. A claim is delivery intent
-- only: it never consumes the owner's one-use execution authorization.
CREATE OR REPLACE FUNCTION public.reality_claim_governed_wake_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE w reality_internal.governed_execution_wake_outbox_v1%rowtype;
        q reality_internal.genuine_capability_queue_v1%rowtype;
        a reality_internal.genuine_preview_install_approvals_v1%rowtype;
        e reality_internal.goal_publication_epochs%rowtype;
        next_fence bigint;
        next_tries integer;
        claim uuid;
BEGIN
 IF current_user <> 'service_role' THEN
  RAISE EXCEPTION 'WAKE_SERVICE_ROLE_REQUIRED'; END IF;
 SELECT * INTO w FROM reality_internal.governed_execution_wake_outbox_v1
 WHERE ((wake_state IN ('WAKE_PENDING','RETRY_PENDING') AND next_attempt_at<=now())
   OR (wake_state IN ('DISPATCH_CLAIMED','DISPATCH_ACCEPTED')
      AND dispatch_lease_expires_at<=now()))
 ORDER BY next_attempt_at,created_at
 FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','NO_APPROVED_WAKE_READY',
   'worker_started',false,'owner_approval_created',false); END IF;
 SELECT * INTO a FROM reality_internal.genuine_preview_install_approvals_v1
  WHERE approval_id=w.approval_id;
 SELECT * INTO q FROM reality_internal.genuine_capability_queue_v1
  WHERE trigger_id=w.trigger_id;
 SELECT * INTO e FROM reality_internal.goal_publication_epochs
  WHERE user_id=q.owner_id AND conversation_id=q.conversation_id;
 IF a.approval_id IS NULL OR q.trigger_id IS NULL OR e.user_id IS NULL
    OR a.owner_id IS DISTINCT FROM w.owner_id
    OR a.original_work_id IS DISTINCT FROM w.original_work_id
    OR a.artifact_hash IS DISTINCT FROM w.artifact_sha256
    OR a.pre_state_hash IS DISTINCT FROM w.pre_state_hash
    OR q.goal_transition_event_id IS DISTINCT FROM w.goal_transition_event_id
    OR e.last_transition_event_id IS DISTINCT FROM w.goal_transition_event_id
    OR q.provider_failure_hash IS DISTINCT FROM w.provider_failure_hash
    OR q.qualification_receipt->>'artifact_sha256' IS DISTINCT FROM w.artifact_sha256
    OR q.phase <> 'AWAITING_OWNER_APPROVAL'
    OR a.consumed_at IS NOT NULL OR a.installed_commit_sha IS NOT NULL
    OR a.approval_receipt->>'approval_origin' <>
      'AUTHENTICATED_OWNER_EXPLICIT_ACTION'
 THEN
   UPDATE reality_internal.governed_execution_wake_outbox_v1
     SET wake_state='STALE_APPROVAL_BLOCKED',updated_at=now()
   WHERE approval_id=w.approval_id;
   INSERT INTO reality_internal.governed_execution_wake_events_v1
     (approval_id,dispatch_fence,wake_state,detail)
   VALUES(w.approval_id,w.dispatch_fence,'STALE_APPROVAL_BLOCKED',
     jsonb_build_object('reason','MATERIAL_STATE_OR_APPROVAL_CHANGED'));
   RETURN jsonb_build_object('status','STALE_APPROVAL_BLOCKED',
     'approval_id',w.approval_id,'worker_started',false);
 END IF;
 next_tries:=w.dispatch_attempts+1;
 IF next_tries>5 THEN
  UPDATE reality_internal.governed_execution_wake_outbox_v1
    SET wake_state='ESCALATED',updated_at=now() WHERE approval_id=w.approval_id;
  INSERT INTO reality_internal.governed_execution_wake_events_v1
   (approval_id,dispatch_fence,wake_state,detail)
  VALUES (w.approval_id,w.dispatch_fence,'ESCALATED',
   jsonb_build_object('reason','MAX_DELIVERY_ATTEMPTS'));
  RETURN jsonb_build_object('status','ESCALATED','approval_id',w.approval_id);
 END IF;
 next_fence:=w.dispatch_fence+1;
 claim:=gen_random_uuid();
 UPDATE reality_internal.governed_execution_wake_outbox_v1
 SET wake_state='DISPATCH_CLAIMED',dispatch_attempts=next_tries,
   dispatch_fence=next_fence,dispatch_claim_id=claim,
   dispatch_lease_expires_at=now()+interval '2 minutes',
   next_attempt_at=now()+make_interval(secs => least(300, 5*power(2,next_tries)::integer)),
   updated_at=now()
 WHERE approval_id=w.approval_id;
 INSERT INTO reality_internal.governed_execution_wake_events_v1
  (approval_id,dispatch_fence,wake_state,detail)
 VALUES(w.approval_id,next_fence,'DISPATCH_CLAIMED',
  jsonb_build_object('attempt',next_tries,'claim_id',claim));
 RETURN jsonb_build_object('status','DELIVERY_CLAIMED_NOT_EXECUTION_AUTHORIZED',
   'approval_id',w.approval_id,'trigger_id',w.trigger_id,'claim_id',claim,
   'dispatch_fence',next_fence,'original_work_id',w.original_work_id,
   'artifact_sha256',w.artifact_sha256,'pre_state_hash',w.pre_state_hash,
   'valid_time',w.approval_valid_time,'goal_transition_event_id',w.goal_transition_event_id,
   'provider_failure_hash',w.provider_failure_hash,'target_environment','ISOLATED_PREVIEW',
   'owner_approval_created',false,'execution_authorized',false);
END $fn$;

CREATE OR REPLACE FUNCTION public.reality_record_governed_delivery_v1(
 p_approval_id uuid,p_claim_id uuid,p_fence bigint,p_delivery_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE w reality_internal.governed_execution_wake_outbox_v1%rowtype;
BEGIN
 IF current_user <> 'service_role' THEN
  RAISE EXCEPTION 'WAKE_SERVICE_ROLE_REQUIRED'; END IF;
 SELECT * INTO STRICT w FROM reality_internal.governed_execution_wake_outbox_v1
  WHERE approval_id=p_approval_id FOR UPDATE;
 IF w.wake_state<>'DISPATCH_CLAIMED' OR
    w.dispatch_claim_id IS DISTINCT FROM p_claim_id OR
    w.dispatch_fence<>p_fence OR w.dispatch_lease_expires_at<=now()
 THEN RAISE EXCEPTION 'WAKE_DELIVERY_FENCE_EXPIRED_OR_CONFLICT';END IF;
 UPDATE reality_internal.governed_execution_wake_outbox_v1
 SET wake_state='DISPATCH_ACCEPTED',last_delivery_id=p_delivery_id,
     dispatch_lease_expires_at=now()+interval '15 minutes',dispatched_at=now(),
     updated_at=now()
 WHERE approval_id=p_approval_id;
 INSERT INTO reality_internal.governed_execution_wake_events_v1
 (approval_id,dispatch_fence,wake_state,detail)
 VALUES(p_approval_id,p_fence,'DISPATCH_ACCEPTED',
   jsonb_build_object('delivery_id',p_delivery_id,'execution_authorized',false));
 RETURN jsonb_build_object('status','DISPATCH_ACCEPTED_NOT_EXECUTION_PROVEN',
 'approval_id',p_approval_id,'dispatch_fence',p_fence,
 'worker_alive',false,'execution_authorized',false);
END $fn$;

-- Fail closed: no public RPC exposure, including direct anonymous EXECUTE.
REVOKE ALL ON FUNCTION public.reality_claim_governed_wake_v1()
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reality_record_governed_delivery_v1(uuid,uuid,bigint,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_governed_wake_v1() TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_record_governed_delivery_v1(uuid,uuid,bigint,uuid) TO service_role;
