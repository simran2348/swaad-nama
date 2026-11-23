import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commentKey, parseCommentedItem } from './commentLinks.ts';

test('commentKey always has one t1_ prefix', () => {
  assert.equal(commentKey('abc'), 't1_abc');
  assert.equal(commentKey('t1_abc'), 't1_abc');
});

test('a review link needs its id', () => {
  assert.deepEqual(parseCommentedItem('{"kind":"review","id":"r1"}'), {
    kind: 'review',
    id: 'r1',
  });
  assert.equal(parseCommentedItem('{"kind":"review","id":""}'), null);
  assert.equal(parseCommentedItem('{"kind":"review","id":5}'), null);
});

test('a journal link needs a username; bad ids are dropped', () => {
  assert.deepEqual(
    parseCommentedItem(
      '{"kind":"journal","username":"cook","ids":["j1",2,null,"j2"]}'
    ),
    { kind: 'journal', username: 'cook', ids: ['j1', 'j2'] }
  );
  assert.deepEqual(parseCommentedItem('{"kind":"journal","username":"cook"}'), {
    kind: 'journal',
    username: 'cook',
    ids: [],
  });
  assert.equal(parseCommentedItem('{"kind":"journal","ids":["j1"]}'), null);
});

test('anything else is not a link', () => {
  assert.equal(parseCommentedItem(undefined), null);
  assert.equal(parseCommentedItem(''), null);
  assert.equal(parseCommentedItem('not json'), null);
  assert.equal(parseCommentedItem('"text"'), null);
  assert.equal(parseCommentedItem('null'), null);
  assert.equal(parseCommentedItem('{"kind":"other","id":"x"}'), null);
});
