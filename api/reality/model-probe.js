export default async function handler(req,res){
 if(req.method!=='GET') return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 try{
  if(!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY_MISSING');
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:process.env.REALITY_OPENAI_MODEL||'gpt-5.6-luna',max_output_tokens:40,input:[{role:'user',content:[{type:'input_text',text:'Return exactly the word PROOF.'}]}]})});
  const b=await r.json();
  return res.status(r.ok?200:r.status).json({status:r.ok?'PROVIDER_RESPONSE':'PROVIDER_ERROR',http:r.status,response_id:b.id||null,output_text:b.output_text||null,error:b.error||null});
 }catch(e){return res.status(500).json({status:'RUNTIME_ERROR',error:e.message});}
}