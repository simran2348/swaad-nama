import {
  context,
  reddit,
  redis,
  settings,
  type Post,
} from '@devvit/web/server';
import { cleanPostBody } from '../../shared/text';
import { normalizeName } from '../../shared/food';
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
  'punefoodporn', // ⚠️ TESTING ONLY: empty this list before publishing
];

/**
 * For testing only: read trending posts from this subreddit instead of the
 * one the app is installed in. Keep '' in published builds.
 */
const TRENDING_SUBREDDIT_OVERRIDE = 'punefoodporn'; // ⚠️ TESTING ONLY: empty this before publishing

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

const POST_ID_PATTERNS = [
  /reddit\.com\/(?:r\/[^/]+\/)?comments\/([a-z0-9]+)/i,
  /redd\.it\/([a-z0-9]+)/i,
];

export const parsePostId = (input: string): string | null => {
  const url = input.trim();
  for (const pattern of POST_ID_PATTERNS) {
    const id = url.match(pattern)?.[1];
    if (id) return id.toLowerCase();
  }
  return null;
};

/**
 * Removed (by mods, Reddit or AutoModerator), spam or deleted posts still
 * show in the author's history; they shouldn't be listed or rated.
 */
const isGone = (post: Post) =>
  post.removed || post.spam || post.removedByCategory !== undefined;

// Reddit preview URLs come HTML-escaped.
const cleanImageUrl = (url: string) => url.replace(/&amp;/g, '&');

/** A link straight to an image file (e.g. i.redd.it or Imgur). */
const isImageLink = (url: string) =>
  /^https:\/\/(i\.redd\.it|i\.imgur\.com)\//i.test(url) ||
  /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);

/**
 * A post's photos. Reddit's preview usually has them, but it can be missing
 * (e.g. on brand-new posts), so fall back to the thumbnail, then to the
 * post's own link when it points straight at an image.
 */
const postImages = (post: Post): string[] => {
  const images = post.gallery.map((media) => cleanImageUrl(media.url));
  if (images.length > 0) return images;
  if (isImageLink(post.url)) return [cleanImageUrl(post.url)];
  if (post.thumbnail) return [cleanImageUrl(post.thumbnail.url)];
  return [];
};

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

/**
 * Windows tried in turn, in days: the first with enough photo posts wins,
 * so quiet subreddits still get a full row.
 */
const TRENDING_WINDOWS_DAYS = [3, 5, 7];
/** Widen until a full row (TRENDING_COUNT) is found. */
const TRENDING_MIN_POSTS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Most of the newest posts checked (a busy week can have more). */
const TRENDING_SCAN_LIMIT = 300;
const TRENDING_COUNT = 10;
/** Shared by everyone for this long, so Reddit isn't asked on every open. */
const TRENDING_CACHE_MS = 10 * 60 * 1000;
/** A comment takes more effort than an upvote, so it counts for more. */
const COMMENT_WEIGHT = 2;

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
  const found: (TrendingPost & { rank: number })[] = [];
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
      rank: post.score + post.numberOfComments * COMMENT_WEIGHT,
    });
  }

  // The narrowest window with enough posts, else the widest.
  const days =
    TRENDING_WINDOWS_DAYS.find(
      (d) =>
        found.filter((p) => p.postedAt >= Date.now() - d * DAY_MS).length >=
        TRENDING_MIN_POSTS
    ) ?? maxDays;
  const since = Date.now() - days * DAY_MS;
  const posts = found
    .filter((p) => p.postedAt >= since)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, TRENDING_COUNT)
    .map(({ rank: _rank, ...post }) => post);

  const result: TrendingResponse = { subredditName, days, posts };
  await redis.set(cacheKey, JSON.stringify(result), {
    expiration: new Date(Date.now() + TRENDING_CACHE_MS),
  });
  return result;
};

// ---------------------------------------------------------------------------
// Photon (free OpenStreetMap geocoder, no API key): the map area lookup,
// and the fallback for place search when Ola Maps isn't available
// ---------------------------------------------------------------------------

const PHOTON_URL = 'https://photon.komoot.io/api/';

// Place search is limited to India: Photon searches inside this box
// (west, south, east, north), then results from neighbouring countries
// that fall inside it are dropped by country code.
const INDIA_BBOX = '68.1,6.5,97.5,35.7';
const INDIA_COUNTRY_CODE = 'IN';

