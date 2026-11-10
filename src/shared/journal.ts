import type {
  JournalEntry,
  JournalKind,
  JournalPhoto,
  SaveJournalRequest,
} from './api';

export const JOURNAL_LIMITS = {
  dish: 60,
  place: 80,
  recipe: 4000,
  body: 2000,
};

/** A journal entry's title: the trip's place, or the dish. */
export const entryTitle = (entry: JournalEntry) =>
  entry.kind === 'travel' ? entry.place : (entry.photos[0]?.dish ?? '');

export const isJournalKind = (value: unknown): value is JournalKind =>
  value === 'travel' || value === 'home' || value === 'recipe';

/**
 * What's still missing before a journal entry can be saved, or null when
 * it's ready. Every photo needs its dish; a trip needs its place; a recipe
 * needs the recipe for every photo (for home-made food it's optional).
 */
export const journalProblem = (
  kind: JournalKind,
  place: string,
  photos: readonly Pick<JournalPhoto, 'dish' | 'recipe'>[]
): string | null => {
  if (photos.length === 0) return 'This post has nothing to add.';
  if (photos.some((photo) => photo.dish.trim() === '')) {
    return photos.length === 1
      ? 'Add the name of the dish.'
      : 'Add the name of the dish in every photo.';
  }
  if (kind === 'travel' && place.trim() === '') {
    return 'Add the place you went to.';
  }
  if (kind === 'recipe' && photos.some((photo) => photo.recipe.trim() === '')) {
    return photos.length === 1
      ? 'Add the recipe.'
      : 'Add a recipe for every photo.';
  }
  return null;
};

export type PlannedEntry = Omit<JournalEntry, 'id' | 'at'>;

/**
 * Turns a save request into the entries to store, checking it against the
 * post's own photos (every one of them, each once). A trip is one entry;
 * home-made food and recipes are one entry per photo (or one for them all,
 * with `oneDish`), and home-made food with a recipe is filed under Recipes.
 */
export const planJournalEntries = (
  request: Partial<SaveJournalRequest>,
  postId: string,
  postImages: readonly string[]
): { ok: true; entries: PlannedEntry[] } | { ok: false; message: string } => {
  const kind = request.kind;
  if (!isJournalKind(kind)) return { ok: false, message: 'Pick a section.' };
  const given = Array.isArray(request.photos) ? request.photos : [];
  // A post without photos is one entry with no image.
  const expected = postImages.length > 0 ? postImages : [''];
  const photos: JournalPhoto[] = [];
  for (const image of expected) {
    const photo = given.find((p) => p?.image === image);
    if (!photo) return { ok: false, message: 'Every photo needs its dish.' };
    photos.push({
      image,
      dish: String(photo.dish ?? '')
        .trim()
        .slice(0, JOURNAL_LIMITS.dish),
      recipe:
        kind === 'travel'
          ? ''
          : String(photo.recipe ?? '')
              .trim()
              .slice(0, JOURNAL_LIMITS.recipe),
    });
  }
  const place =
    kind === 'travel'
      ? String(request.place ?? '')
          .trim()
          .slice(0, JOURNAL_LIMITS.place)
      : '';
  // One dish in every photo: the first photo's name and recipe for all.
  const oneDish =
    kind !== 'travel' && request.oneDish === true && photos.length > 1;
  const lead = photos[0];
  if (oneDish && lead) {
    for (const photo of photos) {
      photo.dish = lead.dish;
      photo.recipe = lead.recipe;
    }
  }
  const problem = journalProblem(kind, place, photos);
  if (problem) return { ok: false, message: problem };
  const body = String(request.body ?? '')
    .trim()
    .slice(0, JOURNAL_LIMITS.body);

  if (kind === 'travel') {
    return { ok: true, entries: [{ kind, postId, place, body, photos }] };
  }
  if (oneDish) {
    const recipe = photos[0]?.recipe ?? '';
    return {
      ok: true,
      entries: [
        { kind: recipe ? 'recipe' : 'home', postId, place: '', body, photos },
      ],
    };
  }
  return {
    ok: true,
    entries: photos.map((photo) => ({
      kind: photo.recipe ? 'recipe' : 'home',
      postId,
      place: '',
      body,
      photos: [photo],
    })),
  };
};
