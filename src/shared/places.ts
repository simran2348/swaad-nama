import type {
  MapArea,
  PlaceAtResponse,
  PlaceSearchResponse,
  TrendingPost,
} from './api';

/**
 * Pure rules behind the server's Reddit, Ola Maps, Photon and map tile code
 * (src/server/core/external.ts): parsing links and API responses, India-only
 * checks and the trending pick. Kept free of Devvit so they can be unit
 * tested (places.test.ts).
 */

// ---------------------------------------------------------------------------
// Reddit posts
// ---------------------------------------------------------------------------

const POST_ID_PATTERNS = [
  /reddit\.com\/(?:r\/[^/]+\/)?comments\/([a-z0-9]+)/i,
  /redd\.it\/([a-z0-9]+)/i,
];

/** The post id (lowercase, no t3_) from a reddit.com or redd.it link. */
export const parsePostId = (input: string): string | null => {
  const url = input.trim();
  for (const pattern of POST_ID_PATTERNS) {
    const id = url.match(pattern)?.[1];
    if (id) return id.toLowerCase();
  }
  return null;
};

/** Reddit preview URLs come HTML-escaped. */
export const cleanImageUrl = (url: string) => url.replace(/&amp;/g, '&');

/** A link straight to an image file (e.g. i.redd.it or Imgur). */
export const isImageLink = (url: string) =>
  /^https:\/\/(i\.redd\.it|i\.imgur\.com)\//i.test(url) ||
  /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);

/** The parts of a Reddit post its photos come from. */
export type PostImageSource = {
  gallery: readonly { url: string }[];
  url: string;
  thumbnail?: { url: string } | undefined;
};

/**
 * A post's photos. Reddit's preview usually has them, but it can be missing
 * (e.g. on brand-new posts), so fall back to the post's own link when it
 * points straight at an image, then to the thumbnail.
 */
export const postImageUrls = (post: PostImageSource): string[] => {
  const images = post.gallery.map((media) => cleanImageUrl(media.url));
  if (images.length > 0) return images;
  if (isImageLink(post.url)) return [cleanImageUrl(post.url)];
  if (post.thumbnail) return [cleanImageUrl(post.thumbnail.url)];
  return [];
};

// ---------------------------------------------------------------------------
// Trending
// ---------------------------------------------------------------------------

/**
 * Windows tried in turn, in days: the first with enough photo posts wins,
 * so quiet subreddits still get a full row.
 */
export const TRENDING_WINDOWS_DAYS = [3, 5, 7];
/** Widen until a full row (TRENDING_COUNT) is found. */
export const TRENDING_MIN_POSTS = 10;
export const TRENDING_COUNT = 10;
/** A comment takes more effort than an upvote, so it counts for more. */
export const COMMENT_WEIGHT = 2;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** How a post ranks in Trending: upvotes plus comments (weighted). */
export const trendingRank = (post: { score: number; comments: number }) =>
  post.score + post.comments * COMMENT_WEIGHT;

/**
 * Up to 10 posts, highest trendingRank first, from the narrowest window
 * (3, 5, then 7 days) that has at least 10 posts, else the widest.
 */
export const pickTrending = (
  candidates: readonly TrendingPost[],
  now: number
): { days: number; posts: TrendingPost[] } => {
  const maxDays = TRENDING_WINDOWS_DAYS[TRENDING_WINDOWS_DAYS.length - 1] ?? 7;
  const days =
    TRENDING_WINDOWS_DAYS.find(
      (d) =>
        candidates.filter((p) => p.postedAt >= now - d * DAY_MS).length >=
        TRENDING_MIN_POSTS
    ) ?? maxDays;
  const since = now - days * DAY_MS;
  const posts = candidates
    .filter((p) => p.postedAt >= since)
    .sort((a, b) => trendingRank(b) - trendingRank(a))
    .slice(0, TRENDING_COUNT);
  return { days, posts };
};

