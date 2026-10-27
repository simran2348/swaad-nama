import { context, reddit, redis } from '@devvit/web/server';

const HUB_POST_KEY = 'hub:postId';

/** Post ids come as `t3_abc123`; URLs use just `abc123`. */
export const postUrl = (postId: string) =>
  `https://reddit.com/r/${context.subredditName}/comments/${postId.replace(/^t3_/, '')}`;

/** Creates the main SwaadNama post that hosts the splash screen. */
export const createHubPost = async () => {
  const post = await reddit.submitCustomPost({
    title: 'SwaadNama',
  });
  await redis.set(HUB_POST_KEY, post.id);
  return post;
};

/** Returns the existing hub post id, if one was already created for this install. */
export const getHubPostId = async (): Promise<string | undefined> =>
  redis.get(HUB_POST_KEY);
