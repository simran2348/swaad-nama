import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, daysSinceMonday } from './stats.ts';

// 2026-10-26 is a Monday. Times are UTC; days are counted in India time.
const at = (iso: string) => Date.parse(iso);

test('dayKey uses India time', () => {
  assert.equal(dayKey(at('2026-10-27T20:00:00Z')), '2026-10-28');
  assert.equal(dayKey(at('2026-10-27T10:00:00Z')), '2026-10-27');
  assert.equal(dayKey(at('2026-10-28T10:00:00Z'), 2), '2026-10-26');
});

test("daysSinceMonday counts from this week's Monday", () => {
  assert.equal(daysSinceMonday(at('2026-10-26T10:00:00Z')), 0);
  assert.equal(daysSinceMonday(at('2026-10-28T10:00:00Z')), 2);
  assert.equal(daysSinceMonday(at('2026-11-01T10:00:00Z')), 6);
  // Sunday 23:00 UTC is already Monday in India.
  assert.equal(daysSinceMonday(at('2026-11-01T20:00:00Z')), 0);
});
