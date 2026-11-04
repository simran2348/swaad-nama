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

/**
 * Places for ratings sorted best first, where equal ratings share a place
 * and the next one follows on (9, 9, 8 → 1, 1, 2), so ties get the same medal.
 */
export const rankRatings = (ratings: number[]): number[] => {
  let rank = 0;
  let previous: number | null = null;
  return ratings.map((rating) => {
    // Ratings have one decimal place; compare in tenths to avoid float noise.
    const tenths = Math.round(rating * 10);
    if (tenths !== previous) {
      rank++;
      previous = tenths;
    }
    return rank;
  });
};

/** Rating out of 10 shown as 0–5 stars (half stars allowed). */
export const ratingToStars = (rating: number): number => Math.round(rating) / 2;

/** Ratings are 1–10 with at most one decimal place (e.g. 7.5). */
export const isValidRating = (rating: number): boolean =>
  Number.isFinite(rating) &&
  rating >= MIN_RATING &&
  rating <= MAX_RATING &&
  Number.isInteger(Math.round(rating * 1e6) / 1e5);

/** Budget is per person, in rupees, on a slider; the top end means "or more". */
export const MIN_BUDGET = 100;
export const MAX_BUDGET = 5000;
export const BUDGET_STEP = 100;

export const isValidBudget = (budget: number): boolean =>
  Number.isInteger(budget) && budget >= MIN_BUDGET && budget <= MAX_BUDGET;

/** e.g. "₹1,200", or "₹5,000+" at the top of the range. */
export const formatBudget = (budget: number): string =>
  `₹${budget.toLocaleString('en-IN')}${budget >= MAX_BUDGET ? '+' : ''}`;

export const MAX_VIBES = 10;
export const MAX_VIBE_LENGTH = 24;

/**
 * Quick-pick vibe tags; users can add their own too. The first
 * {@link VIBES_SHOWN} are shown straight away, the rest behind "Show more".
 */
export const VIBE_PRESETS = [
  'Fine dining',
  'Street food vibes',
  'Date worthy',
  'Friends hangout',
  'Cosy',
  'Aesthetic',
  'Hidden gem',
  'Underrated af',
  'Overrated',
  'Worth the hype',
  'Bougie',
  'Chill',
  'Lively',
  'Rooftop vibes',
  'Brunch spot',
  'Solo date',
  'Work-friendly',
  'Local favourite',
  'Value for money',
  'Comfort food',
  'Late-night scenes',
  'No-frills',
  'Quirky',
  'Old-school charm',
];

export const VIBES_SHOWN = 10;

/** One tidy vibe tag: trimmed, single-spaced and length-capped. */
export const cleanVibe = (vibe: string): string =>
  vibe.trim().replace(/\s+/g, ' ').slice(0, MAX_VIBE_LENGTH).trim();

/** Valid, de-duplicated (case-insensitive) vibe tags, at most {@link MAX_VIBES}. */
export const cleanVibes = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const vibes: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const vibe = cleanVibe(item);
    const key = vibe.toLowerCase();
    if (!vibe || seen.has(key)) continue;
    seen.add(key);
    vibes.push(vibe);
    if (vibes.length === MAX_VIBES) break;
  }
  return vibes;
};

/** Edits (insert, delete, swap a letter) to turn `a` into `b`. */
const editDistance = (a: string, b: string): number => {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = row;
  }
  return prev[b.length] ?? 0;
};

/**
 * How closely a food name matches what's typed, lower is closer; null for
 * no match. Starts with it > a word starts with it > contains it > the
 * letters appear in order > a near miss (a typo or two).
 */
const matchScore = (query: string, name: string): number | null => {
  if (name.startsWith(query)) return 0;
  if (name.split(' ').some((word) => word.startsWith(query))) return 1;
  if (name.includes(query)) return 2;
  let at = 0;
  for (const char of name) if (char === query[at]) at++;
  if (at === query.length && query.length > 2) return 3;
  // Typos: compare with the start of the name (or a word) of the same length.
  const allowed = query.length < 4 ? 1 : Math.floor(query.length / 3);
  const misses = [name, ...name.split(' ')].map((part) =>
    editDistance(query, part.slice(0, query.length))
  );
  const best = Math.min(...misses);
  return query.length > 2 && best <= allowed ? 4 + best : null;
};

/**
 * Food categories to suggest for what's typed: the closest matches first
 * (ties keep the list's order, i.e. most-rated first). Nothing typed: the
 * first `limit`. The exact category already typed is left out.
 */
export const suggestFoods = (
  foods: string[],
  typed: string,
  limit = 5
): string[] => {
  const query = normalizeName(typed);
  const others = foods.filter((food) => normalizeName(food) !== query);
  if (!query) return others.slice(0, limit);
  return others
    .map((food, index) => ({
      food,
      index,
      score: matchScore(query, normalizeName(food)),
    }))
    .filter((m): m is typeof m & { score: number } => m.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, limit)
    .map((m) => m.food);
};