// ---------------------------------------------------------------------------
// India-only places
// ---------------------------------------------------------------------------

/** India's rough bounds; used to keep places India-only. */
export const INDIA_BOUNDS = { west: 68.1, south: 6.5, east: 97.5, north: 35.7 };
export const INDIA_COUNTRY_CODE = 'IN';

export const inIndia = ({ lat, lon }: { lat: number; lon: number }) =>
  lat >= INDIA_BOUNDS.south &&
  lat <= INDIA_BOUNDS.north &&
  lon >= INDIA_BOUNDS.west &&
  lon <= INDIA_BOUNDS.east;

/** Reads `obj[key]` from untyped JSON. */
const field = (obj: unknown, key: string): unknown =>
  typeof obj === 'object' && obj !== null ? Reflect.get(obj, key) : undefined;

const text = (obj: unknown, key: string): string => {
  const value = field(obj, key);
  return typeof value === 'string' ? value : '';
};

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

type FoundPlace = {
  place: PlaceSearchResponse['places'][number];
  isFood: boolean;
};

/** Food spots first (stable otherwise), at most 10. */
const foodFirst = (found: FoundPlace[]) =>
  [...found]
    .sort((a, b) => Number(b.isFood) - Number(a.isFood))
    .slice(0, 10)
    .map(({ place }) => place);

// ---------------------------------------------------------------------------
// Photon (OpenStreetMap)
// ---------------------------------------------------------------------------

