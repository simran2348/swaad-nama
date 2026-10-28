import { Hono, type Context } from 'hono';
import { telemetry } from '@devvit/analytics/server/reddit';

/**
 * Devvit Journeys endpoints for the client SDK
 * (`@devvit/analytics/client/reddit`), which posts to /api/telemetry/….
 * Reddit ships these as an Express router; this is the same for Hono.
 */
export const telemetryRoutes = new Hono();

const INVALID_RECEIPT = {
  status: 'JOURNEY_RECEIPT_INVALID',
  message: 'Invalid: Event payload was not recorded.',
} as const;

const UNSPECIFIED_RECEIPT = {
  status: 'JOURNEY_RECEIPT_UNSPECIFIED',
  message: '',
} as const;

const field = (obj: unknown, key: string): unknown =>
  typeof obj === 'object' && obj !== null ? Reflect.get(obj, key) : undefined;

const text = (obj: unknown, key: string): string | undefined => {
  const value = field(obj, key);
  return typeof value === 'string' && value.trim() ? value : undefined;
};

/** `{ [key]: value }` when the field is a non-empty string, else `{}`. */
const optional = (obj: unknown, key: 'action' | 'actionDetails') => {
  const value = text(obj, key);
  return value ? { [key]: value } : {};
};

const badRequest = (c: Context, error: string) =>
  c.json({ error, receipt: INVALID_RECEIPT }, 400);

const body = (c: Context): Promise<unknown> => c.req.json().catch(() => null);

/** Telemetry must never break the app: failures answer with a 500 only. */
const safely =
  (handler: (c: Context) => Promise<Response>) => async (c: Context) => {
    try {
      return await handler(c);
    } catch (error) {
      console.error('Telemetry error:', error);
      return c.json(
        { error: 'Internal server error', receipt: UNSPECIFIED_RECEIPT },
        500
      );
    }
  };

telemetryRoutes.post(
  '/journey/start',
  safely(async (c) => c.json(await telemetry.startJourney()))
);

telemetryRoutes.post(
  '/journey/app-ready',
  safely(async (c) => c.json(await telemetry.appReady()))
);

telemetryRoutes.post(
  '/journey/progress',
  safely(async (c) => {
    const data = await body(c);
    const journeyId = text(data, 'journeyId');
    const progress = field(data, 'progress');
    if (!journeyId) return badRequest(c, 'journeyId is required.');
    if (typeof progress !== 'number' || progress < 0 || progress > 1) {
      return badRequest(c, 'progress must be between 0 and 1.');
    }
    return c.json(
      await telemetry.journeyProgress({
        journeyId,
        progress,
        ...optional(data, 'action'),
        ...optional(data, 'actionDetails'),
      })
    );
  })
);

telemetryRoutes.post(
  '/journey/interaction',
  safely(async (c) => {
    const data = await body(c);
    const action = text(data, 'action');
    if (!action) return badRequest(c, 'action is required.');
    return c.json(
      await telemetry.journeyInteraction({
        journeyId: text(data, 'journeyId') ?? '',
        action,
        actionDetails: text(data, 'actionDetails') ?? '',
      })
    );
  })
);

telemetryRoutes.post(
  '/journey/end',
  safely(async (c) => {
    const data = await body(c);
    const journeyId = text(data, 'journeyId');
    if (!journeyId) return badRequest(c, 'journeyId is required.');
    const complete = field(data, 'complete');
    return c.json(
      await telemetry.endJourney({
        journeyId,
        complete: complete === true,
      })
    );
  })
);
