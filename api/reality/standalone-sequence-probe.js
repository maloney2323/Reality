// Explicitly preview-only internal connectivity proof, no credentials returned.
// Protected deployments require authenticated Vercel access; this route never
// calls a model, accepts user selectors, or writes persistent data.
import {assertStandalonePreviewIsolation} from '../../src/reality-standalone-auth-v0.1.js';
import {probeConversationSequenceHTTP} from '../../src/reality-conversation-sequencer-v0.1.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');
 res.setHeader('Allow','GET');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
 if(process.env.VERCEL_ENV!=='preview')
  return res.status(404).json({ok:false,error:'PREVIEW_ONLY'});
 try{
  assertStandalonePreviewIsolation();
  const outcome=await probeConversationSequenceHTTP();
  return res.status(200).json(outcome);
 }catch(error){
  return res.status(503).json({
   ok:false,status:'NOT_VERIFIED',
   error:/^SEQUENCE_[A-Z0-9_]{4,90}$/.test(error?.message||'')
    ?error.message:'SEQUENCE_PROBE_FAILED',
   no_model_called:true,
  });
 }
}
