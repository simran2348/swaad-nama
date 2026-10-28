import { telemetry } from '@devvit/analytics/client/reddit';
import type { TrackEvent } from '../../shared/stats';

// Analytics never block or break the app: every call is fire-and-forget.
const quietly = (work: () => Promise<unknown>) => {
  try {
    void work().catch((err: unknown) => console.warn('Analytics:', err));
  } catch (err) {
    console.warn('Analytics:', err);
  }
};

/**
 * Records a committed user action: counted for the Admin overview, and sent
 * to Reddit as a Devvit Journeys interaction. No personal data is sent.
 */
export const track = (event: TrackEvent) => {
  quietly(() =>
    fetch('/api/stats/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    })
  );
  quietly(() => telemetry.interaction({ action: event }));
};

/** The app has loaded and can be used (Devvit Journeys App.Ready). */
export const trackAppReady = () => quietly(() => telemetry.appReady());

/**
 * The add-to-tier flow as a Devvit journey: it starts when the user taps
 * "Add to tier", moves forward per post rated, and ends on submit or cancel.
 */
export const ratingJourney = {
  start: () => quietly(() => telemetry.startJourney()),
  /** `done` of `total` posts rated so far. */
  progress: (done: number, total: number) =>
    quietly(() =>
      telemetry.progress({
        progress: total > 0 ? Math.min(1, done / total) : 1,
        action: 'rate_post',
      })
    ),
  end: (complete: boolean) => quietly(() => telemetry.endJourney({ complete })),
};
