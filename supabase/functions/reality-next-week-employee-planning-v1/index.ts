// Unattended NEXT-WEEK SOURCE PREPARATION. Runs before next week's shifts.
// No model calls, owner job creation, installation or production changes.
// A scheduled source observation is a draft input, never execution authority.
const PROJECT='hvkfreoagbrphwghjajw';
const REPO='maloney2323/Reality';
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9]\d{0,7})$/;
const deny=(reason:string):never=>{throw Error('NEXT_WEEK_PREP_'+reason)};
function response(status:number,data:Record<string,unknown>){
 return new Response(JSON.stringify(data),{status,headers:{
  'content-type':'application/json','cache-control':'no-store',
  'x-content-type-options':'nosniff'}});
}
const facts={shift_execution_authorized:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 net_financial_savings_verified:false,no_new_job_created:true};
function environment(){
 const url=Deno.env.get('SUPABASE_URL')||'';
 const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 if(url!=='https://'+PROJECT+'.supabase.co'||secret.length<25)
  deny('EXACT_ISOLATED_PROJECT_REQUIRED');
 return {url,secret};
}
async function rpc(name:string,args:Record<string,unknown>,
 env:{url:string;secret:string}){
 const allowed=new Set([
  'reality_authenticate_employee_shift_wake_v1',
  'reality_store_next_week_source_snapshot_v1',
  'reality_read_next_week_source_snapshot_v1']);
 if(!allowed.has(name))deny('SERVICE_RPC_NOT_ALLOWED');
 const r=await fetch(env.url+'/rest/v1/rpc/'+name,{
  method:'POST',cache:'no-store',redirect:'error',
  headers:{apikey:env.secret,authorization:'Bearer '+env.secret,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(args),signal:AbortSignal.timeout(12000)});
 const x=await r.json().catch(()=>null);
 if(!r.ok||!x||Array.isArray(x)||typeof x!=='object')
  deny('DB_SERVICE_READBACK_UNAVAILABLE');
 return x as Record<string,unknown>;
}
function nextMonday(now:Date){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
  timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(now).filter(x=>['year','month','day'].includes(x.type))
  .map(x=>[x.type,Number(x.value)]));
 const d=new Date(Date.UTC(p.year,p.month-1,p.day));
 const dow=d.getUTCDay();
 d.setUTCDate(d.getUTCDate()+(8-(dow===0?7:dow)));
 return d.toISOString().slice(0,10);
}
async function githubOpenIssues(){
 const seen=new Set<number>(),out:Array<{
  issue_number:number;issue_url:string;title:string}>=[];
 let complete=false;
 for(let page=1;page<=4;page++){
  const url='https://api.github.com/repos/'+REPO+
   '/issues?state=open&per_page=100&page='+page;
  const r=await fetch(url,{
   method:'GET',cache:'no-store',redirect:'error',
   headers:{accept:'application/vnd.github+json',
    'user-agent':'Reality-Unattended-Next-Week-Source-Review-v1',
    'x-github-api-version':'2022-11-28'},
   signal:AbortSignal.timeout(12000)});
  if(!r.ok)deny('GITHUB_CURRENT_SOURCE_UNAVAILABLE');
  const json=await r.json().catch(()=>null);
  if(!Array.isArray(json)||json.length>100)
   deny('SOURCE_PAGE_INVALID');
  for(const item of json){
   if(item?.pull_request)continue;
   const number=item?.number;
   if(item?.state!=='open'||!Number.isSafeInteger(number)||
    number<1||item.html_url!=='https://github.com/'+REPO+'/issues/'+number||
    !ISSUE.test(item.html_url)||typeof item.title!=='string'||
    !item.title.trim()||seen.has(number))
    deny('SOURCE_ISSUE_IDENTITY_MISMATCH');
   seen.add(number);
   out.push({issue_number:number,issue_url:item.html_url,
    title:item.title.slice(0,200)});
   if(out.length>150)deny('OPEN_SOURCE_COVERAGE_TOO_LARGE');
  }
  const hasNext=/(?:^|,)\s*<[^>]+>;\s*rel="next"/.test(
   r.headers.get('link')||'');
  if(!hasNext){complete=true;break}
 }
 if(!complete)deny('SOURCE_PAGINATION_NOT_COMPLETE');
 return out.sort((a,b)=>a.issue_number-b.issue_number);
}
async function sha256(input:string){
 const bytes=new TextEncoder().encode(input);
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 return Array.from(hash,x=>x.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST')
   return response(405,{ok:false,status:'NEXT_WEEK_POST_ONLY',...facts});
  if(req.headers.get('content-type')!=='application/json')
   return response(415,{ok:false,status:'NEXT_WEEK_JSON_ONLY',...facts});
  const token=/^Bearer ([a-f0-9]{64})$/.exec(
   req.headers.get('authorization')||'');
  if(!token)return response(403,{ok:false,status:'NEXT_WEEK_SIGNED_WAKE_REQUIRED',...facts});
  const raw=await req.text();
  if(raw.trim()!=='{}'||raw.length>16)
   return response(400,{ok:false,status:'NEXT_WEEK_NO_CLIENT_TASK_SCOPE',...facts});
  const env=environment();
  const auth=await rpc('reality_authenticate_employee_shift_wake_v1',
   {p_token:token[1]},env);
  if(auth.status!=='ISOLATED_SHIFT_WAKE_AUTHENTICATED'||
   auth.permission_granted!==false||
   auth.installation_authorized!==false||
   auth.production_changed!==false)
   return response(403,{ok:false,status:'NEXT_WEEK_WAKE_AUTH_FAILED',...facts});
  const now=new Date(),weekStart=nextMonday(now);
  const issues=await githubOpenIssues();
  const digest=await sha256(JSON.stringify(issues));
  const stored=await rpc('reality_store_next_week_source_snapshot_v1',{
   p_week_start:weekStart,p_open_issues:issues,
   p_source_sha256:digest,p_source_complete:true
  },env);
  if(stored.status!=='NEXT_WEEK_SOURCE_SNAPSHOT_PREPARED'||
   stored.week_start!==weekStart||stored.source_sha256!==digest||
   stored.open_issue_count!==issues.length||
   stored.shift_execution_authorized!==false||
   stored.installation_authorized!==false||
   stored.production_changed!==false)
   deny('STORE_RECEIPT_UNVERIFIED');
  const read=await rpc('reality_read_next_week_source_snapshot_v1',{},env);
  if(read.status!=='NEXT_WEEK_SOURCE_SNAPSHOT_PREPARED'||
   read.week_start!==weekStart||read.source_sha256!==digest||
   read.open_issue_count!==issues.length||
   read.shift_execution_authorized!==false||
   read.installation_authorized!==false||
   read.production_changed!==false)
   deny('INDEPENDENT_NEXT_WEEK_READBACK_MISMATCH');
  return response(200,{ok:true,
   status:'NEXT_WEEK_SOURCE_SNAPSHOT_INDEPENDENTLY_READ_BACK',
   week_start:weekStart,
   open_issues_checked:issues.length,
   source_sha256:digest,
   background_prepared_at:read.prepared_at,
   ...facts});
 }catch(e){
  const code=String(e instanceof Error?e.message:'UNVERIFIED_FAILURE');
  if(/^NEXT_WEEK_PREP_[A-Z0-9_]{3,100}$/.test(code))
   console.warn('REALITY_NEXT_WEEK_PLANNER',code);
  return response(503,{ok:false,status:'NEXT_WEEK_PREPARATION_REQUIRES_RECONCILIATION',
   no_prior_snapshot_erased:true,...facts});
 }
});
