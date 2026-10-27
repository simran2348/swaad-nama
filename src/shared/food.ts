export const MIN_RATING = 1;
export const MAX_RATING = 10;

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D';

/** Lowercase, trimmed, single-spaced key used to group foods and places. */
export const normalizeName = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();

/** Tier for an average rating out of 10. */
export const tierFor = (average: number): Tier => {
  if (average >= 9) return 'S';
  if (average >= 8) return 'A';
  if (average >= 6) return 'B';
  if (average >= 4) return 'C';
  return 'D';
};

/** Rating out of 10 shown as 0–5 stars (half stars allowed). */
export const ratingToStars = (rating: number): number => Math.round(rating) / 2;

/** Ratings are 1–10 with at most one decimal place (e.g. 7.5). */
export const isValidRating = (rating: number): boolean =>
  Number.isFinite(rating) &&
  rating >= MIN_RATING &&
  rating <= MAX_RATING &&
  Number.isInteger(Math.round(rating * 1e6) / 1e5);
