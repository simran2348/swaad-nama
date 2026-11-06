import type { FoodReview, JournalEntry } from './api';

/**
 * When someone rates a post or adds it to their journal, a short comment from
 * them goes on that post, e.g. "Added to SwaadNama journal (Home-made)".
 */

const SECTION_NAMES = {
  travel: 'Travel',
  home: 'Home-made',
  recipe: 'Recipes',
} as const;

/** The comment for a rating, e.g. "Added to SwaadNama ratings (Vada pav)". */
export const ratingComment = (
  review: Pick<FoodReview, 'food'>,
  edited = false
): string =>
  `${edited ? 'Updated in' : 'Added to'} SwaadNama ratings (${review.food})`;

/**
 * The comment for journal entries saved from one post, e.g. "Added to
 * SwaadNama journal (Home-made, Recipes)".
 */
export const journalComment = (
  entries: readonly Pick<JournalEntry, 'kind'>[]
): string => {
  const sections = [...new Set(entries.map((e) => SECTION_NAMES[e.kind]))];
  return `Added to SwaadNama journal (${sections.join(', ')})`;
};
