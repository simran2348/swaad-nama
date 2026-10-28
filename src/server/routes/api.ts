import { Hono, type Context } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type {
  CategoriesResponse,
  CreateReviewRequest,
  CreateReviewResponse,
  FoodReview,
  AdminDeletePostsResponse,
  AdminResetRatingsResponse,
  PostDetailResponse,
  UpdateReviewRequest,
  ErrorResponse,
  ImportPostResponse,
  MyPostsResponse,
  PlaceLocation,
  PlaceSearchResponse,
  InitResponse,
  MapAreaResponse,
  TeamResponse,
  TopRatedResponse,
  FoodRater,
  FoodRatersResponse,
  TrendingResponse,
  ProfileResponse,
  SaveModeRequest,
  SaveThemeRequest,
  UserReviewsResponse,
} from '../../shared/api';
import { isAdmin } from '../../shared/admin';
import { TEAM_USERNAMES } from '../../shared/team';
import { isAppMode, isPaletteId } from '../../shared/theme';
import { cleanVibes, isValidBudget, isValidRating } from '../../shared/food';
import {
  fetchTile,
  getMapArea,
  getTrendingPosts,
  getPostDetail,
  importPost,
  listMyPosts,
  searchPlaces,
} from '../core/external';
import { postUrl } from '../core/post';
import { getAvatarUrl } from '../core/avatars';
import { deletePosts, resetRatings } from '../core/admin';
import {
  getUserMode,
  getUserTheme,
  saveUserMode,
  saveUserTheme,
} from '../core/preferences';
import {
  deleteReview,
  getReview,
  updateReview,
  getTopFoods,
  getUserCategories,
  getUserReviews,
  getFoodRatings,
  getTopRatedFoods,
  indexUserReviews,
  saveReview,
} from '../core/reviews';

const MAX_TEXT = { title: 120, food: 60, place: 80, review: 2000 };

/**
 * Puts the chosen photo first (ratings show their first photo). Only one of
 * the post's own photos can be chosen.
 */
const withCoverFirst = (images: string[], cover: unknown): string[] =>
  typeof cover === 'string' && images.includes(cover)
    ? [cover, ...images.filter((url) => url !== cover)]
    : images;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error';

const validLocation = (
  value: Partial<PlaceLocation> | undefined
): PlaceLocation | undefined => {
  if (!value) return undefined;
  const { address, lat, lon } = value;
  if (typeof lat !== 'number' || typeof lon !== 'number') return undefined;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined;
  return { address: String(address ?? '').slice(0, 200), lat, lon };
};

/** Strips a leading "u/" and resolves the exact casing reviews are keyed by. */
const resolveUsername = async (input: string): Promise<string | null> => {
  const name = input.trim().replace(/^\/?u\//i, '');
  if (!name) return null;
  const user = await reddit.getUserByUsername(name).catch(() => undefined);
  return user?.username ?? null;
};

export const api = new Hono();

api.get('/profile', async (c) => {
  try {
    const username = (await reddit.getCurrentUsername()) ?? null;
    const [avatarUrl, theme] = await Promise.all([
      username
        ? reddit.getSnoovatarUrl(username).catch(() => undefined)
        : Promise.resolve(undefined),
      username ? getUserTheme(username) : Promise.resolve(null),
    ]);
    return c.json<ProfileResponse>({
      username,
      avatarUrl: avatarUrl ?? null,
      theme,
    });
  } catch (error) {
    console.error('API profile error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      500
    );
  }
});

api.get('/init', async (c) => {
  try {
    const username = (await reddit.getCurrentUsername()) ?? null;
    const [myList, foods, mode] = await Promise.all([
      username ? getUserReviews(username) : Promise.resolve([]),
      getTopFoods(),
      username ? getUserMode(username) : Promise.resolve(null),
    ]);
    // Adds the user's older ratings to the community index (once).
    if (username) {
      await indexUserReviews(username, myList).catch((err: unknown) =>
        console.error('Index ratings error:', err)
      );
    }
    return c.json<InitResponse>({
      username,
      subredditName: context.subredditName ?? '',
      mode,
      myList,
      foods,
    });
  } catch (error) {
    console.error('API init error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      500
    );
  }
});

api.get('/users/:username/reviews', async (c) => {
  const input = c.req.param('username');
  try {
    const username = await resolveUsername(input);
    if (!username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: `u/${input.trim()} not found` },
        404
      );
    }
    return c.json<UserReviewsResponse>({
      username,
      reviews: await getUserReviews(username),
    });
  } catch (error) {
    console.error(`API user reviews error for ${input}:`, error);
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      500
    );
  }
});

