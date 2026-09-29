import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApplicabilityMatches } from '../server/reports.js';

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
