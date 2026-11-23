import {
  context,
  reddit,
  redis,
  settings,
  type Post,
} from '@devvit/web/server';
import { cleanPostBody } from '../../shared/text';
import { normalizeName } from '../../shared/food';
import {
  DAY_MS,
  inIndia,
  parseOlaPlaces,
  parseOlaReverse,
  parsePhotonArea,
  parsePhotonPlaces,
  parsePhotonReverse,
  parseTileRequest,
  pickTrending,
  postImageUrls,
  TRENDING_WINDOWS_DAYS,
} from '../../shared/places';
import type {
  ImportPostResponse,
  MapArea,
  TrendingPost,
  TrendingResponse,
  MyPostsResponse,
  PlaceAtResponse,
  PlaceSearchResponse,
  PostDetailResponse,
} from '../../shared/api';

// ---------------------------------------------------------------------------
// Importing an existing Reddit post
// ---------------------------------------------------------------------------

/**
 * ⚠️ TEST-BYPASS: imports are limited to the subreddit the app is installed
 * in. Subreddits listed here are allowed too, for testing in a dev subreddit.
 * Comment out the entries (leave the list empty) before publishing.
 */
const TEST_IMPORT_SUBREDDITS: string[] = [
  '', // ⚠️ TESTING ONLY: empty this list before publishing
];

/**
 * For testing only: read trending posts from this subreddit instead of the
 * one the app is installed in. Keep '' in published builds.
 */
const TRENDING_SUBREDDIT_OVERRIDE = ''; // ⚠️ TESTING ONLY: empty this before publishing

const trendingSubreddit = () =>
  TRENDING_SUBREDDIT_OVERRIDE || (context.subredditName ?? '');

/** Whether posts from `name` may be imported. */
const canImportFrom = (name: string) => {
  const subreddit = name.toLowerCase();
  return (
    subreddit === (context.subredditName ?? '').toLowerCase() ||
    TEST_IMPORT_SUBREDDITS.some((s) => s.toLowerCase() === subreddit)
  );
};

export { parsePostId } from '../../shared/places';

/**
 * Removed (by mods, Reddit or AutoModerator), spam or deleted posts still
 * show in the author's history; they shouldn't be listed or rated.
 */
const isGone = (post: Post) =>
  post.removed || post.spam || post.removedByCategory !== undefined;

/** A post's photos (see postImageUrls). */
const postImages = (post: Post): string[] => postImageUrls(post);

/**
 * Loads one of `username`'s posts from this subreddit so it can be turned
 * into a review.
 */
export const importPost = async (
  postId: string,
  username: string
): Promise<ImportPostResponse> => {
  const post = await reddit.getPostById(`t3_${postId}`);
  if (!canImportFrom(post.subredditName)) {
    throw new Error(
      `You can only import posts from r/${context.subredditName ?? ''}.`
    );
  }
  if (post.authorName.toLowerCase() !== username.toLowerCase()) {
    throw new Error('You can only import your own posts.');
  }
  if (isGone(post)) throw new Error('That post has been removed.');
  const images = postImages(post);
  return {
    postId: post.id,
    title: post.title,
    body: cleanPostBody(post.body ?? ''),
    images,
    postedAt: post.createdAt.getTime(),
  };
};

/** Any post from this subreddit, for the popup viewer. */
export const getPostDetail = async (
  postId: string
): Promise<PostDetailResponse> => {
  const post = await reddit.getPostById(`t3_${postId.replace(/^t3_/, '')}`);
  // Trending posts can come from the trending subreddit (see the override).
  const fromTrending =
    post.subredditName.toLowerCase() === trendingSubreddit().toLowerCase();
  if (!canImportFrom(post.subredditName) && !fromTrending) {
    throw new Error('That post is from another subreddit.');
  }
  if (isGone(post)) throw new Error('That post has been removed.');
  const images = postImages(post);
  return {
    postId: post.id,
    title: post.title,
    body: cleanPostBody(post.body ?? ''),
    images,
    postedAt: post.createdAt.getTime(),
    author: post.authorName,
  };
};

/** Posts returned per "load more". */
const MY_POSTS_PAGE_SIZE = 10;
/** Most of the user's history (all subreddits) scanned per request. */
const MY_POSTS_SCAN_LIMIT = 200;