api.post('/theme', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'You must be logged in' },
      401
    );
  }
  const body = await c.req.json<Partial<SaveThemeRequest>>();
  const palette = body.palette;
  if (!isPaletteId(palette)) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Unknown theme' },
      400
    );
  }
  try {
    await saveUserTheme(username, palette);
    return c.json({ status: 'ok' });
  } catch (error) {
    console.error(`API save theme error for ${username}:`, error);
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      500
    );
  }
});

/** Saves the expanded app's light/dark choice to the user's account. */
api.post('/mode', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) return unauthorized(c);
  const { mode } = await c.req.json<Partial<SaveModeRequest>>();
  if (!isAppMode(mode)) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Unknown appearance' },
      400
    );
  }
  try {
    await saveUserMode(username, mode);
    return c.json({ status: 'ok' });
  } catch (error) {
    return failure(c, error, 'save appearance');
  }
});

api.get('/import', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'You must be logged in' },
      401
    );
  }
  try {
    const postId = c.req.query('id')?.replace(/^t3_/, '');
    if (!postId) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Pick a post to rate' },
        400
      );
    }
    return c.json<ImportPostResponse>(await importPost(postId, username));
  } catch (error) {
    console.error('API import error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      400
    );
  }
});

api.get('/my-posts', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'You must be logged in' },
      401
    );
  }
  try {
    // `?user=` views someone else's posts (read-only on the client).
    const requested = c.req.query('user')?.trim();
    const owner = requested ? await resolveUsername(requested) : username;
    if (!owner) {
      return c.json<ErrorResponse>(
        { status: 'error', message: `u/${requested} not found` },
        404
      );
    }
    const reviews = await getUserReviews(owner);
    const ratings = new Map<string, number>();
    for (const review of reviews) {
      if (review.postId) ratings.set(review.postId, review.rating);
    }
    const after = c.req.query('after')?.trim() || undefined;
    return c.json<MyPostsResponse>(await listMyPosts(owner, ratings, after));
  } catch (error) {
    console.error('API my-posts error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      500
    );
  }
});

api.get('/places', async (c) => {
  const query = c.req.query('q')?.trim() ?? '';
  if (query.length < 2) {
    return c.json<PlaceSearchResponse>({ places: [] });
  }
  try {
    // Prefer places in the subreddit's area; search anyway if that fails.
    const area = await getMapArea().catch(() => null);
    return c.json<PlaceSearchResponse>(
      await searchPlaces(
        query.slice(0, 100),
        area ? { lat: area.lat, lon: area.lon } : undefined
      )
    );
  } catch (error) {
    console.error('API place search error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      502
    );
  }
});

/** Food categories with the best average rating across everyone. */
api.get('/top-rated', async (c) => {
  try {
    return c.json<TopRatedResponse>({ foods: await getTopRatedFoods() });
  } catch (error) {
    return failure(c, error, 'top rated');
  }
});

