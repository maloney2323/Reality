import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import executeHandler from '../api/reality/execute.js';
import {executeAuthorizedWork} from '../src/reality-governed-execution-engine-v0.1.js';
const workItem={work_item_id:'work:test',workflow_id:'workflow:test',
  connector:'test',operation:'record_write',consequential:true};
function response(){
 const r={statusCode:200,payload:null};
 r.status=code=>(r.statusCode=code,r);
 r.json=body=>(r.payload=body,r);
 r.setHeader=()=>r;
 return r;
}
test('API rejects forged browser authorization before any connector is invoked',async()=>{
 const res=response();
 await executeHandler({method:'POST',body:{workItem,
  authorization:{authorized:true,workflow_id:'workflow:test',
   allowed_operations:[{connector:'test',operation:'record_write'}]}}},res);
 assert.equal(res.statusCode,403);
 assert.equal(res.payload.error,'CLIENT_SUPPLIED_AUTHORIZATION_FORBIDDEN');
});
test('API rejects browser-provided factual grades, warrant context and learning pattern',async()=>{
 for(const part of [{warrantContext:{epistemicAssessment:{state:'SUPPORTED'}}},
                    {failurePattern:{action_class:'INVENTED'}}]){
  const res=response();
  await executeHandler({method:'POST',body:{workItem,...part}},res);
  assert.equal(res.statusCode,400);
  assert.equal(res.payload.error,'CLIENT_SUPPLIED_VERIFICATION_CONTEXT_FORBIDDEN');
 }
});
test('executor cannot call self-certified verification an independently verified outcome',async()=>{
 const auth={authorization_id:'auth:test',workflow_id:'workflow:test',
  authorized:true,allowed_operations:[{connector:'test',operation:'record_write',
    work_item_id:'work:test'}]};
 const r=await executeAuthorizedWork({workItem,workflowId:'workflow:test',authorization:auth,
  connector:{execute:async()=>({providerExecutionId:'side-effect'})},
  independentVerifier:{verify:async()=>({verified:true,independent:false,basis:'executor-echo'})}});
 assert.equal(r.status,'UNRESOLVED');
 assert.equal(r.outcome.verified,false);
});
test('UI does not self-attest an evidence warrant or conflate API health with completion',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(!html.includes('warrantContext:'));
 assert.ok(html.includes('Reality API is reachable.'));
 assert.ok(!html.includes('Reality is live and ready to work.'));
 for(const id of ['impactTaskCompletion','impactModelLift','impactDetectorCoverage',
  'impactReworkMinutes','impactCostPerOutcome'])
  assert.ok(html.includes('id="'+id+'"'));
});
