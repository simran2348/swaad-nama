import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journalComment, ratingComment } from './comments.ts';

test('a rating comment names the food category', () => {
  assert.equal(
    ratingComment({ food: 'Vada pav' }),
    'Added to SwaadNama ratings (Vada pav)'
  );
  assert.equal(
    ratingComment({ food: 'Vada pav' }, true),
    'Updated in SwaadNama ratings (Vada pav)'
  );
});

test('a journal comment names each section once', () => {
  assert.equal(
    journalComment([{ kind: 'travel' }]),
    'Added to SwaadNama journal (Travel)'
  );
  assert.equal(
    journalComment([{ kind: 'home' }, { kind: 'recipe' }, { kind: 'home' }]),
    'Added to SwaadNama journal (Home-made, Recipes)'
  );
});
