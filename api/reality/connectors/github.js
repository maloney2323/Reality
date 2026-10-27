// Legacy direct provider-write endpoint is intentionally disabled.
//
// Never trust caller-provided authorization.authorized, execution_id,
// connector-operation fields, or arbitrary HTTP headers as a server-issued
// durable single-use execution admission. The trusted execution engine uses
// the internal reality-server-execution-bridge (NOT this public HTTP route).
// Future HTTP dispatch must authenticate Supabase owner, bind the current
// goal, exact work and persisted policy, then atomically consume its DB claim.
export default async function handler(req,res){
 if(req.method!=='POST')
  return res.status(405).setHeader('Allow','POST').json({
   ok:false,error:'METHOD_NOT_ALLOWED',
  });
 res.setHeader('Cache-Control','no-store');
 return res.status(403).json({
  ok:false,status:'BLOCKED',
  error:'LEGACY_GITHUB_CONNECTOR_DIRECT_WRITE_DISABLED',
  blocked_reason:'AUTHENTICATED_GOAL_BOUND_SINGLE_USE_EXECUTION_REQUIRED',
  external_action_performed:false,
  provider_execution_id:null,
 });
}
