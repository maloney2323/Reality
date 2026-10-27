// Legacy client-origin self-build is intentionally disabled.
//
// Client-supplied {authorization:{authorized:true}} and a signed generic
// session cookie are NOT source-verified, goal-bound action approval. No
// GitHub provider capability may be created from this public HTTP route.
// Future self-upgrades must enter the authenticated goal+exact-work+atomic
// reservation execution engine, with separate promotion authority.
export default async function handler(req,res){
 if(req.method!=='POST')
  return res.status(405).setHeader('Allow','POST').json({
   ok:false,error:'METHOD_NOT_ALLOWED',
  });
 res.setHeader('Cache-Control','no-store');
 return res.status(403).json({
  ok:false,status:'BLOCKED',
  error:'LEGACY_SELF_BUILD_DIRECT_WRITE_DISABLED',
  blocked_reason:'AUTHENTICATED_GOAL_BOUND_SINGLE_USE_EXECUTION_REQUIRED',
  external_action_performed:false,
  branch_created:false,pull_request_opened:false,
 });
}