/**
 * One page of the user's posts in this subreddit, newest first. The user's
 * history spans every subreddit, so this scans forward from `after` until it
 * has a page of matches (or gives up for this request) and returns a cursor
 * to continue from.
 */
export const listMyPosts = async (
  username: string,
  /** The owner's ratings, by post id. */
  ratings: Map<string, number>,
  after: string | undefined
): Promise<MyPostsResponse> => {
  const listing = reddit.getPostsByUser({
    username,
    sort: 'new',
    pageSize: 50,
    limit: MY_POSTS_SCAN_LIMIT,
    ...(after ? { after } : {}),
  });

  const posts: MyPostsResponse['posts'] = [];
  let lastScanned: string | null = null;
  let scanned = 0;
  for await (const post of listing) {
    lastScanned = post.id;
    scanned++;
    if (canImportFrom(post.subredditName) && !isGone(post)) {
      posts.push({
        postId: post.id,
        title: post.title,
        image: postImages(post)[0] ?? null,
        postedAt: post.createdAt.getTime(),
        rating: ratings.get(post.id) ?? null,
      });
      if (posts.length === MY_POSTS_PAGE_SIZE) break;
    }
  }

  // Stopped early (full page or scan limit hit): there may be more.
  const mayHaveMore =
    posts.length === MY_POSTS_PAGE_SIZE || scanned === MY_POSTS_SCAN_LIMIT;
  return {
    username,
    posts,
    nextCursor: mayHaveMore ? lastScanned : null,
  };
};

// ---------------------------------------------------------------------------
// Trending: the last day's posts with the most upvotes and comments
// ---------------------------------------------------------------------------

/** Most of the newest posts checked (a busy week can have more). */
const TRENDING_SCAN_LIMIT = 300;
/** Shared by everyone for this long, so Reddit isn't asked on every open. */
const TRENDING_CACHE_MS = 10 * 60 * 1000;

const parseTrending = (value: string | undefined): TrendingResponse | null => {
  if (!value) return null;
  try {
    const cached: TrendingResponse = JSON.parse(value);
    return cached;
  } catch {
    return null;
  }
};

/**
 * Up to 10 recent photo posts, most upvoted and discussed first. Uses the
 * last 3 days, widening to 5 then 7 days when there are fewer than 10.
 */
export const getTrendingPosts = async (): Promise<TrendingResponse> => {
  const subredditName = trendingSubreddit();
  const cacheKey = `trending:v3:${subredditName.toLowerCase()}`;
  const cached = parseTrending(await redis.get(cacheKey));
  if (cached) return cached;

  const maxDays = TRENDING_WINDOWS_DAYS[TRENDING_WINDOWS_DAYS.length - 1] ?? 7;
  const oldest = Date.now() - maxDays * DAY_MS;
  // Newest first, back to the widest window.
  const found: TrendingPost[] = [];
  const listing = reddit.getNewPosts({
    subredditName,
    limit: TRENDING_SCAN_LIMIT,
    pageSize: 100,
  });
  for await (const post of listing) {
    const postedAt = post.createdAt.getTime();
    if (postedAt < oldest) break;
    // Pinned posts (like the SwaadNama hub) and removed ones don't count.
    if (post.stickied || isGone(post)) continue;
    // The cards are photos, so posts without one are left out.
    const image = postImages(post)[0];
    if (!image) continue;
    found.push({
      postId: post.id,
      title: post.title,
      image,
      author: post.authorName,
      score: post.score,
      comments: post.numberOfComments,
      postedAt,
    });
  }

  // The narrowest window with enough posts (else the widest), ranked.
  const { days, posts } = pickTrending(found, Date.now());

  const result: TrendingResponse = { subredditName, days, posts };
  await redis.set(cacheKey, JSON.stringify(result), {
    expiration: new Date(Date.now() + TRENDING_CACHE_MS),
  });
  return result;
};

// ---------------------------------------------------------------------------
// Photon (free OpenStreetMap geocoder, no API key): the map area lookup,
// and the fallback for place search when Ola Maps isn't available.
// Response parsing lives in shared/places.ts (unit tested).
// ---------------------------------------------------------------------------

const PHOTON_URL = 'https://photon.komoot.io/api/';

