// Tiny unprivileged evaluator. Each candidate invocation gets a fresh
// isolated Node process; the parent grader retains its own test assertions.
import {pathToFileURL} from 'node:url';
let input='';
for await(const data of process.stdin)input+=data;
try{
 const src=process.argv[2];
 if(src!=='/work/candidate.mjs')throw Error('CANDIDATE_PATH_REJECTED');
 const mod=await import(pathToFileURL(src).href);
 if(typeof mod?.parseConstructionUpdate!=='function'||
    Object.keys(mod).sort().join(',')!=='parseConstructionUpdate')
  throw Error('CANDIDATE_EXPORT_VIOLATION');
 let value,failed=false,reason=null;
 try{
  value=mod.parseConstructionUpdate(JSON.parse(input).input);
  if(value&&typeof value.then==='function')throw Error('ASYNC_UNSUPPORTED');
 }catch(err){failed=true;reason=String(err?.message||err).slice(0,100)}
 process.stdout.write(JSON.stringify({evaluated:true,failed,
  value:failed?null:value,reason})+'\n');
}catch(error){
 process.stdout.write(JSON.stringify({evaluated:false,failed:true,
  error:String(error?.message||error).slice(0,140)})+'\n');
 process.exitCode=9;
}
