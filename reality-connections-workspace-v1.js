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
 const signinLink=create('a','rx-connection-signin','Sign in to Reality');
 signinLink.href='/';
 const check=create('button','rx-connection-refresh','Auto-detect existing sources');
 check.type='button';
 head.append(state,signinLink,check);section.append(head);
 const catalogTools=create('div','rx-connection-catalog-tools');
 const browse=create('button','rx-connection-browse','Browse all apps');
 browse.type='button';browse.setAttribute('aria-expanded','false');
 const searchLabel=create('label','rx-connection-search-label','Find an app');
 const search=create('input','rx-connection-search');
 search.type='search';search.placeholder='Search PayPal, sales, field services…';
 search.setAttribute('aria-label','Search available business app integrations');
 searchLabel.append(search);
 const groups=create('select','rx-connection-group-filter');
 groups.setAttribute('aria-label','Filter connections by business category');
 catalogTools.append(browse,searchLabel,groups);section.append(catalogTools);
 const grid=create('div','rx-connections-grid');section.append(grid);
 root.append(section);
 let loading=false,epoch=0,requestBusy=false,allSources=[],showAll=false;
 const labels=new Set(['GitHub','Supabase','Vercel','Stripe','Gmail',
  'Google Calendar','QuickBooks','Slack','PayPal','Square','Shopify',
  'Google Drive','Microsoft 365','Notion','HubSpot','Mailchimp',
  'Xero','Zoom','Meta Business','Google Analytics','Asana','Trello',
  'Jobber','Housecall Pro','ServiceTitan','Airtable']);
 const ids=new Set(['github','supabase','vercel','stripe','gmail',
  'google-calendar','quickbooks','slack','paypal','square','shopify',
  'google-drive','microsoft-365','notion','hubspot','mailchimp',
  'xero','zoom','meta-business','google-analytics','asana','trello',
  'jobber','housecall-pro','servicetitan','airtable']);
 const statuses=new Set([
  'OWNER_DATABASE_READBACK_VERIFIED',
  'GITHUB_PUBLIC_SOURCE_OBSERVED_NO_OAUTH_CLAIM',
  'ADAPTER_CONFIGURED_PROVIDER_AUTH_UNVERIFIED',
  'ADAPTER_AVAILABLE_NEEDS_OWNER_SETUP',
  'INTEGRATION_NOT_YET_IMPLEMENTED'
 ]);
 const icon=id=>({
  github:'⌘',supabase:'▦',vercel:'△',stripe:'$',gmail:'✉',
  'google-calendar':'▣',quickbooks:'◈',slack:'♧',
  paypal:'P',square:'▣',shopify:'▤','google-drive':'◇',
  'microsoft-365':'▦',notion:'N',hubspot:'◉',mailchimp:'✉',
  xero:'◈',zoom:'◉','meta-business':'M',
  'google-analytics':'▥',asana:'☷',trello:'▦',
  jobber:'⌂','housecall-pro':'⌂',servicetitan:'⚙',airtable:'▦'
 })[id]||'◦';
 const ownerSigned=()=>ready?.style.display==='block';
 function clear(message){
  epoch++;allSources=[];grid.replaceChildren();
  state.textContent=message;
  signinLink.hidden=ownerSigned();check.hidden=!ownerSigned();
  catalogTools.hidden=!ownerSigned();
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
   !Array.isArray(d.providers)||d.providers.length!==26||
   new Set(d.providers.map(x=>x.id)).size!==26||
   !Number.isSafeInteger(d.setup_requests_pending)||
   d.setup_requests_pending<0||d.setup_requests_pending>26||
   d.automatic_discovery_of_existing_sources!==true||
   d.automatic_grant_of_new_provider_access!==false||
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
    x.setup_request_action_available===true&&
    typeof x.setup_requested==='boolean'&&
    x.setup_request_state===(x.setup_requested?
     'SETUP_REQUESTED_NO_CREDENTIALS':'NOT_REQUESTED')&&
    typeof x.auto_detect_supported==='boolean'&&
    (x.documented_setup_url===null||
     (x.id==='paypal'&&x.documented_setup_url===
      'https://developer.paypal.com/api/rest/')||
     (x.id==='stripe'&&x.documented_setup_url===
      'https://docs.stripe.com/connect'))&&
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
  if(!accessible&&!observed){
   const actions=create('div','rx-connection-setup-actions');
   const request=create('button','rx-connection-request',
    source.setup_requested?'Setup requested':'Request secure setup');
   request.type='button';
   request.disabled=source.setup_requested;
   request.setAttribute('aria-label',
    'Request secure Reality connection setup for '+source.label);
   request.addEventListener('click',()=>{void requestSetup(source.id)});
   actions.append(request);
   if(source.documented_setup_url){
    const docs=create('a','rx-connection-docs','Provider setup guide');
    docs.href=source.documented_setup_url;
    docs.target='_blank';docs.rel='noopener noreferrer';
    actions.append(docs);
   }
   card.append(actions);
  }
  const foot=create('div','rx-connection-footer');
  foot.append(create('span','','No account changes · no payment authority'));
  if(!accessible&&!observed){
   const note=create('span','rx-connection-note',
    'Direct Connect requires the secure provider setup flow');
   foot.append(note);
  }
  card.append(foot);return card;
 }
 function render(){
  grid.replaceChildren();
  if(!allSources.length)return;
  const q=search.value.trim().toLocaleLowerCase().slice(0,100);
  const group=groups.value;
  const defaultIds=new Set(['github','supabase','vercel','stripe',
   'paypal','gmail','google-calendar','quickbooks','slack']);
  const visible=allSources.filter(x=>
   (showAll||q||group!=='All'||defaultIds.has(x.id))&&
   (group==='All'||x.group===group)&&
   (!q||[x.label,x.description,x.group,...x.employee_roles].join(' ')
    .toLocaleLowerCase().includes(q)));
  grid.append(...visible.map(showCard));
  if(!visible.length)grid.append(create('p','rx-connection-empty',
   'No matching apps. Try another category or a broader search.'));
  browse.textContent=showAll?'Show essential apps':'Browse all apps ('+
   allSources.length+')';
  browse.setAttribute('aria-expanded',String(showAll));
 }
 async function requestSetup(providerId){
  if(requestBusy||!ownerSigned()||!ids.has(providerId))return;
  requestBusy=true;
  state.textContent='Recording owner-requested setup for '+
   (allSources.find(x=>x.id===providerId)?.label||'this app')+'…';
  try{
   const response=await fetch('/api/reality/personal-connections',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({provider_id:providerId}),
    signal:AbortSignal.timeout(15000)});
   const result=await response.json().catch(()=>null);
   if(!ownerSigned()||response.status!==202||result?.ok!==true||
    result.status!=='OWNER_CONNECTION_SETUP_REQUEST_RECORDED'||
    result.provider_id!==providerId||
    result.setup_state!=='SETUP_REQUESTED_NO_CREDENTIALS'||
    result.actual_provider_connected!==false||
    result.oauth_consent_granted!==false||
    result.credentials_saved!==false||
    result.payment_action_authorized!==false||
    result.external_execution_authorized!==false)
    throw Error('REALITY_SETUP_NOT_INDEPENDENTLY_RECORDED');
   state.textContent='Setup requested. Reality has NOT accessed this provider or received account permissions.';
   // Never convert request state to connection state without an owner readback.
   await load();
  }catch{
   if(ownerSigned())state.textContent=
    'Setup request not verified. No provider permission or connection was granted.';
  }finally{requestBusy=false}
 }
 browse.addEventListener('click',()=>{
  showAll=!showAll;render();
 });
 search.addEventListener('input',()=>{if(search.value.trim())showAll=true;render()});
 groups.addEventListener('change',()=>{if(groups.value!=='All')showAll=true;render()});
 async function load(){
  if(!ownerSigned()){
   clear('Sign in to Reality to inspect your business connections.');
   return;
  }
  if(loading)return;
  loading=true;const thisLoad=++epoch;
  signinLink.hidden=true;check.hidden=false;catalogTools.hidden=false;
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
   allSources=data.providers;
   const previousGroup=groups.value||'All';
   groups.replaceChildren();
   for(const name of ['All',...new Set(allSources.map(x=>x.group))]){
    const option=create('option','',name);
    option.value=name;groups.append(option);
   }
   groups.value=[...groups.options].some(x=>x.value===previousGroup)?
    previousGroup:'All';
   render();
   const verified=data.providers.filter(x=>x.discovery_source_verified).length;
   state.textContent=verified+
    ' Reality source readbacks · '+data.providers.length+
    ' apps in catalog · '+data.setup_requests_pending+
    ' setup requests saved. Auto-detection checks existing sources; new account access still requires permission.';
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
