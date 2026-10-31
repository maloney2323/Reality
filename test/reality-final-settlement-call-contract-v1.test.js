import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('final independent settlement verifier binds the same original resumption as execution',()=>{
 const service=readFileSync(new URL('../src/reality-live-approved-install-to-settlement-v1.0.js',import.meta.url),'utf8');
 const settlement=readFileSync(new URL('../src/reality-general-original-work-settlement-v1.0.js',import.meta.url),'utf8');
 assert.match(settlement,/async function verify\(\{registration,execution\}=\{\}\)/);
 assert.match(service,/await settle\.verify\(\{registration,execution:resumption\}\)/);
 assert.doesNotMatch(service,/await settle\.verify\(\{registration,resumption\}\)/);
 assert.match(service,/observed\.verified===true/);
});

// Governed wake readiness probe: a benign CI completion must not recreate approval.
