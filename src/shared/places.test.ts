import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_MS,
  inIndia,
  isImageLink,
  parseOlaPlaces,
  parseOlaReverse,
  parsePhotonArea,
  parsePhotonPlaces,
  parsePhotonReverse,
  parsePostId,
  parseTileRequest,
  pickTrending,
  postImageUrls,
  trendingRank,
} from './places.ts';

// ---------- Reddit posts ----------

test('parsePostId reads reddit.com and redd.it links', () => {
  assert.equal(
    parsePostId('https://www.reddit.com/r/pune/comments/1Ab2cd/best_misal/'),
    '1ab2cd'
  );
  assert.equal(parsePostId('reddit.com/comments/xyz9'), 'xyz9');
  assert.equal(parsePostId('  https://redd.it/abc123  '), 'abc123');
});

test('parsePostId rejects other links and text', () => {
  assert.equal(parsePostId('https://example.com/comments/abc'), null);
  assert.equal(parsePostId('https://www.reddit.com/r/pune/'), null);
  assert.equal(parsePostId('not a link'), null);
  assert.equal(parsePostId(''), null);
});

test('isImageLink spots direct image links', () => {
  assert.equal(isImageLink('https://i.redd.it/abc.jpeg'), true);
  assert.equal(isImageLink('https://i.imgur.com/abc'), true);
  assert.equal(isImageLink('https://example.com/photo.webp?x=1'), true);
  assert.equal(
    isImageLink('https://www.reddit.com/r/pune/comments/abc/'),
    false
  );
  assert.equal(isImageLink('https://example.com/photo.jpeg.html'), false);
});

test('postImageUrls prefers the gallery and unescapes preview URLs', () => {
  assert.deepEqual(
    postImageUrls({
      gallery: [
        { url: 'https://preview.redd.it/a.jpg?width=640&amp;s=1' },
        { url: 'https://preview.redd.it/b.jpg' },
      ],
      url: 'https://i.redd.it/ignored.jpg',
    }),
    [
      'https://preview.redd.it/a.jpg?width=640&s=1',
      'https://preview.redd.it/b.jpg',
    ]
  );
});

test('postImageUrls falls back to an image link, then the thumbnail', () => {
  assert.deepEqual(
    postImageUrls({ gallery: [], url: 'https://i.redd.it/x.png' }),
    ['https://i.redd.it/x.png']
  );
  assert.deepEqual(
    postImageUrls({
      gallery: [],
      url: 'https://www.reddit.com/r/pune/comments/abc/',
      thumbnail: { url: 'https://b.thumbs.redditmedia.com/t.jpg' },
    }),
    ['https://b.thumbs.redditmedia.com/t.jpg']
  );
  assert.deepEqual(
    postImageUrls({
      gallery: [],
      url: 'https://www.reddit.com/r/pune/comments/abc/',
    }),
    []
  );
});

// ---------- Trending ----------

const NOW = Date.parse('2026-11-20T12:00:00Z');
const post = (id: string, daysAgo: number, score = 1, comments = 0) => ({
  postId: id,
  title: id,
  image: `https://i.redd.it/${id}.jpg`,
  author: 'cook',
  score,
  comments,
  postedAt: NOW - daysAgo * DAY_MS,
});

test('trendingRank counts a comment as two upvotes', () => {
  assert.equal(trendingRank({ score: 10, comments: 3 }), 16);
});

test('pickTrending uses 3 days when there are 10 posts in them', () => {
  const posts = Array.from({ length: 12 }, (_, i) => post(`p${i}`, 1, i));
  const result = pickTrending([...posts, post('old', 4, 999)], NOW);
  assert.equal(result.days, 3);
  assert.equal(result.posts.length, 10);
  assert.equal(result.posts[0]?.postId, 'p11');
  assert.ok(!result.posts.some((p) => p.postId === 'old'));
});

test('pickTrending widens to 5, then 7 days for quiet subreddits', () => {
  const recent = Array.from({ length: 6 }, (_, i) => post(`r${i}`, 1));
  const middle = Array.from({ length: 4 }, (_, i) => post(`m${i}`, 4));
  assert.equal(pickTrending([...recent, ...middle], NOW).days, 5);
  const few = [post('a', 1), post('b', 6)];
  const result = pickTrending(few, NOW);
  assert.equal(result.days, 7);
  assert.equal(result.posts.length, 2);
});

