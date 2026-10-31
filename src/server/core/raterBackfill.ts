import { context, reddit, redis } from '@devvit/web/server';
import { getUserReviews, indexRater, indexUserReviews } from './reviews';

/** Set once every earlier rater in this subreddit has been found. */
const DONE_KEY = 'raters:backfill:v1';
/** Stops two requests running the catch-up at the same time. */
const LOCK_KEY = 'raters:backfill:lock';
const LOCK_SECONDS = 120;
/** How far back to look: the subreddit's newest posts. */
const SCAN_LIMIT = 1000;

/**
 * One-time catch-up for ratings saved before the rater lists existed.
 * Ratings are only of people's own posts here, so every rater is an author
 * of a recent post: each author with ratings is added to the rater lists
 * and the community food index (normally done when they open the app).
 */
export const backfillRaters = async () => {
  if (await redis.get(DONE_KEY)) return;
  const claim = await redis.incrBy(LOCK_KEY, 1);
  await redis.expire(LOCK_KEY, LOCK_SECONDS);
  if (claim > 1) return;
  try {
    const subredditName = context.subredditName;
    if (!subredditName) return;
    const authors = new Set<string>();
    const listing = reddit.getNewPosts({
      subredditName,
      limit: SCAN_LIMIT,
      pageSize: 100,
    });
    for await (const post of listing) {
      if (post.authorName && post.authorName !== '[deleted]') {
        authors.add(post.authorName);
      }
    }
    for (const author of authors) {
      const reviews = await getUserReviews(author);
      if (reviews.length === 0) continue;
      await indexUserReviews(author, reviews);
      await indexRater(author, reviews);
    }
    await redis.set(DONE_KEY, String(Date.now()));
  } finally {
    await redis.del(LOCK_KEY);
  }
};
