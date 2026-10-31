// The general governed self-repair kernel uses a work-scoped owner authority.
// Historical issued authorization strings are compatibility-only, never minted
// by new generic work. Preserve existing immutable journals without rewriting.
export const GENERIC_REDESIGN_AUTHORIZATION_SCOPE =
  'ONE_ORIGINAL_WORK_REDESIGN_ATTEMPT';
const HISTORICAL_REDESIGN_SCOPE = 'ONE_ORIGINAL178_REDESIGN_ATTEMPT';
export function isVerifiedRedesignScope(value,{historicalReceipt=false}={}){
  return value===GENERIC_REDESIGN_AUTHORIZATION_SCOPE ||
    (historicalReceipt===true&&value===HISTORICAL_REDESIGN_SCOPE);
}