test('pickTrending ranks by upvotes plus weighted comments', () => {
  const result = pickTrending(
    [post('upvotes', 1, 10, 0), post('talked', 1, 4, 4)],
    NOW
  );
  assert.deepEqual(
    result.posts.map((p) => p.postId),
    ['talked', 'upvotes']
  );
});

test('pickTrending handles no posts', () => {
  assert.deepEqual(pickTrending([], NOW), { days: 7, posts: [] });
});

// ---------- India-only places ----------

test('inIndia checks the rough bounds', () => {
  assert.equal(inIndia({ lat: 18.52, lon: 73.85 }), true); // Pune
  assert.equal(inIndia({ lat: 51.5, lon: -0.12 }), false); // London
  assert.equal(inIndia({ lat: 6.5, lon: 68.1 }), true); // corner
});

const photonFeature = (
  name: string,
  props: Record<string, unknown> = {},
  coords: unknown = [73.85, 18.52]
) => ({
  properties: { name, countrycode: 'IN', ...props },
  geometry: { coordinates: coords },
});

test('parsePhotonPlaces keeps named Indian places, food first', () => {
  const places = parsePhotonPlaces({
    features: [
      photonFeature('FC Road', {
        street: 'FC Road',
        city: 'Pune',
        country: 'India',
      }),
      photonFeature('Vaishali', { osm_value: 'restaurant', city: 'Pune' }),
      photonFeature('Lahore Cafe', { countrycode: 'PK', osm_value: 'cafe' }),
      photonFeature('', { osm_value: 'cafe' }),
      photonFeature('No coords', {}, 'bad'),
    ],
  });
  assert.deepEqual(
    places.map((p) => p.name),
    ['Vaishali', 'FC Road']
  );
  assert.equal(places[1]?.address, 'FC Road, Pune, India');
  assert.equal(places[0]?.lat, 18.52);
  assert.equal(places[0]?.lon, 73.85);
});

test('parsePhotonPlaces returns at most 10 and survives bad JSON', () => {
  const many = Array.from({ length: 14 }, (_, i) => photonFeature(`P${i}`));
  assert.equal(parsePhotonPlaces({ features: many }).length, 10);
  assert.deepEqual(parsePhotonPlaces(null), []);
  assert.deepEqual(parsePhotonPlaces({ features: 'nope' }), []);
});

test('parsePhotonReverse is India only', () => {
  const coords = { lat: 18.52, lon: 73.85 };
  const found = parsePhotonReverse(
    {
      features: [
        photonFeature('Cafe Goodluck', {
          housenumber: '759',
          street: 'FC Road',
          city: 'Pune',
          country: 'India',
        }),
      ],
    },
    coords
  );
  assert.deepEqual(found, {
    place: {
      name: 'Cafe Goodluck',
      address: '759 FC Road, Pune, India',
      lat: 18.52,
      lon: 73.85,
    },
  });
  assert.equal(
    parsePhotonReverse(
      { features: [photonFeature('X', { countrycode: 'NP' })] },
      coords
    ),
    null
  );
  assert.equal(parsePhotonReverse({ features: [] }, coords), null);
});

test('parsePhotonArea reads the point, extent and zoom', () => {
  const area = parsePhotonArea(
    {
      features: [
        photonFeature(
          'Pune',
          { type: 'city', extent: [73.7, 18.6, 74.0, 18.4] },
          [73.85, 18.52]
        ),
      ],
    },
    'pune'
  );
  assert.deepEqual(area, {
    name: 'Pune',
    lat: 18.52,
    lon: 73.85,
    zoom: 11,
    bounds: { south: 18.4, west: 73.7, north: 18.6, east: 74.0 },
  });
});

test('parsePhotonArea falls back sensibly', () => {
  const area = parsePhotonArea(
    { features: [photonFeature('', { type: 'constructor' }, [77.2, 28.6])] },
    'Delhi'
  );
  assert.equal(area?.name, 'Delhi');
  assert.equal(area?.zoom, 11);
  assert.equal(area?.bounds, null);
  const state = parsePhotonArea(
    { features: [photonFeature('Maharashtra', { type: 'state' })] },
    'mh'
  );
  assert.equal(state?.zoom, 7);
  assert.equal(parsePhotonArea({ features: [] }, 'nowhere'), null);
});

