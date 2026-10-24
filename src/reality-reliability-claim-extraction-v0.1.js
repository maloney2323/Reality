// Optional model-assisted claim extraction for continuous reliability.
// Not a source of truth and not an independent adjudicator. Every extracted
// claim must point to a verbatim span of the actual model output.
export const RELIABILITY_EXTRACTION_VERSION='reality-reliability-claim-extraction-v0.1';
const schema={
  type:'object',additionalProperties:false,required:['claims','actions','operational'],
  properties:{
    claims:{type:'array',items:{type:'object',additionalProperties:false,
      required:['key','value','quote'],
      properties:{key:{type:'string'},value:{type:'string'},quote:{type:'string'}}}},
    actions:{type:'array',items:{type:'object',additionalProperties:false,
      required:['action_type','target','status','quote'],
      properties:{action_type:{type:'string'},target:{type:'string'},
        status:{type:'string',enum:['PROPOSED','EXECUTING','COMPLETED']},
        quote:{type:'string'}}}},
    operational:{type:'boolean'},
  },
};
export async function extractReliabilityClaims({
  modelOutput,worldId,snapshot,apiKey,model,fetchImpl=fetch,
}={}){
  if(!apiKey||!worldId||typeof modelOutput!=='string'||!snapshot?.world_id||
     snapshot.world_id!==worldId)throw Error('RELIABILITY_EXTRACTION_PREREQUISITES');
  if(!snapshot.facts?.length && !snapshot.obligations?.length)
    throw Error('RELIABILITY_EXTRACTOR_NEEDS_EVIDENCE');
  const factKeys=snapshot.facts.map(f=>({key:f.key,source_value:f.value}));
  const request=await fetchImpl('https://api.openai.com/v1/responses',{
    method:'POST',headers:{authorization:'Bearer '+apiKey,'content-type':'application/json'},
    body:JSON.stringify({
      model,store:false,max_output_tokens:1000,
      text:{format:{type:'json_schema',name:'reliability_assertions',strict:true,schema}},
      input:[
        {role:'system',content:[{type:'input_text',text:
          'Extract explicitly asserted factual claims and reports of external actions from the MODEL OUTPUT only. You are an untrusted extractor, not a source of fact or authority. Do not infer missing claims. Only extract an item when its quote is a verbatim substring of the model output. Use an existing fact key if the claim concerns that fact; for other claims use a descriptive key. Values must be strings; use the exact stated value. Mark operational true only if the output proposes or claims consequential external work. No claims from other context. Output only the JSON schema.'}]},
        {role:'user',content:[{type:'input_text',text:JSON.stringify({
          model_output:modelOutput.slice(0,12000),
          known_fact_keys:factKeys,known_obligations:snapshot.obligations.map(o=>({id:o.id}))
        })}]},
      ],
    })
  });
  const body=await request.json();
  if(!request.ok)throw Error('RELIABILITY_EXTRACTION_PROVIDER_ERROR_'+request.status);
  const output=typeof body.output_text==='string' ? body.output_text : (body.output||[])
    .flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text||'').join('');
  let parsed;
  try{parsed=JSON.parse(output)}catch{throw Error('RELIABILITY_EXTRACTION_MALFORMED_OUTPUT')}
  if(!Array.isArray(parsed?.claims)||!Array.isArray(parsed?.actions)||
     typeof parsed?.operational!=='boolean')throw Error('RELIABILITY_EXTRACTION_INVALID_SHAPE');
  if(parsed.claims.length>24||parsed.actions.length>12)throw Error('RELIABILITY_EXTRACTION_OVERSIZED');
  const quoteOk=x=>typeof x.quote==='string'&&x.quote.length>0&&modelOutput.includes(x.quote);
  if(![...parsed.claims,...parsed.actions].every(quoteOk))throw Error('RELIABILITY_EXTRACTION_QUOTE_NOT_IN_MODEL_OUTPUT');
  const facts=new Map(snapshot.facts.map(f=>[f.key,f]));
  const candidate={
    world_id:worldId,scope:parsed.operational||parsed.actions.length?'OPERATIONAL':'CONVERSATIONAL',
    // This field is not inferred from ordinary prose; obligations are checked
    // by the action authority layer, not by assuming silence means forgetting.
    carried_obligation_ids:parsed.actions.length||parsed.operational
      ?[]:snapshot.obligations.filter(o=>o.active).map(o=>o.id),
    claims:parsed.claims.map(c=>{
      const f=facts.get(c.key);
      return {key:String(c.key).slice(0,120),value:c.value,
        evidence_refs:f?[f.evidence_ref]:[],original_quote:c.quote};
    }),
    actions:parsed.actions.map((a,i)=>({
      action_id:'model-claim:'+String(i),action_type:a.action_type,
      target:a.target,status:a.status,authority_ref:null,
      verification_ref:null,original_quote:a.quote,
    })),
  };
  return {version:RELIABILITY_EXTRACTION_VERSION,candidate,
    extraction_status:'UNTRUSTED_MODEL_EXTRACTION_QUOTE_ANCHORED',
    completeness_independently_verified:false,provider_response_id:body.id||null};
}
