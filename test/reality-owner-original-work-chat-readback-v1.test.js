import test from 'node:test';
import assert from 'node:assert/strict';
import {projectOwnerOriginalWorkReadback,readOwnerOriginalWorkForChat,
 originalWorkObservation} from '../src/reality-owner-original-work-chat-readback-v1.js';
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const otherShift='21dff8db-6f46-444d-a149-ab15f1caf8fe';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const user={user_id:owner,config:{url:'https://hvkfreoagbrphwghjajw.supabase.co'}};
const unfinished={shift_id:shift,source_ref:'https://github.com/owner/project/issues/185',
 original_work_id:'work:45206a326ddf406b1c083a819da24aaa',phase:'SOURCE_ADMITTED',
 original_job_completed:false,original_settlement_receipt_ref:null,production_changed:false};
const settled={shift_id:shift,source_ref:'https://github.com/owner/project/issues/263',
 original_work_id:'work:873a6e74fd14c6beacc9042dd8021dfc',phase:'SETTLED',
 original_job_completed:true,original_settlement_receipt_ref:'supabase:reality_final_receipts:v1',
 production_changed:false};
const raw={status:'OWNER_SCOPED_UNATTENDED_REPAIR_ORIGINAL_READBACK',
 does_not_authorize_new_work:true,production_changed:false,jobs:[unfinished,settled]};

test('a settled original does not hide a different unfinished original',()=>{
 const view=projectOwnerOriginalWorkReadback(raw,{currentShiftId:shift});
 assert.equal(view.observed_original_count,2);
 assert.equal(view.observed_unfinished_count,1);
 assert.equal(view.jobs[0].independently_settled,false);
 assert.equal(view.jobs[1].independently_settled,true);
 assert.match(originalWorkObservation(view)[0].summary,/NOT independently settled/);
 assert.equal(view.dispatches_worker,false);
});
test('prior shift admission is not misreported as current shift work',()=>{
 const view=projectOwnerOriginalWorkReadback({...raw,
  jobs:[{...unfinished,shift_id:otherShift},settled]}, {currentShiftId:shift});
 assert.equal(view.observed_original_count,1);
 assert.equal(view.observed_unfinished_count,0);
 assert.equal(view.readback_bounded_to_recent_originals,true);
});
test('a malformed owner ledger and forged completion are rejected',()=>{
 assert.throws(()=>projectOwnerOriginalWorkReadback({...raw,
  jobs:[{...unfinished,phase:'SETTLED',original_job_completed:true}]},{currentShiftId:shift}),
 /CHAT_ORIGINAL_WORK_READBACK_UNVERIFIED/);
 assert.throws(()=>projectOwnerOriginalWorkReadback({...raw,
  jobs:[unfinished,unfinished]},{currentShiftId:shift}),
 /CHAT_ORIGINAL_WORK_READBACK_UNVERIFIED/);
});
test('authenticated read uses the existing service-only RPC without dispatching work',async()=>{
 let calls=0;
 const view=await readOwnerOriginalWorkForChat({
  session:user,currentShiftId:shift,
  env:{VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'},
  db:{strictSecrets:true,secretKey:'provided-by-test-only',
   project:'hvkfreoagbrphwghjajw',url:user.config.url},
  callRpc:async(_db,action,params)=>{
   assert.equal(action,'reality_read_owner_riley_repair_original_v1');
   assert.deepEqual(params,{p_owner_id:owner});
   calls++;return raw;
  },
 });
 assert.equal(calls,1);
 assert.equal(view.observed_unfinished_count,1);
});
test('unverified project or session never reports an empty queue',async()=>{
 await assert.rejects(()=>readOwnerOriginalWorkForChat({
  session:user,currentShiftId:shift,env:{VERCEL_ENV:'production',
   REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'},
  db:{strictSecrets:true,project:'hvkfreoagbrphwghjajw',
    secretKey:'provided-by-test-only',url:user.config.url},
 }),/CHAT_ORIGINAL_WORK_OWNER_SCOPE_UNVERIFIED/);
});
