import type { FoodCategory, FoodReview, PlaceLocation } from './api';
import { cleanVibes, isValidBudget, normalizeName } from './food.ts';

/**
 * Pure rules behind the server's ratings store (src/server/core/reviews.ts):
 * reading a stored rating back, per-food summaries and food search matching.
 * Kept free of Devvit so they can be unit tested (ratings.test.ts).
 */

/** JSON from a stored field; undefined when missing or unreadable. */
export const parseStoredJson = (value: string | undefined): unknown => {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

/** A saved place location, or undefined unless it has finite lat/lon. */
export const parseLocation = (value: unknown): PlaceLocation | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const { address, lat, lon } = { address: '', lat: NaN, lon: NaN, ...value };
  return typeof address === 'string' &&
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon)
    ? { address, lat, lon }
    : undefined;
};

/** Photo URLs from stored JSON (anything that isn't a string is dropped). */
export const parseImages = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((url): url is string => typeof url === 'string')
    : [];

/**
 * A rating from its stored Redis hash, or null without an id and username.
 * Ratings saved before the 10-point scale (no `scale: '10'`) were out of 5
 * and are doubled. An invalid budget or location is left out.
 */
export const parseStoredReview = (
  data: Record<string, string>
): FoodReview | null => {
  if (!data.id || !data.username) return null;
  const rating = Number(data.rating ?? 0);
  const createdAt = Number(data.createdAt ?? 0);
  const location = parseLocation(parseStoredJson(data.location));
  const budget = Number(data.budget);
  return {
    id: data.id,
    username: data.username,
    title: data.title ?? '',
    food: data.food ?? '',
    place: data.place ?? '',
    ...(location ? { location } : {}),
    rating: data.scale === '10' ? rating : rating * 2,
    review: data.review ?? '',
    ...(isValidBudget(budget) ? { budget } : {}),
    vibes: cleanVibes(parseStoredJson(data.vibes)),
    images: parseImages(parseStoredJson(data.images)),
    createdAt,
    postedAt: Number(data.postedAt ?? createdAt),
    ...(data.postId ? { postId: data.postId } : {}),
    ...(data.commentUrl ? { commentUrl: data.commentUrl } : {}),
  };
};

/** Averages are shown with one decimal place. */
export const roundAverage = (value: number): number =>
  Math.round(value * 10) / 10;

/**
 * One user's food categories (grouped case- and space-insensitively), each
 * with its count, average and highest-rated place. Most-rated first.
 */
export const foodCategories = (reviews: FoodReview[]): FoodCategory[] => {
  const groups = new Map<string, FoodReview[]>();
  for (const review of reviews) {
    const key = normalizeName(review.food);
    groups.set(key, [...(groups.get(key) ?? []), review]);
  }
  return [...groups.values()]
    .map((group) => {
      const sorted = [...group].sort((a, b) => b.rating - a.rating);
      const [best] = sorted;
      // Prefer the best place's photo, else any photo in the category.
      const image =
        best?.images[0] ?? sorted.find((r) => r.images[0])?.images[0] ?? null;
      return {
        food: best?.food ?? '',
        count: group.length,
        average: roundAverage(
          group.reduce((sum, r) => sum + r.rating, 0) / group.length
        ),
        top: best ? { place: best.place, rating: best.rating, image } : null,
      };
    })
    .sort((a, b) => b.count - a.count);
};

/** A food category's ratings, best first, as read from its index. */
export type FoodScores = {
  food: string;
  /** Every rating's score, best first. */
  scores: readonly number[];
  /** The best rating's id (its photo is the card's). */
  bestId: string | undefined;
};

export type RankedFood = {
  food: string;
  count: number;
  /** Unrounded; see roundAverage. */
  average: number;
  bestId: string | undefined;
};

/**
 * Card order for food categories: ones with no ratings dropped, then
 * most-rated first with the best average breaking ties, unless `keepOrder`
 * (e.g. favourites, newest first). At most `limit`.
 */
export const rankFoods = (
  foods: readonly FoodScores[],
  limit: number,
  keepOrder = false
): RankedFood[] =>
  foods
    .map(({ food, scores, bestId }) => ({
      food,
      count: scores.length,
      average: scores.length
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0,
      bestId,
    }))
    .filter((f) => f.count > 0)
    .sort((a, b) =>
      keepOrder ? 0 : b.count - a.count || b.average - a.average
    )
    .slice(0, limit);

/**
 * Food category keys matching a search: the key or its display name
 * contains the query (case- and space-insensitive). Keeps the given order.
 */
export const matchFoodKeys = (
  keys: readonly string[],
  names: readonly (string | null | undefined)[],
  query: string
): string[] => {
  const needle = normalizeName(query);
  return keys.filter(
    (key, i) =>
      key.includes(needle) || normalizeName(names[i] ?? '').includes(needle)
  );
};