/** Photon `osm_value`s that count as food spots (listed first). */
const PHOTON_FOOD_TYPES = new Set([
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

/** "12 High St, Pune, India" from a Photon result's properties. */
export const photonAddress = (props: unknown): string => {
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

/**
 * Places from a Photon search response: named, with coordinates, in India
 * only; food spots first; at most 10.
 */
export const parsePhotonPlaces = (
  json: unknown
): PlaceSearchResponse['places'] =>
  foodFirst(
    list(field(json, 'features')).flatMap((feature): FoundPlace[] => {
      const props = field(feature, 'properties');
      const coords = field(field(feature, 'geometry'), 'coordinates');
      const [lon, lat] = list(coords);
      const name = text(props, 'name');
      if (!name || typeof lat !== 'number' || typeof lon !== 'number') {
        return [];
      }
      if (text(props, 'countrycode').toUpperCase() !== INDIA_COUNTRY_CODE) {
        return [];
      }
      return [
        {
          place: { name, address: photonAddress(props), lat, lon },
          isFood: PHOTON_FOOD_TYPES.has(text(props, 'osm_value')),
        },
      ];
    })
  );

/**
 * The place at a spot from a Photon reverse lookup, or null when the spot
 * isn't in India.
 */
export const parsePhotonReverse = (
  json: unknown,
  coords: { lat: number; lon: number }
): PlaceAtResponse | null => {
  const props = field(list(field(json, 'features'))[0], 'properties');
  if (text(props, 'countrycode').toUpperCase() !== INDIA_COUNTRY_CODE) {
    return null;
  }
  return {
    place: {
      name: text(props, 'name'),
      address: photonAddress(props),
      lat: coords.lat,
      lon: coords.lon,
    },
  };
};

/** How far to zoom in on an area Photon gives only as a point. */
const AREA_ZOOM: Record<string, number> = {
  country: 5,
  state: 7,
  county: 9,
  district: 10,
  city: 11,
};

/**
 * The map area from a Photon lookup (first result), or null when it has no
 * coordinates. `name` is used when the result has none.
 */
export const parsePhotonArea = (
  json: unknown,
  name: string
): MapArea | null => {
  const feature = list(field(json, 'features'))[0];
  const props = field(feature, 'properties');
  const [lon, lat] = list(field(field(feature, 'geometry'), 'coordinates'));
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  // Photon's extent is [west, north, east, south].
  const [west, north, east, south] = list(field(props, 'extent'));
  const bounds =
    typeof west === 'number' &&
    typeof north === 'number' &&
    typeof east === 'number' &&
    typeof south === 'number'
      ? { south, west, north, east }
      : null;
  const type = text(props, 'type');
  return {
    name: text(props, 'name') || name,
    lat,
    lon,
    zoom: Object.hasOwn(AREA_ZOOM, type) ? (AREA_ZOOM[type] ?? 11) : 11,
    bounds,
  };
};

// ---------------------------------------------------------------------------
// Ola Maps
// ---------------------------------------------------------------------------

/** Ola place types that count as food spots (listed first in results). */
const OLA_FOOD_TYPES = new Set([
  'restaurant',
  'cafe',
  'food',
  'bakery',
  'bar',
  'meal_takeaway',
  'meal_delivery',
]);

/** A picked spot names the nearest food place only if it's this close. */
export const SPOT_PLACE_MAX_M = 40;

/** A result's coordinates from Ola's `geometry.location`. */
const olaPoint = (result: unknown): { lat: number; lon: number } | null => {
  const location = field(field(result, 'geometry'), 'location');
  const lat = field(location, 'lat');
  const lon = field(location, 'lng');
  return typeof lat === 'number' && typeof lon === 'number'
    ? { lat, lon }
    : null;
};

const isOlaFood = (result: unknown) =>
  list(field(result, 'types')).some(
    (t) => typeof t === 'string' && OLA_FOOD_TYPES.has(t)
  );

/**
 * Places from an Ola autocomplete response: named, with coordinates, inside
 * India; food spots first; at most 10.
 */
export const parseOlaPlaces = (json: unknown): PlaceSearchResponse['places'] =>
  foodFirst(
    list(field(json, 'predictions')).flatMap((prediction): FoundPlace[] => {
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
    })
  );

/**
 * The place at a spot from an Ola reverse-geocode response: named after a
 * food place within 40 m if there is one (else no name), with the address
 * minus the place's own name at its start.
 */
export const parseOlaReverse = (
  json: unknown,
  coords: { lat: number; lon: number }
): PlaceAtResponse => {
  const results = list(field(json, 'results'));
  const food = results.find((result) => {
    const distance = field(result, 'distance_meters');
    return (
      isOlaFood(result) &&
      typeof distance === 'number' &&
      distance <= SPOT_PLACE_MAX_M
    );
  });
  const pick = food ?? results[0];
  const name = food ? text(food, 'name') : '';
  const full = text(pick, 'formatted_address');
  const ownName = text(pick, 'name');
  const address =
    ownName && full.startsWith(`${ownName}, `)
      ? full.slice(ownName.length + 2)
      : full;
  return { place: { name, address, lat: coords.lat, lon: coords.lon } };
};

// ---------------------------------------------------------------------------
// Map tiles (CARTO)
// ---------------------------------------------------------------------------

const TILE_STYLES: Record<string, string> = {
  light: 'rastertiles/voyager',
  dark: 'dark_all',
};

export type TileRequest = {
  path: string;
  zoom: number;
  x: string;
  y: string;
  /** '@2x' for retina tiles, else ''. */
  retina: string;
};

/**
 * Validates a tile request (style, zoom 0–20, numeric x and y with an
 * optional @2x). Null for anything else, so the proxy can't be pointed at
 * arbitrary paths.
 */
export const parseTileRequest = (
  style: string,
  z: string,
  x: string,
  y: string
): TileRequest | null => {
  // Own keys only, so names like "constructor" don't count as styles.
  const path = Object.hasOwn(TILE_STYLES, style) ? TILE_STYLES[style] : null;
  const yMatch = y.match(/^(\d+)(@2x)?$/);
  const zoom = Number(z);
  if (
    !path ||
    !yMatch ||
    !/^\d+$/.test(x) ||
    !/^\d+$/.test(z) ||
    !(zoom >= 0 && zoom <= 20)
  ) {
    return null;
  }
  const [, yTile = '', retina = ''] = yMatch;
  return { path, zoom, x, y: yTile, retina };
};
