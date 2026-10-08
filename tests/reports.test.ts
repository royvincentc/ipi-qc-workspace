import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApplicabilityMatches, historicalCriteria } from '../server/reports.js';

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
