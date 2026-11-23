import { redis } from '@devvit/web/server';
import type { FoodCategory, FoodReview, TopRatedFood } from '../../shared/api';
import { normalizeName } from '../../shared/food';
import {
  foodCategories,
  matchFoodKeys,
  parseImages,
  parseStoredJson,
  parseStoredReview,
  rankFoods,
  roundAverage,
} from '../../shared/ratings';
import { countRater, recordEvent } from './stats';

const keys = {
  review: (id: string) => `review:${id}`,
  userList: (username: string) => `user:${username}:reviews`,
  foods: () => 'foods',
  foodNames: () => 'foods:names',
  /** Every rating in a food category (all users), scored by its rating. */
  foodReviews: (food: string) => `food:${normalizeName(food)}:reviews`,
  /** Set once a user's older ratings have been added to the food index. */
  indexed: (username: string) => `user:${username}:indexed:v1`,
  /** Everyone with ratings, scored by how many they have. */
  raterCounts: () => 'raters:count',
  /** Everyone with ratings, scored by when they last added one. */
  raterRecent: () => 'raters:recent',
  /** Set once a user's older ratings are counted in the two lists above. */
  raterIndexed: (username: string) => `user:${username}:raters:v1`,
  /** A user's favourite food categories, scored by when they were added. */
  favourites: (username: string) => `user:${username}:favourites`,
  /** People a user has favourited, scored by when they were added. */
  favouriteUsers: (username: string) => `user:${username}:favourites:users`,
  /** People who have favourited a user (the other side of the above). */
  fans: (username: string) => `user:${username}:fans`,
  /** The fans a user saw when they last opened their fans list. */
  fansSeen: (username: string) => `user:${username}:fans:seen`,
  /** Set once a user's older favourites are counted as fans (see below). */
  fansIndexed: (username: string) => `user:${username}:fans:v1`,
};

/** A new rating: one more for its author, who's now the latest rater. */
const noteRating = async (username: string, at: number) => {
  await redis.zIncrBy(keys.raterCounts(), username, 1);
  await redis.zAdd(keys.raterRecent(), { member: username, score: at });
};

/** A removed rating: one fewer; people with none drop off both lists. */
const unnoteRating = async (username: string) => {
  const count = await redis.zIncrBy(keys.raterCounts(), username, -1);
  if (count <= 0) {
    await redis.zRem(keys.raterCounts(), [username]);
    await redis.zRem(keys.raterRecent(), [username]);
  }
};

/** Adds (or re-scores) a rating in its food category's community index. */
const indexReview = (review: Pick<FoodReview, 'id' | 'food' | 'rating'>) =>
  redis.zAdd(keys.foodReviews(review.food), {
    member: review.id,
    score: review.rating,
  });

const unindexReview = (review: Pick<FoodReview, 'id' | 'food'>) =>
  redis.zRem(keys.foodReviews(review.food), [review.id]);

/** Ratings are read back with parseStoredReview (shared/ratings.ts). */
const parseReview = parseStoredReview;

