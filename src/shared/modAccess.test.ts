import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modAccessFrom, NO_MOD_ACCESS } from './modAccess.ts';

test('non-mods get no mod tools', () => {
  assert.deepEqual(modAccessFrom([]), NO_MOD_ACCESS);
});

test('full mods and post mods can manage', () => {
  assert.deepEqual(modAccessFrom(['all']), { isMod: true, canManage: true });
  assert.deepEqual(modAccessFrom(['posts', 'mail']), {
    isMod: true,
    canManage: true,
  });
});

test('other mods can only see mod tools', () => {
  assert.deepEqual(modAccessFrom(['wiki', 'flair']), {
    isMod: true,
    canManage: false,
  });
});
