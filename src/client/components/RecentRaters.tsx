import { useEffect, useState } from 'react';
import type { RatersResponse } from '../../shared/api';
import { fetchRecentRaters } from '../lib/api';
import { riseDelay } from '../lib/motion';
import { track } from '../lib/track';
import { UsersIcon } from './icons';
import { RaterAvatar } from './RaterAvatar';

/** Last result, shown straight away while a fresh one loads. */
let recentCache: RatersResponse | null = null;

/**
 * People who rated something most recently, as a row of round Snoo avatars.
 * Tap one to see their ratings; "Show more" opens the full rater list.
 * Hidden when nobody has rated anything yet (or it fails).
 */
export const RecentRaters = ({
  refreshKey,
  onOpen,
  onShowMore,
}: {
  /** Change to reload (e.g. after a rating is added or removed). */
  refreshKey: number;
  onOpen: (username: string) => void;
  onShowMore: () => void;
}) => {
  const [data, setData] = useState(recentCache);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRecentRaters()
      .then((res) => {
        recentCache = res;
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        console.error('Recent raters failed', err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if ((failed && !data) || (data && data.raters.length === 0)) return null;

  return (
    <section aria-label="Recently rated" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
          <UsersIcon className="h-4 w-4 text-cta" />
          Recently rated
        </h2>
        <button
          type="button"
          onClick={onShowMore}
          className="rounded-full px-2 py-0.5 text-xs font-bold text-cta cursor-pointer hover:bg-cta/10"
        >
          Show more
        </button>
      </div>
      {/* Bleeds to the screen edges so people scroll in from the side. */}
      <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pt-1.5 pb-1">
        {!data
          ? [0, 1, 2, 3, 4].map((i) => (
              <li
                key={i}
                aria-hidden
                className="flex w-16 shrink-0 flex-col items-center gap-1.5"
              >
                <span className="h-14 w-14 animate-pulse rounded-full bg-soft" />
                <span className="h-2.5 w-12 animate-pulse rounded bg-soft" />
              </li>
            ))
          : data.raters.map((rater, i) => (
              <li
                key={rater.username}
                className="rise w-16 shrink-0 snap-start"
                style={riseDelay(i)}
              >
                <button
                  type="button"
                  onClick={() => {
                    track('rater_open');
                    onOpen(rater.username);
                  }}
                  aria-label={`See u/${rater.username}'s ratings`}
                  className="flex w-full flex-col items-center gap-1.5 cursor-pointer transition hover:-translate-y-0.5"
                >
                  <RaterAvatar
                    url={rater.avatarUrl}
                    className="h-14 w-14 ring-2 ring-cta/50"
                  />
                  <span className="w-full truncate text-center text-[11px] font-semibold text-ink">
                    {rater.username}
                  </span>
                </button>
              </li>
            ))}
      </ul>
    </section>
  );
};
