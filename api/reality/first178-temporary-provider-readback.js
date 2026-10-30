// TEMPORARY deployment-only proof that the exact configured Vercel GitHub
// READ credential can independently read the pinned failed #178 job.
// No owner user, DB access, model, artifact installation or writes.
import {observeFirstGapFromGithub}
 from '../../src/reality-first-gap-handoff-v0.1.js';
export const maxDuration=35;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'||process.env.VERCEL_ENV!=='preview'||
    process.env.VERCEL_GIT_COMMIT_REF!==
      'feature/first178-live-single-claim-execution-20261029')
   return res.status(404).json({ok:false});
 const token=String(process.env.REALITY_FIRST178_GITHUB_READ_TOKEN||'');
 if(token.length<20)
  return res.status(200).json({ok:false,stage:'READ_CREDENTIAL_MISSING',
   original_job_executed:false,installed:false});
 try{
  const scope={owner_id:'CI_TEST_FIXTURE_NOT_AN_OWNER',
   goal_id:'CI_TEST_FIXTURE_NOT_A_USER_GOAL',
   original_work_id:'work:'+'e'.repeat(32),
   original_issue_number:178,
   continuity_root_id:'CI_TEST_FIXTURE_ROOT',
   worldline_id:'CI_TEST_FIXTURE_WORLDLINE',
   goal_transition_receipt_ref:'CI_TEST_FIXTURE_GOAL_TRANSITION',
   goal_evidence_ref:'CI_TEST_FIXTURE_GOAL_SOURCE',
   environment:'ISOLATED_PREVIEW',user_confirmed:true,
   owner_session_verified:true,goal_current_verified:true};
  const x=await observeFirstGapFromGithub({scope,apiToken:token});
  return res.status(200).json({
   ok:x.status==='INDEPENDENT_CI_MISSING_CAPABILITY_OBSERVED'&&
    x.run_id===40962921090&&
    x.provider_receipt_ref==='github:actions:run:40962921090:job:123760052647',
   stage:'PINNED_GITHUB_READBACK',run_id:40962921090,
   original_job_executed:false,installed:false,production_changed:false,
  });
 }catch(e){
  const code=String(e?.message||'UNKNOWN');
  return res.status(200).json({
   ok:false,stage:'PINNED_GITHUB_READBACK',
   provider_error:/^FIRST_GAP_[A-Z_]+$/.test(code)?code:'PROVIDER_UNAVAILABLE',
   original_job_executed:false,installed:false,
  });
 }
}
