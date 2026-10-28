/** App analytics: the events the client may report, and day keys. */

/** Feature taps, shown as "Feature usage" in Admin. */
export const FEATURE_EVENTS = {
  trending_open: 'Opened a trending post',
  top_rated_open: 'Opened a top-rated food',
  rater_open: "Opened someone's tier list",
  user_search: 'Searched a Redditor',
  map_pin_open: 'Opened a map pin',
  place_link_used: 'Added a Google Maps link',
} as const;

/** Steps of adding posts to the tier list, shown as the "Add flow" funnel. */
export const FUNNEL_EVENTS = {
  add_select: 'Selected posts',
  add_start: 'Opened the form',
  add_complete: 'Submitted',
} as const;

export type FeatureEvent = keyof typeof FEATURE_EVENTS;
export type FunnelEvent = keyof typeof FUNNEL_EVENTS;
export type TrackEvent = FeatureEvent | FunnelEvent;

export const isTrackEvent = (value: unknown): value is TrackEvent =>
  typeof value === 'string' &&
  (Object.keys(FEATURE_EVENTS).includes(value) ||
    Object.keys(FUNNEL_EVENTS).includes(value));

// Days are counted in India time, where the app's communities are.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-10-28" for the India-time day `daysAgo` days before `now`. */
export const dayKey = (now: number, daysAgo = 0): string =>
  new Date(now + IST_OFFSET_MS - daysAgo * DAY_MS).toISOString().slice(0, 10);
