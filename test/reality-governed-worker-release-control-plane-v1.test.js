import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizedReleaseOperator,default as handler}
 from '../api/reality/governed-worker-release-control-plane.js';
import {readFileSync} from 'node:fs';

function res(){
 const out={statusCode:200,headers:{},body:null};
 return {out,setHeader(k,v){out.headers[k]=v;return this},
  status(n){out.statusCode=n;return this},
  json(b){out.body=b;return this}};
}
test('independent control plane uses fixed timing-safe operator token',()=>{
 const secret='a'.repeat(64);
 assert.equal(authorizedReleaseOperator('Bearer '+secret,secret),true);
 assert.equal(authorizedReleaseOperator('Bearer '+'b'.repeat(64),secret),false);
 assert.equal(authorizedReleaseOperator('Bearer '+secret,undefined),false);
 assert.equal(authorizedReleaseOperator('Basic '+secret,secret),false);
});
test('external GET and unauthorized POST cannot inspect or switch',async()=>{
 let r=res();
 await handler({method:'GET'},r);
 assert.equal(r.out.statusCode,405);
 r=res();
 await handler({method:'POST',headers:{authorization:'Bearer '+'a'.repeat(64)},
  body:{intent:'SWITCH_EXACT_APPROVED_RELEASE'}},r);
 assert.equal(r.out.statusCode,403);
 assert.equal(r.out.body.original_job_completed,false);
 assert.equal(r.out.body.production_changed,false);
});
test('a real signed operator cannot submit arbitrary deployment or approval inputs',async()=>{
 const oldEnv=process.env.VERCEL_ENV,oldToken=process.env.REALITY_RELEASE_CONTROL_OPERATOR_TOKEN;
 process.env.VERCEL_ENV='preview';
 process.env.REALITY_RELEASE_CONTROL_OPERATOR_TOKEN='f'.repeat(64);
 try{
  const r=res();
  await handler({method:'POST',
   headers:{authorization:'Bearer '+'f'.repeat(64)},query:{},
   body:{intent:'SWITCH_EXACT_APPROVED_RELEASE',target:'attacker.vercel.app'}},r);
  assert.equal(r.out.statusCode,400);
  assert.equal(r.out.body.status,'GOVERNED_RELEASE_CONTROL_INTENT_INVALID');
 }finally{
  if(oldEnv===undefined)delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV=oldEnv;
  if(oldToken===undefined)delete process.env.REALITY_RELEASE_CONTROL_OPERATOR_TOKEN;
  else process.env.REALITY_RELEASE_CONTROL_OPERATOR_TOKEN=oldToken;
 }
});
test('endpoint only reaches one-use governed switch after independent provider reads',()=>{
 const s=readFileSync(new URL('../api/reality/governed-worker-release-control-plane.js',import.meta.url),'utf8');
 assert.match(s,/await adapters\.readSchedule\(\)/);
 assert.match(s,/qualifyCurrentIsolatedSignedWorkerRelease\(/);
 assert.match(s,/adapters\.readApprovedRelease\(/);
 assert.match(s,/triggerOneGovernedSignedWorkerReleaseSwitch\(/);
 assert.match(s,/schedule\.dedicated_stable_release_alias!==true/);
 assert.match(s,/release_switch_attempted:false/);
 assert.doesNotMatch(s,/req\.body\.release_sha/);
 assert.doesNotMatch(s,/req\.body\.scheduled_alias/);
});
