import { reddit } from '@devvit/web/server';

/**
 * Posts comments from the signed-in user (not the app) on their own post, so
 * what they typed in SwaadNama is on Reddit under their name and can be
 * reported. Returns the link to the first comment.
 *
 * Throws when Reddit refuses (e.g. a locked or archived post), so nothing is
 * saved in the app without its comment.
 */
export const commentAsUser = async (
  postId: string,
  comments: readonly string[]
): Promise<string> => {
  const id = `t3_${postId.replace(/^t3_/, '')}` as const;
  let first = '';
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
      `Commented as user: ${comment.id} by u/${comment.authorName} on ${id} (${comment.permalink})`
    );
    first ||= `https://www.reddit.com${comment.permalink}`;
  }
  return first;
};
