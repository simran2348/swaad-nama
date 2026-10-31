import { useEffect, useState } from 'react';
import type { RaterCard as Rater } from '../../shared/api';
import { fetchTopRaters, searchRater } from '../lib/api';
import { riseDelay } from '../lib/motion';
import { track } from '../lib/track';
import { RaterAvatar } from './RaterAvatar';
import { BackButton, EmptyState, LoadingState } from './ui';
import { UserSearch } from './UserSearch';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** Last top list, shown straight away while a fresh one loads. */
let topCache: Rater[] | null = null;

/** One person: avatar, username and how many foods they've rated. */
const RaterCard = ({
  rater,
  index,
  onOpen,
}: {
  rater: Rater;
  index: number;
  onOpen: (username: string) => void;
}) => (
  <li className="rise" style={riseDelay(index)}>
    <button
      type="button"
      onClick={() => {
        track('rater_open');
        onOpen(rater.username);
      }}
      aria-label={`u/${rater.username}: ${rater.count} items rated`}
      className="flex w-full flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-2 pt-4 pb-3 text-center shadow-sm backdrop-blur cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <RaterAvatar
        url={rater.avatarUrl}
        className="h-16 w-16 ring-2 ring-cta/40"
      />
      <span className="w-full truncate text-sm font-bold text-ink">
        {rater.username}
      </span>
      <span className="rounded-full bg-cta/15 px-2.5 py-0.5 text-xs font-bold text-cta">
        {rater.count} {rater.count === 1 ? 'item' : 'items'} rated
      </span>
    </button>
  </li>
);

/**
 * Everyone who rates here, most ratings first (top 20), with a search to
 * find anyone else. Tap a card to see that person's ratings.
 */
export const RatersScreen = ({
  refreshKey,
  onBack,
  onOpen,
}: {
  refreshKey: number;
  onBack: () => void;
  onOpen: (username: string) => void;
}) => {
  const [top, setTop] = useState<Result<Rater[]> | null>(
    topCache ? { ok: true, data: topCache } : null
  );
  const [query, setQuery] = useState<string | null>(null);
  const [found, setFound] = useState<{ for: string } & Result<Rater>>();

  useEffect(() => {
    let cancelled = false;
    fetchTopRaters()
      .then((res) => {
        topCache = res.raters;
        if (!cancelled) setTop({ ok: true, data: res.raters });
      })
      .catch((err: Error) => {
        if (!cancelled && !topCache) setTop({ ok: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    searchRater(query)
      .then((res) => {
        if (!cancelled) setFound({ for: query, ok: true, data: res.rater });
      })
      .catch((err: Error) => {
        if (!cancelled) setFound({ for: query, ok: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const search = query && found?.for === query ? found : undefined;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <section className="flex shrink-0 items-start gap-1.5 px-3 pt-3">
        <BackButton onClick={onBack} />
        <div className="min-w-0 pt-0.5">
          <h1 className="truncate text-xl leading-tight font-extrabold text-ink">
            Top raters
          </h1>
          <p className="truncate text-sm text-muted">
            The people who've rated the most
          </p>
        </div>
      </section>
      <main className="scroll-area flex flex-1 flex-col gap-4 px-4 pt-3 pb-6">
        <UserSearch
          user={query}
          onSearch={setQuery}
          onClear={() => setQuery(null)}
          placeholder="Find a Redditor"
        />
        {query ? (
          !search ? (
            <LoadingState />
          ) : !search.ok ? (
            <EmptyState>{search.error}</EmptyState>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              <RaterCard rater={search.data} index={0} onOpen={onOpen} />
            </ul>
          )
        ) : !top ? (
          <LoadingState />
        ) : !top.ok ? (
          <EmptyState>Couldn't load raters: {top.error}</EmptyState>
        ) : top.data.length === 0 ? (
          <EmptyState>Nobody has rated anything yet.</EmptyState>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {top.data.map((rater, i) => (
              <RaterCard
                key={rater.username}
                rater={rater}
                index={i}
                onOpen={onOpen}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};
