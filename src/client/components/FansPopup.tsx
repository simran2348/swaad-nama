import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchFans, fetchFavourites } from '../lib/api';
import { timeAgo } from '../lib/format';
import { riseDelay } from '../lib/motion';
import { CloseIcon, HeartIcon } from './icons';
import { RaterAvatar } from './RaterAvatar';
import { FavouriteBadge } from './RecentRaters';
import { EmptyState, LoadingState } from './ui';

type Person = { username: string; avatarUrl: string | null; detail: string };

type Result = { ok: true; people: Person[] } | { ok: false; error: string };

/** The two lists this popup shows. */
const LISTS = {
  fans: {
    title: 'Fans',
    empty: 'No one has added you to their favourites yet.',
    // Opening it marks them as seen (on the server).
    load: async (): Promise<Person[]> =>
      (await fetchFans()).fans.map((fan) => ({
        username: fan.username,
        avatarUrl: fan.avatarUrl,
        detail: timeAgo(fan.at),
      })),
  },
  favs: {
    title: 'Favs',
    empty: "You haven't added anyone to your favourites yet.",
    load: async (): Promise<Person[]> =>
      (await fetchFavourites()).users.map((user) => ({
        username: user.username,
        avatarUrl: user.avatarUrl,
        detail: `${user.count} ${user.count === 1 ? 'rating' : 'ratings'}`,
      })),
  },
} as const;

/**
 * Popup over a dark backdrop, newest first: your fans (people who added you
 * to their favourites) or your favs (people you added). Tap someone to see
 * their journal.
 */
export const FansPopup = ({
  list,
  onClose,
  onOpenUser,
}: {
  list: keyof typeof LISTS;
  onClose: () => void;
  /** Tap someone to see their journal. */
  onOpenUser: (username: string) => void;
}) => {
  const [result, setResult] = useState<Result>();
  const { title, empty, load } = LISTS[list];

  useEffect(() => {
    let cancelled = false;
    load()
      .then((people) => !cancelled && setResult({ ok: true, people }))
      .catch((err: Error) => {
        if (!cancelled) setResult({ ok: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Escape closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="modal-backdrop fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-panel flex max-h-[min(32rem,100%)] min-h-0 w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-line bg-popover shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
            <HeartIcon className="h-5 w-5 fill-current text-red-500" />
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-soft text-soft-ink cursor-pointer hover:brightness-95"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="scroll-area min-h-0 flex-1 px-2 pb-3">
          {!result ? (
            <LoadingState />
          ) : !result.ok ? (
            <EmptyState>
              Couldn't load your {title.toLowerCase()}: {result.error}
            </EmptyState>
          ) : result.people.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">{empty}</p>
          ) : (
            <ul className="flex flex-col">
              {result.people.map((fan, i) => (
                <li key={fan.username} className="rise" style={riseDelay(i)}>
                  <button
                    type="button"
                    onClick={() => onOpenUser(fan.username)}
                    aria-label={`See u/${fan.username}'s journal`}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left cursor-pointer transition-colors hover:bg-soft"
                  >
                    <span className="relative shrink-0">
                      <RaterAvatar url={fan.avatarUrl} />
                      {/* Fans you've also added to your favourites. */}
                      {list === 'fans' && (
                        <FavouriteBadge small username={fan.username} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                      {fan.username}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {fan.detail}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
