import { useEffect, useState, type ReactNode } from 'react';
import type { UserReviewsResponse } from '../../shared/api';
import { tierFor } from '../../shared/food';
import { fetchUserReviews } from '../lib/api';
import { riseDelay } from '../lib/motion';
import { TIER_COLORS } from '../lib/tiers';
import { EmptyState, LoadingState } from './ui';

const CARD = 'rounded-xl border border-line bg-surface backdrop-blur';

export type RankedRow = {
  key: string;
  place: string;
  /** The user's rating, out of 10. */
  rating: number;
  detail?: string | undefined;
  image?: string | undefined;
  onClick?: () => void;
};

/** Numbered ranking with tier badges and photo thumbnails. */
export const RankedList = ({ rows }: { rows: RankedRow[] }) => (
  <ol className="flex flex-col gap-1.5">
    {rows.map((row, i) => {
      const tier = tierFor(row.rating);
      const content = (
        <>
          <span className="w-5 shrink-0 text-right text-sm font-semibold text-muted">
            {i + 1}
          </span>
          {row.image ? (
            <img
              src={row.image}
              alt=""
              className="h-11 w-11 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cta/15 text-lg">
              🍽️
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-ink">
              {row.place}
            </span>
            {row.detail && (
              <span className="block truncate text-xs text-muted">
                {row.detail}
              </span>
            )}
          </span>
          <span className="text-right text-sm font-extrabold text-ink">
            {row.rating.toFixed(1)}
            <span className="text-xs font-semibold text-muted">/10</span>
          </span>
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded font-bold text-white ${TIER_COLORS[tier]}`}
          >
            {tier}
          </span>
        </>
      );
      const rowClass = `flex w-full items-center gap-3 ${CARD} p-2 text-left`;
      return (
        <li key={row.key} className="rise" style={riseDelay(i)}>
          {row.onClick ? (
            <button
              onClick={row.onClick}
              className={`${rowClass} cursor-pointer hover:bg-soft transition-colors`}
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
