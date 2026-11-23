import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAppMode, isPaletteId, PALETTE_IDS } from './theme.ts';

test('isPaletteId accepts only the known palettes', () => {
  for (const id of PALETTE_IDS) assert.equal(isPaletteId(id), true);
  assert.equal(isPaletteId('neon'), false);
  assert.equal(isPaletteId('Cream'), false);
  assert.equal(isPaletteId(undefined), false);
  assert.equal(isPaletteId(null), false);
});

test('every palette is listed once', () => {
  assert.equal(new Set(PALETTE_IDS).size, PALETTE_IDS.length);
});

test('isAppMode accepts light and dark only', () => {
  assert.equal(isAppMode('light'), true);
  assert.equal(isAppMode('dark'), true);
  assert.equal(isAppMode('system'), false);
  assert.equal(isAppMode(''), false);
  assert.equal(isAppMode(undefined), false);
});
