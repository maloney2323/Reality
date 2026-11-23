-- Read-only verified cron target receipt. Safe for shared benchmark:
-- no release tables, changes to cron, secrets, approvals, or effects.
-- This is intentionally separate from isolated release execution schema.
CREATE OR REPLACE FUNCTION public.reality_read_governed_worker_release_schedule_v1(
 p_job_id bigint
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
 SET search_path='' AS $fn$
DECLARE j record; h text; path text :=
 '/api/reality/governed-employee-shift-worker';
BEGIN
 IF current_user<>'service_role' OR p_job_id IS NULL OR p_job_id<1 THEN
  RAISE EXCEPTION 'GOVERNED_RELEASE_SCHEDULE_SERVICE_ONLY';
 END IF;
 SELECT jobid,jobname,schedule,active,command
 INTO j FROM cron.job WHERE jobid=p_job_id;
 IF NOT FOUND OR j.active IS DISTINCT FROM true
    OR j.command NOT ILIKE '%net.http_post%'
    OR (pg_catalog.length(j.command)-
        pg_catalog.length(pg_catalog.replace(j.command,path,'')))/
       pg_catalog.length(path)<>1 THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','GOVERNED_RELEASE_CRON_SCHEDULE_UNVERIFIED',
   'credential_values_exposed',false);
 END IF;
 h:=pg_catalog.substring(j.command,
  'https://([a-z0-9-]+[.]vercel[.]app)/api/reality/governed-employee-shift-worker');
 IF h IS NULL THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','GOVERNED_RELEASE_CRON_HOST_UNVERIFIED',
   'credential_values_exposed',false);
 END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','GOVERNED_RELEASE_CRON_SCHEDULE_READ_ONLY',
  'job_id',j.jobid,'job_name',j.jobname,
  'provider','SUPABASE_PG_CRON','schedule',j.schedule,
  'active',true,'method','POST','endpoint_path',path,
  'host',h,'credential_values_exposed',false,'read_only',true,
  'release_activated',false,'original_job_completed',false);
END $fn$;


REVOKE ALL ON FUNCTION
 public.reality_read_governed_worker_release_schedule_v1(bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.reality_read_governed_worker_release_schedule_v1(bigint)
 TO service_role;
