const test=require('node:test');const assert=require('node:assert/strict');
const { _test }=require('../api/live.js');
const { parseCount,parseLatestReport,parseNumberWords,floridaSeason,dateAgeDays }=require('../api/manatee.js');
test('celsius to fahrenheit',()=>assert.equal(_test.cToF(20),68));
test('delta computes cooling',()=>{const h=[{time:'2026-01-01T00:00:00Z',value:20},{time:'2026-01-02T00:00:00Z',value:16}];assert.equal(_test.delta(h,24),-4)});
test('hours below threshold',()=>{const h=[{time:'2026-01-01T00:00:00Z',value:19},{time:'2026-01-01T01:00:00Z',value:19},{time:'2026-01-01T02:00:00Z',value:21}];assert.equal(_test.hoursBelow(h,20,24),1)});
test('fallback manatee count parser stays local to label',()=>{assert.equal(parseCount('<h2>Daily Manatee Count</h2><div>614 manatees</div>'),614);assert.equal(parseCount('<div>614 visitors</div>'),null)});
test('Save the Manatee parser extracts dated roll call, word count and river temp',()=>{
  const html='<h2>Thursday, March 26, 2026</h2><p>The river was up to 71.2°F (21.8°C) and the manatee count dropped to two.</p><h2>Wednesday, March 25, 2026</h2><p>Today it was 70.7°F. Roll call was 13 manatees.</p>';
  assert.deepEqual(parseLatestReport(html),{observedDate:'2026-03-26',count:2,riverTemperatureF:71.2});
});
test('Save the Manatee parser handles numeric roll calls',()=>{
  const html='<h2>Wednesday, March 25, 2026</h2><p>The river temp was 70.7°F. Roll call was 13 manatees and no adoptees.</p>';
  assert.deepEqual(parseLatestReport(html),{observedDate:'2026-03-25',count:13,riverTemperatureF:70.7});
});
test('number word parser handles hundreds',()=>{assert.equal(parseNumberWords('three hundred twelve'),312);assert.equal(parseNumberWords('two'),2)});
test('manatee season uses Florida calendar date',()=>{
  assert.equal(_test.isManateeSeason(new Date('2026-11-15T00:30:00Z')),false);
  assert.equal(_test.isManateeSeason(new Date('2026-11-15T06:00:00Z')),true);
});
test('published count contract distinguishes off-season in Florida',()=>{
  assert.equal(floridaSeason(new Date('2026-09-28T16:00:00Z')).active,false);
  assert.equal(floridaSeason(new Date('2027-01-15T16:00:00Z')).start,'2026-11-15');
});
test('dated report age is deterministic from supplied date',()=>assert.equal(dateAgeDays('2026-03-26','2026-03-29'),3));
