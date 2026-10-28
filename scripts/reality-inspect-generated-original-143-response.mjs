import {writeFileSync,mkdirSync} from 'node:fs';
const ID='resp_025d6e517afe1959006ae282505a7087d0a67fe2de6aad4966';
const WORK='work:24cda9611404e9bcb47909976067605c';
const TARGET='experiment/reality-live-durable-adversarial-20261025';
const key=process.env.OPENAI_API_KEY;
if(!key)throw Error('REALITY_RESPONSE_PRIVATE_KEY_MISSING');
const res=await fetch('https://api.openai.com/v1/responses/'+ID,{
 headers:{authorization:'Bearer '+key},redirect:'error'
});
if(!res.ok)throw Error('REALITY_RESPONSE_RETRIEVAL_HTTP_'+res.status);
const body=await res.json();
const raw=typeof body.output_text==='string'&&body.output_text?body.output_text:
 (body.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
const parsed=JSON.parse(raw);
const allowed=[
 'src/reality-extensions/reality-original-full-loop-integration.mjs',
 'api/reality/personal-original-full-loop.js',
 'test/reality-extensions/reality-original-full-loop-integration.test.js'];
if(parsed.original_work_id!==WORK||parsed.target_branch!==TARGET||
 !Array.isArray(parsed.files)||parsed.files.length!==3||
 parsed.files.some(x=>!allowed.includes(x.path)||typeof x.content!=='string'))
 throw Error('REALITY_RESPONSE_UNEXPECTED_ORIGINAL_WORK_SCOPE');
mkdirSync('reality-recovered-model-candidate',{recursive:true});
for(const f of parsed.files){
 const name=f.path.split('/').at(-1);
 writeFileSync('reality-recovered-model-candidate/'+name,f.content);
}
writeFileSync('reality-recovered-model-candidate/receipt.json',JSON.stringify({
 model_response_id:ID,model:body.model,original_work_id:WORK,review_only:true,
 execution_authorized:false,installed:false,
 files:parsed.files.map(f=>({path:f.path,bytes:f.content.length})),
 route_contains_required_consent:parsed.files[1].content.includes('ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY')
},null,2));
console.log('REALITY_REJECTED_GENERATION_RECOVERED_FOR_READ_ONLY_AUDIT');
