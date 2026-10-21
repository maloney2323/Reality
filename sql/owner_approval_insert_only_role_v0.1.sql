-- Reference migration for a DEDICATED insert-only approval writer.
-- Validated in the isolated "reality-continuity-benchmark" Supabase project
-- on 2026-10-21. This file has NOT been applied to Reality production.
-- A NOLOGIN role is not a connection credential. The operator must configure
-- a server-only database principal and narrowly delegate this role. Never
-- grant this role to anon/authenticated/service-facing API clients.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'reality_preview_approval_writer'
  ) THEN
    CREATE ROLE reality_preview_approval_writer NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA reality_governance TO reality_preview_approval_writer;
GRANT INSERT ON reality_governance.owner_approval_consumptions
  TO reality_preview_approval_writer;

ALTER TABLE reality_governance.owner_approval_consumptions
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY approval_insert_only_preview_role
  ON reality_governance.owner_approval_consumptions
  FOR INSERT TO reality_preview_approval_writer
  WITH CHECK (expires_at > now());

REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON reality_governance.owner_approval_consumptions
  FROM reality_preview_approval_writer;

-- Important tested driver contract:
-- INSERT INTO reality_governance.owner_approval_consumptions (...)
-- SELECT ... WHERE $7::timestamptz > now()
-- ON CONFLICT DO NOTHING;
-- Drive acceptance from the trusted PostgreSQL command rowCount 1 vs 0.
-- Do NOT use RETURNING or ON CONFLICT (approval_key); both triggered SELECT
-- privilege requirements during restricted-role testing.
-- No SELECT is granted. The unique PK supplies atomic one-winner semantics.