// Food spots are listed before other matches (streets, towns, …).
const FOOD_TYPES = new Set([
  'cafe',
  'restaurant',
  'fast_food',
  'bar',
  'pub',
  'bakery',
  'ice_cream',
  'food_court',
  'biergarten',
]);

/** Reads `obj[key]` from untyped JSON. */
const field = (obj: unknown, key: string): unknown =>
  typeof obj === 'object' && obj !== null ? Reflect.get(obj, key) : undefined;

const text = (obj: unknown, key: string): string => {
  const value = field(obj, key);
  return typeof value === 'string' ? value : '';
};

/** "12 High St, Pune, India" from a Photon result's properties. */
const addressOf = (props: unknown): string => {
  const street = [text(props, 'housenumber'), text(props, 'street')]
    .filter(Boolean)
    .join(' ');
  return [
    street,
    text(props, 'city') || text(props, 'county'),
    text(props, 'country'),
  ]
    .filter(Boolean)
    .join(', ');
};

/** Photon place search: the fallback when Ola Maps isn't available. */
const photonSearch = async (
  query: string,
  near?: { lat: number; lon: number }
): Promise<PlaceSearchResponse> => {
  const params = new URLSearchParams({
    q: query,
    // Extra, since results outside India are dropped below.
    limit: '15',
    lang: 'en',
    bbox: INDIA_BBOX,
    ...(near ? { lat: String(near.lat), lon: String(near.lon) } : {}),
  });
  const res = await fetch(`${PHOTON_URL}?${params}`);
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const json: unknown = await res.json();
  const features = field(json, 'features');

  const found = (Array.isArray(features) ? features : []).flatMap(
    (feature: unknown) => {
      const props = field(feature, 'properties');
      const coords = field(field(feature, 'geometry'), 'coordinates');
      const [lon, lat] = Array.isArray(coords) ? coords : [];
      const name = text(props, 'name');
      if (!name || typeof lat !== 'number' || typeof lon !== 'number') {
        return [];
      }
      if (text(props, 'countrycode').toUpperCase() !== INDIA_COUNTRY_CODE) {
        return [];
      }
      const address = addressOf(props);
      const isFood = FOOD_TYPES.has(text(props, 'osm_value'));
      return [{ place: { name, address, lat, lon }, isFood }];
    }
  );

  found.sort((a, b) => Number(b.isFood) - Number(a.isFood));
  return {
    places: found.slice(0, 10).map(({ place }) => place),
    source: 'photon',
  };
};

/** Thrown for spots we can't use; its message is shown to the user. */
export class PlaceError extends Error {}

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
  const json: unknown = await res.json();
  const features = field(json, 'features');
  const props = Array.isArray(features)
    ? field(features[0], 'properties')
    : undefined;
  if (text(props, 'countrycode').toUpperCase() !== INDIA_COUNTRY_CODE) {
    throw new PlaceError('Only places in India can be added for now.');
  }
  return {
    place: {
      name: text(props, 'name'),
      address: addressOf(props),
      lat: coords.lat,
      lon: coords.lon,
    },
  };
};

// ---------------------------------------------------------------------------
// Ola Maps: place search and address lookups (far better coverage of Indian
// restaurants than OpenStreetMap). Photon above is the fallback.
// ---------------------------------------------------------------------------

const OLA_URL = 'https://api.olamaps.io/places/v1';

/** India's rough bounds; used to keep places India-only. */
const INDIA_BOUNDS = { west: 68.1, south: 6.5, east: 97.5, north: 35.7 };
const inIndia = ({ lat, lon }: { lat: number; lon: number }) =>
  lat >= INDIA_BOUNDS.south &&
  lat <= INDIA_BOUNDS.north &&
  lon >= INDIA_BOUNDS.west &&
  lon <= INDIA_BOUNDS.east;

// Ola place types that count as food spots (listed first in results).
const OLA_FOOD_TYPES = new Set([
  'restaurant',
  'cafe',
  'food',
  'bakery',
  'bar',
  'meal_takeaway',
  'meal_delivery',
]);

/** Repeat searches and spot lookups are served from Redis, saving quota. */
const SEARCH_CACHE_MS = 3 * DAY_MS;
const SPOT_CACHE_MS = 7 * DAY_MS;

/** A picked spot names the nearest food place only if it's this close. */
const SPOT_PLACE_MAX_M = 40;

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

/** A result's coordinates from Ola's `geometry.location`. */
const olaPoint = (result: unknown): { lat: number; lon: number } | null => {
  const location = field(field(result, 'geometry'), 'location');
  const lat = field(location, 'lat');
  const lon = field(location, 'lng');
  return typeof lat === 'number' && typeof lon === 'number'
    ? { lat, lon }
    : null;
};

