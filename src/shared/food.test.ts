import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidRating,
  normalizeName,
  ratingToStars,
  tierFor,
} from './food.ts';
import { cleanPostBody } from './text.ts';

test('normalizeName trims, collapses spaces and lowercases', () => {
  assert.equal(normalizeName('  Butter   Chicken '), 'butter chicken');
});

test('tierFor maps averages to tiers', () => {
  assert.equal(tierFor(10), 'S');
  assert.equal(tierFor(8.4), 'A');
  assert.equal(tierFor(6), 'B');
  assert.equal(tierFor(5), 'C');
  assert.equal(tierFor(2), 'D');
});

test('isValidRating accepts 1 to 10 with one decimal place', () => {
  assert.equal(isValidRating(1), true);
  assert.equal(isValidRating(10), true);
  assert.equal(isValidRating(7.5), true);
  assert.equal(isValidRating(8.3), true);
  assert.equal(isValidRating(0), false);
  assert.equal(isValidRating(0.9), false);
  assert.equal(isValidRating(10.1), false);
  assert.equal(isValidRating(7.25), false);
  assert.equal(isValidRating(Number.NaN), false);
});

test('ratingToStars halves a rating out of 10', () => {
  assert.equal(ratingToStars(10), 5);
  assert.equal(ratingToStars(7), 3.5);
  assert.equal(ratingToStars(1), 0.5);
});

test('cleanPostBody strips media markers and entities', () => {
  assert.equal(
    cleanPostBody('![img](pqhz2n7d3lxh1)\n\nBest biryani &amp; raita'),
    'Best biryani & raita'
  );
  assert.equal(cleanPostBody('a\n\n\n\n![gif](x)\nb'), 'a\n\nb');
});
