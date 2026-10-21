-- DRAFT SCHEMA ONLY; not applied to production.
-- Requires a privileged operator to provision a PRIVATE PostgreSQL schema
-- and to grant INSERT on this table ONLY to the trusted runtime role.
-- Do not grant anon/authenticated/frontend roles access.
BEGIN;

CREATE SCHEMA IF NOT EXISTS reality_governance;
REVOKE ALL ON SCHEMA reality_governance FROM PUBLIC;

CREATE TABLE IF NOT EXISTS reality_governance.owner_approval_consumptions (
  approval_key text PRIMARY KEY,
  binding_sha256 varchar(64) NOT NULL
    CHECK (binding_sha256 ~ '^[0-9a-fA-F]{64}$'),
  owner_id text NOT NULL,
  purpose text NOT NULL,
  subject_ref text NOT NULL,
  consent_ref text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(approval_key) BETWEEN 64 AND 160),
  CHECK (expires_at > consumed_at)
);

-- RLS defense in depth (private schema is deliberately not exposed).
ALTER TABLE reality_governance.owner_approval_consumptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE reality_governance.owner_approval_consumptions FROM PUBLIC;

-- No policy for untrusted callers. The infrastructure operator must grant
-- the minimal INSERT permission to a dedicated, server-only runtime role,
-- and test that no client API can write to or read this table.
-- Never enable generic upsert/update, which would invalidate the nonce rule.

COMMIT;
