// Legacy public work execution is DISABLED until the caller is independently
// authenticated, its current user-owned goal and exact work are revalidated,
// and the DB-atomic single-use execution claim is consumed by the trusted
// server-side engine. This endpoint cannot establish those conditions.
//
// Historically this route accepted client-provided authorization objects.
// Even a persisted generic session-cookie policy is not sufficient to
// authorize an external write; never mint delegated power from this route.
export default async function handler(req,res){
 if(req.method!=='POST')
  return res.status(405).setHeader('Allow','POST').json({
   ok:false,error:'METHOD_NOT_ALLOWED',
  });
 res.setHeader('Cache-Control','no-store');
 return res.status(403).json({
  ok:false,status:'BLOCKED',
  error:'LEGACY_EXECUTION_DIRECT_WRITE_DISABLED',
  blocked_reason:'AUTHENTICATED_GOAL_BOUND_SINGLE_USE_EXECUTION_REQUIRED',
  external_action_performed:false,
  execution:null,verification:null,outcome:null,
 });
}
