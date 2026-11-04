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

/** e.g. "just now", "5m ago", "3h ago", "2d ago", then the date. */
export const timeAgo = (ms: number, now = Date.now()) => {
  const minutes = Math.floor((now - ms) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(ms);
};
