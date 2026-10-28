import { redis } from '@devvit/web/server';
import type { AdminStatsResponse } from '../../shared/api';
import {
  dayKey,
  daysSinceMonday,
  FEATURE_EVENTS,
  FUNNEL_EVENTS,
  type FeatureEvent,
  type FunnelEvent,
} from '../../shared/stats';

/** Counters the server records itself (not sent by the client). */
export type ServerEvent =
  'rating_added' | 'rating_edited' | 'rating_deleted' | 'new_user';

const keys = {
  /** One day's event counts: field = event name. */
  day: (day: string) => `stats:day:${day}`,
  /** People who opened the app that day: field = username. */
  active: (day: string) => `stats:active:${day}`,
  /** Everyone seen since tracking began: field = username, value = day. */
  users: () => 'stats:users',
  /** Ratings per person, for "Top raters". */
  raters: () => 'stats:raters',
  /** Set once a user's existing ratings were counted into `raters`. */
  ratersCounted: (username: string) => `user:${username}:counted:v1`,
  foods: () => 'foods',
};

// Daily counters are kept long enough for a 30-day view.
const DAY_TTL_SECONDS = 40 * 24 * 60 * 60;

/** Adds one to an event's count for today. Never throws. */
export const recordEvent = async (
  event: ServerEvent | FeatureEvent | FunnelEvent,
  by = 1
) => {
  try {
    const key = keys.day(dayKey(Date.now()));
    await redis.hIncrBy(key, event, by);
    await redis.expire(key, DAY_TTL_SECONDS);
  } catch (error) {
    console.error('Stats event error:', error);
  }
};

/** Marks someone active today, and counts them as new the first time. */
export const recordOpen = async (username: string) => {
  try {
    const today = dayKey(Date.now());
    await redis.hSet(keys.active(today), { [username]: '1' });
    await redis.expire(keys.active(today), DAY_TTL_SECONDS);
    if (await redis.hSetNX(keys.users(), username, today)) {
      await recordEvent('new_user');
    }
  } catch (error) {
    console.error('Stats open error:', error);
  }
};

/** Adjusts someone's rating count (after a rating is added or removed). */
export const countRater = async (username: string, delta: number) => {
  try {
    const count = await redis.zIncrBy(keys.raters(), username, delta);
    if (count <= 0) await redis.zRem(keys.raters(), [username]);
  } catch (error) {
    console.error('Stats rater error:', error);
  }
};

/** Counts a user's existing ratings into "Top raters", once. */
export const backfillRater = async (username: string, ratings: number) => {
  if (await redis.get(keys.ratersCounted(username))) return;
  if (ratings > 0) {
    await redis.zAdd(keys.raters(), { member: username, score: ratings });
  } else {
    await redis.zRem(keys.raters(), [username]);
  }
  await redis.set(keys.ratersCounted(username), '1');
};

/**
 * Clears our own analytics: daily counts, active and seen users, and the
 * top raters (which refill from real ratings as people open the app).
 * Ratings themselves aren't touched. Reddit's Journeys data can't be reset.
 */
export const resetStats = async (): Promise<{ cleared: number }> => {
  const now = Date.now();
  const days = Array.from({ length: 45 }, (_, i) => dayKey(now, i));
  const [users, raters] = await Promise.all([
    redis.hGetAll(keys.users()),
    redis.zRange(keys.raters(), 0, -1, { by: 'rank' }),
  ]);
  const people = new Set([
    ...Object.keys(users),
    ...raters.map(({ member }) => member),
  ]);
  const toDelete = [
    ...days.flatMap((day) => [keys.day(day), keys.active(day)]),
    keys.users(),
    keys.raters(),
    // So each person's ratings are counted again on their next visit.
    ...[...people].map((username) => keys.ratersCounted(username)),
  ];
  // In batches, to keep each call small.
  for (let i = 0; i < toDelete.length; i += 100) {
    await redis.del(...toDelete.slice(i, i + 100));
  }
  return { cleared: people.size };
};

const num = (value: string | undefined) => Number(value ?? 0) || 0;

/**
 * Everything the Admin overview shows, for whole weeks starting on Monday:
 * this week (`weeks` = 1) or this week and the 3 before it (`weeks` = 4).
 * Days later this week are included, empty, so the chart ends on Sunday.
 */
export const getAdminStats = async (
  weeks: 1 | 4 = 1
): Promise<AdminStatsResponse> => {
  const now = Date.now();
  const firstDayAgo = daysSinceMonday(now) + 7 * (weeks - 1);
  // Oldest first: Monday … Sunday of the last week.
  const daysAgo = Array.from({ length: 7 * weeks }, (_, i) => firstDayAgo - i);
  const dayKeys = daysAgo.map((ago) => dayKey(now, ago));
  const [counts, active, foods, users, raterCount, topRaters] =
    await Promise.all([
      Promise.all(dayKeys.map((day) => redis.hGetAll(keys.day(day)))),
      Promise.all(dayKeys.map((day) => redis.hLen(keys.active(day)))),
      redis.zRange(keys.foods(), 0, -1, { by: 'rank' }),
      redis.hLen(keys.users()),
      redis.zCard(keys.raters()),
      redis.zRange(keys.raters(), 0, 9, { by: 'rank', reverse: true }),
    ]);

  const total = (event: string) =>
    counts.reduce((sum, day) => sum + num(day[event]), 0);

  return {
    totals: {
      ratings: foods.reduce((sum, { score }) => sum + score, 0),
      categories: foods.length,
      raters: raterCount,
      users,
    },
    days: dayKeys.map((date, i) => ({
      date,
      upcoming: (daysAgo[i] ?? 0) < 0,
      activeUsers: active[i] ?? 0,
      newUsers: num(counts[i]?.new_user),
      ratings: num(counts[i]?.rating_added),
    })),
    topRaters: topRaters.map(({ member, score }) => ({
      username: member,
      count: score,
    })),
    features: Object.keys(FEATURE_EVENTS).map((event) => ({
      event,
      count: total(event),
    })),
    funnel: Object.keys(FUNNEL_EVENTS).map((event) => ({
      event,
      count: total(event),
    })),
    edits: total('rating_edited'),
    deletes: total('rating_deleted'),
  };
};