/** Everyone who rated a food, best rating first, with overall totals. */
api.get('/foods/:food/raters', async (c) => {
  const food = c.req.param('food').trim();
  if (!food) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Pick a food category' },
      400
    );
  }
  try {
    // Best first, so each person's first rating seen is their best.
    const reviews = await getFoodRatings(food, 500);
    const byUser = new Map<
      string,
      Omit<FoodRater, 'avatarUrl' | 'average'> & { total: number }
    >();
    for (const r of reviews) {
      const key = r.username.toLowerCase();
      const seen = byUser.get(key);
      if (seen) {
        seen.count++;
        seen.total += r.rating;
      } else {
        byUser.set(key, {
          username: r.username,
          count: 1,
          total: r.rating,
          best: {
            place: r.place,
            rating: r.rating,
            image: r.images[0] ?? null,
          },
        });
      }
    }
    const raters = await Promise.all(
      [...byUser.values()].map(async ({ total, ...rater }) => ({
        ...rater,
        average: Math.round((total / rater.count) * 10) / 10,
        avatarUrl: await getAvatarUrl(rater.username),
      }))
    );
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    return c.json<FoodRatersResponse>({
      food: reviews[0]?.food ?? food,
      average: reviews.length
        ? Math.round((total / reviews.length) * 10) / 10
        : 0,
      count: reviews.length,
      raters,
    });
  } catch (error) {
    return failure(c, error, 'food raters');
  }
});

/** The team's avatars (Settings). */
api.get('/team', async (c) => {
  try {
    const members = await Promise.all(
      TEAM_USERNAMES.map(async (username) => ({
        username,
        avatarUrl: await getAvatarUrl(username),
      }))
    );
    return c.json<TeamResponse>({ members });
  } catch (error) {
    return failure(c, error, 'team');
  }
});

/** The last day's most upvoted and discussed posts (My List's top row). */
api.get('/trending', async (c) => {
  try {
    return c.json<TrendingResponse>(await getTrendingPosts());
  } catch (error) {
    return failure(c, error, 'trending');
  }
});

/** Where the map opens for this subreddit (a mod setting). */
api.get('/map-area', async (c) => {
  try {
    return c.json<MapAreaResponse>({ area: await getMapArea() });
  } catch (error) {
    console.error('API map area error:', error);
    return c.json<MapAreaResponse>({ area: null });
  }
});

api.get('/tiles/:style/:z/:x/:y', async (c) => {
  const { style, z, x, y } = c.req.param();
  try {
    const tile = await fetchTile(style, z, x, y);
    return tile ?? c.body(null, 404);
  } catch (error) {
    console.error('API tile error:', error);
    return c.body(null, 502);
  }
});

api.get('/categories', async (c) => {
  const input = c.req.query('user')?.trim() ?? '';
  try {
    // Without `?user=`, show the viewer's own ratings.
    const username = input
      ? await resolveUsername(input)
      : ((await reddit.getCurrentUsername()) ?? null);
    if (!input && !username) {
      return c.json<CategoriesResponse>({ username: null, categories: [] });
    }
    if (!username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: `u/${input} not found` },
        404
      );
    }
    const reviews = await getUserReviews(username);
    return c.json<CategoriesResponse>({
      username,
      categories: getUserCategories(reviews),
    });
  } catch (error) {
    console.error('API categories error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      500
    );
  }
});

/** Validated rating fields from a request body, or an error message. */
const readRating = (
  body: Partial<UpdateReviewRequest>
):
  { ok: true; value: UpdateReviewRequest } | { ok: false; message: string } => {
  const food = body.food?.trim() ?? '';
  const place = body.place?.trim() ?? '';
  const review = body.review?.trim() ?? '';
  const title = body.title?.trim() || `${food} at ${place}`;
  const rating = Number(body.rating);
  const budget = body.budget === undefined ? undefined : Number(body.budget);
  const location = validLocation(body.location);
  if (budget !== undefined && !isValidBudget(budget)) {
    return { ok: false, message: 'Budget is out of range' };
  }
  if (!food || !place || !isValidRating(rating)) {
    return {
      ok: false,
      message: 'Food category, place and a 1–10 rating are required',
    };
  }
  if (
    title.length > MAX_TEXT.title ||
    food.length > MAX_TEXT.food ||
    place.length > MAX_TEXT.place ||
    review.length > MAX_TEXT.review
  ) {
    return { ok: false, message: 'One of the fields is too long' };
  }
  return {
    ok: true,
    value: {
      title,
      food,
      place,
      ...(location ? { location } : {}),
      rating,
      review,
      ...(budget !== undefined ? { budget } : {}),
      vibes: cleanVibes(body.vibes),
    },
  };
};

