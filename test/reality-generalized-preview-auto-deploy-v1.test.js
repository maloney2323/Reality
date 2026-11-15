import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyGeneralizedOriginalPreviewAutoDeploy} from '../src/reality-generalized-original-preview-auto-deploy-v1.js';

const body=readFileSync(new URL(
 '../supabase/functions/reality-governed-original-preview-auto-deploy-verifier-v1/index.ts',
 import.meta.url),'utf8');
let entry;
const previousDeno=globalThis.Deno;
globalThis.Deno={serve:f=>{entry=f},env:{get:name=>({
 SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 REALITY_GITHUB_BROKER_TOKEN:'fake-git-token-unique-test-secret-credential'
})[name]||''}};
await import('data:text/javascript;base64,'+Buffer.from(body).toString('base64'));
globalThis.Deno=previousDeno;
const project='https://hvkfreoagbrphwghjajw.supabase.co';
const github='https://api.github.com/repos/maloney2323/Reality';
const branch='reality/isolated-branch-test';
const attempt='788beab4-34e0-44ba-9577-1062ca459643';
const original='work:'+'a'.repeat(32);
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const sha='b'.repeat(40),srcBlob='c'.repeat(40),probeBlob='d'.repeat(40),liveHead='e'.repeat(40);
const src='src/reality-riley-service-original-runtime-v1.js';
const probe='evidence/reality-governed-original-canary-'+attempt+'.json';
const url='https://vercel.com/maloney2323-5310s-projects/reality/BibzEUUaY5dbjuvREnXRwLfsQGo2';
const scope={status:'EXACT_PREAPPROVAL_ORIGINAL_VERCEL_STATUS_ELIGIBLE',
 attempt_id:attempt,original_work_id:original,shift_id:shift,
 target_branch:branch,original_source_path:src,
 unchanged_source_blob_sha:srcBlob,
 inert_probe_path:probe,inert_probe_blob_sha:probeBlob,
 canary_commit_sha:sha,
 installation_authorized:false,original_job_completed:false,production_changed:false};
const service={strictSecrets:true,project:'hvkfreoagbrphwghjajw',
 url:project,secretKey:'test-only-service-role-key-long-enough'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:service.project};
