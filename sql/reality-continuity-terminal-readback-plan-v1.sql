-- Incremental benchmark-only candidate. No function-body, privilege, data,
-- index, timeout, release, worker, replay, or authority change.
-- Limit planner join search only while the existing terminal evidence reader
-- runs; PostgreSQL restores caller settings when that function exits.
ALTER FUNCTION reality_internal.read_final_loop_verified_terminal_review_v1(uuid,uuid,text,text,text,bigint)
 SET join_collapse_limit TO 1;
ALTER FUNCTION reality_internal.read_final_loop_verified_terminal_review_v1(uuid,uuid,text,text,text,bigint)
 SET from_collapse_limit TO 1;
