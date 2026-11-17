// Reality Connections — signed owner readback. No browser credentials,
// no ChatGPT plugin tokens, no speculative OAuth, and no external writes.
(()=>{
 'use strict';
 if(window.location.pathname!=='/connections')return;
 const root=document.getElementById('realityOwnerConnections');
 if(!root)return;
 const ready=document.getElementById('privateReady');
 const create=(tag,cls,value)=>{
  const x=document.createElement(tag);
  if(cls)x.className=cls;
  if(value!==undefined)x.textContent=value;return x;
 };
 const section=create('section','rx-connections-area');
 const head=create('div','rx-connection-actions');
 const state=create('p','rx-connections-status',
  'Sign in to Reality to inspect your business connections.');
 state.setAttribute('role','status');
 state.setAttribute('aria-live','polite');
 const check=create('button','rx-connection-refresh','Check connections');
 check.type='button';
 head.append(state,check);section.append(head);
 const grid=create('div','rx-connections-grid');section.append(grid);
 root.append(section);
 let loading=false,epoch=0;
 const labels=new Set(['GitHub','Supabase','Vercel','Stripe','Gmail',
  'Google Calendar','QuickBooks','Slack']);
 const ids=new Set(['github','supabase','vercel','stripe','gmail',
  'google-calendar','quickbooks','slack']);
 const statuses=new Set([
  'OWNER_DATABASE_READBACK_VERIFIED',
  'GITHUB_PUBLIC_SOURCE_OBSERVED_NO_OAUTH_CLAIM',
  'ADAPTER_CONFIGURED_PROVIDER_AUTH_UNVERIFIED',
  'ADAPTER_AVAILABLE_NEEDS_OWNER_SETUP',
  'INTEGRATION_NOT_YET_IMPLEMENTED'
 ]);
 const icon=id=>({
  github:'⌘',supabase:'▦',vercel:'△',stripe:'$',gmail:'✉',
  'google-calendar':'▣',quickbooks:'◈',slack:'♧'
 })[id]||'◦';
 const ownerSigned=()=>ready?.style.display==='block';
 function clear(message){
  epoch++;grid.replaceChildren();
  state.textContent=message;
 }
 function valid(d){
  if(d?.ok!==true||
   d.status!=='REALITY_OWNER_CONNECTIONS_READ_ONLY_INVENTORY'||
   d.owner_scope_verified!==true||d.read_only!==true||
   d.connection_grants_created!==0||d.oauth_flows_completed!==0||
   d.provider_oauth_verified_count!==0||
   d.owner_billing_authorized!==false||
   d.external_execution_authorized!==false||
   d.source_work_items_not_jobs!==true||
   !Array.isArray(d.providers)||d.providers.length!==8||
   new Set(d.providers.map(x=>x.id)).size!==8||
   !d.providers.every(x=>
    ids.has(x.id)&&labels.has(x.label)&&
    typeof x.description==='string'&&x.description.length>12&&
    Array.isArray(x.employee_roles)&&x.employee_roles.length>=1&&
    x.employee_roles.length<=8&&
    x.employee_roles.every(r=>
     ['Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage']
      .includes(r))&&
    statuses.has(x.status)&&
    x.provider_account_authenticated===false&&
    x.external_actions_authorized===false&&
    x.production_changes_authorized===false&&
    x.refunds_authorized===false&&
    x.billing_changes_authorized===false&&
    x.connection_action_available===false&&
    typeof x.adapter_registered==='boolean'&&
    typeof x.credential_configured==='boolean'&&
    typeof x.discovery_source_verified==='boolean'))
   return false;
  return true;
 }
 function showCard(source){
  const card=create('article','rx-connection-card');
  card.dataset.provider=source.id;
  const top=create('div','rx-connection-card-head');
  const logo=create('span','rx-connection-glyph',icon(source.id));
  logo.setAttribute('aria-hidden','true');
  const heading=create('div','rx-connection-heading');
  heading.append(create('h2','',source.label),
   create('span','rx-connection-group',source.group));
  const marker=create('span','rx-connection-indicator');
  const accessible=source.status==='OWNER_DATABASE_READBACK_VERIFIED';
  const observed=source.status==='GITHUB_PUBLIC_SOURCE_OBSERVED_NO_OAUTH_CLAIM';
  marker.textContent=accessible?'Database read verified':
   observed?'Public source observed':
   source.status==='ADAPTER_CONFIGURED_PROVIDER_AUTH_UNVERIFIED'?
    'Adapter configured · unverified':
   source.status==='ADAPTER_AVAILABLE_NEEDS_OWNER_SETUP'?
    'Needs setup':'Integration needed';
  marker.dataset.level=accessible?'verified':observed?'observed':'pending';
  top.append(logo,heading,marker);
  card.append(top,create('p','rx-connection-description',source.description));
  const details=create('details','rx-connection-details');
  const summary=create('summary','','What Reality can access');
  const perm=create('p','',
   'Current permission: '+
    (accessible?'Owner-scoped existing data readback':
     observed?'Public GitHub source observations (not a GitHub OAuth login)':
     'No verified owner permission'));
  const employee=create('p','',
   'Relevant employees: '+source.employee_roles.join(', '));
  const advice=create('p','',
   accessible?'Connected to Reality’s own database. This does not authorize changing records.':
   observed?'Existing automatic public discovery is active. Private repository and write access require separate Reality-owned credentials and authority.':
   source.adapter_registered?
    'An internal connector adapter exists, but provider authentication is not independently verified. Secure setup and a provider readback are required.':
    'This provider needs a Reality-owned OAuth or restricted-token integration. ChatGPT connections do not transfer to Reality.');
  details.append(summary,perm,employee,advice);
  card.append(details);
  const foot=create('div','rx-connection-footer');
  foot.append(create('span','','No account changes · no payment authority'));
  if(!accessible&&!observed){
   const note=create('span','rx-connection-note',
    'Direct Connect requires the secure provider setup flow');
   foot.append(note);
  }
  card.append(foot);return card;
 }
 async function load(){
  if(!ownerSigned()){
   clear('Sign in to Reality to inspect your business connections.');
   return;
  }
  if(loading)return;
  loading=true;const thisLoad=++epoch;
  grid.replaceChildren();
  check.disabled=true;state.textContent='Checking Reality-owned connection evidence…';
  try{
   const response=await fetch('/api/reality/personal-connections',{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(15000)});
   const data=await response.json().catch(()=>null);
   if(thisLoad!==epoch||!ownerSigned())return;
   if(response.status===401){
    clear('Your sign-in needs refreshing. No connection state is assumed.');
    return;
   }
   if(!response.ok||!valid(data))throw Error('OWNER_CONNECTIONS_UNVERIFIED');
   grid.append(...data.providers.map(showCard));
   const verified=data.providers.filter(x=>x.discovery_source_verified).length;
   state.textContent=verified+
    ' Reality source readbacks observed · '+
    (data.providers.length-verified)+
    ' services still need connection verification or setup. '+
    'Connector permission never implies automatic execution authority.';
  }catch{
   if(thisLoad===epoch&&ownerSigned())
    clear('Connection status could not be verified. No apps are claimed connected.');
  }finally{loading=false;check.disabled=false}
 }
 check.addEventListener('click',()=>{void load()});
 if(ready&&typeof MutationObserver==='function')
  new MutationObserver(()=>{
   if(ownerSigned())void load();
   else clear('Signed out. Connection details have been cleared.');
  }).observe(ready,{attributes:true,attributeFilter:['style']});
 void load();
})();
