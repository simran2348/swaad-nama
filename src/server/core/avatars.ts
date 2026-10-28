import { reddit, redis } from '@devvit/web/server';

const AVATAR_CACHE_MS = 24 * 60 * 60 * 1000;

/**
 * A Redditor's Snoo avatar URL, or null if they have none. Cached for a day
 * so lists of people don't ask Reddit for every avatar on each open.
 */
export const getAvatarUrl = async (
  username: string
): Promise<string | null> => {
  const key = `avatar:v1:${username.toLowerCase()}`;
  const cached = await redis.get(key);
  // '' is cached too: it means "no avatar", so we don't keep asking.
  if (cached !== undefined) return cached || null;
  const url =
    (await reddit.getSnoovatarUrl(username).catch(() => undefined)) ?? '';
  await redis.set(key, url, {
    expiration: new Date(Date.now() + AVATAR_CACHE_MS),
  });
  return url || null;
};
