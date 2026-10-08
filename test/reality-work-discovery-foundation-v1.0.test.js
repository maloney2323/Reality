import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverWork,qualifyWorkCandidate,rankWorkForMoney,createRecurringWorkTemplate} from '../src/reality-work-discovery-foundation-v1.0.js';

test('discovers recurring work from repeated evidence without inventing recurrence',()=>{
 const observations=[
  {id:'1',work_key:'customer-follow-up',occurred_at:'2026-09-01T12:00:00Z',action:'follow up',evidence_ref:'e1',expected_revenue:100},
  {id:'2',work_key:'customer-follow-up',occurred_at:'2026-09-15T12:00:00Z',action:'follow up',evidence_ref:'e2',expected_revenue:100},
  {id:'3',work_key:'customer-follow-up',occurred_at:'2026-09-29T12:00:00Z',action:'follow up',evidence_ref:'e3',expected_revenue:100},
 ];
 const [work]=discoverWork({observations});
 assert.equal(work.recurring,true);
 assert.equal(work.cadence_days,14);
 assert.equal(work.expected_revenue,100);
 assert.equal(qualifyWorkCandidate(work).state,'QUALIFIED');
 assert.equal(createRecurringWorkTemplate(work).cadence_days,14);
});

test('money priority cannot create a revenue claim',()=>{
 const [work]=discoverWork({observations:[
  {id:'1',work_key:'ops',occurred_at:'2026-09-01T12:00:00Z',evidence_ref:'e1'},
  {id:'2',work_key:'ops',occurred_at:'2026-09-02T12:00:00Z',evidence_ref:'e2'}
 ]});
 const ranked=rankWorkForMoney(work);
 assert.equal(ranked.expected_revenue,null);
 assert.equal(ranked.money_priority_score,100/5);
});