export const saveReview = async (
  input: Omit<FoodReview, 'id' | 'createdAt'>
): Promise<FoodReview> => {
  const createdAt = Date.now();
  const review: FoodReview = {
    ...input,
    id: `${createdAt.toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
  };
  await redis.hSet(keys.review(review.id), {
    id: review.id,
    username: review.username,
    title: review.title,
    food: review.food,
    place: review.place,
    ...(review.location ? { location: JSON.stringify(review.location) } : {}),
    rating: String(review.rating),
    scale: '10',
    review: review.review,
    ...(review.budget ? { budget: String(review.budget) } : {}),
    vibes: JSON.stringify(review.vibes),
    images: JSON.stringify(review.images),
    createdAt: String(createdAt),
    postedAt: String(review.postedAt),
    ...(review.postId ? { postId: review.postId } : {}),
    ...(review.commentUrl ? { commentUrl: review.commentUrl } : {}),
  });
  await redis.zAdd(keys.userList(review.username), {
    member: review.id,
    score: createdAt,
  });

  // Track foods by popularity and keep the first-seen display name.
  await countFood(review.food, 1);
  await indexReview(review);
  await countRater(review.username, 1);
  await noteRating(review.username, createdAt);
  await recordEvent('rating_added');

  return review;
};

/** Adjusts a food category's rating count, dropping it when empty. */
const countFood = async (food: string, delta: number) => {
  const foodKey = normalizeName(food);
  const count = await redis.zIncrBy(keys.foods(), foodKey, delta);
  if (count <= 0) await redis.zRem(keys.foods(), [foodKey]);
  else if (!(await redis.hGet(keys.foodNames(), foodKey))) {
    await redis.hSet(keys.foodNames(), { [foodKey]: food.trim() });
  }
};

export const getReview = async (id: string): Promise<FoodReview | null> =>
  parseReview(await redis.hGetAll(keys.review(id)));

/**
 * The Reddit comment a rating's text is in now (after an edit, the newest
 * one). Only that comment being removed takes the rating out of the app.
 */
export const setReviewCommentId = (id: string, commentId: string) =>
  redis.hSet(keys.review(id), { commentId });

export const getReviewCommentId = async (id: string) =>
  (await redis.hGet(keys.review(id), 'commentId')) ?? null;

/** Fields a user can change on their own rating. */
export type ReviewEdit = Pick<
  FoodReview,
  | 'title'
  | 'food'
  | 'place'
  | 'location'
  | 'rating'
  | 'review'
  | 'budget'
  | 'vibes'
  | 'commentUrl'
>;

export const updateReview = async (
  review: FoodReview,
  edit: ReviewEdit
): Promise<FoodReview> => {
  await redis.hSet(keys.review(review.id), {
    title: edit.title,
    food: edit.food,
    place: edit.place,
    ...(edit.location ? { location: JSON.stringify(edit.location) } : {}),
    rating: String(edit.rating),
    scale: '10',
    review: edit.review,
    ...(edit.budget ? { budget: String(edit.budget) } : {}),
    vibes: JSON.stringify(edit.vibes),
    ...(edit.commentUrl ? { commentUrl: edit.commentUrl } : {}),
  });
  const cleared = [
    ...(edit.budget ? [] : ['budget']),
    ...(edit.location ? [] : ['location']),
  ];
  if (cleared.length) await redis.hDel(keys.review(review.id), cleared);
  if (normalizeName(edit.food) !== normalizeName(review.food)) {
    await countFood(review.food, -1);
    await countFood(edit.food, 1);
    await unindexReview(review);
  }
  await indexReview({ id: review.id, food: edit.food, rating: edit.rating });
  await recordEvent('rating_edited');
  // Spread without the optional fields, then add the edited ones back if set.
  const { budget: _oldBudget, location: _oldLocation, ...rest } = review;
  const { budget, location, ...fields } = edit;
  return {
    ...rest,
    ...fields,
    ...(budget ? { budget } : {}),
    ...(location ? { location } : {}),
  };
};

/** Removes a rating (the Reddit post it came from is left alone). */
export const deleteReview = async (review: FoodReview) => {
  await redis.del(keys.review(review.id));
  await redis.zRem(keys.userList(review.username), [review.id]);
  await countFood(review.food, -1);
  await unindexReview(review);
  await countRater(review.username, -1);
  await unnoteRating(review.username);
  await recordEvent('rating_deleted');
};

export const getUserReviews = async (
  username: string
): Promise<FoodReview[]> => {
  const ids = await redis.zRange(keys.userList(username), 0, -1, {
    by: 'rank',
    reverse: true,
  });
  const reviews = await Promise.all(
    ids.map(({ member }) => redis.hGetAll(keys.review(member)))
  );
  return reviews.flatMap((data) => {
    const review = parseReview(data);
    return review ? [review] : [];
  });
};

export const getTopFoods = async (limit = 20): Promise<string[]> => {
  const foods = await redis.zRange(keys.foods(), 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });
  if (foods.length === 0) return [];
  const names = await redis.hMGet(
    keys.foodNames(),
    foods.map(({ member }) => member)
  );
  return foods.map(({ member }, i) => names[i] ?? member);
};

/** One user's food categories, each with their highest-rated place. */
export const getUserCategories = (reviews: FoodReview[]): FoodCategory[] =>
  foodCategories(reviews);

/**
 * Adds a user's older ratings (saved before the community index existed) to
 * it, once. Run when they open the app, so the index fills in over time.
 */
export const indexUserReviews = async (
  username: string,
  reviews: FoodReview[]
) => {
  if (await redis.get(keys.indexed(username))) return;
  await Promise.all(reviews.map(indexReview));
  await redis.set(keys.indexed(username), '1');
};

/**
 * Card details for food categories (by key): name, rating count, average
 * and the photo from its best rating. Most-rated first, then best average.
 */
const summarizeFoods = async (
  foodKeys: string[],
  limit: number,
  /** Keep `foodKeys`' order instead of sorting most-rated first. */
  keepOrder = false
): Promise<TopRatedFood[]> => {
  if (foodKeys.length === 0) return [];
  const [names, ratings] = await Promise.all([
    redis.hMGet(keys.foodNames(), foodKeys),
    Promise.all(
      foodKeys.map((food) =>
        redis.zRange(keys.foodReviews(food), 0, -1, {
          by: 'rank',
          reverse: true,
        })
      )
    ),
  ]);
  const ranked = rankFoods(
    foodKeys.map((food, i) => {
      const scores = ratings[i] ?? [];
      return {
        food: names[i] ?? food,
        scores: scores.map(({ score }) => score),
        bestId: scores[0]?.member,
      };
    }),
    limit,
    keepOrder
  );
  // Each card shows the photo from that food's best rating.
  return Promise.all(
    ranked.map(async ({ bestId, ...food }) => {
      const images = bestId
        ? parseImages(
            parseStoredJson(await redis.hGet(keys.review(bestId), 'images'))
          )
        : [];
      return {
        ...food,
        average: roundAverage(food.average),
        image: images[0] ?? null,
      };
    })
  );
};

/** The most-rated food categories across everyone (ties: best average). */
export const getTopRatedFoods = async (limit = 10): Promise<TopRatedFood[]> => {
  const foods = await redis.zRange(keys.foods(), 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });
  return summarizeFoods(
    foods.map(({ member }) => member),
    limit
  );
};

/** Most matches to look up for one category search. */
const FOOD_SEARCH_SCAN = 50;

/**
 * Food categories whose name contains `query`, most-rated first. An empty
 * query lists the most-rated ones.
 */
export const searchFoods = async (
  query: string,
  limit = 20
): Promise<TopRatedFood[]> => {
  const needle = normalizeName(query);
  if (!needle) return getTopRatedFoods(limit);
  // Every category, most-rated first; matched by its key or display name.
  const all = await redis.zRange(keys.foods(), 0, -1, {
    by: 'rank',
    reverse: true,
  });
  const foodKeys = all.map(({ member }) => member);
  const names = foodKeys.length
    ? await redis.hMGet(keys.foodNames(), foodKeys)
    : [];
  const matches = matchFoodKeys(foodKeys, names, query).slice(
    0,
    FOOD_SEARCH_SCAN
  );
  return summarizeFoods(matches, limit);
};

/** Everyone's ratings in one food category, best first (up to `limit`). */
export const getFoodRatings = async (
  food: string,
  limit = 50
): Promise<FoodReview[]> => {
  const ids = await redis.zRange(keys.foodReviews(food), 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });
  const reviews = await Promise.all(
    ids.map(({ member }) => redis.hGetAll(keys.review(member)))
  );
  return reviews.flatMap((data) => {
    const review = parseReview(data);
    return review ? [review] : [];
  });
};

/**
 * Adds a user's older ratings (saved before the rater lists existed) to
 * them, once. Run when they open the app, so the lists fill in over time.
 */
export const indexRater = async (username: string, reviews: FoodReview[]) => {
  if (await redis.get(keys.raterIndexed(username))) return;
  if (reviews.length > 0) {
    const latest = Math.max(...reviews.map((r) => r.createdAt));
    await redis.zAdd(keys.raterCounts(), {
      member: username,
      score: reviews.length,
    });
    await redis.zAdd(keys.raterRecent(), { member: username, score: latest });
  }
  await redis.set(keys.raterIndexed(username), '1');
};

/** People who added a rating most recently, newest first. */
export const getRecentRaters = async (limit: number) => {
  const recent = await redis.zRange(keys.raterRecent(), 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });
  const names = recent.map(({ member }) => member);
  const counts = await Promise.all(
    names.map((name) => redis.zScore(keys.raterCounts(), name))
  );
  return names.map((username, i) => ({ username, count: counts[i] ?? 0 }));
};

/** People with the most ratings, most first. */
export const getTopRaters = async (limit: number) => {
  const top = await redis.zRange(keys.raterCounts(), 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });
  return top.map(({ member, score }) => ({ username: member, count: score }));
};

/** How many ratings someone has. */
export const countRatings = (username: string) =>
  redis.zCard(keys.userList(username));

/** Most favourites one person can keep. */
const MAX_FAVOURITES = 100;

/** Your favourite food categories, newest first (ones still rated). */
export const getFavouriteFoods = async (
  username: string
): Promise<TopRatedFood[]> => {
  const saved = await redis.zRange(
    keys.favourites(username),
    0,
    MAX_FAVOURITES - 1,
    { by: 'rank', reverse: true }
  );
  return summarizeFoods(
    saved.map(({ member }) => member),
    MAX_FAVOURITES,
    true
  );
};

/**
 * Adds a food category to your favourites, or removes it. Returns false when
 * adding one nobody has rated.
 */
export const setFavourite = async (
  username: string,
  food: string,
  favourite: boolean
): Promise<boolean> => {
  const foodKey = normalizeName(food);
  if (!foodKey) return false;
  const key = keys.favourites(username);
  if (!favourite) {
    await redis.zRem(key, [foodKey]);
    return true;
  }
  if ((await redis.zScore(keys.foods(), foodKey)) === undefined) return false;
  await redis.zAdd(key, { member: foodKey, score: Date.now() });
  // Past the cap, the oldest ones go.
  const extra = (await redis.zCard(key)) - MAX_FAVOURITES;
  if (extra > 0) await redis.zRemRangeByRank(key, 0, extra - 1);
  return true;
};

/** Your favourite people, newest first, with how many ratings they have. */
/** How many people a user has added to their favourites. */
export const countFavouriteUsers = (username: string) =>
  redis.zCard(keys.favouriteUsers(username));

export const getFavouriteUsers = async (username: string) => {
  const saved = await redis.zRange(
    keys.favouriteUsers(username),
    0,
    MAX_FAVOURITES - 1,
    { by: 'rank', reverse: true }
  );
  const names = saved.map(({ member }) => member);
  const counts = await Promise.all(
    names.map((name) => redis.zScore(keys.raterCounts(), name))
  );
  return names.map((name, i) => ({ username: name, count: counts[i] ?? 0 }));
};

/**
 * Adds someone to your favourite people, or removes them. Returns false for
 * yourself, or when adding someone with no ratings here.
 */
export const setFavouriteUser = async (
  username: string,
  other: string,
  favourite: boolean
): Promise<boolean> => {
  if (!other || other.toLowerCase() === username.toLowerCase()) return false;
  const key = keys.favouriteUsers(username);
  if (!favourite) {
    await redis.zRem(key, [other]);
    await redis.zRem(keys.fans(other), [username]);
    return true;
  }
  if ((await redis.zScore(keys.raterCounts(), other)) === undefined) {
    return false;
  }
  const now = Date.now();
  await redis.zAdd(key, { member: other, score: now });
  await redis.zAdd(keys.fans(other), { member: username, score: now });
  // Past the cap, the oldest ones go (and stop counting as a fan of them).
  const extra = (await redis.zCard(key)) - MAX_FAVOURITES;
  if (extra > 0) {
    const dropped = await redis.zRange(key, 0, extra - 1, { by: 'rank' });
    await redis.zRemRangeByRank(key, 0, extra - 1);
    await Promise.all(
      dropped.map(({ member }) => redis.zRem(keys.fans(member), [username]))
    );
  }
  return true;
};

/**
 * Favourites added before fans were tracked: counts this user as a fan of
 * everyone they had already favourited (once per user, on opening the app).
 */
export const indexFans = async (username: string) => {
  if (await redis.get(keys.fansIndexed(username))) return;
  const saved = await redis.zRange(keys.favouriteUsers(username), 0, -1, {
    by: 'rank',
  });
  for (const { member, score } of saved) {
    if ((await redis.zScore(keys.fans(member), username)) === undefined) {
      await redis.zAdd(keys.fans(member), { member: username, score });
    }
  }
  await redis.set(keys.fansIndexed(username), '1');
};

/** Most fans listed at once. */
const MAX_FANS_SHOWN = 200;

/**
 * How many people have added this user to their favourites, and whether
 * any of them weren't in the list the last time they opened it.
 */
export const getFanSummary = async (username: string) => {
  const [fans, seen] = await Promise.all([
    redis.zRange(keys.fans(username), 0, -1, { by: 'rank' }),
    redis.zRange(keys.fansSeen(username), 0, -1, { by: 'rank' }),
  ]);
  const seenNames = new Set(seen.map(({ member }) => member));
  return {
    count: fans.length,
    hasNew: fans.some(({ member }) => !seenNames.has(member)),
  };
};

/**
 * People who added this user to their favourites, newest first. Opening
 * the list marks everyone in it as seen (clearing the "new fans" dot).
 */
export const getFansAndMarkSeen = async (username: string) => {
  const fans = await redis.zRange(keys.fans(username), 0, -1, {
    by: 'rank',
    reverse: true,
  });
  const seenKey = keys.fansSeen(username);
  await redis.del(seenKey);
  if (fans.length > 0) await redis.zAdd(seenKey, ...fans);
  return fans
    .slice(0, MAX_FANS_SHOWN)
    .map(({ member, score }) => ({ username: member, at: score }));
};
