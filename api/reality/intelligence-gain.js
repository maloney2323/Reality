import { runIntelligenceGainExperiment, runSingleIntelligenceGainCondition } from '../../src/reality-intelligence-gain-v2.0.js';
export const maxDuration = 10;
export default async function handler(req,res){
 if(req.method!=='GET'&&req.method!=='POST') return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 try {
  const q=req.query||{};
  if(q.case && q.condition) return res.status(200).json(await runSingleIntelligenceGainCondition({caseId:String(q.case),condition:String(q.condition),apiKey:process.env.OPENAI_API_KEY}));
  return res.status(200).json(await runIntelligenceGainExperiment({apiKey:process.env.OPENAI_API_KEY}));
 } catch(e){ return res.status(500).json({status:'FAILED',error:e.message});}
}
