import { runIntelligenceGainExperiment } from '../../src/reality-intelligence-gain-v2.0.js';
export default async function handler(req,res){
 if(req.method!=='GET'&&req.method!=='POST') return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 try{return res.status(200).json(await runIntelligenceGainExperiment({apiKey:process.env.OPENAI_API_KEY}));}
 catch(e){return res.status(500).json({status:'FAILED',error:e.message});}
}
