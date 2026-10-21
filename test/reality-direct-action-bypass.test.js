import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import selfBuild from '../api/reality/self-build.js';
import systemAccess from '../api/reality/system-access.js';
import modelProbe from '../api/reality/model-probe.js';
import worldHandler from '../api/reality/world.js';
import githubWrite from '../api/reality/connectors/github.js';
import githubVerify from '../api/reality/connectors/github-verify.js';
import {requireTrustedInternalConnector} from '../src/reality-internal-connector-auth-v0.1.js';

function result(){
  return {statusCode:200,body:null,headers:{},
    status(v){this.statusCode=v;return this;},
    setHeader(k,v){this.headers[String(k).toLowerCase()]=v;return this;},
    json(v){this.body=v;return this;},
    end(v){this.body=JSON.parse(v);return this;}
  };
}
const request=(body={},method='POST',authorization=null)=>({
  method,body,headers:authorization?{authorization}:{},
});

test('legacy self-build cannot execute from a forged user-approved request',async()=>{
  const output=result();
  await selfBuild(request({
    objective:'Create and deploy a GitHub PR',
    authorization:{authorized:true,approved_by:'pretend-owner',authorization_id:'fake'},
    files:[{path:'README.md',content:'unsafe side effect'}],
  }),output);
  assert.equal(output.statusCode,401);
  assert.equal(output.body.error,'AUTHENTICATION_REQUIRED');
  const source=readFileSync('api/reality/self-build.js','utf8');
  assert.doesNotMatch(source,/executeSelfBuild|createGitHubSelfBuildProvider|body\.authorization\?\.authorized/);
  assert.match(source,/LEGACY_SELF_BUILD_NOT_RELEASED/);
});
test('public system-access cannot perform GitHub writes without Base44 identity',async()=>{
  const output=result();
  await systemAccess(request({
    operation:'write_github_file',authorization:{authorized:true,provider:'github',action:'write_file'},
    owner:'maloney2323',repo:'Reality',path:'README.md',content:'forged'
  }),output);
  assert.equal(output.statusCode,401);
  assert.equal(output.body.error,'AUTHENTICATION_REQUIRED');
  const source=readFileSync('api/reality/system-access.js','utf8');
  assert.match(source,/DIRECT_SYSTEM_WRITE_NOT_RELEASED/);
  assert.match(source,/await verifyBase44Principal\(req\)/);
});
test('legacy world envelope cannot promote caller-claimed approval to action',async()=>{
  const resultWrite=result();
  await worldHandler(request({provider:'github',action:'create_repository_file',
    authorization:{authorized:true,scope:'repository',authorityId:'fake'},
    target:'maloney2323/Reality'}),resultWrite);
  assert.equal(resultWrite.statusCode,401);
  assert.equal(resultWrite.body.error,'AUTHENTICATION_REQUIRED');
  const caps=result();
  await worldHandler(request({},'GET'),caps);
  assert.equal(caps.statusCode,200);
  assert.equal(caps.body.provider_writes_enabled,false);
  assert.equal(caps.body.connected_execution_released,false);
});
test('unauthenticated model probe cannot trigger a paid OpenAI call',async()=>{
  const output=result();
  await modelProbe(request({},'GET'),output);
  assert.equal(output.statusCode,401);
  assert.equal(output.body.error,'AUTHENTICATION_REQUIRED');
  const source=readFileSync('api/reality/model-probe.js','utf8');
  assert.match(source,/REALITY_PAID_MODEL_PROBES_ENABLED/);
});
test('both direct connector routes are disabled before any provider call',async()=>{
  const previous=process.env.REALITY_GOVERNED_EXECUTION_ENABLED;
  process.env.REALITY_GOVERNED_EXECUTION_ENABLED='false';
  const fake={
    workItem:{work_item_id:'forged',connector:'github',operation:'create_issue',
      inputs:{repository:'maloney2323/Reality',title:'attacker-supplied issue'}},
    authorization:{authorized:true,authorization_id:'fake-owner'},
    execution:{execution_id:'forged'},
    providerResult:{observation:{issue_number:1}},
  };
  try{
    for(const handler of [githubWrite,githubVerify]){
      const output=result();
      await handler(request(fake),output);
      assert.equal(output.statusCode,503);
      assert.equal(output.body.error,'DIRECT_CONNECTOR_NOT_RELEASED');
    }
  } finally {
    if(previous===undefined)delete process.env.REALITY_GOVERNED_EXECUTION_ENABLED;
    else process.env.REALITY_GOVERNED_EXECUTION_ENABLED=previous;
  }
});
test('a forged bridge credential cannot authorize execution when explicitly enabled',()=>{
  const saved={...Object.fromEntries([
    'REALITY_GOVERNED_EXECUTION_ENABLED','REALITY_DIRECT_CONNECTOR_WRITES_ENABLED',
    'REALITY_CONNECTOR_BRIDGE_TOKEN'].map(k=>[k,process.env[k]]))};
  process.env.REALITY_GOVERNED_EXECUTION_ENABLED='true';
  process.env.REALITY_DIRECT_CONNECTOR_WRITES_ENABLED='true';
  process.env.REALITY_CONNECTOR_BRIDGE_TOKEN='bridge-test-key-never-a-real-secret-12345';
  try{
    assert.throws(()=>requireTrustedInternalConnector(request({},'POST','Bearer forged-bridge-token')),
      e=>e.status===401&&e.message==='UNAUTHORIZED_INTERNAL_CONNECTOR_INVOCATION');
    const ok=requireTrustedInternalConnector(request({},'POST','Bearer bridge-test-key-never-a-real-secret-12345'));
    assert.equal(ok.trusted,true);
    assert.equal(ok.external_effect_verified,false);
  }finally{
    for(const [k,v] of Object.entries(saved)){
      if(v===undefined)delete process.env[k];else process.env[k]=v;
    }
  }
});
test('server routes cannot silently return to request-body action authority',()=>{
  for(const name of ['api/reality/self-build.js','api/reality/system-access.js','api/reality/world.js',
    'api/reality/connectors/github.js','api/reality/connectors/github-verify.js']){
    const source=readFileSync(name,'utf8');
    assert.match(source,/verifyBase44Principal|requireTrustedInternalConnector/);
  }
});