const isOlaFood = (result: unknown) => {
  const types = field(result, 'types');
  return (
    Array.isArray(types) &&
    types.some((t) => typeof t === 'string' && OLA_FOOD_TYPES.has(t))
  );
};

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
  const predictions = field(json, 'predictions');
  const found = (Array.isArray(predictions) ? predictions : []).flatMap(
    (prediction: unknown) => {
      const point = olaPoint(prediction);
      const formatting = field(prediction, 'structured_formatting');
      const name =
        text(formatting, 'main_text') ||
        text(prediction, 'description').split(',')[0]?.trim() ||
        '';
      if (!name || !point || !inIndia(point)) return [];
      return [
        {
          place: {
            name,
            address: text(formatting, 'secondary_text'),
            ...point,
          },
          isFood: isOlaFood(prediction),
        },
      ];
    }
  );
  found.sort((a, b) => Number(b.isFood) - Number(a.isFood));
  return {
    places: found.slice(0, 10).map(({ place }) => place),
    source: 'ola',
  };
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
  const results = field(json, 'results');
  const list: unknown[] = Array.isArray(results) ? results : [];
  // Name the spot after a food place right there, if there is one.
  const food = list.find((result) => {
    const distance = field(result, 'distance_meters');
    return (
      isOlaFood(result) &&
      typeof distance === 'number' &&
      distance <= SPOT_PLACE_MAX_M
    );
  });
  const [nearest] = list;
  const pick = food ?? nearest;
  const name = food ? text(food, 'name') : '';
  // Ola's address starts with the place's own name; drop it.
  const full = text(pick, 'formatted_address');
  const ownName = text(pick, 'name');
  const address =
    ownName && full.startsWith(`${ownName}, `)
      ? full.slice(ownName.length + 2)
      : full;
  return { place: { name, address, lat: coords.lat, lon: coords.lon } };
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
  if (!inIndia(coords)) {
    throw new PlaceError('Only places in India can be added for now.');
  }
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

/** How far to zoom in on an area Photon gives only as a point. */
const AREA_ZOOM: Record<string, number> = {
  country: 5,
  state: 7,
  county: 9,
  district: 10,
  city: 11,
};

const lookupArea = async (name: string): Promise<MapArea | null> => {
  const params = new URLSearchParams({ q: name, limit: '1', lang: 'en' });
  for (const layer of ['country', 'state', 'county', 'district', 'city']) {
    params.append('layer', layer);
  }
  const res = await fetch(`${PHOTON_URL}?${params}`);
  if (!res.ok) throw new Error(`Map area lookup failed (${res.status})`);
  const features = field(await res.json(), 'features');
  const [feature]: unknown[] = Array.isArray(features) ? features : [];
  const props = field(feature, 'properties');
  const coords = field(field(feature, 'geometry'), 'coordinates');
  const [lon, lat] = Array.isArray(coords) ? coords : [];
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  // Photon's extent is [west, north, east, south].
  const extent = field(props, 'extent');
  const [west, north, east, south] = Array.isArray(extent) ? extent : [];
  const bounds =
    typeof west === 'number' &&
    typeof north === 'number' &&
    typeof east === 'number' &&
    typeof south === 'number'
      ? { south, west, north, east }
      : null;
  return {
    name: text(props, 'name') || name,
    lat,
    lon,
    zoom: AREA_ZOOM[text(props, 'type')] ?? 11,
    bounds,
  };
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

const TILE_STYLES: Record<string, string> = {
  light: 'rastertiles/voyager',
  dark: 'dark_all',
};

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
  // Own keys only, so names like "constructor" don't count as styles.
  const path = Object.hasOwn(TILE_STYLES, style) ? TILE_STYLES[style] : null;
  const yMatch = y.match(/^(\d+)(@2x)?$/);
  const zoom = Number(z);
  if (!path || !yMatch || !/^\d+$/.test(x) || !(zoom >= 0 && zoom <= 20)) {
    return null;
  }
  const [, yTile, retina = ''] = yMatch;
  const key = await getCartoKey();
  const query = key ? `?${new URLSearchParams({ key })}` : '';
  const upstream = await fetch(
    `https://basemaps.cartocdn.com/${path}/${zoom}/${x}/${yTile}${retina}.png${query}`
  );
  if (!upstream.ok) return null;
  return new Response(await upstream.arrayBuffer(), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=604800',
    },
  });
};
