import { verifyBase44Principal } from '../../src/reality-base44-principal-v0.1.js';

// Legacy world access described a connected action envelope based only on
// caller-provided authorization. It never independently verified authority,
// executed the alleged action, or read back external state. Keep this path
// explicitly non-authorizing until the real governance loop owns admission.
const snapshot=Object.freeze({
  service:'reality-world-access',version:'0.4.1',
  available_capability:'PROPOSAL_ONLY',
  connected_execution_released:false,
  provider_writes_enabled:false,
  can_claim_verified_execution:false,
  capability_claim_limit:'External connector availability and authority require separate trusted server verification.',
});
function json(res,status,body){
  res.statusCode=status;
  res.setHeader('content-type','application/json');
  res.end(JSON.stringify(body));
}
export default async function handler(req,res){
  if(req.method==='GET')return json(res,200,snapshot);
  if(req.method!=='POST'){
    res.setHeader('allow','GET, POST');
    return json(res,405,{error:'METHOD_NOT_ALLOWED'});
  }
  try{
    await verifyBase44Principal(req);
    return json(res,503,{
      ok:false,error:'LEGACY_CONNECTED_ACTION_NOT_RELEASED',
      external_action_executed:false,
      authorization_accepted:false,
      independent_outcome_verified:false,
    });
  }catch(error){
    return json(res,error.status||503,{
      ok:false,error:error.message,
      external_action_executed:false,authorization_accepted:false,
    });
  }
}
