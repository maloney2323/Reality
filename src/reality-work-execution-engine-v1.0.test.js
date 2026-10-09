import assert from 'node:assert/strict';
import {executeWorkGraph} from './reality-work-execution-engine-v1.0.js';
let calls=0;
const connector={execute:async({workItem})=>{calls++;return {ok:true,work_item_id:workItem.work_item_id};},verify:async()=>({verified:true,independent:true,basis:'TEST_FRESH_READBACK'})};
const items=[
{work_item_id:'branch',dependencies:[],external_effects_permitted:false,proposed_action:{provider:'github',action:'create_branch'}},
{work_item_id:'transform',dependencies:['branch'],external_effects_permitted:false,proposed_action:{provider:'github',action:'update_file'}}
];
const result=await executeWorkGraph({workItems:items,authorization:{authorized:true,external_effects_permitted:false,scope:[{work_item_id:'branch',connector:'github',action:'create_branch'},{work_item_id:'transform',connector:'github',action:'update_file'}]},connectors:{github:connector}});
assert.equal(result.status,'VERIFIED'); assert.equal(result.executions.length,2); assert.equal(calls,2);
await assert.rejects(()=>executeWorkGraph({workItems:items,authorization:{authorized:false},connectors:{github:connector}}),/EXPLICIT_AUTHORIZATION_REQUIRED/);
await assert.rejects(()=>executeWorkGraph({workItems:items,authorization:{authorized:true,scope:[{work_item_id:'transform',connector:'github',action:'update_file'}]},connectors:{github:connector}}),/DEPENDENCY_NOT_VERIFIED/);
console.log('work execution engine: 3/3');