// Place search is limited to India: Photon searches inside this box
// (west, south, east, north); results from neighbouring countries inside it
// are dropped by country code (parsePhotonPlaces).
const INDIA_BBOX = '68.1,6.5,97.5,35.7';

/** Photon place search: the fallback when Ola Maps isn't available. */
const photonSearch = async (
  query: string,
  near?: { lat: number; lon: number }
): Promise<PlaceSearchResponse> => {
  const params = new URLSearchParams({
    q: query,
    // Extra, since results outside India are dropped.
    limit: '15',
    lang: 'en',
    bbox: INDIA_BBOX,
    ...(near ? { lat: String(near.lat), lon: String(near.lon) } : {}),
  });
  const res = await fetch(`${PHOTON_URL}?${params}`);
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const json: unknown = await res.json();
  return { places: parsePhotonPlaces(json), source: 'photon' };
};

/** Thrown for spots we can't use; its message is shown to the user. */
export class PlaceError extends Error {}

const NOT_IN_INDIA = 'Only places in India can be added for now.';

/** Photon reverse lookup: the fallback when Ola Maps isn't available. */
const photonPlaceAt = async (coords: {
  lat: number;
  lon: number;
}): Promise<PlaceAtResponse> => {
  const params = new URLSearchParams({
    lat: String(coords.lat),
    lon: String(coords.lon),
    lang: 'en',
  });
  const res = await fetch(`https://photon.komoot.io/reverse?${params}`);
  if (!res.ok) throw new Error(`Address lookup failed (${res.status})`);
  const result = parsePhotonReverse(await res.json(), coords);
  if (!result) throw new PlaceError(NOT_IN_INDIA);
  return result;
};

// ---------------------------------------------------------------------------
// Ola Maps: place search and address lookups (far better coverage of Indian
// restaurants than OpenStreetMap). Photon above is the fallback.
// ---------------------------------------------------------------------------

const OLA_URL = 'https://api.olamaps.io/places/v1';

/** Repeat searches and spot lookups are served from Redis, saving quota. */
const SEARCH_CACHE_MS = 3 * DAY_MS;
const SPOT_CACHE_MS = 7 * DAY_MS;

/**
 * Ola Maps needs an API key, kept as a secret app setting. Set it with
 * `npx devvit settings set olaMapsApiKey`. Without one, Photon is used.
 */
let olaKey: string | undefined;
const getOlaKey = async (): Promise<string> => {
  if (olaKey) return olaKey;
  const value = (await settings.get<string>('olaMapsApiKey'))?.trim() ?? '';
  if (value) olaKey = value;
  return value;
};

const olaGet = async (
  path: string,
  params: Record<string, string>,
  key: string
): Promise<unknown> => {
  const query = new URLSearchParams({ ...params, api_key: key });
  const res = await fetch(`${OLA_URL}/${path}?${query}`, {
    headers: { 'X-Request-Id': crypto.randomUUID() },
  });
  if (!res.ok) throw new Error(`Ola Maps ${path} failed (${res.status})`);
  return res.json();
};

