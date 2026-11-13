-- Read-only receipt inclusion for the already deployed signed shift graph.
-- The exact source, owner, shift, proof and durable triage final receipt must match.
do $graph$
declare code text;
 needle text:='''next_governed_action'',v_next,';
 addition text:=E'\n   ''provider_final_receipt_ref'',case\n    when v_kind=''REAL_COMMIT_REFERENCE_TRIAGE_ORIGINAL'' and v_phase=''SETTLED''\n    then (select ''supabase:riley_commit_reference_triage_originals_v1:''||c.final_receipt_id::text\n     from reality_internal.riley_commit_reference_triage_originals_v1 c\n     where c.shift_id=v_shift.shift_id and c.owner_id=v_shift.owner_id\n       and c.source_ref=v_source and c.source_proof_sha256=v_step.proof_sha256\n       and c.original_work_id=v_work and c.phase=''SETTLED''\n       and c.execution_origin=''OWNER_DIRECTED_CHATGPT_GITHUB_ACTION''\n       and c.provider_comment_id>0 and c.final_receipt_id is not null\n       and c.production_changed=false) else null end,';
begin
 select pg_get_functiondef('public.reality_read_owner_shift_execution_graph_v1(uuid,uuid)'::regprocedure)
 into code;
 if code is null or strpos(code,needle)=0
  or strpos(code,'''provider_final_receipt_ref''')>0
 then raise exception 'TRIAGE_GRAPH_RECEIPT_READER_DRIFT';end if;
 execute replace(code,needle,needle||addition);
end $graph$;
