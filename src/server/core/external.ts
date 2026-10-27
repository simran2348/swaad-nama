import { context, reddit, type Post } from '@devvit/web/server';
import { cleanPostBody } from '../../shared/text';
import type {
  ImportPostResponse,
  MyPostsResponse,
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
  // 'punefoodporn', // ⚠️ TESTING ONLY
];

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
  const images = post.gallery.map((media) => cleanImageUrl(media.url));
  if (images.length === 0 && post.thumbnail) {
    images.push(cleanImageUrl(post.thumbnail.url));
  }
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
  if (!canImportFrom(post.subredditName)) {
    throw new Error('That post is from another subreddit.');
  }
  if (isGone(post)) throw new Error('That post has been removed.');
  const images = post.gallery.map((m) => cleanImageUrl(m.url));
  if (images.length === 0 && post.thumbnail) {
    images.push(cleanImageUrl(post.thumbnail.url));
  }
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
      const image = post.gallery[0]?.url ?? post.thumbnail?.url;
      posts.push({
        postId: post.id,
        title: post.title,
        image: image ? cleanImageUrl(image) : null,
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
// Place search (Photon: free OpenStreetMap geocoder, no API key)
// ---------------------------------------------------------------------------

const PHOTON_URL = 'https://photon.komoot.io/api/';

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

export const searchPlaces = async (
  query: string
): Promise<PlaceSearchResponse> => {
  const params = new URLSearchParams({ q: query, limit: '10', lang: 'en' });
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
      const street = [text(props, 'housenumber'), text(props, 'street')]
        .filter(Boolean)
        .join(' ');
      const address = [
        street,
        text(props, 'city') || text(props, 'county'),
        text(props, 'country'),
      ]
        .filter(Boolean)
        .join(', ');
      const isFood = FOOD_TYPES.has(text(props, 'osm_value'));
      return [{ place: { name, address, lat, lon }, isFood }];
    }
  );

  found.sort((a, b) => Number(b.isFood) - Number(a.isFood));
  return { places: found.map(({ place }) => place) };
};

// ---------------------------------------------------------------------------
// Map tiles (CARTO basemaps), proxied so the web view only loads our origin
// ---------------------------------------------------------------------------

const TILE_STYLES: Record<string, string> = {
  light: 'rastertiles/voyager',
  dark: 'dark_all',
};

export const fetchTile = async (
  style: string,
  z: string,
  x: string,
  y: string
): Promise<Response | null> => {
  const path = TILE_STYLES[style];
  const yMatch = y.match(/^(\d+)(@2x)?$/);
  const zoom = Number(z);
  if (!path || !yMatch || !/^\d+$/.test(x) || !(zoom >= 0 && zoom <= 20)) {
    return null;
  }
  const [, yTile, retina = ''] = yMatch;
  const upstream = await fetch(
    `https://basemaps.cartocdn.com/${path}/${zoom}/${x}/${yTile}${retina}.png`
  );
  if (!upstream.ok) return null;
  return new Response(await upstream.arrayBuffer(), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=604800',
    },
  });
};
