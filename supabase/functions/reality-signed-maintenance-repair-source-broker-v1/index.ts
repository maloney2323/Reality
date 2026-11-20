// Read-only GitHub source transport for EXACT existing signed maintenance
// candidates. Reuses Reality's Supabase GitHub broker credential. Never
// writes GitHub, executes model source, changes owner authority, or settles.
const PROJECT='hvkfreoagbrphwghjajw';
const REPO='https://api.github.com/repos/maloney2323/Reality';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const FILE=/^(?:src|api\/reality)\/[A-Za-z0-9_./-]+\.js$/;
const fail=(reason:string):never=>{throw Error('SIGNED_SOURCE_BROKER_'+reason)};
const response=(code:number,status:string,extra:Record<string,unknown>={})=>
 new Response(JSON.stringify({
  ok:code===200,status,...extra,
  source_read_only:true,model_generated:false,
  independent_frozen_red_verified:false,independent_ci_verified:false,
  installation_authorized:false,repair_executed:false,
  original_job_completed:false,production_changed:false,
  new_shift_started:false
 }),{status:code,headers:{'content-type':'application/json',
  'cache-control':'no-store','x-content-type-options':'nosniff'}});
function same(a:string,b:string){
 if(a.length!==b.length)return false;
 let z=0;for(let i=0;i<a.length;i++)z|=a.charCodeAt(i)^b.charCodeAt(i);
 return z===0;
}
function config(){
 const url=Deno.env.get('SUPABASE_URL')||'';
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 const github=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
 if(url!=='https://'+PROJECT+'.supabase.co'||
    key.length<25||github.length<25)
  fail('PINNED_PROJECT_CREDENTIALS_UNVERIFIED');
 return {url,key,github};
}
async function rpc(c:{url:string,key:string},name:string,args:Record<string,unknown>){
 if(name!=='reality_read_signed_maintenance_repair_source_scope_v1')
  fail('UNREGISTERED_SOURCE_RPC');
 const r=await fetch(c.url+'/rest/v1/rpc/'+name,{
  method:'POST',redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(9000),
  headers:{apikey:c.key,authorization:'Bearer '+c.key,
   'content-type':'application/json'},
  body:JSON.stringify(args)
 });
 if(!r.ok)fail('OWNER_SIGNED_SOURCE_SCOPE_READ_UNAVAILABLE');
 const d=await r.json().catch(()=>null);
 if(!d||Array.isArray(d)||typeof d!=='object')fail('SOURCE_SCOPE_RESPONSE_INVALID');
 return d;
}
async function github(c:{github:string},path:string){
 const r=await fetch(REPO+path,{
  method:'GET',redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(11000),
  headers:{authorization:'Bearer '+c.github,
   accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-signed-maintenance-source-inspection-v1'}
 });
 if(!r.ok)fail('PINNED_GITHUB_PROVIDER_UNAVAILABLE');
 const d=await r.json().catch(()=>null);
 if(!d||Array.isArray(d)||typeof d!=='object')fail('PINNED_GITHUB_RESPONSE_INVALID');
 return d;
}
async function gitBlobSha(buffer:Uint8Array):Promise<string>{
 const prefix=new TextEncoder().encode('blob '+buffer.length+'\0');
 const body=new Uint8Array(prefix.length+buffer.length);
 body.set(prefix);body.set(buffer,prefix.length);
 const h=await crypto.subtle.digest('SHA-1',body);
 return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST')return response(405,'SIGNED_SOURCE_BROKER_POST_ONLY');
  const c=config();
  if(!same(req.headers.get('apikey')||'',c.key)||
     !same(req.headers.get('authorization')||'','Bearer '+c.key))
   return response(403,'SIGNED_SOURCE_BROKER_SERVICE_AUTH_REQUIRED');
  if(req.headers.get('content-type')!=='application/json')
   return response(415,'SIGNED_SOURCE_BROKER_JSON_ONLY');
  const raw=await req.text();
  if(raw.length<120||raw.length>620)
   return response(400,'SIGNED_SOURCE_BROKER_EXACT_BODY_REQUIRED');
  const b=JSON.parse(raw);
  if(!b||Array.isArray(b)||typeof b!=='object'||
     !['manifest','source'].includes(b.mode)||
     !UUID.test(b.maintenance_id||'')||
     !UUID.test(b.request_id||'')||
     !SHA.test(b.release_sha||'')||
     Object.keys(b).sort().join(',')!==
      (b.mode==='manifest'?'maintenance_id,mode,release_sha,request_id':
       'maintenance_id,mode,release_sha,request_id,target_path')||
     (b.mode==='source'&&(!FILE.test(b.target_path||'')||
       b.target_path.includes('..')||b.target_path.includes('//'))))
   return response(400,'SIGNED_SOURCE_BROKER_SCOPE_INVALID');
  const scope=await rpc(c,'reality_read_signed_maintenance_repair_source_scope_v1',{
   p_maintenance_id:b.maintenance_id,p_request_id:b.request_id,
   p_release_sha:b.release_sha
  });
  if(scope.status!=='SIGNED_MAINTENANCE_CANDIDATE_SOURCE_BROKER_SCOPE_VERIFIED'||
     scope.maintenance_id!==b.maintenance_id||
     scope.request_id!==b.request_id||
     scope.release_sha!==b.release_sha||
     !UUID.test(scope.owner_id||'')||
     !UUID.test(scope.shift_id||'')||
     scope.source_read_authorized!==true||
     scope.model_candidate_only!==true||
     scope.installation_authorized!==false||
     scope.original_job_completed!==false||
     scope.production_changed!==false)
   return response(403,'SIGNED_SOURCE_BROKER_LEDGER_SCOPE_REQUIRED');
  const commit=await github(c,'/git/commits/'+b.release_sha);
  if(commit.sha!==b.release_sha||!SHA.test(commit.tree?.sha||''))
   fail('PINNED_GIT_COMMIT_DRIFT');
  const tree=await github(c,'/git/trees/'+commit.tree.sha+'?recursive=1');
  if(tree.sha!==commit.tree.sha||tree.truncated===true||
     !Array.isArray(tree.tree))
   fail('PINNED_SOURCE_TREE_DRIFT');
  const files=tree.tree.filter((x:any)=>x?.type==='blob'&&
   FILE.test(x.path||'')&&!x.path.includes('..')&&
   SHA.test(x.sha||'')&&Number.isSafeInteger(x.size)&&
   x.size>=300&&x.size<=60000)
   .map((x:any)=>({path:x.path,sha:x.sha,size:x.size}));
  if(!files.length||files.length>2500)
   fail('PINNED_SOURCE_LIST_OUT_OF_BOUNDS');
  if(b.mode==='manifest')
   return response(200,'SIGNED_MAINTENANCE_SOURCE_MANIFEST_VERIFIED',{
    maintenance_id:b.maintenance_id,request_id:b.request_id,
    release_sha:b.release_sha,source_tree_sha:tree.sha,
    files
   });
  const match=files.find((x:{path:string})=>x.path===b.target_path);
  if(!match)fail('SOURCE_FILE_NOT_IN_PINNED_TREE');
  const file=await github(c,'/contents/'+b.target_path+
   '?ref='+b.release_sha);
  if(file.path!==match.path||file.sha!==match.sha||
     file.size!==match.size||file.encoding!=='base64'||
     typeof file.content!=='string')
   fail('SOURCE_FILE_METADATA_DRIFT');
  const data=Uint8Array.from(atob(file.content.replace(/\s/g,'')),
   v=>v.charCodeAt(0));
  if(data.length!==match.size||await gitBlobSha(data)!==match.sha)
   fail('SOURCE_FILE_GIT_BLOB_MISMATCH');
  return response(200,'SIGNED_MAINTENANCE_SOURCE_FILE_VERIFIED',{
   maintenance_id:b.maintenance_id,request_id:b.request_id,
   release_sha:b.release_sha,source_tree_sha:tree.sha,
   path:file.path,sha:file.sha,size:data.length,
   encoding:'base64',content:file.content
  });
 }catch(e){
  const msg=String(e instanceof Error?e.message:'UNKNOWN');
  if(/^SIGNED_SOURCE_BROKER_[A-Z0-9_]{3,90}$/.test(msg))
   console.warn('REALITY_SIGNED_SOURCE_PROVIDER',msg);
  return response(503,'SIGNED_SOURCE_BROKER_PROVIDER_OR_SCOPE_UNVERIFIED');
 }
});
