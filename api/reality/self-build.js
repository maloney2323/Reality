// This legacy public endpoint previously executed a GitHub self-build after
// receiving caller-supplied { authorization: { authorized:true } } and an
// anonymous cookie principal. The governed owner-consent+training+provider
// readback path is not integrated into this endpoint; leave it disabled.
import { verifyBase44Principal } from '../../src/reality-base44-principal-v0.1.js';

export default async function handler(req,res) {
  if (req.method !== 'POST') return res.status(405).setHeader('Allow','POST').json({error:'METHOD_NOT_ALLOWED'});
  try {
    await verifyBase44Principal(req);
    return res.status(503).json({
      ok:false,error:'LEGACY_SELF_BUILD_NOT_RELEASED',
      reason:'TRAINING_ADMISSION_OWNER_CONSENT_AND_INDEPENDENT_READBACK_NOT_BOUND',
      external_action_executed:false,
    });
  } catch (error) {
    return res.status(error.status||503).json({ok:false,error:error.message,external_action_executed:false});
  }
}
