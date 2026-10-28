import type { MyPostsResponse } from '../../shared/api';

export type Post = MyPostsResponse['posts'][number];

/**
 * Posts loaded so far, per user ('' = you), kept for the app session so
 * switching tabs doesn't refetch them. Reopening the post starts fresh.
 */
export const postCache = new Map<
  string,
  { posts: Post[]; cursor: string | null }
>();

/** Drops your cached posts so My List reloads them (after a rating changes). */
export const forgetMyPosts = () => postCache.delete('');
