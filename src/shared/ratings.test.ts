import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FoodReview } from './api';
import {
  foodCategories,
  matchFoodKeys,
  parseLocation,
  parseStoredJson,
  parseStoredReview,
  rankFoods,
  roundAverage,
} from './ratings.ts';

const stored = (fields: Record<string, string> = {}) => ({
  id: 'r1',
  username: 'cook',
  title: 'Best misal',
  food: 'Misal Pav',
  place: 'Katakir',
  rating: '8',
  scale: '10',
  review: 'Spicy',
  vibes: '["Hidden gem"]',
  images: '["https://i.redd.it/a.jpg"]',
  createdAt: '1000',
  postedAt: '900',
  ...fields,
});

test('parseStoredReview reads a saved rating', () => {
  const review = parseStoredReview(
    stored({
      budget: '300',
      location: '{"address":"FC Road","lat":18.5,"lon":73.8}',
      postId: 't3_abc',
      commentUrl: 'https://reddit.com/c',
    })
  );
  assert.deepEqual(review, {
    id: 'r1',
    username: 'cook',
    title: 'Best misal',
    food: 'Misal Pav',
    place: 'Katakir',
    location: { address: 'FC Road', lat: 18.5, lon: 73.8 },
    rating: 8,
    review: 'Spicy',
    budget: 300,
    vibes: ['Hidden gem'],
    images: ['https://i.redd.it/a.jpg'],
    createdAt: 1000,
    postedAt: 900,
    postId: 't3_abc',
    commentUrl: 'https://reddit.com/c',
  });
});

test('ratings saved before the 10-point scale are doubled', () => {
  const { scale: _scale, ...old } = stored({ rating: '4' });
  assert.equal(parseStoredReview(old)?.rating, 8);
  assert.equal(parseStoredReview(stored({ rating: '4' }))?.rating, 4);
});

test('parseStoredReview needs an id and username', () => {
  assert.equal(parseStoredReview({}), null);
  assert.equal(parseStoredReview(stored({ id: '' })), null);
  assert.equal(parseStoredReview(stored({ username: '' })), null);
});

test('bad optional fields are left out, not fatal', () => {
  const review = parseStoredReview(
    stored({
      budget: '42',
      location: '{"address":"x","lat":"north"}',
      vibes: 'not json',
      images: '[1, "https://i.redd.it/b.jpg", null]',
    })
  );
  assert.equal(review?.budget, undefined);
  assert.equal(review?.location, undefined);
  assert.deepEqual(review?.vibes, []);
  assert.deepEqual(review?.images, ['https://i.redd.it/b.jpg']);
});

test('postedAt falls back to createdAt', () => {
  const { postedAt: _postedAt, ...rest } = stored();
  assert.equal(parseStoredReview(rest)?.postedAt, 1000);
});

test('parseStoredJson and parseLocation are forgiving', () => {
  assert.equal(parseStoredJson(undefined), undefined);
  assert.equal(parseStoredJson('{oops'), undefined);
  assert.deepEqual(parseStoredJson('[1]'), [1]);
  assert.equal(parseLocation(null), undefined);
  assert.equal(
    parseLocation({ lat: Infinity, lon: 1, address: '' }),
    undefined
  );
  assert.deepEqual(parseLocation({ lat: 1, lon: 2 }), {
    address: '',
    lat: 1,
    lon: 2,
  });
});

test('roundAverage keeps one decimal place', () => {
  assert.equal(roundAverage(7.25), 7.3);
  assert.equal(roundAverage(7.24), 7.2);
  assert.equal(roundAverage(8), 8);
});

const review = (
  food: string,
  rating: number,
  place: string,
  images: string[] = []
): FoodReview => ({
  id: `${food}-${place}`,
  username: 'cook',
  title: '',
  food,
  place,
  rating,
  review: '',
  vibes: [],
  images,
  createdAt: 0,
  postedAt: 0,
});

test('foodCategories groups by food name, ignoring case and spaces', () => {
  const categories = foodCategories([
    review('Misal Pav', 8, 'Katakir'),
    review('misal  pav ', 9.5, 'Bedekar', ['https://i.redd.it/b.jpg']),
    review('Misal Pav', 6, 'Shri Krishna'),
    review('Vada Pav', 7, 'Joshi'),
  ]);
  assert.equal(categories.length, 2);
  assert.deepEqual(categories[0], {
    food: 'misal  pav ',
    count: 3,
    average: 7.8,
    top: { place: 'Bedekar', rating: 9.5, image: 'https://i.redd.it/b.jpg' },
  });
  assert.equal(categories[1]?.food, 'Vada Pav');
});

test("a category's photo falls back to any rating's photo", () => {
  const [category] = foodCategories([
    review('Dosa', 9, 'Vaishali'),
    review('Dosa', 6, 'Roopali', ['https://i.redd.it/r.jpg']),
  ]);
  assert.equal(category?.top?.place, 'Vaishali');
  assert.equal(category?.top?.image, 'https://i.redd.it/r.jpg');
  assert.deepEqual(foodCategories([]), []);
});

test('rankFoods orders most-rated first, then best average', () => {
  const ranked = rankFoods(
    [
      { food: 'Dosa', scores: [9, 8], bestId: 'd' },
      { food: 'Misal', scores: [7, 7, 7], bestId: 'm' },
      { food: 'Idli', scores: [10, 9], bestId: 'i' },
      { food: 'Empty', scores: [], bestId: undefined },
    ],
    10
  );
  assert.deepEqual(
    ranked.map((f) => f.food),
    ['Misal', 'Idli', 'Dosa']
  );
  assert.equal(ranked[1]?.average, 9.5);
  assert.equal(ranked[1]?.bestId, 'i');
});

test('rankFoods can keep the given order and respects the limit', () => {
  const foods = [
    { food: 'A', scores: [5], bestId: 'a' },
    { food: 'B', scores: [9, 9], bestId: 'b' },
    { food: 'C', scores: [7], bestId: 'c' },
  ];
  assert.deepEqual(
    rankFoods(foods, 10, true).map((f) => f.food),
    ['A', 'B', 'C']
  );
  assert.equal(rankFoods(foods, 2).length, 2);
});

test('matchFoodKeys matches the key or display name', () => {
  const keys = ['misal pav', 'vada pav', 'dosa', 'pav bhaji'];
  const names = ['Misal Pav', 'Vada Pav', 'Masala Dosa', null];
  assert.deepEqual(matchFoodKeys(keys, names, ' PAV '), [
    'misal pav',
    'vada pav',
    'pav bhaji',
  ]);
  assert.deepEqual(matchFoodKeys(keys, names, 'masala'), ['dosa']);
  assert.deepEqual(matchFoodKeys(keys, names, 'pizza'), []);
});