const request=auth=>new Request('https://example.invalid/',{
 method:'POST',headers:{apikey:auth?service.secretKey:'bad',
 authorization:'Bearer '+(auth?service.secretKey:'bad'),
 'content-type':'application/json'},
 body:'{"version":1,"action":"verify_same_original_preview_auto_deploy"}'
});
function rig({creator='vercel[bot]',statusContext='Vercel',
 verdict='success',wrongSha=false,wrongSource=false,duplicate=false}={}){
 const oldFetch=globalThis.fetch,requests=[];
 let savedCalls=0;
 globalThis.fetch=async(url,options={})=>{
  requests.push({url,method:options.method});
  let data;
  const route=url.startsWith(project)?url.slice(project.length):url.slice(github.length);
  if(route==='/rest/v1/rpc/reality_read_generalized_original_auto_deploy_scope_v1')
   data=scope;
  else if(route==='/rest/v1/rpc/reality_record_generalized_original_auto_deploy_receipt_v1'){
   savedCalls++;const args=JSON.parse(options.body);
   assert.equal(args.p_attempt_id,attempt);
   assert.equal(args.p_canary_commit_sha,sha);
   assert.equal(args.p_github_vercel_status_id,987654321);
   assert.equal(args.p_github_vercel_creator,'vercel[bot]');
   assert.equal(args.p_vercel_deployment_url,url);
   data={status:'GENERALIZED_PREVIEW_AUTO_DEPLOY_GITHUB_VERCEL_STATUS_VERIFIED',
    original_work_id:original,shift_id:shift,attempt_id:attempt,
    canary_commit_sha:sha,vercel_deployment_url:url,
    isolated_github_write_verified:true,preview_auto_deploy_verified:true,
    same_original_execution_and_settlement_contract_verified:false,
    owner_approval_ready:false,installation_authorized:false,
    original_job_completed:false,production_changed:false};
  }else if(route==='/commits/'+sha+'/status'){
   const s={id:987654321,context:statusContext,state:verdict,target_url:url,
    creator:{type:'Bot',login:creator}};
   data={sha:wrongSha?'f'.repeat(40):sha,statuses:duplicate?[s,s]:[s]};
  }else if(route==='/git/ref/heads/'+branch)
   data={ref:'refs/heads/'+branch,object:{sha:liveHead}};
  else if(route==='/contents/'+src+'?ref='+sha||
          route==='/contents/'+src+'?ref='+encodeURIComponent(branch))
   data={path:src,sha:wrongSource?'f'.repeat(40):srcBlob};
  else if(route==='/contents/'+probe+'?ref='+sha)
   data={path:probe,sha:probeBlob};
  else throw Error('UNEXPECTED_EXTERNAL_REQUEST '+route);
  return new Response(JSON.stringify(data),{status:200,
   headers:{'content-type':'application/json'}});
 };
 return {requests,get savedCalls(){return savedCalls},restore(){globalThis.fetch=oldFetch}};
}
test('independently verified Vercel App status of exact canary SHA creates only deploy receipt',async()=>{
 const t=rig();
 try{
  const r=await entry(request(true)),d=await r.json();
  assert.equal(r.status,200);
  assert.equal(d.status,'GENERALIZED_PREVIEW_AUTO_DEPLOY_GITHUB_VERCEL_STATUS_VERIFIED');
  assert.equal(d.preview_auto_deploy_verified,true);
  assert.equal(d.installation_authorized,false);
  assert.equal(d.original_job_completed,false);
  assert.equal(t.savedCalls,1);
  assert.equal(t.requests.some(x=>x.method==='PUT'),false);
 }finally{t.restore()}
});
test('a generic green CI or another bot cannot claim the Vercel deployment',async()=>{
 for(const flags of [{creator:'attacker[bot]'},{statusContext:'Tests'},
   {verdict:'pending'},{duplicate:true}]){
  const t=rig(flags);
  try{
   const d=await (await entry(request(true))).json();
   assert.equal(d.preview_auto_deploy_verified,false);
   assert.equal(t.savedCalls,0);
  }finally{t.restore()}
 }
});
test('provider SHA or unchanged source cannot drift into a false deployment receipt',async()=>{
 for(const flags of [{wrongSha:true},{wrongSource:true}]){
  const t=rig(flags);
  try{
   const d=await (await entry(request(true))).json();
   assert.equal(d.preview_auto_deploy_verified,false);
   assert.equal(t.savedCalls,0);
  }finally{t.restore()}
 }
});
test('no authenticated service identity: no provider reads or writes',async()=>{
 const t=rig();
 try{
  const r=await entry(request(false));assert.equal(r.status,403);
  assert.equal(t.requests.length,0);
 }finally{t.restore()}
});
test('signed worker refuses nonpreview deployment and does not infer owner approval',async()=>{
 const d=await verifyGeneralizedOriginalPreviewAutoDeploy({
  db:service,env:{...env,VERCEL_ENV:'production'},
  fetchImpl:async()=>{throw Error('SHOULD_NOT_CALL_PROVIDER')}});
 assert.equal(d.status,'GENERALIZED_DEPLOY_TRUSTED_ISOLATED_SERVICE_REQUIRED');
 assert.equal(d.preview_auto_deploy_verified,false);
 assert.equal(d.installation_authorized,false);
});
test('DB durable deploy status requires original uninstalled source receipt and exact same shift',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261114_generalized_original_preview_deployment_receipt_v1.sql',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(sql,/governed_original_source_write_probes_v1/);
 assert.match(sql,/reality_read_current_shift_execution_graph_v1/);
 assert.match(sql,/GITHUB_INDEPENDENT_VERCEL_BOT_SUCCESS_FOR_EXACT_CANARY_SHA/);
 assert.match(sql,/p_github_vercel_creator NOT IN \('vercel\[bot\]','vercel'\)/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.doesNotMatch(sql,/GRANT EXECUTE[^;]*authenticated/i);
 assert.match(worker,/verifyGeneralizedOriginalPreviewAutoDeploy/);
 assert.match(worker,/generalized_original_preview_auto_deploy:generalizedPreviewDeployment/);
});
