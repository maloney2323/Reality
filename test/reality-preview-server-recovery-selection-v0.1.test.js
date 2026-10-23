import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map(m=>m[1]);

test('Preview module remains valid JavaScript after server-owned recovery selection',()=>{
 assert.equal(scripts.length,1);
 assert.doesNotThrow(()=>new Function(scripts[0].replace(/^import \{createPreviewSession\} from '[^']+';?\\s*/m,'')));
});
test('read-only inspection selects only owner-authenticated history turns, not browser-only markers',()=>{
 const script=scripts[0];
 assert.match(script,/const unresolved=Array\.isArray\(data\.unresolved_turns\)/);
 assert.match(script,/state\.serverUnresolved=unresolved\.map/);
 assert.match(script,/state\.reviewSelection\|\|/);
 assert.match(script,/serverUnresolved\.length===1/);
 assert.match(script,/SERVER_UNRESOLVED_TURN_INDEX_INVALID/);
 assert.match(script,/new Set\(unresolved\.map/);
 assert.match(script,/state\.serverUnresolved\.length\)\{/);
 assert.match(script,/Inspect recovery evidence/);
});
test('saved uncommitted user message is not misrepresented as a committed reply',()=>{
 assert.doesNotMatch(html,/Restored committed messages\./);
 assert.match(html,/interrupted or uncommitted turn\(s\) require review/);
 assert.match(html,/No unverified model reply has been published/);
});
