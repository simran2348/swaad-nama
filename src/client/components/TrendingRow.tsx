import { useEffect, useState } from 'react';
import type { TrendingResponse } from '../../shared/api';
import { fetchTrending } from '../lib/api';
import { riseDelay } from '../lib/motion';
import { TrendingIcon, UpvoteIcon } from './icons';
import { PostViewer } from './PostViewer';

/** Loaded once per app session, so switching tabs doesn't refetch it. */
let trendingCache: TrendingResponse | null = null;

/** e.g. 950, 1.2k, 12k. */
const formatCount = (n: number) =>
  n < 1000
    ? String(n)
    : `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;

/** Heading for how far back the posts go. */
const windowLabel = (days: number) =>
  days <= 1
    ? 'Trending today'
    : days >= 7
      ? 'Trending this week'
      : `Trending, last ${days} days`;

const CARD = 'h-44 w-32 shrink-0 snap-start rounded-2xl';

/**
 * The last day's most upvoted and discussed posts, as a sideways-scrolling
 * row of photo cards. Hidden when there's nothing to show (or it fails).
 */
export const TrendingRow = () => {
  const [data, setData] = useState(trendingCache);
  const [failed, setFailed] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    if (trendingCache) return;
    let cancelled = false;
    fetchTrending()
      .then((res) => {
        trendingCache = res;
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        console.error('Trending failed', err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || (data && data.posts.length === 0)) return null;

  return (
    <section
      aria-label={data ? windowLabel(data.days) : 'Trending'}
      className="flex flex-col gap-2"
    >
      <h2 className="flex items-center gap-1.5 px-1 text-sm font-extrabold text-ink">
        <TrendingIcon className="h-4 w-4 text-cta" />
        {data ? windowLabel(data.days) : 'Trending'}
        {data && (
          <span className="font-semibold text-muted">
            in r/{data.subredditName}
          </span>
        )}
      </h2>
      {/* Bleeds to the screen edges so cards scroll in from the side. */}
      <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
        {!data
          ? [0, 1, 2].map((i) => (
              <li
                key={i}
                aria-hidden
                className={`${CARD} animate-pulse bg-soft`}
              />
            ))
          : data.posts.map((post, i) => (
              <li
                key={post.postId}
                className={`rise ${CARD}`}
                style={riseDelay(i)}
              >
                <button
                  onClick={() => setViewing(post.postId)}
                  aria-label={`${post.title}, by u/${post.author}, ${post.score} upvotes`}
                  className="relative isolate block h-full w-full transform-gpu overflow-hidden rounded-2xl bg-black text-left shadow-md cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <img
                    src={post.image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {/* Shade so the text stays readable on bright photos. */}
                  <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-2.5 text-white">
                    <span className="truncate text-xs font-bold [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">
                      u/{post.author}
                    </span>
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-extrabold backdrop-blur-sm">
                      <UpvoteIcon className="h-3 w-3" />
                      {formatCount(post.score)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
      </ul>
      {viewing && (
        <PostViewer postId={viewing} onClose={() => setViewing(null)} />
      )}
    </section>
  );
};
