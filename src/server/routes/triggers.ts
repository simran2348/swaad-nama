import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createHubPost, getHubPostId } from '../core/post';

export const triggers = new Hono();

/**
 * Creates the SwaadNama hub post on install.
 *
 * Always responds 200: a failing install trigger blocks the install/upload,
 * so errors are logged instead. Re-running (reinstalls, playtest) is a no-op
 * once the hub post exists — mods can create another from the subreddit menu.
 */
triggers.post('/on-app-install', async (c) => {
  try {
    const input = await c.req.json<OnAppInstallRequest>();
    const existing = await getHubPostId();
    if (existing) {
      return c.json<TriggerResponse>(
        {
          status: 'success',
          message: `Hub post ${existing} already exists in r/${context.subredditName}; skipping (trigger: ${input.type})`,
        },
        200
      );
    }

    const post = await createHubPost();
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Hub post ${post.id} created in r/${context.subredditName} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error('on-app-install: failed to create hub post:', error);
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message:
          'Install completed without hub post; create one from the subreddit menu',
      },
      200
    );
  }
});
