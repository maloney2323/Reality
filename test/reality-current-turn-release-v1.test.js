import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 currentAuthenticatedQuestion,isNASARepairResearch,nasaResearchAnswerOnTopic,
 releaseCurrentTurnAnswer
} from '../src/reality-current-turn-release-v1.js';
import {invokeRealityModel} from '../src/reality-model-gateway-v0.1.js';

const question='Find the NASA-hosted research on human software defect investigation and repair effort. Give me published statistics and original links.';
const nasa='https://ntrs.nasa.gov/api/citations/20160008693/downloads/20160008693.pdf';
const signal=(q=question)=>({
 cleaner_version:'0.1.0',
 packet:{packet_id:'scope:packet',raw_content_digest:'sha256:scope'},
 fragments:[{fragment_id:'scope:fragment',cleaned_text:q}],
 transformation_receipt:{receipt_id:'scope:transformation'},
 lineage:{packet_id:'scope:packet'}
});
const providerOutput=(answer,links=[])=>({
 id:'rsp',status:'completed',
 output:[
  {type:'web_search_call',status:'completed',id:'search'},
  {type:'message',content:[{type:'output_text',text:answer,
   annotations:links.map(url=>({type:'url_citation',url,title:'Source',start_index:0,end_index:6}))
  }]}
 ]
});
const invoke=(q,provider,ctx={},capture=[])=>invokeRealityModel({
 governedSignal:signal(q),model:'gpt-4.1-mini',apiKey:'test-key',
 publicResearchEnabled:true,
 systemContext:ctx,
 fetchImpl:async(url,options)=>{capture.push(JSON.parse(options.body));
  return {ok:true,json:async()=>provider};}
});

test('current question comes only from governed current signal, not unrelated conversation history',()=>{
 assert.equal(currentAuthenticatedQuestion(signal()),question);
 assert.equal(isNASARepairResearch(question),true);
 assert.equal(isNASARepairResearch('What is the Federal Reserve interest rate?'),false);
});
test('real on-topic NASA software repair answer with NASA citation remains unchanged',()=>{
 const answer='NASA-hosted Hamill and Goseva-Popstojanova study reports separate medians for software fault investigation and repair efforts.';
 assert.equal(nasaResearchAnswerOnTopic({answer,urls:[{url:nasa}]}),true);
 const r=releaseCurrentTurnAnswer({
  question,answer,publicResearchEnabled:true,sourceUrls:[{url:nasa}]
 });
 assert.equal(r.disposition,'ORIGINAL_ANSWER_WITHIN_BOUNDED_CHECK');
 assert.equal(r.answer,answer);
});
test('the actual wrong inflation web-search topic is rejected before Reality publishes it',async()=>{
 const answer='October 2026 inflation stands at 3.7%. Federal Reserve interest rates and CPI data are affecting markets.';
 const captures=[];
 const r=await invoke(question,providerOutput(answer,[
  'https://sigmanomics.com/us/inflation-rate-yoy',
  'https://www.axios.com/2026/10/14/cpi-september-inflation-trump'
 ]),{
  published_research_references:[{source_url:nasa}]
 },captures);
 assert.equal(captures.length,1);
 assert.equal(captures[0].input.at(-1).role,'user');
 assert.match(captures[0].input.at(-1).content[0].text,/CURRENT AUTHENTICATED PUBLIC RESEARCH REQUEST/);
 assert.match(captures[0].input.at(-1).content[0].text,/NASA-hosted research/);
 assert.equal(r.current_turn_release_disposition,
  'OFF_TOPIC_WEB_RESEARCH_REPLACED_WITH_KNOWN_PUBLISHED_REFERENCE');
 assert.match(r.answer,/Hamill and Goseva-Popstojanova/);
 assert.match(r.answer,/2 hours investigating/);
 assert.match(r.answer,/3 hours implementing/);
 assert.match(r.answer,/https:\/\/ntrs\.nasa\.gov\//);
 assert.doesNotMatch(r.answer,/sigmanomics|axios\.com|Federal Reserve|3\.7%/);
 assert.equal(r.execution_authorized,false);
});
test('unrelated public research is not replaced by NASA fallback',()=>{
 const q='Research published NASA rocket propulsion systems';
 const r=releaseCurrentTurnAnswer({question:q,answer:'Propulsion research answer',
  publicResearchEnabled:true});
 assert.equal(r.answer,'Propulsion research answer');
});
test('ordinary Chat cannot claim it started the authorized investigation without dispatch evidence',async()=>{
 const q='Yes please start that investigation now';
 const captures=[];
 const answer='Starting the investigation now. I am examining the existing system and will report results.';
 const r=await invokeRealityModel({
  governedSignal:signal(q),apiKey:'test-key',model:'gpt-4.1-mini',
  systemContext:{chat_work_execution_bridge:{plain_chat_can_dispatch_workers:false}},
  fetchImpl:async(url,opts)=>{captures.push(JSON.parse(opts.body));
    return {ok:true,json:async()=>({id:'mock',status:'completed',output_text:answer})};
  }
 });
 assert.equal(captures.length,1);
 assert.equal('tools' in captures[0],false);
 assert.equal(r.current_turn_release_disposition,'UNVERIFIED_WORK_START_CLAIM_BLOCKED');
 assert.match(r.answer,/has not admitted an original job or dispatched a worker/);
 assert.match(r.answer,/original work ID/);
 assert.doesNotMatch(r.answer,/I am examining/);
 assert.equal(r.execution_authorized,false);
});
test('past confirmation is not an instruction to send another identical prompt',()=>{
 const q='I confirm that investigation approach is good';
 const r=releaseCurrentTurnAnswer({
   question:q,answer:'The approach is confirmed. I can now inspect available evidence.',
   chatWorkDispatches:false
 });
 assert.equal(r.disposition,'ORIGINAL_ANSWER_WITHIN_BOUNDED_CHECK');
 assert.doesNotMatch(r.answer,/please confirm/i);
});
test('endpoint advertises cognition-only bridge and retains exact action endpoints separately',()=>{
 const chat=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const work=readFileSync(new URL('../api/reality/personal-governed-build.js',import.meta.url),'utf8');
 assert.match(chat,/plain_chat_can_dispatch_workers:false/);
 assert.match(work,/QUEUE_SAFE_AUTONOMOUS_DISCOVERY/);
 assert.doesNotMatch(chat,/await queueOwnerGovernedBuild/);
 assert.doesNotMatch(chat,/await queueVerifiedOriginalRepair/);
});
