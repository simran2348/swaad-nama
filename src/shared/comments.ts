import type { FoodReview, JournalEntry } from './api';

/**
 * Text people type in SwaadNama (ratings, journal entries) is also posted as
 * a Reddit comment from them on their own post, so it's attributed to them
 * and anyone can report it. These build those comments (Reddit Markdown).
 */

/** Reddit allows 10,000 characters per comment; stay a little under. */
export const COMMENT_LIMIT = 9500;

const SECTION_NAMES = {
  travel: 'Travel',
  home: 'Home-made',
  recipe: 'Recipes',
} as const;

/** Quotes text as a Markdown block quote (each line). */
const quote = (text: string) =>
  text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

/** Puts sections into as few comments as fit, in order. */
export const packComments = (sections: readonly string[]): string[] => {
  const comments: string[] = [];
  let current = '';
  for (const section of sections) {
    const next = current ? `${current}\n\n${section}` : section;
    if (current && next.length > COMMENT_LIMIT) {
      comments.push(current);
      current = section;
    } else {
      current = next;
    }
  }
  if (current) comments.push(current);
  // A section longer than a whole comment (not possible within our field
  // limits) is cut rather than failing the save.
  return comments.map((c) => c.slice(0, COMMENT_LIMIT));
};

/** The comment for a rating (new, or edited). */
export const ratingComment = (
  review: Pick<
    FoodReview,
    'title' | 'food' | 'place' | 'rating' | 'review' | 'budget' | 'vibes'
  >,
  edited = false
): string => {
  const details = [
    review.budget
      ? `Budget: about ₹${review.budget.toLocaleString('en-IN')} per person`
      : '',
    review.vibes.length ? `Vibes: ${review.vibes.join(', ')}` : '',
  ].filter(Boolean);
  return [
    `**My SwaadNama rating${edited ? ' (updated)' : ''}: ${review.rating}/10**`,
    `**${review.title}**`,
    `${review.food} at ${review.place}`,
    review.review ? quote(review.review) : '',
    details.join(' · '),
  ]
    .filter(Boolean)
    .join('\n\n');
};

/**
 * The comments for the journal entries saved from one post. A trip lists a
 * dish per photo; home-made food and recipes give each dish with its recipe
 * (a dish shown in several photos is listed once). Usually one comment; long
 * recipes spill into more.
 */
export const journalComments = (
  entries: readonly Pick<JournalEntry, 'kind' | 'place' | 'body' | 'photos'>[]
): string[] => {
  const first = entries[0];
  if (!first) return [];
  const kinds = [...new Set(entries.map((e) => SECTION_NAMES[e.kind]))];
  const sections = [`**My SwaadNama Journal entry (${kinds.join(', ')})**`];
  for (const entry of entries) {
    if (entry.kind === 'travel') {
      sections.push(`**Place:** ${entry.place}`);
      sections.push(entry.photos.map((photo) => `* ${photo.dish}`).join('\n'));
      continue;
    }
    // Home-made food and recipes: one dish per entry, maybe in many photos.
    const dish = entry.photos[0];
    if (!dish) continue;
    const count = entry.photos.length;
    sections.push(`**${dish.dish}**${count > 1 ? ` (${count} photos)` : ''}`);
    if (dish.recipe) sections.push(`Recipe:\n\n${quote(dish.recipe)}`);
  }
  // Every entry from a post shares its notes.
  if (first.body) sections.push(`Notes:\n\n${quote(first.body)}`);
  return packComments(sections);
};
