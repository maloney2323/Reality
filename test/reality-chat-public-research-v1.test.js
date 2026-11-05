import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildModelInput,invokeRealityModel} from '../src/reality-model-gateway-v0.1.js';
import {runRealityCognitiveRuntime} from '../src/reality-cognitive-runtime-v1.0.js';
import {isPublicResearchRequest,publishedReferencesForChat} from '../src/reality-chat-research-bridge-v1.js';

const signal={
 cleaner_version:'0.1.0',
 packet:{packet_id:'research:test',raw_content_digest:'sha256:test'},
 fragments:[{fragment_id:'research:fragment',cleaned_text:'Search the system for NASA labor statistics'}],
 transformation_receipt:{receipt_id:'research:receipt'},
 lineage:{packet_id:'research:test'}
};
const nasa='https://ntrs.nasa.gov/api/citations/20160008693/downloads/20160008693.pdf';
const observedSearch=()=>({
 id:'rsp-research',status:'completed',
 output:[
  {type:'web_search_call',status:'completed',id:'call_web_1'},
  {type:'message',content:[{
   type:'output_text',
   text:'The published study reports a median of 2 hours investigating faults and 3 hours implementing repairs. These are separate medians, not Reality savings.',
   annotations:[{type:'url_citation',title:'NASA technical report',url:nasa,start_index:0,end_index:26}]
  }]}
 ]
});
const fakeProvider=(captured,body=observedSearch())=>async(url,options)=>{
 captured.push({url,payload:JSON.parse(options.body)});
 return {ok:true,json:async()=>body};
};
test('Chat research bridge recognizes public lookup, not installation or account commands',()=>{
 assert.equal(isPublicResearchRequest('Search the system for NASA labor statistics'),true);
 assert.equal(isPublicResearchRequest('Look up recent public labor data'),true);
 assert.equal(isPublicResearchRequest('Please install and approve an upgrade'),false);
 assert.equal(isPublicResearchRequest('Find my private auth tokens'),false);
 assert.equal(isPublicResearchRequest('Hello there'),false);
});
test('NASA source on existing Reality homepage becomes available to Chat without invented ROI',()=>{
 const refs=publishedReferencesForChat('Find NASA labor statistics');
 assert.equal(refs.length,2);
 assert.equal(refs[0].source_url,nasa);
 assert.equal(refs[0].investigation_effort_median_hours,2);
 assert.equal(refs[0].fix_implementation_effort_median_hours,3);
 assert.match(refs[0].combined_reference_qualification,/not a measured median/);
 assert.match(refs[0].limitations,/do not establish time saved by Reality/);
 assert.deepEqual(publishedReferencesForChat('Schedule a meeting'),[]);
});
test('signed-in public research calls read-only OpenAI hosted web_search exactly once and surfaces source URLs',async()=>{
 const calls=[];
 const result=await invokeRealityModel({
  governedSignal:signal,
  apiKey:'test-key',model:'gpt-4.1-mini',fetchImpl:fakeProvider(calls),
  publicResearchEnabled:true,
  systemContext:{published_research_references:publishedReferencesForChat('NASA labor statistics')}
 });
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://api.openai.com/v1/responses');
 assert.deepEqual(calls[0].payload.tools,[{type:'web_search',search_context_size:'low'}]);
 assert.equal(calls[0].payload.tool_choice,'required');
 assert.match(calls[0].payload.input[0].content[0].text,/READ-ONLY RESEARCH CONTRACT/);
 assert.match(calls[0].payload.input[1].content[0].text,/20160008693/);
 assert.match(result.answer,/Public sources consulted:/);
 assert.match(result.answer,/ntrs\.nasa\.gov/);
 assert.equal(result.authority_granted,false);
 assert.equal(result.execution_authorized,false);
});
test('normal chat retains original unmodified provider tool access: none',async()=>{
 const calls=[];
 const result=await invokeRealityModel({
  governedSignal:signal,apiKey:'test-key',
  fetchImpl:fakeProvider(calls,{id:'normal',status:'completed',output_text:'Hello'}),publicResearchEnabled:false
 });
 assert.equal('tools' in calls[0].payload,false);
 assert.equal('tool_choice' in calls[0].payload,false);
 assert.equal(result.answer,'Hello');
});
test('research that did not execute search cannot be misrepresented as researched evidence',async()=>{
 const calls=[];
 await assert.rejects(()=>invokeRealityModel({
  governedSignal:signal,apiKey:'test-key',publicResearchEnabled:true,
  fetchImpl:fakeProvider(calls,{id:'unsearched',status:'completed',output_text:'NASA data'}),
 }),/PUBLIC_WEB_RESEARCH_NOT_VERIFIED/);
});
test('public research stays on FAST read-only path, not 3-lane model fanout',async()=>{
 const calls=[];
 const result=await runRealityCognitiveRuntime({
  message:'Research NASA labor statistics and compare the source',
  governedSignal:signal,apiKey:'test-key',model:'gpt-4.1-mini',
  fetchImpl:fakeProvider(calls),publicResearchEnabled:true
 });
 assert.equal(calls.length,1);
 assert.equal(result.mode,'FAST');
 assert.match(result.answer,/NASA technical report/);
 assert.equal(result.authority_granted,false);
 assert.equal(result.execution_authorized,false);
});
test('public research permission originates in server-side Chat adapter, not browser payload',()=>{
 const handler=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const source=readFileSync(new URL('../src/reality-live-intelligence-orchestration-v0.1.js',import.meta.url),'utf8');
 assert.match(handler,/publicResearchEnabled:isPublicResearchRequest\(text\)/);
 assert.match(handler,/published_research_references:publishedReferencesForChat\(text\)/);
 assert.match(source,/publicResearchEnabled: publicResearchEnabled === true/);
 assert.doesNotMatch(handler,/req\.body\?\.publicResearchEnabled/);
});
