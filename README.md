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
- **Ratings**: your dishes, each with a ranked list of places. "Top rated"
  shows the dishes the community rates highest. Tap one to see everyone who
  rated it and open their list.
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

When adding a place, members can search for it by name or paste a Google
Maps link to it. Location search is limited to places in India.

The app uses these outside services:

- **Photon** (photon.komoot.io), an OpenStreetMap search, to find places
  and look up addresses.
- **CARTO** (basemaps.cartocdn.com) for the map images.
- **Google Maps short links** (maps.app.goo.gl, goo.gl), only to read the
  location from a link a member pastes.

Only the place name or link text is sent to these services, never Reddit
usernames.

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
