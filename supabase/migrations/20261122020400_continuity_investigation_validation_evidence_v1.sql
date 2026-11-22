-- Preserve bounded validator observations in the existing incident failure history.
-- Only the existing signed lease holder may append; v1 remains the retry/authority gate.
create or replace function public.reality_block_shift_continuity_investigation_evidenced_v1(
 p_owner_id uuid,p_incident_id uuid,p_lease_id uuid,p_reason text,p_validation_evidence jsonb)
returns jsonb language plpgsql set search_path='' as $body$
declare v jsonb; item jsonb; n int; v_min int; v_max int; v_length int;
 guided boolean; result jsonb;
begin
 if current_user<>'service_role' or p_reason is distinct from 'MODEL_TEXT_BOUNDS_UNVERIFIED'
  or p_validation_evidence is null
  or pg_catalog.jsonb_typeof(p_validation_evidence) is distinct from 'object'
  or p_validation_evidence->>'schema' is distinct from 'reality-continuity-text-validation-v1'
  or (p_validation_evidence-'schema'-'violations')<>'{}'::jsonb
  or pg_catalog.jsonb_typeof(p_validation_evidence->'violations') is distinct from 'array'
 then raise exception 'CONTINUITY_VALIDATION_EVIDENCE_INVALID'; end if;
 select kind in ('SIGNED_SHIFT_REPEATED_NO_PROGRESS','SIGNED_CHAT_RECOVERY_REVIEW_STALLED')
 into guided from reality_internal.owner_shift_continuity_incidents_v1
 where owner_id=p_owner_id and incident_id=p_incident_id
  and investigation_lease_id=p_lease_id and phase='INVESTIGATION_CLAIMED'
 for update;
 if not found then raise exception 'CONTINUITY_VALIDATION_EVIDENCE_LEASE_STALE';end if;
 n:=pg_catalog.jsonb_array_length(p_validation_evidence->'violations');
 if n<1 or n>5 then raise exception 'CONTINUITY_VALIDATION_EVIDENCE_COUNT_INVALID';end if;
 for item in select value from pg_catalog.jsonb_array_elements(p_validation_evidence->'violations') loop
  if pg_catalog.jsonb_typeof(item) is distinct from 'object'
   or (item-'field'-'min'-'max'-'length'-'reason')<>'{}'::jsonb
   or not (item ?& array['field','min','max','length','reason'])
   or pg_catalog.jsonb_typeof(item->'min') is distinct from 'number'
   or pg_catalog.jsonb_typeof(item->'max') is distinct from 'number'
  then raise exception 'CONTINUITY_VALIDATION_EVIDENCE_ITEM_INVALID';end if;
  v_min:=case item->>'field' when 'limitations' then 20 else 30 end;
  v_max:=case item->>'field'
    when 'diagnosis' then 1500
    when 'proposed_upgrade' then case when guided then 1100 else 1600 end
    when 'independent_test_requirement' then case when guided then 1200 else 1600 end
    when 'limitations' then 1200
    when 'resume_acceptance_condition' then case when guided then 300 else null end
    else null end;
  if v_max is null or item->>'min' is distinct from v_min::text
   or item->>'max' is distinct from v_max::text
   or item->>'reason' is null
   or item->>'reason' not in ('NOT_STRING','OUTER_WHITESPACE','BELOW_MIN','ABOVE_MAX')
   or (item->>'reason'='NOT_STRING' and item->'length'<>'null'::jsonb)
   or (item->>'reason'<>'NOT_STRING' and (
    pg_catalog.jsonb_typeof(item->'length') is distinct from 'number'
    or coalesce(item->>'length','') !~ '^[0-9]{1,9}$'))
  then raise exception 'CONTINUITY_VALIDATION_EVIDENCE_CONTRACT_INVALID';end if;
  if item->>'reason'<>'NOT_STRING' then
   v_length:=(item->>'length')::int;
   if (item->>'reason'='BELOW_MIN' and v_length>=v_min)
    or (item->>'reason'='ABOVE_MAX' and v_length<=v_max)
   then raise exception 'CONTINUITY_VALIDATION_EVIDENCE_MISMATCH';end if;
  end if;
 end loop;
 if (select count(distinct value->>'field') from pg_catalog.jsonb_array_elements(p_validation_evidence->'violations'))<>n
 then raise exception 'CONTINUITY_VALIDATION_EVIDENCE_DUPLICATE';end if;
 result:=public.reality_block_shift_continuity_investigation_v1(p_owner_id,p_incident_id,p_lease_id,p_reason);
 update reality_internal.owner_shift_continuity_incidents_v1
 set investigation_failure_history=pg_catalog.jsonb_set(
  investigation_failure_history,
  array[(pg_catalog.jsonb_array_length(investigation_failure_history)-1)::text,'validation_evidence'],
  p_validation_evidence,true)
 where owner_id=p_owner_id and incident_id=p_incident_id
  and investigation_lease_id=p_lease_id and phase='BLOCKED_NEEDS_EVIDENCE'
  and investigation_failure_history->-1->>'lease_id'=p_lease_id::text;
 if not found then raise exception 'CONTINUITY_VALIDATION_EVIDENCE_RECEIPT_MISSING';end if;
 return result||pg_catalog.jsonb_build_object('validation_evidence_recorded',true);
end $body$;
revoke all on function public.reality_block_shift_continuity_investigation_evidenced_v1(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.reality_block_shift_continuity_investigation_evidenced_v1(uuid,uuid,uuid,text,jsonb) to service_role;
