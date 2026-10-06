import assert from 'node:assert/strict';
import {createEvolutionConstitution} from '../src/reality-evolution-constitution-v0.2.js';
import {authorizePromotion} from '../src/reality-promotion-controller-v0.2.js';
const constitution=createEvolutionConstitution();
assert.equal(authorizePromotion({evaluation:{passed:true},independentVerification:{verified:false},constitution,promotion:{approved:true}}).approved,false);
assert.throws(()=>import('../src/reality-evolution-constitution-v0.2.js'),{message:/a^/});
console.log('PROMOTION_SAFETY_V0_2_PASS');
