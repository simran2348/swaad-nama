import { useCallback, useEffect, useState } from 'react';
import type { MyPostsResponse } from '../../shared/api';
import { tierFor } from '../../shared/food';
import { fetchMyPosts } from '../lib/api';
import { ImportWizard } from './ImportWizard';
import { EMPTY_LIST_IMAGE, useImageLoaded } from '../lib/art';
import { formatDate } from '../lib/format';
import { riseDelay } from '../lib/motion';
import { TIER_COLORS } from '../lib/tiers';
import { PostViewer } from './PostViewer';
import { EmptyMascot } from './EmptyMascot';
import { EmptyState, LoadingState } from './ui';

type Post = MyPostsResponse['posts'][number];

/**
 * Posts in this subreddit, a page at a time (shown in My List). Your own
 * posts can be ticked and added to the tier list through a step-by-step
 * preview; another user's (`username`) are read-only. Lives inside a
 * scrolling container; the action bar sticks to its bottom.
 */
export const PostPicker = ({
  subredditName,
  foods,
  onAdded,
  username,
}: {
  subredditName: string;
  foods: string[];
  onAdded: () => void;
  /** View this user's posts instead of your own. */
  username?: string;
}) => {
  const own = !username;
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    let cancelled = false;
    fetchMyPosts(undefined, username)
      .then((res) => !cancelled && applyPage(res, false))
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [applyPage, username]);

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
      {/* Hidden when empty so the empty state sits centred on its own. */}
      <div
        className={`px-1 ${!loading && !error && posts.length === 0 ? 'hidden' : ''}`}
      >
        <h2 className="font-extrabold text-ink">
          {own ? 'Your posts' : `u/${username}'s posts`}
          {subredditName && (
            <span className="font-semibold text-muted">
              {' '}
              in r/{subredditName}
            </span>
          )}
        </h2>
        {own && posts.length > 0 && (
          <p className="text-xs text-muted">
            Tap a post to view it. Tick posts to add them to your tier list.
          </p>
        )}
      </div>
      <ul className="flex flex-col gap-4">
        {posts.map((post, i) => {
          const checked = selected.includes(post.postId);
          const selectable = own && post.rating === null;
          const tier = post.rating === null ? null : tierFor(post.rating);
          return (
            // Photo card: the photo fills the back, offset right so the
            // title sticker can hang off its bottom-left corner.
            <li
              key={post.postId}
              style={riseDelay(i, 5)}
              className="rise relative pb-5"
            >
              <button
                onClick={() => setViewing(post.postId)}
                aria-label={`View "${post.title}"`}
                className="block w-full text-left cursor-pointer"
              >
                <span
                  className={`ml-4 flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-cta/15 shadow-md transition ${
                    checked ? 'ring-4 ring-cta' : ''
                  }`}
                >
                  {post.image ? (
                    <img
                      src={post.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span aria-hidden className="text-5xl">
                      🍽️
                    </span>
                  )}
                </span>
                <span className="absolute bottom-0 left-0 flex max-w-[85%] flex-col rounded-xl border border-line bg-field px-3.5 py-2.5 shadow-lg">
                  <span className="truncate text-sm font-bold text-ink">
                    {post.title}
                  </span>
                  <span className="text-xs text-muted">
                    {formatDate(post.postedAt)}
                  </span>
                </span>
              </button>

              {/* Only your unrated posts can be ticked; rated ones lose the box. */}
              {selectable && (
                <label className="absolute top-2.5 left-6.5 flex h-8 w-8 items-center justify-center rounded-lg bg-black/45 backdrop-blur-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(post.postId)}
                    aria-label={`Select "${post.title}"`}
                    className="h-5 w-5 cursor-pointer accent-[var(--cta)]"
                  />
                </label>
              )}
              {tier && (
                <span
                  title={`${tier} tier`}
                  className={`pointer-events-none absolute top-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-lg text-lg font-extrabold text-white shadow-lg ring-2 ring-white/80 ${TIER_COLORS[tier]}`}
                >
                  {tier}
                </span>
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

      {selected.length > 0 && (
        <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-line bg-surface px-4 py-3 backdrop-blur">
          <button
            onClick={() => setSelected([])}
            className="text-sm font-semibold text-muted cursor-pointer hover:text-ink"
          >
            Clear
          </button>
          <button
            onClick={() => setImporting(true)}
            className="flex-1 rounded-full bg-cta px-4 py-2.5 font-bold text-cta-ink shadow-md cursor-pointer hover:brightness-95 transition"
          >
            Add {selected.length} to tier →
          </button>
        </div>
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
