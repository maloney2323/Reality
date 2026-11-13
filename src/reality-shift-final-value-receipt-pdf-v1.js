// PDF economic accountability attached to an independent source-native
// original receipt. The original durable receipt is never rewritten.
// Financial amounts are absent until independently measured and verified.
import {createHash} from 'node:crypto';
import {SHIFT_VALUE_EVIDENCE_VERSION}
 from './reality-shift-final-value-evidence-v1.js';
const ascii=x=>String(x??'').replace(/[^\x20-\x7e]/g,'?').slice(0,550);
const esc=x=>ascii(x).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const fail=x=>{throw Error('REALITY_SHIFT_VALUE_PDF_'+x)};
export function renderRealityShiftValueReceiptPdf(receipt,{verifiedReport}={}){
 if(verifiedReport?.version!==SHIFT_VALUE_EVIDENCE_VERSION||
  verifiedReport.read_only!==true||
  verifiedReport.financial_roi_verified!==false||
  verifiedReport.verified_net_savings_usd!==null||
  verifiedReport.owner_scope_verified!==true||
  verifiedReport.original_receipts_unchanged!==true||
  verifiedReport.new_work_authorized!==false||
  verifiedReport.installation_authorized!==false||
  verifiedReport.production_changed!==false||
  !Array.isArray(verifiedReport.receipts)||
  !verifiedReport.receipts.includes(receipt)||
  receipt?.status!=='INDEPENDENTLY_SETTLED_SOURCE_NATIVE_ORIGINAL'||
  receipt.independent_verification!==true||
  receipt.verified_financial_roi!==false||
  receipt.verified_net_savings_usd!==null||
  receipt.original_receipt_unchanged!==true||
  !Array.isArray(receipt.data_missing)||receipt.data_missing.length!==4)
  fail('INDEPENDENT_SOURCE_NATIVE_RECEIPT_AND_VALUE_REQUIRED');
 const ink=[0.08,0.16,0.25],muted=[0.34,0.42,0.49],teal=[0.03,0.41,0.38],pale=[0.91,0.96,0.95];
 const cmds=[],color=a=>a.join(' ')+' rg';
 const txt=(x,y,line,size=9,shade=ink,bold=false)=>
  cmds.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+color(shade)+
   ' 1 0 0 1 '+x+' '+y+' Tm ('+esc(line)+') Tj ET');
 const rect=(x,y,w,h,c)=>cmds.push('q '+color(c)+' '+x+' '+y+' '+w+' '+h+' re f Q');
 const header=(name,y)=>{txt(43,y,name,10,ink,true);rect(43,y-8,525,1,teal);};
 rect(0,705,612,87,ink);
 txt(43,758,'REALITY',24,[1,1,1],true);
 txt(43,736,'VERIFIED JOB RECEIPT + ECONOMIC ACCOUNTABILITY',11,[0.82,0.95,0.93]);
 txt(43,688,'Independent original settlement - '+receipt.kind.replaceAll('_',' ').toLowerCase(),11,teal,true);
 txt(43,670,'This report does not modify the immutable original settlement receipt.',9,muted);
 header('ORIGINAL WORK & INDEPENDENT FINAL RECEIPT',640);
 txt(43,617,'Original work: '+receipt.original_work_id,9,ink,true);
 txt(43,601,'Shift: '+receipt.shift_id,8.3,ink);
 txt(43,585,'Source: '+receipt.source_ref,8.3,ink);
 txt(43,569,'Final settlement: '+receipt.final_receipt_ref,7.6,ink);
 txt(43,553,'Receipt proof SHA-256: '+receipt.final_receipt_sha256,7.6,ink);
 txt(43,537,'Settled: '+receipt.settled_at,8.4,ink);
 header('INDEPENDENT PROVIDER / INSTALL EVIDENCE',505);
 txt(43,484,'Provider: '+receipt.provider_proof_ref,8,ink);
 txt(43,467,'Installation: '+(receipt.kind==='NATIVE_CODE_REPAIR'?
   'Verified isolated commit '+receipt.installed_commit_sha:
   'Not applicable - verified PR code review'),8,ink);
 header('OBSERVED ECONOMIC EVIDENCE',434);
 const usage=receipt.model_output_tokens_recorded;
 txt(43,411,'Model output tokens recorded: '+(usage===null?
  'NOT RECORDED':usage.toLocaleString('en-US')+' (PARTIAL - native draft/revision only)'),9,ink);
 txt(43,393,'Separate source-labelled economic observations: '+
  receipt.economic_observations.length,9,ink);
 txt(43,375,'Comparable human baseline: NOT VERIFIED',9,muted);
 txt(43,357,'Actual human supervision: NOT MEASURED',9,muted);
 txt(43,339,'Billable OpenAI + infrastructure cost: NOT VERIFIED',9,muted);
 rect(43,254,525,68,pale);
 txt(55,301,'VERIFIED NET SAVINGS: NOT MEASURED',11,teal,true);
 txt(55,281,'FINANCIAL ROI: NOT VERIFIED',10,teal,true);
 txt(55,264,'No savings amount inferred from elapsed time or token counts.',8.5,muted);
 header('WHAT IS STILL NEEDED FOR VERIFIED ROI',226);
 txt(43,207,'Comparable human effort, measured review time and labor-cost evidence.',8.7,ink);
 txt(43,190,'Actual OpenAI/infrastructure charges and independent net-value proof.',8.7,ink);
 header('NASA / BLS EXTERNAL LABOR REFERENCE - NOT SAVINGS',172);
 if(receipt.kind==='NATIVE_CODE_REPAIR'){
  txt(43,151,'NASA study medians: 2h fault investigation; 3h fix implementation.',8.5,ink);
  txt(43,137,'Reference scenario: 2h + 3h = 5h (sum of separate medians).',8.5,ink);
  txt(43,123,'BLS May 2025 developer median wage: $65.38 per hour.',8.5,ink);
  txt(43,109,'5h x $65.38 = $326.90 illustrative labor cost; NOT saved.',8.5,teal,true);
 }else{
  txt(43,151,'NASA fault-repair medians: 2h investigation; 3h implementation.',8.5,ink);
  txt(43,137,'BLS May 2025 developer median hourly wage: $65.38.',8.5,ink);
  txt(43,123,'A PR-only review is not a comparable verified repair.',8.5,ink);
  txt(43,109,'No NASA labor-cost scenario assigned to this review.',8.5,teal,true);
 }
 txt(43,94,'NASA source: https://ntrs.nasa.gov/citations/20160008693',7.8,muted);
 txt(43,81,'BLS source: https://www.bls.gov/news.release/ocwage.t01.htm',7.8,muted);
 rect(43,65,525,1,pale);
 txt(43,51,'External benchmarks are scenarios, not measured work or cash savings.',8.2,muted);
 txt(43,36,'No new shift, capability installation or production effect.',8.2,muted);
 const stream=cmds.join('\n')+'\n';
 const objects=[];
 const add=o=>(objects.push(o),objects.length);
 const f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 const catalog=add(''),pages=add('');
 const content=add('<< /Length '+Buffer.byteLength(stream,'latin1')+
  ' >>\nstream\n'+stream+'endstream');
 const page=add('<< /Type /Page /Parent '+pages+' 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 '+
  f1+' 0 R /F2 '+f2+' 0 R >> >> /Contents '+content+' 0 R >>');
 objects[catalog-1]='<< /Type /Catalog /Pages '+pages+' 0 R >>';
 objects[pages-1]='<< /Type /Pages /Kids ['+page+' 0 R] /Count 1 >>';
 let pdf='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const offsets=[];
 for(let i=0;i<objects.length;i++){
  offsets.push(Buffer.byteLength(pdf,'latin1'));
  pdf+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';
 }
 const xref=Buffer.byteLength(pdf,'latin1');
 pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
 for(const off of offsets)pdf+=String(off).padStart(10,'0')+' 00000 n \n';
 const id=createHash('md5').update(receipt.original_work_id+'|'+
  receipt.final_receipt_sha256).digest('hex');
 pdf+='trailer\n<< /Size '+(objects.length+1)+' /Root '+
  catalog+' 0 R /ID [<'+id+'> <'+id+'>] >>\nstartxref\n'+
  xref+'\n%%EOF\n';
 const binary=Buffer.from(pdf,'latin1');
 if(binary.length<2000||binary.length>60000||
  binary.toString('latin1',0,8)!=='%PDF-1.4')
  fail('BAD_BINARY');
 return binary;
}
