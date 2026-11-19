import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('the real homepage exposes a shift-start control and displays verified counts',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="startShiftNow"/);
  assert.match(html,/id="startShiftStatus"/);
  assert.match(html,/intent:'START_SHIFT_NOW'/);
  assert.match(html,/selected_count/);
  assert.match(html,/completed_count/);
  assert.match(html,/no previously authorized assignments/);
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
  assert.ok(scripts.length>0,'inline homepage JavaScript must exist');
  for(const script of scripts)new vm.Script(script,{filename:'Reality-homepage-inline.js'});
});
