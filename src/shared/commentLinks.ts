/**
 * Links between the Reddit comments SwaadNama posts for people and the
 * ratings or journal entries they were posted for. When such a comment is
 * deleted or removed, the linked item is taken out of the app (see
 * src/server/core/userComments.ts and the comment triggers). Kept free of
 * Devvit so it can be unit tested (commentLinks.test.ts).
 */

/** What a comment was posted for. */
export type CommentedItem =
  | { kind: 'review'; id: string }
  | { kind: 'journal'; username: string; ids: string[] };

/** A comment id in the stored form, `t1_…`, whether or not it had it. */
export const commentKey = (id: string) => `t1_${id.replace(/^t1_/, '')}`;

/**
 * A stored link, or null when missing, unreadable or not one of the two
 * kinds (a review needs an id; a journal link needs a username, and any
 * non-string journal ids are dropped).
 */
export const parseCommentedItem = (
  value: string | undefined
): CommentedItem | null => {
  if (!value) return null;
  let data: unknown;
  try {
    data = JSON.parse(value);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { kind, id, username, ids } = {
    kind: '',
    id: '',
    username: '',
    ids: [],
    ...data,
  };
  if (kind === 'review' && typeof id === 'string' && id) {
    return { kind, id };
  }
  if (kind === 'journal' && typeof username === 'string' && username) {
    return {
      kind,
      username,
      ids: Array.isArray(ids)
        ? ids.filter((x: unknown): x is string => typeof x === 'string')
        : [],
    };
  }
  return null;
};
