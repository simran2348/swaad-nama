import { redis } from '@devvit/web/server';
import type {
  AdminJournalSection,
  JournalEntry,
  JournalPhoto,
} from '../../shared/api';
import { isJournalKind, type PlannedEntry } from '../../shared/journal';

const keys = {
  /** A user's journal entries: id → the entry as JSON. */
  entries: (username: string) => `user:${username}:journal`,
  /** The same entries' ids, scored by when they were added. */
  order: (username: string) => `user:${username}:journal:order`,
};

const text = (value: unknown) => (typeof value === 'string' ? value : '');

const parsePhoto = (value: unknown): JournalPhoto | null => {
  if (typeof value !== 'object' || value === null) return null;
  const { image, dish, recipe } = { image: '', dish: '', recipe: '', ...value };
  return { image: text(image), dish: text(dish), recipe: text(recipe) };
};

const parseEntry = (value: string | undefined): JournalEntry | null => {
  if (!value) return null;
  let data: unknown;
  try {
    data = JSON.parse(value);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { id, kind, postId, place, body, photos, at } = {
    id: '',
    kind: '',
    postId: '',
    place: '',
    body: '',
    photos: [],
    at: 0,
    ...data,
  };
  if (!isJournalKind(kind) || typeof id !== 'string' || !id) return null;
  return {
    id,
    kind,
    postId: text(postId),
    place: text(place),
    body: text(body),
    photos: Array.isArray(photos)
      ? photos.flatMap((p: unknown) => parsePhoto(p) ?? [])
      : [],
    at: typeof at === 'number' ? at : 0,
  };
};

/** Your journal entries, newest first. */
export const getJournalEntries = async (
  username: string
): Promise<JournalEntry[]> => {
  const ids = await redis.zRange(keys.order(username), 0, -1, {
    by: 'rank',
    reverse: true,
  });
  if (ids.length === 0) return [];
  const values = await redis.hMGet(
    keys.entries(username),
    ids.map((entry) => entry.member)
  );
  return values.flatMap((value) => parseEntry(value ?? undefined) ?? []);
};

/** Whether this post is already in your journal. */
export const hasJournalPost = async (username: string, postId: string) =>
  (await getJournalEntries(username)).some((entry) => entry.postId === postId);

/** Saves entries to your journal (all at the same time, in order). */
export const saveJournalEntries = async (
  username: string,
  planned: readonly PlannedEntry[]
): Promise<JournalEntry[]> => {
  const now = Date.now();
  // Later entries a hair newer, so newest-first keeps the post's order
  // reversed consistently.
  const entries = planned.map((entry, i) => ({
    ...entry,
    id: `${now.toString(36)}${i}${Math.random().toString(36).slice(2, 7)}`,
    at: now + i,
  }));
  await redis.hSet(
    keys.entries(username),
    Object.fromEntries(entries.map((e) => [e.id, JSON.stringify(e)]))
  );
  for (const entry of entries) {
    await redis.zAdd(keys.order(username), {
      member: entry.id,
      score: entry.at,
    });
  }
  return entries;
};

/**
 * Removes a user's journal entries in one section (or all of them).
 * Returns how many were removed.
 */
export const removeJournalEntries = async (
  username: string,
  section: AdminJournalSection
): Promise<number> => {
  if (section === 'all') {
    const ids = await redis.zRange(keys.order(username), 0, -1, {
      by: 'rank',
    });
    await redis.del(keys.entries(username), keys.order(username));
    return ids.length;
  }
  const ids = (await getJournalEntries(username))
    .filter((entry) => entry.kind === section)
    .map((entry) => entry.id);
  if (ids.length > 0) {
    await redis.hDel(keys.entries(username), ids);
    await redis.zRem(keys.order(username), ids);
  }
  return ids.length;
};
