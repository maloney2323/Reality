// Runs only in secret-free offline Docker. This is comparative evidence,
// not a trusted code-loading operation in the GitHub runner.
import {verifyRealityCompletion as installed} from '../scratch/installed.mjs';
import {verifyRealityCompletion as proposed} from '../scratch/proposed.mjs';
const OWNER='44444444-4444-4444-8444-444444444444',WORK='work:'+'f'.repeat(32);
const HASH='a'.repeat(64),COMMIT='b'.repeat(40);
const valid=()=>({
 owner_id:OWNER,goal_id:'verified:user:goal',original_work_id:WORK,artifact_hash:HASH,
 signed_owner_approval:{verified:true,consumed_once:true,owner_id:OWNER,
  original_work_id:WORK,artifact_hash:HASH,
  origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
  reservation_ref:'supabase:owner:single-use:receipt'},
 sandbox:{independently_verified:true,artifact_hash:HASH,frozen_regression_passed:true,governance_preserved:true},
 installation:{independent_provider_readback:true,original_work_id:WORK,
  artifact_hash:HASH,installed_commit_sha:COMMIT,production_changed:false,
  installed_branch:'feature/reality-customer-repair'},
 resumption:{independent_provider_readback:true,real_execution_observed:true,
  original_work_id:WORK,installed_commit_sha:COMMIT,
  executor_run_ref:'github:actions:run:111:job:222',outcome:'SUCCEEDED'},
 settlement:{durable_settlement_readback:true,independent_outcome_verified:true,
  original_work_id:WORK,artifact_hash:HASH,installed_commit_sha:COMMIT,
  receipt_ref:'supabase:universe_events:33333333-3333-4333-8333-333333333333'}
});
const probes=[
 ['valid',x=>x],
 ['unverified_goal',x=>({...x,goal_id:'unverified:forged'})],
 ['fake_reservation',x=>({...x,signed_owner_approval:{...x.signed_owner_approval,
  reservation_ref:'supabase:fake:receipt'}})],
 ['fake_provider_execution',x=>({...x,resumption:{...x.resumption,
  executor_run_ref:'github:actions:run:fake:job:fake'}})],
 ['malformed_universe_receipt',x=>({...x,settlement:{...x.settlement,
  receipt_ref:'supabase:universe_events:a'}})]
];
const results=probes.map(([name,mutate])=>{
 const input=mutate(valid());
 const old=installed(input)?.verified===true;
 const fresh=proposed(input)?.verified===true;
 return {name,old_accepted:old,new_accepted:fresh,
  regression:name!=='valid'&&old===false&&fresh===true};
});
console.log('REALITY_188_SECURITY_COMPARISON '+JSON.stringify(results));
if(results[0].old_accepted!==true||results[0].new_accepted!==true)process.exitCode=3;
