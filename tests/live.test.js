const test=require('node:test');const assert=require('node:assert/strict');
const { _test }=require('../api/live.js');
const { parseCount }=require('../api/manatee.js');
test('celsius to fahrenheit',()=>assert.equal(_test.cToF(20),68));
test('delta computes cooling',()=>{const h=[{time:'2026-01-01T00:00:00Z',value:20},{time:'2026-01-02T00:00:00Z',value:16}];assert.equal(_test.delta(h,24),-4)});
test('hours below threshold',()=>{const h=[{time:'2026-01-01T00:00:00Z',value:19},{time:'2026-01-01T01:00:00Z',value:19},{time:'2026-01-01T02:00:00Z',value:21}];assert.equal(_test.hoursBelow(h,20,24),1)});
test('manatee count parser stays local to label',()=>{assert.equal(parseCount('<h2>Daily Manatee Count</h2><div>614 manatees</div>'),614);assert.equal(parseCount('<div>614 visitors</div>'),null)});

test('manatee season uses Florida calendar date',()=>{
  assert.equal(_test.isManateeSeason(new Date('2026-11-15T00:30:00Z')),false);
  assert.equal(_test.isManateeSeason(new Date('2026-11-15T06:00:00Z')),true);
});
