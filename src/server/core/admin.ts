import { context, reddit } from '@devvit/web/server';
import type {
  AdminDeletePostsResponse,
  AdminResetRatingsResponse,
} from '../../shared/api';
import { parsePostId } from './external';
import { deleteReview, getUserReviews } from './reviews';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error';

/** Accepts ids (`abc123`, `t3_abc123`) or full post links, comma separated. */
const parseIds = (input: string) =>
  input
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => parsePostId(part) ?? part.replace(/^t3_/i, '').toLowerCase())
    .filter((id, i, all) => /^[a-z0-9]+$/.test(id) && all.indexOf(id) === i);

/**
 * Mod tool: takes posts in this subreddit down by id (posts anywhere else are
 * refused). Posts made by the app account (SwaadNama posts) are deleted;
 * members' posts are mod-removed, like a mod removing them on Reddit.
 * Ratings attached to a post are removed too.
 */
export const deletePosts = async (
  input: string
): Promise<AdminDeletePostsResponse> => {
  const results: AdminDeletePostsResponse['results'] = [];
  for (const id of parseIds(input)) {
    try {
      const post = await reddit.getPostById(`t3_${id}`);
      const here = context.subredditName ?? '';
      if (post.subredditName.toLowerCase() !== here.toLowerCase()) {
        results.push({
          id,
          status: 'failed',
          message: `Not a post in r/${here}`,
        });
        continue;
      }
      // Drop ratings that point at this post.
      const ratings = await getUserReviews(post.authorName);
      await Promise.all(
        ratings.filter((r) => r.postId === post.id).map(deleteReview)
      );
      try {
        await post.delete();
        results.push({ id, status: 'deleted' });
      } catch {
        await post.remove();
        results.push({ id, status: 'removed' });
      }
    } catch (error) {
      results.push({ id, status: 'failed', message: errorMessage(error) });
    }
  }
  return { results };
};

/** Removes every rating a user has (their Reddit posts are untouched). */
export const resetRatings = async (
  username: string
): Promise<AdminResetRatingsResponse> => {
  const ratings = await getUserReviews(username);
  for (const rating of ratings) await deleteReview(rating);
  return { username, removed: ratings.length };
};
