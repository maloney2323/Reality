// Independent construction-update capability acceptance evaluator.
// Runs in a credential-free, network-disabled, read-only Linux container.
// NEVER import this candidate outside the restricted verification process.
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const file=process.argv[2];
if(!file||!file.startsWith('/work/')||!file.endsWith('/candidate.mjs'))
 throw Error('RESTRICTED_CANDIDATE_PATH_REQUIRED');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const cases=[
 {name:'frozen:original-blocked-contractor-update',
 input:'JOB: C-104 | PHASE: Cabinets | STATUS: blocked | BLOCKER: inspection | OWNER: Juan',
 expected:{job_id:'C-104',phase:'cabinets',status:'BLOCKED',blocker:'inspection',owner:'Juan'}},
 {name:'frozen:out-of-order-status',
 input:'OWNER=Sam; STATUS=on track; JOB=C-202; PHASE=Rough-in',
 expected:{job_id:'C-202',phase:'rough-in',status:'ON_TRACK',blocker:null,owner:'Sam'}},
 {name:'frozen:completed-with-empty-blocker',
 input:'job=c-300; status=done; phase=Electrical; blocker=none',
 expected:{job_id:'C-300',phase:'electrical',status:'DONE',blocker:null,owner:null}},
 {name:'frozen:missing-required-job',input:'STATUS: done | OWNER: Juan',throws:true},
 {name:'frozen:missing-required-status',input:'JOB: C-100 | OWNER: Juan',throws:true},
 {name:'holdout:delimiter-variation',
 input:' status = ON_TRACK | owner = Mara ; blocker = NONE | phase = drywall | job = c-911 ',
 expected:{job_id:'C-911',phase:'drywall',status:'ON_TRACK',blocker:null,owner:'Mara'}},
 {name:'holdout:optional-fields-absent',
 input:'JOB=C-107|STATUS=blocked',
 expected:{job_id:'C-107',phase:null,status:'BLOCKED',blocker:null,owner:null}},
 {name:'holdout:case-insensitive-keys',
 input:'bLoCkEr: waiting on cabinets; jOb: c-111; oWnEr: A. Jones; sTaTuS: BLOCKED; pHaSe: Trim',
 expected:{job_id:'C-111',phase:'trim',status:'BLOCKED',blocker:'waiting on cabinets',owner:'A. Jones'}},
 {name:'holdout:status-hyphen',
 input:'job:C-505; status:on-track; phase:Inspection',
 expected:{job_id:'C-505',phase:'inspection',status:'ON_TRACK',blocker:null,owner:null}},
 {name:'holdout:status-underscore',
 input:'job:C-506; status:on_track; blocker:waiting on site access; owner:Juan',
 expected:{job_id:'C-506',phase:null,status:'ON_TRACK',blocker:'waiting on site access',owner:'Juan'}},
 {name:'holdout:duplicate-job-rejected',
 input:'JOB=C-501;STATUS=done;JOB=C-502',throws:true},
 {name:'holdout:duplicate-status-rejected',
 input:'JOB=C-502;STATUS=done;STATUS=blocked',throws:true},
 {name:'holdout:unknown-status-rejected',
 input:'JOB=C-503;STATUS=probably',throws:true},
 {name:'holdout:empty-job-rejected',
 input:'JOB=   ;STATUS=done',throws:true},
 {name:'holdout:value-preservation',
 input:'JOB = c-608;STATUS=BLOCKED;BLOCKER= permit #A-42 waiting ;OWNER=  Site Lead ',
 expected:{job_id:'C-608',phase:null,status:'BLOCKED',blocker:'permit #A-42 waiting',owner:'Site Lead'}},
];
let fn;
let importFailure=null;
try{
 const mod=await import(pathToFileURL(file).href);
 fn=mod.parseConstructionUpdate;
 if(typeof fn!=='function'||Object.keys(mod).sort().join(',')!=='parseConstructionUpdate')
  throw Error('CANDIDATE_EXPORT_CONTRACT_VIOLATION');
}catch(e){importFailure=String(e?.message||e).slice(0,180)}
const outcomes=[];
for(const c of cases){
 let valid=false,reason=null;
 try{
  if(importFailure)throw Error('IMPORT_OR_EXPORT_INVALID');
  const value=fn(c.input);
  if(value&&typeof value.then==='function')throw Error('ASYNC_NOT_PERMITTED');
  if(c.throws){reason='EXPECTED_THROW_NOT_OBSERVED';}
  else if(!value||typeof value!=='object'||Array.isArray(value)){
   reason='NOT_A_PLAIN_RESULT';
  }else{
   const sorted=Object.keys(value).sort().join(',');
   valid=sorted==='blocker,job_id,owner,phase,status'&&
    JSON.stringify(value)===JSON.stringify(c.expected);
   if(!valid&&sorted==='blocker,job_id,owner,phase,status'){
    valid=Object.keys(c.expected).every(k=>Object.is(value[k],c.expected[k]));
   }
   if(!valid)reason='OUTPUT_CONTRACT_OR_CONTENT_MISMATCH';
  }
 }catch(e){
  valid=c.throws===true&&!importFailure;
  if(!valid)reason='THREW_UNEXPECTEDLY';
 }
 outcomes.push({case_id:c.name,passed:valid,reason:valid?null:reason});
}
const passed=outcomes.filter(x=>x.passed).length;
const frozen=outcomes.filter(x=>x.case_id.startsWith('frozen:'));
const holdout=outcomes.filter(x=>x.case_id.startsWith('holdout:'));
const result={
 version:'reality-independent-construction-upgrade-verifier-v0.1',
 status:passed===cases.length?'INDEPENDENT_SANDBOX_VERIFIED':'SANDBOX_REJECTED',
 total:cases.length,passed,failed:cases.length-passed,
 frozen:{passed:frozen.every(x=>x.passed),count:frozen.length},
 holdout:{passed:holdout.every(x=>x.passed),count:holdout.length,
  result_sha256:hash(holdout)},
 isolation:{production_write_permitted:false,secrets_accessible:false,network_permitted:false},
 case_results:outcomes,
 original_work_completed:false,
};
console.log(JSON.stringify(result));
process.exitCode=result.failed===0?0:8;
