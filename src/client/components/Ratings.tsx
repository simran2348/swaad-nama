import { useEffect, useState } from 'react';
import type {
  CategoriesResponse,
  FoodCategory,
  FoodReview,
} from '../../shared/api';
import { normalizeName } from '../../shared/food';
import { fetchCategories } from '../lib/api';
import { riseDelay } from '../lib/motion';
import { ReviewViewer } from './ReviewViewer';
import { RankedList, UserReviews } from './reviews';
import { EMPTY_RATINGS_IMAGE, useImageLoaded } from '../lib/art';
import { EmptyMascot } from './EmptyMascot';
import { BackButton, EmptyState, LoadingState, ScreenHeader } from './ui';
import { Photo } from './Photo';
import { UserSearch } from './UserSearch';

type Result =
  { ok: true; data: CategoriesResponse } | { ok: false; error: string };

/** A category: its top-rated place's photo and the category name. */
const CategoryCard = ({
  category,
  index,
  onOpen,
}: {
  category: FoodCategory;
  index: number;
  onOpen: () => void;
}) => (
  <button
    onClick={onOpen}
    style={riseDelay(index)}
    className="rise relative isolate aspect-[4/5] transform-gpu overflow-hidden rounded-3xl bg-cta/15 text-left shadow-md cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg"
  >
    {category.top?.image ? (
      <Photo src={category.top.image} />
    ) : (
      <span className="absolute inset-0 flex items-center justify-center text-5xl">
        🍽️
      </span>
    )}
    {/* Light shade so the glass text stays readable on bright photos. */}
    <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent" />
    <span className="glass absolute inset-x-2 bottom-2 rounded-2xl px-3 py-2.5">
      <span className="line-clamp-2 text-lg font-extrabold leading-tight text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.35)]">
        {category.food}
      </span>
    </span>
  </button>
);

/** One user's places in a category, best first; tap a row for details. */
const UserCategoryRanking = ({
  username,
  food,
  editable,
  foods,
  refreshKey,
  onChanged,
}: {
  username: string;
  food: string;
  /** These are the viewer's own ratings. */
  editable: boolean;
  foods: string[];
  refreshKey: number;
  onChanged: () => void;
}) => {
  const [open, setOpen] = useState<FoodReview | null>(null);
  return (
    <UserReviews username={username} refreshKey={refreshKey}>
      {(res) => {
        const reviews = res.reviews
          .filter((r) => normalizeName(r.food) === normalizeName(food))
          .sort((a, b) => b.rating - a.rating);
        if (reviews.length === 0) {
          return <EmptyState>No {food} ratings yet.</EmptyState>;
        }
        return (
          <>
            <RankedList
              rows={reviews.map((r) => ({
                key: r.id,
                place: r.place,
                rating: r.rating,
                detail: r.title || undefined,
                image: r.images[0],
                onClick: () => setOpen(r),
              }))}
            />
            {open && (
              <ReviewViewer
                review={open}
                editable={editable}
                foods={foods}
                onClose={() => setOpen(null)}
                onChanged={onChanged}
              />
            )}
          </>
        );
      }}
    </UserReviews>
  );
};

/**
 * Tab 2: your food categories (each with your top-rated place's photo), or
 * a user's you search for. Tap a category to see its ranking. Nobody else's
 * ratings show unless you search for them.
 */
export const Ratings = ({ foods }: { foods: string[] }) => {
  const [user, setUser] = useState<string | null>(null);
  // Bumped after an edit/delete to reload categories and rankings.
  const [version, setVersion] = useState(0);
  const [category, setCategory] = useState<string | null>(null);
  const [result, setResult] = useState<{ for: string | null } & Result>();
  // Preloaded so the empty state never shows before its picture.
  const imageReady = useImageLoaded(EMPTY_RATINGS_IMAGE.src);

  useEffect(() => {
    let cancelled = false;
    fetchCategories(user ?? undefined)
      .then((data) => !cancelled && setResult({ for: user, ok: true, data }))
      .catch((err: Error) => {
        if (!cancelled) setResult({ for: user, ok: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [user, version]);

  const current = result?.for === user ? result : undefined;
  // Whose ratings are on screen: the searched user, else you.
  const owner = current?.ok ? current.data.username : user;
  const isOwn = user === null;
  const whose = isOwn ? 'Your' : `u/${owner ?? user}'s`;

  if (category) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <ScreenHeader
          title={category}
          subtitle={`${whose} ratings`}
          left={<BackButton onClick={() => setCategory(null)} />}
        />
        <main className="scroll-area flex flex-1 flex-col gap-3 px-4 pt-3 pb-6">
          {owner && (
            <UserCategoryRanking
              username={owner}
              food={category}
              editable={isOwn}
              foods={foods}
              refreshKey={version}
              onChanged={() => setVersion((v) => v + 1)}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ScreenHeader
        title="Ratings"
        subtitle={`${whose} top spots by category`}
      />
      <main className="scroll-area flex flex-1 flex-col gap-3 px-4 pt-3 pb-6">
        <UserSearch
          user={isOwn ? null : (owner ?? user)}
          onSearch={(name) => {
            setUser(name);
            setCategory(null);
          }}
          onClear={() => setUser(null)}
          placeholder="See a Redditor's ratings"
        />
        {!current ||
        (current.ok && current.data.categories.length === 0 && !imageReady) ? (
          <LoadingState />
        ) : !current.ok ? (
          <EmptyState>Couldn't load: {current.error}</EmptyState>
        ) : current.data.categories.length === 0 ? (
          <EmptyMascot
            {...EMPTY_RATINGS_IMAGE}
            alt="A sad broccoli next to an empty list"
            title="No categories in your list yet!"
          >
            {isOwn
              ? owner
                ? 'Add one from your food list to start sharing your ratings and reviews!'
                : 'Log in to see your ratings.'
              : `u/${owner ?? user} hasn't rated anything yet.`}
          </EmptyMascot>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {current.data.categories.map((c, i) => (
              <CategoryCard
                key={c.food}
                index={i}
                category={c}
                onOpen={() => setCategory(c.food)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
