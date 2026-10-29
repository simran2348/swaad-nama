import { useEffect, useState, type ReactNode } from 'react';
import type {
  CategoriesResponse,
  FoodCategory,
  FoodReview,
} from '../../shared/api';
import { normalizeName } from '../../shared/food';
import { fetchCategories } from '../lib/api';
import { riseDelay } from '../lib/motion';
import { forgetMyPosts } from '../lib/postCache';
import { HeroBackdrop, PodiumArt } from './decor';
import { PlateIcon, StarIcon } from './icons';
import { ReviewViewer } from './ReviewViewer';
import { RankedList, UserReviews } from './reviews';
import {
  EMPTY_RATINGS_IMAGE,
  RANKING_IMAGES,
  useImageLoaded,
  useImagesLoaded,
} from '../lib/art';
import { EmptyMascot } from './EmptyMascot';
import { BackButton, EmptyState, LoadingState } from './ui';
import { TopRatedRow } from './TopRatedRow';
import { FoodRaters } from './FoodRaters';
import { UserSearch } from './UserSearch';
import { USER_SEARCH_ENABLED } from '../lib/features';

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
    aria-label={`${category.food}: average ${category.average} out of 10 from ${category.count} ratings`}
    className="rise relative isolate aspect-[4/5] transform-gpu overflow-hidden rounded-2xl bg-cta/15 text-left shadow-md cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg"
  >
    {category.top?.image ? (
      <img
        src={category.top.image}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
    ) : (
      <span className="absolute inset-0 flex items-center justify-center pb-10 text-cta">
        <PlateIcon className="h-12 w-12" />
      </span>
    )}
    {/* Shade so the text stays readable on bright photos. */}
    <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 to-transparent" />
    <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-2.5 text-white">
      <span className="line-clamp-2 text-sm leading-tight font-extrabold [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">
        {category.food}
      </span>
      <span className="flex items-center gap-1.5 text-[11px] font-bold">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur-sm">
          <StarIcon className="h-3 w-3 text-amber-300" />
          {category.average.toFixed(1)}
        </span>
        <span className="opacity-80">
          {category.count} {category.count === 1 ? 'rating' : 'ratings'}
        </span>
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
                detail: r.title || r.review || undefined,
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

/** The podium hero and title over a ranking; waits for the hero's images. */
const RankingScreen = ({
  title,
  subtitle,
  artReady,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  /** The podium and medal images have loaded. */
  artReady: boolean;
  onBack: () => void;
  children: ReactNode;
}) => (
  <div className="relative isolate flex h-full min-h-0 flex-1 flex-col">
    <HeroBackdrop />
    {/* Hero: the title sits on the page background above the podium,
        with no separate header bar, to leave room for the list. */}
    <section className="shrink-0">
      <div className="flex items-start gap-1.5 px-3 pt-3">
        <BackButton onClick={onBack} />
        <div className="min-w-0 pt-0.5">
          <h1 className="truncate text-xl leading-tight font-extrabold text-ink">
            {title}
          </h1>
          <p className="truncate text-sm text-muted">{subtitle}</p>
        </div>
      </div>
      {artReady && (
        <PodiumArt className="rise mx-auto w-[calc(100%-2rem)] max-w-sm" />
      )}
    </section>
    <main className="scroll-area flex flex-1 flex-col gap-3 px-4 mt-3 pb-6">
      {/* Wait for the podium and medals so the screen appears complete. */}
      {artReady ? children : <LoadingState />}
    </main>
  </div>
);

/**
 * Tab 2: a "Top rated" row of the best food categories across everyone,
 * then your food categories (each with your top-rated place's photo), or a
 * user's you search for. Tap a category to see its ranking.
 */
export const Ratings = ({
  foods,
  username,
}: {
  foods: string[];
  /** The viewer, so their own ratings stay editable from anywhere. */
  username: string | null;
}) => {
  const [user, setUser] = useState<string | null>(null);
  // Top rated: a food's community ranking, then one person's tier list.
  const [community, setCommunity] = useState<string | null>(null);
  const [communityUser, setCommunityUser] = useState<string | null>(null);
  // Bumped after an edit/delete to reload categories and rankings.
  const [version, setVersion] = useState(0);
  const [category, setCategory] = useState<string | null>(null);
  const [result, setResult] = useState<{ for: string | null } & Result>();
  // Preloaded so the empty state never shows before its picture.
  const imageReady = useImageLoaded(EMPTY_RATINGS_IMAGE.src);
  // Starts loading the podium and medals now, so a category opens quickly.
  const rankingArtReady = useImagesLoaded(RANKING_IMAGES);

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

  const onRatingChanged = () => {
    forgetMyPosts();
    setVersion((v) => v + 1);
  };

  if (community && communityUser) {
    const mine = communityUser.toLowerCase() === (username ?? '').toLowerCase();
    return (
      <RankingScreen
        title={community}
        // From everyone's list, always named (even for you); "Your
        // ratings" is for opening one of your own categories.
        subtitle={`u/${communityUser}'s ratings`}
        artReady={rankingArtReady}
        onBack={() => setCommunityUser(null)}
      >
        <UserCategoryRanking
          username={communityUser}
          food={community}
          editable={mine}
          foods={foods}
          refreshKey={version}
          onChanged={onRatingChanged}
        />
      </RankingScreen>
    );
  }

  if (community) {
    return (
      <FoodRaters
        food={community}
        refreshKey={version}
        onBack={() => setCommunity(null)}
        onOpenUser={setCommunityUser}
      />
    );
  }

  if (category) {
    return (
      <RankingScreen
        title={category}
        subtitle={`${whose} ratings`}
        artReady={rankingArtReady}
        onBack={() => setCategory(null)}
      >
        {owner && (
          <UserCategoryRanking
            username={owner}
            food={category}
            editable={isOwn}
            foods={foods}
            refreshKey={version}
            onChanged={onRatingChanged}
          />
        )}
      </RankingScreen>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <main className="scroll-area flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
        {/* Same for everyone, so hidden while viewing someone's ratings. */}
        {isOwn && <TopRatedRow refreshKey={version} onOpen={setCommunity} />}
        {USER_SEARCH_ENABLED && (
          <UserSearch
            user={isOwn ? null : (owner ?? user)}
            onSearch={(name) => {
              setUser(name);
              setCategory(null);
            }}
            onClear={() => setUser(null)}
            placeholder="See a Redditor's ratings"
          />
        )}
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
          <>
            <h2 className="px-1 pt-1 text-sm font-extrabold text-ink">
              {whose} categories
            </h2>
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
          </>
        )}
      </main>
    </div>
  );
};
