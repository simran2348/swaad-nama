import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dayKey,
  daysSinceMonday,
  FEATURE_EVENTS,
  FUNNEL_EVENTS,
  isTrackEvent,
} from './stats.ts';

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

test('dayKey crosses month and year ends in India time', () => {
  // 31 Dec 19:00 UTC is already 1 Jan in India.
  assert.equal(dayKey(at('2026-12-31T19:00:00Z')), '2027-01-01');
  assert.equal(dayKey(at('2027-03-01T10:00:00Z'), 1), '2027-02-28');
  // IST midnight is 18:30 UTC the day before.
  assert.equal(dayKey(at('2026-10-27T18:29:59Z')), '2026-10-27');
  assert.equal(dayKey(at('2026-10-27T18:30:00Z')), '2026-10-28');
});

test('isTrackEvent accepts only reported events', () => {
  for (const event of [
    ...Object.keys(FEATURE_EVENTS),
    ...Object.keys(FUNNEL_EVENTS),
  ]) {
    assert.equal(isTrackEvent(event), true, event);
  }
  // Server-only counters can't be sent by the client.
  assert.equal(isTrackEvent('rating_added'), false);
  assert.equal(isTrackEvent('new_user'), false);
  assert.equal(isTrackEvent('toString'), false);
  assert.equal(isTrackEvent(42), false);
});
