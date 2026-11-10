import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMENT_LIMIT,
  journalComments,
  packComments,
  ratingComment,
} from './comments.ts';
import type { JournalEntry } from './api.ts';

type JournalDraft = Pick<JournalEntry, 'kind' | 'place' | 'body' | 'photos'>;

const rating = {
  title: 'Best vada pav',
  food: 'Vada pav',
  place: 'Joshi Wadewale',
  rating: 9,
  review: 'Crispy.\nSpicy chutney.',
  budget: 100,
  vibes: ['Hidden gem', 'Quick bite'],
};

test('a rating comment has every field the user typed', () => {
  const text = ratingComment(rating);
  assert.match(text, /^\*\*My SwaadNama rating: 9\/10\*\*/);
  assert.match(text, /Best vada pav/);
  assert.match(text, /Vada pav at Joshi Wadewale/);
  assert.match(text, /> Crispy\.\n> Spicy chutney\./);
  assert.match(text, /₹100 per person/);
  assert.match(text, /Hidden gem, Quick bite/);
  assert.match(ratingComment(rating, true), /My SwaadNama rating \(updated\)/);
});

test('empty rating fields are left out', () => {
  const text = ratingComment({ ...rating, review: '', vibes: [], budget: 0 });
  assert.doesNotMatch(text, /Budget|Vibes|>/);
});

test('a trip comment lists the place, dishes and notes', () => {
  const [text, ...rest] = journalComments([
    {
      kind: 'travel',
      place: 'Goa',
      body: 'Great trip',
      photos: [
        { image: 'a', dish: 'Fish thali', recipe: '' },
        { image: 'b', dish: 'Bebinca', recipe: '' },
      ],
    },
  ]);
  assert.equal(rest.length, 0);
  assert.match(text ?? '', /^\*\*My SwaadNama Journal entry \(Travel\)\*\*/);
  assert.match(text ?? '', /Goa/);
  assert.match(text ?? '', /\* Fish thali\n\* Bebinca/);
  assert.match(text ?? '', /> Great trip/);
});

test('one dish in many photos is listed once with its recipe', () => {
  const [text] = journalComments([
    {
      kind: 'recipe',
      place: '',
      body: '',
      photos: ['a', 'b', 'c'].map((image) => ({
        image,
        dish: 'Paneer',
        recipe: 'Cook it',
      })),
    },
  ]);
  assert.match(text ?? '', /\*\*Paneer\*\* \(3 photos\)/);
  assert.equal(text?.split('Cook it').length, 2);
});

test('long recipes spill into more comments, each within the limit', () => {
  const recipe = 'x'.repeat(4000);
  const entries = ['Dal', 'Roti', 'Sabzi'].map((dish): JournalDraft => ({
    kind: 'recipe',
    place: '',
    body: '',
    photos: [{ image: dish, dish, recipe }],
  }));
  const comments = journalComments(entries);
  assert.ok(comments.length > 1);
  assert.ok(comments.every((c) => c.length <= COMMENT_LIMIT));
  // Nothing is lost.
  assert.equal(comments.join('').split('x').length - 1, 12000);
});

test('sections are packed in order', () => {
  assert.deepEqual(packComments(['a', 'b']), ['a\n\nb']);
  assert.deepEqual(packComments([]), []);
});
