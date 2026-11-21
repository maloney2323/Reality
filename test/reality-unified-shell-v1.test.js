import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {authenticatedChatSession,loginChat}
 from '../src/reality-private-chat-auth-v0.1.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('reality-unified-shell-v1.js');
const css=read('reality-unified-shell-v1.css');
const html=read('index.html');
const routes=JSON.parse(read('vercel.json')).rewrites;
test('all customer sections use the same app rather than legacy employee chat-simple',()=>{
 for(const route of ['/employees','/work','/shifts','/chat','/value'])
  assert.ok(routes.some(r=>r.source===route&&r.destination==='/index.html'),route);
 for(const route of ['employees','work','shifts'])
  assert.ok(html.includes("realityOtherPage"),route);
 assert.ok(html.includes('reality-unified-shell-v1.css'));
 assert.ok(html.includes('reality-unified-shell-v1.js'));
 assert.doesNotMatch(js,/\/chat-simple|\.cloneNode\s*\(|\bfetch\s*\(|AUTHORIZE_EXACT|\.click\(/);
 assert.match(js,/realityHomeEmployees/);
 assert.match(js,/realityEmployeeShiftPlanner/);
 assert.match(js,/realityShiftHomeBrief/);
 assert.match(js,/realityHomeWorkday/);
 assert.match(css,/#workCenter/);
 assert.match(js,/Reality main navigation/);
 assert.doesNotThrow(()=>new vm.Script(js));
});

test('responsive shell masks old nav and keeps original workflows in their own destinations',()=>{
 assert.match(css,/\.rx-nav-mobile/);
 assert.match(css,/\.rx-nav-rail/);
 assert.match(css,/\.reality-chat-mobile-nav/);
 assert.match(css,/\.rc-mobile-nav/);
 assert.match(css,/\[data-reality-route="employees"\]/);
 assert.match(css,/\[data-reality-route="work"\]/);
 assert.match(css,/\[data-reality-route="shifts"\]/);
 assert.match(css,/\[data-reality-route="value"\]/);
 assert.match(css,/\[data-reality-route="chat"\]/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/not\(#realityHomeExistingEvidence\)/);
 assert.match(html,/reality-home-command-v1\.js/);
 assert.match(html,/reality-chat-workspace-v1\.js/);
});
test('Chat mobile viewport overrides the later unified desktop three-column grid',()=>{
 // The unified stylesheet loads AFTER Chat CSS. A lower-specificity @media
 // rule in the original Chat CSS cannot override its desktop columns.
 const mobile=css.lastIndexOf('@media(max-width:950px)');
 assert.ok(mobile>=0,'matching-specificity narrow-layout rule is required');
 const narrow=css.slice(mobile);
 assert.match(narrow,/body\.reality-unified-ui\[data-reality-route="chat"\] \.reality-chat-workspace\s*\{/);
 assert.match(narrow,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(narrow,/\.reality-chat-conversation\s*\{\s*grid-column:1/);
 assert.match(narrow,/#privateTranscript/);
 assert.match(narrow,/\[data-reality-chat-panel="history"\]/);
 assert.match(narrow,/\[data-reality-chat-panel="work"\]/);
 const prior=css.slice(0,mobile);
 assert.match(prior,/grid-template-columns:minmax\(160px,180px\) minmax\(0,1fr\) minmax\(235px,280px\)/);
 assert.match(narrow,/@media\(max-width:600px\)/);
 const chatCss = html.indexOf('/reality-chat-workspace-v1.css');
 const fullscreenCss = html.indexOf('/reality-chat-fullscreen-v2.css');
 const unifiedCss = html.indexOf('/reality-unified-shell-v1.css');
 assert.ok(chatCss >= 0 && fullscreenCss > chatCss && unifiedCss > fullscreenCss,
  'the last unified stylesheet must include the final narrow-layout override');
 assert.match(html,/<meta name="viewport" content="width=device-width,initial-scale=1">/);
});


test('intermittent provider 503 preserves verified session and retries only safe GET',()=>{
 assert.match(html,/const previouslyVerified=el\('privateReady'\)\.style\.display==='block'/);
 assert.match(html,/if\(!previouslyVerified\)\{/);
 assert.match(html,/if\(previouslySignedIn!==yes\)el\('privateReady'\)\.style\.display=/);
 assert.match(html,/if\(previouslyVerified\)\{/);
 assert.match(html,/scheduleSessionRetry\(\)/);
 assert.match(html,/sessionRetryDelayMs=sessionRetryDelayMs\?Math\.min\(60000,sessionRetryDelayMs\*2\):12000/);
 assert.match(html,/Math\.min\(60000,sessionRetryDelayMs\*2\)/);
 assert.match(html,/if\(document\.visibilityState!=='hidden'\)void init\(\)/);
 assert.match(html,/Only re-issue a GET session check\. NEVER replay a work\/approval write/);
 assert.match(html,/loadSaved\(\)\.then\(\(\)=>loadConversations\(\)\)/);
});

test('nonvisible pages do not trigger unrelated authenticated data readers',()=>{
 for(const [file,pattern] of [
  ['reality-economic-evidence-dashboard-v1.js',/\["\/","\/value"\]\.includes\(window\.location\.pathname\)/],
  ['reality-workday-brief-v1.js',/\["\/","\/work"\]\.includes\(window\.location\.pathname\)/],
  ['reality-backlog-value-scenario-v1.js',/\["\/value"\]\.includes\(window\.location\.pathname\)/],
  ['reality-automatic-backlog-value-v1.js',/\["\/value"\]\.includes\(window\.location\.pathname\)/],
  ['reality-category-economic-bridge-v1.js',/\["\/value","\/work"\]\.includes\(window\.location\.pathname\)/]
 ]){
  const source=read(file);
  assert.match(source,pattern,file);
  const position=source.indexOf('Do not fetch hidden pages');
  assert.ok(position>0 && position<source.indexOf('fetch('),file+' must gate before networking');
 }
 assert.match(html,/if\(route==='work'\)\{void wcInvestigateMarket/);
 assert.match(html,/if\(route==='chat'\)void realityChatRefreshEvents/);
});

class Node {
 constructor(tag='div'){
  this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;
  this.className='';this.id='';this.attributes={};this.style={display:'none'};
  this.textContent='';this.href='';this.open=false;
  this.classList={add:()=>{},toggle:()=>{}};
 }
 append(...nodes){for(const n of nodes){
  if(n.parentElement){const p=n.parentElement;p.children.splice(p.children.indexOf(n),1)}
  this.children.push(n);n.parentElement=this;
 }}
 setAttribute(k,v){this.attributes[k]=v}
 querySelector(selector){
  if(selector==='.rx-nav-label')return this.children.find(x=>x.className==='rx-nav-label');
  if(selector==='.top')return this.children.find(x=>x.className==='top')||null;
  if(selector==='#accountShortcut')return this.children.find(x=>x.id==='accountShortcut')||null;
  return null;
 }
 insertBefore(n,ref){
  if(n.parentElement){const p=n.parentElement;p.children.splice(p.children.indexOf(n),1)}
  const idx=this.children.indexOf(ref);if(idx<0)throw Error('REF_NOT_FOUND');
  this.children.splice(idx,0,n);n.parentElement=this;
 }
 insertAdjacentElement(location,node){
  if(location!=='afterend'||!this.parentElement)throw Error('BAD_INSERT');
  const p=this.parentElement,idx=p.children.indexOf(this);
  if(node.parentElement){const parent=node.parentElement;parent.children.splice(parent.children.indexOf(node),1)}
  p.children.splice(idx+1,0,node);node.parentElement=p;
 }
 closest(){return this.parentElement}
}
function build(route){
 const body=new Node('body'),main=new Node('main'),top=new Node('div');
 top.className='top';
 const shortcut=new Node('a');shortcut.id='accountShortcut';
 const nodes={accountShortcut:shortcut};
 top.append(shortcut);main.append(top);body.append(main);
 const oldHome=new Node('section');main.append(oldHome);
 for(const id of ['realityShiftHomeBrief','realityEmployeeShiftPlanner','realityHomeWorkday']){
  nodes[id]=new Node('section');nodes[id].id=id;oldHome.append(nodes[id]);
 }
 const work=new Node('section');work.id='workCenter';nodes.workCenter=work;main.append(work);
 const ready=new Node('div');ready.id='privateReady';nodes.privateReady=ready;
 const document={body,createElement:tag=>new Node(tag),
  getElementById:id=>nodes[id]||(()=>{function find(n){
   if(n.id===id)return n;
   for(const c of n.children){const result=find(c);if(result)return result}
   return null
  }return find(body)})(),
  querySelector:query=>query==='main'?main:null};
 vm.runInNewContext(js,{document,window:{location:{pathname:route}},
  MutationObserver:class{observe(){}}});
 return {body,main,nodes,find:id=>document.getElementById(id)};
}
test('Shifts reuses three original DOM nodes and has one shared navigation pair',()=>{
 const f=build('/shifts');
 assert.ok(f.find('realityUnifiedRail'));
 assert.ok(f.find('realityUnifiedMobileNav'));
 const view=f.find('realityUnifiedView');
 assert.ok(view);
 for(const id of ['realityShiftHomeBrief','realityEmployeeShiftPlanner','realityHomeWorkday']){
  assert.ok(f.nodes[id].parentElement,'original element retained '+id);
  assert.notEqual(f.nodes[id].parentElement,f.main.children[1]);
 }
 assert.equal(f.find('realityUnifiedRail').children.filter(x=>x.href==='/shifts').length,1);
});
test('Work uses the original Work Center instead of creating a second queue',()=>{
 const f=build('/work');
 assert.ok(f.find('realityUnifiedView'));
 assert.equal(f.main.children.filter(x=>x===f.nodes.workCenter).length,1);
 assert.equal(f.find('realityUnifiedRail').children.filter(x=>x.href==='/work').length,1);
});
test('full Past Present Future belongs to Home, never repeated on other pages',()=>{
 const home=build('/');
 assert.ok(home.find('realityTimeHorizon'),'Home keeps the original timeline host');
 for(const path of ['/employees','/work','/shifts','/chat','/value','/connections']){
  const page=build(path);
  assert.equal(page.find('realityTimeHorizon'),null,path+' must not mount a timeline');
 }
 const timeCss=read('reality-past-present-future-v1.css');
 assert.match(timeCss,/body\.reality-unified-ui:not\(\[data-reality-route="home"\]\)/);
 assert.match(timeCss,/:is\(#realityTimeHorizon,\.reality-matrix\)/);
 assert.match(timeCss,/display:none!important/);
 assert.match(js,/if\(route==='home'&&top&&main\)\{/);
});

test('the mobile session check is bounded but does not fake authenticated access',()=>{
 assert.match(html,/sessionRequestInFlight/);
 assert.match(html,/AbortSignal\.timeout\(16500\)/);
 assert.match(html,/el\('privateReady'\)\.style\.display='none'/);
 assert.match(html,/showSignedIn\(data\.authenticated===true\)/);
 assert.match(html,/privateRetrySession/);
});

const env={
 VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_PERSONAL_CHAT_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_testonly',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'safe-test-only-hmac-seal-at-least-sixteen'
};
function res(){
 const headers={};return {headers,setHeader:(k,v)=>{headers[k]=v}};
}
const req=(cookie,body)=>({headers:{host:'test.example',
 ...(cookie?{cookie}:{}),...(body?{origin:'https://test.example'}:{})},body});
test('provider network errors are retryable and never erase a sealed login cookie',async()=>{
 const logged=res();
 await loginChat(req(null,{email:'test@example.com',password:'test'}),logged,{
  env,fetchImpl:async url=>{
   if(url.includes('grant_type=password'))
    return new Response(JSON.stringify({access_token:'access-example',refresh_token:'refresh-example',expires_in:1}),{status:200});
   if(url.includes('/auth/v1/user'))
    return new Response(JSON.stringify({id:'95cccf78-1032-4b0d-95bd-244a60b3a31e'}),{status:200});
   throw Error('UNEXPECTED');
  }
 });
 const cookie=logged.headers['Set-Cookie'].split(';')[0],check=res();
 await assert.rejects(()=>authenticatedChatSession(req(cookie),check,{
  env,fetchImpl:async()=>{throw Error('TRANSIENT_NETWORK')}
 }),/CHAT_AUTH_PROVIDER_TEMPORARILY_UNAVAILABLE/);
 assert.equal(check.headers['Set-Cookie'],undefined);
});
