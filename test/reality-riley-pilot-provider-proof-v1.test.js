import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readRileyPilotProviderProof}
 from '../src/reality-riley-pilot-provider-proof-v1.js';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const RUN=42141160497;
const run={id:RUN,name:'Reality flexible governed employee shifts',
 event:'pull_request',status:'completed',conclusion:'success',
 head_repository:{full_name:'maloney2323/Reality'},
 head_sha:'c'.repeat(40),
 html_url:'https://github.com/maloney2323/Reality/actions/runs/'+RUN};
const jobs=['verify-duration-and-authority',
 'riley-live-investigation','riley-independent-verification'].map((name,i)=>({
 id:1200+i,run_id:RUN,name,status:'completed',conclusion:'success'
}));
function provider({runs=[run],jobsList=jobs}={}){
 const hits=[];
 const fetchImpl=async(url,opts)=>{
  hits.push({url,method:opts.method});
  const p=url.slice(ROOT.length);
  const data=p==='/actions/runs?per_page=100'?{
   total_count:runs.length,workflow_runs:runs
  }:p==='/actions/runs/'+RUN+'/jobs?per_page=100'?{
   total_count:jobsList.length,jobs:jobsList
  }:null;
  return {ok:!!data,json:async()=>data};
 };
 return {fetchImpl,hits};
}
test('Riley card may show only a real independent provider job success',async()=>{
 const p=provider();
 const result=await readRileyPilotProviderProof({fetchImpl:p.fetchImpl});
 assert.equal(result.status,'RILEY_FIRST_REAL_INVESTIGATION_INDEPENDENTLY_VERIFIED');
 assert.equal(result.source_run_id,RUN);
 assert.equal(result.independently_verified_job_id,1202);
 assert.equal(result.employee_name,'Riley');
 assert.equal(result.original_job_completed,false);
 assert.equal(result.autonomous_eight_hour_shift_verified,false);
 assert.equal(result.model_code_generation_verified,false);
 assert.equal(result.capability_installed,false);
 assert.equal(result.verified_human_hours_saved,null);
 assert.equal(result.production_changed,false);
 assert.equal(p.hits.every(h=>h.method==='GET'&&h.url.startsWith(ROOT)),true);
});
test('missing independent check, failed run or wrong repo cannot count',async()=>{
 for(const p of [
  provider({jobsList:jobs.slice(0,2)}),
  provider({jobsList:jobs.map((x,i)=>i===2?{...x,conclusion:'failure'}:x)}),
  provider({runs:[{...run,head_repository:{full_name:'other/Reality'}}]}),
  provider({runs:[{...run,conclusion:'failure'}]})
 ]){
  const result=await readRileyPilotProviderProof({fetchImpl:p.fetchImpl});
  assert.equal(result.status,'NO_INDEPENDENT_RILEY_PILOT_RUN_FOUND_IN_BOUNDED_PROVIDER_SCAN');
  assert.equal(result.verified_employee_work,false);
  assert.equal(result.original_job_completed,false);
 }
});
test('invalid run and job provider responses fail closed',async()=>{
 const bad=provider({jobsList:jobs.concat(jobs[0])});
 const r=await readRileyPilotProviderProof({fetchImpl:bad.fetchImpl});
 assert.equal(r.status,'NO_INDEPENDENT_RILEY_PILOT_RUN_FOUND_IN_BOUNDED_PROVIDER_SCAN');
 const wrong={...run,html_url:'https://other.example/actions/runs/'+RUN};
 const p=provider({runs:[wrong]});
 const out=await readRileyPilotProviderProof({fetchImpl:p.fetchImpl});
 assert.equal(out.verified_employee_work,false);
});
test('Riley proof API is owner-bound, preview-only and rendered without execution claims',()=>{
 const api=readFileSync(new URL('../api/reality/personal-riley-proof.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/process\.env\.VERCEL_ENV!=='preview'/);
 assert.match(api,/req\.method!=='GET'/);
 assert.match(api,/readRileyPilotProviderProof\(\)/);
 assert.doesNotMatch(api,/installCapability|authorize_employee_shift|shiftRpc\(/);
 assert.match(html,/const RILEY_PROOF='\/api\/reality\/personal-riley-proof'/);
 assert.match(html,/rileyPilotProof/);
 assert.match(html,/independently verified/);
 assert.match(html,/result\.original_job_completed!==false/);
 assert.match(html,/result\.verified_human_hours_saved!==null/);
});
