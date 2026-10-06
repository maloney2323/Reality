import assert from 'node:assert/strict';
import {lifecycleAction} from '../src/reality-promotion-controller-v0.2.js';
assert.equal(lifecycleAction({capability:{status:'general'},observations:{safetyIncident:true}}).action,'ROLLBACK');
assert.equal(lifecycleAction({capability:{status:'general'},observations:{degraded:true}}).state,'degraded');
console.log('ROLLBACK_V0_2_PASS');
