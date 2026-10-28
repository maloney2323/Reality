import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const run=readFileSync('scripts/run-reality-generate-original-143-full-loop.mjs','utf8');
const ci=readFileSync('.github/workflows/reality-original-143-model-full-loop.yml','utf8');
test('Reality generator locks exact original work and isolated target',()=>{
 assert.match(run,/work:24cda9611404e9bcb47909976067605c/);
 assert.match(run,/experiment\/reality-live-durable-adversarial-20261025/);
});
test('Reality generator uses Responses API and includes real source context',()=>{
 assert.match(run,/api.openai.com\/v1\/responses/);
 assert.match(run,/reality-original-upgrade-readback-v0.1/);
 assert.match(run,/reality-universe-postgres-persistence-v0.1/);
});
test('Generation cannot report installation as performed',()=>{
 assert.match(run,/installation_authorized:false,registry_changed:false/);
 assert.match(run,/original_job_settled:false,production_changed:false/);
});
test('All generated work is verified in a separate secrets-free no-network job',()=>{
 assert.match(ci,/needs: reality-model-generation/);
 assert.match(ci,/--network none --read-only --cap-drop ALL/);
 assert.match(ci,/node --test test\/reality-extensions\/reality-original-full-loop-integration.test.js/);
});
test('Only post-verification staging has repository write permissions',()=>{
 assert.match(ci,/stage-reality-generated-source:[\s\S]*?needs: reality-independent-sandbox/);
 assert.match(ci,/permissions:[\s\S]*?contents: read/);
 assert.match(ci,/contents: write/);
 assert.match(ci,/reality\/model-generated\/original-143-full-loop-20261028/);
});
test('Generated code is never evaluated in the credential-bearing model job',()=>{
 const generation=ci.split('reality-model-generation:')[1].split('reality-independent-sandbox:')[0];
 assert.doesNotMatch(generation,/node --test|git push|docker run|git commit/);
});
