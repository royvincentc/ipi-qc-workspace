import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApplicabilityMatches, historicalCriteria } from '../server/reports.js';
import * as reports from '../server/reports.js';

test('initial imported SFG remarks pin the QA format before a clean draft can be generated',async()=>{
 const initialize=(reports as any).initializeDraftReport;assert.equal(typeof initialize,'function');
 const standard={id:'sfg',name:'SFG',category:'SFG',revision:'standard-1',verified:true,manifest:{tokens:[]}},qa={...standard,id:'sfgqa',name:'SFGQA',revision:'qa-1'};
 const draft={id:'fixture-draft',sample:{category:'SFG',name:'Fixture Product',fields:{}},specification:{tests:[{test:'SPC',label:'SPC',type:'numeric',unit:'cfu/mL',criterion:'Nmt 100 cfu/mL'}]},results:[{test:'SPC',state:'entered',value:'100 cfu/mL',sourceValue:'100 cfu/mL',sourceHeader:'SPC',qualifier:'',unit:'cfu/mL',reason:'',remarks:''}],templateId:standard.id,templateRevision:standard.revision,templateSnapshot:standard,fields:{analysisDate:'10/09/2026'}};
 const failed=await initialize(draft,[standard,qa]);assert.equal(failed.results[0].remarks,'Failed');assert.equal(failed.templateId,qa.id);assert.equal(failed.templateRevision,qa.revision);assert.equal(failed.templateSnapshot.name,'SFGQA');assert.equal(failed.results[0].sourceValue,'100 cfu/mL');assert.equal(failed.fields.overallRemarks,'Failed in SPC');assert.equal(draft.results[0].remarks,'');
 const passed=await initialize({...draft,results:[{...draft.results[0],value:'99 cfu/mL',sourceValue:'99 cfu/mL'}]},[standard,qa]);assert.equal(passed.templateId,standard.id);assert.equal(passed.results[0].remarks,'Passed');
});

const rows = [
  { sheet: 'RM/FP/AS', row: 33, product: 'Omega Pain Killer Liniment- 15 mL, 30 mL, 60 mL, 120 mL', tests: ['SPC', 'MY', 'PA', 'SA', 'CA'] },
  { sheet: 'RM/FP/AS', row: 41, product: 'Omega Pain Killer Liniment- Pro (60mL, 120mL & 30mL) Old Specs', tests: ['SPC', 'MY'] },
];

test('consolidated package volumes match a single-size New Specs stability sample', () => {
  const matches = resolveApplicabilityMatches(rows, { name: 'Omega Pain Killer Liniment', aliases: [] }, 'RM/FP/AS', 'Omega Pain Killer Liniment- (5th withdrawal - New Specs)-15 mL');
  assert.deepEqual(matches.map(row => row.row), [33]);
});

test('consolidated package volumes preserve the Pro Old Specs product variant', () => {
  const matches = resolveApplicabilityMatches(rows, { name: 'Omega Pain Killer Liniment- Pro Old Specs', aliases: [] }, 'RM/FP/AS', 'Omega Pain Killer Liniment- Pro (5th withdrawal - Old Specs)-60 mL');
  assert.deepEqual(matches.map(row => row.row), [41]);
});

const cottonRows = [
  { sheet: 'RM/FP/AS', row: 10, product: 'Mama’s Love Absorbent Cotton Balls', tests: ['SPC', 'MY'] },
  { sheet: 'RM/FP/AS', row: 11, product: 'Mama’s Love Absorbent Cotton Rolls', tests: ['SPC', 'MY'] },
  { sheet: 'RM/FP/AS', row: 12, product: 'Mama’s Love Cotton Buds', tests: ['SPC', 'MY'] },
];

test('miscellaneous Cotton Balls resolves the branded checklist row and cotton criteria', () => {
  const matches = resolveApplicabilityMatches(cottonRows, { name: 'Cotton Balls', aliases: [] }, 'RM/FP/AS', 'Cotton Balls');
  assert.deepEqual(matches, [cottonRows[0]]);
  const criteria = historicalCriteria('Cotton Balls', 'MIS', 'Routine', matches[0].tests, []);
  assert.deepEqual(criteria.map(x => [x.test, x.criterion, x.unit]), [
    ['SPC', 'Nmt 50 cfu/g', 'cfu/g'], ['MY', 'Nmt 10 cfu/g', 'cfu/g'],
  ]);
  assert.deepEqual(resolveApplicabilityMatches(cottonRows, { name: "Mama's Love Absorbent Cotton Balls", aliases: [] }, 'RM/FP/AS'), [cottonRows[0]]);
});

test('Cotton Balls equivalence preserves sheet boundaries, ambiguity and unchecked tests', () => {
  const product = { name: 'Cotton Balls', aliases: [] };
  assert.deepEqual(resolveApplicabilityMatches(cottonRows.slice(1), product, 'RM/FP/AS', 'Cotton Balls'), []);
  assert.deepEqual(resolveApplicabilityMatches(cottonRows, product, 'RAW', 'Cotton Balls'), []);
  assert.equal(resolveApplicabilityMatches([...cottonRows, { ...cottonRows[0] }], product, 'RM/FP/AS').length, 2);
  const unchecked = { ...cottonRows[0], tests: [] };
  assert.deepEqual(resolveApplicabilityMatches([unchecked], product, 'RM/FP/AS'), [unchecked]);
});
