import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isAuthorizedCron} from '../src/reality-cron-authorization-v0.1.js';
import shadowHandler from '../api/reality-shadow.js';
import shiftHandler from '../api/reality/shift.js';

const secret='test-unit-secret-24-character-long';
const getReq=(authorization='',agent='vercel-cron/1.0')=>({
  method:'GET',headers:{authorization,'user-agent':agent},body:{}
});
function res(){
  return {statusCode:200,body:null,headers:{},
    setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},
    status(s){this.statusCode=s;return this;},
    json(b){this.body=b;return this;}
  };
}
test('exact configured secret works; arbitrary bearer and spoofed UA never do',()=>{
  assert.equal(isAuthorizedCron(getReq('Bearer '+secret,'not-cron'),secret),true);
  assert.equal(isAuthorizedCron(getReq('Bearer forged-bearer-value','vercel-cron/1.0'),secret),false);
  assert.equal(isAuthorizedCron(getReq('', 'vercel-cron/1.0'),secret),false);
  assert.equal(isAuthorizedCron(getReq('Bearer '+secret+'X'),secret),false);
  assert.equal(isAuthorizedCron(getReq('bearer '+secret),secret),false);
  assert.equal(isAuthorizedCron(getReq('Bearer '+secret),'short'),false);
  assert.equal(isAuthorizedCron(getReq('Bearer '+secret),undefined),false);
});
test('shadow cron cannot be activated by User-Agent spoof without secret',async()=>{
  const saved=process.env.CRON_SECRET;
  process.env.CRON_SECRET=secret;
  try{
    for(const req of [getReq('', 'vercel-cron/1.0'),getReq('Bearer wrong','vercel-cron/1.0')]){
      const output=res();
      await shadowHandler(req,output);
      assert.equal(output.statusCode,401);
      assert.equal(output.body.error,'SHADOW_CRON_ONLY');
    }
  }finally{
    if(saved===undefined)delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET=saved;
  }
});
test('shift settings never accept unauthenticated writes',async()=>{
  const output=res();
  await shiftHandler({method:'POST',headers:{},body:{enabled:true}},output);
  assert.equal(output.statusCode,401);
  assert.equal(output.body.error,'AUTHENTICATION_REQUIRED');
});
test('shift read cannot use spoofed cron header to reach database',async()=>{
  const saved=process.env.CRON_SECRET;
  process.env.CRON_SECRET=secret;
  try{
    const output=res();
    await shiftHandler(getReq('','vercel-cron/1.0'),output);
    assert.equal(output.statusCode,401);
    assert.equal(output.body.error,'AUTHENTICATION_REQUIRED');
  }finally{
    if(saved===undefined)delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET=saved;
  }
});
test('all scheduled gate callsites require exact secret and shift global writes remain opt-in',()=>{
  const shadow=readFileSync('api/reality-shadow.js','utf8');
  const shift=readFileSync('api/reality/shift.js','utf8');
  assert.match(shadow,/isAuthorizedCron\(req\)/);
  assert.match(shift,/isAuthorizedCron\(req\)/);
  assert.doesNotMatch(shadow,/startsWith\('Bearer '|includes\('vercel-cron\/|'REALITY_SHADOW_ALLOW_MANUAL'/);
  assert.doesNotMatch(shift,/getOrCreateSessionPrincipal/);
  assert.match(shift,/REALITY_SHIFT_CONFIGURATION_ENABLED/);
  assert.match(shift,/await verifyBase44Principal\(req\)/);
});
