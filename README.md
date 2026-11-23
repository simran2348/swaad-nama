# SwaadNama

SwaadNama turns a food subreddit into a shared tier list. Members rate the
food they've already posted about, and the app ranks the best places for
every dish, for each person and for the whole community.

It's made for food communities like r/punefoodporn: people who post what
they ate and want a simple way to remember, rank and share their favourite
spots.

## How it works

1. A moderator creates the SwaadNama custom post in the subreddit.
2. Members open the post and pick their own food posts from the subreddit.
3. For each post they add the dish, the place, a rating out of 10 and,
   optionally, a short review, budget, tags and the location.
4. Ratings are grouped by dish and ranked into tiers (S, A, B, C, D).

Only a member's own posts from this subreddit can be rated. The original
Reddit posts are never changed.

## Features

- **My List**: your posts in the subreddit. Select one or more and tap
  "Add to tier" to rate them. A Trending row at the top shows this week's
  most popular photo posts in the subreddit.
- **Ratings**: your dishes, each with a ranked list of places. At the top,
  "Recently rated" shows who rated something lately; tap anyone to see their
  ratings, or "Show more" for the top raters and a search to find anyone.
  "Top rated" shows the dishes the community rates highest; tap one to see
  everyone who rated it.
- **Map**: the places you've rated that have a location.
- **Settings**: light or dark mode, how tiers work, and a link to message the
  subreddit's moderators with feedback.

You can edit or delete any of your own ratings at any time.

## Setup for moderators

1. Install the app in your subreddit.
2. From the subreddit's menu, choose **Create SwaadNama post**.
3. Optional: set **App status** to **Closed** in the app's settings to show
   "Coming Soon" to members while you get ready. Set it back to **Open** to
   let everyone in. Open is the default.
4. Optional: in the app's settings, set **Map area** to your city, state or
   country (for example "Pune"). The map opens on this area and place search
   prefers results there. The default is India.

## Locations

When adding a place, members can search for it by name. If it isn't
found, they can **pick it on a map**: search for a nearby area or landmark
to jump there, then move the map until the pin is on the place. Locations
are limited to places in India.

The outside services behind this are listed under
[Fetch Domains](#fetch-domains).

## Fetch Domains

The app's server calls three outside domains, all listed in `devvit.json`.
Every call is made by the server, never from the user's device. Only search
text or map coordinates are sent; Reddit usernames and other personal
details never are.

### api.olamaps.io (Ola Maps)

Ola Maps is a maps and places service built for India by Ola. It is the
main place search, because it knows local Indian restaurants, street-food
stalls and cafés that OpenStreetMap is often missing.

- `GET /places/v1/autocomplete`: finds places as a member types a place
  name while rating. Sends the typed text and the subreddit's map area;
  returns place names, addresses and coordinates.
- `GET /places/v1/reverse-geocode`: when a member picks a spot on the map
  instead, looks up its address and the eatery at that spot. Sends the
  spot's coordinates.

Results are cached in Redis (3 days for searches, 7 days for spots), so
repeat lookups don't call Ola again. The API key is stored as a Devvit
secret setting, not in the code.

### photon.komoot.io (Photon, OpenStreetMap)

A free OpenStreetMap search.

- `GET /api/`: finds the subreddit's **Map area** setting (for example
  "Pune") so the map opens there and searches prefer it. It is also the
  backup place search if Ola Maps is unavailable.
- `GET /reverse`: the backup address lookup for a spot picked on the map.

### basemaps.cartocdn.com (CARTO)

- `GET /{style}/{z}/{x}/{y}.png`: map images (tiles) for the Map tab and
  the location picker, in light or dark style to match the theme. The
  server fetches each tile and passes it to the app, cached for a week.

## Admin

The app's developer has an Admin tab, visible only to them, with:

- Usage numbers for the subreddit: ratings, active users, a weekly activity
  chart, how many people finish adding ratings, feature usage and top raters.
- Tools to remove the app's posts, clear a user's ratings, or reset the
  usage numbers.

Each subreddit's data is kept separately. The app also records anonymous
usage events with Reddit's Devvit Journeys (for example, when someone
starts and finishes adding ratings). These include no usernames or other
personal data.

## Data

The app stores ratings, a user's colour theme and light/dark choice, and simple usage counts
in Reddit's storage for the app. Nothing is shared outside Reddit except
the location lookups described above.

See the [Privacy Policy](PRIVACY.md) and [Terms & Conditions](TERMS.md).

## For developers

Built with Devvit Web: React 19 and Tailwind on the client, a Hono server,
and Redis for storage. Requires Node 24 (see `.nvmrc`).

### Commands

| Command              | What it does                                                     |
| -------------------- | ---------------------------------------------------------------- |
| `npm run dev`        | Playtest live in the dev subreddit                               |
| `npm run build`      | Build client and server                                          |
| `npm run test:types` | Type check                                                       |
| `npm run lint`       | Lint                                                             |
| `npm run test`       | Unit tests (`src/shared/*.test.ts`, Node's built-in test runner) |
| `npm run deploy`     | Type check, lint and unit tests, then upload a new version       |
| `npm run launch`     | Deploy and publish for review                                    |

CI (`.github/workflows/ci.yaml`) runs the type check, lint, unit tests and
build on every push.

### Testing

The rules are kept as pure functions in `src/shared/` (no Devvit or Redis),
so they can be tested on their own; the server and client call them.

| Test file              | Covers                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `food.test.ts`         | Name matching, tiers, rating and budget limits, tags, food suggestions, ranking ties                                                        |
| `ratings.test.ts`      | Reading saved ratings (including old 5-point ones), per-dish summaries, top-rated order, dish search                                        |
| `places.test.ts`       | Reddit post links and photos, Trending (3/5/7-day windows and ranking), Ola Maps and Photon responses, India-only checks, map tile requests |
| `journal.test.ts`      | Turning posts into journal entries (trips, home-made, recipes)                                                                              |
| `comments.test.ts`     | The Reddit comments posted for ratings and journal entries, and splitting long ones                                                         |
| `commentLinks.test.ts` | Linking those comments back to their rating or entry, so removing a comment removes it from the app                                         |
| `access.test.ts`       | The App status setting and who may use a closed app                                                                                         |
| `stats.test.ts`        | India-time days and weeks for usage numbers, which events the client may report                                                             |
| `theme.test.ts`        | Valid colour themes and light/dark choices                                                                                                  |

Code that only talks to Reddit, Redis or the map services (for example
saving a rating, or calling Ola Maps) isn't unit tested; it's checked by
playtesting.

### Project structure

```
src/
  client/          React app: splash.tsx (feed view), game.tsx (expanded app), components/
  server/
    index.ts       Hono server entry
    routes/        api.ts (app API), menu.ts, triggers.ts, telemetry.ts
    core/          Redis and Reddit work: reviews, journal, external (Reddit posts,
                   Ola Maps, Photon, CARTO), userComments, stats, admin, ...
  shared/          Types (api.ts) and the pure, unit-tested rules (*.test.ts beside them)
devvit.json        App config: entry points, settings, menu, triggers, fetch domains
```
