// Reuse existing server-side Preview credentials, but enforce the chosen
// benchmark project's exact URL before any database request. The credentials
// are never sent to the production project or the client.
// Permission/credential compatibility with the benchmark project is verified
// by a real scoped DB read-back, not by assuming an env var name proves access.
export const RELIABILITY_BENCHMARK_DB_BOUNDARY_VERSION = 'v0.2';
export function isReliabilityBenchmarkEnabled(env=process.env){
  return env.VERCEL_ENV==='preview' &&
    env.REALITY_CONTINUOUS_RELIABILITY_ENABLED==='true';
}
export function resolveReliabilityBenchmarkDb(env=process.env){
  if(!isReliabilityBenchmarkEnabled(env))return null;
  const project=String(env.REALITY_RELIABILITY_BENCHMARK_PROJECT_REF||'').trim();
  const expected=String(env.REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF||'').trim();
  const url=String(env.REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL||'').trim().replace(/\/$/,'');
  if(!/^[a-z]{20}$/.test(project)||url!==`https://${project}.supabase.co`)
    throw Error('RELIABILITY_BENCHMARK_PROJECT_SCOPE_NOT_VERIFIED');
  if(!expected||expected!==project)
    throw Error('RELIABILITY_BENCHMARK_PROJECT_NOT_ALLOWLISTED');
  // Only one existing server-side credential is selected, and the persistence
  // adapter is instructed NEVER to cascade to alternative keys on HTTP 401.
  const key=String(env.REALITY_UNIVERSE_PERSISTENCE_KEY ||
    env.SUPABASE_SECRET_KEY || env.supabase_secret_key || '').trim();
  if(!key)throw Error('RELIABILITY_EXISTING_PREVIEW_CREDENTIAL_UNAVAILABLE');
  return Object.freeze({
    url,secretKey:key,strictSecrets:true,project,
    credential_reused:true,
    scope_verified_by_configuration:true,
    provider_credentials_verified:false,
  });
}