const unauthorized = (c: Context) =>
  c.json<ErrorResponse>(
    { status: 'error', message: 'You must be logged in' },
    401
  );

const failure = (c: Context, error: unknown, label: string) => {
  console.error(`API ${label} error:`, error);
  return c.json<ErrorResponse>(
    { status: 'error', message: errorMessage(error) },
    500
  );
};

/** Rate one of your existing posts (from My List). */
api.post('/reviews', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) return unauthorized(c);

  const body = await c.req.json<Partial<CreateReviewRequest>>();
  const fields = readRating(body);
  if (!fields.ok) {
    return c.json<ErrorResponse>(
      { status: 'error', message: fields.message },
      400
    );
  }
  if (!body.importedPostId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Pick a post to rate' },
      400
    );
  }
  try {
    // Ratings keep the original post (and its photos and date).
    const source = await importPost(
      body.importedPostId.replace(/^t3_/, ''),
      username
    );
    const existing = await getUserReviews(username);
    if (existing.some((r) => r.postId === source.postId)) {
      return c.json<ErrorResponse>(
        { status: 'error', message: "You've already rated this post." },
        409
      );
    }
    const saved = await saveReview({
      username,
      ...fields.value,
      images: withCoverFirst(source.images, body.coverImage),
      postedAt: source.postedAt,
      postId: source.postId,
    });
    return c.json<CreateReviewResponse>({
      review: saved,
      postUrl: postUrl(source.postId),
    });
  } catch (error) {
    return failure(c, error, 'create review');
  }
});

/** Edit one of your own ratings. */
api.put('/reviews/:id', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) return unauthorized(c);
  const fields = readRating(await c.req.json<Partial<UpdateReviewRequest>>());
  if (!fields.ok) {
    return c.json<ErrorResponse>(
      { status: 'error', message: fields.message },
      400
    );
  }
  try {
    const review = await getReview(c.req.param('id'));
    if (!review || review.username !== username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Rating not found' },
        404
      );
    }
    return c.json<FoodReview>(await updateReview(review, fields.value));
  } catch (error) {
    return failure(c, error, 'update review');
  }
});

/** Delete one of your own ratings (the Reddit post stays). */
api.delete('/reviews/:id', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) return unauthorized(c);
  try {
    const review = await getReview(c.req.param('id'));
    if (!review || review.username !== username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Rating not found' },
        404
      );
    }
    await deleteReview(review);
    return c.json({ status: 'ok' });
  } catch (error) {
    return failure(c, error, 'delete review');
  }
});

/** A post's content for the popup viewer (this subreddit only). */
api.get('/posts/:id', async (c) => {
  try {
    return c.json<PostDetailResponse>(await getPostDetail(c.req.param('id')));
  } catch (error) {
    console.error('API post detail error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage(error) },
      404
    );
  }
});

/** Admin only: deletes posts by id. */
api.post('/admin/delete-posts', async (c) => {
  if (!isAdmin(await reddit.getCurrentUsername())) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Not allowed' },
      403
    );
  }
  const { ids } = await c.req.json<{ ids?: string }>();
  try {
    return c.json<AdminDeletePostsResponse>(await deletePosts(ids ?? ''));
  } catch (error) {
    return failure(c, error, 'admin delete posts');
  }
});

/** Admin only: clears every rating a user has. */
api.post('/admin/reset-ratings', async (c) => {
  if (!isAdmin(await reddit.getCurrentUsername())) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Not allowed' },
      403
    );
  }
  const { username: input } = await c.req.json<{ username?: string }>();
  try {
    const username = await resolveUsername(input ?? '');
    if (!username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: `u/${input ?? ''} not found` },
        404
      );
    }
    return c.json<AdminResetRatingsResponse>(await resetRatings(username));
  } catch (error) {
    return failure(c, error, 'admin reset ratings');
  }
});
