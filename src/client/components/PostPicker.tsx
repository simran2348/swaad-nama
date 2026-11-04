import { useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { JournalKind, MyPostsResponse } from '../../shared/api';
import { tierFor } from '../../shared/food';
import { fetchMyPosts } from '../lib/api';
import { ImportWizard } from './ImportWizard';
import { JournalWizard } from './JournalWizard';
import { ratingJourney, track } from '../lib/track';
import { EMPTY_LIST_IMAGE, useImageLoaded } from '../lib/art';
import { formatDate } from '../lib/format';
import { postCache, type Post } from '../lib/postCache';
import { riseDelay } from '../lib/motion';
import { NAV_HEIGHT, NavSlotContext } from '../lib/navSlot';
import { TIER_COLORS } from '../lib/tiers';
import { POST_LIST_STYLE } from '../lib/features';
import { PostViewer } from './PostViewer';
import { EmptyMascot } from './EmptyMascot';
import {
  ArrowRightIcon,
  BookIcon,
  CheckIcon,
  MinusIcon,
  PlateIcon,
  PlusIcon,
} from './icons';
import { Photo } from './Photo';
import { EmptyState, LoadingState } from './ui';

/** Round + / − on a post's photo that adds it to (or drops it from) the picks. */
const SelectToggle = ({
  title,
  checked,
  onToggle,
  className,
}: {
  title: string;
  checked: boolean;
  onToggle: () => void;
  className: string;
}) => (
  <button
    onClick={onToggle}
    aria-pressed={checked}
    aria-label={
      checked ? `Remove "${title}" from selection` : `Add "${title}" to tier`
    }
    className={`flex h-6 w-6 items-center justify-center rounded-full text-white shadow-md ring-[1.5px] ring-white/90 backdrop-blur-sm transition-all duration-300 ease-out cursor-pointer hover:scale-110 active:scale-85 ${
      checked ? 'rotate-180 bg-red-500' : 'bg-black/55'
    } ${className}`}
  >
    {/* Both icons stay mounted so they can cross-fade. */}
    <PlusIcon
      className={`absolute h-3.5 w-3.5 transition-all duration-300 ${
        checked ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
      }`}
    />
    <MinusIcon
      className={`absolute h-3.5 w-3.5 transition-all duration-300 ${
        checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
      }`}
    />
  </button>
);

/**
 * Posts in this subreddit, a page at a time (shown in My List). Your own
 * posts can be ticked and added to the tier list through a step-by-step
 * preview; another user's (`username`) are read-only. Lives inside a
 * scrolling container; the action bar sticks to its bottom.
 */
export const PostPicker = ({
  foods,
  onAdded,
  onJournaled,
  username,
  onEmptyChange,
}: {
  foods: string[];
  onAdded: () => void;
  /** A post was added to your journal, in this section. */
  onJournaled?: (section: JournalKind) => void;
  /** View this user's posts instead of your own. */
  username?: string;
  /** Whether the list loaded with no posts in it. */
  onEmptyChange?: (empty: boolean) => void;
}) => {
  const own = !username;
  const navSlot = useContext(NavSlotContext);
  const cacheKey = username ?? '';
  const cached = postCache.get(cacheKey);
  const [posts, setPosts] = useState<Post[]>(cached?.posts ?? []);
  const [cursor, setCursor] = useState<string | null>(cached?.cursor ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  // Posts open in the rating form: your picks, or one from its own button.
  const [importIds, setImportIds] = useState<string[] | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  // The post being added to your journal.
  const [journalId, setJournalId] = useState<string | null>(null);
  // Preloaded so the empty state never shows before its picture.
  const imageReady = useImageLoaded(EMPTY_LIST_IMAGE.src);
  const empty = !loading && !error && posts.length === 0;
  useEffect(() => onEmptyChange?.(empty), [empty, onEmptyChange]);

  const applyPage = useCallback((res: MyPostsResponse, append: boolean) => {
    setPosts((prev) => (append ? [...prev, ...res.posts] : res.posts));
    setCursor(res.nextCursor);
    setError(null);
  }, []);

  // Keep the cache in step with what's shown (new pages, fresh ratings).
  useEffect(() => {
    if (!loading && !error) postCache.set(cacheKey, { posts, cursor });
  }, [cacheKey, posts, cursor, loading, error]);

  useEffect(() => {
    if (postCache.has(cacheKey)) return;
    let cancelled = false;
    fetchMyPosts(undefined, username)
      .then((res) => !cancelled && applyPage(res, false))
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [applyPage, username, cacheKey]);

  const loadMore = (after: string) => {
    setLoading(true);
    fetchMyPosts(after, username)
      .then((res) => applyPage(res, true))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const toggle = (postId: string) => {
    // The first pick starts the add flow (for the Admin funnel).
    if (selected.length === 0) track('add_select');
    setSelected((ids) =>
      ids.includes(postId)
        ? ids.filter((id) => id !== postId)
        : [...ids, postId]
    );
  };

  return (
    <section className="flex flex-1 flex-col gap-2">
      {POST_LIST_STYLE === 'rows' ? (
        // Rows: a photo like the Trending cards, then the title, date and
        // the Add to rating / Journal buttons.
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {posts.map((post, i) => {
            const tier = post.rating === null ? null : tierFor(post.rating);
            const checked = selected.includes(post.postId);
            const view = () => setViewing(post.postId);
            return (
              <li
                key={post.postId}
                style={riseDelay(i, 5)}
                // Tapping anywhere on the row opens the post; the action
                // buttons stop their taps from reaching it.
                onClick={view}
                className="rise flex gap-3 rounded-2xl bg-surface p-2.5 shadow-sm backdrop-blur cursor-pointer"
              >
                <div className="relative shrink-0">
                  <button
                    aria-label={`View "${post.title}"`}
                    className={`relative isolate h-28 w-24 shrink-0 transform-gpu overflow-hidden rounded-xl shadow-md cursor-pointer transition hover:-translate-y-0.5 ${
                      post.image
                        ? 'bg-black'
                        : 'bg-neutral-200 dark:bg-neutral-800'
                    }`}
                  >
                    {post.image ? (
                      <img
                        src={post.image}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <PlateIcon className="h-9 w-9 text-neutral-400" />
                      </span>
                    )}
                  </button>
                </div>
                <div className="flex min-w-0 flex-1 flex-col py-0.5">
                  <span className="line-clamp-2 text-sm leading-snug font-bold text-ink">
                    {post.title}
                  </span>
                  <span className="mt-1 text-xs text-muted">
                    {formatDate(post.postedAt)}
                  </span>
                  {own && (
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      {tier ? (
                        <span className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-soft px-3 py-1.5 text-xs font-bold text-soft-ink">
                          Rated
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold text-white ${TIER_COLORS[tier]}`}
                          >
                            {tier}
                          </span>
                        </span>
                      ) : (
                        // Picks the post (outline → solid); "Add N to tier"
                        // in the bar below rates everything picked.
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(post.postId);
                          }}
                          aria-pressed={checked}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-full border-[1.5px] border-cta px-3 py-1.5 text-xs font-bold cursor-pointer transition ${
                            checked
                              ? 'bg-cta text-cta-ink shadow-sm hover:brightness-95'
                              : 'text-cta hover:bg-cta/10'
                          }`}
                        >
                          {checked ? (
                            <CheckIcon className="h-3.5 w-3.5" />
                          ) : (
                            <PlusIcon className="h-3.5 w-3.5" />
                          )}
                          {checked ? 'Selected' : 'Add to rating'}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setJournalId(post.postId);
                        }}
                        aria-label={`Add "${post.title}" to your journal`}
                        title="Journal"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cta text-cta-ink shadow-sm cursor-pointer transition hover:brightness-95"
                      >
                        <BookIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        // The older grid (POST_LIST_STYLE = 'grid'), kept to switch back to.
        <>
          {/* One card per row on phones, two on wider screens. */}
          <ul className="grid grid-cols-1 gap-4 px-2 sm:grid-cols-2">
            {posts.map((post, i) => {
              const checked = selected.includes(post.postId);
              const selectable = own && post.rating === null;
              const tier = post.rating === null ? null : tierFor(post.rating);
              return (
                // Photo card: the cover photo fills the card, with the title
                // and date on a theme-coloured band along the bottom.
                <li
                  key={post.postId}
                  style={riseDelay(i, 5)}
                  className="rise relative"
                >
                  <button
                    onClick={() => setViewing(post.postId)}
                    aria-label={`View "${post.title}"`}
                    className={`relative isolate block h-40 w-full transform-gpu overflow-hidden rounded-2xl text-left shadow-lg shadow-black/15 cursor-pointer sm:h-44 ${
                      post.image
                        ? 'bg-black'
                        : 'bg-neutral-200 dark:bg-neutral-800'
                    }`}
                  >
                    {post.image ? (
                      <Photo src={post.image} />
                    ) : (
                      <span
                        aria-hidden
                        className="absolute inset-0 flex items-center justify-center pb-10 text-5xl"
                      >
                        <PlateIcon className="h-12 w-12 text-neutral-400" />
                      </span>
                    )}
                    <span className="absolute -inset-x-px -bottom-px flex flex-col rounded-b-2xl bg-white/95 px-3.5 py-2.5 text-neutral-900 dark:bg-neutral-900/95 dark:text-white">
                      <span className="truncate text-sm font-bold">
                        {post.title}
                      </span>
                      <span className="text-xs opacity-70">
                        {formatDate(post.postedAt)}
                      </span>
                    </span>
                  </button>

                  {/* Top right: the tier once rated, otherwise (your own posts
                    only) a plus that toggles the post into the selection. */}
                  {tier ? (
                    <span
                      title={`${tier} tier`}
                      className={`pointer-events-none absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold text-white shadow-lg ring-[1.5px] ring-white/80 ${TIER_COLORS[tier]}`}
                    >
                      {tier}
                    </span>
                  ) : (
                    selectable && (
                      <SelectToggle
                        title={post.title}
                        checked={checked}
                        onToggle={() => toggle(post.postId)}
                        className="absolute top-2 right-2"
                      />
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {viewing && (
        <PostViewer postId={viewing} onClose={() => setViewing(null)} />
      )}

      {error ? (
        <EmptyState>Couldn't load your posts: {error}</EmptyState>
      ) : loading || (posts.length === 0 && !imageReady) ? (
        <LoadingState label="Loading your posts…" />
      ) : posts.length === 0 ? (
        <EmptyMascot
          {...EMPTY_LIST_IMAGE}
          alt="Sad veggies at an empty table"
          title="The table is empty!"
        >
          {own
            ? 'No food posts yet. Start the feast by sharing your first post.'
            : `No food posts from u/${username} yet.`}
        </EmptyMascot>
      ) : cursor ? (
        <button
          onClick={() => loadMore(cursor)}
          className="mx-auto my-2 rounded-full border border-line bg-soft px-5 py-2 text-sm font-bold text-soft-ink cursor-pointer hover:brightness-95 transition"
        >
          Load more
        </button>
      ) : (
        <p className="py-3 text-center text-xs text-muted">
          {own
            ? "That's all your posts here."
            : `That's all of u/${username}'s posts here.`}
        </p>
      )}

      {/* Covers the bottom nav (same height) while posts are picked. */}
      {selected.length > 0 &&
        importIds === null &&
        navSlot &&
        createPortal(
          <div className="pointer-events-auto h-full rounded-t-3xl border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] backdrop-blur">
            <div className={`rise flex ${NAV_HEIGHT} items-center gap-3 px-4`}>
              <button
                onClick={() => setSelected([])}
                className="text-sm font-semibold text-muted cursor-pointer hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  track('add_start');
                  ratingJourney.start();
                  setImportIds(selected);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-cta px-4 py-2.5 font-bold text-cta-ink shadow-md cursor-pointer hover:brightness-95 transition"
              >
                Add {selected.length} to tier
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>,
          navSlot
        )}

      {journalId && (
        <JournalWizard
          postId={journalId}
          onCancel={() => setJournalId(null)}
          onDone={(section) => {
            setJournalId(null);
            onJournaled?.(section);
          }}
        />
      )}

      {importIds && (
        <ImportWizard
          postIds={importIds}
          foods={foods}
          onCancel={() => {
            ratingJourney.end(false);
            setImportIds(null);
          }}
          onDone={(added) => {
            if (added.length > 0) track('add_complete');
            ratingJourney.end(added.length > 0);
            setImportIds(null);
            // Rated posts leave the selection; other picks stay.
            setSelected((ids) => ids.filter((id) => !importIds.includes(id)));
            const ratings = new Map(added.map((a) => [a.postId, a.rating]));
            const next = posts.map((p) => ({
              ...p,
              rating: ratings.get(p.postId) ?? p.rating,
            }));
            setPosts(next);
            // Update the cache now: onAdded switches tabs, which unmounts
            // this list before the effect that syncs the cache can run.
            postCache.set(cacheKey, { posts: next, cursor });
            onAdded();
          }}
        />
      )}
    </section>
  );
};
