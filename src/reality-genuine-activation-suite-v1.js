// Independent post-install activation: select the immutable acceptance suite
// from the installed, source-linked capability identity, never from model text
// or the original issue number. This does not authorize install or settlement.
const FROZEN_DIR='test/reality-frozen-regressions/';
const SPINE='test/reality-governed-self-improvement-spine-v1.0.test.js';
const SETTLEMENT='src/reality-extensions/reality-continuity-settlement-reconciler.mjs';
const SETTLEMENT_FROZEN=FROZEN_DIR+'reality-continuity-settlement-reconciler-v1.test.js';
const RELATIONSHIP='test/reality-201-provider-backed-relationship-holdout-v1.test.js';
const BASELINE=FROZEN_DIR+'first-reality-ci-evidence-gap.test.js';
const GENERAL_RECEIPT='src/reality-extensions/reality-general-execution-receipt.mjs';
const GENERAL_FROZEN=FROZEN_DIR+'reality-general-execution-receipt-v1.test.js';
const EXTRA_GOVERNANCE=Object.freeze([
 'test/reality-genuine-original-resume-contract-v1.test.js',
 'test/reality-genuine-activation-suite-v1.test.js',
]);
const SAFE_TEST=/^test\/reality-extensions\/[A-Za-z0-9._/-]+\.test\.(?:js|mjs)$/;
export function deriveGenuineActivationSuite(evidence){
 if(!evidence||!Array.isArray(evidence.file_sha256)||
    evidence.file_sha256.length<2||evidence.file_sha256.length>12)
  throw Error('ACTIVATION_EXACT_INSTALLED_FILE_MANIFEST_REQUIRED');
 const paths=evidence.file_sha256.map(f=>f?.path);
 if(paths.some(p=>typeof p!=='string')||new Set(paths).size!==paths.length||
    paths.some(p=>p.includes('..')))
  throw Error('ACTIVATION_UNIQUE_SAFE_SOURCE_MANIFEST_REQUIRED');
 const sources=paths.filter(p=>p.startsWith('src/'));
 const tests=paths.filter(p=>p.startsWith('test/'));
 if(sources.length!==1||tests.length<1||
    tests.some(p=>!SAFE_TEST.test(p)))
  throw Error('ACTIVATION_SOURCE_WITH_COMPANION_TEST_REQUIRED');
 const reconciler=sources[0]===SETTLEMENT;
 const generalReceipt=sources[0]===GENERAL_RECEIPT;
 if(!reconciler && !/^src\/reality-extensions\/[A-Za-z0-9._/-]+\.mjs$/.test(sources[0]))
  throw Error('ACTIVATION_UNKNOWN_CAPABILITY_SOURCE');
 const suites=reconciler?
  [SETTLEMENT_FROZEN,SPINE,RELATIONSHIP,...tests]:
  generalReceipt?
   [GENERAL_FROZEN,SPINE,...EXTRA_GOVERNANCE,...tests]:
   [BASELINE,SPINE,...tests];
 return Object.freeze({
  capability:reconciler?'REALITY_CONTINUITY_SETTLEMENT_RECONCILER':
   generalReceipt?'REALITY_GENERAL_EXECUTION_RECEIPT':'GENERIC_GENUINE_CAPABILITY',
  frozen_test_path:reconciler?SETTLEMENT_FROZEN:
   generalReceipt?GENERAL_FROZEN:BASELINE,
  holdout_path:reconciler?RELATIONSHIP:null,
  tests:Object.freeze(suites),
  minimum_verified_tests:44
 });
}
