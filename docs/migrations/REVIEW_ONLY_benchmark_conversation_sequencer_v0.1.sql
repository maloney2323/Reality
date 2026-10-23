-- REVIEW ONLY: Reality per-conversation causal sequence v0.1
-- NOT applied by CI, NOT a production migration. Apply to benchmark DB only
-- after controlled staging and permission review. No existing table altered.
-- One row-level lock per root makes claim/finish atomic across server instances.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.reality_conversation_turn_fences (
 root_id text PRIMARY KEY,
 worldline_id text NOT NULL,
 owner_user_id uuid NOT NULL,
 sequence_num bigint NOT NULL DEFAULT 0 CHECK(sequence_num >= 0),
 active_turn_id text,
 active_claim_token uuid,
 last_committed_turn_id text,
 last_committed_entry_id text,
 last_committed_entry_hash text,
 changed_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT reality_turn_fence_active_pair CHECK (
  (active_turn_id IS NULL)=(active_claim_token IS NULL)
 )
);
ALTER TABLE public.reality_conversation_turn_fences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.reality_conversation_turn_fences FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.reality_conversation_turn_fences TO service_role;

-- Intentionally SECURITY INVOKER. service_role is the only permitted caller.
-- The trusted server independently validates Supabase Auth and derives root ID.
CREATE OR REPLACE FUNCTION public.reality_claim_conversation_turn(
 p_root_id text,p_worldline_id text,p_owner_user_id uuid,
 p_turn_id text,p_claim_token uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $claim$
DECLARE r public.reality_conversation_turn_fences%ROWTYPE;
BEGIN
 IF current_user <> 'service_role' THEN RAISE EXCEPTION 'REALITY_SEQUENCE_CALLER_DENIED'; END IF;
 IF p_root_id IS NULL OR length(p_root_id)<10 OR
    p_worldline_id<>'reality:primary' OR p_owner_user_id IS NULL OR
    p_turn_id !~ '^[A-Za-z0-9:_-]{1,96}$' OR p_claim_token IS NULL THEN
  RAISE EXCEPTION 'REALITY_SEQUENCE_INPUT_INVALID';
 END IF;
 INSERT INTO public.reality_conversation_turn_fences(root_id,worldline_id,owner_user_id)
 VALUES (p_root_id,p_worldline_id,p_owner_user_id) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT r FROM public.reality_conversation_turn_fences
  WHERE root_id=p_root_id FOR UPDATE;
 IF r.owner_user_id<>p_owner_user_id OR r.worldline_id<>p_worldline_id THEN
  RAISE EXCEPTION 'REALITY_SEQUENCE_ROOT_PRINCIPAL_MISMATCH';
 END IF;
 IF r.active_turn_id IS NOT NULL THEN
  -- No expiry/lease-steal. An interrupted turn requires explicit reconciliation,
  -- otherwise automatic timeouts could duplicate irreversible work.
  RETURN jsonb_build_object('status','BUSY','sequence_num',r.sequence_num,
    'active_turn_id',r.active_turn_id);
 END IF;
 UPDATE public.reality_conversation_turn_fences SET
  sequence_num=sequence_num+1,active_turn_id=p_turn_id,
  active_claim_token=p_claim_token,changed_at=clock_timestamp()
  WHERE root_id=p_root_id RETURNING * INTO r;
 RETURN jsonb_build_object('status','CLAIMED','sequence_num',r.sequence_num,
   'claim_token',r.active_claim_token,
   'prior_commit_entry_id',r.last_committed_entry_id,
   'prior_commit_hash',r.last_committed_entry_hash);
END;
$claim$;

CREATE OR REPLACE FUNCTION public.reality_finish_conversation_turn(
 p_root_id text,p_owner_user_id uuid,p_turn_id text,
 p_claim_token uuid,p_commit_entry_id text,p_commit_hash text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $finish$
DECLARE
 r public.reality_conversation_turn_fences%ROWTYPE;
 e public.reality_universe_entries%ROWTYPE;
BEGIN
 IF current_user <> 'service_role' THEN RAISE EXCEPTION 'REALITY_SEQUENCE_CALLER_DENIED'; END IF;
 SELECT * INTO STRICT r FROM public.reality_conversation_turn_fences
  WHERE root_id=p_root_id FOR UPDATE;
 IF r.owner_user_id<>p_owner_user_id OR
    r.active_turn_id IS DISTINCT FROM p_turn_id OR
    r.active_claim_token IS DISTINCT FROM p_claim_token THEN
  RAISE EXCEPTION 'REALITY_SEQUENCE_CLAIM_STALE_OR_WRONG_OWNER';
 END IF;
 SELECT * INTO STRICT e FROM public.reality_universe_entries
  WHERE entry_id=p_commit_entry_id;
 IF e.continuity_root_id<>p_root_id OR
    e.worldline_id<>r.worldline_id OR
    e.event_kind<>'REALITY_CAUSAL_TURN_RECEIPT' OR
    e.ledger_entry_hash<>p_commit_hash OR
    e.payload->>'phase'<>'COMMITTED' OR
    e.payload->>'turn_id'<>p_turn_id OR
    e.payload->>'authenticated_user_id'<>p_owner_user_id::text OR
    (e.payload->>'sequence_num')::bigint IS DISTINCT FROM r.sequence_num OR
    e.payload->>'prior_commit_entry_id' IS DISTINCT FROM r.last_committed_entry_id OR
    e.payload->>'prior_commit_hash' IS DISTINCT FROM r.last_committed_entry_hash THEN
  RAISE EXCEPTION 'REALITY_SEQUENCE_UNVERIFIED_COMMIT';
 END IF;
 UPDATE public.reality_conversation_turn_fences SET
  active_turn_id=NULL,active_claim_token=NULL,
  last_committed_turn_id=p_turn_id,
  last_committed_entry_id=p_commit_entry_id,
  last_committed_entry_hash=p_commit_hash,
  changed_at=clock_timestamp()
  WHERE root_id=p_root_id;
 RETURN jsonb_build_object('status','FINISHED','sequence_num',r.sequence_num,
  'commit_entry_id',p_commit_entry_id,'commit_hash',p_commit_hash);
END;
$finish$;


-- Verified recovery of an already-committed turn whose finish ACK was lost.
-- No release for a partial answer, no lease stealing, no model invocation.
CREATE OR REPLACE FUNCTION public.reality_reconcile_committed_conversation_turn(
 p_root_id text,p_owner_user_id uuid,p_turn_id text,
 p_commit_entry_id text,p_commit_hash text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $recover$
DECLARE
 r public.reality_conversation_turn_fences%ROWTYPE;
 e public.reality_universe_entries%ROWTYPE;
 predecessor public.reality_universe_entries%ROWTYPE;
 u public.reality_universe_entries%ROWTYPE;
 a public.reality_universe_entries%ROWTYPE;
 processing public.reality_universe_entries%ROWTYPE;
 cognition public.reality_universe_entries%ROWTYPE;
BEGIN
 IF current_user <> 'service_role' THEN
  RAISE EXCEPTION 'REALITY_RECONCILIATION_CALLER_DENIED';
 END IF;
 IF p_root_id IS NULL OR p_owner_user_id IS NULL OR
    p_turn_id IS NULL OR p_commit_entry_id IS NULL OR
    p_commit_hash IS NULL OR
    p_turn_id !~ '^[A-Za-z0-9:_-]{1,96}$' OR
    p_commit_hash !~ '^[0-9a-f]{64}$' THEN
  RAISE EXCEPTION 'REALITY_RECONCILIATION_INPUT_INVALID';
 END IF;
 SELECT * INTO STRICT r FROM public.reality_conversation_turn_fences
  WHERE root_id=p_root_id FOR UPDATE;
 IF r.owner_user_id IS DISTINCT FROM p_owner_user_id OR
    r.worldline_id IS DISTINCT FROM 'reality:primary' THEN
  RAISE EXCEPTION 'REALITY_RECONCILIATION_OWNER_OR_WORLDLINE_MISMATCH';
 END IF;
 -- Safe no-op only for the currently most recent verified commit.
 IF r.active_turn_id IS NULL THEN
  IF r.last_committed_turn_id IS DISTINCT FROM p_turn_id OR
     r.last_committed_entry_id IS DISTINCT FROM p_commit_entry_id OR
     r.last_committed_entry_hash IS DISTINCT FROM p_commit_hash THEN
    RAISE EXCEPTION 'REALITY_RECONCILIATION_NOT_CURRENT_COMMIT';
  END IF;
  RETURN jsonb_build_object('status','ALREADY_FINISHED',
    'sequence_num',r.sequence_num,
    'commit_entry_id',p_commit_entry_id,'commit_hash',p_commit_hash);
 END IF;
 IF r.active_turn_id IS DISTINCT FROM p_turn_id OR
    r.active_claim_token IS NULL THEN
  RAISE EXCEPTION 'REALITY_RECONCILIATION_DIFFERENT_ACTIVE_TURN';
 END IF;
 SELECT * INTO STRICT e FROM public.reality_universe_entries
  WHERE entry_id=p_commit_entry_id;
 IF e.continuity_root_id IS DISTINCT FROM p_root_id OR
    e.worldline_id IS DISTINCT FROM r.worldline_id OR
    e.event_kind IS DISTINCT FROM 'REALITY_CAUSAL_TURN_RECEIPT' OR
    e.ledger_entry_hash IS DISTINCT FROM p_commit_hash OR
    e.payload->>'phase' IS DISTINCT FROM 'COMMITTED' OR
    e.payload->>'turn_id' IS DISTINCT FROM p_turn_id OR
    e.payload->>'authenticated_user_id' IS DISTINCT FROM p_owner_user_id::text OR
    (e.payload->>'sequence_num')::bigint IS DISTINCT FROM r.sequence_num OR
    e.payload->>'prior_commit_entry_id' IS DISTINCT FROM r.last_committed_entry_id OR
    e.payload->>'prior_commit_hash' IS DISTINCT FROM r.last_committed_entry_hash OR
    e.payload->>'user_message_entry_id' IS NULL OR
    e.payload->>'assistant_message_entry_id' IS NULL OR
    e.payload->>'processing_receipt_entry_id' IS NULL OR
    e.payload->>'cognition_ledger_event_id' IS NULL THEN
  RAISE EXCEPTION 'REALITY_RECONCILIATION_COMMIT_EVIDENCE_INVALID';
 END IF;
 -- The underlying receipts, not the model, establish durable completion.
 SELECT * INTO STRICT u FROM public.reality_universe_entries
  WHERE entry_id=e.payload->>'user_message_entry_id';
 SELECT * INTO STRICT a FROM public.reality_universe_entries
  WHERE entry_id=e.payload->>'assistant_message_entry_id';
 SELECT * INTO STRICT processing FROM public.reality_universe_entries
  WHERE entry_id=e.payload->>'processing_receipt_entry_id';
 SELECT * INTO STRICT cognition FROM public.reality_universe_entries
  WHERE entry_id=e.payload->>'cognition_ledger_event_id';
 IF u.continuity_root_id IS DISTINCT FROM p_root_id OR
    u.worldline_id IS DISTINCT FROM r.worldline_id OR
    u.event_kind IS DISTINCT FROM 'AUTHENTICATED_CONVERSATION_MESSAGE' OR
    u.payload->>'role' IS DISTINCT FROM 'user' OR
    u.payload->>'turn_id' IS DISTINCT FROM p_turn_id OR
    u.payload->>'principal_id' IS DISTINCT FROM p_owner_user_id::text OR
    u.ledger_entry_hash IS DISTINCT FROM e.payload->>'user_message_hash' OR
    a.continuity_root_id IS DISTINCT FROM p_root_id OR
    a.worldline_id IS DISTINCT FROM r.worldline_id OR
    a.event_kind IS DISTINCT FROM 'AUTHENTICATED_CONVERSATION_MESSAGE' OR
    a.payload->>'role' IS DISTINCT FROM 'assistant' OR
    a.payload->>'turn_id' IS DISTINCT FROM p_turn_id OR
    a.payload->>'principal_id' IS DISTINCT FROM p_owner_user_id::text OR
    a.ledger_entry_hash IS DISTINCT FROM e.payload->>'assistant_message_hash' OR
    processing.continuity_root_id IS DISTINCT FROM p_root_id OR
    processing.worldline_id IS DISTINCT FROM r.worldline_id OR
    processing.event_kind IS DISTINCT FROM 'REALITY_CAUSAL_TURN_RECEIPT' OR
    processing.payload->>'phase' IS DISTINCT FROM 'PROCESSING' OR
    processing.payload->>'turn_id' IS DISTINCT FROM p_turn_id OR
    processing.payload->>'authenticated_user_id' IS DISTINCT FROM p_owner_user_id::text OR
    processing.payload->>'user_message_hash' IS DISTINCT FROM u.ledger_entry_hash OR
    processing.ledger_entry_hash IS DISTINCT FROM e.payload->>'processing_receipt_hash' OR
    cognition.continuity_root_id IS DISTINCT FROM p_root_id OR
    cognition.worldline_id IS DISTINCT FROM r.worldline_id OR
    cognition.ledger_entry_hash IS DISTINCT FROM e.payload->>'cognition_ledger_hash' THEN
  RAISE EXCEPTION 'REALITY_RECONCILIATION_DURABLE_CHAIN_INVALID';
 END IF;
 -- A recovered turn's predecessor must still exist with the same hash.
 IF r.sequence_num>1 THEN
  SELECT * INTO STRICT predecessor FROM public.reality_universe_entries
   WHERE entry_id=r.last_committed_entry_id;
  IF predecessor.ledger_entry_hash IS DISTINCT FROM r.last_committed_entry_hash OR
     predecessor.continuity_root_id IS DISTINCT FROM p_root_id OR
     predecessor.worldline_id IS DISTINCT FROM r.worldline_id OR
     predecessor.event_kind IS DISTINCT FROM 'REALITY_CAUSAL_TURN_RECEIPT' OR
     predecessor.payload->>'phase' IS DISTINCT FROM 'COMMITTED' OR
     (predecessor.payload->>'sequence_num')::bigint IS DISTINCT FROM r.sequence_num-1 THEN
   RAISE EXCEPTION 'REALITY_RECONCILIATION_PREDECESSOR_INVALID';
  END IF;
 ELSIF r.last_committed_entry_id IS NOT NULL OR
       r.last_committed_entry_hash IS NOT NULL THEN
  RAISE EXCEPTION 'REALITY_RECONCILIATION_GENESIS_INVALID';
 END IF;
 UPDATE public.reality_conversation_turn_fences SET
  active_turn_id=NULL,active_claim_token=NULL,
  last_committed_turn_id=p_turn_id,
  last_committed_entry_id=p_commit_entry_id,
  last_committed_entry_hash=p_commit_hash,
  changed_at=clock_timestamp()
  WHERE root_id=p_root_id;
 RETURN jsonb_build_object('status','RECOVERED',
  'sequence_num',r.sequence_num,
  'commit_entry_id',p_commit_entry_id,'commit_hash',p_commit_hash);
END;
$recover$;

-- Postgres functions grant PUBLIC EXECUTE by default. Restrict explicitly.
REVOKE ALL ON FUNCTION public.reality_claim_conversation_turn(text,text,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reality_finish_conversation_turn(text,uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_conversation_turn(text,text,uuid,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_finish_conversation_turn(text,uuid,text,uuid,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.reality_reconcile_committed_conversation_turn(text,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_reconcile_committed_conversation_turn(text,uuid,text,text,text) TO service_role;

-- Fail-closed known limitation: if a process dies after durable COMMITTED but
-- before finish RPC, recover only after validating the complete committed
-- evidence chain. Incomplete turns remain blocked; never clear on a timer.
-- TEST BEFORE RELEASE: simultaneous distinct IDs, same ID, crash, lost finish
-- response, wrong principal, missing commit, corrupted hash, non-service caller.
