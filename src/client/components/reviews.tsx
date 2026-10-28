import { useEffect, useState, type ReactNode } from 'react';
import type { UserReviewsResponse } from '../../shared/api';
import { rankRatings } from '../../shared/food';
import { fetchUserReviews } from '../lib/api';
import { riseDelay } from '../lib/motion';
import { Medal } from './decor';
import { PlateIcon } from './icons';
import { EmptyState, LoadingState } from './ui';

export type RankedRow = {
  key: string;
  place: string;
  /** The user's rating, out of 10. */
  rating: number;
  detail?: string | undefined;
  image?: string | undefined;
  onClick?: () => void;
};

/** Score bar colour for gold, silver and bronze; the rest are grey. */
const BAR_COLORS: Record<number, string> = {
  1: 'bg-amber-400',
  2: 'bg-slate-400',
  3: 'bg-orange-400',
};

/** Place number: a medal for the top three, else a plain circle. */
const RankBadge = ({ rank }: { rank: number }) =>
  rank <= 3 ? (
    <Medal rank={rank} className="h-12 w-9 drop-shadow-sm" />
  ) : (
    <span
      aria-label={`Place ${rank}`}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-soft text-sm font-bold text-muted"
    >
      {rank}
    </span>
  );

/**
 * Ranking, best first (rows must be sorted by rating). Equal ratings share
 * a place, so ties get the same medal.
 */
export const RankedList = ({ rows }: { rows: RankedRow[] }) => {
  const ranks = rankRatings(rows.map((row) => row.rating));
  return (
    <ol className="flex flex-col gap-2.5">
      {rows.map((row, i) => {
        const rank = ranks[i] ?? i + 1;
        const content = (
          <>
            <span className="flex w-10 shrink-0 justify-center">
              <RankBadge rank={rank} />
            </span>
            {row.image ? (
              <img
                src={row.image}
                alt=""
                className="h-16 w-16 shrink-0 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-cta/15 text-cta">
                <PlateIcon className="h-7 w-7" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate font-bold text-ink">
                  {row.place}
                </span>
                <span className="shrink-0 text-sm font-extrabold text-ink">
                  {row.rating.toFixed(1)}
                  <span className="text-xs font-semibold text-muted">/10</span>
                </span>
              </span>
              {row.detail && (
                <span className="mt-0.5 block truncate text-xs text-muted">
                  {row.detail}
                </span>
              )}
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-line">
                <span
                  className={`bar-grow block h-full rounded-full ${
                    BAR_COLORS[rank] ?? 'bg-neutral-300 dark:bg-neutral-500'
                  }`}
                  style={{ width: `${row.rating * 10}%`, ...riseDelay(i) }}
                />
              </span>
            </span>
          </>
        );
        const rowClass = `flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left shadow-sm backdrop-blur ${
          rank === 1
            ? 'border-amber-300 bg-amber-50/90 dark:border-amber-400/40 dark:bg-amber-400/10'
            : 'border-line bg-surface'
        }`;
        return (
          <li key={row.key} className="rise" style={riseDelay(i)}>
            {row.onClick ? (
              <button
                onClick={row.onClick}
                className={`${rowClass} cursor-pointer transition hover:-translate-y-px hover:shadow-md`}
              >
                {content}
              </button>
            ) : (
              <div className={rowClass}>{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
};

type UserReviewsResult =
  { ok: true; data: UserReviewsResponse } | { ok: false; error: string };

/** Loads a user's reviews; `children` renders them once loaded. */
export const UserReviews = ({
  username,
  refreshKey = 0,
  children,
}: {
  username: string;
  /** Change to reload (e.g. after an edit). */
  refreshKey?: number;
  children: (data: UserReviewsResponse) => ReactNode;
}) => {
  const [result, setResult] = useState<{ for: string } & UserReviewsResult>();

  useEffect(() => {
    let cancelled = false;
    fetchUserReviews(username)
      .then(
        (data) => !cancelled && setResult({ for: username, ok: true, data })
      )
      .catch((err: Error) => {
        if (!cancelled)
          setResult({ for: username, ok: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [username, refreshKey]);

  const current = result?.for === username ? result : undefined;
  if (!current) return <LoadingState />;
  if (!current.ok) {
    return <EmptyState>Couldn't load: {current.error}</EmptyState>;
  }
  return <>{children(current.data)}</>;
};
