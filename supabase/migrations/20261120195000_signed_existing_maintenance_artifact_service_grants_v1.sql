-- The signed broker cannot read a brand-new private ledger table unless
-- service_role has explicit table privileges. Keep anon/authenticated and
-- PUBLIC excluded; keep all owner/shift, installed-code and approval gates.
GRANT SELECT,INSERT ON TABLE
 reality_internal.owner_maintenance_verified_artifact_handoffs_v1
 TO service_role;
REVOKE ALL ON TABLE reality_internal.owner_maintenance_verified_artifact_handoffs_v1
 FROM PUBLIC,anon,authenticated;
