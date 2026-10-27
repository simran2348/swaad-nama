import { useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MyPostsResponse } from '../../shared/api';
import { tierFor } from '../../shared/food';
import { fetchMyPosts } from '../lib/api';
import { ImportWizard } from './ImportWizard';
import { EMPTY_LIST_IMAGE, useImageLoaded } from '../lib/art';
import { formatDate } from '../lib/format';
import { riseDelay } from '../lib/motion';
import { NAV_HEIGHT, NavSlotContext } from '../lib/navSlot';
import { TIER_COLORS } from '../lib/tiers';
import { PostViewer } from './PostViewer';
import { EmptyMascot } from './EmptyMascot';
import { MinusIcon, PlusIcon } from './icons';
import { Photo } from './Photo';
import { EmptyState, LoadingState } from './ui';

type Post = MyPostsResponse['posts'][number];

/**
 * Posts loaded so far, per user ('' = you), kept for the app session so
 * switching tabs doesn't refetch them. Reopening the post starts fresh.
 */
const postCache = new Map<string, { posts: Post[]; cursor: string | null }>();

/**
 * Posts in this subreddit, a page at a time (shown in My List). Your own
 * posts can be ticked and added to the tier list through a step-by-step
 * preview; another user's (`username`) are read-only. Lives inside a
 * scrolling container; the action bar sticks to its bottom.
 */
export const PostPicker = ({
  foods,
  onAdded,
  username,
}: {
  foods: string[];
  onAdded: () => void;
  /** View this user's posts instead of your own. */
  username?: string;
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
  const [importing, setImporting] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  // Preloaded so the empty state never shows before its picture.
  const imageReady = useImageLoaded(EMPTY_LIST_IMAGE.src);

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

  const toggle = (postId: string) =>
    setSelected((ids) =>
      ids.includes(postId)
        ? ids.filter((id) => id !== postId)
        : [...ids, postId]
    );

  return (
    <section className="flex flex-1 flex-col gap-2">
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
                  post.image ? 'bg-black' : 'bg-neutral-200 dark:bg-neutral-800'
                }`}
              >
                {post.image ? (
                  <Photo src={post.image} />
                ) : (
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center pb-10 text-5xl"
                  >
                    🍽️
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
                  <button
                    onClick={() => toggle(post.postId)}
                    aria-pressed={checked}
                    aria-label={
                      checked
                        ? `Remove "${post.title}" from selection`
                        : `Add "${post.title}" to tier`
                    }
                    className={`absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-md ring-[1.5px] ring-white/90 backdrop-blur-sm transition-all duration-300 ease-out cursor-pointer hover:scale-110 active:scale-85 ${
                      checked ? 'rotate-180 bg-red-500' : 'bg-black/55'
                    }`}
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
                )
              )}
            </li>
          );
        })}
      </ul>
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
        navSlot &&
        createPortal(
          <div className="pointer-events-auto h-full border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] backdrop-blur">
            <div className={`rise flex ${NAV_HEIGHT} items-center gap-3 px-4`}>
              <button
                onClick={() => setSelected([])}
                className="text-sm font-semibold text-muted cursor-pointer hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={() => setImporting(true)}
                className="flex-1 rounded-full bg-cta px-4 py-2.5 font-bold text-cta-ink shadow-md cursor-pointer hover:brightness-95 transition"
              >
                Add {selected.length} to tier →
              </button>
            </div>
          </div>,
          navSlot
        )}

      {importing && (
        <ImportWizard
          postIds={selected}
          foods={foods}
          onCancel={() => setImporting(false)}
          onDone={(added) => {
            setImporting(false);
            setSelected([]);
            const ratings = new Map(added.map((a) => [a.postId, a.rating]));
            setPosts((prev) =>
              prev.map((p) => ({
                ...p,
                rating: ratings.get(p.postId) ?? p.rating,
              }))
            );
            onAdded();
          }}
        />
      )}
    </section>
  );
};
