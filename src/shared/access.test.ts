import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canUseApp, toAppStatus } from './access.ts';

test('reads the App status setting', () => {
  assert.equal(toAppStatus(['closed']), 'closed');
  assert.equal(toAppStatus('closed'), 'closed');
  assert.equal(toAppStatus(['open']), 'open');
  assert.equal(toAppStatus(undefined), 'open');
  assert.equal(toAppStatus(['other']), 'open');
});

test('only the admin can use a closed app', () => {
  assert.equal(canUseApp('open', false), true);
  assert.equal(canUseApp('closed', false), false);
  assert.equal(canUseApp('closed', true), true);
});
