import { reddit, redis } from '@devvit/web/server';

/**
 * Text people type in SwaadNama is posted as Reddit comments from them on
 * their own post, so it's attributed to them and can be reported. When such
 * a comment is deleted or removed by a mod, the rating or journal entry it
 * came from is taken out of the app too (see the comment triggers).
 */

/** What a comment was posted for. */
export type CommentedItem =
  | { kind: 'review'; id: string }
  | { kind: 'journal'; username: string; ids: string[] };

const keys = {
  /** Comment id (t1_…) → the item it was posted for, as JSON. */
  items: () => 'comments:items',
};

const commentKey = (id: string) => `t1_${id.replace(/^t1_/, '')}`;

const parseItem = (value: string | undefined): CommentedItem | null => {
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

/**
 * Posts comments from the signed-in user (not the app) on their own post.
 * Returns the comments' ids and the link to the first one.
 *
 * Throws when Reddit refuses (e.g. a locked or archived post), so nothing is
 * saved in the app without its comment.
 */
export const commentAsUser = async (
  postId: string,
  comments: readonly string[]
): Promise<{ url: string; ids: string[] }> => {
  const id = `t3_${postId.replace(/^t3_/, '')}` as const;
  const ids: string[] = [];
  let url = '';
  for (const text of comments) {
    let comment;
    try {
      comment = await reddit.submitComment({ id, text, runAs: 'USER' });
    } catch (error) {
      console.error('Comment as user failed', error);
      throw new Error(
        "Couldn't post this as a comment on your post. If the post is locked or archived, try another one.",
        { cause: error }
      );
    }
    console.log(
      `Commented as user: ${comment.id} by u/${comment.authorName} on ${id}`
    );
    ids.push(comment.id);
    url ||= `https://www.reddit.com${comment.permalink}`;
  }
  return { url, ids };
};

/** Remembers what these comments were posted for. */
export const linkComments = async (
  commentIds: readonly string[],
  item: CommentedItem
) => {
  if (commentIds.length === 0) return;
  const value = JSON.stringify(item);
  await redis.hSet(
    keys.items(),
    Object.fromEntries(commentIds.map((id) => [commentKey(id), value]))
  );
};

/**
 * What a comment was posted for, forgetting it (its comment is gone), or
 * null when it isn't one of ours.
 */
export const takeCommentedItem = async (
  commentId: string
): Promise<CommentedItem | null> => {
  const key = commentKey(commentId);
  const item = parseItem(await redis.hGet(keys.items(), key));
  if (item) await redis.hDel(keys.items(), [key]);
  return item;
};
