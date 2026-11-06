-- Add a terminal review phase without granting installation authority.
alter table reality_internal.genuine_capability_queue_v1
  drop constraint if exists genuine_capability_queue_v1_phase_check;
alter table reality_internal.genuine_capability_queue_v1
  add constraint genuine_capability_queue_v1_phase_check
  check (phase in (
    'PENDING_FROZEN_REPRODUCTION',
    'LEASED_FOR_INDEPENDENT_REPRODUCTION',
    'EVIDENCE_RECONCILIATION_REQUIRED',
    'FROZEN_REPRODUCED_AWAITING_CANDIDATE',
    'AWAITING_OWNER_APPROVAL'
  ));