const olaPrediction = (
  main: string,
  types: string[] = [],
  location: unknown = { lat: 18.52, lng: 73.85 }
) => ({
  description: `${main}, Pune, Maharashtra`,
  structured_formatting: {
    main_text: main,
    secondary_text: 'Pune, Maharashtra',
  },
  geometry: { location },
  types,
});

test('parseOlaPlaces keeps Indian results, food first', () => {
  const places = parseOlaPlaces({
    predictions: [
      olaPrediction('Shivajinagar', ['locality']),
      olaPrediction('Vaishali', ['restaurant']),
      olaPrediction('Dubai Mall', ['restaurant'], { lat: 25.2, lng: 55.3 }),
      olaPrediction('No point', ['cafe'], null),
    ],
  });
  assert.deepEqual(
    places.map((p) => p.name),
    ['Vaishali', 'Shivajinagar']
  );
  assert.equal(places[0]?.address, 'Pune, Maharashtra');
});

test('parseOlaPlaces falls back to the description for a name', () => {
  const [place] = parseOlaPlaces({
    predictions: [
      {
        description: 'Goodluck Cafe, FC Road',
        geometry: { location: { lat: 18.5, lng: 73.8 } },
      },
    ],
  });
  assert.equal(place?.name, 'Goodluck Cafe');
  assert.equal(place?.address, '');
});

test('parseOlaReverse names the spot after food within 40 m', () => {
  const coords = { lat: 18.52, lon: 73.85 };
  const result = parseOlaReverse(
    {
      results: [
        {
          name: 'Some Building',
          formatted_address: 'Some Building, FC Road, Pune',
          distance_meters: 5,
          types: ['premise'],
        },
        {
          name: 'Vaishali',
          formatted_address: 'Vaishali, 1218 FC Road, Pune',
          distance_meters: 30,
          types: ['restaurant'],
        },
      ],
    },
    coords
  );
  assert.deepEqual(result.place, {
    name: 'Vaishali',
    address: '1218 FC Road, Pune',
    lat: 18.52,
    lon: 73.85,
  });
});

test('parseOlaReverse leaves the name empty when food is too far', () => {
  const result = parseOlaReverse(
    {
      results: [
        {
          name: 'Some Building',
          formatted_address: 'Some Building, FC Road, Pune',
          types: ['premise'],
        },
        {
          name: 'Far Cafe',
          formatted_address: 'Far Cafe, Pune',
          distance_meters: 80,
          types: ['cafe'],
        },
      ],
    },
    { lat: 1, lon: 2 }
  );
  assert.equal(result.place.name, '');
  assert.equal(result.place.address, 'FC Road, Pune');
  assert.equal(parseOlaReverse({}, { lat: 1, lon: 2 }).place.address, '');
});

// ---------- Map tiles ----------

test('parseTileRequest accepts valid tiles', () => {
  assert.deepEqual(parseTileRequest('light', '12', '2876', '1846'), {
    path: 'rastertiles/voyager',
    zoom: 12,
    x: '2876',
    y: '1846',
    retina: '',
  });
  assert.equal(parseTileRequest('dark', '3', '1', '2@2x')?.retina, '@2x');
  assert.equal(parseTileRequest('dark', '0', '0', '0')?.zoom, 0);
});

test('parseTileRequest rejects anything else', () => {
  assert.equal(parseTileRequest('constructor', '1', '1', '1'), null);
  assert.equal(parseTileRequest('satellite', '1', '1', '1'), null);
  assert.equal(parseTileRequest('light', '21', '1', '1'), null);
  assert.equal(parseTileRequest('light', '-1', '1', '1'), null);
  assert.equal(parseTileRequest('light', '', '1', '1'), null);
  assert.equal(parseTileRequest('light', '1.5', '1', '1'), null);
  assert.equal(parseTileRequest('light', '1', '../x', '1'), null);
  assert.equal(parseTileRequest('light', '1', '1', '1@3x'), null);
});
