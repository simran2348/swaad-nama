import { redis } from '@devvit/web/server';
import type { FoodCategory, FoodReview, PlaceLocation } from '../../shared/api';
import { cleanVibes, isValidBudget, normalizeName } from '../../shared/food';

const keys = {
  review: (id: string) => `review:${id}`,
  userList: (username: string) => `user:${username}:reviews`,
  foods: () => 'foods',
  foodNames: () => 'foods:names',
};

const parseJson = (value: string | undefined): unknown => {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const parseLocation = (value: unknown): PlaceLocation | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const { address, lat, lon } = { address: '', lat: NaN, lon: NaN, ...value };
  return typeof address === 'string' &&
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon)
    ? { address, lat, lon }
    : undefined;
};

const parseImages = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((url): url is string => typeof url === 'string')
    : [];

const parseReview = (data: Record<string, string>): FoodReview | null => {
  if (!data.id || !data.username) return null;
  const rating = Number(data.rating ?? 0);
  const createdAt = Number(data.createdAt ?? 0);
  const location = parseLocation(parseJson(data.location));
  const budget = Number(data.budget);
  return {
    id: data.id,
    username: data.username,
    title: data.title ?? '',
    food: data.food ?? '',
    place: data.place ?? '',
    ...(location ? { location } : {}),
    // Reviews saved before the 10-point scale were rated out of 5.
    rating: data.scale === '10' ? rating : rating * 2,
    review: data.review ?? '',
    ...(isValidBudget(budget) ? { budget } : {}),
    vibes: cleanVibes(parseJson(data.vibes)),
    images: parseImages(parseJson(data.images)),
    createdAt,
    postedAt: Number(data.postedAt ?? createdAt),
    ...(data.postId ? { postId: data.postId } : {}),
  };
};

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
  });
  await redis.zAdd(keys.userList(review.username), {
    member: review.id,
    score: createdAt,
  });

  // Track foods by popularity and keep the first-seen display name.
  await countFood(review.food, 1);

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
  });
  const cleared = [
    ...(edit.budget ? [] : ['budget']),
    ...(edit.location ? [] : ['location']),
  ];
  if (cleared.length) await redis.hDel(keys.review(review.id), cleared);
  if (normalizeName(edit.food) !== normalizeName(review.food)) {
    await countFood(review.food, -1);
    await countFood(edit.food, 1);
  }
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
export const getUserCategories = (reviews: FoodReview[]): FoodCategory[] => {
  const groups = new Map<string, FoodReview[]>();
  for (const review of reviews) {
    const key = normalizeName(review.food);
    groups.set(key, [...(groups.get(key) ?? []), review]);
  }
  return [...groups.values()]
    .map((group) => {
      const sorted = [...group].sort((a, b) => b.rating - a.rating);
      const [best] = sorted;
      // Prefer the best place's photo, else any photo in the category.
      const image =
        best?.images[0] ?? sorted.find((r) => r.images[0])?.images[0] ?? null;
      return {
        food: best?.food ?? '',
        count: group.length,
        top: best ? { place: best.place, rating: best.rating, image } : null,
      };
    })
    .sort((a, b) => b.count - a.count);
};
