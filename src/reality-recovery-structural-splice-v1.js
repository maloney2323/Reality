// Generic, parse-only source-span qualification for the EXISTING signed
// recovery compiler. Neither untrusted model code nor an expanded candidate
// is ever imported, evaluated, or executed. All source bytes are pinned and
// both the initial and corrected complete JS modules must be parse-checked.
import {createHash} from 'node:crypto';
import {parseOnlyModule,compareFrozenCandidateSyntax} from './reality-signed-chat-recovery-syntax-verifier-v1.js';

const hash=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
const lines=x=>x.match(/[^\n]*\n|[^\n]+$/g)||[];
const indent=x=>(x.match(/^[ \t]*/)||[''])[0].replace(/\t/g,'    ').length;
const unrelated=/^(?:export|import|const|let|var|async|function|class|return|throw|if|else|for|while|switch|try|catch|finally|do|await)\b|^[A-Za-z_$][\w$]*\s*=(?!=)/;

/**
 * The model selects a VISIBLE contiguous frozen line span. If replacing it
 * leaves a syntactically incomplete expression, Reality can independently
 * extend only its original FIND to the first parse-valid structural frontier.
 * The model's replacement is byte-identical. We stop before the next
 * same-indent independent statement and reject uncertain or hidden ranges.
 * Syntax-only qualification is NOT functional acceptance.
 */
export function reproduceFrozenStructuralSpanFailure(original,find,replace,{
 parse=parseOnlyModule,visibleRanges=null,maxAdditionalLines=80
}={}){
 if(typeof original!=='string'||typeof find!=='string'||typeof replace!=='string'||
  !find.endsWith('\n')||!replace.endsWith('\n')||
  !Number.isSafeInteger(maxAdditionalLines)||maxAdditionalLines<1||maxAdditionalLines>80||
  (visibleRanges!==null&&(!Array.isArray(visibleRanges)||!visibleRanges.length)))
  return null;
 const initial=compareFrozenCandidateSyntax(original,find,replace,parse);
 if(initial?.candidate!=='INVALID_SYNTAX')return null;
 const at=original.indexOf(find);
 if(at<0||original.indexOf(find,at+1)>=0)return null;
 const preceding=original.slice(0,at);
 if(preceding.length&&!preceding.endsWith('\n'))return null;
 const startLine=lines(preceding).length+1;
 const findLines=lines(find);
 const endLine=startLine+findLines.length-1;
 const minimumIndent=Math.min(...findLines.filter(x=>x.trim()&&!/^\s*\/(?:\/|\*)/.test(x)).map(indent));
 if(!Number.isFinite(minimumIndent))return null;
 const remainder=lines(original.slice(at+find.length));
 let extra='',lastCandidate=null;
 for(let n=1;n<=Math.min(maxAdditionalLines,remainder.length);n++){
  const sourceLine=remainder[n-1];
  const trimmed=sourceLine.trim();
  const leading=indent(sourceLine);
  // The next source-level statement is not part of this expression.
  // Never delete it merely to force a successful module parse.
  if(trimmed&&!trimmed.startsWith('//')&&!trimmed.startsWith('/*')&&
    leading<=minimumIndent&&unrelated.test(trimmed))break;
  extra+=sourceLine;
  const correctedEnd=endLine+n;
  if(visibleRanges!==null&&
   !visibleRanges.some(([a,b])=>Number.isSafeInteger(a)&&Number.isSafeInteger(b)&&
     startLine>=a&&correctedEnd<=b))break;
  if(Buffer.byteLength(extra,'utf8')>16000)break;
  // Only accept completed structural boundary lines, not an arbitrary
  // prefix that happens to parse after erasing independent source code.
  if(!/[;}]\s*(?:\/\/[^\n]*)?\n?$/.test(sourceLine))continue;
  const expanded=find+extra;
  if(original.indexOf(expanded,at+1)!==-1)continue;
  const proposed=original.slice(0,at)+replace+original.slice(at+expanded.length);
  if(proposed===original||proposed.includes('\0')||Buffer.byteLength(proposed,'utf8')>280000)continue;
  const verdict=parse(proposed);
  if(verdict==='PARSE_PROVIDER_UNAVAILABLE')return null;
  if(verdict==='VALID_SYNTAX'){
   lastCandidate=Object.freeze({
    schema:'reality-exact-structural-span-reproduction-v1',
    classification:'INCOMPLETE_FROZEN_SYNTAX_SPAN',
    original_candidate_sha256:initial.proposed_sha256,
    corrected_candidate_sha256:hash(proposed),
    baseline_sha256:initial.baseline_sha256,
    expanded_find_sha256:hash(expanded),
    unchanged_replacement_sha256:hash(replace),
    original_start_line:startLine,original_end_line:endLine,
    corrected_end_line:correctedEnd,additional_source_lines:n,
    parse_only:true,candidate_executed:false,functional_acceptance_verified:false,
    corrected_find:expanded,unchanged_replace:replace
   });
   break; // minimal admissible parse-valid frontier
  }
 }
 return lastCandidate;
}