const readCache = async <T>(key: string): Promise<T | null> => {
  const value = await redis.get(key);
  if (!value) return null;
  try {
    const parsed: T = JSON.parse(value);
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (key: string, value: unknown, ms: number) =>
  redis.set(key, JSON.stringify(value), {
    expiration: new Date(Date.now() + ms),
  });

const olaSearch = async (
  query: string,
  key: string,
  near?: { lat: number; lon: number }
): Promise<PlaceSearchResponse> => {
  const json = await olaGet(
    'autocomplete',
    {
      input: query,
      ...(near ? { location: `${near.lat},${near.lon}` } : {}),
    },
    key
  );
  return { places: parseOlaPlaces(json), source: 'ola' };
};

const olaPlaceAt = async (
  coords: { lat: number; lon: number },
  key: string
): Promise<PlaceAtResponse> => {
  const json = await olaGet(
    'reverse-geocode',
    { latlng: `${coords.lat},${coords.lon}` },
    key
  );
  return parseOlaReverse(json, coords);
};

/** Search places in India by name, nearest the subreddit's area first. */
export const searchPlaces = async (
  query: string,
  /** Prefer results near here (the subreddit's map area). */
  near?: { lat: number; lon: number }
): Promise<PlaceSearchResponse> => {
  const key = await getOlaKey();
  if (!key) return photonSearch(query, near);
  const area = near ? `${near.lat.toFixed(1)},${near.lon.toFixed(1)}` : 'in';
  const cacheKey = `places:ola:v2:${area}:${normalizeName(query)}`;
  const cached = await readCache<PlaceSearchResponse>(cacheKey);
  if (cached) return cached;
  try {
    const result = await olaSearch(query, key, near);
    await writeCache(cacheKey, result, SEARCH_CACHE_MS);
    return result;
  } catch (error) {
    console.error('Ola place search failed; using Photon:', error);
    return photonSearch(query, near);
  }
};

/**
 * The address at a spot, plus the food place right there if there is one
 * (else no name). India only, like place search.
 */
export const placeAt = async (coords: {
  lat: number;
  lon: number;
}): Promise<PlaceAtResponse> => {
  if (!inIndia(coords)) throw new PlaceError(NOT_IN_INDIA);
  const key = await getOlaKey();
  if (!key) return photonPlaceAt(coords);
  const cacheKey = `spot:ola:v1:${coords.lat.toFixed(5)},${coords.lon.toFixed(5)}`;
  const cached = await readCache<PlaceAtResponse>(cacheKey);
  if (cached) return cached;
  try {
    const result = await olaPlaceAt(coords, key);
    await writeCache(cacheKey, result, SPOT_CACHE_MS);
    return result;
  } catch (error) {
    console.error('Ola address lookup failed; using Photon:', error);
    return photonPlaceAt(coords);
  }
};

// ---------------------------------------------------------------------------
// Map area (subreddit setting, looked up once with Photon and cached)
// ---------------------------------------------------------------------------

const lookupArea = async (name: string): Promise<MapArea | null> => {
  const params = new URLSearchParams({ q: name, limit: '1', lang: 'en' });
  for (const layer of ['country', 'state', 'county', 'district', 'city']) {
    params.append('layer', layer);
  }
  const res = await fetch(`${PHOTON_URL}?${params}`);
  if (!res.ok) throw new Error(`Map area lookup failed (${res.status})`);
  return parsePhotonArea(await res.json(), name);
};

const parseArea = (value: string | undefined): MapArea | null => {
  if (!value) return null;
  try {
    const area: MapArea = JSON.parse(value);
    return area;
  } catch {
    return null;
  }
};

/** The subreddit's map area from the `mapArea` setting, or null if unset or not found. */
export const getMapArea = async (): Promise<MapArea | null> => {
  const name = (await settings.get<string>('mapArea'))?.trim() ?? '';
  if (!name) return null;
  const cacheKey = `maparea:${normalizeName(name)}`;
  const cached = parseArea(await redis.get(cacheKey));
  if (cached) return cached;
  const area = await lookupArea(name);
  if (area) await redis.set(cacheKey, JSON.stringify(area));
  else console.warn(`Map area "${name}" not found`);
  return area;
};

// ---------------------------------------------------------------------------
// Map tiles (CARTO basemaps), proxied so the web view only loads our origin
// ---------------------------------------------------------------------------

/**
 * CARTO needs an API key, kept as a secret app setting. Set it with
 * `npx devvit settings set cartoApiKey`. Without one, tiles come back with
 * an "API KEY REQUIRED" watermark.
 */
let cartoKey: string | undefined;
const getCartoKey = async (): Promise<string> => {
  if (cartoKey) return cartoKey;
  const value = (await settings.get<string>('cartoApiKey'))?.trim() ?? '';
  if (value) cartoKey = value;
  else
    console.warn(
      'cartoApiKey setting is not set; map tiles will show a watermark.'
    );
  return value;
};

export const fetchTile = async (
  style: string,
  z: string,
  x: string,
  y: string
): Promise<Response | null> => {
  const tile = parseTileRequest(style, z, x, y);
  if (!tile) return null;
  const key = await getCartoKey();
  const query = key ? `?${new URLSearchParams({ key })}` : '';
  const upstream = await fetch(
    `https://basemaps.cartocdn.com/${tile.path}/${tile.zoom}/${tile.x}/${tile.y}${tile.retina}.png${query}`
  );
  if (!upstream.ok) return null;
  return new Response(await upstream.arrayBuffer(), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=604800',
    },
  });
};
