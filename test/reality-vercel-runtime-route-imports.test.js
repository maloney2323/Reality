import test from 'node:test';
import assert from 'node:assert/strict';

// Importing every route at runtime is crucial: Vercel's build can report
// READY even when a lazily evaluated Node ESM import has a syntax error.
// This caught a bad regex in the Supabase connector transitively imported
// by /api/reality/execute (the original Preview GET returned HTTP 500).
const {default: executeHandler} = await import('../api/reality/execute.js');
const {default: chatHandler} = await import('../api/chat.js');
const {default: healthHandler} = await import('../api/health.js');
const {default: authorityHandler} = await import('../api/reality/authority.js');

function fakeResponse() {
  return {
    statusCode: 200, headers: {}, body:null, ended:false,
    status(code) {this.statusCode=code;return this;},
    setHeader(key,value){this.headers[String(key).toLowerCase()]=value;return this;},
    json(body){this.body=body;return this;},
    end(){this.ended=true;return this;},
  };
}

test('execution POST-only route imports cleanly and rejects GET without side effects',async()=>{
  const res=fakeResponse();
  await executeHandler({method:'GET',body:{}},res);
  assert.equal(res.statusCode,405);
  assert.equal(res.body.error,'METHOD_NOT_ALLOWED');
  assert.equal(res.headers.allow,'POST');
});
test('execution endpoint rejects unauthenticated POST without invoking providers',async()=>{
  const res=fakeResponse();
  await executeHandler({method:'POST',headers:{},body:{
    authorization:{authorized:true},
    workItem:{work_item_id:'forged',connector:'github',operation:'create_issue'}
  }},res);
  assert.equal(res.statusCode,401);
  assert.equal(res.body.error,'AUTHENTICATION_REQUIRED');
});
for(const method of ['GET','POST']){
  test('authority endpoint requires verified identity on '+method,async()=>{
    const res=fakeResponse();
    await authorityHandler({method,headers:{},body:{
      intent:'I_FOUND_WORK_AUTHORIZED',
      scopes:[{connector:'github',operation:'create_issue'}],
    }},res);
    assert.equal(res.statusCode,401);
    assert.equal(res.body.error,'AUTHENTICATION_REQUIRED');
  });
}

test('execution route refuses request-asserted approval and is off by default',()=>{
  const source=readFileSync('api/reality/execute.js','utf8');
  assert.match(source,/verifyBase44Principal\(req\)/);
  assert.match(source,/CLIENT_SUPPLIED_AUTHORIZATION_REJECTED/);
  assert.match(source,/REALITY_GOVERNED_EXECUTION_ENABLED/);
  assert.doesNotMatch(source,/authorization = body\.authorization| getOrCreateSessionPrincipal/);
});
test('authority route cannot mint policies for anonymous cookies',()=>{
  const source=readFileSync('api/reality/authority.js','utf8');
  assert.match(source,/await verifyBase44Principal\(req\)/);
  assert.doesNotMatch(source,/getOrCreateSessionPrincipal/);
});
test('chat endpoint imports cleanly and rejects GET before any paid model call',async()=>{
  const res=fakeResponse();
  await chatHandler({method:'GET',headers:{}},res);
  assert.equal(res.statusCode,405);
  assert.equal(res.body.error,'METHOD_NOT_ALLOWED');
});
test('health endpoint imports and reports source metadata without secrets',()=>{
  const res=fakeResponse();
  healthHandler({method:'GET',headers:{}},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.ok,true);
  assert.equal(res.body.truth_authorized,false);
  assert.equal(res.body.action_authorized,false);
  assert.equal(res.body.execution_requires_base44_verified_identity,true);
  assert.equal(res.body.client_authorization_body_admitted,false);
  assert.equal(res.body.governed_execution_endpoint_enabled,process.env.REALITY_GOVERNED_EXECUTION_ENABLED === 'true');
  assert.equal(res.body.source_provenance.git_backed,Boolean(process.env.VERCEL_GIT_COMMIT_SHA));
});
