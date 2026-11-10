import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journalProblem, planJournalEntries } from './journal.ts';

const photo = (image: string, dish: string, recipe = '') => ({
  image,
  dish,
  recipe,
});

test('a trip is one entry with every photo and the place', () => {
  const result = planJournalEntries(
    {
      kind: 'travel',
      place: ' Goa ',
      body: 'Great trip',
      photos: [photo('b', 'Fish thali', 'ignored'), photo('a', 'Bebinca')],
    },
    'p1',
    ['a', 'b']
  );
  assert.ok(result.ok);
  assert.equal(result.entries.length, 1);
  const [entry] = result.entries;
  assert.equal(entry?.place, 'Goa');
  // In the post's own order; trips keep no recipes.
  assert.deepEqual(entry?.photos, [
    photo('a', 'Bebinca'),
    photo('b', 'Fish thali'),
  ]);
});

test('a trip needs its place and every dish', () => {
  const noPlace = planJournalEntries(
    { kind: 'travel', place: ' ', photos: [photo('a', 'Vada pav')] },
    'p1',
    ['a']
  );
  assert.deepEqual(noPlace, {
    ok: false,
    message: 'Add the place you went to.',
  });
  const missingPhoto = planJournalEntries(
    { kind: 'travel', place: 'Mumbai', photos: [photo('a', 'Vada pav')] },
    'p1',
    ['a', 'b']
  );
  assert.equal(missingPhoto.ok, false);
});

test('home-made photos are saved separately; ones with a recipe go to Recipes', () => {
  const result = planJournalEntries(
    {
      kind: 'home',
      photos: [photo('a', 'Dal'), photo('b', 'Roti', 'Knead the dough…')],
    },
    'p1',
    ['a', 'b']
  );
  assert.ok(result.ok);
  assert.deepEqual(
    result.entries.map((e) => [e.kind, e.photos[0]?.dish]),
    [
      ['home', 'Dal'],
      ['recipe', 'Roti'],
    ]
  );
});

test('a recipe needs one for every photo', () => {
  assert.equal(
    journalProblem('recipe', '', [
      photo('a', 'Dal', 'Boil'),
      photo('b', 'Roti'),
    ]),
    'Add a recipe for every photo.'
  );
  assert.equal(journalProblem('home', '', [photo('a', 'Dal')]), null);
});

test('a post without photos is one entry with no image', () => {
  const result = planJournalEntries(
    { kind: 'home', photos: [photo('', 'Poha')] },
    'p1',
    []
  );
  assert.ok(result.ok);
  assert.equal(result.entries[0]?.photos[0]?.image, '');
});

test('one dish in many photos is one entry with the first photo’s recipe', () => {
  const result = planJournalEntries(
    {
      kind: 'recipe',
      oneDish: true,
      photos: [photo('a', 'Paneer', 'Cook it'), photo('b', ''), photo('c', '')],
    },
    'p1',
    ['a', 'b', 'c']
  );
  assert.ok(result.ok);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0]?.kind, 'recipe');
  assert.deepEqual(
    result.entries[0]?.photos.map((p) => [p.image, p.dish, p.recipe]),
    [
      ['a', 'Paneer', 'Cook it'],
      ['b', 'Paneer', 'Cook it'],
      ['c', 'Paneer', 'Cook it'],
    ]
  );
  // Home-made without a recipe stays home-made.
  const home = planJournalEntries(
    {
      kind: 'home',
      oneDish: true,
      photos: [photo('a', 'Dal'), photo('b', '')],
    },
    'p1',
    ['a', 'b']
  );
  assert.ok(home.ok);
  assert.equal(home.entries[0]?.kind, 'home');
});
