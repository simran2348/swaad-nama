/** e.g. "27 Oct 2026" in the viewer's locale. */
export const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** Opens a post on Reddit from its id (`abc123` or `t3_abc123`). */
export const redditPostUrl = (postId: string) =>
  `https://www.reddit.com/comments/${postId.replace(/^t3_/, '')}`;
