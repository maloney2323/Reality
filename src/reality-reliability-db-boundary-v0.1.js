// Strict, opt-in isolation for the paid-model reliability experiment.
// In particular, never try a production Supabase key against a Preview URL.
export const RELIABILITY_BENCHMARK_DB_BOUNDARY_VERSION = 'v0.1';
export function isReliabilityBenchmarkEnabled(env=process.env){
  return env.VERCEL_ENV==='preview' &&
    env.REALITY_CONTINUOUS_RELIABILITY_ENABLED==='true';
}
export function resolveReliabilityBenchmarkDb(env=process.env){
  if(!isReliabilityBenchmarkEnabled(env))return null;
  const project=String(env.REALITY_RELIABILITY_BENCHMARK_PROJECT_REF||'').trim();
  const url=String(env.REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL||'').trim().replace(/\/$/,'');
  const key=String(env.REALITY_RELIABILITY_BENCHMARK_SUPABASE_SECRET_KEY||'').trim();
  if(!/^[a-z]{20}$/.test(project)||url!==`https://${project}.supabase.co`)
    throw Error('RELIABILITY_BENCHMARK_PROJECT_SCOPE_NOT_VERIFIED');
  if(!key||key===env.SUPABASE_SECRET_KEY||key===env.supabase_secret_key||
      key===env.REALITY_UNIVERSE_PERSISTENCE_KEY)
    throw Error('RELIABILITY_BENCHMARK_DEDICATED_KEY_REQUIRED');
  const expected=String(env.REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF||'').trim();
  if(!expected||expected!==project)throw Error('RELIABILITY_BENCHMARK_PROJECT_NOT_ALLOWLISTED');
  return Object.freeze({url,secretKey:key,strictSecrets:true,project});
}
